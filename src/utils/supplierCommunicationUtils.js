import { supplierQuestionTemplates } from "../constants/contentTemplates.js";

const BASE_RISK_CHECK_QUESTIONS = [
  "这个价格是否含包装？",
  "MOQ 是否可以混款？",
  "样品和大货是否一致？",
  "是否支持补货？",
  "发货周期多久？",
  "破损或瑕疵如何处理？",
  "是否能提供实拍图或视频？",
  "是否支持小批量试单？",
];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstText(...values) {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim());
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function formatMoney(value, fallback = "未填写") {
  const parsed = parseNumber(value);
  if (!parsed) return fallback;
  return `¥${Number.isInteger(parsed) ? parsed : parsed.toFixed(2)}`;
}

function formatText(value, fallback = "未填写") {
  const text = firstText(value);
  return text || fallback;
}

function isMissingText(value) {
  const text = String(value ?? "").trim();
  return !text || /未填写|未知|不明确|待补充|暂无/.test(text);
}

function unique(items) {
  const seen = new Set();
  return asArray(items).filter((item) => {
    const text = String(item ?? "").trim();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

function getProductContext(product, result) {
  const safeProduct = asObject(product);
  const safeResult = asObject(result);
  const effectivePrice = asObject(safeResult.effectivePrice);
  const productIdentity = asObject(safeResult.productIdentity || safeResult.contentContext?.productIdentity);
  const market = asObject(safeResult.market);
  const contentContext = asObject(safeResult.contentContext);

  const productName = firstText(
    safeProduct.name,
    productIdentity.displayName,
    contentContext.productName,
    safeResult.categoryName,
    "这款商品"
  );
  const productType = firstText(
    productIdentity.productTypeLabel,
    safeProduct.category,
    market.marketType,
    safeResult.categoryName
  );
  const categoryKey = firstText(
    contentContext.categoryKey,
    market.categoryKey,
    safeResult.categoryKey,
    productIdentity.identityKey,
    "unknown"
  );
  const cost = firstNumber(
    safeProduct.cost,
    safeProduct.purchasePrice,
    safeProduct.sourcePrice,
    safeProduct.wholesalePrice,
    safeResult.unitCost,
    effectivePrice.cost
  );
  const price = firstNumber(
    safeProduct.price,
    safeProduct.suggestedPrice,
    safeProduct.recommendedPrice,
    safeResult.price,
    safeResult.suggestedPrice,
    effectivePrice.price
  );
  const moq = firstNumber(safeProduct.moq, safeProduct.minimumOrderQuantity, safeResult.moq);
  const profit = firstNumber(safeResult.profit, price && cost ? price - cost : 0);
  const margin = Number.isFinite(Number(safeResult.margin)) && Number(safeResult.margin) > 0
    ? Number(safeResult.margin)
    : price > 0 && cost > 0
      ? (price - cost) / price
      : 0;
  const material = firstText(safeProduct.material, safeResult.material, contentContext.material);
  const supplier = firstText(safeProduct.supplier, safeResult.supplier);
  const risks = unique([
    ...asArray(safeResult.risks),
    ...asArray(safeResult.priceEvidence?.riskWarnings),
    ...asArray(safeResult.marketEvidence?.price?.riskWarnings),
    ...asArray(safeResult.manualMarketEvidence?.riskWarnings),
    ...asArray(safeResult.marketEvidence?.manual?.riskWarnings),
    ...asArray(safeResult.douyinEvidence?.riskWarnings),
    ...asArray(safeResult.marketEvidence?.douyin?.riskWarnings),
  ]);
  const riskText = risks.join("；");

  return {
    productName,
    productType,
    categoryKey,
    cost,
    price,
    moq,
    profit,
    margin,
    material,
    supplier,
    audience: firstText(safeProduct.audience, safeResult.audience, contentContext.audience),
    channel: firstText(safeProduct.channel, safeResult.channel, safeResult.channelFit?.best),
    risks,
    riskText,
    moqHigh: moq >= 150 || /MOQ.*(偏高|较高|高)|起订量.*(偏高|较高|高)|压货/.test(riskText),
    profitTight: (price > 0 && cost > 0 && margin < 0.35) || /利润.*(偏低|偏薄|较低|紧|不足)|毛利.*(偏低|偏薄|较低|紧|不足)|运费|包装费/.test(riskText),
    materialMissing: isMissingText(material),
    supplierMissing: isMissingText(supplier),
  };
}

function buildSummary(context) {
  const infoItems = [
    `商品：${context.productName}`,
    context.productType ? `品类：${context.productType}` : "",
    context.cost ? `拿货价：${formatMoney(context.cost)}` : "拿货价：未填写",
    context.price ? `建议售价：${formatMoney(context.price)}` : "建议售价：未填写",
    context.moq ? `MOQ：${context.moq} 件` : "MOQ：未填写",
    context.material ? `材质：${context.material}` : "材质：未填写",
    context.audience ? `目标人群：${context.audience}` : "",
    context.channel ? `销售渠道：${context.channel}` : "",
  ].filter(Boolean);

  const focus = [
    "先确认现货、阶梯价、MOQ / 混批、样品一致性、发货周期和售后规则",
    context.moqHigh ? "MOQ 偏高，重点争取小批量试单、混款混批或分批发货" : "",
    context.profitTight ? "利润空间偏紧，重点复核包装费、运费、阶梯价和售后损耗" : "",
    context.materialMissing ? "材质信息不完整，需要供应商补充材质参数、质检说明和实拍细节" : "",
    context.supplierMissing ? "供应商信息未完整填写，需要确认发货地、资质、补货能力和售后规则" : "",
  ].filter(Boolean);

  return `${infoItems.join("；")}。沟通重点：${focus.join("；")}。`;
}

function buildInquiryMessage(context) {
  return [
    `你好，我这边准备先了解并小批量测款「${context.productName}」，麻烦帮忙确认以下拿货条件：`,
    `1. 这款目前是否现货？当前可选规格、颜色、尺寸是否齐全？`,
    `2. 单件拿货价、不同数量的阶梯价格分别是多少？当前参考成本是 ${formatMoney(context.cost)}，想确认同规格报价。`,
    `3. MOQ 是多少？是否支持颜色、款式或规格混批？`,
    `4. 是否支持拿样？样品价格、样品运费和样品发货时间分别是多少？`,
    `5. 是否支持一件代发或小批量试单？如果支持，发货周期和售后规则是怎样的？`,
    `6. 包装是否包含在报价里？如果需要单独包装、礼盒或防护包装，费用如何计算？`,
    `我计划在${formatText(context.channel, "当前销售渠道")}面向${formatText(context.audience, "目标人群")}做首轮测试，麻烦按实际供货条件回复，方便我评估是否先拿样。`,
  ].join("\n");
}

function buildNegotiationMessage(context) {
  const reason = [
    context.profitTight ? "当前测算利润空间需要再核算" : "",
    context.moqHigh ? "首批 MOQ 对测款压力偏高" : "",
  ].filter(Boolean).join("，");

  return [
    `你好，这款「${context.productName}」我这边比较感兴趣，准备先做小量试单验证内容反馈和真实转化。${reason ? `不过${reason}，所以想再确认下价格空间。` : "想先确认一下小批量试单和后续复购的价格政策。"}`,
    `1. 如果首批先小量试单，是否可以按更接近批发档位的价格支持一下？`,
    `2. 如果后续复购稳定，是否可以给阶梯优惠或返单价？不同数量档位分别是多少？`,
    `3. MOQ 是否可以先降低，或支持混款、混色、分批发货？`,
    `4. 包装费、运费、贴标或其他附加费用是否可以合并核算，避免首单利润被额外成本吃掉？`,
    `5. 如果首批反馈好，我会优先稳定复购，也希望后续能按稳定合作价执行。`,
  ].join("\n");
}

function buildSampleMessage(context) {
  return [
    `你好，我准备先拿「${context.productName}」样品，请帮忙确认以下打样细节：`,
    `1. 样品是否和后续大货一致？包括材质、尺寸、颜色、做工和包装。`,
    `2. 当前材质标注是「${formatText(context.material)}」，是否有更具体的材质参数、质检说明或注意事项？`,
    `3. 能否提供样品和大货的实拍图 / 视频，尤其是细节、尺寸对比、包装和瑕疵位置？`,
    `4. 样品价格、样品运费、发货时间分别是多少？能否随样附上规格清单？`,
    `5. 大货常见瑕疵率大概多少？如果样品和大货不一致，售后如何处理？`,
    `6. 如果样品确认后下小批量订单，是否可以保留同款同批次颜色和规格？`,
  ].join("\n");
}

function buildShippingMessage(context) {
  return [
    `你好，我想提前确认「${context.productName}」的发货与售后规则，方便评估首单风险：`,
    `1. 下单后通常多久发货？现货、预售和补货周期分别是多久？`,
    `2. 默认发什么快递？不同地区运费如何计算，是否支持指定快递？`,
    `3. 如果出现破损、瑕疵、错发、漏发，补发或退款规则是什么？需要提供哪些凭证？`,
    `4. 是否支持后续补货？热卖规格断货时，一般多久可以恢复？`,
    `5. 是否支持小批量多次补货，避免一次性压太多库存？`,
    `6. 外包装、防护包装和标签是否稳定？批量发货前能否先拍照确认？`,
  ].join("\n");
}

function buildRiskQuestions(context, result) {
  const categoryQuestions = asArray(supplierQuestionTemplates[context.categoryKey] || supplierQuestionTemplates.unknown).slice(0, 3);
  const dynamicQuestions = [];

  if (context.moqHigh) {
    dynamicQuestions.push(
      "当前 MOQ 是否可以降低首单起订量，或按颜色 / 款式 / 规格混批？",
      "如果先拿样或小批量试单，是否可以保留后续批发价或返单优惠？",
      "是否支持分批发货，避免首单一次性压货？"
    );
  }

  if (context.profitTight) {
    dynamicQuestions.push(
      "不同数量档位的阶梯价是多少，是否有返单价？",
      "包装费、运费、贴标费是否另算？是否会影响单件利润？",
      "如果后续复购稳定，是否可以给更低合作价？"
    );
  }

  if (context.materialMissing) {
    dynamicQuestions.push(
      "材质、尺寸、重量、颜色和工艺参数能否提供完整说明？",
      "是否有质检信息、检测报告、使用注意事项或常见瑕疵说明？"
    );
  }

  if (context.supplierMissing) {
    dynamicQuestions.push(
      "请确认发货地、主营品类、现货库存和日常补货能力。",
      "售后联系人、处理时效和破损补发规则分别是什么？",
      "是否能提供店铺资质、真实发货记录或可核验的合作信息？"
    );
  }

  return unique([
    ...BASE_RISK_CHECK_QUESTIONS,
    ...asArray(result?.supplierQuestions),
    ...categoryQuestions,
    ...dynamicQuestions,
  ]);
}

export function generateSupplierCommunicationPack(product = {}, result = {}) {
  const context = getProductContext(product, result);
  const inquiryMessage = buildInquiryMessage(context);
  const negotiationMessage = buildNegotiationMessage(context);
  const sampleMessage = buildSampleMessage(context);
  const shippingMessage = buildShippingMessage(context);

  return {
    summary: buildSummary(context),
    inquiryMessage,
    negotiationMessage,
    sampleMessage,
    shippingMessage,
    riskCheckQuestions: buildRiskQuestions(context, result),
    copyBlocks: [
      { title: "询价话术", content: inquiryMessage },
      { title: "议价话术", content: negotiationMessage },
      { title: "打样确认话术", content: sampleMessage },
      { title: "发货与售后确认", content: shippingMessage },
    ],
  };
}

export default generateSupplierCommunicationPack;
