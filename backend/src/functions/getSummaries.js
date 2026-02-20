const { app } = require("@azure/functions");
const { routeSummaries } = require("../../shared/cosmosClient");
const { getUserFromRequest } = require("../../shared/auth");

//for getting summaries of routes

app.http("getSummaries", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      //get signed in user info
      const user = getUserFromRequest(req);
      if (!user) {
        return { status: 401, body: "Unauthorized" };
      }

      //database query to pull last 25 routes for user
      const query = {
        query: `
          SELECT TOP 25 * FROM c
          WHERE c.userId = @userId
          ORDER BY c.completedAt DESC
        `,
        parameters: [
          { name: "@userId", value: user.userId }
        ]
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