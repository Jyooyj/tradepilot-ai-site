// productSpecificContent.js
// “具体化生成”层：在不破坏 currentProductContext 强绑定 / productFingerprint /
// 历史污染拦截的前提下，让内容模块真正基于“当前商品信息”生成，
// 避免“这个小东西 / 这个小问题 / 实用小物 / 日常幸福感”等空泛模板话术。
//
// 设计原则：
// - 当前商品信息越具体，输出越具体；信息不足才退回通用结构并明确提示“信息不足”。
// - 只使用当前商品字段（productName/category/material/audience/channel/scene/价格/MOQ），
//   绝不引入历史 / 示例 / seed 的具体商品词。
// - 纯函数、无副作用、不依赖 React，可单测。

import {
  buildProductExpression,
  sanitizeDisplayDeep,
  cleanHashtags,
} from "./productExpression";

// 默认空泛话术：不能作为默认输出，只有当前商品信息明确支持时才允许出现。
export const GENERIC_FILLER_PHRASES = [
  "低预算实用小物",
  "低预算小东西",
  "实用小东西",
  "这种小东西",
  "这个小东西",
  "这种小物",
  "这个小物",
  "这款小物",
  "实用小物",
  "小东西大作用",
  "日常幸福感",
  "提高日常幸福感",
  "提升一点日常幸福感",
  "用前用后差别太明显了",
  "用前用后差别太明显",
  "用前用后差别明显",
  "我以前每天都忍",
  "每天都忍的小问题",
  "每天都忍",
  "不是大件",
  "生活小麻烦",
  "日常小麻烦",
  "小麻烦",
  "小众但实用",
  "一图看懂",
];

// 名词型空泛词（可安全替换成当前商品核心名词）。按长度降序。
const FILLER_NOUNS = [
  "低预算实用小物",
  "低预算小东西",
  "实用小东西",
  "这种小东西",
  "这个小东西",
  "这种小物",
  "这个小物",
  "这款小物",
  "实用小物",
  "小东西",
  "小物",
];

// 材质 → 质量风险点规则。命中材质关键词即附带对应风险/卖点关注。
const MATERIAL_RISK_RULES = [
  { match: /毛绒|绒毛|长毛绒|短毛绒|填充/, points: ["毛绒是否掉毛、掉色或有异味？", "填充是否均匀、回弹和造型是否稳定？", "缝线是否整齐、是否容易开线或脱线？"] },
  { match: /塑料|PP|PVC|ABS|树脂/i, points: ["塑料厚度是否足够、是否容易变形或压坏？", "边缘是否有毛刺、是否割手？", "是否有明显塑料异味？", "承重和耐摔表现是否达标？"] },
  { match: /金属|合金|不锈钢|铁|铜|铝|五金/, points: ["金属/五金挂扣是否牢固，反复拉扯是否会松或断？", "金属件是否容易掉色、生锈或氧化？", "是否存在镍等过敏风险？"] },
  { match: /布|棉|麻|帆布|涤纶|绒|针织/, points: ["走线和缝制是否牢固、是否掉毛？", "是否存在色差或缩水？", "清洗后是否变形或褪色？"] },
  { match: /亚克力|有机玻璃/, points: ["表面是否容易刮花？", "透明度是否均匀、有无气泡？", "受力后是否容易开裂？"] },
  { match: /木|竹|实木|原木/, points: ["是否有毛刺或开裂？", "是否做了防潮、防霉处理？", "批次木纹和色差是否稳定？"] },
  { match: /陶|瓷|玻璃|琉璃/, points: ["是否易碎、包装保护是否到位？", "边缘是否打磨光滑？", "是否耐温、耐摔？"] },
  { match: /硅胶|橡胶/, points: ["是否容易沾灰、是否有异味？", "回弹和耐用性如何？", "长期使用是否会发黄？"] },
  { match: /纸|卡纸|纸品|铜版/, points: ["纸张克重和印刷是否清晰？", "边缘裁切是否毛糙？", "是否做了防水、防潮处理？"] },
];

// 目标人群 → 场景词规则。
const AUDIENCE_SCENE_RULES = [
  { match: /学生|学生党|大学生|校园|宿舍/, scenes: ["宿舍书桌", "教室课桌", "开学季"], voice: "面向学生党，强调预算友好、宿舍/书桌适用和开学季需求" },
  { match: /上班|办公|职场|白领|通勤/, scenes: ["办公室工位", "通勤路上", "桌面整洁"], voice: "面向上班族，强调工位效率、桌面整洁和通勤场景" },
  { match: /宝妈|妈妈|母婴|家庭|亲子/, scenes: ["家庭收纳", "厨房", "儿童房"], voice: "面向宝妈/家庭，强调安全、耐用、易清洁和收纳" },
  { match: /男生|男士|男友|送男/, scenes: ["桌面", "通勤", "礼物"], voice: "面向男性用户，强调实用、耐用和质感" },
  { match: /女生|女士|女友|闺蜜|少女/, scenes: ["梳妆台", "穿搭", "礼物"], voice: "面向女性用户，强调颜值、氛围感和送礼属性" },
];

// 渠道 → 内容形式规则。
const CHANNEL_FORM_RULES = [
  { match: /小红书|xhs|red/i, form: "小红书：图文标题 + 封面字 + 种草正文 + 话题标签 + 评论引导" },
  { match: /抖音|快手|视频|短视频/, form: "抖音：前三秒钩子 + 口播 + 镜头脚本 + 封面文案" },
  { match: /淘宝|天猫|京东|拼多多|电商|店铺|商城/, form: "电商平台：搜索词 + 商品标题关键词 + 详情页卖点" },
  { match: /校园|市集|摆摊|地摊|线下/, form: "校园 / 市集：摊位陈列 + 组合售卖 + 现场话术" },
];

function toStr(v) {
  return v == null ? "" : String(v).trim();
}
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function splitWords(text) {
  return toStr(text)
    .split(/[\s,，、;；/|]+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function uniqueList(items, limit = 8) {
  const out = [];
  (items || []).forEach((item) => {
    const v = toStr(item);
    if (v && !out.includes(v)) out.push(v);
  });
  return limit ? out.slice(0, limit) : out;
}

// 从商品名 / 核心词里得到一个较短的“核心名词”，用于话题标签等。
function deriveShortNoun(productName, coreTerms) {
  const name = toStr(productName);
  const cores = (coreTerms || []).map(toStr).filter(Boolean);
  const shorter = cores
    .filter((t) => t && t.length <= (name.length || 99) && t.length >= 2)
    .sort((a, b) => a.length - b.length)[0];
  if (shorter) return shorter;
  if (name.length > 3) return name.slice(-3);
  return name;
}

// 构建当前商品标准简报：所有内容生成模块的统一输入。
export function buildProductSpecificBrief(contentContext = {}, product = {}) {
  const ctx = contentContext || {};
  const identity = ctx.productIdentity || {};
  // 先经过“商品表达层”，把长识别句压缩成简洁可展示的商品名与细节。
  const expression = buildProductExpression(ctx, product);
  const productName = expression.displayName;
  const category = expression.categoryName || toStr(ctx.category || identity.productTypeLabel || product.category);
  // 展示用的简短材质词 + 用于规则匹配的完整材质文本。
  const materialText = `${toStr(ctx.material || product.material)} ${expression.materialDetails.join(" ")}`.trim();
  const material = expression.materialDetails[0] || toStr(ctx.material || product.material);
  const targetAudience = expression.targetAudienceText || toStr(ctx.audience || product.audience);
  const sellingChannels = toStr(ctx.channel || product.channel);
  const styleTags = uniqueList([...expression.visualDetails, ...splitWords(product.keywords), ...(identity.styleTerms || [])], 8)
    .filter((w) => w.length <= 8);
  // 使用场景：优先“商品表达层”推断的真实用途，再补用户关键词/备注；只保留短词，避免识别长句混入。
  const sceneFromInput = uniqueList(
    [...expression.useCases, ...splitWords(product.note), ...splitWords(product.keywords), ...splitWords(ctx.sceneTags)],
    10
  ).filter((w) => w.length >= 2 && w.length <= 8);

  const coreTerms = uniqueList(
    [productName, expression.shortName, ...(identity.coreProductTerms || []), ...(ctx.coreProductTerms || [])],
    6
  );
  const coreNoun = productName || coreTerms[0] || "";
  const shortNoun = expression.shortName || deriveShortNoun(productName, [...(identity.coreProductTerms || []), ...coreTerms]);

  // 材质风险点（按完整材质文本匹配规则）
  const materialRiskPoints = [];
  if (materialText) {
    MATERIAL_RISK_RULES.forEach((rule) => {
      if (rule.match.test(materialText)) materialRiskPoints.push(...rule.points);
    });
    if (!materialRiskPoints.length && material) {
      materialRiskPoints.push(
        `${material}的厚度、做工和耐用性是否达标？`,
        "是否存在异味、毛刺或色差？"
      );
    }
  }

  // 人群场景
  let audienceScenes = [];
  let audienceVoice = "";
  if (targetAudience) {
    AUDIENCE_SCENE_RULES.forEach((rule) => {
      if (rule.match.test(targetAudience)) {
        audienceScenes.push(...rule.scenes);
        if (!audienceVoice) audienceVoice = rule.voice;
      }
    });
  }
  audienceScenes = uniqueList(audienceScenes, 6);

  // 综合使用场景（真实用途 + 人群场景）
  const sceneWords = uniqueList([...sceneFromInput, ...audienceScenes], 6);

  // 渠道形式
  const channelForms = [];
  if (sellingChannels) {
    CHANNEL_FORM_RULES.forEach((rule) => {
      if (rule.match.test(sellingChannels)) channelForms.push(rule.form);
    });
  }

  const costPrice = toNum(product.cost ?? ctx.cost);
  const suggestedPrice = toNum(product.price ?? ctx.price);
  const moq = toNum(product.moq ?? ctx.moq);

  // 信息缺口
  const missing = [];
  if (!productName) missing.push("商品名称");
  if (!toStr(ctx.category || product.category)) missing.push("商品类目");
  if (!materialText) missing.push("材质");
  if (!targetAudience) missing.push("目标人群");
  if (!sceneWords.length) missing.push("使用场景");
  if (!sellingChannels) missing.push("销售渠道");
  if (suggestedPrice == null) missing.push("建议售价");
  if (costPrice == null) missing.push("拿货成本");
  if (moq == null) missing.push("起订量MOQ");

  const hasName = Boolean(productName);
  // “足够具体”：有商品名 + 至少一项（材质/场景/人群），才生成完整具体文案。
  const sufficient = hasName && Boolean(materialText || sceneWords.length || targetAudience);

  return {
    expression,
    productName,
    coreNoun,
    shortNoun,
    contentName: expression.contentName,
    coreTerms,
    category,
    categoryName: expression.categoryName,
    material,
    materialText,
    materialDetails: expression.materialDetails,
    visualDetails: expression.visualDetails,
    useCases: expression.useCases,
    materialRiskPoints,
    targetAudience,
    targetAudienceText: expression.targetAudienceText,
    audienceShort: expression.audienceShort,
    audienceVoice,
    audienceScenes,
    sceneWords,
    styleTags,
    sellingChannels,
    channelForms,
    channelFitText: expression.channelFitText,
    costPrice,
    suggestedPrice,
    moq,
    grossMargin: toNum(ctx.grossMargin),
    riskSummary: toStr(ctx.riskSummary),
    imageRecognitionSummary: toStr(ctx.imageRecognitionSummary),
    uncertaintyNotes: expression.uncertaintyNotes,
    contextWhitelistText: expression.contextWhitelistText,
    missing,
    hasName,
    sufficient,
  };
}

// 主场景词（用于句子拼接），没有则给一个中性词。
function primaryScene(brief) {
  return brief.sceneWords[0] || "日常使用场景";
}
function sceneListText(brief) {
  return brief.sceneWords.length ? brief.sceneWords.slice(0, 3).join("、") : "日常场景";
}
function materialClause(brief) {
  return brief.material ? `${brief.material}材质的质感与做工` : "材质和做工";
}

// 把名词型空泛词替换成当前商品核心名词；移除非名词型空泛话术。
export function specializeText(value, brief) {
  let text = toStr(value);
  if (!text) return text;
  const coreNoun = brief?.coreNoun || "";
  if (coreNoun) {
    FILLER_NOUNS.forEach((filler) => {
      if (text.includes(filler)) text = text.split(filler).join(coreNoun);
    });
  }
  // 非名词型空泛话术：当前商品信息不足时，不强行替换，但移除空洞表达。
  GENERIC_FILLER_PHRASES.forEach((phrase) => {
    if (FILLER_NOUNS.includes(phrase)) return;
    if (text.includes(phrase)) text = text.split(phrase).join("");
  });
  // 清理替换后产生的标点碎片。
  return text
    .replace(/，{2,}/g, "，")
    .replace(/。{2,}/g, "。")
    .replace(/^[，。、,\s]+/, "")
    .replace(/[，、]+。/g, "。")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function specializeDeep(value, brief) {
  if (typeof value === "string") return specializeText(value, brief);
  if (Array.isArray(value)) return value.map((item) => specializeDeep(item, brief));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, specializeDeep(v, brief)])
    );
  }
  return value;
}

// 确保数组里每一条都尽量带上当前商品核心名词（首条不含则补一条）。
function ensureCoreNoun(list, brief, max = 6) {
  const arr = uniqueList(list, max);
  if (!brief.coreNoun) return arr;
  const anyHasName = arr.some((t) => t.includes(brief.coreNoun) || t.includes(brief.shortNoun));
  if (!anyHasName && arr.length) {
    arr.unshift(`${brief.coreNoun}：${arr.shift()}`);
  }
  return uniqueList(arr, max);
}

// ===== 基于 brief 生成具体文案 =====

export function buildSpecificXhsCopy(brief) {
  const scene = primaryScene(brief);
  const sceneText = sceneListText(brief);
  const shortN = brief.shortNoun || brief.coreNoun;
  const name = brief.coreNoun;
  const audienceShort = brief.audienceShort || brief.targetAudience;
  const riskWord = brief.materialRiskPoints.length
    ? brief.materialRiskPoints[0].replace(/[？?]/g, "")
    : "做工和细节";
  const coverHooks = uniqueList([
    `${shortN}用在${scene}，氛围感会不一样`,
    brief.material
      ? `${shortN}别只看外形，${brief.material}质感和做工更重要`
      : `${shortN}怎么挑更顺手，先看真实使用`,
    brief.targetAudience
      ? `适合${audienceShort}的${shortN}，重点看这几个细节`
      : `小预算也能有记忆点的${shortN}`,
  ], 3);
  const titles = uniqueList([
    `${name}怎么选？别只看外形`,
    brief.material
      ? `${shortN}别乱买，${brief.material}和做工更关键`
      : `${shortN}怎么挑？这几个细节很关键`,
    brief.targetAudience
      ? `适合${audienceShort}的${shortN}，重点看这几点`
      : `${shortN}放在${scene}的真实效果`,
    `${shortN}适合${scene}吗？我会先看这些点`,
    `${name}种草：${sceneText}都用得上`,
  ], 5);
  const body =
    `这类${name}不是只看外形，真正影响购买的是${scene}里的真实效果` +
    (brief.material ? `、${brief.material}质感` : "") +
    "和做工细节。" +
    (brief.audienceVoice ? `${brief.audienceVoice}。` : "") +
    (brief.materialRiskPoints.length
      ? `选款时我会重点看${brief.materialRiskPoints.slice(0, 2).join("、").replace(/[？?]/g, "")}，还有样品和大货是否一致。`
      : `选款时我会重点看做工、尺寸和样品与大货是否一致。`);
  const pages = uniqueList([
    `第1页：${shortN}用在${scene}后的整体效果封面。`,
    brief.material
      ? `第2页：近拍${brief.material}质感、做工和细节。`
      : `第2页：近拍${shortN}的做工和细节。`,
    `第3页：展示${sceneText}等真实使用场景。`,
    `第4页：对比单拍产品图和真实使用场景图。`,
    brief.targetAudience
      ? `第5页：说明适合${brief.targetAudience}。`
      : `第5页：说明适合什么人、什么场合。`,
    `第6页：提醒检查${riskWord}、样品与大货一致性。`,
    `第7页：展示包装和送礼 / 使用场景。`,
    `第8页：评论引导——你会把${shortN}用在哪个场景？`,
  ], 8);
  const interactions = uniqueList([
    `你会把${shortN}用在${sceneText}的哪个场景？`,
    brief.material
      ? `更在意${shortN}的${brief.material}质感还是价格？`
      : `更在意${shortN}的实用性还是颜值？`,
    `想看${shortN}的细节特写还是使用场景？`,
  ], 4);
  const tags = cleanHashtags([
    shortN,
    ...brief.useCases,
    ...brief.sceneWords,
    brief.targetAudience,
    ...brief.styleTags,
    brief.material,
  ], 10);
  const merchantStrategy =
    `这组内容重点测试用户是否被「${shortN} + 真实使用效果 + ${brief.targetAudience || "目标人群"}场景」吸引。` +
    `发布后重点看收藏率、评论里是否询问价格 / MOQ / 购买方式，以及更偏好哪种使用场景。` +
    `如果收藏高但询单低，优先补充价格、尺寸和${brief.material ? `${brief.material}做工` : "做工"}说明。`;
  return { coverHooks, titles, body, pages, interactions, tags, merchantStrategy };
}

export function buildSpecificDouyinCopy(brief) {
  const scene = primaryScene(brief);
  const sceneText = sceneListText(brief);
  const shortN = brief.shortNoun || brief.coreNoun;
  const detail = brief.material ? `${brief.material}质感和做工` : "做工和细节";
  const riskCheck = brief.materialRiskPoints.length
    ? brief.materialRiskPoints.slice(0, 2).join("、").replace(/[？?]/g, "")
    : "做工、尺寸和样品与大货是否一致";
  const direction =
    `围绕“${shortN}用在${scene}后的效果”拍摄，重点突出使用前后对比、${detail}和真实使用场景。`;
  const shots = [
    {
      time: "0-2秒",
      focus: "强钩子",
      visual: `先拍${scene}使用前的画面，下一秒用上${shortN}`,
      copy: `${scene}差一个${shortN}，效果真的不一样`,
      purpose: "用前后对比抓住注意力。",
    },
    {
      time: "3-6秒",
      focus: "展示细节",
      visual: `近拍${shortN}的${detail}`,
      copy: brief.material ? `这类${shortN}别只看外形，${brief.material}和做工更重要` : `这类${shortN}别只看外形，做工更重要`,
      purpose: "降低“只是普通小物”的感觉。",
    },
    {
      time: "7-11秒",
      focus: "展示场景",
      visual: `把${shortN}用在${sceneText}等不同场景`,
      copy: `${sceneText}都用得上`,
      purpose: "扩展使用场景。",
    },
    {
      time: "12-16秒",
      focus: "风险提醒",
      visual: `检查${brief.material || ""}做工、缝线和牢固度的特写`,
      copy: `拿样时我会先看${riskCheck}`,
      purpose: "强化真实进货判断。",
    },
    {
      time: "17-20秒",
      focus: "互动引导",
      visual: `${shortN}几种用法并排展示`,
      copy: `你会把${shortN}用在${sceneText}的哪个场景？`,
      purpose: "引导评论和偏好选择。",
    },
  ];
  const coverTexts = uniqueList([
    `${shortN}真实使用效果`,
    brief.targetAudience ? `${brief.targetAudience}的${scene}好物` : `${scene}用得上的${shortN}`,
    brief.material ? `${brief.material}质感看得见` : `${shortN}细节看得见`,
  ], 3);
  const shootingNotes = uniqueList([
    `开头先拍${scene}使用前后的对比，结果越直观越好。`,
    `${brief.material ? `${brief.material}质感、` : ""}做工和牢固度要给近景。`,
    `多拍${sceneText}等真实场景，不要只拍白底产品图。`,
    "拿样镜头展示检查过程，体现真实进货判断。",
  ], 4);
  const merchantGoal =
    `这条视频重点测试用户是否被「${shortN} + 真实使用效果 + ${brief.targetAudience || "目标人群"}场景」吸引。` +
    `发布后看完播率、收藏、评论是否询问价格 / MOQ / 购买方式；如果播放高但询单少，补充价格、尺寸和${detail}说明。`;
  return { direction, shots, coverTexts, shootingNotes, merchantGoal };
}

// 信息不足时的占位文案。
export function buildInsufficientCopyNote(brief, moduleLabel = "该模块") {
  const missingText = brief.missing.length ? brief.missing.join("、") : "材质、使用场景和目标人群";
  return `当前缺少${missingText}，暂不生成具体${moduleLabel}内容；建议补充后重新生成更具体的内容。`;
}

// ===== 各模块具体化入口 =====

export function enrichXhsPackage(pkg, brief) {
  const base = specializeDeep(pkg || {}, brief);
  if (!brief.hasName) return sanitizeDisplayDeep(base);
  if (brief.sufficient) {
    const specific = buildSpecificXhsCopy(brief);
    return sanitizeDisplayDeep({
      ...base,
      coverHooks: ensureCoreNoun(specific.coverHooks, brief, 3),
      titles: ensureCoreNoun([...specific.titles, ...(base.titles || [])], brief, 5),
      body: specific.body,
      pages: specific.pages,
      interactions: uniqueList([...specific.interactions, ...(base.interactions || [])], 5),
      tags: cleanHashtags([...specific.tags, ...(base.tags || [])], 10),
      merchantStrategy: specific.merchantStrategy,
    });
  }
  // 有名字但信息不足：标题/钩子带上商品名，正文明确提示信息不足，不编造材质/场景。
  const note = buildInsufficientCopyNote(brief, "种草正文");
  return sanitizeDisplayDeep({
    ...base,
    coverHooks: ensureCoreNoun(base.coverHooks || [], brief, 3),
    titles: ensureCoreNoun(base.titles || [], brief, 5),
    body: note,
    interactions: uniqueList([`关于${brief.coreNoun}，你最想了解材质、尺寸还是使用场景？`, ...(base.interactions || [])], 5),
    tags: cleanHashtags(base.tags || [], 10),
  });
}

export function enrichDouyinPackage(pkg, brief) {
  const base = specializeDeep(pkg || {}, brief);
  if (!brief.hasName) return sanitizeDisplayDeep(base);
  if (brief.sufficient) {
    const specific = buildSpecificDouyinCopy(brief);
    return sanitizeDisplayDeep({
      ...base,
      direction: specific.direction,
      shots: specific.shots,
      coverTexts: ensureCoreNoun(specific.coverTexts, brief, 3),
      shootingNotes: specific.shootingNotes,
      merchantGoal: specific.merchantGoal,
    });
  }
  const note = buildInsufficientCopyNote(brief, "分镜脚本");
  return sanitizeDisplayDeep({
    ...base,
    direction: `当前以${brief.coreNoun}为主体，但${note}`,
    coverTexts: ensureCoreNoun(base.coverTexts || [], brief, 3),
  });
}

// 风险确认清单：在通用风险前面加上材质 / 价格 / MOQ 维度的具体风险。
export function buildSpecificRiskPoints(brief) {
  const points = [];
  if (brief.material) {
    points.push(...brief.materialRiskPoints);
  }
  const familyText = `${brief.productName} ${brief.category} ${brief.useCases.join(" ")}`;
  if (/挂件|挂饰|钥匙扣|钥匙链|玩偶|公仔/.test(familyText)) {
    points.push(
      "五金挂扣是否牢固，反复拉扯是否容易松或断？",
      "帽子、书包等装饰件是否容易脱落？",
      "是否存在图案版权或授权风险？",
      "包装是否会压扁造型？"
    );
  }
  if (brief.coreNoun && brief.sceneWords.length) {
    points.push(`${brief.coreNoun}的尺寸是否适合${brief.sceneWords[0]}？`);
  }
  points.push("样品和大货的表情 / 颜色 / 尺寸是否一致？");
  if (brief.moq != null && brief.moq > 0) {
    points.push(`起订量约${brief.moq}件，是否会造成压货？能否先小批量试单或混批？`);
  }
  if (brief.costPrice != null && brief.suggestedPrice != null) {
    points.push(`单件成本约${brief.costPrice}元、建议售价约${brief.suggestedPrice}元，毛利是否覆盖包装、运费和退货成本？`);
  }
  return uniqueList(points, 8);
}

// 供应商沟通清单：结合材质 / 类目生成具体问题。
export function buildSpecificSupplierQuestions(brief) {
  const questions = [];
  const familyText = `${brief.productName} ${brief.category} ${brief.useCases.join(" ")} ${brief.materialText}`;
  if (brief.material) {
    questions.push(`${brief.material}的材质成分、克重或填充是否稳定、能否提供检测或样品？`);
  }
  if (/挂件|挂饰|钥匙扣|钥匙链|玩偶|公仔|毛绒/.test(familyText)) {
    questions.push(
      "五金挂扣是什么材质？是否会掉色、生锈或断裂？",
      "装饰件（如帽子、配件）是缝制还是胶粘？是否容易脱落？",
      "样品和大货在表情、颜色、尺寸上是否一致？",
      "包装方式是什么？运输中是否容易压变形？"
    );
  } else if (/收纳|箱|盒|架|筐|篮/.test(familyText)) {
    questions.push("尺寸、容量、承重和是否可叠放是否明确？", "包装如何保护、运输破损如何处理？");
  } else if (/发|夹|圈|饰|耳|链|镯/.test(familyText)) {
    questions.push("夹力 / 弹力、掉色、过敏风险和色差如何控制？", "批次一致性和包装是否稳定？");
  } else if (/手机|壳|支架|挂绳|数码/.test(familyText)) {
    questions.push("适配机型、开孔误差和图案耐磨如何保证？", "材质、手感和包装是否稳定？");
  } else if (/文创|贴纸|手帐|明信片|书签/.test(familyText)) {
    questions.push("印刷版权、材质、掉色和边缘裁切如何保证？", "包装和系列化补货是否稳定？");
  }
  if (brief.moq != null) {
    questions.push(`起订量约${brief.moq}件，是否支持小批量试单或混批不同款式？`);
  }
  questions.push("是否有现货、补货周期多久？破损、脱线、掉件、色差的售后规则是什么？");
  return uniqueList(questions, 7);
}

// 下一步执行动作：结合价格 / MOQ / 材质风险。
export function buildSpecificNextActions(brief) {
  const actions = [];
  if (brief.missing.length) {
    actions.push(`先补充：${brief.missing.slice(0, 4).join("、")}，信息越全报告越具体。`);
  }
  actions.push(
    brief.material
      ? `建议先拿样确认${brief.material}质感、尺寸和做工，再决定是否进货。`
      : `建议先拿样确认${brief.coreNoun}的材质、尺寸和做工，再决定是否进货。`
  );
  if (brief.moq != null && brief.moq > 0) {
    actions.push(`首批结合起订量约${brief.moq}件做小批量测款，避免一次性压货。`);
  } else {
    actions.push("首批建议小批量测款，确认真实需求后再补货。");
  }
  if (brief.materialRiskPoints.length) {
    actions.push(`供应商确认重点：${brief.materialRiskPoints.slice(0, 2).join("、")}`);
  }
  const channelText = brief.sellingChannels || "小红书 / 抖音";
  actions.push(`内容测款重点：在${channelText}用「${brief.coreNoun} + ${primaryScene(brief)}」验证点击、收藏和询价。`);
  actions.push("根据收藏、询价和复购数据决定是否补货。");
  if (brief.suggestedPrice == null || brief.moq == null) {
    actions.push("缺少价格和 MOQ，暂不判断拿货规模，请补充后再评估。");
  }
  return uniqueList(actions, 8);
}

// 搜索词：确保核心 / 场景 / 人群词来自当前商品，且为短词（不混入识别长句）。
export function enrichKeywordPlan(plan, brief) {
  const base = specializeDeep(plan || {}, brief);
  if (!brief.hasName) return sanitizeDisplayDeep(base);
  const shortOnly = (list) => uniqueList(list, 12).filter((w) => w && w.length <= 10);
  const coreInject = shortOnly([brief.shortNoun, brief.coreNoun, ...brief.useCases, ...brief.coreTerms]);
  const sceneInject = shortOnly([...brief.useCases, ...brief.sceneWords]);
  const audienceInject = brief.audienceShort ? [brief.audienceShort] : [];
  ["xhs", "douyin", "ecommerce"].forEach((platform) => {
    const p = base[platform];
    if (!p || typeof p !== "object") return;
    p.core = shortOnly([...coreInject, ...(p.core || [])]).slice(0, 6);
    if (sceneInject.length) p.scene = shortOnly([...sceneInject, ...audienceInject, ...(p.scene || [])]).slice(0, 6);
  });
  return sanitizeDisplayDeep(base);
}
