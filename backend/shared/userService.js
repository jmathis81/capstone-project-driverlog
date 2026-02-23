const { users } = require("./cosmosClient");

async function getOrCreateUser(authUser) {

  const { resources } = await users.items.query({
    query: "SELECT * FROM c WHERE c.userId = @userId",
    parameters: [
      { name: "@userId", value: authUser.userId }
    ]
  }).fetchAll();

  if (resources.length) {

    const existing = resources[0];

    // OPTIONAL: sync role changes from Entra ID
    const tokenRole = authUser.roles?.[0];

    if (tokenRole && existing.role !== tokenRole) {
      existing.role = tokenRole;

      await users.item(existing.id, existing.userId)
        .replace(existing);
    }

    return existing;
  }

  // Create user from Entra role
  const newUser = {
    id: authUser.userId,
    userId: authUser.userId,
    username: authUser.username,
    role: authUser.roles?.[0] || "Driver",
    createdAt: new Date().toISOString()
  };

  await users.items.create(newUser);

  return newUser;
}

module.exports = { getOrCreateUser };