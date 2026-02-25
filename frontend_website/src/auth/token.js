import { msalInstance, loginRequest } from "./msal";

// Get an access token to call the backend API
export async function getAccessToken(){
    // Get all signed-in accounts from MSAL cache
     const accounts = msalInstance.getAllAccounts();

     // If no user is signed in then redirect to Microsoft login
     if (accounts.length === 0) {
        await msalInstance.loginRedirect(loginRequest);
        return null;
     }

     // Use the first signed-in account
     const account = accounts[0];

     try{
        // Try to silently get a token 
        const result = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account,
        });
        // Return the access token
        return result.accessToken;

     } catch (error) {
        // If silent token request fails then redirect user to login again
        await msalInstance.loginRedirect(loginRequest);
        return null;
     }
}

