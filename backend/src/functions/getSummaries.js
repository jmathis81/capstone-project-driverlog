const { app } = require("@azure/functions");
const { routeSummaries } = require("../../shared/cosmosClient");

//for getting summaries of routes

app.http("getSummaries", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {

      const query = {
        query: "SELECT TOP 25 * FROM c ORDER BY c.completedAt DESC"
      };

      const { resources } =
        await routeSummaries.items.query(query).fetchAll();

      return {
        status: 200,
        jsonBody: resources
      };

    } catch (error) {
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});