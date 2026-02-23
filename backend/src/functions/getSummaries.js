const { app } = require("@azure/functions");
const { routeSummaries } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("getSummaries", {
  methods: ["GET"],
  authLevel: "anonymous",

  handler: async (req) => {
    try {
    const authUser = requireUser(req);
    const user = await getOrCreateUser(authUser);

    let query;

    if (user.role === "Driver") {

      query = {
        query: `
          SELECT * FROM c
          WHERE c.userId = @userId
          ORDER BY c.completedAt DESC
        `,
        parameters: [
          { name: "@userId", value: user.userId }
        ]
      };

    } else if (user.role === "Manager") {

      const { resources: drivers } =
        await users.items.query({
          query: `
            SELECT c.userId FROM c
            WHERE c.managerId = @managerId
          `,
          parameters: [
            { name: "@managerId", value: user.userId }
          ]
        }).fetchAll();

      const driverIds = drivers.map(d => d.userId);

      query = {
        query: `
          SELECT * FROM c
          WHERE ARRAY_CONTAINS(@driverIds, c.userId)
          ORDER BY c.completedAt DESC
        `,
        parameters: [
          { name: "@driverIds", value: driverIds }
        ]
      };

    } else {

      // Admin
      query = {
        query: `
          SELECT TOP 50 * FROM c
          ORDER BY c.completedAt DESC
        `
      };
    }

    const { resources } =
      await routeSummaries.items.query(query).fetchAll();

    return { status: 200, jsonBody: resources };
  } catch (error) {
      return {
        status: 500,
        jsonBody: { error: error.message }
      };
    }
  }
});