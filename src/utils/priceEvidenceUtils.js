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

  return links
    .filter((link) => link.platform !== "1688")
    .map((link) => ({
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

function isCostOutsideWholesaleRange(cost, wholesaleRange) {
  if (!Number.isFinite(cost) || !wholesaleRange?.isValid) return false;
  return cost > wholesaleRange.max || cost < wholesaleRange.min;
}

function getRiskWarnings({ sourceType, range, wholesaleRange, pricePosition, cost }) {
  const warnings = [];

  if (sourceType !== "api_real") {
    warnings.push(alibabaPriceRiskMessages.noApi);
  }

  if (!range?.isValid) {
    warnings.push(alibabaPriceRiskMessages.noManualPrice);
  }

  if (!wholesaleRange?.isValid) {
    warnings.push(alibabaPriceRiskMessages.noWholesalePrice);
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

  if (isCostOutsideWholesaleRange(cost, wholesaleRange)) {
    warnings.push(alibabaPriceRiskMessages.wholesaleMismatch);
  }

  return unique(warnings).length ? unique(warnings) : [alibabaPriceRiskMessages.noHighRisk];
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

function buildPriceAnalysisConclusions({ safeProduct, competitorPriceRange, wholesalePriceRange, suggestedPrice, cost, pricePosition }) {
  const conclusions = [];

  if (wholesalePriceRange.isValid && Number.isFinite(cost)) {
    if (cost > wholesalePriceRange.max) {
      conclusions.push(`当前填写拿货价 ¥${cost} 高于批发价参考上限 ¥${wholesalePriceRange.max}，拿货优势不足，建议继续核验供应商报价、规格和起订量。`);
    } else if (cost < wholesalePriceRange.min) {
      conclusions.push(`当前填写拿货价 ¥${cost} 低于批发价参考下限 ¥${wholesalePriceRange.min}，价格看起来有优势，但需要核验材质、规格、起订量和供应商可靠性。`);
    } else {
      conclusions.push(`当前拿货价 ¥${cost} 处于用户填写批发价区间 ¥${wholesalePriceRange.min}-${wholesalePriceRange.max} 内，拿货成本有初步参考依据。`);
    }
  } else if (wholesalePriceRange.isValid) {
    conclusions.push(`已补充批发价参考 ¥${wholesalePriceRange.min}-${wholesalePriceRange.max}，但产品拿货价未填写或不可计算，暂不能判断实际拿货优势。`);
  } else {
    conclusions.push("缺少批发价参考，当前只能基于建议售价和竞品零售价做初步判断。");
  }

  if (competitorPriceRange.isValid && Number.isFinite(suggestedPrice)) {
    if (pricePosition === "below_market") {
      conclusions.push(`建议售价 ¥${suggestedPrice} 低于竞品价格区间 ¥${competitorPriceRange.min}-${competitorPriceRange.max}，适合低价测款，但要确认包装、运费、平台佣金后仍有利润空间。`);
    } else if (pricePosition === "within_market") {
      conclusions.push(`建议售价 ¥${suggestedPrice} 处于竞品价格区间 ¥${competitorPriceRange.min}-${competitorPriceRange.max} 内，定价相对稳妥，后续重点看主图、标题和内容差异化。`);
    } else if (pricePosition === "above_market") {
      conclusions.push(`建议售价 ¥${suggestedPrice} 高于竞品价格区间 ¥${competitorPriceRange.min}-${competitorPriceRange.max}，需要明确材质、包装、设计或场景卖点，否则转化压力较大。`);
    }
  } else if (competitorPriceRange.isValid) {
    conclusions.push(`已补充竞品价格区间 ¥${competitorPriceRange.min}-${competitorPriceRange.max}，但建议售价未填写或不可计算，暂不能判断定价位置。`);
  } else {
    conclusions.push("缺少竞品零售价参考，建议补充淘宝/拼多多同款价格区间后再判断定价是否有优势。");
  }

  if (Number.isFinite(cost) && Number.isFinite(suggestedPrice) && suggestedPrice > 0) {
    const grossMargin = (suggestedPrice - cost) / suggestedPrice;
    if (grossMargin >= 0.45) {
      conclusions.push("当前售价相对拿货价毛利空间较充足，但仍建议继续核算包装、运费、平台佣金和退货损耗。");
    } else if (grossMargin >= 0.25) {
      conclusions.push("当前售价相对拿货价仍有一定利润空间，适合先小样测款，再根据实际运费和退货损耗校正售价。");
    } else {
      conclusions.push("当前售价相对拿货价利润空间偏薄，低价测款前需要优先核算平台佣金、运费和售后损耗。");
    }
  } else if (safeProduct.price || safeProduct.cost) {
    conclusions.push("售价或拿货价字段不完整，利润空间需要补齐成本和售价后再复核。");
  }

  return unique(conclusions);
}

function buildPriceNextActions({ competitorPriceRange, wholesalePriceRange, pricePosition, cost, sourceType }) {
  const actions = [];

  if (!competitorPriceRange.isValid) {
    actions.push("补充淘宝/拼多多 2-3 个同款零售价区间，用于判断建议售价是否偏高或偏低。");
  }

  if (!wholesalePriceRange.isValid) {
    actions.push("补充批发价参考，并记录规格、起订量和运费口径，避免只比较裸价。");
  }

  if (pricePosition === "above_market") {
    actions.push("若坚持高于竞品区间定价，需要明确差异化卖点，例如材质、包装、组合套装、赠品或内容场景。");
  }

  if (pricePosition === "below_market") {
    actions.push("低价测款前先核算包装、运费、平台佣金和退货损耗，确认不会越卖越亏。");
  }

  if (isCostOutsideWholesaleRange(cost, wholesalePriceRange)) {
    actions.push("复核供应商报价与用户填写批发价是否对应同规格、同起订量和同包装。");
  }

  if (sourceType !== "api_real") {
    actions.push("打开淘宝搜索参考入口，人工核验同款价格、主图、标题和销量口径。");
  }

  return unique(actions).length ? unique(actions) : ["继续核验同款价格、规格、起订量和运费，确认当前价格判断可复盘。"];
}

export function evaluatePriceEvidence(product = {}, apiResponse = {}) {
  const safeProduct = safeObject(product);
  const safeApiResponse = safeObject(apiResponse);
  const { wholesaleResults, retailResults } = getApiResultGroups(safeApiResponse);
  const apiSearchLinks = Array.isArray(safeApiResponse.searchLinks)
    ? safeApiResponse.searchLinks.filter((link) => link?.platform !== "1688" && !String(link?.label || "").includes("1688"))
    : [];
  const query = safeApiResponse.query || buildAlibabaSearchQuery(safeProduct);
  const searchLinks = apiSearchLinks.length ? apiSearchLinks : buildAlibabaSearchLinks(safeProduct);
  const competitorPriceRange = parsePriceRange(safeProduct.retailPriceReference || safeProduct.competitorPrice || safeProduct.marketReference);
  const wholesalePriceRange = parsePriceRange(safeProduct.wholesalePriceReference);
  const suggestedPrice = toNumber(safeProduct.price);
  const cost = toNumber(safeProduct.cost);
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
  const riskWarnings = getRiskWarnings({ sourceType, range: competitorPriceRange, wholesaleRange: wholesalePriceRange, pricePosition, cost });
  const scoreAdjustment = clamp(getScoreAdjustment({ pricePosition, range: competitorPriceRange, product: safeProduct }), -5, 5);
  const sourceNotice = safeApiResponse.sourceNotice || (
    sourceType === "api_real" ? alibabaPriceNotices.apiReal : alibabaPriceNotices.apiUnavailable
  );
  const analysisConclusions = buildPriceAnalysisConclusions({
    safeProduct,
    competitorPriceRange,
    wholesalePriceRange,
    suggestedPrice,
    cost,
    pricePosition,
  });
  const nextActions = buildPriceNextActions({
    competitorPriceRange,
    wholesalePriceRange,
    pricePosition,
    cost,
    sourceType,
  });

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
    evidenceScore: confidenceScore,
    dataCompleteness,
    wholesaleResults,
    retailResults,
    searchLinks,
    apiResults,
    evidenceSummary: analysisConclusions[0] || "当前价格证据不足，建议补充竞品售价、批发价和同款链接后再判断。",
    analysisConclusions,
    riskWarnings,
    nextActions,
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
