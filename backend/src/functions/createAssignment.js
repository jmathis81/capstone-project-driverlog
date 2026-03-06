const { app } = require("@azure/functions");
const { assignments, users } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("createAssignment", {
  methods: ["POST"],
  authLevel: "anonymous",

  handler: async (req) => {
    try {
      // Get the authenticated user from the request token
      const authUser = requireUser(req);
      // Makes sure the user exists in the database (create if first login)
      const user = await getOrCreateUser(authUser);

      // Check if the logged-in user has permission
      // only Admin or Manager can create assignments
      if (user.role !== "Admin" && user.role !== "Manager") {
        return { status: 403, jsonBody: { error: "Forbidden" } };
      }

      // reads JSON body sent from frontend
      const body = await req.json();

      const title = String(body.title || "").trim(); // get assignment title
      let driverId = String(body.driverId || "").trim(); // get driverId (can be userId OR email)
      let driverEmail = String(body.driverEmail || "").trim(); // driver email
      const priority = String(body.priority || "Normal").trim(); // assignment priority (stays at Normal by default)
      const notes = String(body.notes || "").trim(); // notes and instructions for the driver

      // error shown if title is missing
      if (!title) return { status: 400, jsonBody: { error: "Title is required" } };
      // error shown if driverId field is missing
      if (!driverId) return { status: 400, jsonBody: { error: "driverId is required" } };

      // If admin or manager typed an email into the Driver ID box, look up userId
      // check if input has an @
      if (driverId.includes("@")) {
        // Convert email to lowercase
        const emailInput = driverId.toLowerCase();

        // Query Cosmos to find a user with matching email (case-insensitive)
        const { resources: matches } = await users.items
          .query({
            query:
              "SELECT TOP 1 c.userId, c.email, c.username FROM c WHERE LOWER(c.email) = @e OR LOWER(c.username) = @e",
              // Parameter passed to query
            parameters: [{ name: "@e", value: emailInput }],
          })
          .fetchAll();

          // Get the first matching user
        const found = matches?.[0];

        // If no user found, return error
        if (!found?.userId) {
          return { status: 400, jsonBody: { error: "No driver found with that email" } };
        }

        driverId = String(found.userId).trim();
        // save email for display in UI
        driverEmail = String(found.email || found.username || emailInput).trim();
      } else {
        // Admin or Manager typed a USERID. If driverEmail not provided, try to look it up for display.
        if (!driverEmail) {
          // Query database to get drivers email for UI display
          const { resources: rows } = await users.items
            .query({
              query: "SELECT TOP 1 c.email, c.username FROM c WHERE c.userId = @driverId",
              parameters: [{ name: "@driverId", value: driverId }],
            })
            .fetchAll();

            // Gets the first result
          const u = rows?.[0];
          // If user found, save email for display in UI
          if (u) {
            driverEmail = String(u.email || u.username || "").trim();
          }
        }
      }

      // if Manager, confirm driver belongs to them
      if (user.role === "Manager") {
        const { resources: rows } = await users.items
          .query({
            query:
              "SELECT VALUE COUNT(1) FROM c WHERE c.userId = @driverId AND c.managerId = @managerId",
            parameters: [
              { name: "@driverId", value: driverId },
              { name: "@managerId", value: user.userId },
            ],
          })
          .fetchAll();

          // Get the count of drivers assigned to this manager
        const count = rows?.[0] || 0;
        // If driver does not belong to this manager, return error
        if (count === 0) {
          return {
            status: 403,
            jsonBody: { error: "Driver is not assigned to this manager" },
          };
        }
      }

      // build assignment document
      // current timestamp
      const now = new Date().toISOString();
      // create assignment object
      const doc = {
        id: `a-${crypto.randomUUID()}`, // unique assignment id
        driverId, // partition key 
        driverEmail, // driver email for display in UI
        createdById: user.userId, // user who created the assignment
        createdByRole: user.role, // role of creater (Admin or Manager)
        title, // assignment title
        notes, // assignment notes or instructions
        priority, // assignment priority level
        status: "Open", // default status
        createdAt: now, // timestamp when created
        updatedAt: now, // timestamp when updated
      };

      // save assignment to Cosmos
      await assignments.items.create(doc);

      // Return success response with created assignment
      return { status: 201, jsonBody: doc };
    } catch (err) {
      // If any error occurs return 500 server error
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});