// supplyChainInsightEngine.js
// 供应链行情数据分析（用户手动填写，无爬虫、无平台抓取）。
// 仅基于用户输入与内置规则给出可解释的供应链风险提示。

function toNumber(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toBool(value) {
  if (value === true) return true;
  if (value === false) return false;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "是", "支持", "可以", "可"].includes(text)) return true;
  if (["false", "0", "no", "n", "否", "不支持", "不可以", "不"].includes(text)) return false;
  return null;
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

const STABILITY_TEXT = { low: "低", medium: "中", high: "高" };
const PRICE_TEXT = { weak: "偏弱", normal: "一般", good: "较好" };
const RISK_TEXT = { low: "低", medium: "中", high: "偏高" };

export function getStabilityText(level) {
  return STABILITY_TEXT[level] || "中";
}
export function getPriceAdvantageText(level) {
  return PRICE_TEXT[level] || "一般";
}
export function getMoqRiskText(level) {
  return RISK_TEXT[level] || "中";
}

export function analyzeSupplyChainInsight(input = {}) {
  const source = input && typeof input === "object" ? input : {};

  const supplierCount = toNumber(source.supplierCount);
  const minWholesalePrice = toNumber(source.minWholesalePrice);
  const maxWholesalePrice = toNumber(source.maxWholesalePrice);
  const commonMoq = toNumber(source.commonMoq);
  const supportsDropshipping = toBool(source.supportsDropshipping);
  const supportsSmallBatchTrial = toBool(source.supportsSmallBatchTrial);
  const shippingLocation = text(source.shippingLocation);
  const samplePrice = toNumber(source.samplePrice);
  const bulkPrice = toNumber(source.bulkPrice);
  const shippingFee = toNumber(source.shippingFee);
  const leadTimeDays = toNumber(source.leadTimeDays);
  const supplierStabilityNote = text(source.supplierStabilityNote);

  const keyRisks = [];
  const nextQuestions = [];

  // 1) 供应商数量 → 稳定度
  let supplyChainStability = "medium";
  if (supplierCount == null) {
    supplyChainStability = "low";
    nextQuestions.push("同类供应商大概有多少家？供应链选择是否充足？");
  } else if (supplierCount <= 3) {
    supplyChainStability = "low";
    keyRisks.push("同类供应商较少（≤3 家），供应链选择有限，断货或涨价时较被动。");
  } else if (supplierCount <= 20) {
    supplyChainStability = "medium";
  } else {
    supplyChainStability = "high";
    keyRisks.push("供应商较多（>20 家），选择充足，但需注意同质化竞争和质量参差。");
  }

  // 2) 价格优势（以大货价为准，缺失则用样品价）
  let priceAdvantage = "normal";
  const currentCost = bulkPrice != null ? bulkPrice : samplePrice;
  const hasRange = minWholesalePrice != null && maxWholesalePrice != null && maxWholesalePrice >= minWholesalePrice;
  if (hasRange && currentCost != null) {
    const median = (minWholesalePrice + maxWholesalePrice) / 2;
    if (currentCost <= minWholesalePrice * 1.1) {
      priceAdvantage = "good";
    } else if (currentCost > median * 1.15) {
      priceAdvantage = "weak";
      keyRisks.push("当前拿货价高于价格区间中位数较多，价格优势偏弱，利润空间承压。");
    } else {
      priceAdvantage = "normal";
    }
  } else {
    priceAdvantage = "normal";
    nextQuestions.push("最低拿货价和最高拿货价分别是多少？以便判断价格优势。");
  }

  // 3) MOQ 风险
  let moqRisk = "medium";
  if (commonMoq == null) {
    moqRisk = "medium";
    nextQuestions.push("常见 MOQ（起订量）是多少？");
  } else if (commonMoq <= 20) {
    moqRisk = "low";
  } else if (commonMoq <= 100) {
    moqRisk = "medium";
  } else {
    moqRisk = "high";
    keyRisks.push("常见 MOQ 偏高（>100 件），首批压货资金和滞销风险较大。");
  }
  // 不支持小批量试单且 MOQ 偏高 → 高风险
  if (supportsSmallBatchTrial === false && commonMoq != null && commonMoq > 100) {
    moqRisk = "high";
    keyRisks.push("不支持小批量试单且 MOQ 偏高，建议谨慎评估首批资金。");
  }

  // 4) 一件代发
  if (supportsDropshipping === true) {
    keyRisks.push("支持一件代发，可降低压货风险，但单件利润通常更低，需核算实际毛利。");
  } else if (supportsDropshipping === false) {
    keyRisks.push("不支持一件代发，需要关注 MOQ 和首批进货资金。");
    nextQuestions.push("是否可协商一件代发或小批量备货？");
  }

  // 5) 小批量试单
  let trialOrderSuggestion;
  if (supportsSmallBatchTrial === true) {
    trialOrderSuggestion = "供应商支持小批量试单，建议优先用 20–50 件做小批量验证，再决定是否大货。";
  } else if (supportsSmallBatchTrial === false) {
    trialOrderSuggestion = "供应商暂不支持小批量试单，建议先询问能否拿样，不要直接下大货。";
    nextQuestions.push("是否支持 20–50 件小批量试单或先拿样？");
  } else {
    trialOrderSuggestion = "建议先询问是否支持 20–50 件小批量试单，并确认样品价与大货价。";
    nextQuestions.push("是否支持 20–50 件小批量试单？");
  }

  if (leadTimeDays == null) nextQuestions.push("发货周期大概多少天？");
  if (samplePrice == null || bulkPrice == null) nextQuestions.push("样品价和大货价分别是多少？");
  if (shippingFee == null) nextQuestions.push("运费如何计算？是否包邮或按件计费？");
  if (!shippingLocation) nextQuestions.push("发货地在哪里？是否影响时效和运费？");
  if (supplierStabilityNote) {
    keyRisks.push(`供应商稳定性备注：${supplierStabilityNote}`);
  }

  // 证据等级：按已填写的核心字段数量
  const coreProvided = [
    supplierCount != null,
    hasRange,
    commonMoq != null,
    supportsSmallBatchTrial != null,
    bulkPrice != null || samplePrice != null,
  ].filter(Boolean).length;
  let evidenceLevel = "low";
  if (coreProvided >= 4) evidenceLevel = "high";
  else if (coreProvided >= 2) evidenceLevel = "medium";

  const summary = `供应链稳定度：${getStabilityText(supplyChainStability)}；价格优势：${getPriceAdvantageText(priceAdvantage)}；MOQ 风险：${getMoqRiskText(moqRisk)}。${trialOrderSuggestion}`;

  return {
    supplyChainStability,
    priceAdvantage,
    moqRisk,
    trialOrderSuggestion,
    keyRisks,
    nextQuestions: [...new Set(nextQuestions)],
    summary,
    evidenceLevel,
  };
}

// 判断是否有任何供应链行情输入（用于数据来源状态）。
export function hasSupplyChainInput(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return [
    "supplierCount",
    "minWholesalePrice",
    "maxWholesalePrice",
    "commonMoq",
    "shippingLocation",
    "samplePrice",
    "bulkPrice",
    "shippingFee",
    "leadTimeDays",
    "supplierStabilityNote",
  ].some((key) => String(source[key] ?? "").trim() !== "") ||
    boolFieldFilled(source.supportsDropshipping) ||
    boolFieldFilled(source.supportsSmallBatchTrial);
}

// 布尔字段是否有效填写（“不确定 / unknown / 空”不算已填写）。
function boolFieldFilled(value) {
  const s = String(value ?? "").trim().toLowerCase();
  return s !== "" && s !== "unknown" && s !== "不确定";
}

// 表单填写示例数据（仅用于演示，正式使用请替换为真实询价 / 市场观察结果）。
export const SUPPLY_CHAIN_SAMPLE = {
  supplierCount: "12",
  minWholesalePrice: "6.8",
  maxWholesalePrice: "12.5",
  commonMoq: "100",
  supportsDropshipping: "unknown",
  supportsSmallBatchTrial: "yes",
  shippingLocation: "义乌",
  samplePrice: "15",
  bulkPrice: "8.5",
  shippingFee: "8",
  leadTimeDays: "3",
  supplierStabilityNote: "同类供应商较多，支持小批量试单，但需要确认样品和大货是否一致。",
};

const CORE_SUPPLY_CHAIN_FIELDS = [
  "supplierCount",
  "minWholesalePrice",
  "maxWholesalePrice",
  "commonMoq",
];

// 输入完成度：pending（未填写）/ partial（已填写部分）/ used（核心字段已完成）。
export function getSupplyChainInputStatus(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  if (!hasSupplyChainInput(source)) return "pending";
  const hasCore = CORE_SUPPLY_CHAIN_FIELDS.every(
    (key) => String(source[key] ?? "").trim() !== ""
  );
  return hasCore ? "used" : "partial";
}

// 输入校验：负数为错误（建议阻止保存）；区间 / MOQ / 大货价异常为提示（不阻止保存）。
export function validateSupplyChainInput(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const errors = [];
  const warnings = [];

  const numericFields = [
    ["supplierCount", "同类供应商数量"],
    ["minWholesalePrice", "最低拿货价"],
    ["maxWholesalePrice", "最高拿货价"],
    ["commonMoq", "常见 MOQ"],
    ["samplePrice", "样品价"],
    ["bulkPrice", "大货价"],
    ["shippingFee", "运费"],
    ["leadTimeDays", "发货周期"],
  ];

  const num = (key) => {
    const raw = source[key];
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  numericFields.forEach(([key, label]) => {
    const value = num(key);
    if (value != null && value < 0) errors.push(`${label}不能为负数。`);
  });

  const min = num("minWholesalePrice");
  const max = num("maxWholesalePrice");
  const moq = num("commonMoq");
  const bulk = num("bulkPrice");

  if (min != null && max != null && min > max) {
    warnings.push("最低拿货价大于最高拿货价，请确认是否填写准确。");
  }
  if (moq != null && moq > 100) {
    warnings.push("MOQ 偏高，建议谨慎拿样，优先确认是否支持 20–50 件小批量试单。");
  }
  if (bulk != null && max != null && bulk > max) {
    warnings.push("当前大货价高于你填写的最高拿货价，请确认是否填写准确。");
  }

  return { errors, warnings, valid: errors.length === 0 };
}
