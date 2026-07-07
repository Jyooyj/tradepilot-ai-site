import { generateSupplierCommunicationPack } from "../../src/utils/supplierCommunicationUtils.js";
import { asArray, asObject, parseNumber, pickNumber, text } from "./agentSchemas.js";

function unique(items) {
  return [...new Set(asArray(items).map((item) => String(item || "").trim()).filter(Boolean))];
}

function firstText(...values) {
  return values.find((value) => String(value ?? "").trim()) ?? "";
}

function compactText(value, max = 180) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function getContext(args = {}, context = {}) {
  return {
    product: {
      ...asObject(context.product),
      ...asObject(args.product),
    },
    result: {
      ...asObject(context.result),
      ...asObject(args.result),
    },
    marketEvidence: {
      ...asObject(context.marketEvidence),
      ...asObject(args.marketEvidence),
    },
    memorySummary: {
      ...asObject(context.historySummary),
      ...asObject(args.memorySummary),
    },
  };
}

function splitMessageLines(message = "") {
  return String(message || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function getProductName(product, result) {
  return firstText(
    result.productIdentity?.displayName,
    product.name,
    product.productName,
    "这款商品"
  );
}

function getRisks(result, marketEvidence) {
  return unique([
    ...asArray(result.risks),
    ...asArray(result.priceEvidence?.riskWarnings),
    ...asArray(result.manualMarketEvidence?.riskWarnings),
    ...asArray(result.douyinEvidence?.riskWarnings),
    ...asArray(asObject(marketEvidence.priceEvidence).riskWarnings),
    ...asArray(asObject(marketEvidence.manualMarketEvidence).riskWarnings),
    ...asArray(asObject(marketEvidence.douyinEvidence).riskWarnings),
  ]).slice(0, 8);
}

export function summarizeSupplierChecklist(observation = {}) {
  const source = asObject(observation);
  return {
    summary: compactText(source.summary, 240),
    inquiryChecklist: asArray(source.inquiryChecklist).slice(0, 6),
    riskReminders: asArray(source.riskReminders).slice(0, 6),
  };
}

export function summarizeContentTestPlan(observation = {}) {
  const source = asObject(observation);
  const xhs = asObject(source.xiaohongshu);
  const douyin = asObject(source.douyin);
  return {
    summary: compactText(source.summary, 240),
    xiaohongshuAngles: asArray(xhs.contentAngles).slice(0, 3),
    douyinAngles: asArray(douyin.openingAngles).slice(0, 3),
    nextActions: asArray(source.nextActions).slice(0, 5),
  };
}

export function generateSupplierChecklist(args = {}, context = {}) {
  const { product, result, marketEvidence, memorySummary } = getContext(args, context);
  const pack = generateSupplierCommunicationPack(product, result);
  const riskReminders = unique([
    ...getRisks(result, marketEvidence),
    ...asArray(pack.riskCheckQuestions).filter((question) => /破损|售后|MOQ|混批|补货|材质|包装|发货|阶梯价|样品/.test(question)),
    Number(memorySummary.recordCount || 0) > 0 ? `历史记录可作为沟通优先级参考，但样本量为 ${memorySummary.recordCount} 条，仍需人工确认。` : "",
  ]).slice(0, 8);

  const observation = {
    summary: pack.summary || `围绕 ${getProductName(product, result)} 生成供应商沟通清单。`,
    inquiryChecklist: unique([
      "确认 MOQ、是否支持小批量试单、是否支持混款混批。",
      "确认拿货价、阶梯价、返单价、包装费、运费和其他附加费用。",
      "确认是否支持打样，样品与大货是否一致。",
      "确认补货周期、现货数量、断货后的恢复时间。",
      "确认材质、尺寸、颜色、工艺参数和实拍图/视频。",
      "确认包装、防护、破损、瑕疵、错发、漏发和售后规则。",
      ...asArray(pack.riskCheckQuestions),
    ]).slice(0, 12),
    negotiationMessages: [pack.negotiationMessage].filter(Boolean),
    sampleConfirmationMessages: [pack.sampleMessage].filter(Boolean),
    deliveryAndAfterSalesQuestions: splitMessageLines(pack.shippingMessage).filter((line) => /^\d+\./.test(line)).slice(0, 8),
    riskReminders,
    copyBlocks: asArray(pack.copyBlocks).slice(0, 4),
    source: "existing_supplier_communication_pack",
    note: "仅生成可复制话术，不自动发送消息、不联系供应商、不下单、不付款。",
  };

  return {
    ok: true,
    status: "completed",
    missingFields: [],
    summary: "已生成供应商沟通清单，覆盖询价、MOQ、打样、交期、包装和售后重点。",
    observation,
  };
}

function getXhsPackage(result) {
  return asObject(result.xhsPackage);
}

function getDouyinPackage(result) {
  return asObject(result.douyinPackage);
}

function contentMetricList(result, memorySummary) {
  const reviewCount = Number(memorySummary.reviewRecordCount || 0);
  return unique([
    "收藏率：判断封面、场景和卖点是否有种草潜力。",
    "评论质量：重点看材质、尺寸、价格、包装、适配和使用场景问题。",
    "私信/询单率：判断用户是否进入购买考虑。",
    "成交转化率：用于判断价格、信任和成交路径是否成立。",
    "测款成本：记录内容制作、投放或样品成本，避免只看互动不看利润。",
    reviewCount > 0 ? `历史复盘已有 ${reviewCount} 条，可对比本轮互动率、询单率和转化率。` : "",
  ]).slice(0, 8);
}

function buildXhsPlan(result, product, memorySummary) {
  const xhs = getXhsPackage(result);
  const productName = getProductName(product, result);
  const coverHooks = asArray(xhs.coverHooks).slice(0, 4);
  const titles = asArray(xhs.titles).slice(0, 5);
  return {
    contentAngles: unique([
      xhs.merchantStrategy,
      `围绕「${productName}」做真实使用/佩戴/开箱场景测试。`,
      "用价格、材质、尺寸、包装和人群场景解释购买理由。",
      Number(memorySummary.recordCount || 0) > 0 ? "结合历史相似记录的价格带和渠道反馈，选择更容易复盘的角度。" : "",
    ]).slice(0, 4),
    coverIdeas: coverHooks.length ? coverHooks : [
      "真实场景前后对比封面",
      "低预算礼物/自用场景封面",
      "尺寸、材质或细节近景封面",
    ],
    titleIdeas: titles.length ? titles : [
      `${productName}适合什么场景？先看真实使用效果`,
      "低成本测款：先看收藏、评论和询单再决定补货",
      "别只看好不好看，这几个细节更影响成交",
    ],
    testMetrics: contentMetricList(result, memorySummary),
  };
}

function buildDouyinPlan(result, product, memorySummary) {
  const douyin = getDouyinPackage(result);
  const shots = asArray(douyin.shots);
  const openingAngles = unique([
    ...shots.slice(0, 2).map((shot) => shot.copy || shot.focus),
    ...asArray(douyin.coverTexts).slice(0, 2),
    douyin.direction,
  ]).slice(0, 4);

  return {
    openingAngles: openingAngles.length ? openingAngles : [
      "前三秒展示使用前后差异或佩戴/上手效果。",
      "先抛出用户痛点，再展示商品解决方式。",
      "用低预算、自用/送礼或宿舍/通勤场景快速建立购买理由。",
    ],
    scriptDirections: unique([
      douyin.direction,
      ...shots.slice(0, 4).map((shot, index) => `镜头${index + 1}：${shot.focus || "展示核心卖点"}，${shot.copy || shot.visual || "补充真实场景"}`),
      douyin.merchantGoal,
    ]).slice(0, 6),
    shootingTips: unique([
      ...asArray(douyin.shootingNotes),
      "拍清楚尺寸、材质、细节和真实使用场景。",
      "不要展示未经验证的平台数据，只记录本轮真实互动、询单和成交。",
      "每条视频只测试一个核心卖点，便于复盘。",
    ]).slice(0, 7),
    testMetrics: contentMetricList(result, memorySummary),
  };
}

export function generateContentTestPlan(args = {}, context = {}) {
  const { product, result, marketEvidence, memorySummary } = getContext(args, context);
  const risks = getRisks(result, marketEvidence);
  const xiaohongshu = buildXhsPlan(result, product, memorySummary);
  const douyin = buildDouyinPlan(result, product, memorySummary);
  const productName = getProductName(product, result);
  const moq = pickNumber(product.moq, result.moq);
  const score = parseNumber(result.totalScore ?? result.score);
  const summary = `围绕「${productName}」生成首轮内容测款计划，优先观察收藏、评论、询单、成交转化和测款成本，不推断平台真实热度。`;

  const nextActions = unique([
    "先做 2-3 个小范围内容角度测试，记录真实收藏、评论、询单和成交。",
    "如果互动低，优先优化封面、标题、前三秒和真实场景。",
    "如果询单高但成交低，优先检查价格、运费、材质说明、包装和信任信息。",
    "如果成交转化稳定且测款成本可控，再考虑小批量补货观察。",
    moq >= 150 ? "MOQ 偏高时，即使内容反馈不错，也先争取小批量试单或混批。" : "",
    score > 0 && score < 65 ? "当前评分偏谨慎，内容测试只作为需求验证，不作为直接补货依据。" : "",
    risks.length ? `重点复核风险：${risks.slice(0, 3).join("；")}` : "",
  ]).slice(0, 7);

  const observation = {
    summary,
    xiaohongshu,
    douyin,
    nextActions,
    source: "existing_report_content_packages",
    note: "不自动发布内容，不访问外部平台，不伪造播放量、点赞、收藏、评论、询单、成交或平台热度。",
  };

  return {
    ok: true,
    status: "completed",
    missingFields: [],
    summary: "已生成内容测款计划，覆盖小红书方向、抖音前三秒、拍摄建议和首轮观察指标。",
    observation,
  };
}
