// policyRiskEngine.js
// Policy Risk Engine｜政策与内容合规风险提示。
// 离线规则匹配，无联网、无爬虫、无官方接口，仅做发布前合规自检与风险提示。
// 不提供任何“绕过审核 / 规避风控 / 保证过审”的能力或表述。

import {
  HIGH_RISK_CATEGORIES,
  POLICY_RISK_DISCLAIMER,
  SAFE_CONTEXT_PATTERNS,
  SAFE_PHRASE_WHITELIST,
  SAFE_REWRITE_MAP,
  policyRiskRules,
} from "../data/policyRiskRules.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(text).join(" ");
  return String(value);
}

const SEVERITY_WEIGHT = { high: 40, medium: 15, low: 5 };

// 输入字段 → 规则 scope 标签。
const FIELD_SCOPE = {
  title: "title",
  body: "body",
  script: "script",
  hashtags: "tag",
  sellingPoints: "sellingPoint",
  productName: "body",
  category: "body",
  targetAudience: "body",
  channel: "body",
};

const FIELD_LABELS = {
  title: "标题",
  body: "正文",
  script: "脚本/口播",
  hashtags: "标签",
  sellingPoints: "卖点",
  productName: "商品名称",
  category: "类目",
  targetAudience: "目标人群",
  channel: "渠道",
};

export function getFieldLabel(field) {
  return FIELD_LABELS[field] || field;
}

// 为命中项挑选安全改写建议。
function buildSafeRewrite(matchedText, rule) {
  const mapped = SAFE_REWRITE_MAP.find((entry) =>
    entry.match.some((keyword) => matchedText.includes(keyword) || keyword.includes(matchedText))
  );
  if (mapped) return mapped.suggestion;
  return asArray(rule.saferAlternatives)[0] || "建议替换为更克制、可被证据支持的表达。";
}

// 把文本拆成更小的语境片段，便于做上下文白名单判断（降低误报）。
function splitSegments(content) {
  return String(content)
    .split(/[\n。；;！!？?，,、|（）()【】\[\]]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

// 该片段是否属于安全语境（风险确认问题 / 风险提醒 / 免责声明 / 系统分析说明）。
function isSafeContextSegment(segment) {
  return SAFE_CONTEXT_PATTERNS.some((pattern) => segment.includes(pattern));
}

// 命中词是否只是某个白名单短语的一部分（例如“爆款”出现在“爆款潜力”里）。
function isWhitelistedMatch(keyword, segment) {
  return SAFE_PHRASE_WHITELIST.some(
    (phrase) => phrase !== keyword && phrase.includes(keyword) && segment.includes(phrase)
  );
}

// “营销类”风险类别：在安全语境（如供应商确认问题、风险提醒）中应被豁免。
const MARKETING_LIKE_CATEGORIES = new Set([
  "广告法绝对化用语",
  "未证实销量/热度/平台数据",
  "侵权/品牌风险",
]);

// 扫描单个字段文本，返回命中数组（带上下文白名单与安全语境豁免）。
function scanField(value, field) {
  const content = text(value).trim();
  if (!content) return [];
  const scope = FIELD_SCOPE[field] || "body";
  const segments = splitSegments(content);
  const hits = [];

  segments.forEach((segment) => {
    const safeContext = isSafeContextSegment(segment);

    policyRiskRules.forEach((rule) => {
      if (!asArray(rule.scope).includes(scope)) return;
      // 安全语境下，豁免营销类风险（确认问题/风险提醒/免责声明等不是对外营销文案）。
      if (safeContext && MARKETING_LIKE_CATEGORIES.has(rule.category)) return;

      asArray(rule.keywords).forEach((keyword) => {
        if (!keyword || !segment.includes(keyword)) return;
        // 命中词只是白名单短语的一部分（产品说明 / 数据字段 / 系统分析），忽略。
        if (isWhitelistedMatch(keyword, segment)) return;

        hits.push({
          ruleId: rule.ruleId,
          category: rule.category,
          severity: rule.severity,
          matchedText: keyword,
          field,
          fieldLabel: getFieldLabel(field),
          riskReason: rule.riskReason,
          saferAlternatives: asArray(rule.saferAlternatives),
          safeRewrite: buildSafeRewrite(keyword, rule),
        });
      });
    });
  });

  return hits;
}

function dedupeHits(hits) {
  const seen = new Set();
  const result = [];
  hits.forEach((hit) => {
    const key = `${hit.ruleId}|${hit.field}|${hit.matchedText}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(hit);
  });
  return result;
}

function computeRiskLevel(hits) {
  if (!hits.length) return "low";
  const hasHigh = hits.some((hit) => hit.severity === "high");
  const hasHighCategory = hits.some((hit) => HIGH_RISK_CATEGORIES.includes(hit.category));
  if (hasHigh || hasHighCategory) return "high";
  const mediumCount = hits.filter((hit) => hit.severity === "medium").length;
  if (mediumCount >= 2) return "medium";
  return "low";
}

function computeRiskScore(hits) {
  const raw = hits.reduce((acc, hit) => acc + (SEVERITY_WEIGHT[hit.severity] || 0), 0);
  return Math.min(100, raw);
}

const RISK_LEVEL_TEXT = { low: "低", medium: "中", high: "高" };

export function getRiskLevelText(level) {
  return RISK_LEVEL_TEXT[level] || "低";
}

/**
 * 政策与内容合规风险分析。
 * @param {object} input 待检查内容
 * @param {object} options 可选项（保留扩展）
 * @returns {object} 风险报告
 */
export function analyzePolicyRisk(input = {}, options = {}) {
  const source = input && typeof input === "object" ? input : {};
  const fields = [
    "title",
    "body",
    "script",
    "hashtags",
    "sellingPoints",
    "productName",
    "category",
    "targetAudience",
    "channel",
  ];

  let hits = [];
  fields.forEach((field) => {
    const value = source[field];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        hits = hits.concat(scanField(item, field));
      });
    } else {
      hits = hits.concat(scanField(value, field));
    }
  });

  hits = dedupeHits(hits);

  const overallRiskLevel = computeRiskLevel(hits);
  const riskScore = computeRiskScore(hits);

  const blockedTerms = [...new Set(hits.filter((h) => h.severity === "high").map((h) => h.matchedText))];
  const cautionTerms = [...new Set(hits.filter((h) => h.severity !== "high").map((h) => h.matchedText))];

  const safeRewriteSuggestions = [...new Set(hits.map((h) => `「${h.matchedText}」建议改为：${h.safeRewrite}`))];

  const categories = [...new Set(hits.map((h) => h.category))];

  let summary;
  if (!hits.length) {
    summary = "当前内容未发现明显高风险表达，仍建议发布前结合平台规则进行人工复核。";
  } else {
    summary = `系统检测到 ${hits.length} 处可能存在合规风险的表达，主要涉及：${categories.slice(0, 4).join("、")}，建议发布前修改并保留证据来源。`;
  }

  return {
    overallRiskLevel,
    riskScore,
    hits,
    blockedTerms,
    cautionTerms,
    safeRewriteSuggestions,
    categories,
    summary,
    disclaimer: POLICY_RISK_DISCLAIMER,
  };
}

// ---------------- 与现有模块对接的便捷函数 ----------------

function joinShots(shots) {
  return asArray(shots)
    .map((shot) => [shot?.copy, shot?.visual, shot?.focus, shot?.purpose].filter(Boolean).join(" "))
    .join(" \n ");
}

// 从小红书内容包 + 图文结构构造检查输入。
export function buildXhsRiskInput(xhsPackage = {}, xhsStructure = [], context = {}) {
  const pack = xhsPackage && typeof xhsPackage === "object" ? xhsPackage : {};
  return {
    title: asArray(pack.titles),
    body: [text(asArray(xhsStructure)), text(pack.merchantStrategy)].filter(Boolean).join(" \n "),
    hashtags: asArray(pack.hashtags || pack.tags),
    sellingPoints: asArray(pack.coverHooks),
    productName: context.productName || "",
    category: context.category || "",
    targetAudience: context.targetAudience || "",
    channel: context.channel || "小红书",
  };
}

// 从抖音脚本包构造检查输入。
export function buildDouyinRiskInput(douyinPackage = {}, context = {}) {
  const pack = douyinPackage && typeof douyinPackage === "object" ? douyinPackage : {};
  return {
    title: asArray(pack.coverTexts),
    script: [text(pack.direction), joinShots(pack.shots), text(pack.merchantGoal)].filter(Boolean).join(" \n "),
    sellingPoints: asArray(pack.hooks || pack.coverTexts),
    productName: context.productName || "",
    category: context.category || "",
    targetAudience: context.targetAudience || "",
    channel: context.channel || "抖音",
  };
}

export function analyzeXhsPackageRisk(xhsPackage, xhsStructure, context) {
  return analyzePolicyRisk(buildXhsRiskInput(xhsPackage, xhsStructure, context));
}

export function analyzeDouyinPackageRisk(douyinPackage, context) {
  return analyzePolicyRisk(buildDouyinRiskInput(douyinPackage, context));
}

// 综合扫描一份分析结果（小红书 + 抖音 + 报告 + 卖点 + 供应商建议）。
export function analyzeResultPolicyRisk(result = {}, product = {}) {
  const safeResult = result && typeof result === "object" ? result : {};
  const safeProduct = product && typeof product === "object" ? product : {};
  const xhs = safeResult.xhsPackage || {};
  const douyin = safeResult.douyinPackage || {};

  const context = {
    productName: safeProduct.name || safeResult.productIdentity?.displayName || "",
    category: safeProduct.category || safeResult.categoryName || "",
    targetAudience: safeProduct.audience || "",
    channel: safeProduct.channel || "",
  };

  return analyzePolicyRisk({
    title: [...asArray(xhs.titles), ...asArray(douyin.coverTexts)],
    body: [
      text(asArray(safeResult.xhsStructure)),
      text(xhs.merchantStrategy),
      text(safeResult.report),
      text(safeResult.executiveSummary),
    ].filter(Boolean).join(" \n "),
    script: joinShots(douyin.shots) + " " + text(douyin.direction) + " " + text(douyin.merchantGoal),
    hashtags: asArray(xhs.hashtags || xhs.tags),
    sellingPoints: [...asArray(xhs.coverHooks), ...asArray(safeResult.sellingPoints)],
    productName: context.productName,
    category: context.category,
    targetAudience: context.targetAudience,
    channel: context.channel,
  });
}
