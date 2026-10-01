import http from "node:http";
import { handleApi } from "./api.js";
import { HttpError, sendJson } from "./http.js";
import { applySecurityHeaders } from "./security.js";
import { serveStatic } from "./static.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);

  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const known = error instanceof HttpError;
    sendJson(res, known ? error.status : 500, {
      error: known ? error.message : "Internal server error"
    });
  }
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, host, () => {
  process.stdout.write(`Vitalis running at http://${host}:${port}\n`);
});
