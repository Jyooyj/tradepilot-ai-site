export const MAX_REFERENCE_ITEMS = 30;
export const MAX_REFERENCE_TITLE_LENGTH = 180;
export const MAX_REFERENCE_BODY_LENGTH = 5000;
export const MAX_CONTENT_PATTERN_IMPORT_ITEMS = 500;

export const CONTENT_PATTERN_IMPORT_FIELDS = [
  "platform",
  "source_type",
  "keyword",
  "category_key",
  "title_raw",
  "opening_raw",
  "content_type",
  "product_name",
  "manual_note",
  "collected_at",
];

const DEFAULT_FLOW = ["用具体场景建立代入感", "解释核心价值与使用理由", "补充真实限制或选择建议", "用轻量行动引导收尾"];

function text(value, limit = 500) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, limit);
}

function list(value, fallback = [], limit = 8) {
  const items = Array.isArray(value)
    ? value.map((item) => text(item, 120)).filter(Boolean).slice(0, limit)
    : [];
  return items.length ? items : fallback;
}

export function createContentPatternId() {
  return `content-pattern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeReferenceItem(value = {}) {
  return {
    title: text(value.title, MAX_REFERENCE_TITLE_LENGTH),
    body: text(value.body ?? value.content ?? value.text, MAX_REFERENCE_BODY_LENGTH),
  };
}

export function sanitizeReferenceItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(normalizeReferenceItem)
    .filter((item) => item.title || item.body)
    .slice(0, MAX_REFERENCE_ITEMS);
}

function parseCsvMatrix(csvText) {
  const source = String(csvText ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => String(cell).trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim())) rows.push(row);
  return rows;
}

function findHeaderIndex(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(String(header).trim().toLowerCase()));
}

export function parseReferenceCsv(csvText) {
  const matrix = parseCsvMatrix(csvText);
  if (!matrix.length) return { items: [], skipped: 0, truncated: false };

  const headers = matrix[0].map((header) => String(header).trim().toLowerCase());
  const titleIndex = findHeaderIndex(headers, ["title", "标题", "参考标题"]);
  const bodyIndex = findHeaderIndex(headers, ["body", "content", "text", "正文", "内容", "参考正文"]);
  const hasHeader = titleIndex >= 0 || bodyIndex >= 0;
  const effectiveTitleIndex = titleIndex >= 0 ? titleIndex : 0;
  const effectiveBodyIndex = bodyIndex >= 0 ? bodyIndex : hasHeader ? -1 : 1;
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const normalized = dataRows.map((cells) => normalizeReferenceItem({
    title: cells[effectiveTitleIndex] || "",
    body: effectiveBodyIndex >= 0 ? cells[effectiveBodyIndex] || "" : "",
  }));
  const valid = normalized.filter((item) => item.title || item.body);

  return {
    items: valid.slice(0, MAX_REFERENCE_ITEMS),
    skipped: normalized.length - valid.length,
    truncated: valid.length > MAX_REFERENCE_ITEMS,
  };
}

const CONTENT_PATTERN_HEADER_ALIASES = {
  platform: ["platform", "平台"],
  source_type: ["source_type", "来源类型"],
  keyword: ["keyword", "关键词"],
  category_key: ["category_key", "类目", "类目键"],
  title_raw: ["title_raw", "title", "原始标题", "标题"],
  opening_raw: ["opening_raw", "opening", "body", "content", "原始开头", "开头", "正文"],
  content_type: ["content_type", "内容类型"],
  product_name: ["product_name", "商品名称", "产品名称"],
  manual_note: ["manual_note", "人工备注", "备注"],
  collected_at: ["collected_at", "采集时间", "收集时间"],
};

export function parseContentPatternCsv(csvText) {
  const matrix = parseCsvMatrix(csvText);
  if (!matrix.length) return { items: [], skipped: 0, truncated: false };
  const headers = matrix[0].map((header) => String(header).trim().toLowerCase());
  const indexes = Object.fromEntries(CONTENT_PATTERN_IMPORT_FIELDS.map((field) => [
    field,
    findHeaderIndex(headers, CONTENT_PATTERN_HEADER_ALIASES[field]),
  ]));
  const hasRecognizedHeader = Object.values(indexes).some((index) => index >= 0);
  const rows = hasRecognizedHeader ? matrix.slice(1) : matrix;
  const normalized = rows.map((cells) => {
    const item = {};
    for (const field of CONTENT_PATTERN_IMPORT_FIELDS) {
      const fallbackIndex = field === "title_raw" ? 0 : field === "opening_raw" ? 1 : -1;
      const index = indexes[field] >= 0 ? indexes[field] : hasRecognizedHeader ? -1 : fallbackIndex;
      item[field] = text(index >= 0 ? cells[index] : "", field === "manual_note" ? 1000 : 5000);
    }
    if (!item.platform) item.platform = "xiaohongshu";
    if (!item.content_type) item.content_type = "图文笔记";
    return item;
  });
  const valid = normalized.filter((item) => item.title_raw || item.opening_raw);
  return {
    items: valid.slice(0, MAX_CONTENT_PATTERN_IMPORT_ITEMS),
    skipped: normalized.length - valid.length,
    truncated: valid.length > MAX_CONTENT_PATTERN_IMPORT_ITEMS,
  };
}

function detectStyleTags(references) {
  const allText = references.map((item) => `${item.title} ${item.body}`).join(" ");
  const averageLength = references.length ? allText.length / references.length : 0;
  const tags = [];
  if (averageLength < 180) tags.push("短句精炼");
  else tags.push("信息完整");
  if (/[?!？！]/.test(allText)) tags.push("问答感");
  if (/\p{Extended_Pictographic}/u.test(allText)) tags.push("轻松活泼");
  if (/\d/.test(allText)) tags.push("要点清晰");
  return [...new Set(tags)].slice(0, 5);
}

export function normalizeContentPattern(value = {}, defaults = {}) {
  const source = value && typeof value === "object" ? value : {};
  const now = new Date().toISOString();
  return {
    id: text(source.id || defaults.id, 100) || createContentPatternId(),
    name: text(source.name || defaults.name, 80) || "未命名内容结构",
    targetScene: text(source.targetScene || defaults.targetScene, 80) || "通用种草内容",
    sourceCount: Math.max(1, Math.min(MAX_REFERENCE_ITEMS, Number(source.sourceCount || defaults.sourceCount) || 1)),
    headlineFormula: text(source.headlineFormula, 240) || "目标人群 / 场景 + 核心价值 + 真实感受",
    openingHook: text(source.openingHook, 240) || "从一个具体使用场景或常见困扰切入",
    narrativeFlow: list(source.narrativeFlow, DEFAULT_FLOW, 8),
    persuasionElements: list(source.persuasionElements, ["具体场景", "选择理由", "使用细节", "适用边界"], 8),
    styleTags: list(source.styleTags, ["自然表达", "消费者视角"], 6),
    originalityRules: list(source.originalityRules, ["只借鉴结构，不复刻原句", "替换案例、观点、顺序和表达", "不编造体验或平台数据"], 6),
    complianceNotes: list(source.complianceNotes, ["不得含无法核实的功效或销量承诺", "发布前人工核对事实、价格和适用范围"], 6),
    source: ["ai", "fallback", "manual"].includes(source.source) ? source.source : "fallback",
    createdAt: text(source.createdAt || defaults.createdAt, 40) || now,
    updatedAt: now,
  };
}

export function buildLocalContentPattern({ references, name, targetScene } = {}) {
  const safeReferences = sanitizeReferenceItems(references);
  const titles = safeReferences.map((item) => item.title).filter(Boolean);
  const questionTitles = titles.filter((title) => /[?？]/.test(title)).length;
  const numberTitles = titles.filter((title) => /\d/.test(title)).length;
  const headlineFormula = questionTitles > titles.length / 2
    ? "目标人群 / 场景 + 问题悬念 + 核心价值"
    : numberTitles > titles.length / 2
      ? "数字化要点 + 使用场景 + 明确收益"
      : "具体场景 + 核心价值 + 真实感受";

  return normalizeContentPattern({
    name,
    targetScene,
    sourceCount: safeReferences.length || 1,
    headlineFormula,
    openingHook: "先点出目标人群在具体场景中的困扰，再给出值得继续阅读的选择理由",
    narrativeFlow: DEFAULT_FLOW,
    persuasionElements: ["人群与场景", "核心卖点", "使用细节", "选择建议", "适用边界"],
    styleTags: detectStyleTags(safeReferences),
    source: "fallback",
  });
}

export function normalizeOriginalCopy(value = {}, brief = {}) {
  const source = value && typeof value === "object" ? value : {};
  const topic = text(brief.topic || brief.productName, 80) || "这件产品";
  const audience = text(brief.audience, 80) || "正在认真挑选的人";
  const keyPoints = text(brief.keyPoints, 600) || "选择时更重视适合自己的场景和真实需求";
  const normalizedKeyPoints = keyPoints.replace(/[。！？!?]+$/, "");
  const titleFallbacks = [
    `${topic}怎么选？先看你的真实使用场景`,
    `给${audience}的${topic}选择思路`,
    `不跟风，把${topic}选得更适合自己`,
  ];
  return {
    titles: list(source.titles, titleFallbacks, 5),
    opening: text(source.opening, 500) || `如果你正在考虑${topic}，先别急着照搬别人的答案。真正值得比较的，是它是否适合你的使用场景。`,
    body: text(source.body, 2400) || `${normalizedKeyPoints}。\n\n可以先从使用频率、实际需求和可接受预算三个角度判断，再用一次小范围体验验证。适合自己的选择，往往比看起来最热门的选择更稳妥。`,
    cta: text(source.cta, 300) || "你最在意哪个使用细节？可以先记下来，再按真实需求逐项比较。",
    hashtagSuggestions: list(source.hashtagSuggestions, [topic, "真实体验", "选择建议"], 8),
    source: source.source === "ai" ? "ai" : "fallback",
  };
}

export function buildLocalOriginalCopy({ brief } = {}) {
  return normalizeOriginalCopy({}, brief);
}
