import { getAccessToken } from "../auth/token";
const BASE_URL = "https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api"
//const BASE_URL = "http://localhost:7071/api";

async function handleResponse(res) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let message = `Request failed: ${res.status}`;

    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      if (data?.error) message = data.error;
      else message = JSON.stringify(data);
    } else {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }

    throw new Error(message);
  }
  return res.json();
 }

//Authorization
async function authFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) return;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  return handleResponse(res);
}

// GET route summaries
export async function getSummaries() {
    return authFetch("/getSummaries", { method: "GET" });
}

//GET routes
export async function getRoutes() {
  return authFetch("/getRoutes", { method: "GET" });
}

export async function getAssignments() {
  return authFetch("/getAssignments", { method: "GET" });
}

export async function getMe(){
  return authFetch("/me", { method: "GET" });
}

export async function createAssignment(payload) {
  return authFetch("/createAssignment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAssignmentStatus(payload) {
  return authFetch("/updateAssignStatus", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}