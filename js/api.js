import { assess, filterDiseases, publicSymptoms } from "./assessment.js";

class Unavailable extends Error {}

let probe;
let datasets;

function apiAvailable() {
  if (!probe) {
    probe = fetch("api/health")
      .then((response) => response.ok && (response.headers.get("content-type") || "").includes("json"))
      .catch(() => {
        probe = undefined;
        return false;
      });
  }
  return probe;
}

async function remote(path, options) {
  if (!(await apiAvailable())) throw new Unavailable();

  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Unavailable();
  }

  const body = await response.json().catch(() => null);
  if (!body || response.status >= 500) throw new Unavailable();
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body;
}

function loadDatasets() {
  if (!datasets) {
    datasets = Promise.all(
      ["episodes", "diseases", "symptoms"].map((name) =>
        fetch(`data/${name}.json`).then((response) => {
          if (!response.ok) throw new Error();
          return response.json();
        })
      )
    )
      .then(([episodes, diseases, symptoms]) => ({ episodes, diseases, symptoms }))
      .catch(() => {
        datasets = undefined;
        throw new Error("The server is unreachable. Check your connection and try again.");
      });
  }
  return datasets;
}

async function call(path, options, local) {
  try {
    return await remote(path, options);
  } catch (error) {
    if (!(error instanceof Unavailable)) throw error;
    return local(await loadDatasets());
  }
}

export const api = {
  episodes: () => call("api/episodes", undefined, (data) => ({ items: data.episodes })),

  symptoms: () => call("api/symptoms", undefined, (data) => ({ items: publicSymptoms(data.symptoms) })),

  diseases: (params) =>
    call(`api/diseases?${new URLSearchParams(params)}`, undefined, (data) => {
      const items = filterDiseases(data.diseases, params.type, params.q);
      return { items, total: items.length };
    }),

  disease: (id) =>
    call(`api/diseases/${encodeURIComponent(id)}`, undefined, (data) => {
      const disease = data.diseases.find((item) => item.id === id);
      if (!disease) throw new Error("Condition not found");
      return disease;
    }),

  assess: (symptoms) =>
    call(
      "api/assessments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms })
      },
      (data) => {
        const known = new Set(data.symptoms.map((symptom) => symptom.key));
        if (!symptoms.length || !symptoms.every((key) => known.has(key))) {
          throw new Error("Select at least one symptom");
        }
        return assess(symptoms, data.diseases, data.symptoms);
      }
    )
};
