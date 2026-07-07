import { AGENT_STATUS, asArray, asObject, buildSessionId, normalizeAgentInput, text } from "./agentSchemas.js";
import { publicTraceEntry, sanitizePendingApproval, sanitizeVisibleList, sanitizeVisibleText } from "./agentGuardrails.js";

const SESSION_TTL_MS = Number(process.env.AGENT_SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const MAX_MESSAGES = 40;
const MAX_TRACE = 40;
const memorySessions = new Map();

function nowIso() {
  return new Date().toISOString();
}

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of memorySessions.entries()) {
    const updatedAt = Date.parse(session?.updatedAt || session?.createdAt || "");
    if (Number.isFinite(updatedAt) && now - updatedAt > SESSION_TTL_MS) {
      memorySessions.delete(sessionId);
    }
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeMessage(message = {}) {
  const source = asObject(message);
  const role = ["system", "user", "assistant", "tool"].includes(source.role) ? source.role : "";
  if (!role) return null;

  const normalized = {
    role,
    content: typeof source.content === "string" ? source.content.slice(0, 20000) : "",
  };

  if (role === "assistant" && Array.isArray(source.tool_calls)) {
    normalized.tool_calls = source.tool_calls.slice(0, 6).map((toolCall) => asObject(toolCall));
  }

  if (role === "tool" && source.tool_call_id) {
    normalized.tool_call_id = text(source.tool_call_id).slice(0, 160);
  }

  return normalized;
}

function normalizeMessages(messages = []) {
  return asArray(messages)
    .map(normalizeMessage)
    .filter(Boolean)
    .slice(-MAX_MESSAGES);
}

function normalizeTrace(trace = []) {
  return asArray(trace)
    .map((entry) => publicTraceEntry(entry))
    .slice(-MAX_TRACE);
}

function normalizeStatus(status) {
  if (Object.values(AGENT_STATUS).includes(status)) return status;
  return AGENT_STATUS.COMPLETED;
}

export function serializeAgentSession(session = {}) {
  const source = asObject(session);
  return {
    sessionId: text(source.sessionId),
    goal: text(source.goal),
    status: normalizeStatus(source.status),
    product: cloneJson(asObject(source.product)),
    result: cloneJson(asObject(source.result)),
    marketEvidence: cloneJson(asObject(source.marketEvidence)),
    historySummary: cloneJson(asObject(source.historySummary)),
    supplierChecklistSummary: cloneJson(asObject(source.supplierChecklistSummary)),
    contentTestPlanSummary: cloneJson(asObject(source.contentTestPlanSummary)),
    messages: normalizeMessages(source.messages),
    trace: normalizeTrace(source.trace),
    missingFields: sanitizeVisibleList(source.missingFields),
    pendingApproval: sanitizePendingApproval(source.pendingApproval),
    recommendation: cloneJson(asObject(source.recommendation)),
    nextActions: sanitizeVisibleList(source.nextActions),
    createdAt: text(source.createdAt, nowIso()),
    updatedAt: text(source.updatedAt, nowIso()),
  };
}

export function createAgentSession(rawInput = {}, messages = []) {
  const context = normalizeAgentInput(rawInput);
  const timestamp = nowIso();

  return serializeAgentSession({
    sessionId: buildSessionId(),
    goal: context.goal,
    status: AGENT_STATUS.COMPLETED,
    product: context.product,
    result: context.result,
    marketEvidence: context.marketEvidence,
    historySummary: context.historySummary,
    messages,
    trace: [],
    missingFields: [],
    pendingApproval: null,
    recommendation: null,
    nextActions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function saveAgentSession(session = {}) {
  const normalized = serializeAgentSession({
    ...session,
    updatedAt: nowIso(),
  });
  if (normalized.sessionId) {
    pruneExpiredSessions();
    memorySessions.set(normalized.sessionId, normalized);
  }
  return normalized;
}

export function getAgentSession(sessionId) {
  pruneExpiredSessions();
  const id = text(sessionId);
  if (!id) return null;
  const session = memorySessions.get(id);
  return session ? serializeAgentSession(session) : null;
}

export function normalizeSessionSnapshot(snapshot = {}) {
  const source = asObject(snapshot);
  if (!text(source.sessionId)) return null;
  return serializeAgentSession(source);
}

export function restoreAgentSession({ sessionId, sessionSnapshot } = {}) {
  const id = text(sessionId);
  const fromMemory = getAgentSession(id);
  if (fromMemory) {
    return {
      session: fromMemory,
      source: "memory",
    };
  }

  const snapshot = normalizeSessionSnapshot(sessionSnapshot);
  if (snapshot && (!id || snapshot.sessionId === id)) {
    return {
      session: saveAgentSession(snapshot),
      source: "snapshot",
    };
  }

  return {
    session: null,
    source: "missing",
  };
}

function mergePlainObject(base = {}, patch = {}) {
  return {
    ...asObject(base),
    ...asObject(patch),
  };
}

export function mergeSessionPatch(session = {}, patch = {}) {
  const safePatch = asObject(patch);
  return serializeAgentSession({
    ...session,
    goal: text(safePatch.goal, session.goal),
    product: mergePlainObject(session.product, safePatch.product),
    result: mergePlainObject(session.result, safePatch.result),
    marketEvidence: mergePlainObject(session.marketEvidence, safePatch.marketEvidence),
    historySummary: mergePlainObject(session.historySummary, safePatch.historySummary),
    supplierChecklistSummary: mergePlainObject(session.supplierChecklistSummary, safePatch.supplierChecklistSummary),
    contentTestPlanSummary: mergePlainObject(session.contentTestPlanSummary, safePatch.contentTestPlanSummary),
    pendingApproval: null,
    updatedAt: nowIso(),
  });
}

export function buildPublicSessionResponse(session = {}, extra = {}) {
  const snapshot = serializeAgentSession(session);
  return {
    ok: true,
    session: snapshot,
    sessionSnapshot: snapshot,
    ...asObject(extra),
  };
}

export function buildSnapshotRequiredResponse(sessionId = "") {
  return {
    ok: false,
    status: "snapshot_required",
    sessionId: text(sessionId),
    message: sanitizeVisibleText("当前服务端没有命中该 session，请使用本地 session snapshot 继续恢复。"),
  };
}
