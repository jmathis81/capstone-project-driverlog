import { msalInstance, loginRequest } from "./msal";

// Get the currently signed-in account
export function getActiveAccount() {
  // Try to get the active account from MSAL
  let account = msalInstance.getActiveAccount();

  // If no active account is set then check if there are any cached accounts
  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    // If we find at least one account then set the first one as active
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
      account = accounts[0];
    }
  }
  // Return the active account
  return account;
}

// Start Microsoft login redirect
export function login() {
  // Redirects user to Microsoft login page
  return msalInstance.loginRedirect(loginRequest);
}

// Redirects to Microsoft logout then after logout, sends user back to /login
export function logout() {
  return msalInstance.logoutRedirect({ postLogoutRedirectUri: "/login" });
}

// Get the logged-in user's email
export function getEmail() {
  const acct = getActiveAccount();

  // Return the username (email) if logged in
  return acct?.username ?? null;
}