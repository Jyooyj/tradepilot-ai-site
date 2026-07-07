import { assertAllowedTool } from "./agentGuardrails.js";
import { retrieveUserMemory } from "./agentMemoryService.js";
import { generateContentTestPlan, generateSupplierChecklist } from "./agentSupplierContentService.js";
import { asArray, asObject, parseNumber, pickNumber, text } from "./agentSchemas.js";

const TOOL_LABELS = {
  calculate_profit: "利润测算",
  assess_purchase_risk: "风险判断",
  inspect_market_evidence: "市场证据检查",
  retrieve_user_memory: "历史记忆检索",
  generate_supplier_checklist: "供应商沟通清单",
  generate_content_test_plan: "内容测款计划",
};

function formatPercent(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return "";
  return `${Math.round(Number(value) * 100)}%`;
}

function money(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return "";
  return `¥${Number(value).toFixed(2)}`;
}

function unique(items) {
  return [...new Set(asArray(items).map((item) => String(item || "").trim()).filter(Boolean))];
}

function firstFilled(...values) {
  return values.find((value) => String(value ?? "").trim()) ?? "";
}

function getMarketEvidence(context) {
  const result = asObject(context.result);
  const marketEvidence = asObject(context.marketEvidence);
  const nestedMarket = asObject(result.marketEvidence);

  return {
    priceEvidence: marketEvidence.priceEvidence || marketEvidence.price || result.priceEvidence || nestedMarket.price || null,
    manualMarketEvidence: marketEvidence.manualMarketEvidence || marketEvidence.manual || result.manualMarketEvidence || nestedMarket.manual || null,
    douyinEvidence: marketEvidence.douyinEvidence || marketEvidence.douyin || result.douyinEvidence || nestedMarket.douyin || null,
  };
}

function calculateProfit(_args, context) {
  const product = asObject(context.product);
  const result = asObject(context.result);
  const effectivePrice = asObject(result.effectivePrice);

  const price = pickNumber(
    result.price,
    result.suggestedPrice,
    effectivePrice.price,
    product.price,
    product.suggestedPrice,
    product.sellingPrice,
    product.recommendedPrice
  );
  const cost = pickNumber(
    result.unitCost,
    effectivePrice.cost,
    product.cost,
    product.purchasePrice,
    product.sourcePrice,
    product.wholesalePrice
  );
  const moq = pickNumber(result.moq, product.moq, product.minimumOrderQuantity);
  const canonicalProfit = parseNumber(result.profit);
  const profit = canonicalProfit > 0 ? canonicalProfit : price > 0 && cost > 0 ? price - cost : 0;
  const canonicalMargin = Number(result.margin);
  const margin = Number.isFinite(canonicalMargin) && canonicalMargin > 0
    ? canonicalMargin
    : price > 0 && cost > 0
      ? (price - cost) / price
      : 0;
  const canonicalStockCost = parseNumber(result.stockCost);
  const stockCost = canonicalStockCost > 0 ? canonicalStockCost : cost > 0 && moq > 0 ? cost * moq : 0;
  const missingFields = [];

  if (!price) missingFields.push("price");
  if (!cost) missingFields.push("cost");
  if (!moq) missingFields.push("moq");

  return {
    ok: true,
    status: missingFields.length ? "needs_input" : "completed",
    missingFields,
    summary: missingFields.length
      ? "利润测算需要补齐售价、成本或 MOQ，暂不推断首批压货资金。"
      : `单件利润约 ${money(profit) || "待补充"}，毛利率约 ${formatPercent(margin) || "待补充"}，首批压货资金约 ${money(stockCost) || "待补充"}。`,
    observation: {
      price,
      cost,
      moq,
      unitProfit: profit || null,
      grossMargin: margin || null,
      grossMarginText: formatPercent(margin),
      stockCost: stockCost || null,
      source: "canonical_product_result",
      note: "只读取前端传入的 canonical product/result 字段，不重算综合评分。",
    },
  };
}

function assessPurchaseRisk(_args, context) {
  const product = asObject(context.product);
  const result = asObject(context.result);
  const market = getMarketEvidence(context);
  const moq = pickNumber(product.moq, result.moq);
  const resultRisks = unique(result.risks).slice(0, 4);
  const evidenceRiskWarnings = unique([
    ...asArray(asObject(market.priceEvidence).riskWarnings),
    ...asArray(asObject(market.manualMarketEvidence).riskWarnings),
    ...asArray(asObject(market.douyinEvidence).riskWarnings),
  ]).slice(0, 4);
  const risks = unique([
    ...resultRisks,
    ...evidenceRiskWarnings,
    !moq ? "缺少 MOQ，无法判断首批压货风险。" : "",
    moq >= 300 ? "MOQ 较高，直接进货会放大库存压力。" : "",
    !firstFilled(product.competitorPrice, product.retailPriceReference) ? "缺少竞品价格或零售价格参考。" : "",
    !firstFilled(product.logistics, result.logistics) ? "物流、包装或破损信息仍需人工确认。" : "",
  ]).slice(0, 6);
  const missingFields = [];

  if (!moq) missingFields.push("moq");
  if (!firstFilled(product.competitorPrice, product.retailPriceReference)) missingFields.push("competitorPrice");

  return {
    ok: true,
    status: missingFields.includes("moq") ? "needs_input" : "completed",
    missingFields,
    summary: risks.length
      ? `当前主要风险：${risks.slice(0, 3).join("；")}`
      : "当前未发现新增高风险，但仍建议先拿样并人工核实供应商条件。",
    observation: {
      moq: moq || null,
      currentStatus: result.status || "",
      decisionLevel: result.level || "",
      riskCount: risks.length,
      risks,
      source: "canonical_product_result",
      note: "只汇总既有风险字段和用户填写信息，不修改任何记录。",
    },
  };
}

function evidenceFilledCount(evidence) {
  return [
    evidence.wholesalePriceReference,
    evidence.retailPriceReference,
    evidence.contentHeatReference,
    evidence.marketReferenceLinks,
    evidence.manualMarketNote,
    evidence.competitorDensity,
    evidence.contentHomogeneity,
  ].filter((value) => String(value ?? "").trim() && !/未观察|unknown/i.test(String(value))).length;
}

function inspectMarketEvidence(_args, context) {
  const product = asObject(context.product);
  const market = getMarketEvidence(context);
  const manual = asObject(market.manualMarketEvidence);
  const manualEvidence = asObject(manual.evidence);
  const priceEvidence = asObject(market.priceEvidence);
  const douyinEvidence = asObject(market.douyinEvidence);
  const evidence = {
    wholesalePriceReference: firstFilled(product.wholesalePriceReference, manualEvidence.wholesalePriceReference),
    retailPriceReference: firstFilled(product.retailPriceReference, product.competitorPrice, manualEvidence.retailPriceReference),
    contentHeatReference: firstFilled(product.contentHeatReference, manualEvidence.contentHeatReference),
    marketReferenceLinks: firstFilled(product.marketReferenceLinks, manualEvidence.marketReferenceLinks),
    manualMarketNote: firstFilled(product.manualMarketNote, manualEvidence.manualMarketNote),
    competitorDensity: firstFilled(product.competitorDensity, manualEvidence.competitorDensity),
    contentHomogeneity: firstFilled(product.contentHomogeneity, manualEvidence.contentHomogeneity),
  };
  const filledCount = evidenceFilledCount(evidence);
  const missingFields = [];

  if (!evidence.wholesalePriceReference) missingFields.push("wholesalePriceReference");
  if (!evidence.retailPriceReference) missingFields.push("competitorPrice");
  if (!evidence.contentHeatReference) missingFields.push("contentHeatReference");

  const completeness = filledCount >= 5 ? "high" : filledCount >= 2 ? "medium" : "low";
  const searchReferences = unique([
    ...asArray(priceEvidence.searchLinks).map((link) => link?.label || link?.platform),
    ...asArray(douyinEvidence.searchLinks).map((link) => link?.label || link?.platform),
  ]).slice(0, 4);
  const manualVerificationActions = unique([
    missingFields.includes("competitorPrice") ? "补充 2-3 个同类零售价格或竞品价格区间。" : "",
    missingFields.includes("wholesalePriceReference") ? "补充批发价、起订量和规格口径。" : "",
    missingFields.includes("contentHeatReference") ? "人工记录内容热度、询单或评论观察，不要把观察当成平台真实预测。" : "",
    "人工核实搜索参考入口，不自动访问外部平台。",
  ]);

  return {
    ok: true,
    status: "completed",
    missingFields,
    summary: `市场证据完整度为 ${completeness}，已填写 ${filledCount} 类证据。`,
    observation: {
      completeness,
      filledCount,
      missingFields,
      searchReferences,
      manualVerificationActions,
      source: "user_input_and_existing_search_reference",
      note: "不访问外部平台，不生成或夸大价格、销量、播放量、点赞或热度数据。",
    },
  };
}

const EXECUTORS = {
  calculate_profit: calculateProfit,
  assess_purchase_risk: assessPurchaseRisk,
  inspect_market_evidence: inspectMarketEvidence,
  retrieve_user_memory: retrieveUserMemory,
  generate_supplier_checklist: generateSupplierChecklist,
  generate_content_test_plan: generateContentTestPlan,
};

export const agentTools = [
  {
    type: "function",
    function: {
      name: "calculate_profit",
      description: "Read canonical product/result fields and return unit profit, gross margin, stock cost, and missing fields without recalculating the overall score.",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", description: "Optional analysis focus." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assess_purchase_risk",
      description: "Read existing MOQ, competitor, logistics, packaging, and risk fields, then summarize purchase risks without modifying records.",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", description: "Optional risk focus." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "inspect_market_evidence",
      description: "Inspect user-entered market evidence and existing search references only. Never access external platforms or invent market metrics.",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", description: "Optional evidence focus." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "retrieve_user_memory",
      description: "Read only the user's existing product library records and review data provided by the current request. Return similar record count, evidence level, price/MOQ/channel/review/risk patterns, and cautious notes. Never modify, save, delete, overwrite, sync, import, or access external platforms.",
      parameters: {
        type: "object",
        properties: {
          currentProduct: {
            type: "object",
            description: "Optional current product hints. The server still uses canonical context as source of truth.",
            additionalProperties: true,
          },
          historyRecords: {
            type: "array",
            description: "Optional shape hint only. The server reads request-provided history records from context and does not trust model-invented records.",
            items: { type: "object", additionalProperties: true },
          },
          currentReview: {
            type: "object",
            description: "Optional current review hints. The server prefers request-provided review data in context.",
            additionalProperties: true,
          },
          limit: {
            type: "number",
            description: "Maximum number of history records to inspect, default 10.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_supplier_checklist",
      description: "Generate a copyable supplier communication checklist and message drafts from the current product, canonical result, market evidence, risks, and memory summary. Reuses the existing supplier communication pack. Never contact suppliers, send messages, order, pay, invent supplier identities, or modify records.",
      parameters: {
        type: "object",
        properties: {
          product: {
            type: "object",
            description: "Optional current product hints. The server uses canonical context as source of truth.",
            additionalProperties: true,
          },
          result: {
            type: "object",
            description: "Optional current result hints. The server uses canonical context as source of truth.",
            additionalProperties: true,
          },
          marketEvidence: {
            type: "object",
            description: "Optional market evidence hints. The server uses request-provided evidence in context.",
            additionalProperties: true,
          },
          memorySummary: {
            type: "object",
            description: "Optional compact memory summary.",
            additionalProperties: true,
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_content_test_plan",
      description: "Generate a practical first-round content testing plan from the current product, canonical report content packages, market evidence, risks, and memory summary. Never publish content, access Xiaohongshu/Douyin, invent platform metrics, or claim the product will definitely go viral.",
      parameters: {
        type: "object",
        properties: {
          product: {
            type: "object",
            description: "Optional current product hints. The server uses canonical context as source of truth.",
            additionalProperties: true,
          },
          result: {
            type: "object",
            description: "Optional current result hints. The server uses canonical report packages as source of truth.",
            additionalProperties: true,
          },
          marketEvidence: {
            type: "object",
            description: "Optional market evidence hints.",
            additionalProperties: true,
          },
          memorySummary: {
            type: "object",
            description: "Optional compact memory summary.",
            additionalProperties: true,
          },
        },
        additionalProperties: false,
      },
    },
  },
];

export function getToolLabel(toolName) {
  return TOOL_LABELS[toolName] || toolName;
}

export function executeAgentTool(toolName, args, context) {
  assertAllowedTool(toolName);
  const executor = EXECUTORS[toolName];
  const result = executor(asObject(args), context);
  return {
    ...result,
    toolName,
    toolLabel: getToolLabel(toolName),
  };
}
