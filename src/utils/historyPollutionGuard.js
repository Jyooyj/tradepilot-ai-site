// historyPollutionGuard.js
// 历史内容污染拦截器 / 内容一致性检查。
//
// 目标：阻止上一次商品、示例数据、内容结构库 seed、旧 demo 里的“具体商品实体词”
// 串入当前商品报告。只有当“当前商品上下文”里明确出现某个疑似历史词时，
// 该词才允许出现在生成结果中；否则视为污染，需被剥离或拦截。
//
// 该模块是纯函数、无副作用、不依赖 React，可在浏览器与测试环境直接运行。

// 高风险疑似历史污染实体词（来自历史 demo / seed / 旧品类示例）。
// 注意：长词排在前面，replace 时先替换长词，避免残留碎片。
export const SUSPECT_LEGACY_TERMS = [
  "低预算送朋友小礼物",
  "木珠果核包包挂件",
  "帆布包搭配",
  "帆布包挂件",
  "书包挂件",
  "包包挂件",
  "包包装饰",
  "文创挂件",
  "手作绳结",
  "文旅纪念",
  "校园市集",
  "低预算礼物",
  "果核元素",
  "国风感",
  "帆布包",
  "钥匙扣",
  "钥匙串",
  "钥匙链",
  "钥匙圈",
  "木珠",
  "果核",
  "国风",
  "小礼物",
];

// 按长度降序，保证先替换更长的复合词。
const SUSPECT_TERMS_BY_LENGTH = [...SUSPECT_LEGACY_TERMS].sort(
  (a, b) => b.length - a.length
);

// 将任意结构（字符串 / 数组 / 对象）拍平成一段可检索文本。
export function flattenToText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => flattenToText(item)).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => flattenToText(item))
      .join(" ");
  }
  return "";
}

// 根据若干来源构建“当前商品上下文关键词文本”。
// 只接受当前这次上传 / 当前填写 / 当前识别的字段，不接受历史数据。
export function buildContextKeywordText(...sources) {
  return sources
    .map((source) => flattenToText(source))
    .filter(Boolean)
    .join(" ");
}

// 检测生成结果中是否出现“当前上下文未包含”的疑似历史污染词。
// contextText：当前商品上下文关键词文本。
// 返回 { polluted, hits }。
export function detectHistoryPollution(content, contextText) {
  const text = flattenToText(content);
  const ctx = String(contextText || "");
  const hits = [];
  SUSPECT_LEGACY_TERMS.forEach((term) => {
    if (text.includes(term) && !ctx.includes(term)) {
      if (!hits.includes(term)) hits.push(term);
    }
  });
  return { polluted: hits.length > 0, hits };
}

// 对单个字符串做污染剥离：当前上下文未包含的疑似历史词会被替换。
// replacement 可以是字符串，或 (term) => string 的函数。
export function sanitizeLegacyPollutionText(value, contextText, replacement = "") {
  let text = String(value || "");
  const ctx = String(contextText || "");
  SUSPECT_TERMS_BY_LENGTH.forEach((term) => {
    if (!term) return;
    if (ctx.includes(term)) return; // 当前商品确实包含，允许保留。
    if (!text.includes(term)) return;
    const next =
      typeof replacement === "function" ? String(replacement(term) || "") : String(replacement || "");
    text = text.split(term).join(next);
  });
  return text;
}

// 递归剥离结构化内容（字符串 / 数组 / 对象）中的污染词。
export function stripLegacyPollution(value, contextText, replacement = "") {
  if (typeof value === "string") {
    return sanitizeLegacyPollutionText(value, contextText, replacement);
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripLegacyPollution(item, contextText, replacement));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        stripLegacyPollution(item, contextText, replacement),
      ])
    );
  }
  return value;
}

// 综合守卫：返回是否污染、命中词、以及（可选）已剥离的内容。
// 用于“先检测、再决定是展示/降级/拦截”。
export function guardModuleContent(content, contextText, options = {}) {
  const { replacement = "", strip = true } = options;
  const detection = detectHistoryPollution(content, contextText);
  const cleaned = strip ? stripLegacyPollution(content, contextText, replacement) : content;
  return {
    ok: !detection.polluted,
    polluted: detection.polluted,
    hits: detection.hits,
    content: cleaned,
  };
}
