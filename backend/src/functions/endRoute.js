const { app } = require("@azure/functions");
const { routes, routePoints, routeSummaries } = require("../../shared/cosmosClient");
const { haversineDistance } = require("../../shared/haversine");
const { requireUser } = require("../../shared/auth");
const { calculateIdleTime } = require("../../shared/calculateIdleTime");

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
        return { status: 400, body: "Not enough points to calculate distance" };
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

      return { status: 200, jsonBody: summary };

    } catch (err) {
      context.log("END ROUTE ERROR:", err);
      return { status: 500, body: "Failed to end route" };
    }
  }
});