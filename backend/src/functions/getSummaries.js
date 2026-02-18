const { app } = require("@azure/functions");
const { getContainer } = require("../../shared/cosmosClient");

app.http("getSummaries", {
    methods: ["GET"],
    authLevel: "anonymous",
    handler: async (req, context) => {
        try {
            //Connect to the Cosmos DB container "routeSummaries"
            const container = await getContainer("routeSummaries");

            // Create a query to get the top 25 route summaries
            const query = {
                query: "SELECT TOP 25 * FROM c ORDER BY c.completedAt DESC"
            };

            //runs the query and get the results
            const { resources } = await container.items.query(query).fetchAll();

            // Return the results to the frontend
            return {
                status: 200,
                jsonBody: resources
            };

        } catch (error) {
            //Sends error message if something goes wrong
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});