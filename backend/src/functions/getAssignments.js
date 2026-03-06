const { app } = require("@azure/functions");
const { assignments, users } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("getAssignments", {
  methods: ["GET"],
  authLevel: "anonymous",

  handler: async (req) => {
    try {
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);

      // DRIVER: only their own assignments
      if (user.role === "Driver") {
        // Query database for assignments that belong to the driver
        const { resources } = await assignments.items
          .query({
            query: "SELECT * FROM c WHERE c.driverId = @driverId ORDER BY c.createdAt DESC",
            // paramater used in the query 
            parameters: [{ name: "@driverId", value: user.userId }],
          })
          .fetchAll();

          // Return the driver's assignments
        return { status: 200, jsonBody: resources };
      }

      // MANAGER: assignments for drivers assigned to them
      if (user.role === "Manager") {
        // Get all drivers that belong to this manager
        const { resources: driverRows } = await users.items
          .query({
            query: "SELECT c.userId FROM c WHERE c.managerId = @managerId",
            // managerId used to filter drivers
            parameters: [{ name: "@managerId", value: user.userId }],
          })
          .fetchAll();

          // get only the driver userIds into an array
        const driverIds = driverRows.map((d) => d.userId).filter(Boolean);

        // If the manager has no drivers, return empty list
        if (driverIds.length === 0) return { status: 200, jsonBody: [] };

        // Query assignments that belong to those drivers
        const { resources } = await assignments.items
          .query({
            query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@driverIds, c.driverId) ORDER BY c.createdAt DESC",
            // Pass the array of driverIds into the query
            parameters: [{ name: "@driverIds", value: driverIds }],
          })
          .fetchAll();

          // Return assignments for all drivers managed by this manager
        return { status: 200, jsonBody: resources };
      }

      // ADMIN: all assignments
      // Query every assignment in the database
      const { resources } = await assignments.items
        .query("SELECT * FROM c ORDER BY c.createdAt DESC")
        .fetchAll();

        // Return all assignments
      return { status: 200, jsonBody: resources };
    } catch (err) {
        // If any error happens, return a server error
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});