import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import { sendText } from "./http.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const publicFiles = new Set(["index.html", "sw.js", "manifest.json", "404.html", "favicon.svg"]);
const publicDirs = new Set(["css", "js", "icons", "data"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

const compressible = new Set([".html", ".css", ".js", ".json", ".svg", ".txt"]);

function isPublic(relative) {
  if (publicFiles.has(relative)) return true;
  const parts = relative.split(path.sep);
  return parts.length > 1 && publicDirs.has(parts[0]);
}

async function resolveFile(pathname) {
  const target = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const filePath = path.join(root, target);
  const relative = path.relative(root, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !isPublic(relative)) return null;

  try {
    const info = await stat(filePath);
    return info.isFile() ? { filePath, info } : null;
  } catch {
    return null;
  }
}

async function sendNotFound(req, res) {
  const page = await resolveFile("/404.html");
  if (!page || req.method === "HEAD") return sendText(res, 404, "Not found");

  res.writeHead(404, {
    "Content-Type": mimeTypes[".html"],
    "Content-Length": page.info.size,
    "Cache-Control": "no-cache"
  });
  createReadStream(page.filePath).pipe(res);
}

export async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendText(res, 400, "Bad request");
  }
  if (pathname.includes("\0")) return sendText(res, 400, "Bad request");

  const file = await resolveFile(pathname);
  if (!file) return sendNotFound(req, res);

  const ext = path.extname(file.filePath).toLowerCase();
  const etag = `W/"${file.info.size.toString(16)}-${Math.floor(file.info.mtimeMs).toString(16)}"`;
  const headers = {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
    ETag: etag,
    Vary: "Accept-Encoding"
  };

  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  const gzip =
    compressible.has(ext) &&
    file.info.size > 1024 &&
    /\bgzip\b/.test(req.headers["accept-encoding"] || "");

  if (gzip) {
    headers["Content-Encoding"] = "gzip";
  } else {
    headers["Content-Length"] = file.info.size;
  }

  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const source = createReadStream(file.filePath);
  const onError = () => res.destroy();
  if (gzip) {
    pipeline(source, createGzip(), res, onError);
  } else {
    pipeline(source, res, onError);
  }
}
