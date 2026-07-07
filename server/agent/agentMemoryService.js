import { asArray, asObject, parseNumber, pickNumber, text } from "./agentSchemas.js";

const MAX_HISTORY_RECORDS = 60;
const MAX_SIMILAR_RECORDS = 10;

function unique(items) {
  return [...new Set(asArray(items).map((item) => String(item || "").trim()).filter(Boolean))];
}

function compactText(value, max = 90) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function hasReviewData(review = {}) {
  const source = asObject(review);
  return ["views", "likes", "saves", "collects", "comments", "inquiries", "orders", "cost", "testCost"].some((key) => {
    return String(source[key] ?? "").trim().length > 0;
  });
}

function getRecordProduct(record = {}) {
  return asObject(record.product);
}

function getRecordResult(record = {}) {
  return asObject(record.result);
}

function getRecordReview(record = {}) {
  const source = asObject(record);
  const result = getRecordResult(record);
  return asObject(source.review || result.review);
}

function getRecordName(record = {}) {
  const source = asObject(record);
  const product = getRecordProduct(record);
  const result = getRecordResult(record);
  return compactText(
    source.product_name ||
    result.productIdentity?.displayName ||
    product.name ||
    product.productName ||
    "未命名产品",
    60
  );
}

function getRecordCategory(record = {}) {
  const source = asObject(record);
  const product = getRecordProduct(record);
  const result = getRecordResult(record);
  return compactText(
    source.category ||
    result.productIdentity?.productTypeLabel ||
    result.categoryName ||
    product.category ||
    "",
    40
  );
}

function getRecordPrice(record = {}) {
  const source = asObject(record);
  const product = getRecordProduct(record);
  const result = getRecordResult(record);
  return pickNumber(
    result.effectivePrice?.price,
    result.price,
    product.price,
    product.suggestedPrice,
    product.sellingPrice,
    source.price
  );
}

function getRecordMoq(record = {}) {
  const product = getRecordProduct(record);
  const result = getRecordResult(record);
  return pickNumber(product.moq, product.minimumOrderQuantity, result.moq);
}

function getRecordChannel(record = {}) {
  const product = getRecordProduct(record);
  const result = getRecordResult(record);
  return compactText(product.channel || result.channelFit?.best || result.channel || "", 60);
}

function getRecordStatus(record = {}) {
  const source = asObject(record);
  const result = getRecordResult(record);
  return compactText(result.status || result.level || source.advice || "", 60);
}

function getRecordRisks(record = {}) {
  const result = getRecordResult(record);
  return unique([
    ...asArray(result.risks),
    ...asArray(result.priceEvidence?.riskWarnings),
    ...asArray(result.manualMarketEvidence?.riskWarnings),
    ...asArray(result.douyinEvidence?.riskWarnings),
  ]).slice(0, 8);
}

function getReviewMetrics(review = {}) {
  const source = asObject(review);
  const views = parseNumber(source.views);
  const likes = parseNumber(source.likes);
  const saves = pickNumber(source.saves, source.collects);
  const comments = parseNumber(source.comments);
  const inquiries = parseNumber(source.inquiries);
  const orders = parseNumber(source.orders);
  const cost = pickNumber(source.cost, source.testCost);
  const interactionRate = views ? ((likes + saves + comments) / views) * 100 : parseNumber(source.interactionRate);
  const inquiryRate = views ? (inquiries / views) * 100 : parseNumber(source.inquiryRate);
  const conversionRate = inquiries ? (orders / inquiries) * 100 : parseNumber(source.conversionRate);
  const costPerOrder = orders ? cost / orders : parseNumber(source.costPerOrder);

  return {
    views,
    likes,
    saves,
    comments,
    inquiries,
    orders,
    cost,
    interactionRate: Number(interactionRate.toFixed ? interactionRate.toFixed(2) : interactionRate) || 0,
    inquiryRate: Number(inquiryRate.toFixed ? inquiryRate.toFixed(2) : inquiryRate) || 0,
    conversionRate: Number(conversionRate.toFixed ? conversionRate.toFixed(2) : conversionRate) || 0,
    costPerOrder: Number(costPerOrder.toFixed ? costPerOrder.toFixed(2) : costPerOrder) || 0,
  };
}

function normalizeHistoryRecord(record = {}) {
  const review = getRecordReview(record);
  const reviewMetrics = getReviewMetrics(review);
  return {
    name: getRecordName(record),
    category: getRecordCategory(record),
    price: getRecordPrice(record),
    moq: getRecordMoq(record),
    channel: getRecordChannel(record),
    status: getRecordStatus(record),
    risks: getRecordRisks(record),
    hasReview: hasReviewData(review),
    reviewMetrics,
  };
}

function getCurrentProductInfo(context = {}, args = {}) {
  const product = asObject(context.product);
  const result = asObject(context.result);
  return {
    name: compactText(product.name || result.productIdentity?.displayName || "", 60),
    category: compactText(product.category || result.productIdentity?.productTypeLabel || result.categoryName || "", 40),
    price: pickNumber(product.price, result.effectivePrice?.price, result.price),
    moq: pickNumber(product.moq, result.moq),
    channel: compactText(product.channel || result.channelFit?.best || "", 60),
  };
}

function tokenizeName(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[\s,，、/|｜\-_.]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 8);
}

function isSimilarRecord(record, current) {
  const category = String(record.category || "").trim();
  const currentCategory = String(current.category || "").trim();
  if (category && currentCategory && (category === currentCategory || category.includes(currentCategory) || currentCategory.includes(category))) {
    return true;
  }

  const name = String(record.name || "").trim();
  const currentName = String(current.name || "").trim();
  if (name && currentName && name.length >= 2 && currentName.length >= 2 && (name.includes(currentName) || currentName.includes(name))) {
    return true;
  }

  const tokens = tokenizeName(currentName);
  return tokens.some((token) => name.toLowerCase().includes(token));
}

function countBy(items, getter) {
  const counts = new Map();
  items.forEach((item) => {
    const key = compactText(getter(item), 60);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

function formatPriceRange(records = []) {
  const prices = records.map((record) => record.price).filter((value) => Number.isFinite(value) && value > 0);
  if (!prices.length) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `约 ¥${min.toFixed(2)}`;
  return `¥${min.toFixed(2)} - ¥${max.toFixed(2)}`;
}

function getMoqDistribution(records = []) {
  const buckets = {
    low: 0,
    medium: 0,
    high: 0,
    unknown: 0,
  };

  records.forEach((record) => {
    const moq = Number(record.moq);
    if (!moq) buckets.unknown += 1;
    else if (moq <= 50) buckets.low += 1;
    else if (moq <= 150) buckets.medium += 1;
    else buckets.high += 1;
  });

  return buckets;
}

function getEvidenceLevel(sampleSize, similarRecordCount, hasRelevantReview) {
  if (!sampleSize) return "none";
  if (similarRecordCount >= 6 && hasRelevantReview) return "strong";
  if (similarRecordCount >= 3) return "moderate";
  return "limited";
}

function average(values = []) {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return 0;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2));
}

function buildReviewMetricsSummary(records = []) {
  const withReview = records.filter((record) => record.hasReview);
  return {
    reviewRecordCount: withReview.length,
    averageInteractionRate: average(withReview.map((record) => record.reviewMetrics.interactionRate)),
    averageInquiryRate: average(withReview.map((record) => record.reviewMetrics.inquiryRate)),
    averageConversionRate: average(withReview.map((record) => record.reviewMetrics.conversionRate)),
    averageTestCost: average(withReview.map((record) => record.reviewMetrics.cost)),
    averageCostPerOrder: average(withReview.map((record) => record.reviewMetrics.costPerOrder)),
  };
}

function buildSuccessfulPatterns(records = []) {
  const patterns = [];
  const withReview = records.filter((record) => record.hasReview);
  const converted = withReview.filter((record) => record.reviewMetrics.orders > 0);
  const lowMoq = records.filter((record) => record.moq > 0 && record.moq <= 50);
  const channelCounts = countBy(converted.length ? converted : records, (record) => record.channel).slice(0, 2);

  if (converted.length) {
    patterns.push(`有 ${converted.length} 条历史复盘出现实际成交，可优先参考其价格、渠道和内容反馈。`);
  }
  if (lowMoq.length) {
    patterns.push(`有 ${lowMoq.length} 条历史记录 MOQ 不高于 50，更适合小批量测款节奏。`);
  }
  if (channelCounts.length) {
    patterns.push(`历史中较常见的验证渠道包括：${channelCounts.map((item) => `${item.label}（${item.count}）`).join("、")}。`);
  }

  return patterns.slice(0, 5);
}

function buildRecommendationNotes({ sampleSize, similarRecordCount, evidenceLevel, hasRelevantReview }) {
  const notes = [];
  if (!sampleSize) {
    notes.push("尚无历史产品记录，当前建议只能参考本次报告和人工核验。");
    return notes;
  }

  if (!similarRecordCount) {
    notes.push("未发现同品类或同名相似记录，只能参考更宽泛的历史经验。");
  }

  if (evidenceLevel === "limited" || evidenceLevel === "none") {
    notes.push("当前历史样本量有限，建议仅作为辅助参考。");
  } else if (evidenceLevel === "moderate") {
    notes.push("已有若干相关记录，可辅助判断价格带、MOQ 和渠道，但仍不应直接作为补货依据。");
  } else if (evidenceLevel === "strong") {
    notes.push("相关记录较多且包含复盘数据，可以作为较有价值的参考，但仍需结合本次商品真实测款反馈。");
  }

  if (!hasRelevantReview) {
    notes.push("相似记录中复盘数据不足，成交转化和测款成本结论需要谨慎看待。");
  }

  return notes.slice(0, 5);
}

function safeSimilarRecord(record) {
  const reviewMetrics = record.hasReview
    ? {
        interactionRate: record.reviewMetrics.interactionRate,
        inquiryRate: record.reviewMetrics.inquiryRate,
        conversionRate: record.reviewMetrics.conversionRate,
        costPerOrder: record.reviewMetrics.costPerOrder,
      }
    : null;

  return {
    name: record.name,
    category: record.category,
    price: record.price || null,
    moq: record.moq || null,
    channel: record.channel,
    status: record.status,
    hasReview: record.hasReview,
    reviewMetrics,
  };
}

export function buildAgentHistorySummary(rawInput = {}) {
  const source = asObject(rawInput);
  const records = asArray(source.historyRecords).slice(0, MAX_HISTORY_RECORDS).map(normalizeHistoryRecord);
  const reviewRecordCount = records.filter((record) => record.hasReview).length;
  const categoryCounts = countBy(records, (record) => record.category).slice(0, 6);
  const channelCounts = countBy(records, (record) => record.channel).slice(0, 6);
  const existingSummary = asObject(source.historySummary);

  return {
    ...existingSummary,
    recordCount: records.length,
    reviewRecordCount: Math.max(reviewRecordCount, Number(existingSummary.reviewRecordCount || 0)),
    categoryCounts,
    channelCounts,
    hasCurrentReview: hasReviewData(source.review || source.currentReview),
  };
}

export function buildAgentMemoryContext(rawInput = {}) {
  const source = asObject(rawInput);
  return {
    historyRecords: asArray(source.historyRecords).slice(0, MAX_HISTORY_RECORDS),
    currentReview: asObject(source.review || source.currentReview),
  };
}

export function retrieveUserMemory(args = {}, context = {}) {
  const current = getCurrentProductInfo(context, args);
  const inputRecords = asArray(context.historyRecords);
  const currentReviewAvailable = hasReviewData(context.currentReview);
  const records = inputRecords.slice(0, Math.min(parseNumber(args.limit) || MAX_SIMILAR_RECORDS, MAX_HISTORY_RECORDS)).map(normalizeHistoryRecord);
  const sampleSize = records.length;
  const similarRecords = records.filter((record) => isSimilarRecord(record, current));
  const comparisonRecords = similarRecords.length ? similarRecords : records;
  const hasRelevantReview = comparisonRecords.some((record) => record.hasReview);
  const evidenceLevel = getEvidenceLevel(sampleSize, similarRecords.length, hasRelevantReview);
  const matchedCategories = unique(comparisonRecords.map((record) => record.category)).slice(0, 6);
  const preferredChannels = countBy(comparisonRecords, (record) => record.channel)
    .slice(0, 5)
    .map((item) => `${item.label}（${item.count}）`);
  const commonRisks = countBy(comparisonRecords.flatMap((record) => record.risks).map((risk) => ({ risk })), (item) => item.risk)
    .slice(0, 5)
    .map((item) => `${item.label}（${item.count}）`);
  const reviewMetricsSummary = buildReviewMetricsSummary(comparisonRecords);
  const recommendationNotes = buildRecommendationNotes({
    sampleSize,
    similarRecordCount: similarRecords.length,
    evidenceLevel,
    hasRelevantReview,
  });

  const payload = {
    sampleSize,
    similarRecordCount: similarRecords.length,
    evidenceLevel,
    matchedCategories,
    commonPriceRange: formatPriceRange(comparisonRecords),
    preferredChannels,
    successfulPatterns: buildSuccessfulPatterns(comparisonRecords),
    commonRisks,
    similarRecords: similarRecords.slice(0, MAX_SIMILAR_RECORDS).map(safeSimilarRecord),
    recommendationNotes,
    moqDistribution: getMoqDistribution(comparisonRecords),
    reviewMetricsSummary,
    currentReviewAvailable,
  };

  return {
    ok: true,
    status: "completed",
    missingFields: [],
    summary: sampleSize
      ? `已读取 ${sampleSize} 条历史记录，识别到 ${similarRecords.length} 条相似记录，证据等级为 ${evidenceLevel}。`
      : "尚无可用历史记录，证据等级为 none。",
    observation: payload,
  };
}
