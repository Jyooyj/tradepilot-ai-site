import {
  douyinFallbackPlatform,
  douyinFallbackRiskMessages,
  douyinHeatLevels,
  douyinManualSignalRules,
  douyinSearchRules,
  douyinSourceTypes,
} from "../constants/douyinFallbackConfig";

function normalizeText(value) {
  return String(value || "").trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitTerms(value) {
  return normalizeText(value)
    .split(douyinSearchRules.separatorPattern)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildDouyinSearchQuery(product = {}) {
  const terms = [
    normalizeText(product.name),
    ...splitTerms(product.keywords),
    ...splitTerms(product.category),
  ];
  const cleanedTerms = unique(terms).slice(0, douyinSearchRules.maxTerms);
  return cleanedTerms.join(" ") || "小商品 测款";
}

export function buildDouyinSearchLinks(product = {}) {
  const query = buildDouyinSearchQuery(product);
  const encodedQuery = encodeURIComponent(query);

  return douyinSearchRules.links.map((link) => ({
    label: link.label,
    url: link.urlTemplate.replace("{query}", encodedQuery),
    purpose: link.purpose,
    sourceType: "search_reference",
  }));
}

export function extractManualDouyinSignals(product = {}) {
  const sourceText = [
    product.marketReference,
    product.note,
    product.keywords,
    product.channel,
  ].map(normalizeText).filter(Boolean).join(" ");

  const signals = douyinManualSignalRules
    .filter(({ keyword }) => sourceText.includes(keyword))
    .map(({ signal }) => signal);

  return {
    signals: unique(signals),
    hasManualEvidence: signals.length > 0,
  };
}

function inferHeatLevelFromSignals(signals) {
  const joinedSignals = signals.join(" ");
  const hasLowSignal = /搜索结果较少|互动偏低|无明显热度/.test(joinedSignals);
  const hasHighSignal = /点赞|评论|收藏|爆款|热门|同款|种草|搜索结果较多/.test(joinedSignals);
  const hasCompetitionSignal = /竞争较大/.test(joinedSignals);

  if (hasLowSignal) return "low";
  if (hasHighSignal && !hasCompetitionSignal) return "high";
  if (hasHighSignal || hasCompetitionSignal) return "medium";
  return "unknown";
}

function buildRiskWarnings(heatLevel, manualSignals) {
  const warnings = [
    douyinFallbackRiskMessages.apiUnauthorized,
    douyinFallbackRiskMessages.searchRecommendation,
  ];
  const joinedSignals = manualSignals.join(" ");

  if (/同款|竞争较大/.test(joinedSignals) || heatLevel === "high") {
    warnings.push(douyinFallbackRiskMessages.homogenization);
  }

  if (heatLevel === "low" || /搜索结果较少/.test(joinedSignals)) {
    warnings.push(douyinFallbackRiskMessages.sparseResults);
  }

  if (!manualSignals.length) {
    warnings.push(douyinFallbackRiskMessages.missingManualEvidence);
  }

  return unique(warnings);
}

function getScoreAdjustment(heatLevel, hasManualEvidence) {
  if (!hasManualEvidence) return -1;
  if (heatLevel === "high") return 2;
  if (heatLevel === "medium") return 1;
  if (heatLevel === "low") return -2;
  return 0;
}

export function evaluateDouyinFallbackEvidence(product = {}, baseResult = {}) {
  const query = buildDouyinSearchQuery(product);
  const searchLinks = buildDouyinSearchLinks(product);
  const { signals, hasManualEvidence } = extractManualDouyinSignals(product);
  const heatLevel = hasManualEvidence ? inferHeatLevelFromSignals(signals) : "unknown";
  const hasQuery = Boolean(query && query !== "小商品 测款");
  const channelMentionsDouyin = /抖音|短视频/.test(normalizeText(product.channel));
  const confidenceScore = clamp(
    24 + (hasQuery ? 12 : 0) + (hasManualEvidence ? 32 : 0) + (channelMentionsDouyin ? 8 : 0),
    18,
    hasManualEvidence ? 82 : 45
  );
  const riskWarnings = buildRiskWarnings(heatLevel, signals);
  const heatLabel = douyinHeatLevels[heatLevel]?.label || douyinHeatLevels.unknown.label;
  const scoreAdjustment = clamp(getScoreAdjustment(heatLevel, hasManualEvidence), -3, 3);

  return {
    platform: douyinFallbackPlatform.platform,
    platformLabel: douyinFallbackPlatform.label,
    purpose: douyinFallbackPlatform.purpose,
    sourceType: "api_pending",
    sourceTypeLabel: douyinSourceTypes.api_pending,
    fallback: true,
    query,
    heatLevel,
    heatLevelLabel: heatLabel,
    confidenceScore,
    searchLinks,
    manualSignals: signals,
    evidenceSummary: hasManualEvidence
      ? `已根据用户填写的内容热度备注识别到 ${signals.length} 条抖音相关信号，当前判断为${heatLabel}热度参考。`
      : "当前未填写明确的抖音内容热度备注，热度等级暂为未知，仅提供搜索入口和风险提示。",
    riskWarnings,
    scoreAdjustment,
    sourceNotice: "当前为抖音 API 未授权降级方案：未调用真实抖音 API，未获取真实点赞、评论、播放、收藏或完播数据；请将搜索入口作为人工核验参考。",
    baseScore: baseResult?.totalScore ?? baseResult?.score ?? null,
  };
}

export function applyDouyinFallbackToResult(result = {}, douyinEvidence = null) {
  if (!douyinEvidence) return result;

  const scoreAdjustment = clamp(Number(douyinEvidence.scoreAdjustment) || 0, -3, 3);
  const nextResult = {
    ...result,
    douyinEvidence,
    marketEvidence: {
      ...(result.marketEvidence || {}),
      douyin: douyinEvidence,
    },
  };

  if (Number.isFinite(Number(result.totalScore))) {
    nextResult.totalScore = clamp(Math.round(Number(result.totalScore) + scoreAdjustment), 0, 100);
  }

  if (Number.isFinite(Number(result.score))) {
    nextResult.score = clamp(Math.round(Number(result.score) + scoreAdjustment), 0, 100);
  }

  return nextResult;
}
