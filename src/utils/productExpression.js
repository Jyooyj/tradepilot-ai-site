// productExpression.js
// 商品信息表达层：把 currentProductContext 里“可能很长、带系统语言、带不确定识别结果”
// 的原始识别信息，整理成“适合展示和生成内容”的简洁商品表达，再供后续模块使用。
//
// 解决的问题：
// - 原始识别长句（“戴黄帽背书包企鹅毛绒钥匙扣挂件，产品形象为一只圆滚滚的灰白色小企鹅（或小鸟）…”）
//   被直接塞进标题/脚本/标签/封面，导致内容像系统说明书。
// 设计：
// - displayName 短而自然（≤16 字），shortName 更短（用于标题/口播）。
// - 视觉细节、材质、用途拆成列表，而不是堆成一句超长名词。
// - 不确定识别结果（“或小鸟”等）只进 uncertaintyNotes，不进正式文案。
// - 系统式表达（“产品形象为”“识别结果显示”等）从所有可见文案中剔除。
//
// 纯函数、无副作用、不依赖 React。

// 系统式 / 不可展示话术：不允许出现在标题、脚本、标签、封面、正文里。
export const FORBIDDEN_DISPLAY_PHRASES = [
  "产品形象为一只",
  "产品形象为",
  "产品形象是",
  "产品形象",
  "识别结果显示",
  "识别结果为",
  "识别结果",
  "图片识别显示",
  "图片识别结果",
  "图片识别",
  "系统识别为",
  "系统识别",
  "AI识别",
  "据图片显示",
  "当前商品上下文",
  "当前上下文",
  "上下文显示",
];

const COLOR_WORDS = ["灰白色", "灰白", "奶白色", "奶油色", "米白", "白色", "黑色", "粉色", "粉红", "黄色", "蓝色", "绿色", "棕色", "彩色", "透明", "渐变"];
const APPEARANCE_WORDS = ["圆滚滚", "胖乎乎", "胖嘟嘟", "迷你", "卡通", "可爱", "Q版", "萌系", "ins风", "网红款"];
const ACCESSORY_WORDS = ["黄帽", "贝雷帽", "安全帽", "帽子", "小书包", "书包带", "书包", "围巾", "披风"];
const MATERIAL_WORDS = ["毛绒", "绒毛", "长毛绒", "短毛绒", "合金扣", "金属扣", "五金扣", "合金", "金属", "不锈钢", "布料", "棉", "麻", "帆布", "填充棉", "填充", "塑料", "亚克力", "硅胶", "PVC", "ABS", "树脂", "木质", "实木", "木", "陶瓷", "玻璃", "纸"];

// 类目核心名词（用于压缩长名 / 生成短名 / 标签）。长词在前，优先匹配。
const CATEGORY_NOUNS = [
  "钥匙扣挂件", "毛绒挂件", "包包挂件", "书包挂件", "文创挂件", "手机挂件",
  "收纳盒", "收纳箱", "收纳架", "收纳篮", "桌面收纳",
  "手机壳", "手机支架", "数据线", "充电线",
  "大肠发圈", "发夹", "发卡", "发圈", "发绳", "耳夹", "耳环", "耳钉", "项链", "手链", "手绳", "手镯",
  "明信片", "贴纸", "书签", "笔袋", "手账本",
  "玩偶", "公仔", "摆件", "钥匙扣", "钥匙链", "挂件", "挂饰",
  "水杯", "杯子", "帽子", "笔", "包",
];

function toStr(v) {
  return v == null ? "" : String(v).trim();
}

function splitTokens(text) {
  return toStr(text)
    .split(/[\s,，、;；/|]+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function uniq(list, limit = 8) {
  const out = [];
  (list || []).forEach((item) => {
    const v = toStr(item);
    if (v && !out.includes(v)) out.push(v);
  });
  return limit ? out.slice(0, limit) : out;
}

// 移除系统式话术。
export function stripForbiddenPhrases(text) {
  let s = toStr(text);
  FORBIDDEN_DISPLAY_PHRASES.forEach((p) => {
    if (s.includes(p)) s = s.split(p).join("");
  });
  return s;
}

// 移除不确定识别结果括号（“（或小鸟）”“(或小鸟)”），返回 {text, uncertain[]}。
function extractUncertainty(text) {
  const uncertain = [];
  let s = toStr(text);
  const parenRe = /[（(][^（）()]*?或[^（）()]*?[)）]/g;
  const matches = s.match(parenRe) || [];
  matches.forEach((m) => {
    const inner = m.replace(/[（()）]/g, "").trim();
    if (inner) uncertain.push(inner);
  });
  s = s.replace(parenRe, "");
  // “企鹅或小鸟”这类无括号的二选一也视为不确定。
  const altRe = /([一-龥]{1,6})或([一-龥]{1,6})/g;
  let m;
  while ((m = altRe.exec(s)) !== null) {
    uncertain.push(`${m[1]}或${m[2]}`);
  }
  return { text: s, uncertain: uniq(uncertain, 5) };
}

// 清洗成可展示文本：去系统话术、去不确定括号、收尾标点。
export function toDisplayText(text) {
  let s = stripForbiddenPhrases(text);
  s = extractUncertainty(s).text;
  return s
    .replace(/[，。、,.;；:：]+$/g, "")
    .replace(/^[，。、,.;；:：\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// 剥离名称开头的外观/配饰描述（戴黄帽、背书包、颜色、形状词），移入视觉细节。
function stripLeadingDescriptors(name) {
  const visual = [];
  let s = name;
  const leadingPatterns = [
    /^头?戴[一-龥]{0,4}?帽子?/,
    /^背[一-龥]{0,4}?包/,
    /^挂[一-龥]{0,4}?包/,
  ];
  let changed = true;
  let guard = 0;
  while (changed && guard < 10) {
    changed = false;
    guard += 1;
    for (const re of leadingPatterns) {
      const m = s.match(re);
      if (m && s.startsWith(m[0])) {
        visual.push(m[0].replace(/^头?戴|^背|^挂/, ""));
        s = s.slice(m[0].length);
        changed = true;
        break;
      }
    }
    if (changed) continue;
    for (const w of [...COLOR_WORDS, ...APPEARANCE_WORDS]) {
      if (s.startsWith(w)) {
        visual.push(w);
        s = s.slice(w.length);
        changed = true;
        break;
      }
    }
  }
  return { rest: s.trim(), visual };
}

function findAll(text, dict) {
  return dict.filter((w) => text.includes(w));
}

// 从名称里抽取“主体词”（去掉材质、类目名词、颜色、外观后剩下的核心，如“企鹅”）。
function extractSubject(rest, { materials, categoryNouns, colors, appearances }) {
  let s = rest;
  [...categoryNouns, ...materials, ...colors, ...appearances, ...ACCESSORY_WORDS].forEach((w) => {
    if (w) s = s.split(w).join("");
  });
  s = s.replace(/[的了和与及,，、\s]/g, "").trim();
  // 主体词控制在 4 字以内更自然。
  if (s.length > 4) s = s.slice(0, 4);
  return s;
}

// 构建商品表达。
// contentContext：当前商品标准上下文（含 productName/category/material/audience/channel/productIdentity）。
// product：原始商品字段（用于材质/关键词/备注）。
export function buildProductExpression(contentContext = {}, product = {}) {
  const ctx = contentContext || {};
  const identity = ctx.productIdentity || {};
  const userProvidedName = toStr(product.name); // 用户/识别回填的原始名
  const rawName = toStr(ctx.productName || identity.displayName || userProvidedName);
  const category = toStr(ctx.category || identity.productTypeLabel || product.category);

  // 文本来源（用于抽取视觉/材质细节）
  const detailSource = `${rawName} ${toStr(product.material)} ${toStr(product.keywords)} ${toStr(product.note)} ${toStr(ctx.imageRecognitionSummary)}`;

  // 不确定识别结果
  const { uncertain } = extractUncertainty(detailSource);

  // 清洗名称
  const cleanedName = toDisplayText(rawName);
  const { rest, visual: leadingVisual } = stripLeadingDescriptors(cleanedName);

  const colors = findAll(detailSource, COLOR_WORDS);
  const appearances = findAll(detailSource, APPEARANCE_WORDS);
  const accessories = findAll(detailSource, ACCESSORY_WORDS);
  const materials = uniq(findAll(detailSource, MATERIAL_WORDS), 6);
  const categoryNounsFound = uniq(findAll(`${rest} ${cleanedName} ${category}`, CATEGORY_NOUNS), 4);

  // 视觉细节（卖点/素材建议用，不进标题主文案）
  const visualDetails = uniq([...leadingVisual, ...accessories, ...colors, ...appearances, ...materials.slice(0, 1)], 6);
  const materialDetails = uniq(materials, 5);

  const subject = extractSubject(rest || cleanedName, { materials, categoryNouns: categoryNounsFound, colors, appearances });
  const shortCategoryNoun =
    [...categoryNounsFound].sort((a, b) => a.length - b.length)[0] ||
    toStr(identity.fallbackTerm) ||
    "";

  // displayName：短而自然，≤16 字。
  let displayName = rest || cleanedName || toStr(identity.coreProductTerms?.[0]) || toStr(identity.productTypeLabel) || "该商品";
  if (displayName.length > 16) {
    // 优先保留“主体 + 材质 + 类目名词”
    const longest = [...categoryNounsFound].sort((a, b) => b.length - a.length)[0] || "";
    const compact = uniq([subject, materials[0], longest], 3).join("");
    displayName = (compact || displayName.slice(0, 16)).slice(0, 16);
  }

  // shortName：更短，用于标题/口播，≤8 字。
  let shortName = subject && shortCategoryNoun ? `${subject}${shortCategoryNoun}` : displayName;
  if (shortName.length > 8) shortName = (subject || displayName).slice(0, 6) + (shortCategoryNoun && subject ? "" : "");
  if (shortName.length > 8) shortName = shortName.slice(0, 8);
  if (!shortName) shortName = displayName.slice(0, 8);

  // contentName：稍有氛围但不长。
  let contentName = materials[0] && subject && shortCategoryNoun
    ? `${materials[0]}${subject}${shortCategoryNoun}`
    : displayName;
  if (contentName.length > 14) contentName = displayName;

  // 类目名
  const categoryName = toStr(identity.productTypeLabel) || uniq(categoryNounsFound, 2).join(" / ") || category || "待确认品类";

  // 使用场景（按类目家族推断，真实、可展示）
  const familyText = `${displayName} ${shortName} ${category} ${categoryNounsFound.join(" ")}`;
  let useCases = [];
  if (/挂件|挂饰|钥匙扣|钥匙链/.test(familyText)) {
    useCases = ["书包挂件", "钥匙扣", "包包装饰", "送同学小礼物"];
  } else if (/收纳|盒|箱|架|篮/.test(familyText)) {
    useCases = ["桌面收纳", "抽屉整理", "办公/宿舍收纳"];
  } else if (/发夹|发卡|发圈|发绳|发饰/.test(familyText)) {
    useCases = ["日常扎发", "通勤造型", "拍照出门"];
  } else if (/手机壳|手机支架|挂绳|数据线|数码/.test(familyText)) {
    useCases = ["手机保护", "拍照氛围感", "日常携带"];
  } else if (/贴纸|手账|明信片|书签|文创/.test(familyText)) {
    useCases = ["手账装饰", "书桌收藏", "送朋友小礼物"];
  } else {
    useCases = uniq(splitTokens(product.keywords), 4);
  }
  useCases = uniq(useCases, 5);

  // 目标人群（去掉所有括号补充 + 收短，避免把识别长句塞进文案）
  const audienceClean = toStr(ctx.audience || product.audience).replace(/[（(][^（）()]*[)）]/g, "");
  const audienceRaw = toDisplayText(audienceClean);
  const audienceParts = uniq(
    splitTokens(audienceRaw).filter((seg) => seg.length <= 8),
    3
  );
  const targetAudienceText = audienceParts.join("、");
  const audienceShort = audienceParts[0] || "";

  // 渠道适配文案
  const channel = toStr(ctx.channel || product.channel);
  const channelBits = [];
  if (/小红书|xhs/i.test(channel)) channelBits.push("小红书图文种草");
  if (/抖音|视频|快手/.test(channel)) channelBits.push("抖音短视频测款");
  if (/淘宝|天猫|京东|拼多多|电商|店铺/.test(channel)) channelBits.push("电商详情页");
  if (/校园|市集|摆摊|线下/.test(channel)) channelBits.push("校园市集 / 礼物场景");
  const channelFitText = channelBits.length
    ? `适合${channelBits.join("、")}`
    : "可优先用图文种草和小批量内容测款验证";

  // 不确定信息备注
  const uncertaintyNotes = [];
  uncertain.forEach((u) => {
    uncertaintyNotes.push(`识别结果可能不唯一（${u}），建议人工确认商品命名后再用于正式文案。`);
  });
  if (materialDetails.length) {
    uncertaintyNotes.push(`材质（${materialDetails.slice(0, 3).join(" / ")}）建议向供应商确认成分与做工。`);
  }

  return {
    displayName,
    shortName,
    contentName,
    categoryName,
    visualDetails,
    materialDetails,
    useCases,
    targetAudienceText,
    audienceShort,
    channelFitText,
    uncertaintyNotes: uniq(uncertaintyNotes, 4),
    forbiddenDisplayPhrases: FORBIDDEN_DISPLAY_PHRASES,
    // 供历史污染拦截器作为“当前商品合法词”白名单（防止误删 书包挂件/钥匙扣 等真实用途词）。
    contextWhitelistText: uniq(
      [displayName, shortName, contentName, ...visualDetails, ...materialDetails, ...useCases],
      30
    ).join(" "),
  };
}

// 递归剔除可见文案里的系统话术与不确定括号（最终兜底）。
export function sanitizeDisplayDeep(value) {
  if (typeof value === "string") return toDisplayText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeDisplayDeep(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeDisplayDeep(v)]));
  }
  return value;
}

// 清洗标签：去 #、去系统话术，过滤超过 12 字或像句子的标签。
export function cleanHashtags(tags, max = 9) {
  const out = [];
  (tags || []).forEach((tag) => {
    let t = toDisplayText(String(tag || "")).replace(/^#+/, "").trim();
    if (!t) return;
    // 过长或含句子标点的，丢弃（标签不能是长句）。
    if (t.length > 12) return;
    if (/[，。！？、,.!?；;：:]/.test(t)) return;
    if (!out.includes(t)) out.push(t);
  });
  return out.slice(0, max).map((t) => `#${t}`);
}
