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
  return [...new Set((Array.isArray(items) ? items : []).filter(Boolean))];
}

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
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

  const links = Array.isArray(alibabaPriceSearchRules.links) ? alibabaPriceSearchRules.links : [];

  return links.map((link) => ({
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

function getDataCompleteness(retailRange, wholesaleRange, apiResults) {
  if (!retailRange?.isValid) return "low";
  if (retailRange?.isValid && wholesaleRange?.isValid && apiResults.length > 0) return "high";
  if (retailRange?.isValid && wholesaleRange?.isValid) return "high";
  return "medium";
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

function getApiResultGroups(apiResponse = {}) {
  const safeApiResponse = safeObject(apiResponse);
  const wholesaleResults = Array.isArray(safeApiResponse.wholesaleResults) ? safeApiResponse.wholesaleResults : [];
  const retailResults = Array.isArray(safeApiResponse.retailResults) ? safeApiResponse.retailResults : [];

  return {
    wholesaleResults,
    retailResults,
  };
}

function normalizeApiResults(apiResponse = {}) {
  const { wholesaleResults, retailResults } = getApiResultGroups(apiResponse);

  return [
    ...wholesaleResults,
    ...retailResults,
  ];
}

export function evaluatePriceEvidence(product = {}, apiResponse = {}) {
  const safeProduct = safeObject(product);
  const safeApiResponse = safeObject(apiResponse);
  const { wholesaleResults, retailResults } = getApiResultGroups(safeApiResponse);
  const apiSearchLinks = Array.isArray(safeApiResponse.searchLinks) ? safeApiResponse.searchLinks : [];
  const query = safeApiResponse.query || buildAlibabaSearchQuery(safeProduct);
  const searchLinks = apiSearchLinks.length ? apiSearchLinks : buildAlibabaSearchLinks(safeProduct);
  const competitorPriceRange = parsePriceRange(safeProduct.retailPriceReference || safeProduct.competitorPrice || safeProduct.marketReference);
  const wholesalePriceRange = parsePriceRange(safeProduct.wholesalePriceReference || safeProduct.cost);
  const suggestedPrice = toNumber(safeProduct.price);
  const apiResults = normalizeApiResults(safeApiResponse);
  const sourceType = safeApiResponse.sourceType || "api_unavailable";
  const fallback = sourceType !== "api_real";
  const pricePosition = getPricePosition(suggestedPrice, competitorPriceRange);
  const dataCompleteness = getDataCompleteness(competitorPriceRange, wholesalePriceRange, apiResults);
  const confidenceScore = clamp(
    20 + (competitorPriceRange.isValid ? 30 : 0) + (wholesalePriceRange.isValid ? 15 : 0) + (apiResults.length ? 30 : 0) + (searchLinks.length ? 10 : 0),
    18,
    sourceType === "api_real" ? 90 : competitorPriceRange.isValid || wholesalePriceRange.isValid ? 76 : 42
  );
  const riskWarnings = getRiskWarnings({ sourceType, range: competitorPriceRange, pricePosition });
  const scoreAdjustment = clamp(getScoreAdjustment({ pricePosition, range: competitorPriceRange, product: safeProduct }), -5, 5);
  const sourceNotice = safeApiResponse.sourceNotice || (
    sourceType === "api_real" ? alibabaPriceNotices.apiReal : alibabaPriceNotices.apiUnavailable
  );

  return {
    platformGroup: "alibaba",
    sourceType,
    sourceTypeLabel: alibabaPriceSourceTypes[sourceType] || alibabaPriceSourceTypes.fallback,
    fallback,
    query,
    competitorPriceRange,
    wholesalePriceRange,
    pricePosition,
    confidenceScore,
    dataCompleteness,
    wholesaleResults,
    retailResults,
    searchLinks,
    apiResults,
    evidenceSummary: competitorPriceRange.isValid
      ? `已根据用户填写的零售价/竞品价格区间 ${competitorPriceRange.min}-${competitorPriceRange.max} 元判断建议售价位置${wholesalePriceRange.isValid ? `，并参考批发价区间 ${wholesalePriceRange.min}-${wholesalePriceRange.max} 元` : ""}。未配置 API 时不代表真实平台自动价格。`
      : "当前缺少用户填写的竞品价格区间，仅提供 1688 / 淘宝搜索入口和价格风险提示。",
    riskWarnings,
    scoreAdjustment,
    sourceNotice,
  };
}

export function applyPriceEvidenceToResult(result = {}, priceEvidence = {}) {
  const safeResult = safeObject(result);
  const safePriceEvidence = safeObject(priceEvidence);

  if (!Object.keys(safePriceEvidence).length) return safeResult;

  const scoreAdjustment = clamp(Number(safePriceEvidence.scoreAdjustment) || 0, -5, 5);
  const nextResult = {
    ...safeResult,
    priceEvidence: safePriceEvidence,
    marketEvidence: {
      ...safeObject(safeResult.marketEvidence),
      price: safePriceEvidence,
    },
  };

  if (Number.isFinite(Number(safeResult.totalScore))) {
    nextResult.totalScore = clamp(Math.round(Number(safeResult.totalScore) + scoreAdjustment), 0, 100);
  }

  if (Number.isFinite(Number(safeResult.score))) {
    nextResult.score = clamp(Math.round(Number(safeResult.score) + scoreAdjustment), 0, 100);
  }

  return nextResult;
}
