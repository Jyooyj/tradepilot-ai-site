import {
  competitorDensityDescriptions,
  contentHomogeneityDescriptions,
  manualEvidenceCompletenessRules,
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
  return [...new Set(items.filter(Boolean))];
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

  if (evidence.wholesalePriceReference) signals.push("已填写 1688 批发价参考，可辅助拿货价判断");
  if (evidence.retailPriceReference) signals.push("已填写淘宝/拼多多零售价参考，可辅助竞品价格带判断");
  if (evidence.contentHeatReference) signals.push("已填写抖音/小红书内容热度观察，可辅助内容测款判断");
  if (evidence.marketReferenceLinks) signals.push("已填写市场参考链接，便于后续复盘核验");
  if (isObserved(evidence.competitorDensity)) signals.push(`同类竞品数量观察：${evidence.competitorDensity}`);
  if (isObserved(evidence.contentHomogeneity)) signals.push(`内容同质化程度观察：${evidence.contentHomogeneity}`);

  return signals;
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

  return unique(warnings);
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
  const riskWarnings = buildRiskWarnings(evidence);
  const confidenceScore = evidence.hasManualEvidence
    ? clamp(28 + positiveSignals.length * 9 + (dataCompleteness === "high" ? 18 : dataCompleteness === "medium" ? 8 : 0), 30, 90)
    : 18;
  const scoreAdjustment = getScoreAdjustment(evidence, dataCompleteness);

  return {
    sourceType: "manual_input",
    dataCompleteness,
    dataCompletenessLabel: manualEvidenceCompletenessRules[dataCompleteness],
    confidenceScore,
    evidence: {
      ...evidence,
      competitorDensityDescription: competitorDensityDescriptions[evidence.competitorDensity],
      contentHomogeneityDescription: contentHomogeneityDescriptions[evidence.contentHomogeneity],
    },
    evidenceSummary: evidence.hasManualEvidence
      ? `已基于用户填写的人工市场证据生成辅助判断，完整度为${dataCompleteness}。这些信息来自人工调研记录，不代表平台 API 自动数据。`
      : "暂未填写人工市场证据，当前仍可生成报告，但市场证据需要后续补充核验。",
    riskWarnings,
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
