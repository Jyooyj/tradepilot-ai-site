import { approveAgent } from "../../server/agent/agentRuntime.js";

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  try {
    const result = await approveAgent(getBody(req));
    sendJson(res, 200, result);
  } catch (error) {
    console.warn("[agent-api] approve failed:", error?.message || error);
    sendJson(res, 200, {
      ok: false,
      status: "approval_not_ready",
      message: "当前没有可确认的候选保存动作。",
    });
  }
}
