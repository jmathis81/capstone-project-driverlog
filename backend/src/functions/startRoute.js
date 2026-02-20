const { app } = require("@azure/functions");
const { v4: uuid } = require("uuid");
const { routes } = require("../../shared/cosmosClient");
const { getUserFromRequest } = require("../../shared/auth");

app.http("startRoute", {
  methods: ["POST"],
  route: "routes/start",
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      //added for auth to get user info
      const user = getUserFromRequest(req);
      if (!user) {
        return { status: 401, body: "Unauthorized" };
      }

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


