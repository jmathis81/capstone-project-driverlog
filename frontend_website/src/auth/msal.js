import { PublicClientApplication } from "@azure/msal-browser";


export const msalConfig = {
  auth: {
    // Azure App Registration
    clientId: "8a653568-603e-4249-aa36-373da6f46ffa",
    // Azure tenant ID
    authority: "https://login.microsoftonline.com/1e398b4b-eeb6-4dba-9585-6ec8a8e4daf3",
    // Where users are redirected after login
    redirectUri: "http://localhost:5173",
    // Where users go after logout
    postLogoutRedirectUri: "http://localhost:5173/Login",
  },
  cache: {
    // Store login session in browser session storage and clears when browser tab closes
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    allowRedirectInIframe: false,
  }
};

export const loginRequest = {
    // Custom API scope defined in Azure App Registration
    scopes: ["api://8a653568-603e-4249-aa36-373da6f46ffa/access_as_user"],

};
// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);