const { app } = require("@azure/functions");
const { flaggedEntries, users } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("getFlaggedEntries", {
  methods: ["GET"],
  route: "flagged",
  authLevel: "anonymous",

  handler: async (req) => {
    try {
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);

      // Only Admin and Manager can view flagged entries
      if (user.role !== "Admin" && user.role !== "Manager") {
        return { status: 403, jsonBody: { error: "Forbidden" } };
      }

      // ADMIN: sees all flagged entries
      if (user.role === "Admin") {
        const { resources } = await flaggedEntries.items
          .query({
            query: "SELECT * FROM c ORDER BY c.createdAt DESC",
          })
          .fetchAll();

        return { status: 200, jsonBody: resources };
      }

      // MANAGER: only flagged entries for their drivers
      const { resources: driverRows } = await users.items
        .query({
          query: "SELECT c.userId FROM c WHERE c.managerId = @managerId",
          parameters: [{ name: "@managerId", value: user.userId }],
        })
        .fetchAll();

      const driverIds = driverRows.map((d) => d.userId).filter(Boolean);

      // Manager has no drivers assigned yet
      if (driverIds.length === 0) {
        return { status: 200, jsonBody: [] };
      }

      const { resources } = await flaggedEntries.items
        .query({
          query:
            "SELECT * FROM c WHERE ARRAY_CONTAINS(@driverIds, c.driverId) ORDER BY c.createdAt DESC",
          parameters: [{ name: "@driverIds", value: driverIds }],
        })
        .fetchAll();

      return { status: 200, jsonBody: resources };

    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});