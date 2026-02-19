function getUserFromRequest(req) {
  const header = req.headers["x-ms-client-principal"];
  if (!header) return null;

  const decoded = Buffer.from(header, "base64").toString("utf8");
  const principal = JSON.parse(decoded);

  return {
    userId: principal.userId,
    username: principal.userDetails,
    identityProvider: principal.identityProvider,
    claims: principal.claims
  };
}

module.exports = { getUserFromRequest };
