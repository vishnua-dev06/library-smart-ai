export const API_URL = "http://localhost:5000";

export async function readJson(response, fallbackMessage) {
  let data;

  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(fallbackMessage);
    }
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}
