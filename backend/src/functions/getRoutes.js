const { app } = require("@azure/functions");
const { routes, users } = require("../../shared/cosmosClient");
const { requireUser } = require("../../shared/auth");
const { getOrCreateUser } = require("../../shared/userService");

// Start of today in UTC (00:00:00.000Z)
function startOfTodayUTCISO() {
  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return startUtc.toISOString();
}

// Start of tomorrow in UTC (00:00:00.000Z)
function startOfTomorrowUTCISO() {
  const now = new Date();
  const startTomorrowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return startTomorrowUtc.toISOString();
}

app.http("getRoutes", {
  methods: ["GET"],
  authLevel: "anonymous",

  handler: async (req) => {
    try {
      const authUser = requireUser(req);
      const user = await getOrCreateUser(authUser);


      const startToday = startOfTodayUTCISO();
      const startTomorrow = startOfTomorrowUTCISO();

      // started today (UTC) + still active + not ended
      const baseWhere = `
        LOWER(c.status) = "active"
        AND IS_DEFINED(c.startTime)
        AND c.startTime >= @startToday
        AND c.startTime < @startTomorrow
        AND (NOT IS_DEFINED(c.endTime) OR IS_NULL(c.endTime) OR c.endTime = "")
      `;

      let query;

      // Drivers can only see their own routes
      if (user.role === "Driver") {
        query = {
          query: `
            SELECT c.userId
            FROM c
            WHERE ${baseWhere}
              AND c.userId = @userId
          `,
          parameters: [
            { name: "@startToday", value: startToday },
            { name: "@startTomorrow", value: startTomorrow },
            { name: "@userId", value: user.userId },
          ],
        };
        // Managers can only see their own drivers routes
      } else if (user.role === "Manager") {
        const { resources: driverRows } = await users.items
          .query({
            query: `
              SELECT c.userId
              FROM c
              WHERE c.managerId = @managerId
            `,
            parameters: [{ name: "@managerId", value: user.userId }],
          })
          .fetchAll();

        const driverIds = driverRows.map((d) => d.userId).filter(Boolean);

        if (driverIds.length === 0) {
          return {
            status: 200,
            jsonBody: { activeDriverCount: 0, activeDrivers: [], startToday },
          };
        }
        // Query only active routes for those drivers 
        query = {
          query: `
            SELECT c.userId
            FROM c
            WHERE ${baseWhere}
              AND ARRAY_CONTAINS(@driverIds, c.userId)
          `,
          parameters: [
            { name: "@startToday", value: startToday },
            { name: "@startTomorrow", value: startTomorrow },
            { name: "@driverIds", value: driverIds },
          ],
        };
        // Admin can see all routes
      } else {
        // Admin sees ALL active routes
        query = {
          query: `
            SELECT c.userId
            FROM c
            WHERE ${baseWhere}
          `,
          parameters: [
            { name: "@startToday", value: startToday },
            { name: "@startTomorrow", value: startTomorrow },
          ],
        };
      }

      const { resources } = await routes.items.query(query).fetchAll();

      const activeSet = new Set(resources.map((r) => r.userId).filter(Boolean));

      return {
        status: 200,
        jsonBody: {
          // number of active drivers
          activeDriverCount: activeSet.size,
          // array of driver IDs
          activeDrivers: Array.from(activeSet),
          startToday,
        },
      };
    } catch (error) {
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});