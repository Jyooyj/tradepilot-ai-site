import http from "node:http";
import { URL } from "node:url";
import agentApproveHandler from "./api/agent/approve.js";
import agentRunHandler from "./api/agent/run.js";
import agentResumeHandler from "./api/agent/resume.js";
import agentSessionHandler from "./api/agent/session/[id].js";
import analyzeImageHandler from "./api/analyze-image.js";
import contentPatternHandler from "./api/content-pattern.js";
import generateAiInsightHandler from "./api/generate-ai-insight.js";

const HOST = "127.0.0.1";
const PORT = 3001;
const MAX_BODY_BYTES = Number(process.env.ECS_BODY_LIMIT_BYTES || 25 * 1024 * 1024);

const routes = new Map([
  ["/api/analyze-image", analyzeImageHandler],
  ["/api/content-pattern", contentPatternHandler],
  ["/api/generate-ai-insight", generateAiInsightHandler],
  ["/api/agent/run", agentRunHandler],
  ["/api/agent/resume", agentResumeHandler],
  ["/api/agent/approve", agentApproveHandler],
]);

class PayloadTooLargeError extends Error {
  constructor() {
    super("payload_too_large");
    this.statusCode = 413;
  }
}

async function readRequestBody(req) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (!rawBody) {
    return {};
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(rawBody);
  }

  return rawBody;
}

function createVercelResponse(res) {
  let statusCode = 200;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    json(payload) {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(payload));
    },
    send(payload = "") {
      if (!res.headersSent) {
        res.statusCode = statusCode;
      }
      res.end(payload);
    },
    end(payload = "") {
      if (!res.headersSent) {
        res.statusCode = statusCode;
      }
      res.end(payload);
    },
  };
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function handleApiRequest(req, res, handler, pathname, queryExtra = {}) {
  try {
    req.body = await readRequestBody(req);
    req.query = {
      ...Object.fromEntries(new URL(req.url, `http://${req.headers.host}`).searchParams),
      ...queryExtra,
    };
    await handler(req, createVercelResponse(res));
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { ok: false, error: "invalid_json" });
      return;
    }

    sendJson(res, error.statusCode || 500, {
      ok: false,
      error: error.message || "server_error",
      path: pathname,
    });
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (req.method === "GET" && normalizedPath === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "tradepilot-ecs-api",
      listen: `${HOST}:${PORT}`,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const handler = routes.get(normalizedPath);
  if (handler) {
    await handleApiRequest(req, res, handler, normalizedPath);
    return;
  }

  const sessionPrefix = "/api/agent/session/";
  if (req.method === "GET" && normalizedPath.startsWith(sessionPrefix)) {
    const id = decodeURIComponent(normalizedPath.slice(sessionPrefix.length));
    await handleApiRequest(req, res, agentSessionHandler, normalizedPath, { id });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
});

server.listen(PORT, HOST, () => {
  console.log(`TradePilot ECS API listening on http://${HOST}:${PORT}`);
});
