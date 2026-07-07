import { getAgentSessionResponse } from "../../../server/agent/agentRuntime.js";

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function getSessionId(req) {
  const queryId = req.query?.id;
  if (Array.isArray(queryId)) return queryId[0] || "";
  return queryId || "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  try {
    sendJson(res, 200, getAgentSessionResponse(getSessionId(req)));
  } catch (error) {
    console.warn("[agent-api] session lookup failed:", error?.message || error);
    sendJson(res, 200, {
      ok: false,
      status: "snapshot_required",
      sessionId: getSessionId(req),
      message: "当前服务端没有命中该 session，请使用本地 session snapshot 继续恢复。",
    });
  }
}
