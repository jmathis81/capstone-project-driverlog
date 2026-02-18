const BASE_URL =
  "https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/getSummaries";

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

// GET route summaries
export async function getSummaries() {
  const res = await fetch(`${BASE_URL}/getSummaries`, {
    method: "GET"
  });
  return handleResponse(res);
}