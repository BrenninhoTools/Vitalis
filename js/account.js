const accountKey = "vitalis-account";
const issuers = new Set(["accounts.google.com", "https://accounts.google.com"]);

let scriptPromise;

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function safePicture(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".googleusercontent.com") ? parsed.href : "";
  } catch {
    return "";
  }
}

export function decodeCredential(credential, clientId) {
  const payload = String(credential).split(".")[1];
  if (!payload || !clientId) throw new Error("Invalid credential");

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));

  if (claims.aud !== clientId || !issuers.has(claims.iss) || !(claims.exp * 1000 > Date.now()) || !claims.sub) {
    throw new Error("Credential rejected");
  }

  return {
    sub: String(claims.sub),
    name: String(claims.name || claims.email || "Google user"),
    email: String(claims.email || ""),
    picture: safePicture(claims.picture)
  };
}

export function readAccount() {
  try {
    const account = JSON.parse(read(accountKey));
    return account && typeof account.sub === "string" ? account : null;
  } catch {
    return null;
  }
}

export function saveAccount(account) {
  write(accountKey, JSON.stringify(account));
}

export function clearAccount() {
  write(accountKey, null);
}

export function rememberEpisode(sub, id) {
  write(`vitalis-last-${sub}`, String(id));
}

export function recallEpisode(sub) {
  const value = Number(read(`vitalis-last-${sub}`));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function loadClientId() {
  try {
    const response = await fetch("data/config.json");
    const config = await response.json();
    return typeof config.googleClientId === "string" ? config.googleClientId.trim() : "";
  } catch {
    return "";
  }
}

export function loadGoogle() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        scriptPromise = undefined;
        script.remove();
        reject(new Error("Google sign in could not be loaded. Check your connection and try again."));
      };
      document.head.append(script);
    });
  }
  return scriptPromise;
}
