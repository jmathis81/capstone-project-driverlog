const { app } = require("@azure/functions");
const { routePoints } = require("../../shared/cosmosClient");

app.http("getRoutePolyline", {
  methods: ["GET"],
  route: "routes/{routeId}/polyline",
  authLevel: "anonymous",
  handler: async (req, context) => {

    const routeId = req.params.routeId;

    const querySpec = {
      query: "SELECT c.lat, c.lon, c.ts FROM c WHERE c.routeId = @routeId ORDER BY c.ts",
      parameters: [
        { name: "@routeId", value: routeId }
      ]
    };

    const iterator = routePoints.items.query(querySpec, {
      maxItemCount: 1000
    });

    const coordinates = [];

    while (iterator.hasMoreResults()) {

      const { resources } = await iterator.fetchNext();

      for (const p of resources) {
        coordinates.push([p.lon, p.lat]);
      }
    }

    return {
      status: 200,
      jsonBody: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates
        }
      }
    };
  }
});