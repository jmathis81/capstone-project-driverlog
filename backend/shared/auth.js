function getUserFromRequest(req) {

  const header = req.headers.get("x-ms-client-principal");
  if (!header) return null;

  const decoded = Buffer.from(header, "base64").toString("utf8");
  const principal = JSON.parse(decoded);

  const claims = principal.claims || [];

  const getClaim = (type) =>
    claims.find(c => c.typ === type)?.val;

  // Prefer modern Entra ID claims
  const username =
      getClaim("preferred_username") ||
      getClaim("email") ||
      getClaim("upn") ||
      getClaim("name");

  return {
    userId: getClaim(
      "http://schemas.microsoft.com/identity/claims/objectidentifier"
    ),
    username,
    identityProvider: principal.auth_typ,
    claims
  };
}

module.exports = { getUserFromRequest };