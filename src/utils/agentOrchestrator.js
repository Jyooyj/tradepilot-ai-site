const requiredProductFields = [
  { label: "商品名称", keys: ["name"], type: "text" },
  { label: "产品类型", keys: ["category"], type: "text" },
  { label: "拿货价", keys: ["cost", "purchasePrice", "sourcePrice", "wholesalePrice"], type: "number" },
  { label: "建议售价", keys: ["price", "suggestedPrice", "sellingPrice", "recommendedPrice"], type: "number" },
  { label: "MOQ", keys: ["moq", "minimumOrderQuantity"], type: "number" },
  { label: "目标人群", keys: ["audience", "targetAudience"], type: "text" },
  { label: "销售渠道", keys: ["channel", "salesChannel"], type: "text" },
];

const stageConfig = {
  collecting: {
    stageLabel: "信息采集阶段",
    recommendedAction: "补充关键信息后生成进货决策报告",
    nextActions: ["补充拿货价", "补充建议售价", "补充 MOQ", "补充目标人群", "补充销售渠道"],
  },
  analyzing: {
    stageLabel: "等待生成报告",
    recommendedAction: "生成进货决策报告",
    nextActions: ["生成进货报告", "补充竞品价格", "补充内容热度观察"],
  },
  report_ready: {
    stageLabel: "报告已生成",
    recommendedAction: "保存到产品库，并先小批量测款",
    nextActions: ["保存到产品库", "下载 HTML 报告", "导出 PDF 报告", "先小批量测款", "补充市场证据"],
  },
  saved: {
    stageLabel: "产品库沉淀阶段",
    recommendedAction: "继续补充候选产品，准备进入候选产品 PK",
    nextActions: ["查看产品库", "继续补充候选产品", "进入候选产品 PK"],
  },
  pk_ready: {
    stageLabel: "候选产品 PK 阶段",
    recommendedAction: "进入候选产品 PK，选择优先拿样产品",
    nextActions: ["进入候选产品 PK", "对比利润空间", "对比风险等级", "对比内容测款价值", "选择优先拿样产品"],
  },
  review_ready: {
    stageLabel: "测款复盘阶段",
    recommendedAction: "查看测款复盘，判断是否补货",
    nextActions: ["查看测款复盘", "判断是否补货", "调整内容策略", "继续小批量验证"],
  },
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function hasFieldValue(product, field) {
  return field.keys.some((key) => {
    const value = product?.[key];
    if (field.type === "number") return parseNumber(value) > 0;
    return String(value ?? "").trim().length > 0;
  });
}

function getMissingFields(product) {
  return requiredProductFields
    .filter((field) => !hasFieldValue(product, field))
    .map((field) => field.label);
}

function hasObjectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function hasResultData(result) {
  return hasObjectValue(result) && Object.keys(result).length > 0;
}

function hasReviewData(review) {
  if (!hasObjectValue(review)) return false;
  const candidate = hasObjectValue(review.review) ? review.review : review;
  return ["views", "likes", "saves", "comments", "inquiries", "orders", "cost"].some((key) => {
    return String(candidate?.[key] ?? "").trim().length > 0;
  });
}

function hasSavedCurrentProduct(product, records) {
  const name = String(product?.name || "").trim();
  if (!name) return false;

  return records.some((record) => {
    const recordName = String(record?.product?.name || record?.product_name || "").trim();
    return recordName && recordName === name;
  });
}

function unique(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function getMarketEvidenceCompleteness(product, result) {
  const marketEvidence = result?.marketEvidence || {};
  const hasPriceEvidence = Boolean(result?.priceEvidence || marketEvidence.price);
  const hasDouyinEvidence = Boolean(result?.douyinEvidence || marketEvidence.douyin);
  const hasManualEvidence = Boolean(result?.manualMarketEvidence || marketEvidence.manual);
  const hasManualProductEvidence = [
    product?.competitorPrice,
    product?.wholesalePriceReference,
    product?.retailPriceReference,
    product?.contentHeatReference,
    product?.marketReferenceLinks,
    product?.manualMarketNote,
  ].some((value) => String(value ?? "").trim());

  return hasPriceEvidence || hasDouyinEvidence || hasManualEvidence || hasManualProductEvidence;
}

function getRiskFocus({ product, result, imageQuality, recognitionStatus }) {
  const risks = [];
  const resultRisks = toArray(result?.risks).slice(0, 3);
  const priceWarnings = toArray(result?.priceEvidence?.riskWarnings || result?.marketEvidence?.price?.riskWarnings).slice(0, 2);
  const douyinWarnings = toArray(result?.douyinEvidence?.riskWarnings || result?.marketEvidence?.douyin?.riskWarnings).slice(0, 2);
  const manualWarnings = toArray(result?.manualMarketEvidence?.riskWarnings || result?.marketEvidence?.manual?.riskWarnings).slice(0, 2);
  risks.push(...resultRisks, ...priceWarnings, ...douyinWarnings, ...manualWarnings);

  const margin = Number(result?.margin);
  const price = parseNumber(product?.price || result?.effectivePrice?.price);
  const cost = parseNumber(product?.cost || result?.unitCost || result?.effectivePrice?.cost);
  const computedMargin = price > 0 && cost > 0 ? (price - cost) / price : 0;
  const marginValue = Number.isFinite(margin) ? margin : computedMargin;

  if (marginValue > 0 && marginValue < 0.25) {
    risks.push("利润空间偏薄，测款前需要复核包装、运费、平台佣金和售后损耗。");
  }

  const moq = parseNumber(product?.moq);
  if (moq >= 300) {
    risks.push("MOQ 较高，直接大批量下单会放大压货风险。");
  } else if (moq >= 150) {
    risks.push("MOQ 中等偏高，建议争取混批、分批拿货或先拿样验证。");
  }

  if (hasResultData(result) && !getMarketEvidenceCompleteness(product, result)) {
    risks.push("市场证据仍偏少，建议补充竞品价格、内容热度或人工调研记录。");
  }

  if (imageQuality?.level === "warning" || imageQuality?.level === "error") {
    risks.push("图片质量可能影响识别稳定性和内容测款判断。");
  }

  if (recognitionStatus?.level === "warning" || recognitionStatus?.level === "error") {
    risks.push("图片识别结果需要人工复核，避免商品类型或关键属性偏差。");
  }

  return unique(risks).slice(0, 5);
}

function getStage({ product, result, records, reviewRecords, missingFields }) {
  const hasResult = hasResultData(result);
  const hasSavedProduct = hasSavedCurrentProduct(product, records) || records.length > 0;
  const hasReview = reviewRecords.some(hasReviewData) || records.some((record) => hasReviewData(record?.review));

  if (hasReview) return "review_ready";
  if (records.length >= 2) return "pk_ready";
  if (hasSavedProduct) return "saved";
  if (hasResult) return "report_ready";
  if (missingFields.length > 0) return "collecting";
  return "analyzing";
}

function getStatusText(stage, { missingFields, records, reviewRecords, result }) {
  const scoreText = Number.isFinite(Number(result?.totalScore)) ? `当前报告评分 ${result.totalScore}/100。` : "";

  const statusTextMap = {
    collecting: `还缺少 ${missingFields.length} 项关键信息，Agent 暂不建议直接进入进货判断。`,
    analyzing: "商品关键信息已基本齐全，下一步可以生成正式进货决策报告。",
    report_ready: `进货报告已形成，Agent 建议把结论沉淀到产品库并进入小批量验证。${scoreText}`,
    saved: `产品库已有 ${records.length} 条记录，可以继续沉淀候选品并准备横向对比。`,
    pk_ready: `产品库已有 ${records.length} 个候选产品，已具备进入候选产品 PK 的条件。`,
    review_ready: `已检测到测款复盘数据或历史复盘记录，可以进入补货、优化或停测判断。${reviewRecords.length ? `复盘记录 ${reviewRecords.length} 条。` : ""}`,
  };

  return statusTextMap[stage] || "Agent 正在根据当前上下文判断下一步。";
}

function getConfidenceLevel({ missingFields, result, records, reviewRecords, imageQuality, recognitionStatus }) {
  if (
    missingFields.length >= 3 ||
    imageQuality?.level === "error" ||
    recognitionStatus?.level === "error"
  ) {
    return "low";
  }

  if (
    hasResultData(result) &&
    missingFields.length === 0 &&
    (records.length > 0 || reviewRecords.some(hasReviewData) || getMarketEvidenceCompleteness({}, result))
  ) {
    return "high";
  }

  return "medium";
}

export function getAgentState({
  product,
  result,
  records,
  reviewRecords,
  imageQuality,
  recognitionStatus,
} = {}) {
  const safeProduct = hasObjectValue(product) ? product : {};
  const safeRecords = toArray(records);
  const safeReviewRecords = toArray(reviewRecords);
  const missingFields = getMissingFields(safeProduct);
  const stage = getStage({
    product: safeProduct,
    result,
    records: safeRecords,
    reviewRecords: safeReviewRecords,
    missingFields,
  });
  const config = stageConfig[stage] || stageConfig.collecting;
  const riskFocus = getRiskFocus({
    product: safeProduct,
    result,
    imageQuality,
    recognitionStatus,
  });

  return {
    stage,
    stageLabel: config.stageLabel,
    statusText: getStatusText(stage, {
      missingFields,
      records: safeRecords,
      reviewRecords: safeReviewRecords,
      result,
    }),
    missingFields,
    riskFocus,
    nextActions: config.nextActions,
    recommendedAction: config.recommendedAction,
    confidenceLevel: getConfidenceLevel({
      missingFields,
      result,
      records: safeRecords,
      reviewRecords: safeReviewRecords,
      imageQuality,
      recognitionStatus,
    }),
  };
}
