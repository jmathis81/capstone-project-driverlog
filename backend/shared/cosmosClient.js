const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);

const database = client.database("mobility");

module.exports = {
  routes: database.container("routes"),
  routePoints: database.container("routePoints"),
  routeSummaries: database.container("routeSummaries"),
  users: database.container("users")
};
