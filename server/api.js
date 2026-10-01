import { diseases, episodes, symptoms } from "./data.js";
import { assess, filterDiseases, publicSymptoms } from "../js/assessment.js";
import { HttpError, readJson, sendJson } from "./http.js";
import { allow } from "./rateLimit.js";

const diseaseTypes = new Set(diseases.map((disease) => disease.type));
const symptomKeys = new Set(symptoms.map((symptom) => symptom.key));

function listDiseases(url) {
  const type = url.searchParams.get("type") || "all";
  const query = url.searchParams.get("q") || "";

  if (type !== "all" && !diseaseTypes.has(type)) {
    throw new HttpError(400, "Unknown condition type");
  }

  const items = filterDiseases(diseases, type, query);

  return { items, total: items.length };
}

function findDisease(id) {
  const disease = diseases.find((item) => item.id === id);
  if (!disease) throw new HttpError(404, "Condition not found");
  return disease;
}

async function createAssessment(req) {
  const body = await readJson(req);
  const keys = body && body.symptoms;

  if (!Array.isArray(keys) || keys.length === 0 || keys.length > symptoms.length) {
    throw new HttpError(400, "Select at least one symptom");
  }
  if (!keys.every((key) => typeof key === "string" && symptomKeys.has(key))) {
    throw new HttpError(400, "Unknown symptom in selection");
  }

  return assess(keys, diseases, symptoms);
}

const cache = { "Cache-Control": "public, max-age=60" };
const noStore = { "Cache-Control": "no-store" };

const routes = {
  "GET /api/health": () => [200, { status: "ok" }, noStore],
  "GET /api/episodes": () => [200, { items: episodes }, cache],
  "GET /api/symptoms": () =>
    [200, { items: publicSymptoms(symptoms) }, cache],
  "GET /api/diseases": (req, url) => [200, listDiseases(url), cache],
  "POST /api/assessments": async (req) => [200, await createAssessment(req), noStore]
};

export async function handleApi(req, res, url) {
  const pathname = url.pathname.replace(/\/+$/, "");
  const detail = pathname.match(/^\/api\/diseases\/([A-Za-z0-9]{1,32})$/);

  let handler = routes[`${req.method} ${pathname}`];
  if (!handler && detail && req.method === "GET") {
    handler = () => [200, findDisease(detail[1]), cache];
  }

  if (!handler) {
    const known = detail || Object.keys(routes).some((key) => key.endsWith(` ${pathname}`));
    throw new HttpError(known ? 405 : 404, known ? "Method not allowed" : "Endpoint not found");
  }

  if (req.method === "POST" && !allow(req.socket.remoteAddress || "unknown", 30)) {
    throw new HttpError(429, "Too many requests, try again shortly");
  }

  const [status, payload, headers] = await handler(req, url);
  sendJson(res, status, payload, headers);
}
