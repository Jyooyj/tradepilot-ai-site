const AGENT_RUN_ENDPOINT = import.meta.env.VITE_AGENT_RUN_URL || "/api/agent/run";
const AGENT_RESUME_ENDPOINT = import.meta.env.VITE_AGENT_RESUME_URL || "/api/agent/resume";
const AGENT_APPROVE_ENDPOINT = import.meta.env.VITE_AGENT_APPROVE_URL || "/api/agent/approve";
const AGENT_SESSION_ENDPOINT = import.meta.env.VITE_AGENT_SESSION_URL || "/api/agent/session";

export const AGENT_SESSION_STORAGE_KEY = "tradepilot_agent_sessions_v1";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function buildBasicAdvice() {
  return {
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
  };
}

function readAgentSessionStore() {
  if (!canUseLocalStorage()) {
    return { sessions: {}, latestSessionId: "", latestByProductKey: {} };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(AGENT_SESSION_STORAGE_KEY) || "{}");
    return {
      sessions: asObject(parsed.sessions),
      latestSessionId: parsed.latestSessionId || "",
      latestByProductKey: asObject(parsed.latestByProductKey),
    };
  } catch (error) {
    console.warn("[agent-client] read session snapshot failed:", error?.message || error);
    return { sessions: {}, latestSessionId: "", latestByProductKey: {} };
  }
}

function writeAgentSessionStore(store) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(AGENT_SESSION_STORAGE_KEY, JSON.stringify({
      sessions: asObject(store.sessions),
      latestSessionId: store.latestSessionId || "",
      latestByProductKey: asObject(store.latestByProductKey),
    }));
  } catch (error) {
    console.warn("[agent-client] write session snapshot failed:", error?.message || error);
  }
}

export function buildAgentProductKey({ product, result } = {}) {
  const safeProduct = asObject(product);
  const safeResult = asObject(result);
  return [
    safeResult.productIdentity?.displayName || safeProduct.name || "",
    safeResult.productIdentity?.productTypeLabel || safeProduct.category || "",
    safeResult.totalScore ?? safeResult.score ?? "",
  ].join("|").slice(0, 240);
}

export function saveAgentSessionSnapshot(snapshot, context = {}) {
  const safeSnapshot = asObject(snapshot);
  if (!safeSnapshot.sessionId) return null;

  const store = readAgentSessionStore();
  const productKey = buildAgentProductKey(context);
  const nextStore = {
    sessions: {
      ...store.sessions,
      [safeSnapshot.sessionId]: safeSnapshot,
    },
    latestSessionId: safeSnapshot.sessionId,
    latestByProductKey: {
      ...store.latestByProductKey,
      ...(productKey ? { [productKey]: safeSnapshot.sessionId } : {}),
    },
  };

  writeAgentSessionStore(nextStore);
  return safeSnapshot;
}

export function loadAgentSessionSnapshot(sessionId) {
  const store = readAgentSessionStore();
  return asObject(store.sessions)[sessionId] || null;
}

export function loadLatestAgentSessionSnapshot(context = {}) {
  const store = readAgentSessionStore();
  const productKey = buildAgentProductKey(context);
  const sessionId = productKey && store.latestByProductKey[productKey]
    ? store.latestByProductKey[productKey]
    : store.latestSessionId;
  return sessionId ? asObject(store.sessions)[sessionId] || null : null;
}

function rememberResponseSession(data, context = {}) {
  const snapshot = asObject(data?.sessionSnapshot);
  if (snapshot.sessionId) {
    saveAgentSessionSnapshot(snapshot, context);
  }
  return data;
}

async function postJson(endpoint, payload, context = {}) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return buildBasicAdvice();
    }

    const data = await response.json();
    return rememberResponseSession(data && typeof data === "object" ? data : buildBasicAdvice(), context);
  } catch (error) {
    return buildBasicAdvice();
  }
}

export async function runTradePilotAgent({
  goal,
  product,
  result,
  marketEvidence,
  historySummary,
  historyRecords,
  review,
} = {}) {
  return postJson(AGENT_RUN_ENDPOINT, {
    goal: goal || "判断这个商品是否值得小批量拿样",
    product: asObject(product),
    result: asObject(result),
    marketEvidence: asObject(marketEvidence),
    historySummary: asObject(historySummary),
    historyRecords: asArray(historyRecords),
    review: asObject(review),
  }, { product, result });
}

export async function resumeTradePilotAgent({
  sessionId,
  sessionSnapshot,
  patch,
  product,
  result,
  historyRecords,
  review,
} = {}) {
  return postJson(AGENT_RESUME_ENDPOINT, {
    sessionId: sessionId || asObject(sessionSnapshot).sessionId || "",
    sessionSnapshot: asObject(sessionSnapshot),
    patch: asObject(patch),
    historyRecords: asArray(historyRecords),
    review: asObject(review),
  }, { product, result });
}

export async function approveAgentAction({
  sessionId,
  sessionSnapshot,
  pendingApproval,
} = {}) {
  return postJson(AGENT_APPROVE_ENDPOINT, {
    sessionId: sessionId || asObject(sessionSnapshot).sessionId || "",
    sessionSnapshot: asObject(sessionSnapshot),
    action: asObject(pendingApproval).action,
    pendingApproval: asObject(pendingApproval),
  });
}

export async function getServerAgentSession(sessionId) {
  if (!sessionId) return null;

  try {
    const response = await fetch(`${AGENT_SESSION_ENDPOINT}/${encodeURIComponent(sessionId)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch (error) {
    return null;
  }
}

export function toAgentResultFromSnapshot(snapshot) {
  const safeSnapshot = asObject(snapshot);
  if (!safeSnapshot.sessionId) return null;

  return {
    ok: true,
    status: safeSnapshot.status || "completed",
    sessionId: safeSnapshot.sessionId,
    trace: asArray(safeSnapshot.trace),
    missingFields: asArray(safeSnapshot.missingFields),
    pendingApproval: safeSnapshot.pendingApproval || null,
    recommendation: asObject(safeSnapshot.recommendation),
    nextActions: asArray(safeSnapshot.nextActions),
    sessionSnapshot: safeSnapshot,
  };
}
