import { AGENT_STATUS, asArray, asObject, text } from "./agentSchemas.js";

export const MAX_TOOL_ROUNDS = 4;

const ALLOWED_TOOLS = new Set([
  "calculate_profit",
  "assess_purchase_risk",
  "inspect_market_evidence",
  "retrieve_user_memory",
  "generate_supplier_checklist",
  "generate_content_test_plan",
]);

const ALLOWED_APPROVAL_ACTIONS = new Set([
  "save_candidate_draft",
]);

const TECHNICAL_TERMS = [
  /timeout/gi,
  /fallback/gi,
  /接口异常/g,
  /api error/gi,
  /server_error/gi,
  /tool_calls?/gi,
  /function calling/gi,
];

const FORBIDDEN_ACTION_PATTERNS = [
  /自动访问|打开.*淘宝|打开.*1688|打开.*小红书|打开.*抖音/,
  /自动下单|直接下单|代为下单/,
  /自动付款|代为付款|支付订单/,
  /自动联系供应商|代为联系供应商/,
  /自动发送消息|代发消息|发送给供应商/,
  /自动发布内容|代发内容|发布到小红书|发布到抖音/,
  /伪造.*播放|伪造.*点赞|伪造.*收藏|伪造.*评论|伪造.*询单|伪造.*成交|伪造.*热度/,
  /自动保存|写入产品库|删除记录|覆盖记录|自动同步云端|自动导入数据/,
  /修改评分|重算综合评分|覆盖综合评分/,
];

export function assertAllowedTool(toolName) {
  if (!ALLOWED_TOOLS.has(toolName)) {
    const error = new Error("tool_not_allowed");
    error.statusCode = 400;
    throw error;
  }
}

export function isAllowedTool(toolName) {
  return ALLOWED_TOOLS.has(toolName);
}

export function assertAllowedApprovalAction(action) {
  if (!ALLOWED_APPROVAL_ACTIONS.has(action)) {
    const error = new Error("approval_action_not_allowed");
    error.statusCode = 400;
    throw error;
  }
}

export function isAllowedApprovalAction(action) {
  return ALLOWED_APPROVAL_ACTIONS.has(action);
}

export function sanitizeVisibleText(value, fallback = "") {
  let output = text(value, fallback);
  TECHNICAL_TERMS.forEach((pattern) => {
    output = output.replace(pattern, "当前建议");
  });
  return output.trim();
}

export function sanitizeVisibleList(items = [], fallback = []) {
  const source = asArray(items).length ? items : fallback;
  return source
    .map((item) => sanitizeVisibleText(item))
    .filter(Boolean)
    .slice(0, 8);
}

export function removeForbiddenActions(items = []) {
  return sanitizeVisibleList(items)
    .filter((item) => !FORBIDDEN_ACTION_PATTERNS.some((pattern) => pattern.test(item)));
}

export function sanitizePendingApproval(value) {
  const source = asObject(value);
  const action = text(source.action);
  if (!isAllowedApprovalAction(action)) return null;

  const label = sanitizeVisibleText(source.label, "保存为待拿样候选");
  const reason = sanitizeVisibleText(
    source.reason,
    "当前利润空间尚可，建议进入候选池进一步比较。"
  );

  if (FORBIDDEN_ACTION_PATTERNS.some((pattern) => pattern.test(`${label} ${reason}`))) {
    return null;
  }

  return {
    action,
    label,
    reason,
  };
}

export function normalizeAgentStatus(status, missingFields = [], pendingApproval = null) {
  if (missingFields.length) return AGENT_STATUS.AWAITING_INPUT;
  if (pendingApproval) return AGENT_STATUS.AWAITING_APPROVAL;
  if (
    status === AGENT_STATUS.COMPLETED ||
    status === AGENT_STATUS.AWAITING_INPUT ||
    status === AGENT_STATUS.AWAITING_APPROVAL ||
    status === AGENT_STATUS.BASIC_ADVICE
  ) {
    return status;
  }
  return AGENT_STATUS.COMPLETED;
}

export function publicTraceEntry(entry = {}) {
  return {
    id: entry.id || "",
    toolName: entry.toolName || "",
    toolLabel: entry.toolLabel || entry.toolName || "",
    status: entry.status || "completed",
    summary: sanitizeVisibleText(entry.summary),
    missingFields: sanitizeVisibleList(entry.missingFields),
    observation: entry.observation && typeof entry.observation === "object" ? entry.observation : {},
    createdAt: entry.createdAt || "",
  };
}
