const { app } = require("@azure/functions");
const { v4: uuid } = require("uuid");
const { routes, assignments } = require("../../shared/cosmosClient");
const { requireUser, requireAnyRole } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");
const { createFlagEntry } = require("../../shared/flagEntryService");

app.http("startRoute", {
  methods: ["POST"],
  route: "routes/start",
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      //added for auth to get user info
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);

      //added to require any of the listed roles to start a route
      requireAnyRole(user, ["Driver", "Manager", "Admin"]);

      //For testing without auth to add user infor to route. enable (remove comment) if auth disabled for testing
      //const userId = "test-user"; // later from Entra ID

      const routeId = `r-${uuid()}`;

      const route = {
        id: routeId,
        routeId,
        userId: user.userId,
        username: user.username,
        status: "active",
        startTime: new Date().toISOString()
      };

      await routes.items.create(route);

      // Check if driver has any active assignments (Open or InProgress)
      // Route is still created regardless — we never block the driver,
      // we just flag it for the manager/admin to review.
      try {
        const { resources: activeAssignments } = await assignments.items
          .query({
            query: `
              SELECT TOP 1 c.id FROM c
              WHERE c.driverId = @driverId
              AND (c.status = "Open" OR c.status = "InProgress")
            `,
            parameters: [{ name: "@driverId", value: user.userId }],
          })
          .fetchAll();

        if (activeAssignments.length === 0) {
          await createFlagEntry({
            driverId: user.userId,
            driverEmail: user.username || "",
            reason: "Driver started a route with no active assignment",
            severity: "Medium",
            notes: "Driver had no Open or InProgress assignments when this route began.",
            sourceType: "route",
            sourceId: routeId,
            createdBy: "system",
          });
        }
      } catch (flagErr) {
        // Never block route creation if the flag check fails
        context.log("ASSIGNMENT FLAG ERROR:", flagErr);
      }

      return {
        status: 201,
        jsonBody: { routeId }
      };

    } catch (err) {
      context.log(err);
      return { status: 500, body: "Failed to start route" };
    }
  }
});