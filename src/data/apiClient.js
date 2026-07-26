export const API_BASE_URL = "http://127.0.0.1:4174";

export function buildApiUrl(path, baseUrl = API_BASE_URL) {
  return `${baseUrl}${path}`;
}

export async function getJson(path, options = {}) {
  const { baseUrl = API_BASE_URL, fetchImpl = fetch } = options;
  const response = await fetchImpl(buildApiUrl(path, baseUrl));
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export async function putJson(path, body, options = {}) {
  const { baseUrl = API_BASE_URL, fetchImpl = fetch } = options;
  const response = await fetchImpl(buildApiUrl(path, baseUrl), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
}
