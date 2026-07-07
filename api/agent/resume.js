import { resumeAgent } from "../../server/agent/agentRuntime.js";

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
    const result = await resumeAgent(getBody(req));
    sendJson(res, 200, result);
  } catch (error) {
    console.warn("[agent-api] resume failed:", error?.message || error);
    sendJson(res, 200, {
      ok: true,
      status: "basic_advice",
      sessionId: "",
      trace: [],
      missingFields: [],
      pendingApproval: null,
      recommendation: {
        decision: "谨慎小批量验证",
        summary: "当前可以继续查看基础报告，并先按小批量、可复盘的方式验证。",
        confidence: "low",
        rationale: ["基础报告、产品库、PK、复盘和导出功能不受影响。"],
      },
      nextActions: ["人工核实竞品价格、供应商条件和物流包装成本。"],
      sessionSnapshot: null,
    });
  }
}
