// marketDataLayer.js
// Market Data Layer｜市场数据源分层。
// 不抓取任何平台数据；当前优先实现“用户手动输入 + 自有测款数据”，
// 公开趋势参考与合作数据源为后续扩展方向，不在当前版本伪造或自动抓取。

export const MARKET_DATA_LAYERS = [
  {
    tier: 1,
    key: "user_input",
    name: "用户手动输入",
    statusKey: "userInput",
    items: ["竞品数量", "竞品价格区间", "关键词热度", "内容平台出现频率", "趋势榜参考", "用户备注"],
    note: "最稳定、最合规，贴近小微卖家真实使用场景。",
  },
  {
    tier: 2,
    key: "internal_test",
    name: "自有测款数据",
    statusKey: "internalTest",
    items: ["曝光", "互动", "收藏", "询价", "成交", "测款成本", "最终动作：继续测 / 补货 / 放弃"],
    note: "TradePilot 自有测款记录，逐步形成小商品测款知识库。",
  },
  {
    tier: 3,
    key: "public_trend",
    name: "公开趋势参考",
    statusKey: "publicTrend",
    items: ["平台公开榜单", "趋势工具", "关键词指数", "人工记录", "后续可接入"],
    note: "后续扩展方向，不在当前版本伪造或自动抓取。",
  },
  {
    tier: 4,
    key: "partner",
    name: "合作数据源",
    statusKey: "partner",
    items: ["第三方电商数据服务", "1688 供应链接口", "平台官方数据", "后续商业化接入"],
    note: "后续如有平台授权或供应链接口再接入。",
  },
];

export const MARKET_DATA_LAYER_NOTE =
  "当前版本优先实现第一层和第二层，因为它们最稳定、最合规，也最贴近小微卖家的真实使用场景。第三层和第四层作为后续扩展方向，不在当前版本中伪造或自动抓取。";

export const MARKET_DATA_SOURCE_NOTE =
  "当前市场热度为代理指标评估，基于用户输入、供应链行情、自有测款数据、商品信息和内置规则计算，不代表实时平台官方数据。";

export const MARKET_DATA_PANEL_FOOTNOTE =
  "我们当前不伪造实时全网数据，而是先构建可解释、可追踪、可扩展的市场热度代理指标。随着用户测款数据积累和外部数据源接入，系统判断会逐步变得更准确。";

export const MARKET_DATA_PITCH_NOTE =
  "这些数据源并不是同一阶段全部接入。当前版本优先实现用户手动输入、供应链行情记录和自有测款数据沉淀，因为它们最稳定、最合规，也最贴近小微卖家的真实选品流程。后续如果有平台授权、第三方数据服务或供应链接口，再接入公开趋势和合作数据源。";

const STATUS_TEXT = {
  used: "已使用",
  partial: "部分使用",
  recorded: "已记录",
  pending: "待补充",
  pending_accumulate: "持续积累",
  reserved: "后续扩展",
};

const STATUS_TONE = {
  used: "green",
  partial: "green",
  recorded: "green",
  pending: "yellow",
  pending_accumulate: "yellow",
  reserved: "gray",
};

export function getStatusText(status) {
  return STATUS_TEXT[status] || "待补充";
}
export function getStatusTone(status) {
  return STATUS_TONE[status] || "yellow";
}

// 构造 5 个数据来源的状态。
export function buildMarketDataSourceStatus({
  hasUserInput = false,
  hasSupplyChain = false,
  hasPublicTrend = false,
  internalCount = 0,
} = {}) {
  let internalTest = "pending_accumulate";
  if (internalCount > 30) internalTest = "used";
  else if (internalCount >= 1) internalTest = "partial";

  return {
    userInput: hasUserInput ? "used" : "pending",
    supplyChain: hasSupplyChain ? "used" : "pending",
    internalTest,
    publicTrend: hasPublicTrend ? "recorded" : "pending",
    external: "reserved",
  };
}

// 数据来源标签（用于报告页展示）。
export const MARKET_DATA_SOURCE_LABELS = [
  { key: "userInput", label: "用户输入" },
  { key: "supplyChain", label: "供应链行情" },
  { key: "internalTest", label: "自有测款数据" },
  { key: "publicTrend", label: "公开趋势参考" },
  { key: "external", label: "外部数据源" },
];

const EVIDENCE_TEXT = { low: "低", medium: "中", high: "高" };
export function getEvidenceText(level) {
  return EVIDENCE_TEXT[level] || "低";
}

// 证据等级：
// - low：只有商品信息或规则判断；
// - medium：有用户输入 / 供应链行情 / 公开趋势参考 / 自有测款数据中的至少一类（两类更稳）；
// - high：同时具备其中三类以上。
// 外部数据源作为后续扩展方向展示，不参与当前评分与证据等级。
export function getMarketEvidenceLevel({
  hasUserInput = false,
  hasSupplyChain = false,
  hasPublicTrend = false,
  internalCount = 0,
} = {}) {
  const hasInternal = internalCount >= 1;
  const classes = [hasUserInput, hasSupplyChain, hasPublicTrend, hasInternal].filter(Boolean).length;
  if (classes >= 3) return "high";
  if (classes >= 1) return "medium";
  return "low";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 市场热度代理评分（0–100）。结合商品信息、用户输入、供应链行情、公开趋势人工记录、自有测款数据。
// 外部数据源作为后续扩展方向，不参与当前评分。
export function computeMarketHeatScore({
  result = {},
  supplyChainInsight = null,
  internalData = null,
  hasUserInput = false,
  hasPublicTrend = false,
} = {}) {
  const safeResult = result && typeof result === "object" ? result : {};
  const baseScore = clamp(Number(safeResult.totalScore ?? safeResult.score ?? 50) || 50, 0, 100);
  let score = baseScore * 0.5; // 商品信息/规则评分，最高 50

  if (hasUserInput) score += 10;
  if (hasPublicTrend) score += 6;

  if (supplyChainInsight && typeof supplyChainInsight === "object") {
    if (supplyChainInsight.priceAdvantage === "good") score += 10;
    else if (supplyChainInsight.priceAdvantage === "normal") score += 5;
    if (supplyChainInsight.supplyChainStability === "high") score += 5;
    else if (supplyChainInsight.supplyChainStability === "medium") score += 3;
  }

  if (internalData && typeof internalData === "object") {
    if (internalData.dataMaturityLevel === "high") score += 15;
    else if (internalData.dataMaturityLevel === "medium") score += 8;
    else if (internalData.totalTestedProducts > 0) score += 3;
  }

  return Math.round(clamp(score, 0, 100));
}

// ---------------- 「用户输入」面板 ----------------

export const USER_INPUT_CHANNEL_OPTIONS = ["小红书", "抖音", "校园市集", "电商平台", "线下摆摊", "其他"];
export const CONTENT_MENTION_OPTIONS = [
  { value: "unknown", label: "不确定｜暂未观察", example: "" },
  { value: "low", label: "低｜同类内容较少，搜索结果中零散出现", example: "例如：搜索前 20 条里相关内容少于 5 条，或近 7 天几乎没看到同类内容。" },
  { value: "medium", label: "中｜有一定内容出现，适合小范围测试", example: "例如：搜索前 20 条里相关内容约 5–12 条，或看到 1–3 个低粉账号有互动。" },
  { value: "high", label: "高｜同类内容明显较多，但需注意竞争", example: "例如：搜索前 20 条里相关内容超过 12 条，或看到 4 个以上低粉账号也有较好互动。" },
];

export const CONTENT_MENTION_HELP =
  "怎么判断内容出现频率？你可以在小红书、抖音或电商平台搜索核心关键词，粗略观察前 20 条结果中有多少条和当前商品相似。如果同类内容很少，说明需求可能不明确；如果同类内容很多，说明有市场但竞争也更强。这里不代表平台官方数据，只是用户人工观察记录。";

export const LOW_FOLLOWER_VIRAL_HELP =
  "低粉账号也能获得较高互动，说明内容机会可能更好。参考标准：0 个：机会不明显；1–3 个：有一定内容机会；4 个以上：内容机会较强，但也可能竞争更拥挤。";

export const MARKET_INPUT_STANDARD_NOTE =
  "填写标准说明：这些等级不是平台官方数据，而是用户基于公开页面和人工观察做的粗略记录。TradePilot 会把它作为市场热度的代理指标，用于辅助判断是否值得测款，而不是直接证明商品一定会爆。";

export const HIGH_HEAT_COMPETITION_NOTE =
  "提示：高热度也可能意味着高竞争，需要结合价格、利润、MOQ 和测款数据判断，等级越高只提升市场热度代理分，不直接改变最终拿货建议。";

export const USER_INPUT_SAMPLE = {
  keywords: "企鹅挂件, 毛绒钥匙扣, 学生礼物",
  targetAudience: "学生、女生、宿舍党",
  targetChannel: "小红书",
  competitorCount: "30",
  competitorPriceMin: "9.9",
  competitorPriceMax: "29.9",
  contentMentionLevel: "medium",
  lowFollowerViralCount: "3",
  userMarketNote: "小红书上同类内容较多，部分低粉账号也有互动，适合先做内容测款。",
};

export function hasUserInputData(form = {}) {
  const src = form && typeof form === "object" ? form : {};
  const textFilled = [
    "keywords",
    "targetAudience",
    "targetChannel",
    "competitorCount",
    "competitorPriceMin",
    "competitorPriceMax",
    "lowFollowerViralCount",
    "userMarketNote",
  ].some((key) => String(src[key] ?? "").trim() !== "");
  const levelFilled = Boolean(src.contentMentionLevel) && src.contentMentionLevel !== "unknown";
  return textFilled || levelFilled;
}

// ---------------- 「公开趋势参考」面板 ----------------

export const TREND_SOURCE_OPTIONS = [
  "小红书公开趋势",
  "抖音趋势工具",
  "关键词指数工具",
  "1688 / 供应链榜单",
  "人工观察",
  "其他",
];
export const TREND_LEVEL_OPTIONS = [
  { value: "unknown", label: "不确定｜没有明显趋势信号", example: "" },
  { value: "low", label: "低｜未看到明显趋势，只能作为普通商品测试", example: "例如：没有出现在公开榜单、趋势词、热搜话题或近期内容场景中。" },
  { value: "medium", label: "中｜有相关场景或季节需求", example: "例如：与开学季、宿舍、礼物、节日、通勤、夏季/冬季等场景有关，但热度不算特别集中。" },
  { value: "high", label: "高｜趋势信号明显，适合优先验证", example: "例如：出现在公开趋势榜、多个内容平台重复出现，或和强季节节点/节日消费明显相关。" },
];

export const TREND_LEVEL_HELP =
  "怎么判断趋势热度？可以参考公开趋势榜、平台搜索提示、节日/季节场景、关键词出现频率和近期内容观察。如果没有趋势信号，可以选择“不确定”或“低”，系统仍然可以生成报告，但证据等级会较低。";

// 根据 value 取选项展示文案（用于保存后的摘要）。
export function getOptionLabel(options, value) {
  const found = (Array.isArray(options) ? options : []).find((o) => o.value === value);
  return found ? found.label : "";
}
export function getContentMentionLabel(value) {
  return getOptionLabel(CONTENT_MENTION_OPTIONS, value);
}
export function getTrendLevelLabel(value) {
  return getOptionLabel(TREND_LEVEL_OPTIONS, value);
}

function summaryText(value) {
  return String(value ?? "").trim();
}

// 用户输入摘要（保存后展示，含判断说明，不夸大）。
export function buildUserInputSummary(form = {}) {
  const src = form && typeof form === "object" ? form : {};
  const lines = [];
  if (src.contentMentionLevel && src.contentMentionLevel !== "unknown") {
    lines.push({ label: "内容平台出现频率", value: getContentMentionLabel(src.contentMentionLevel) });
  }
  if (summaryText(src.lowFollowerViralCount)) {
    lines.push({ label: "低粉爆文数量", value: `${summaryText(src.lowFollowerViralCount)} 个` });
  }
  const min = summaryText(src.competitorPriceMin);
  const max = summaryText(src.competitorPriceMax);
  if (min && max) lines.push({ label: "竞品价格区间", value: `${min}–${max} 元` });
  else if (min || max) lines.push({ label: "竞品价格", value: `${min || max} 元` });
  if (summaryText(src.keywords)) lines.push({ label: "核心关键词", value: summaryText(src.keywords) });

  const highHeat = src.contentMentionLevel === "high";
  const note = highHeat
    ? "当前同类内容较多，有内容机会但竞争也更强，仍需结合利润、MOQ 和供应链稳定性判断。"
    : "当前有一定内容机会，但仍需要结合利润、MOQ 和供应链稳定性判断。";
  return { lines, note };
}

// 公开趋势摘要（保存后展示）。
export function buildPublicTrendSummary(form = {}) {
  const src = form && typeof form === "object" ? form : {};
  const lines = [];
  if (src.trendLevel && src.trendLevel !== "unknown") {
    lines.push({ label: "趋势热度等级", value: getTrendLevelLabel(src.trendLevel) });
  }
  if (summaryText(src.trendKeywords)) lines.push({ label: "趋势关键词", value: summaryText(src.trendKeywords) });
  if (summaryText(src.trendSource)) lines.push({ label: "趋势来源", value: summaryText(src.trendSource) });
  const note = "适合先做内容测款，不建议直接大批量拿货；高热度也可能意味着高竞争。";
  return { lines, note };
}

export const TREND_SAMPLE = {
  trendSource: "人工观察",
  trendKeywords: "开学季礼物, 毛绒挂件, 宿舍好物",
  trendLevel: "medium",
  trendDate: "",
  trendNote: "近期礼物和宿舍场景内容较多，但同类产品也比较拥挤。",
  trendReferenceUrl: "",
};

export function hasPublicTrendData(form = {}) {
  const src = form && typeof form === "object" ? form : {};
  const textFilled = ["trendSource", "trendKeywords", "trendNote", "trendReferenceUrl"].some(
    (key) => String(src[key] ?? "").trim() !== ""
  );
  const levelFilled = Boolean(src.trendLevel) && src.trendLevel !== "unknown";
  return textFilled || levelFilled;
}

export const PUBLIC_TREND_NOTE = "当前趋势参考来自用户人工记录，不代表平台官方实时数据。";

// 价格区间 / 负数温和校验（用户输入与趋势面板共用）。
export function validatePriceRange({ min, max, labelMin = "最低售价", labelMax = "最高售价" } = {}) {
  const warnings = [];
  const errors = [];
  const toNum = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const minNum = toNum(min);
  const maxNum = toNum(max);
  if (minNum != null && minNum < 0) errors.push(`${labelMin}不能为负数。`);
  if (maxNum != null && maxNum < 0) errors.push(`${labelMax}不能为负数。`);
  if (minNum != null && maxNum != null && minNum > maxNum) {
    warnings.push(`${labelMin}大于${labelMax}，请确认是否填写准确。`);
  }
  return { warnings, errors, valid: errors.length === 0 };
}

// ---------------- 「外部数据源」面板（后续扩展方向展示） ----------------

export const EXTERNAL_DATA_INTERFACES = [
  { name: "第三方电商数据服务", status: "后续扩展", usage: "关键词热度、竞品销量、价格趋势、类目表现" },
  { name: "关键词指数工具", status: "后续扩展", usage: "关键词搜索热度、趋势变化、内容需求" },
  { name: "平台公开趋势榜", status: "人工记录 / 后续扩展", usage: "趋势类目、热门关键词、内容方向" },
  { name: "供应链行情服务", status: "后续扩展", usage: "1688 / 批发供应链价格、MOQ、供应商数量" },
  { name: "自有测款数据库", status: "持续积累", usage: "沉淀 TradePilot 用户自己的测款结果" },
];

export const EXTERNAL_DATA_NOTE =
  "这里展示后续可扩展的数据来源方向，例如电商数据服务、关键词指数工具和供应链行情服务。当前评分优先基于用户手动填写、供应链行情、自有测款数据和公开趋势参考。";

export const MARKET_DATA_EVIDENCE_NOTE =
  "当前市场热度为代理指标评估，基于用户输入、供应链行情、自有测款数据、公开趋势人工记录、商品信息和内置规则计算，不代表实时平台官方数据。";
