async function request(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("The server is unreachable. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body && body.error) || "The request could not be completed.");
  }
  return body;
}

export const api = {
  episodes: () => request("/api/episodes"),
  symptoms: () => request("/api/symptoms"),
  diseases: (params) => request(`/api/diseases?${new URLSearchParams(params)}`),
  disease: (id) => request(`/api/diseases/${encodeURIComponent(id)}`),
  assess: (symptoms) =>
    request("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms })
    })
};
