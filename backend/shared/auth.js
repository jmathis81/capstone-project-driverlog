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

  // App Roles assigned in App Registration
  const roles = claims
      .filter(c => c.typ === "roles")
      .map(c => c.val);

  return {
    userId: getClaim(
      "http://schemas.microsoft.com/identity/claims/objectidentifier"
    ),
    username,
    identityProvider: principal.auth_typ,
    roles,
    claims
  };
}

/**
 * Require authenticated user helper
 */
function requireUser(req) {
  const user = getUserFromRequest(req);

  if (!user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  return user;
}

/**
 * Require a single specific role helper
 */
function requireRole(user, role) {
  if (!user.roles.includes(role)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
}

/**
 * Require any listed role helper
 */
function requireAnyRole(user, allowedRoles) {

  const userRoles =
    user.roles ||
    (user.role ? [user.role] : []);

  const hasRole = allowedRoles.some(role =>
    userRoles.includes(role)
  );

  if (!hasRole) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
}

/**
 * Require all listed roles helper
 */
function requireAllRoles(user, roles) {
  const hasAll = roles.every(role =>
    user.roles.includes(role)
  );

  if (!hasAll) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
}

module.exports = { getUserFromRequest, requireUser, requireRole, requireAnyRole, requireAllRoles };