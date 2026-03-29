const { app } = require("@azure/functions");
const { flaggedEntries } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("updateFlagStatus", {
  methods: ["PATCH"],
  route: "flagged/{flagId}",
  authLevel: "anonymous",

  handler: async (req) => {
    try {
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);

      // Only Admin and Manager can resolve flags
      if (user.role !== "Admin" && user.role !== "Manager") {
        return { status: 403, jsonBody: { error: "Forbidden" } };
      }

      const flagId = req.params.flagId;
      const body = await req.json();
      const driverId = String(body.driverId || "").trim();
      const status = String(body.status || "").trim();

      if (!flagId) return { status: 400, jsonBody: { error: "flagId is required" } };
      if (!driverId) return { status: 400, jsonBody: { error: "driverId is required" } };
      if (!["Open", "Resolved"].includes(status)) {
        return { status: 400, jsonBody: { error: "status must be Open or Resolved" } };
      }

      // Read the existing flag document
      const { resource: doc } = await flaggedEntries.item(flagId, driverId).read();

      if (!doc) return { status: 404, jsonBody: { error: "Flag not found" } };

      // Update status and resolution info
      doc.status = status;
      doc.resolvedAt = status === "Resolved" ? new Date().toISOString() : null;
      doc.resolvedBy = status === "Resolved" ? user.username : null;

      await flaggedEntries.item(flagId, driverId).replace(doc);

      return { status: 200, jsonBody: doc };

    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});