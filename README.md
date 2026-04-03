# Frontend App
This app is the main use component for a user attempting to log routing data
This app currently allows the user to start and stop a route, as well view the a history of summaries of routes created by the user

Installation: download the .apk file from the release page (do not download the source code, it is not needed). Install the .apk file on an android device. Run the app.

# Frontend Website
Project Overview: 
The DriverLog website is the web interface for the DriverLog system. It allows employers and administrators to log in, view the dashboard, send assignments to drivers, and view reports.

The website is connected to the backend API and database so it can display real data.
Built using:
- React
- Vite
- TailwindCSS
- Azure Functions
- Azure Cosmos DB
- Microsoft Authentication (MSAL)

Installation: 
Make sure Node.js is installed. 
Steps:
1. Open a terminal and clone the repository
2. Navigate to the 'frontend_website' folder
3. Run 'npm install' in the frontend_website folder
4. Run 'npm run dev'
5. Open the local URL provided in a web browser

User Instructions: 
1. Open the website in a browser.
2. Log in using Microsoft authentication.
3. After logging in, you will see the dashboard where you will be able to see an overview of everything that is currently happening. Like active drivers, open assignments, reports today, recent activity, etc.
4. From the dashboard, you can navigate to the different pages:
   - The Assignments page to assign tasks to drivers if you're logged in as an Admin or Manager
   - The reports page that will allow you to see the drivers Daily Reports and Weekly Reports
   - The flagged page still has placeholders, but will include real data soon
5. Log out when finished.
# Frontend Website PUBLIC DOMAIN
https://salmon-smoke-0a03eb20f.1.azurestaticapps.net

# BACKEND Info
Using Azure Functions for API endpoints and Cosmos DB for database to store route information.

Cosmos DB (NoSQL) currently has three containers defined.
* routes
    * This container holds route information.
        * id
        * routeId
        * userId
        * status (Active or Completed)
        * startTime
* routePoints
    * Each route point (GPS Coordinate) taken by the client device is uploaded here associated with a route.
        * id
        * routeId
        * ts (epoch time when point was taken)
        * lat
        * lon
        * speed (meters per second)
* routeSummaries
    * After routes have been completed, summary information about the route is created by the endRoute function and uploaded to this container.
        * id
        * routeId
        * userId
        * pointCount (number of points collected during route)
        * durationSeconds
        * totalDistanceMeters
        * totalDistanceMile
        * averageSpeedMph
        * completedAt (Date/Time when route completed)

Azure functions which expose 3 API endpoints used to interact with the backend.

* startRoute.js
    * This function starts the route by generating unique UUID for the route and passing back to client as response.
    * Creates the new route in the routes container of the database
* uploadPoints.js
    * Client calls this endpoint and sends json file over containing the ts, lat, lon, speed of each point.
    * Updates the routePoints container in database which each point.
    * Each points ID in DB is the routeID + ts (epoch time point taken)
* endRoute.js
    * This function ends the route and generates the summary data from data collected during the route.
    * Summary data generated from this function about the route is uploaded to the routeSummaries container in the database
<details>

<summary>Click here to see how to Connect to Backend</summary>

## How to connect to Azure function endpoints to start, add points, and end a GPS route.
Header must include ----> Key = Content-Type ; Value = application/json


Starting route----
URL : https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/routes/start
BODY of JSON is empty : {}

Adding Points----
https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/routes/r-50f935f3-a637-4562-af78-56fd5323fc57/points
---Notes r-xxxx is the routeId retrieved from the response of starting the route.---
---Time (ts) is epoch time created on client mobile device----
BODY of JSON (example below) NOTE: USE EPOCH TIME (https://www.epoch101.com/) :
{
  "points": [
    { "ts": 1769913660, "lat": 47.6401, "lon": -122.1301, "speed": 4.1 },
    { "ts": 1769913665, "lat": 47.6408, "lon": -122.1290, "speed": 4.3 },
    { "ts": 1769913670, "lat": 47.6414, "lon": -122.1279, "speed": 4.6 }
  ]
}

Ending route----
URL: https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/routes/r-50f935f3-a637-4562-af78-56fd5323fc57/end
BODY : {}

</details>

# Connection Information for Authentication
I'm showing an example below of using Postman to get token. Most of the settings here will be relevant to using other tools to authenticate.
Bearer token for the user after authenticating and then adding it to the header in the request as Authorization with value of Bearer <token>
<details>
<summary>How I use Postman to get bearer token for authentication</summary>
##Example using Postman to authenticate
###Settings in the authentication tab to get token
You'll need the Auth URL and Access Token URL for your app
Once token is retrieve. I manually add it to body of request header as Authorization with value of Bearer <retrieved token value>

###Settings:
Auth Type = OAuth 2.0
Add authorization data to = Request Headers
Header prefix = Bearer
Grant type = Authorization Code
Authorize using browser = Yes
Auth URL = https://login.microsoftonline.com/1e398b4b-eeb6-4dba-9585-6ec8a8e4daf3/oauth2/v2.0/authorize
Access Token URL = https://login.microsoftonline.com/1e398b4b-eeb6-4dba-9585-6ec8a8e4daf3/oauth2/v2.0/token
Client ID = <Client ID of the app. Supplied as needed>
Client Secret = <Supplied as needed>
Scope = api://8a653568-603e-4249-aa36-373da6f46ffa/access_as_user
Client Authentication = Send client credentials in body
Refresh Token URL = <Same as Access Token URL if needed>
</details>

## For Mobile Auth App with Android
<details>
<summary>Click to see Mobile Auth info</summary>
### In auth_config.json we will need something like this...
{
  "client_id": "8a653568-603e-4249-aa36-373da6f46ffa",
  "authorization_user_agent": "DEFAULT",
  "redirect_uri": "msal8a653568-603e-4249-aa36-373da6f46ffa://auth",
  "account_mode": "SINGLE",
  "authorities": [
    {
      "type": "AAD",
      "audience": {
        "type": "AzureADMyOrg",
        "tenant_id": "1e398b4b-eeb6-4dba-9585-6ec8a8e4daf3"
      }
    }
  ]
}

### Request correct scope when getting token
String[] scopes = {
    "api://8a653568-603e-4249-aa36-373da6f46ffa/access_as_user"
};

### When sending token to app
Add these to Request Header where <access_token> is the token retrieved from the response after login.
Authorization: Bearer <access_token>
</details>

## Website MSAL config for authentication
<details>
<summary>Click to see Web MSAL Auth config info</summary>
### Using React or plain JavaScript
Install the msal
npm install @azure/msal-browser

### MSAL config
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "8a653568-603e-4249-aa36-373da6f46ffa",
    authority: "https://login.microsoftonline.com/1e398b4b-eeb6-4dba-9585-6ec8a8e4daf3",
    redirectUri: "http://localhost:3000" // or prod URL
  }
};

const msalInstance = new PublicClientApplication(msalConfig);


### Login and Get Access Token
const loginRequest = {
  scopes: ["api://8a653568-603e-4249-aa36-373da6f46ffa/access_as_user"]
};

await msalInstance.loginRedirect(loginRequest);

#### After login
const response = await msalInstance.acquireTokenSilent(loginRequest);
const accessToken = response.accessToken;

### How to call our app but with placeholders

fetch("https://yourfunctionapp.azurewebsites.net/api/YourFunction", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${accessToken}`
  }
});
</details>

## How to setup user and configure roles for user.
<details>
<summary> Click here to view user and role setup</summary>

### Setup new user (Manager, Driver, or Admin) in Azure Auth tenant
Logon to our new Auth tenant with your GSW creds or local creds that have admin access

The tenant ID is 1e398b4b-eeb6-4dba-9585-6ec8a8e4daf3.

The tenant domain is jessegswoutlook.onmicrosoft.com

Once logged into tenant open Entra ID.

Create a new user in Entra ID.

After creating the new user, go back to Entra ID and select Enterprise Applications.

Open capstonedriverlogauth application.

Go to Manager/Users and Groups section.

You can add the new user here or edit and existing user to change roles.

When adding a user you can select one of the three roles defined.

### How to configure new roles if needed

Open Entra ID and go to App Registrations

Look for capstonedriverlogauth app registration

Within the app registration go into the manage section and select app roles

Create new app role and give it a description.

### Manager role to users

To assign a manager to a user we need to logon to our Cosmos DB in the School Tenant where our functions and database reside

That tenant id is e21eed1c-1f72-4ad4-84ab-a7ae53ab95c2.

Once signed into our tenant make sure you are in the subscription ea78cf46-eefe-4dfb-932f-ee7f2ab4035f. Search for Cosmos DB

When in the Cosmos DB blade use Data Explorer to view the database and containers.

Go into the users container. Click on items.

You'll see a list of all users created in the DB by userId (This comes from the other tenant).

Locate the Driver you wish to modify. You should see roles and the names of the accounts.

Once located add the following to the account in the JSON file and click the update icon to update the record.

Must be in this format (remember the trailing comma if not the last entry!)

"managerId": "<userId of the manager>",

Example =  "managerId": "ec3cc791-3dc0-43c3-8527-c13b215191a3",


</details>
