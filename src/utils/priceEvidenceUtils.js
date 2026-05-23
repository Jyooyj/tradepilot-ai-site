import {
  alibabaPriceNotices,
  alibabaPriceRiskMessages,
  alibabaPriceSearchRules,
  alibabaPriceSourceTypes,
} from "../constants/alibabaPriceConfig";

function normalizeText(value) {
  return String(value || "").trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function splitTerms(value) {
  return normalizeText(value)
    .split(alibabaPriceSearchRules.separatorPattern)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePriceRange(input) {
  const text = normalizeText(input);
  const numbers = (text.match(/\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (!numbers.length) {
    return {
      min: null,
      max: null,
      average: null,
      isValid: false,
    };
  }

  const min = Math.min(...numbers.slice(0, 2));
  const max = numbers.length > 1 ? Math.max(...numbers.slice(0, 2)) : min;

  return {
    min,
    max,
    average: (min + max) / 2,
    isValid: true,
  };
}

export function buildAlibabaSearchQuery(product = {}) {
  const terms = [
    normalizeText(product.name),
    ...splitTerms(product.keywords),
    ...splitTerms(product.category),
  ];
  return unique(terms).slice(0, alibabaPriceSearchRules.maxTerms).join(" ") || "小商品 批发";
}

export function buildAlibabaSearchLinks(product = {}) {
  const query = buildAlibabaSearchQuery(product);
  const encodedQuery = encodeURIComponent(query);

  return alibabaPriceSearchRules.links.map((link) => ({
    platform: link.platform,
    label: link.label,
    url: link.urlTemplate.replace("{query}", encodedQuery),
    purpose: link.purpose,
    sourceType: "search_reference",
  }));
}

function getPricePosition(price, range) {
  if (!Number.isFinite(price) || !range?.isValid) return "unknown";
  if (price > range.max) return "above_market";
  if (price < range.min) return "below_market";
  return "within_market";
}

function getDataCompleteness(range, apiResults) {
  if (range?.isValid && apiResults.length > 0) return "high";
  if (range?.isValid) return "medium";
  return "low";
}

function getRiskWarnings({ sourceType, range, pricePosition }) {
  const warnings = [alibabaPriceRiskMessages.searchCheck];

  if (sourceType !== "api_real") {
    warnings.push(alibabaPriceRiskMessages.noApi);
  }

  if (!range?.isValid) {
    warnings.push(alibabaPriceRiskMessages.noManualPrice);
  }

  if (pricePosition === "above_market") {
    warnings.push(alibabaPriceRiskMessages.aboveMarket);
  }

  if (pricePosition === "below_market") {
    warnings.push(alibabaPriceRiskMessages.belowMarket);
  }

  if (pricePosition === "within_market") {
    warnings.push(alibabaPriceRiskMessages.withinMarket);
  }

  return unique(warnings);
}

function getScoreAdjustment({ pricePosition, range, product }) {
  if (!range?.isValid) return -1;

  const price = toNumber(product.price);
  const cost = toNumber(product.cost);
  const grossMargin = price && cost ? (price - cost) / price : null;

  if (pricePosition === "above_market") return -3;
  if (pricePosition === "below_market") return grossMargin !== null && grossMargin < 0.25 ? -2 : 1;
  if (pricePosition === "within_market") return grossMargin !== null && grossMargin >= 0.35 ? 2 : 1;
  return 0;
}

function normalizeApiResults(apiResponse = {}) {
  return [
    ...(Array.isArray(apiResponse.wholesaleResults) ? apiResponse.wholesaleResults : []),
    ...(Array.isArray(apiResponse.retailResults) ? apiResponse.retailResults : []),
  ];
}

export function evaluatePriceEvidence(product = {}, apiResponse = null) {
  const query = apiResponse?.query || buildAlibabaSearchQuery(product);
  const searchLinks = apiResponse?.searchLinks?.length ? apiResponse.searchLinks : buildAlibabaSearchLinks(product);
  const competitorPriceRange = parsePriceRange(product.competitorPrice || product.marketReference);
  const suggestedPrice = toNumber(product.price);
  const apiResults = normalizeApiResults(apiResponse);
  const sourceType = apiResponse?.sourceType || "api_unavailable";
  const fallback = sourceType !== "api_real";
  const pricePosition = getPricePosition(suggestedPrice, competitorPriceRange);
  const dataCompleteness = getDataCompleteness(competitorPriceRange, apiResults);
  const confidenceScore = clamp(
    20 + (competitorPriceRange.isValid ? 35 : 0) + (apiResults.length ? 30 : 0) + (searchLinks.length ? 10 : 0),
    18,
    sourceType === "api_real" ? 90 : competitorPriceRange.isValid ? 68 : 42
  );
  const riskWarnings = getRiskWarnings({ sourceType, range: competitorPriceRange, pricePosition });
  const scoreAdjustment = clamp(getScoreAdjustment({ pricePosition, range: competitorPriceRange, product }), -5, 5);
  const sourceNotice = apiResponse?.sourceNotice || (
    sourceType === "api_real" ? alibabaPriceNotices.apiReal : alibabaPriceNotices.apiUnavailable
  );

  return {
    platformGroup: "alibaba",
    sourceType,
    sourceTypeLabel: alibabaPriceSourceTypes[sourceType] || alibabaPriceSourceTypes.fallback,
    fallback,
    query,
    competitorPriceRange,
    pricePosition,
    confidenceScore,
    dataCompleteness,
    searchLinks,
    apiResults,
    evidenceSummary: competitorPriceRange.isValid
      ? `已根据用户填写的竞品价格区间 ${competitorPriceRange.min}-${competitorPriceRange.max} 元判断建议售价位置，未配置 API 时不代表真实平台自动价格。`
      : "当前缺少用户填写的竞品价格区间，仅提供 1688 / 淘宝搜索入口和价格风险提示。",
    riskWarnings,
    scoreAdjustment,
    sourceNotice,
  };
}

export function applyPriceEvidenceToResult(result = {}, priceEvidence = null) {
  if (!priceEvidence) return result;

  const scoreAdjustment = clamp(Number(priceEvidence.scoreAdjustment) || 0, -5, 5);
  const nextResult = {
    ...result,
    priceEvidence,
    marketEvidence: {
      ...(result.marketEvidence || {}),
      price: priceEvidence,
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
