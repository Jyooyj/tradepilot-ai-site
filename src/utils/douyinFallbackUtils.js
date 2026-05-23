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
  return [...new Set((Array.isArray(items) ? items : []).filter(Boolean))];
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

  const links = Array.isArray(douyinSearchRules.links) ? douyinSearchRules.links.slice(0, 1) : [];

  return links.map((link) => ({
    label: link.label,
    url: link.urlTemplate.replace("{query}", encodedQuery),
    purpose: link.purpose,
    sourceType: "search_reference",
  }));
}

export function extractManualDouyinSignals(product = {}) {
  const sourceText = [
    product.marketReference,
    product.contentHeatReference,
    product.manualMarketNote,
    product.marketReferenceLinks,
    product.note,
    product.keywords,
    product.channel,
  ].map(normalizeText).filter(Boolean).join(" ");

  const signals = douyinManualSignalRules
    .filter(({ keyword }) => sourceText.includes(keyword))
    .map(({ signal }) => signal);

  if (normalizeText(product.contentHeatReference) && !signals.length) {
    signals.push("用户已填写内容热度观察");
  }

  if (product.contentHomogeneity === "高") {
    signals.push("用户观察到内容同质化程度较高");
  }

  if (product.competitorDensity === "多") {
    signals.push("用户观察到同类竞品数量较多");
  }

  return {
    signals: unique(signals),
    hasManualEvidence: signals.length > 0 || Boolean(normalizeText(product.contentHeatReference)),
  };
}

function inferHeatLevelFromSignals(signals) {
  const joinedSignals = signals.join(" ");
  const hasLowSignal = /搜索结果较少|互动偏低|无明显热度|搜索少|内容少|低互动|没热度/.test(joinedSignals);
  const hasHighSignal = /点赞|评论|询价|收藏|爆款|热门|同款|种草|搜索结果较多/.test(joinedSignals);
  const hasCompetitionSignal = /竞争较大|竞品数量较多|同质化程度较高/.test(joinedSignals);

  if (hasLowSignal) return "low";
  if (hasHighSignal && !hasCompetitionSignal) return "high";
  if (hasHighSignal || hasCompetitionSignal) return "medium";
  return "unknown";
}

function buildRiskWarnings(heatLevel, manualSignals, product = {}) {
  const warnings = [
    douyinFallbackRiskMessages.apiUnauthorized,
    douyinFallbackRiskMessages.searchRecommendation,
  ];
  const joinedSignals = manualSignals.join(" ");

  if (/同款|竞争较大|竞品数量较多|同质化程度较高/.test(joinedSignals) || heatLevel === "high") {
    warnings.push(douyinFallbackRiskMessages.homogenization);
  }

  if (heatLevel === "low" || /搜索结果较少/.test(joinedSignals)) {
    warnings.push(douyinFallbackRiskMessages.sparseResults);
  }

  if (!normalizeText(product.contentHeatReference)) {
    warnings.push(douyinFallbackRiskMessages.missingManualEvidence);
  }

  return unique(warnings);
}

function buildAnalysisConclusions(product, heatLevel, manualSignals) {
  const contentHeatText = normalizeText(product.contentHeatReference);
  const joinedText = `${contentHeatText} ${manualSignals.join(" ")}`;
  const conclusions = [];

  if (contentHeatText) {
    if (/点赞高|点赞较高|评论多|询价|爆款|热门|收藏|种草/.test(joinedText)) {
      conclusions.push("用户观察到互动信号，说明该品类具备内容测款价值，但仍需用短视频封面和评论区反馈验证。");
    } else if (/搜索少|内容少|低互动|没热度|无明显热度/.test(joinedText)) {
      conclusions.push("当前平台热度证据偏弱，建议先做小样内容测试，不宜直接大量进货。");
    } else {
      conclusions.push("已补充抖音/小红书热度观察，可作为短视频和种草内容测款的辅助证据。");
    }

    if (/同款多|竞争大|同款|竞品数量较多|同质化程度较高/.test(joinedText)) {
      conclusions.push("内容竞争较强，需要用差异化场景或人群定位切入。");
    }
  } else {
    conclusions.push("暂未提供抖音/小红书热度观察，因此内容热度证据不足。建议先搜索同款关键词，记录点赞、评论、收藏、询价和同质化情况后再判断测款优先级。");
  }

  if (heatLevel === "high") {
    conclusions.push("当前热度参考偏高，适合优先测试封面钩子、使用场景和评论区询价反馈。");
  } else if (heatLevel === "low") {
    conclusions.push("当前热度参考偏低，建议先用低成本内容验证兴趣，不宜直接扩大备货。");
  } else if (heatLevel === "medium") {
    conclusions.push("当前热度参考处于中等水平，建议结合差异化内容角度做小批量测款。");
  }

  return unique(conclusions);
}

function buildNextActions(product, heatLevel) {
  const actions = [];

  if (!normalizeText(product.contentHeatReference)) {
    actions.push("先搜索同款关键词，记录点赞、评论、收藏、询价和内容同质化情况。");
  }

  if (heatLevel === "high" || heatLevel === "medium") {
    actions.push("用 2-3 个短视频封面和标题钩子测试点击、停留和评论区询价。");
  }

  if (heatLevel === "low" || heatLevel === "unknown") {
    actions.push("先做小样内容测试，再根据互动和询价反馈决定是否进货。");
  }

  if (product.contentHomogeneity === "高" || product.competitorDensity === "多") {
    actions.push("避开同款平铺展示，优先拍使用场景、材质细节和人群标签。");
  }

  return unique(actions).length ? unique(actions) : ["人工查看抖音搜索结果，确认内容互动和同质化情况后再判断测款优先级。"];
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
  const riskWarnings = buildRiskWarnings(heatLevel, signals, product);
  const heatLabel = douyinHeatLevels[heatLevel]?.label || douyinHeatLevels.unknown.label;
  const scoreAdjustment = clamp(getScoreAdjustment(heatLevel, hasManualEvidence), -3, 3);
  const analysisConclusions = buildAnalysisConclusions(product, heatLevel, signals);
  const nextActions = buildNextActions(product, heatLevel);

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
    evidenceScore: confidenceScore,
    searchLinks,
    manualSignals: signals,
    evidenceSummary: analysisConclusions[0] || "当前内容热度证据不足，需要人工搜索同款关键词后再判断测款优先级。",
    analysisConclusions,
    riskWarnings,
    nextActions,
    scoreAdjustment,
    sourceNotice: "当前为市场证据模式：未调用外部平台 API，不生成或伪造平台真实价格、销量、点赞、播放数据；系统基于用户填写信息和搜索入口进行辅助判断。",
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
