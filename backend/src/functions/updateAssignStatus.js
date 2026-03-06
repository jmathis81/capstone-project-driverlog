const { app } = require("@azure/functions");
const { assignments } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("updateAssignStatus", {
  methods: ["PATCH"],
  authLevel: "anonymous",

  handler: async (req) => {
    try {
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);

      const body = await req.json();
      const id = String(body.id || "").trim();
      const driverId = String(body.driverId || "").trim(); 
      const status = String(body.status || "").trim(); // Open / InProgress / Completed

      if (!id) return { status: 400, jsonBody: { error: "id is required" } };
      if (!driverId) return { status: 400, jsonBody: { error: "driverId is required" } };
      if (!status) return { status: 400, jsonBody: { error: "status is required" } };

      // read existing assignment 
      const { resource: doc } = await assignments.item(id, driverId).read();

      if (!doc) return { status: 404, jsonBody: { error: "Not found" } };

      // drivers can only update their own assignment
      if (user.role === "Driver" && doc.driverId !== user.userId) {
        return { status: 403, jsonBody: { error: "Forbidden" } };
      }

      // update doc
      doc.status = status;
      doc.updatedAt = new Date().toISOString();

      await assignments.item(id, driverId).replace(doc);

      return { status: 200, jsonBody: doc };
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});