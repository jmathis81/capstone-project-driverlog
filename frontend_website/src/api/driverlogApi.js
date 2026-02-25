import { getAccessToken } from "../auth/token";
const BASE_URL = "https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api"

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
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
  //const res = await authFetch(`${BASE_URL}/getSummaries`, {
    //method: "GET",
    return authFetch("/getSummaries", { method: "GET" });
}