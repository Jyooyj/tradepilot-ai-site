// productLibraryUtils.js
// 产品库的状态归一化、类目归类、渠道识别、概览统计与补货建议。
// 纯函数、无副作用、不依赖 React，可单测；兼容本地 / 云端 / 新旧字段，缺字段不报错。

export const PRODUCT_STATUSES = [
  "待补充信息",
  "建议拿样",
  "已拿样",
  "正在测款",
  "建议补货",
  "建议放弃",
];

// 状态 Tab（含“全部”）。
export const STATUS_TABS = ["全部", ...PRODUCT_STATUSES];

export const CATEGORY_GROUPS = [
  "全部类目",
  "饰品 / 耳饰 / 配饰",
  "发饰 / 发圈",
  "家居生活",
  "文创纸品",
  "手机周边",
  "低价日用",
  "其他",
];

export const CHANNEL_GROUPS = [
  "全部渠道",
  "小红书",
  "抖音",
  "校园市集",
  "电商平台",
  "线下摆摊",
  "其他",
];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// ---------------- 状态归一化 ----------------

// 把任意原始状态（中文 / 英文 / level 文案）映射为标准中文状态。
export function normalizeProductStatus(rawStatus) {
  const raw = String(rawStatus ?? "").trim();
  if (!raw) return "待补充信息";

  const lower = raw.toLowerCase();
  const englishMap = {
    completed: "建议拿样",
    complete: "建议拿样",
    testing: "正在测款",
    test: "正在测款",
    replenish: "建议补货",
    restock: "建议补货",
    rejected: "建议放弃",
    reject: "建议放弃",
    abandon: "建议放弃",
    sampled: "已拿样",
    sample: "建议拿样",
    awaiting_input: "待补充信息",
    pending: "待补充信息",
  };
  if (englishMap[lower]) return englishMap[lower];

  // 中文关键词（顺序敏感：先发饰/补货/已拿样，再拿样/测款）
  if (raw.includes("补货")) return "建议补货";
  if (raw.includes("已拿样")) return "已拿样";
  if (raw.includes("待补充") || raw.includes("补充信息")) return "待补充信息";
  if (raw.includes("放弃") || raw.includes("暂不") || raw.includes("不建议")) return "建议放弃";
  if (raw.includes("拿样")) return "建议拿样";
  if (raw.includes("测款")) return "正在测款";

  return "建议拿样";
}

// 从记录里取出原始状态字符串（兼容新旧字段）。
export function resolveRawStatus(record) {
  const r = asObject(record);
  const result = asObject(r.result);
  if (result.status) return result.status;
  if (result.level) return result.level;
  if (r.status) return r.status;
  if (r.advice) return r.advice;
  const score = toNumber(r.score);
  if (score == null) return "";
  if (score >= 85) return "准备拿样";
  if (score >= 70) return "正在测款";
  return "暂不考虑";
}

// 售价（原始值，可能为字符串）。
export function resolvePrice(record) {
  const r = asObject(record);
  const result = asObject(r.result);
  return (
    r.price ||
    result.effectivePrice?.price ||
    r.product?.price ||
    ""
  );
}

// 毛利率（0~1），缺失或为 0 返回 null。
export function resolveMargin(record) {
  const r = asObject(record);
  const result = asObject(r.result);
  const margin = toNumber(result.margin ?? r.margin);
  return margin != null && margin > 0 ? margin : null;
}

// 拿货成本。
export function resolveCost(record) {
  const r = asObject(record);
  const result = asObject(r.result);
  return toNumber(result.unitCost ?? r.product?.cost ?? r.cost);
}

// MOQ / 起订量。
export function resolveMoq(record) {
  const r = asObject(record);
  const result = asObject(r.result);
  return toNumber(r.product?.moq ?? result.moq ?? r.moq);
}

// 关键信息是否缺失（无可用售价且无毛利率 → 待补充信息）。
export function hasMissingKeyInfo(record) {
  const price = resolvePrice(record);
  const margin = resolveMargin(record);
  return !price && margin == null;
}

// 记录的标准状态：优先使用人工覆盖；否则缺关键信息→待补充信息；否则归一化原始状态。
export function getProductStatus(record, override) {
  if (override && PRODUCT_STATUSES.includes(override)) return override;
  if (hasMissingKeyInfo(record)) return "待补充信息";
  return normalizeProductStatus(resolveRawStatus(record));
}

// ---------------- 类目归类 ----------------

function recordText(record) {
  const r = asObject(record);
  const product = asObject(r.product);
  const result = asObject(r.result);
  return [
    r.category,
    r.product_name,
    product.category,
    product.name,
    product.keywords,
    Array.isArray(product.tags) ? product.tags.join(" ") : product.tags,
    result.categoryName,
    result.productIdentity?.productTypeLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const CATEGORY_RULES = [
  { group: "发饰 / 发圈", keywords: ["发圈", "发饰", "发夹", "发绳", "头绳", "发箍", "发卡", "扎头发"] },
  { group: "手机周边", keywords: ["手机壳", "手机", "数码", "数据线", "充电", "ipad", "平板", "耳机", "支架"] },
  { group: "文创纸品", keywords: ["贴纸", "文创", "手帐", "明信片", "笔记本", "纸品", "卡纸", "海报", "胶带", "便签"] },
  { group: "家居生活", keywords: ["家居", "香薰", "摆件", "桌面", "宿舍", "收纳", "杯", "灯", "抱枕", "地毯", "装饰"] },
  { group: "低价日用", keywords: ["日用", "湿巾", "清洁", "去污", "一次性", "棉签", "纸巾", "洗", "收纳袋", "垃圾袋"] },
  { group: "饰品 / 耳饰 / 配饰", keywords: ["耳夹", "耳饰", "耳环", "项链", "饰品", "配饰", "手链", "戒指", "珍珠", "胸针", "发箍"] },
];

// 根据 category / name / keywords / tags 自动归类。
export function classifyCategory(record) {
  const text = recordText(record);
  if (!text) return "其他";
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.group;
    }
  }
  return "其他";
}

// ---------------- 渠道识别 ----------------

function channelText(record) {
  const r = asObject(record);
  const product = asObject(r.product);
  const result = asObject(r.result);
  const channelFit = asObject(result.channelFit);
  return [
    product.channel,
    product.sellingChannels,
    Array.isArray(product.suggestedChannels) ? product.suggestedChannels.join(" ") : product.suggestedChannels,
    r.channel,
    channelFit.best,
    channelFit.recommended,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const CHANNEL_RULES = [
  { group: "小红书", keywords: ["小红书", "红书", "xhs"] },
  { group: "抖音", keywords: ["抖音", "douyin", "短视频"] },
  { group: "校园市集", keywords: ["校园", "市集", "社团", "高校", "学生社群"] },
  { group: "电商平台", keywords: ["电商", "淘宝", "天猫", "1688", "拼多多", "京东", "平台", "店铺"] },
  { group: "线下摆摊", keywords: ["摆摊", "摊位", "地摊", "线下", "夜市", "档口"] },
];

// 一条记录命中的渠道分组（可多个）。
export function classifyChannels(record) {
  const text = channelText(record);
  if (!text) return ["其他"];
  const matched = CHANNEL_RULES.filter((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  ).map((rule) => rule.group);
  return matched.length ? matched : ["其他"];
}

export function recordMatchesChannel(record, channelGroup) {
  if (!channelGroup || channelGroup === "全部渠道") return true;
  return classifyChannels(record).includes(channelGroup);
}

export function recordMatchesCategory(record, categoryGroup) {
  if (!categoryGroup || categoryGroup === "全部类目") return true;
  return classifyCategory(record) === categoryGroup;
}

// ---------------- 概览统计 ----------------

export function buildLibraryOverview(records, overrides = {}) {
  const list = Array.isArray(records) ? records : [];
  const byStatus = PRODUCT_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  let scoreSum = 0;
  let scoreCount = 0;
  let marginSum = 0;
  let marginCount = 0;

  list.forEach((record) => {
    const status = getProductStatus(record, overrides[record?.id]);
    if (byStatus[status] != null) byStatus[status] += 1;

    const score = toNumber(record?.score ?? record?.result?.totalScore);
    if (score != null && score > 0) {
      scoreSum += score;
      scoreCount += 1;
    }

    const margin = resolveMargin(record);
    if (margin != null) {
      marginSum += margin;
      marginCount += 1;
    }
  });

  return {
    total: list.length,
    byStatus,
    suggestSample: byStatus["建议拿样"],
    testing: byStatus["正在测款"],
    replenish: byStatus["建议补货"],
    reject: byStatus["建议放弃"],
    averageScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
    averageMargin: marginCount ? marginSum / marginCount : null,
  };
}

// 各状态 Tab 的数量（含“全部”）。
export function buildStatusCounts(records, overrides = {}) {
  const list = Array.isArray(records) ? records : [];
  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab] = 0;
    return acc;
  }, {});
  counts["全部"] = list.length;
  list.forEach((record) => {
    const status = getProductStatus(record, overrides[record?.id]);
    if (counts[status] != null) counts[status] += 1;
  });
  return counts;
}

// 自然语言概览句。
export function buildOverviewSentence(overview) {
  const safe = asObject(overview);
  return `当前共保存 ${safe.total || 0} 个候选产品，其中 ${safe.suggestSample || 0} 个建议拿样，${safe.testing || 0} 个正在测款，${safe.replenish || 0} 个建议补货。`;
}

// ---------------- 展示兜底 ----------------

export function formatPriceDisplay(record) {
  const price = resolvePrice(record);
  return price ? String(price) : "待补充";
}

export function formatMarginDisplay(record) {
  const margin = resolveMargin(record);
  return margin == null ? "待补充" : `${Math.round(margin * 100)}%`;
}

export function formatCategoryDisplay(record) {
  const r = asObject(record);
  const label =
    r.result?.productIdentity?.productTypeLabel ||
    r.result?.categoryName ||
    r.category ||
    r.product?.category ||
    "";
  return label || "其他";
}

// ---------------- 下一步建议 ----------------

export function getNextStepSuggestion(status) {
  switch (status) {
    case "建议拿样":
      return "建议先小批量拿样，确认 MOQ 和供应商稳定性。";
    case "已拿样":
      return "已拿样，建议尽快安排内容测款，收集真实数据。";
    case "正在测款":
      return "正在测款，建议补充曝光、收藏、询价和成交数据。";
    case "建议补货":
      return "数据表现较好，可考虑小批量补货。";
    case "建议放弃":
      return "风险较高，建议暂缓拿货。";
    case "待补充信息":
      return "信息不完整，建议先补齐成本、MOQ、售价等关键字段。";
    default:
      return "建议结合报告进一步判断下一步动作。";
  }
}

// ---------------- 补货建议 ----------------

function getReviewData(record) {
  const review = asObject(record).result?.review;
  return asObject(review);
}

// 是否有任何测款数据（曝光 / 互动 / 收藏 / 询价 / 成交）。
export function hasTestData(record) {
  const review = getReviewData(record);
  return ["views", "likes", "saves", "comments", "inquiries", "orders"].some((key) => {
    const value = toNumber(review[key]);
    return value != null && value > 0;
  });
}

// 补货建议：不在缺数据时乱承诺补货。
export function buildReplenishAdvice(record) {
  const review = getReviewData(record);
  const orders = toNumber(review.orders);
  const saves = toNumber(review.saves);
  const inquiries = toNumber(review.inquiries);
  const margin = resolveMargin(record);
  const cost = resolveCost(record);
  const moq = resolveMoq(record);

  // 规则 4：风险高或缺成本 / MOQ → 待补充信息
  if (cost == null || moq == null) {
    return {
      level: "待补充信息",
      title: "补货建议：待补充信息",
      quantity: "",
      reason: "当前缺少拿货成本或 MOQ，无法判断补货资金和压货风险，请先补齐采购信息。",
    };
  }

  const marginOk = margin != null && margin >= 0.4;

  // 规则 1：有成交数据、毛利率较高、测款成本可控 → 小批量补货
  if (orders != null && orders > 0 && marginOk) {
    return {
      level: "小批量补货",
      title: "补货建议：小批量补货",
      quantity: "30–50 件",
      reason: "评分较高、毛利率可接受，若测款成交稳定，可继续小批量验证。",
    };
  }

  // 规则 2：有收藏 / 询价但成交不足 → 改内容或价格后再测
  const hasInterest = (saves != null && saves > 0) || (inquiries != null && inquiries > 0);
  if (hasInterest && (orders == null || orders === 0)) {
    return {
      level: "改内容或价格后再测",
      title: "补货建议：改内容或价格后再测",
      quantity: "",
      reason: "已有收藏或询价但成交不足，建议优化内容卖点或价格后再测，暂不直接补货。",
    };
  }

  // 规则 3：只有评分高但没有测款数据 → 待复盘后判断（建议拿样，不直接补货）
  if (!hasTestData(record)) {
    return {
      level: "待复盘后判断",
      title: "补货建议：待复盘后判断",
      quantity: "",
      reason: "当前缺少曝光、询价、成交或测款成本数据，暂不建议直接放大进货。",
    };
  }

  return {
    level: "待复盘后判断",
    title: "补货建议：待复盘后判断",
    quantity: "",
    reason: "测款数据尚不充分，建议先完成复盘再判断是否补货。",
  };
}

// 过滤：按状态 / 类目 / 渠道筛选。
export function filterRecords(records, { statusTab = "全部", category = "全部类目", channel = "全部渠道", overrides = {} } = {}) {
  const list = Array.isArray(records) ? records : [];
  return list.filter((record) => {
    const matchStatus = statusTab === "全部" || getProductStatus(record, overrides[record?.id]) === statusTab;
    const matchCategory = recordMatchesCategory(record, category);
    const matchChannel = recordMatchesChannel(record, channel);
    return matchStatus && matchCategory && matchChannel;
  });
}
