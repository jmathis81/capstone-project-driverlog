const { app } = require("@azure/functions");
//const { getUserFromRequest } = require("../../shared/auth");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("me", {
  methods: ["GET"],
  route: "me",
  authLevel: "anonymous", // Easy Auth will handle protection
  handler: async (req, context) => {
    try {
      //const user = getUserFromRequest(req);
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);

      if (!user) {
        return {
          status: 401,
          jsonBody: { error: "Not authenticated" }
        };
      }

      return {
        status: 200,
        jsonBody: {
          userId: user.userId,
          email: user.username,
          identityProvider: user.identityProvider,
          role: user.role,
        }
      };

    } catch (err) {
      context.log("ME ENDPOINT ERROR:", err);
      return {
        status: 500,
        jsonBody: { error: "Failed to retrieve user info" }
      };
    }
  }
});
