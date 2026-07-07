// Agent 展示安全工具：把后端可能返回的英文 planner 原文、内部 JSON、工具名、
// debug 信息挡在主 UI 之外，统一转成面向用户/评委的中文受控决策摘要。
// 真实 raw 仍可保留到 debugRaw，仅在折叠的“服务端真实 trace（调试用）”里查看。

// 明显属于内部 planner / prompt / JSON 的关键词，命中即视为不可直接展示。
const INTERNAL_KEYWORDS = [
  "tool_calls",
  "tool_call",
  "retrieve_user_memory",
  "generate_supplier_checklist",
  "generate_content_test_plan",
  "calculate_profit",
  "assess_purchase_risk",
  "inspect_market_evidence",
  "final json",
  "canonical result",
  "canonicalresult",
  "pendingapproval",
  "the user's goal",
  "the user goal",
  "must reflect",
  "planner",
  "internal reasoning",
  "function calling",
  "system prompt",
  "observation",
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// 文本是否包含内部关键词。
export function containsInternalKeyword(value) {
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase();
  return INTERNAL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

// 文本是否“看起来是英文长段落 / planner 原文”：拉丁字母明显多于中文，
// 或几乎不含中文却有成段英文。
export function looksLikeEnglishParagraph(value) {
  if (typeof value !== "string") return false;
  const str = value.trim();
  if (!str) return false;
  const cjk = (str.match(/[一-鿿]/g) || []).length;
  const latin = (str.match(/[a-zA-Z]/g) || []).length;
  if (latin === 0) return false;
  // 基本无中文却有成段英文
  if (cjk === 0 && latin >= 12) return true;
  // 拉丁字母数量远超中文，判定为英文为主的内容
  if (latin >= 12 && latin > cjk * 3) return true;
  return false;
}

// 文本是否不适合直接展示给用户。
export function isUnsafeAgentText(value) {
  if (typeof value !== "string") return false;
  if (containsInternalKeyword(value)) return true;
  if (looksLikeEnglishParagraph(value)) return true;
  // 像 JSON / 大括号结构的内部数据
  const trimmed = value.trim();
  if (/^[[{]/.test(trimmed) && /[}\]]$/.test(trimmed)) return true;
  return false;
}

// 安全展示文本：不安全（英文原文 / 内部关键词 / JSON）则返回 fallback，
// 否则返回去空白后的原文。绝不把不安全内容透传到主 UI。
export function sanitizeAgentDisplayText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (isUnsafeAgentText(trimmed)) return fallback;
  return trimmed;
}

// 安全展示列表：逐条过滤掉不安全文本。
export function sanitizeAgentDisplayList(items = []) {
  return asArray(items)
    .map((item) => sanitizeAgentDisplayText(typeof item === "string" ? item : "", ""))
    .filter(Boolean);
}

// 缺失字段中文名映射。
const MISSING_FIELD_LABELS = {
  name: "商品名称",
  cost: "拿货成本",
  costPrice: "拿货成本",
  moq: "MOQ / 起订量",
  supplier: "供应商信息",
  wholesalePriceReference: "批发价参考",
  sellingPrice: "预计售价",
  price: "预计售价",
  channel: "目标销售渠道",
  competitorPrice: "竞品价格",
  contentHeatReference: "内容热度观察",
};

export function getMissingFieldLabel(field) {
  return MISSING_FIELD_LABELS[field] || field;
}

export function mapMissingFieldLabels(fields = []) {
  return asArray(fields).map(getMissingFieldLabel);
}

// 哪些字段属于“关键采购信息”，缺失时不建议直接拿货。
const PROCUREMENT_FIELDS = new Set([
  "cost",
  "costPrice",
  "moq",
  "supplier",
  "wholesalePriceReference",
]);

export function isMissingProcurementInfo(fields = []) {
  return asArray(fields).some((field) => PROCUREMENT_FIELDS.has(field));
}

// 顶部状态卡：把 awaiting_input 表达成“受控暂停”的产品能力，而非系统错误。
export function getAgentStatusDisplay(status) {
  switch (status) {
    case "awaiting_input":
      return {
        tone: "warn",
        label: "等待补充关键信息",
        detail:
          "当前信息不足，Agent 已暂停自动判断，等待你补充必要字段后继续分析。",
      };
    case "completed":
      return {
        tone: "ok",
        label: "已完成受控决策",
        detail: "Agent 已基于现有信息完成本轮受控决策。",
      };
    case "awaiting_approval":
      return {
        tone: "ok",
        label: "等待人工确认",
        detail: "Agent 已给出建议，等待你人工确认后再执行后续动作。",
      };
    case "basic_advice":
      return {
        tone: "ok",
        label: "基础策略建议",
        detail: "已返回基础策略建议，可结合原报告人工复核。",
      };
    default:
      return {
        tone: "ok",
        label: "已返回建议",
        detail: "Agent 已返回受控决策建议。",
      };
  }
}

// 决策摘要卡：缺关键采购信息时给“暂不建议直接拿货”的标准中文摘要；
// 否则使用经过安全过滤的 recommendation 文本（带中文兜底）。
export function buildDecisionDisplay({ status, missingFields = [], recommendation = {} } = {}) {
  const safeRecommendation = asObject(recommendation);

  if (isMissingProcurementInfo(missingFields)) {
    return {
      variant: "missing-procurement",
      title: "暂不建议直接拿货",
      body:
        "当前商品已经完成基础识别和规则评分，但缺少拿货成本、MOQ、供应商信息或批发价参考，暂时无法准确判断利润空间和压货风险。建议先补充关键采购信息，再决定是否小批量拿样。",
      points: [
        "已完成：商品基础识别、初步评分、渠道与内容方向判断",
        "待补充：拿货成本、MOQ、供应商/批发价参考",
        "当前建议：先补齐采购信息，再进行小批量验证",
        "风险提醒：缺少成本和 MOQ 时，不应直接判断“值得拿货”",
      ],
    };
  }

  const fallbackBody =
    status === "awaiting_input"
      ? "当前仍缺少关键字段，补齐后再继续判断是否适合拿样。"
      : "当前建议以基础报告和人工复核为主，先小范围验证。";

  return {
    variant: "normal",
    title: sanitizeAgentDisplayText(safeRecommendation.decision, "谨慎小批量验证"),
    body: sanitizeAgentDisplayText(safeRecommendation.summary, fallbackBody),
    points: sanitizeAgentDisplayList(safeRecommendation.rationale),
  };
}

// 服务端真实 trace 为空时的说明文案。
export function buildTraceEmptyMessage(status) {
  if (status === "awaiting_input") {
    return "本轮因缺少关键信息，Agent 未执行工具调用，已暂停等待人工补充。";
  }
  return "本次没有形成工具调用记录，已返回基础策略建议；原报告和产品库流程不受影响。";
}

// 缺关键字段且 0 次工具调用时，强调这是受控 Agent 的能力而非故障。
export function buildControlledPauseNote() {
  return "Agent 主动暂停：由于成本、MOQ 等关键字段缺失，系统没有贸然调用利润/风险工具，而是请求人工补充。";
}

// 基础供应商沟通问题（规则清单，非 Agent 生成）。
export const BASE_SUPPLIER_QUESTIONS = [
  "这个价格是否含包装？",
  "MOQ 是否支持小批量试单？",
  "样品和大货是否一致？",
  "发货周期多久？",
  "破损或掉件如何处理？",
];

export const SUPPLIER_PENDING_TEXT =
  "补充拿货成本、MOQ 和供应商信息后，Agent 将生成供应商沟通清单。";

export const CONTENT_PENDING_TEXT =
  "当前已保留原小红书内容包和抖音脚本；补充采购信息后，Agent 可进一步生成更完整的测款计划。";

export const CONTENT_PENDING_HINT = "可先按当前内容包进行小范围测试。";
