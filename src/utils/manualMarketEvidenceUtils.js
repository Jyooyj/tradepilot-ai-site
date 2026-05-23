import {
  competitorDensityDescriptions,
  contentHomogeneityDescriptions,
  manualEvidenceCompletenessRules,
  manualMarketNextActionTemplates,
  manualMarketRiskMessages,
} from "../constants/manualMarketEvidenceConfig";

function normalizeText(value) {
  return String(value || "").trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hasValue(value) {
  return Boolean(normalizeText(value));
}

function isObserved(value) {
  const text = normalizeText(value);
  return Boolean(text && text !== "未观察");
}

function unique(items) {
  return [...new Set((Array.isArray(items) ? items : []).filter(Boolean))];
}

export function normalizeManualMarketEvidence(product = {}) {
  const evidence = {
    wholesalePriceReference: normalizeText(product.wholesalePriceReference),
    retailPriceReference: normalizeText(product.retailPriceReference),
    contentHeatReference: normalizeText(product.contentHeatReference),
    marketReferenceLinks: normalizeText(product.marketReferenceLinks),
    competitorDensity: normalizeText(product.competitorDensity) || "未观察",
    contentHomogeneity: normalizeText(product.contentHomogeneity) || "未观察",
    manualMarketNote: normalizeText(product.manualMarketNote),
  };

  return {
    ...evidence,
    hasManualEvidence: [
      evidence.wholesalePriceReference,
      evidence.retailPriceReference,
      evidence.contentHeatReference,
      evidence.marketReferenceLinks,
      evidence.manualMarketNote,
    ].some(hasValue) || isObserved(evidence.competitorDensity) || isObserved(evidence.contentHomogeneity),
  };
}

function getCompleteness(evidence) {
  const filledCount = [
    evidence.wholesalePriceReference,
    evidence.retailPriceReference,
    evidence.contentHeatReference,
    evidence.marketReferenceLinks,
    evidence.manualMarketNote,
  ].filter(hasValue).length
    + (isObserved(evidence.competitorDensity) ? 1 : 0)
    + (isObserved(evidence.contentHomogeneity) ? 1 : 0);

  if (filledCount >= 5) return "high";
  if (filledCount >= 2) return "medium";
  return "low";
}

function buildPositiveSignals(evidence) {
  const signals = [];

  if (evidence.wholesalePriceReference && evidence.retailPriceReference) signals.push("价格证据较完整");
  if (evidence.contentHeatReference) signals.push("已补充内容热度观察");
  if (evidence.marketReferenceLinks) signals.push("已补充可追溯参考链接");
  if (isObserved(evidence.competitorDensity)) signals.push(`同类竞品数量观察：${evidence.competitorDensity}`);
  if (isObserved(evidence.contentHomogeneity)) signals.push(`内容同质化程度观察：${evidence.contentHomogeneity}`);

  return signals;
}

function buildAnalysisConclusions(evidence) {
  const conclusions = [];

  if (evidence.wholesalePriceReference && evidence.retailPriceReference) {
    conclusions.push("已同时补充批发价与零售价参考，价格证据完整度较高，可用于初步判断利润空间。");
  } else if (evidence.wholesalePriceReference) {
    conclusions.push("已补充批发价参考，可辅助判断拿货成本，但仍建议补充零售价参考来判断利润空间。");
  } else if (evidence.retailPriceReference) {
    conclusions.push("已补充淘宝/拼多多零售价参考，可辅助判断建议售价与竞品价格带的关系。");
  } else {
    conclusions.push("暂未补充批发价或零售价参考，价格证据仍不足。");
  }

  if (evidence.contentHeatReference) {
    conclusions.push("已补充内容热度观察，可辅助判断短视频/种草测款价值。");
  } else {
    conclusions.push("暂未补充内容热度观察，内容测款优先级仍需要人工搜索验证。");
  }

  if (evidence.competitorDensity === "多") {
    conclusions.push("同类竞品较多，说明市场需求可能存在，但竞争压力较大，需要依靠图片风格、标题钩子或组合套装做差异化。");
  } else if (evidence.competitorDensity === "少") {
    conclusions.push("同类竞品较少，可能存在内容机会，但也可能说明需求尚未被验证，建议先小批量测款。");
  } else if (evidence.competitorDensity === "中等") {
    conclusions.push("同类竞品数量适中，适合用价格、主图风格和内容角度测试差异化。");
  }

  if (evidence.contentHomogeneity === "高") {
    conclusions.push("内容同质化较高，普通展示图容易被淹没，需要强调使用场景、材质细节或人群标签。");
  } else if (evidence.contentHomogeneity === "低") {
    conclusions.push("内容同质化较低，有机会通过差异化内容切入，但仍需验证搜索需求。");
  } else if (evidence.contentHomogeneity === "中") {
    conclusions.push("内容同质化处于中等水平，建议在封面、标题和场景演示上做区分。");
  }

  if (evidence.marketReferenceLinks) {
    conclusions.push("已补充参考链接，后续可用于人工复核价格和内容表现。");
  }

  return unique(conclusions);
}

function buildRiskWarnings(evidence) {
  const warnings = [];

  if (!evidence.hasManualEvidence) warnings.push(manualMarketRiskMessages.insufficientEvidence);
  if (!evidence.wholesalePriceReference) warnings.push(manualMarketRiskMessages.wholesaleMissing);
  if (!evidence.retailPriceReference) warnings.push(manualMarketRiskMessages.retailMissing);
  if (!evidence.contentHeatReference) warnings.push(manualMarketRiskMessages.heatMissing);
  if (!evidence.marketReferenceLinks) warnings.push(manualMarketRiskMessages.linkMissing);
  if (evidence.competitorDensity === "多") warnings.push(manualMarketRiskMessages.highDensity);
  if (evidence.contentHomogeneity === "高") warnings.push(manualMarketRiskMessages.highHomogeneity);

  return unique(warnings).length ? unique(warnings) : ["暂无明确高风险，但仍建议继续核验同款价格、内容热度和供应稳定性。"];
}

function buildNextActions(evidence) {
  const actions = [];

  if (!evidence.marketReferenceLinks) actions.push(manualMarketNextActionTemplates.addLinks);
  if (!evidence.contentHeatReference) actions.push(manualMarketNextActionTemplates.addHeat);
  if (!evidence.wholesalePriceReference || !evidence.retailPriceReference) actions.push(manualMarketNextActionTemplates.addPrice);
  if (evidence.competitorDensity === "多" || evidence.contentHomogeneity === "高") actions.push(manualMarketNextActionTemplates.differentiate);
  if (evidence.competitorDensity === "少" || evidence.hasManualEvidence) actions.push(manualMarketNextActionTemplates.testSmallBatch);

  return unique(actions).length ? unique(actions) : [manualMarketNextActionTemplates.testSmallBatch];
}

function getScoreAdjustment(evidence, dataCompleteness) {
  if (!evidence.hasManualEvidence) return 0;

  let adjustment = dataCompleteness === "high" ? 2 : dataCompleteness === "medium" ? 1 : 0;

  if (evidence.competitorDensity === "多") adjustment -= 2;
  if (evidence.contentHomogeneity === "高") adjustment -= 2;
  if (evidence.contentHomogeneity === "低" && evidence.contentHeatReference) adjustment += 1;

  return clamp(adjustment, -5, 5);
}

export function evaluateManualMarketEvidence(product = {}, baseResult = {}) {
  const evidence = normalizeManualMarketEvidence(product);
  const dataCompleteness = getCompleteness(evidence);
  const positiveSignals = buildPositiveSignals(evidence);
  const analysisConclusions = buildAnalysisConclusions(evidence);
  const riskWarnings = buildRiskWarnings(evidence);
  const nextActions = buildNextActions(evidence);
  const confidenceScore = evidence.hasManualEvidence
    ? clamp(28 + positiveSignals.length * 9 + (dataCompleteness === "high" ? 18 : dataCompleteness === "medium" ? 8 : 0), 30, 90)
    : 18;
  const scoreAdjustment = getScoreAdjustment(evidence, dataCompleteness);

  return {
    sourceType: "manual_input",
    dataCompleteness,
    dataCompletenessLabel: manualEvidenceCompletenessRules[dataCompleteness],
    confidenceScore,
    evidenceScore: confidenceScore,
    evidence: {
      ...evidence,
      competitorDensityDescription: competitorDensityDescriptions[evidence.competitorDensity],
      contentHomogeneityDescription: contentHomogeneityDescriptions[evidence.contentHomogeneity],
    },
    evidenceSummary: analysisConclusions[0] || "暂未填写人工市场证据，当前仍可生成报告，但市场证据需要后续补充核验。",
    analysisConclusions,
    riskWarnings,
    nextActions,
    positiveSignals,
    scoreAdjustment,
    sourceNotice: "人工市场证据由用户手动填写，系统不会将其声明为平台真实 API 数据，也不会伪造销量、热度、点赞、播放或价格。",
    baseScore: baseResult?.totalScore ?? baseResult?.score ?? null,
  };
}

export function applyManualMarketEvidenceToResult(result = {}, manualEvidence = null) {
  if (!manualEvidence) return result;

  const scoreAdjustment = clamp(Number(manualEvidence.scoreAdjustment) || 0, -5, 5);
  const nextResult = {
    ...result,
    manualMarketEvidence: manualEvidence,
    marketEvidence: {
      ...(result.marketEvidence || {}),
      manual: manualEvidence,
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
