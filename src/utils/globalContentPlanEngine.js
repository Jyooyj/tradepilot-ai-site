// globalContentPlanEngine.js
// TradePilot Global · 跨境内容测款方案（Global Content Test Plan）
// 纯前端规则引擎，离线运行，不依赖任何后端 AI 接口或 API Key。
// 用于 Demo 阶段在 TikTok / 独立站场景下生成跨境内容测款示例，供评委静态托管页面完整体验。
// 输出内容仅为示例，不构成实际销售承诺，正式投放前需结合目标市场平台规则和合规要求人工复核。

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(text).join(" ");
  return String(value).trim();
}

// 品类跨境内容模板：基于 categoryKey 选择 TikTok 视频选题、独立站卖点、目标人群与场景。
const CATEGORY_CONTENT_PROFILE = {
  jewelry: {
    productTypeEn: "Fashion Jewelry / Hair Accessory",
    primaryScenarios: ["通勤穿搭", "约会造型", "低预算礼物", "校园日常"],
    sellingAngles: ["佩戴效果", "材质质感", "礼物包装", "穿搭适配", "过敏说明"],
    tiktokAngles: [
      { theme: "佩戴前后对比", hook: "Stop scrolling if your outfit feels off today", focus: "通勤场景下加配饰后的整体观感" },
      { theme: "礼物开箱", hook: "POV: your friend asks where you got this", focus: "包装、配件与拆箱体验" },
      { theme: "材质特写", hook: "Look at this detail before you buy", focus: "扣头、光泽、材质安全说明" },
    ],
    unsuitableScenarios: ["医美/医疗宣称场景", "涉及正品牌号仿款对比", "对过敏人群承诺无反应"],
    complianceFocus: ["避免功效/抗敏/医疗暗示", "需声明材质而非宣称疗效", "避免品牌同款/1:1/复刻等侵权表达"],
  },
  hair_accessory: {
    productTypeEn: "Hair Accessory / Scrunchie",
    primaryScenarios: ["通勤扎发", "校园穿搭", "宿舍日常", "上课发型"],
    sellingAngles: ["上头效果", "颜色组合", "套装销售", "弹力与舒适", "校园拼单"],
    tiktokAngles: [
      { theme: "上头前后对比", hook: "5 second hairstyle upgrade", focus: "佩戴前后整体气质变化" },
      { theme: "颜色矩阵展示", hook: "Which color matches your vibe today", focus: "套装颜色矩阵与场景搭配" },
      { theme: "宿舍拼单场景", hook: "Roommate haul under $5", focus: "套装价 + 校园拼单逻辑" },
    ],
    unsuitableScenarios: ["宣称防脱发/治疗发量", "对发质改善做绝对化承诺", "涉及未成年敏感暗示"],
    complianceFocus: ["避免宣称防脱发/治疗功效", "颜色主观差异需提前说明", "避免与品牌联名款做对比"],
  },
  home_lifestyle: {
    productTypeEn: "Home & Lifestyle Decor",
    primaryScenarios: ["宿舍桌面", "办公桌搭", "床头氛围", "礼物场景"],
    sellingAngles: ["氛围感", "尺寸参照", "包装保护", "运费说明", "适用空间"],
    tiktokAngles: [
      { theme: "宿舍桌面改造", hook: "Watch this desk glow up in 10s", focus: "桌搭前后氛围对比" },
      { theme: "尺寸与包装说明", hook: "Real size, real packaging, no filter", focus: "尺寸参照 + 包装保护说明" },
      { theme: "氛围感礼物", hook: "Gift idea under $20 that feels expensive", focus: "礼物开箱与氛围演示" },
    ],
    unsuitableScenarios: ["宣称香薰治疗/助眠功效", "易碎品不做包装保护提示", "对空间适用做绝对化承诺"],
    complianceFocus: ["避免香薰/精油宣称疗效或助眠", "需说明尺寸与易碎风险", "避免使用'最'、'第一'等绝对化表达"],
  },
  stationery_cultural: {
    productTypeEn: "Cultural Stationery / Sticker",
    primaryScenarios: ["手帐拼贴", "旅行纪念", "校园市集", "礼物收藏"],
    sellingAngles: ["文化故事", "套装收藏", "主题系列", "手作感", "低预算礼物"],
    tiktokAngles: [
      { theme: "主题故事讲解", hook: "The story behind this sticker set", focus: "设计故事与主题系列" },
      { theme: "手帐拼贴演示", hook: "Journaling with this set", focus: "实际拼贴场景与质感" },
      { theme: "旅行纪念场景", hook: "Souvenir idea from this city", focus: "文旅纪念 + 礼物属性" },
    ],
    unsuitableScenarios: ["涉及版权IP形象直接挪用", "宣称文化治愈功效", "对收藏价值做绝对化承诺"],
    complianceFocus: ["需确认版权与IP授权链路", "避免宣称文化/治愈功效", "避免使用'限量限定'等无依据表达"],
  },
  phone_accessory: {
    productTypeEn: "Phone Accessory / Case",
    primaryScenarios: ["通勤携带", "拍照支架", "机型适配", "个性搭配"],
    sellingAngles: ["机型适配", "防摔演示", "支架角度", "按键孔位", "个性化"],
    tiktokAngles: [
      { theme: "防摔/承重演示", hook: "Drop test before you buy", focus: "防摔或挂绳承重演示" },
      { theme: "机型适配说明", hook: "Does it fit your phone? Check this", focus: "适配机型清单 + 孔位细节" },
      { theme: "通勤场景演示", hook: "POV: a day out with this phone case", focus: "通勤/拍照/携带场景" },
    ],
    unsuitableScenarios: ["宣称防摔100%无破损", "兼容所有机型无差异", "涉及品牌联名款仿冒"],
    complianceFocus: ["避免宣称绝对防摔/防水", "需明确适配机型清单", "避免与品牌联名款做对比"],
  },
  daily_necessity: {
    productTypeEn: "Daily Necessity / Household",
    primaryScenarios: ["宿舍日用", "家庭收纳", "办公室好物", "组合装拼单"],
    sellingAngles: ["使用前后对比", "组合装价值", "复购便利", "低价实用", "场景适配"],
    tiktokAngles: [
      { theme: "使用前后对比", hook: "Before & after, you decide", focus: "痛点 + 解决方案对比" },
      { theme: "组合装演示", hook: "Bulk haul that actually saves money", focus: "组合装拆箱与日常使用" },
      { theme: "宿舍/办公室场景", hook: "Dorm essentials under $10", focus: "宿舍或办公室场景应用" },
    ],
    unsuitableScenarios: ["宣称清洁/杀菌/消毒功效", "对食品接触安全做无依据承诺", "对儿童使用不做提示"],
    complianceFocus: ["避免宣称杀菌/消毒/医疗功效", "若涉及儿童使用需说明", "避免'最便宜'等绝对化表达"],
  },
  unknown: {
    productTypeEn: "Lifestyle Product",
    primaryScenarios: ["日常使用", "礼物场景", "低预算尝鲜"],
    sellingAngles: ["使用场景", "价格优势", "便携性", "视觉吸引力", "礼物属性"],
    tiktokAngles: [
      { theme: "痛点解决", hook: "Ever struggled with this?", focus: "痛点对比 + 解决方案" },
      { theme: "场景演示", hook: "POV: a day with this", focus: "场景化使用演示" },
      { theme: "性价比对比", hook: "Is it worth the price?", focus: "性价比 + 礼物属性" },
    ],
    unsuitableScenarios: ["涉及医疗/功效宣称", "对儿童/母婴做无依据承诺", "宣称绝对化效果"],
    complianceFocus: ["避免绝对化承诺", "避免功效宣称", "避免品牌侵权或敏感表达"],
  },
};

const COMMON_LOCALIZATION_NOTES = [
  "避免直译中文营销话术，例如'绝绝子'、'闭眼入'、'YYDS'，海外用户难以理解且易被算法判为低质内容。",
  "避免使用'第一'、'最'、'100%'、'guaranteed'等绝对化承诺，TikTok Shop / 独立站平台对绝对化表达审核严格。",
  "注意文化差异：海外用户对礼物的理解偏向个人化、轻量化，避免强调'孝敬长辈'等中式情感话术。",
  "避免品牌侵权：不要在标题/标签里使用品牌联名、复刻、1:1、a货等表达，否则可能被平台直接下架。",
  "避免平台敏感表达：'whitening'、'anti-aging'、'treatment'、'cure'等功效词在美区/欧洲区审核严格，建议改用中性描述。",
  "如涉及食品、口服、儿童、母婴、电子、电池类目，需额外确认目标市场认证（FDA / CE / CPSIA / FCC 等）。",
];

const COMMON_UNSUITABLE = [
  "宣称医疗、治疗、功效类场景",
  "对儿童/母婴/食品接触做无依据安全承诺",
  "与品牌联名/IP 形象做对比或挪用",
];

// 根据价格带推断 TikTok 起手钩子的语言侧重。
function getPriceTone(price) {
  if (!price) return { tone: "value", label: "中低价带" };
  if (price < 9.9) return { tone: "ultra_low", label: "超低价带（冲动决策）" };
  if (price <= 29.9) return { tone: "low", label: "低价带（适合测款）" };
  if (price <= 79) return { tone: "mid", label: "中价带（需场景支撑）" };
  return { tone: "high", label: "中高价带（需故事/信任）" };
}

// 将品类 TikTok 角度展开为带四要素的完整选题方向。
function buildTiktokDirections(profile, product, priceTone) {
  const productName = text(product?.name) || "this product";
  const audience = text(product?.audience) || "海外年轻消费者";

  return profile.tiktokAngles.map((angle, index) => {
    const hookChinese = angle.hook;
    const coreFocus = angle.focus;
    // 镜头建议：前 1.5 秒抓注意、3-7 秒展示细节、8-13 秒场景演示、结尾引导评论。
    const shotSuggestion =
      index === 0
        ? "0-1.5s 用对比/痛点抓注意，3-7s 特写核心细节，8-13s 切到使用场景，结尾给出评论引导。"
        : index === 1
          ? "0-1.5s 直接进入场景演示，3-7s 用近景展示材质/做工，8-13s 切换第二场景，结尾给出选择题引导评论。"
          : "0-1.5s 提出问题或礼物角度，3-7s 展示包装/配件，8-13s 展示实际使用，结尾邀请评论区投票。";

    const commentPrompt =
      priceTone.tone === "ultra_low" || priceTone.tone === "low"
        ? "评论区引导：'Which color would you pick? Comment A/B/C.'"
        : priceTone.tone === "mid"
          ? "评论区引导：'Tag someone who needs this.'"
          : "评论区引导：'Would you gift this or keep it? Tell us below.'";

    return {
      title: `选题方向${index + 1}｜${angle.theme}`,
      hook: `${hookChinese}`,
      coreSellingPoint: `核心卖点：${coreFocus}，目标人群 ${audience}。`,
      shotSuggestion,
      commentPrompt,
      englishExample: `Hook EN: "${hookChinese}". Focus: ${coreFocus}.`,
    };
  });
}

// 生成 3-5 条独立站商品页卖点（不夸大、不绝对化）。
function buildSiteSellingPoints(profile, product, result, priceTone) {
  const price = num(result?.effectivePrice?.price ?? product?.price);
  const cost = num(result?.effectivePrice?.cost ?? product?.cost);
  const productName = text(product?.name) || "this product";

  const points = [];

  // 1. 使用场景卖点
  points.push(
    `使用场景：${profile.primaryScenarios.slice(0, 2).join("、")}，可作为日常搭配或礼物选项。`,
  );

  // 2. 价格优势（不做绝对化）
  if (price > 0) {
    if (priceTone.tone === "ultra_low" || priceTone.tone === "low") {
      points.push(
        `价格优势：零售价 ¥${price.toFixed(2)} 处于冲动决策区间，适合海外用户低价尝试，单件履约成本可控。`,
      );
    } else if (priceTone.tone === "mid") {
      points.push(
        `价格定位：零售价 ¥${price.toFixed(2)} 处于中价带，建议通过场景化内容与礼物属性支撑客单。`,
      );
    } else {
      points.push(
        `价格定位：零售价 ¥${price.toFixed(2)}，需配合故事感/材质信任感内容，建议独立站 + TikTok 双渠道种草。`,
      );
    }
  }

  // 3. 礼物属性
  if (profile.sellingAngles.includes("礼物包装") || profile.sellingAngles.includes("礼物属性")) {
    points.push(
      "礼物属性：轻量、低客单、视觉吸引力强，适合作为朋友/同事/校园场景的小礼物，可考虑增加礼盒包装选项。",
    );
  }

  // 4. 便携性
  if (profile.sellingAngles.includes("便携性") || /便携|轻|小|随身/.test(text(product?.note) + text(product?.logistics))) {
    points.push(
      "便携性：体积小、重量轻，跨境小包物流成本可控，便于海外用户随身携带与日常使用。",
    );
  }

  // 5. 视觉吸引力
  points.push(
    "视觉吸引力：建议独立站主图采用真实使用场景 + 细节特写组合，避免纯白底平铺，提升海外用户的购买决策效率。",
  );

  return points.slice(0, 5);
}

// 生成目标人群表达。
function buildTargetAudience(profile, product) {
  const audience = text(product?.audience);
  const suitablePeople = [];
  if (audience) {
    suitablePeople.push(`${audience}`);
  }
  suitablePeople.push(
    "TikTok / 独立站主流冲动消费人群（18-34 岁，偏好低客单 + 视觉种草）",
    "喜欢轻量礼物 / 校园 / 通勤场景的海外年轻消费者",
  );

  const suitableScenarios = profile.primaryScenarios.slice();
  const unsuitableScenarios = Array.from(new Set([...profile.unsuitableScenarios, ...COMMON_UNSUITABLE]));

  return {
    suitablePeople: suitablePeople.slice(0, 3),
    suitableScenarios: suitableScenarios.slice(0, 3),
    unsuitableScenarios: unsuitableScenarios.slice(0, 4),
  };
}

// 生成跨境本地化注意事项。
function buildLocalizationNotes(profile) {
  const notes = [...COMMON_LOCALIZATION_NOTES];
  profile.complianceFocus.forEach((note) => {
    if (!notes.includes(note)) notes.push(note);
  });
  return notes.slice(0, 6);
}

// 生成纯文本可复制版本。
export function buildGlobalContentPlanText(plan) {
  if (!plan) return "";
  const lines = [];
  lines.push("=== 跨境内容测款方案 / Global Content Test Plan ===");
  lines.push(`商品：${plan.productName}`);
  lines.push(`品类：${plan.productTypeLabel}`);
  lines.push(`价格带：${plan.priceToneLabel}`);
  lines.push("");

  lines.push("【1. TikTok 短视频方向】");
  plan.tiktokDirections.forEach((dir, i) => {
    lines.push(`方向${i + 1}：${dir.title}`);
    lines.push(`  开头钩子：${dir.hook}`);
    lines.push(`  核心卖点：${dir.coreSellingPoint}`);
    lines.push(`  镜头建议：${dir.shotSuggestion}`);
    lines.push(`  评论引导：${dir.commentPrompt}`);
    lines.push(`  英文示例：${dir.englishExample}`);
    lines.push("");
  });

  lines.push("【2. 独立站商品页卖点】");
  plan.siteSellingPoints.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  lines.push("");

  lines.push("【3. 目标人群表达】");
  lines.push("适合人群：");
  plan.targetAudience.suitablePeople.forEach((p) => lines.push(`  - ${p}`));
  lines.push("适合场景：");
  plan.targetAudience.suitableScenarios.forEach((s) => lines.push(`  - ${s}`));
  lines.push("不适合场景：");
  plan.targetAudience.unsuitableScenarios.forEach((s) => lines.push(`  - ${s}`));
  lines.push("");

  lines.push("【4. 本地化注意事项】");
  plan.localizationNotes.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
  lines.push("");

  lines.push(`说明：${plan.disclaimer}`);
  return lines.join("\n");
}

// 主入口：根据 product + result 生成跨境内容测款方案（离线兜底）。
export function generateGlobalContentPlan(product, result) {
  const safeProduct = product && typeof product === "object" ? product : {};
  const safeResult = result && typeof result === "object" ? result : {};

  const categoryKey = safeResult.categoryKey || "unknown";
  const profile = CATEGORY_CONTENT_PROFILE[categoryKey] || CATEGORY_CONTENT_PROFILE.unknown;

  const productName =
    text(safeProduct.name) ||
    text(safeResult.productIdentity?.displayName) ||
    text(safeResult.productExpression?.displayName) ||
    "未命名产品";

  const productTypeLabel =
    text(safeResult.productIdentity?.productTypeLabel) ||
    text(safeProduct.category) ||
    profile.productTypeEn;

  const price = num(safeResult.effectivePrice?.price ?? safeProduct.price);
  const priceTone = getPriceTone(price);

  const tiktokDirections = buildTiktokDirections(profile, safeProduct, priceTone);
  const siteSellingPoints = buildSiteSellingPoints(profile, safeProduct, safeResult, priceTone);
  const targetAudience = buildTargetAudience(profile, safeProduct);
  const localizationNotes = buildLocalizationNotes(profile);

  return {
    productName,
    productTypeLabel,
    productTypeEn: profile.productTypeEn,
    priceToneLabel: priceTone.label,
    tiktokDirections,
    siteSellingPoints,
    targetAudience,
    localizationNotes,
    disclaimer:
      "本方案为 Demo 阶段跨境内容测款示例，由前端规则引擎离线生成，不依赖外部 AI 接口；不构成实际销售承诺，正式投放前请结合目标市场平台规则、合规要求和物流成本人工复核。",
    source: "rule-based-fallback-v1",
    generatedAt: new Date().toISOString(),
  };
}

export const GLOBAL_CONTENT_PLAN_DISCLAIMER =
  "本方案为 Demo 阶段跨境内容测款示例，由前端规则引擎离线生成，不依赖外部 AI 接口；不构成实际销售承诺，正式投放前请结合目标市场平台规则、合规要求和物流成本人工复核。";
