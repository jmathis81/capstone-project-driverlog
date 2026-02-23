const { app } = require("@azure/functions");
const { routes, routePoints } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");

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

      if (!routeId || !Array.isArray(points)) {
        return { status: 400, body: "Invalid payload" };
      }

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


