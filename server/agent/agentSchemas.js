export const DEFAULT_AGENT_GOAL = "判断这个商品是否值得小批量拿样";

export const AGENT_STATUS = {
  COMPLETED: "completed",
  AWAITING_INPUT: "awaiting_input",
  AWAITING_APPROVAL: "awaiting_approval",
  BASIC_ADVICE: "basic_advice",
};

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function parseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function pickNumber(...values) {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

export function normalizeAgentInput(body = {}) {
  const source = asObject(body);
  return {
    goal: text(source.goal, DEFAULT_AGENT_GOAL),
    product: asObject(source.product),
    result: asObject(source.result),
    marketEvidence: asObject(source.marketEvidence),
    historySummary: asObject(source.historySummary),
  };
}

export function summarizeCanonicalResult(result = {}) {
  const safeResult = asObject(result);
  return {
    totalScore: safeResult.totalScore ?? safeResult.score ?? null,
    status: safeResult.status || "",
    level: safeResult.level || "",
    profit: safeResult.profit ?? null,
    margin: safeResult.margin ?? null,
    stockCost: safeResult.stockCost ?? null,
    unitCost: safeResult.unitCost ?? null,
    effectivePrice: safeResult.effectivePrice || null,
    risks: asArray(safeResult.risks).slice(0, 6),
    actions: asArray(safeResult.actions || safeResult.nextActions).slice(0, 6),
    priceEvidence: safeResult.priceEvidence || asObject(safeResult.marketEvidence).price || null,
    manualMarketEvidence: safeResult.manualMarketEvidence || asObject(safeResult.marketEvidence).manual || null,
    douyinEvidence: safeResult.douyinEvidence || asObject(safeResult.marketEvidence).douyin || null,
  };
}

export function buildSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
