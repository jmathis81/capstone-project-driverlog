const { app } = require("@azure/functions");
const { routes, routePoints } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { haversineDistance } = require("../../shared/haversine");

app.http("uploadPoints", {
  methods: ["POST"],
  route: "routes/{routeId}/points",
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      //added for auth to check if user is signed in
      const user = requireUser(req);

      const routeId = req.params.routeId;
      const body = await req.json();
      const points = body?.points;

      //Get client json file sent for logging
      context.log("HTTP request body:", body);

      // 1. Fetch route so we can check if user owns route
      const { resources: routeResults } = await routes.items.query({
        query: "SELECT * FROM c WHERE c.routeId = @routeId",
        parameters: [{ name: "@routeId", value: routeId }]
      }).fetchAll();

      if (!routeResults.length) {
        return { status: 404, body: "Route not found" };
      }

      const route = routeResults[0];


      //check if user owns route
      if (route.userId !== user.userId) {
        return {
          status: 403,
          body: "You do not own this route"
        };
      }

      if (!routeId || !Array.isArray(points) || points.length === 0) {
        return { status: 400, body: "Invalid payload" };
      }

      // Sort incoming points by timestamp
      points.sort((a, b) => a.ts - b.ts);

      // Get the last stored point for the route
      const { resources: lastPoints } = await routePoints.items
        .query({
          query: `
            SELECT TOP 1 c.lat, c.lon, c.ts
            FROM c
            WHERE c.routeId = @routeId
            ORDER BY c.ts DESC
          `,
          parameters: [{ name: "@routeId", value: routeId }]
        })
        .fetchAll();

      let prevPoint = lastPoints[0] ?? null;

      // Calculate distanceFromPrev for each new point
      for (let i = 0; i < points.length; i++) {
        const curr = points[i];

        if (!prevPoint) {
          curr.distanceFromPrev = 0;
        } else {
          curr.distanceFromPrev = haversineDistance(prevPoint, curr);
        }

        prevPoint = curr;
      }
      
      //Add to DB
      const operations = points.map(p => ({
        operationType: "Create",
        resourceBody: {
          id: `${routeId}_${p.ts}`,
          routeId,
          ...p
        }
      }));

      context.log("Inserting", operations.length, "points");

      await routePoints.items.bulk(operations);

      return {
        status: 200,
        jsonBody: { inserted: points.length }
      };

    } catch (err) {
      context.log(err);
      return { status: 500, body: "Failed to ingest points" };
    }
  }
});


