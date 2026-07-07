// currentProductContext.js
// 当前商品标准上下文 + productFingerprint。
//
// 设计原则：
// 1. currentProductContext 只能从“当前这次上传 / 当前表单 / 当前报告 / 当前图片识别”生成。
// 2. 它不读取 localStorage、历史产品、demo、seed。
// 3. 所有衍生模块都应只基于 currentProductContext 生成，并带上 productFingerprint。
// 4. fingerprint 用于校验某个模块结果是否仍属于当前商品；不一致即视为旧内容。
//
// 纯函数、无副作用、不依赖 React。

import { buildContextKeywordText } from "./historyPollutionGuard";

function toStr(value) {
  if (value == null) return "";
  return String(value).trim();
}

function toNum(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// 稳定的字符串哈希（djb2 变体）。同样输入永远得到同样输出，不依赖时间/随机。
export function stableHash(value) {
  const str = String(value == null ? "" : value);
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // 转成无符号 36 进制，短且稳定。
  return (hash >>> 0).toString(36);
}

// 生成当前报告的 productFingerprint。
// 只基于“能定义这是哪一个商品”的关键字段。
export function computeProductFingerprint(input = {}) {
  const parts = [
    toStr(input.productName || input.name),
    toStr(input.category),
    toStr(input.costPrice ?? input.cost),
    toStr(input.suggestedPrice ?? input.price),
    toStr(input.moq),
    toStr(input.targetAudience || input.audience),
    toStr(input.sellingChannels || input.channel),
    toStr(input.imageRecognitionSummary),
  ];
  return stableHash(parts.join("|"));
}

// 判断当前商品信息是否足够生成“具体”内容。
// 信息不足时，衍生模块只能给通用结构建议，不得编造材质/场景/款式。
export function evaluateInfoSufficiency(product = {}, options = {}) {
  const hasImage = Boolean(options.hasImage);
  const checks = {
    productName: Boolean(toStr(product.name || product.productName)),
    category: Boolean(toStr(product.category)),
    material: Boolean(toStr(product.material)),
    audience: Boolean(toStr(product.audience || product.targetAudience)),
    channel: Boolean(toStr(product.channel || product.sellingChannels)),
    scene: Boolean(toStr(product.keywords) || toStr(product.note)),
  };
  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  // 至少要有商品名 + （材质或人群或场景之一），且有名字才算可生成具体内容。
  const sufficient =
    checks.productName &&
    (checks.material || checks.audience || checks.scene || hasImage) &&
    (checks.category || hasImage);
  return { sufficient, missing, checks };
}

// 收集当前商品上下文关键词文本，用于历史污染拦截。
export function collectCurrentProductKeywords(context = {}) {
  return buildContextKeywordText(
    context.productName,
    context.category,
    context.subcategory,
    context.material,
    context.detectedMaterial,
    context.detectedStyle,
    context.detectedScene,
    context.styleTags,
    context.sceneTags,
    context.targetAudience,
    context.sellingChannels,
    context.suitableChannels,
    context.detectedObjects,
    context.imageRecognitionSummary
  );
}

// 构建当前商品标准上下文对象。
// product：当前表单/识别回填后的商品。
// result：当前 analyzeProduct 的结果（可选）。
// 其它元信息（reportId/sessionId/generatedAt/imageRecognition）由调用方传入，
// 以保持 React 渲染期间的稳定性（避免在此处调用 Date.now）。
export function buildCurrentProductContext({
  product = {},
  result = {},
  hasImage = false,
  imageRecognition = {},
  reportId = "",
  sessionId = "",
  generatedAt = "",
} = {}) {
  const identity = result?.productIdentity || {};
  const imageRec = imageRecognition || {};

  const imageRecognitionSummary = toStr(
    imageRec.summary || imageRec.imageRecognitionSummary || ""
  );

  const context = {
    reportId: toStr(reportId),
    sessionId: toStr(sessionId),
    generatedAt: toStr(generatedAt),

    productName: toStr(identity.displayName || product.name || product.productName),
    category: toStr(identity.productTypeLabel || product.category),
    subcategory: toStr(product.subcategory || result?.categoryName),
    targetAudience: toStr(product.audience || product.targetAudience),
    sellingChannels: toStr(product.channel || product.sellingChannels),

    material: toStr(product.material),
    styleTags: toStr(product.styleTags || product.keywords),
    sceneTags: toStr(product.sceneTags || product.note),

    costPrice: toNum(product.cost ?? product.costPrice),
    suggestedPrice: toNum(product.price ?? product.suggestedPrice),
    moq: toNum(product.moq),
    grossProfit: toNum(result?.profit),
    grossMargin: toNum(result?.margin),

    imageRecognitionSummary,
    detectedObjects: imageRec.detectedObjects || imageRec.objects || [],
    detectedStyle: toStr(imageRec.detectedStyle || imageRec.style),
    detectedMaterial: toStr(imageRec.detectedMaterial || imageRec.material),
    detectedScene: toStr(imageRec.detectedScene || imageRec.scene),

    warningMessages: Array.isArray(result?.risks) ? result.risks : [],
    riskSummary: Array.isArray(result?.risks) ? result.risks.join("；") : "",
    score: toNum(result?.totalScore),
    suitableChannels: result?.channelFit?.recommended || result?.suitableChannels || [],
    currentReportSummary: toStr(result?.executiveSummary || result?.report?.slice?.(0, 200)),

    hasImage: Boolean(hasImage),
  };

  context.productFingerprint = computeProductFingerprint(context);
  const sufficiency = evaluateInfoSufficiency(product, { hasImage });
  context.infoSufficient = sufficiency.sufficient;
  context.missingInfoFields = sufficiency.missing;
  context.contextKeywordText = collectCurrentProductKeywords(context);

  if (!context.reportId) context.reportId = `report-${context.productFingerprint}`;

  return context;
}
