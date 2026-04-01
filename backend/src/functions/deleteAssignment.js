const { app } = require("@azure/functions");
const { assignments } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

app.http("deleteAssignment", {
  methods: ["DELETE"],
  route: "assignments/{assignmentId}",
  authLevel: "anonymous",

  handler: async (req) => {
    try {
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);

      // Only Admin and Manager can delete assignments
      if (user.role !== "Admin" && user.role !== "Manager") {
        return { status: 403, jsonBody: { error: "Forbidden" } };
      }

      const assignmentId = req.params.assignmentId;
      const body = await req.json();
      const driverId = String(body.driverId || "").trim();

      if (!assignmentId) return { status: 400, jsonBody: { error: "assignmentId is required" } };
      if (!driverId) return { status: 400, jsonBody: { error: "driverId is required" } };

      // Read first to confirm it exists and manager owns it
      const { resource: doc } = await assignments.item(assignmentId, driverId).read();

      if (!doc) return { status: 404, jsonBody: { error: "Assignment not found" } };

      // Manager can only delete assignments they created
      if (user.role === "Manager" && doc.createdById !== user.userId) {
        return { status: 403, jsonBody: { error: "You can only delete assignments you created" } };
      }

      await assignments.item(assignmentId, driverId).delete();

      return { status: 200, jsonBody: { deleted: true, id: assignmentId } };

    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});