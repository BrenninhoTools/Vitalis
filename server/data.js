import { readFileSync } from "node:fs";

function load(name) {
  return JSON.parse(readFileSync(new URL(`./data/${name}.json`, import.meta.url), "utf8"));
}

export const episodes = load("episodes");
export const diseases = load("diseases");
export const symptoms = load("symptoms");
