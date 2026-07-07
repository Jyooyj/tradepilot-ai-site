const FORBIDDEN_OUTPUT_KEYS = new Set([
  "douyin_hooks",
  "douyin_script",
  "oral_script",
  "shot_script",
  "video_script",
  "short_video",
  "title_raw",
  "opening_raw",
  "references",
  "originalText",
  "rawTitle",
  "rawOpening",
]);

const UNSAFE_CLAIM_REPLACEMENTS = [
  [/很多人都说|大家都在买/g, "可按实际需求判断"],
  [/爆卖|卖疯了?|万人下单/g, "可作为测款方向"],
  [/点赞过万|收藏过万/g, "互动数据需实际验证"],
  [/全网最低/g, "价格以实际信息为准"],
  [/必买/g, "可按需求考虑"],
  [/100\s*%\s*有效/gi, "实际效果需验证"],
];

const XHS_PACKAGE_LIST_LIMITS = {
  titles: 5,
  cover_texts: 5,
  openings: 3,
  body_outline: 8,
  ending_guides: 3,
  hashtags: 8,
  image_suggestions: 5,
  layout_suggestions: 8,
  core_lines: 8,
  pain_points: 6,
  scene_lines: 6,
  audience_lines: 6,
  selling_points_used: 10,
  safety_notes: 12,
};

function cleanText(value, limit = 3000) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, limit);
}

function splitList(value) {
  return Array.isArray(value) ? value : String(value ?? "").split(/[\n|；;]/);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function avoidPhrasesFromBrief(brief = {}) {
  return String(brief.avoid || "")
    .split(/[，,、；;\n]/)
    .map((item) => cleanText(item, 80))
    .filter((item) => item.length >= 2);
}

export function sanitizeXiaohongshuGeneratedText(value, brief = {}, limit = 3000) {
  let result = cleanText(value, limit);
  for (const [pattern, replacement] of UNSAFE_CLAIM_REPLACEMENTS) result = result.replace(pattern, replacement);
  for (const phrase of avoidPhrasesFromBrief(brief)) result = result.split(phrase).join("");
  return result.replace(/\s{3,}/g, "  ").trim();
}

function safeList(value, fallback, limit, brief = {}) {
  const normalized = unique(splitList(value).map((item) => sanitizeXiaohongshuGeneratedText(item, brief, 500)).filter(Boolean));
  const fallbackItems = splitList(fallback).map((item) => sanitizeXiaohongshuGeneratedText(item, brief, 500)).filter(Boolean);
  return unique([...normalized, ...fallbackItems]).slice(0, limit);
}

function normalizeHashtag(value) {
  return cleanText(value, 50).replace(/^#+/, "").replace(/\s+/g, "");
}

function topicText(brief = {}) {
  return cleanText(brief.topic || brief.productName, 80) || "【商品名】";
}

function audienceText(brief = {}) {
  return cleanText(brief.audience, 100) || "【目标人群】";
}

function sceneText(brief = {}) {
  return cleanText(brief.scene || brief.goal, 120) || "日常上课、通勤或拍照";
}

function verifiedSellingPoints(brief = {}) {
  return unique(
    String(brief.keyPoints || "")
      .split(/[，,、；;\n]/)
      .map((item) => cleanText(item, 120))
      .filter(Boolean),
  ).slice(0, 8);
}

function defaultSafetyNotes(brief = {}) {
  const notes = [
    "只使用商品简报中已经核实的事实",
    "没有价格时不写具体价格",
    "没有材质时不编造材质",
    "不虚构销量、点赞、收藏、成交或用户反馈",
    "不使用全网最低、必买或绝对功效表达",
    "发布前人工核对商品信息和平台规则",
  ];
  if (cleanText(brief.avoid)) notes.push(`同时避开：${cleanText(brief.avoid, 240)}`);
  return notes;
}

export function buildLocalXiaohongshuCopywritingPackage({ pattern = {}, brief = {} } = {}) {
  const topic = topicText(brief);
  const audience = audienceText(brief);
  const scene = sceneText(brief);
  const sellingPoints = verifiedSellingPoints(brief);
  const sellingPointLine = sellingPoints.length
    ? sellingPoints.join("、")
    : "具体卖点请以已经核实的商品信息为准";
  const priceLine = cleanText(brief.price, 80) ? `已核实价格信息：${cleanText(brief.price, 80)}。` : "";
  const materialLine = cleanText(brief.material, 100) ? `已核实材质信息：${cleanText(brief.material, 100)}。` : "";

  const fallback = {
    xiaohongshu: {
      titles: [
        `${topic}怎么选？先看自己的真实使用场景`,
        `给${audience}的${topic}选择笔记`,
        `${scene}里，${topic}值不值得先测`,
        `${topic}的几个实用选择重点`,
        `想测试${topic}，可以先从这几个角度开始`,
      ],
      cover_texts: [
        `${topic}怎么选`,
        `先看使用场景`,
        `适合${audience}`,
        `低风险测款思路`,
        `卖点这样表达`,
      ],
      openings: [
        `如果你平时在${scene}时总觉得少一点细节，可以先看看这种${topic}。`,
        `挑${topic}时，真正影响使用感受的往往不是热闹的宣传，而是它是否适合自己的日常场景。`,
        `这次想用更克制的方式测试${topic}：先说清楚适合谁、解决什么问题，再决定要不要继续测。`,
      ],
      body: [
        `如果你平时在${scene}时总觉得少一点细节，可以先看看这种${topic}。`,
        "选这类商品时，常见的问题是只看到外观或一句卖点，却没有先确认它是否适合自己的真实使用需求。",
        `这次可以重点关注：${sellingPointLine}。${priceLine}${materialLine}`,
        `比较适合：\n- ${audience}\n- 有${scene}需求的人\n- 想先小范围验证内容反馈的人`,
        `如果用于测款，建议先从 2–3 个款式或表达角度开始，不要一开始压太多库存。内容可以分别测试人群、场景和已核实卖点，再根据真实评论、收藏或询问信号复盘。`,
        `你在选择${topic}时，更在意使用场景还是具体卖点？`,
      ].filter(Boolean).join("\n\n"),
      body_outline: ["生活化开头", "说明真实痛点", "展示已核实卖点", "说明适用人群与场景", "给出低风险测款建议", "结尾互动"],
      ending_guides: [
        `你在选择${topic}时最在意哪一点？`,
        "你更想看哪种使用场景的实测表达？",
        "如果做下一轮测款，你会优先测试哪个卖点？",
      ],
      hashtags: [topic, "小红书种草", "好物分享", "日常好物", "生活灵感", "测款记录", "场景搭配", "理性消费"].map(normalizeHashtag),
      image_suggestions: [
        "首图展示商品主体和一个明确使用场景",
        "补一张能看清尺寸或比例关系的画面",
        "用细节图对应已核实卖点",
        "加入不同日常场景的搭配或使用画面",
        "结尾图用简洁文字总结适合人群和选择重点",
      ],
      layout_suggestions: [
        "首屏先给商品与场景，不堆叠过多文字",
        "正文每段只表达一个重点",
        "卖点使用短句或项目符号呈现",
        "人群、场景、测款建议分别成段",
        "结尾保留一个具体互动问题",
      ],
    },
    selling_points: {
      core_lines: sellingPoints.length ? sellingPoints : ["具体卖点需根据已核实信息补充"],
      pain_points: ["避免只讲宣传口号而不说明真实使用场景"],
      scene_lines: [scene],
      audience_lines: [audience],
    },
    generation_basis: {
      pattern_type: cleanText(pattern.hook_type || pattern.name, 120) || "通用种草型",
      platform_style: "小红书图文",
      target_audience: audience,
      selling_points_used: sellingPoints,
      safety_notes: defaultSafetyNotes(brief),
    },
  };
  return normalizeXiaohongshuCopywritingPackage(fallback, brief);
}

export function normalizeXiaohongshuCopywritingPackage(value = {}, brief = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const xhs = source.xiaohongshu && typeof source.xiaohongshu === "object" ? source.xiaohongshu : {};
  const selling = source.selling_points && typeof source.selling_points === "object" ? source.selling_points : {};
  const basis = source.generation_basis && typeof source.generation_basis === "object" ? source.generation_basis : {};
  const hasInput = Object.keys(source).length > 0;
  const fallback = hasInput ? buildFallbackListsOnly(brief) : buildFallbackListsOnly({ topic: "" }, true);

  return {
    xiaohongshu: {
      titles: safeList(xhs.titles, fallback.titles, XHS_PACKAGE_LIST_LIMITS.titles, brief),
      cover_texts: safeList(xhs.cover_texts, fallback.cover_texts, XHS_PACKAGE_LIST_LIMITS.cover_texts, brief),
      openings: safeList(xhs.openings, fallback.openings, XHS_PACKAGE_LIST_LIMITS.openings, brief),
      body: sanitizeXiaohongshuGeneratedText(xhs.body, brief, 6000),
      body_outline: safeList(xhs.body_outline, fallback.body_outline, XHS_PACKAGE_LIST_LIMITS.body_outline, brief),
      ending_guides: safeList(xhs.ending_guides, fallback.ending_guides, XHS_PACKAGE_LIST_LIMITS.ending_guides, brief),
      hashtags: unique(safeList(xhs.hashtags, fallback.hashtags, XHS_PACKAGE_LIST_LIMITS.hashtags, brief).map(normalizeHashtag)).slice(0, 8),
      image_suggestions: safeList(xhs.image_suggestions, fallback.image_suggestions, XHS_PACKAGE_LIST_LIMITS.image_suggestions, brief),
      layout_suggestions: safeList(xhs.layout_suggestions, fallback.layout_suggestions, XHS_PACKAGE_LIST_LIMITS.layout_suggestions, brief),
    },
    selling_points: {
      core_lines: safeList(selling.core_lines, [], XHS_PACKAGE_LIST_LIMITS.core_lines, brief),
      pain_points: safeList(selling.pain_points, [], XHS_PACKAGE_LIST_LIMITS.pain_points, brief),
      scene_lines: safeList(selling.scene_lines, [], XHS_PACKAGE_LIST_LIMITS.scene_lines, brief),
      audience_lines: safeList(selling.audience_lines, [], XHS_PACKAGE_LIST_LIMITS.audience_lines, brief),
    },
    generation_basis: {
      pattern_type: sanitizeXiaohongshuGeneratedText(basis.pattern_type, brief, 120),
      platform_style: "小红书图文",
      target_audience: sanitizeXiaohongshuGeneratedText(basis.target_audience || brief.audience, brief, 200),
      selling_points_used: safeList(basis.selling_points_used, verifiedSellingPoints(brief), XHS_PACKAGE_LIST_LIMITS.selling_points_used, brief),
      safety_notes: safeList(basis.safety_notes, defaultSafetyNotes(brief), XHS_PACKAGE_LIST_LIMITS.safety_notes, brief),
    },
  };
}

export function mergeXiaohongshuCopywritingPackage(value = {}, fallback = {}, brief = {}) {
  const source = value && typeof value === "object" ? value : {};
  return normalizeXiaohongshuCopywritingPackage({
    xiaohongshu: { ...(fallback.xiaohongshu || {}), ...(source.xiaohongshu || {}) },
    selling_points: { ...(fallback.selling_points || {}), ...(source.selling_points || {}) },
    generation_basis: { ...(fallback.generation_basis || {}), ...(source.generation_basis || {}) },
  }, brief);
}

function buildFallbackListsOnly(brief = {}, empty = false) {
  if (empty) {
    return {
      titles: [], cover_texts: [], openings: [], body_outline: [], ending_guides: [], hashtags: [],
      image_suggestions: [], layout_suggestions: [],
    };
  }
  const topic = topicText(brief);
  return {
    titles: [`${topic}怎么选？先看真实使用场景`, `给【目标人群】的${topic}选择笔记`, `${topic}的实用选择重点`, `想测试${topic}，先看这几个角度`, `${topic}适合哪些日常场景`],
    cover_texts: [`${topic}怎么选`, "先看使用场景", "适合哪些人", "低风险测款", "卖点这样表达"],
    openings: [`如果你正在挑${topic}，可以先从自己的日常使用场景开始判断。`, `选择${topic}时，先确认需求，再看已经核实的卖点。`, `这次用更克制的方式聊聊${topic}适合谁。`],
    body_outline: ["生活化开头", "说明痛点", "展示已核实卖点", "适用场景", "测款建议", "互动结尾"],
    ending_guides: ["你最在意哪个选择重点？", "你更想看哪种使用场景？", "下一轮应该先测哪个卖点？"],
    hashtags: [topic, "小红书种草", "好物分享", "日常好物", "生活灵感", "测款记录", "场景搭配", "理性消费"],
    image_suggestions: ["商品与场景首图", "尺寸或比例图", "已核实卖点细节图", "日常使用场景图", "适合人群总结图"],
    layout_suggestions: ["首图突出商品与场景", "正文短段落", "卖点项目符号化", "人群和场景分段", "结尾保留互动问题"],
  };
}

export function containsForbiddenCopywritingFields(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_OUTPUT_KEYS.has(key)) return true;
    if (child && typeof child === "object" && containsForbiddenCopywritingFields(child)) return true;
  }
  return false;
}

export function flattenCopywritingPackageText(value) {
  const strings = [];
  function visit(item) {
    if (typeof item === "string") strings.push(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === "object") Object.values(item).forEach(visit);
  }
  visit(value);
  return strings;
}
