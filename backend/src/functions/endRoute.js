const { app } = require("@azure/functions");
const { routes, routePoints, routeSummaries } = require("../../shared/cosmosClient");
const { haversineDistance } = require("../../shared/haversine");
const { requireUser } = require("../../shared/auth");
const { calculateIdleTime } = require("../../shared/calculateIdleTime");
const { createFlagEntry } = require("../../shared/flagEntryService");

app.http("endRoute", {
  methods: ["POST"],
  route: "routes/{routeId}/end",
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      //added for auth to check if user is signed in
      const user = requireUser(req);


      const routeId = req.params.routeId;

      // 1. Fetch route to get correct partition key
      const { resources: routeResults } = await routes.items.query({
        query: "SELECT * FROM c WHERE c.routeId = @routeId",
        parameters: [{ name: "@routeId", value: routeId }]
      }).fetchAll();

      if (!routeResults.length) {
        return { status: 404, body: "Route not found" };
      }

      const route = routeResults[0];

      //check to ensure user owns route being ended
      if (route.userId !== user.userId) {
        return {
          status: 403,
          body: "You do not own this route"
        };
      }

      // 🚫 Prevent ending an already completed route.
      if (route.status === "completed") {
        return {
          status: 409,
          body: "Route already ended"
        };
      }

      // 2. Fetch points in time order
      const { resources: points } = await routePoints.items.query({
        query: "SELECT * FROM c WHERE c.routeId = @routeId ORDER BY c.ts",
        parameters: [{ name: "@routeId", value: routeId }]
      }).fetchAll();

      if (points.length < 2) {
        // Save a minimal summary and flag it — don't block the route from ending
        const minimalSummary = {
          id: routeId,
          routeId,
          userId: route.userId,
          username: route.username,
          pointCount: points.length,
          durationSeconds: 0,
          totalDistanceMeters: 0,
          totalDistanceMiles: 0,
          averageMovingSpeedMph: 0,
          averageSpeedMph: 0,
          idleSeconds: 0,
          movingSeconds: 0,
          completedAt: new Date().toISOString(),
        };
        await routeSummaries.items.upsert(minimalSummary);
        await routes.item(route.id, route.userId).patch([
          { op: "replace", path: "/status", value: "completed" },
          { op: "add", path: "/endTime", value: new Date().toISOString() },
        ]);
        try {
          await createFlagEntry({
            driverId: route.userId,
            driverEmail: route.username || "",
            reason: "Route ended with too few GPS points",
            severity: "Low",
            notes: "Not enough data for a reliable route summary. Speed and distance readings may be inaccurate.",
            sourceType: "routeSummary",
            sourceId: routeId,
            createdBy: "system",
          });
        } catch (_) {}
        return { status: 200, jsonBody: { ...minimalSummary, flagsCreated: 1 } };
      }

      // 3. Calculate distance
      let totalDistanceMeters = 0;

      for (let i = 0; i < points.length; i++) {
        totalDistanceMeters += points[i].distanceFromPrev ?? 0;
      }

      // Check if epoch time is in milliseconds or seconds and calculate to seconds
      const normalizeToSeconds = (ts) => {
        return ts > 1e12 ? ts / 1000 : ts;
      };

      const start = points[0];
      const end = points[points.length - 1];
      const startTs = normalizeToSeconds(start.ts);
      const endTs = normalizeToSeconds(end.ts);
      const durationSeconds = endTs - startTs;

      // Calculate idle time
      const idleSeconds = calculateIdleTime(points);

      // Calculate moving time
      const movingSeconds = Math.max(0, durationSeconds - idleSeconds);

      const avgSpeedMps =
        durationSeconds > 0 ? totalDistanceMeters / durationSeconds : 0;
      
      const avgMovingSpeedMps =
        movingSeconds > 0 ? totalDistanceMeters / movingSeconds : 0;

      
      const summary = {
        id: routeId,
        routeId,
        userId: route.userId,
        username: route.username,

        pointCount: points.length,
        durationSeconds,

        totalDistanceMeters,
        totalDistanceMiles: totalDistanceMeters / 1609.344,
        averageMovingSpeedMph: avgMovingSpeedMps * 2.23694,
        averageSpeedMph: avgSpeedMps * 2.23694,
        idleSeconds,
        movingSeconds,

        completedAt: new Date().toISOString()
      };

      // 4. Save summary
      await routeSummaries.items.upsert(summary);

      // 5. Update route status
      await routes.item(route.id, route.userId).patch([
        { op: "replace", path: "/status", value: "completed" },
        { op: "add", path: "/endTime", value: new Date().toISOString() }
      ]);

      // 6. Auto-flag suspicious route stats
      //    Each flag is wrapped in its own try/catch so a failed flag
      //    never crashes the route end or blocks the other flags.
      const createdFlags = [];

      async function tryFlag(data) {
        try {
          const flag = await createFlagEntry({
            ...data,
            driverId: route.userId,
            driverEmail: route.username || "",
            sourceType: "routeSummary",
            sourceId: routeId,
            createdBy: "system",
          });
          createdFlags.push(flag);
        } catch (flagErr) {
          context.log("FLAG CREATION ERROR:", flagErr);
        }
      }

      // Minimum points needed for reliable speed/distance flags.
      // Routes with fewer than 5 points don't have enough GPS data
      // to produce accurate speed or distance readings, so we skip
      // speed-based flags entirely for them.
      const hasEnoughPoints = summary.pointCount >= 5;

      // Average speed unusually high (only flag if enough GPS data)
      if (hasEnoughPoints && summary.averageSpeedMph > 85) {
        await tryFlag({
          reason: `Average speed is unusually high (${summary.averageSpeedMph.toFixed(1)} mph)`,
          severity: "High",
          notes: "Check route data or GPS accuracy.",
        });
      }

      // Moving speed unusually high (only flag if enough GPS data)
      if (hasEnoughPoints && summary.averageMovingSpeedMph > 95) {
        await tryFlag({
          reason: `Average moving speed is unusually high (${summary.averageMovingSpeedMph.toFixed(1)} mph)`,
          severity: "High",
          notes: "Moving speed exceeded expected range.",
        });
      }

      // Route lasted several minutes but barely moved
      if (hasEnoughPoints && summary.durationSeconds > 300 && summary.totalDistanceMiles < 0.05) {
        await tryFlag({
          reason: "Route lasted several minutes but recorded almost no movement",
          severity: "Medium",
          notes: "Possible GPS drift, inactive route, or incorrect tracking.",
        });
      }

      // Too few GPS points recorded
      if (summary.pointCount < 5) {
        await tryFlag({
          reason: "Route ended with too few GPS points",
          severity: "Low",
          notes: "Not enough data for a reliable route summary. Speed and distance readings may be inaccurate.",
        });
      }

      // Driver was idle for a long time (only meaningful with enough data)
      if (hasEnoughPoints && summary.idleSeconds > 1800) {
        await tryFlag({
          reason: `Route had unusually high idle time (${Math.round(summary.idleSeconds / 60)} minutes)`,
          severity: "Medium",
          notes: "Driver was inactive for a long period during the route.",
        });
      }

      // Distance recorded but no moving time calculated
      if (hasEnoughPoints && summary.movingSeconds === 0 && summary.totalDistanceMiles > 0.02) {
        await tryFlag({
          reason: "Route recorded distance but no moving time",
          severity: "High",
          notes: "Possible calculation issue or inconsistent tracking data.",
        });
      }

      // Route ended very quickly — likely accidental or test
      if (summary.durationSeconds < 30) {
        await tryFlag({
          reason: `Route ended very quickly (${Math.round(summary.durationSeconds)} seconds)`,
          severity: "Low",
          notes: "Route may have been started and ended by mistake.",
        });
      }

      // Long route with zero idle time — driver never stopped
      if (hasEnoughPoints && summary.durationSeconds > 3600 && summary.idleSeconds === 0) {
        await tryFlag({
          reason: `Long route recorded with zero idle time (${Math.round(summary.durationSeconds / 3600)} hrs)`,
          severity: "Medium",
          notes: "Driver showed no stops during a long route — verify data accuracy.",
        });
      }

      return {
        status: 200,
        jsonBody: {
          ...summary,
          flagsCreated: createdFlags.length,
          flags: createdFlags,
        },
      };

    } catch (err) {
      context.log("END ROUTE ERROR:", err);
      return { status: 500, body: "Failed to end route" };
    }
  }
});