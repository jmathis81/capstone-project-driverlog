const { flaggedEntries } = require("./cosmosClient");
const crypto = require("crypto");

// Normalizes severity input to a valid value
function normalizeSeverity(severity) {
  const s = String(severity || "Medium").trim().toLowerCase();
  if (s === "high") return "High";
  if (s === "low") return "Low";
  return "Medium";
}

// Creates a single flagged entry document in Cosmos
async function createFlagEntry(data) {
  const doc = {
    id: `f-${crypto.randomUUID()}`,
    driverId: data.driverId,
    driverEmail: data.driverEmail || "",
    reason: data.reason || "Flagged activity",
    severity: normalizeSeverity(data.severity),
    status: "Open",
    sourceType: data.sourceType || "routeSummary",
    sourceId: data.sourceId || "",
    notes: data.notes || "",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    createdBy: data.createdBy || "system",
  };

  await flaggedEntries.items.create(doc);
  return doc;
}

module.exports = { createFlagEntry };