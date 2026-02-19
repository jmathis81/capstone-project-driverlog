const { app } = require("@azure/functions");

//load functions
require("./src/functions/startRoute");
require("./src/functions/endRoute");
require("./src/functions/uploadPoints");
require("./src/functions/getSummaries");
require("./src/functions/me");

// Set up the Functions app
app.setup({ enableHttpStream: true });

// -----------------------------
// Export app for Azure Functions runtime
// -----------------------------
module.exports = app;
