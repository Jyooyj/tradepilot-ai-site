import React, { useMemo, useState } from "react";
import { demoProducts } from "./src/constants/demoData";
import {
  categoryTemplates,
  categoryTermRules,
  productIdentityProfiles,
} from "./src/constants/productConfig";
import {
  contextRequiredModules,
  supplierQuestionTemplates,
  testDecisionStandardTemplates,
} from "./src/constants/contentTemplates";
import {
  IMAGE_COMPRESSION_OPTIONS,
  IMAGE_RECOGNITION_FALLBACK_MESSAGE,
  IMAGE_TOO_LARGE_FALLBACK_MESSAGE,
  feedbackFormUrl,
  flowSteps,
  painPoints,
  statusOptions,
} from "./src/constants/uiContent";
import CoverCard from "./src/components/CoverCard";
import FloatingFeedback from "./src/components/FloatingFeedback";
import OperateView from "./src/components/OperateView";
import ResultView from "./src/components/ResultView";
import HistoryView from "./src/components/HistoryView";
import PKView from "./src/components/PKView";
import ReviewView from "./src/components/ReviewView";
import DemoView from "./src/components/DemoView";
import {
  cleanFileName,
  generateHtmlReport,
  generateProductLibraryWordDocument,
} from "./src/utils/reportUtils";


const ANALYZE_IMAGE_ENDPOINT =
  import.meta.env.VITE_ANALYZE_IMAGE_URL || "/api/analyze-image";

export const initialProduct = {
  name: "蝴蝶结珍珠耳夹",
  category: "饰品 / 小商品",
  cost: "3.8",
  price: "19.9",
  moq: "100",
  material: "合金 + 仿珍珠",
  audience: "18-25岁女生、学生党、通勤人群",
  channel: "小红书 / 抖音 / 校园私域",
  supplier: "支持混批，7天补货，可定制包装",
  keywords: "温柔风、法式、不打耳洞、学生党、春夏氛围感",
  competitorPrice: "15.9-29.9元",
  logistics: "小件轻货，包装成本低",
  note: "适合春夏穿搭、校园摆摊、礼物场景，建议先拿样拍图测款。",
};

export const blankProduct = {
  name: "",
  category: "",
  cost: "",
  price: "",
  moq: "",
  material: "",
  audience: "",
  channel: "",
  supplier: "",
  keywords: "",
  competitorPrice: "",
  logistics: "",
  note: "",
};


export function n(value) {
  const parsed = parseNumberValue(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function moneyDisplay(value) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(2)).toString();
}

function parseNumberValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").replace(/,/g, "").trim();
  if (!text) return 0;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parsePriceRangeValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").replace(/,/g, "").trim();
  if (!text) return 0;
  const matches = text.match(/\d+(?:\.\d+)?/g) || [];
  const numbers = matches.map(Number).filter(Number.isFinite);
  if (!numbers.length) return 0;
  if (numbers.length >= 2) return (numbers[0] + numbers[1]) / 2;
  return numbers[0];
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const parsed = parseNumberValue(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

export function getEffectivePrice(product = {}, reportContext = {}) {
  const userPrice = pickFirstNumber(product.price, product.suggestedPrice, product.sellingPrice, product.recommendedPrice);
  const contextPrice = pickFirstNumber(reportContext.price, reportContext.suggestedPrice, reportContext.recommendedPrice);
  const competitorPrice = parsePriceRangeValue(product.competitorPrice || reportContext.competitorPrice);
  const estimatedPrice = userPrice ? 0 : contextPrice || competitorPrice;
  const price = userPrice || estimatedPrice || 0;
  const cost = pickFirstNumber(product.cost, product.purchasePrice, product.sourcePrice, product.wholesalePrice, reportContext.cost);
  const grossProfit = price > 0 && cost > 0 ? price - cost : 0;
  const grossMargin = price > 0 && cost > 0 ? grossProfit / price : 0;

  return {
    price,
    cost,
    competitorPrice,
    hasUserPrice: userPrice > 0,
    hasEstimatedPrice: !userPrice && estimatedPrice > 0,
    priceSource: userPrice > 0 ? "user" : contextPrice > 0 ? "context" : competitorPrice > 0 ? "competitor_estimate" : "missing",
    grossProfit,
    grossMargin,
  };
}

export function formatEffectivePrice(priceInfo, fallback = "待补充") {
  if (!priceInfo?.price) return fallback;
  return `¥${moneyDisplay(priceInfo.price)}${priceInfo.hasEstimatedPrice ? "（估算）" : ""}`;
}

function formatEffectiveCost(priceInfo, fallback = "待补充") {
  if (!priceInfo?.cost) return fallback;
  return `¥${money(priceInfo.cost)}`;
}

function getProfitPriceDescription(priceInfo, priceBand) {
  const hasPrice = priceInfo?.price > 0;
  const hasCost = priceInfo?.cost > 0;
  if (hasPrice && hasCost) {
    const sourceText = priceInfo.hasEstimatedPrice ? "（根据现有信息估算）" : "";
    return `当前建议售价约 ¥${moneyDisplay(priceInfo.price)}${sourceText}，单件成本约 ¥${money(priceInfo.cost)}，预估单件毛利约 ¥${money(priceInfo.grossProfit)}，毛利率约 ${(priceInfo.grossMargin * 100).toFixed(1)}%。${priceBand.advice}`;
  }
  if (hasPrice && !hasCost) {
    return "成本待补充：当前已有建议售价，但缺少单件成本，暂时无法准确判断毛利空间。";
  }
  if (!hasPrice && hasCost) {
    return "价格待补充：当前已有单件成本，但缺少建议售价，暂时无法判断利润空间。";
  }
  return "价格与成本待补充：建议先补充建议售价和单件成本，再判断利润空间。";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getProductSource(product = {}) {
  const fields = {
    name: product?.name || "",
    category: product?.category || "",
    material: product?.material || "",
    keywords: product?.keywords || "",
    note: product?.note || "",
    audience: product?.audience || "",
    channel: product?.channel || "",
    logistics: product?.logistics || "",
    scene: product?.scene || product?.usage || "",
  };
  return {
    fields,
    allText: Object.values(fields).join(" "),
    supportingText: Object.entries(fields)
      .filter(([key]) => key !== "name")
      .map(([, value]) => value)
      .join(" "),
  };
}

function productText(product) {
  return getProductSource(product).allText.toLowerCase();
}

function uniqueIdentityTerms(...lists) {
  return [...new Set(lists.flat().map((term) => String(term || "").trim()).filter(Boolean))];
}

function scoreIdentityProfile(source, profile) {
  const weights = { name: 5, category: 4, material: 2, keywords: 3, note: 3, audience: 1, channel: 1, logistics: 1, scene: 3 };
  const evidence = [];
  let score = 0;

  Object.entries(source.fields).forEach(([field, value]) => {
    const fieldText = String(value || "");
    profile.strongTerms.forEach((term) => {
      if (term && fieldText.includes(term)) {
        score += weights[field] || 1;
        evidence.push(`${field}:${term}`);
      }
    });
    (profile.weakTerms || []).forEach((term) => {
      if (term && fieldText.includes(term)) {
        score += 1;
        evidence.push(`${field}:${term}`);
      }
    });
  });

  return { score, evidence: [...new Set(evidence)] };
}

function defaultIdentityKeyFromCategory(categoryKey) {
  const map = {
    hair_accessory: "hair_accessory",
    jewelry: "earring_accessory",
    stationery_cultural: "cultural_charm",
    phone_accessory: "phone_accessory",
    home_lifestyle: "home_lifestyle",
    daily_necessity: "daily_necessity",
  };
  return map[categoryKey] || "daily_necessity";
}

function inferProductIdentity(product = {}, categoryHint = "") {
  const source = getProductSource(product);
  const hintKey = defaultIdentityKeyFromCategory(categoryHint);
  const scored = Object.entries(productIdentityProfiles)
    .map(([identityKey, profile]) => {
      const result = scoreIdentityProfile(source, profile);
      const hintHit = categoryHint && (profile.categoryKey === categoryHint || identityKey === hintKey);
      return {
        identityKey,
        profile,
        score: result.score + (hintHit ? 2 : 0),
        evidence: hintHit ? [...result.evidence, `categoryHint:${categoryHint}`] : result.evidence,
      };
    })
    .sort((a, b) => b.score - a.score || b.profile.priority - a.profile.priority);

  const best = scored[0];
  const profile = best && best.score >= 3 ? best.profile : productIdentityProfiles.daily_necessity;
  const identityKey = best && best.score >= 3 ? best.identityKey : "daily_necessity";
  const rawName = String(product?.name || "").trim();
  const bannedHitsInName = profile.bannedTerms.filter((term) => rawName.includes(term));
  const allowedHitsInName = profile.allowedTerms.filter((term) => rawName.includes(term));
  const displayName = rawName && (!bannedHitsInName.length || allowedHitsInName.length || best.score < 8)
    ? rawName
    : (profile.coreProductTerms[0] || profile.fallbackTerm || "该产品");
  const confidence = best.score >= 12 ? "high" : best.score >= 6 ? "medium" : "low";
  const materialHits = getProductMaterialWords(product || {});

  return {
    categoryKey: profile.categoryKey,
    identityKey,
    label: profile.label,
    productTypeLabel: profile.label,
    displayName,
    primaryUse: profile.scenarioTerms?.[0] || "围绕真实使用场景验证用户反馈",
    allowedTerms: uniqueIdentityTerms(profile.allowedTerms, profile.coreProductTerms, profile.scenarioTerms, profile.styleTerms, profile.functionTerms, materialHits),
    bannedTerms: uniqueIdentityTerms(profile.bannedTerms),
    allowedIdentityTerms: uniqueIdentityTerms(profile.allowedTerms, profile.coreProductTerms, profile.scenarioTerms, profile.styleTerms, profile.functionTerms),
    forbiddenIdentityTerms: uniqueIdentityTerms(profile.bannedTerms),
    coreProductTerms: uniqueWords([rawName, ...profile.coreProductTerms, ...allowedHitsInName].filter(Boolean), 8),
    scenarioTerms: uniqueWords(profile.scenarioTerms, 8),
    styleTerms: uniqueWords(profile.styleTerms, 8),
    functionTerms: uniqueWords([...materialHits, ...profile.functionTerms], 8),
    longTailTerms: uniqueWords(profile.longTailTerms, 8),
    fallbackTerm: profile.fallbackTerm,
    confidence,
    evidence: best.evidence,
  };
}

function inferCategoryKey(product) {
  return inferProductIdentity(product).categoryKey;
}

export function getPriceBand(price) {
  if (!price) {
    return {
      label: "价格待补充",
      advice: "建议先补充建议售价，否则无法判断目标人群、利润空间和内容转化门槛。",
      risk: "缺少售价会让报告更偏定性判断，无法可靠测算毛利率。",
    };
  }
  if (price < 10) {
    return {
      label: "10元以下",
      advice: "适合引流和组合销售，单件利润有限，不建议单独作为主推爆品。",
      risk: "需要靠复购、搭售或批量成交覆盖履约成本。",
    };
  }
  if (price <= 30) {
    return {
      label: "10-30元",
      advice: "适合学生党、冲动消费、小红书种草和校园私域成交。",
      risk: "同质化竞争会比较明显，需要用场景图、套装或低门槛福利提高转化。",
    };
  }
  if (price <= 80) {
    return {
      label: "30-80元",
      advice: "需要强调质感、包装、礼物价值和使用场景，内容图质量会影响转化。",
      risk: "用户会开始比较质感和评价，图片、包装和信任信息要更完整。",
    };
  }
  return {
    label: "80元以上",
    advice: "需要更强信任背书、品牌感、材质证明、评价证明和高质量内容种草。",
    risk: "不适合只靠低价冲动消费，需要更完整的品牌感和售后承诺。",
  };
}

export function getMoqAdvice(moq) {
  if (!moq) {
    return {
      label: "MOQ待补充",
      advice: "建议补充最小起订量，否则无法判断首批压货资金和测试风险。",
      riskLevel: "未知",
    };
  }
  if (moq <= 50) {
    return {
      label: "50件以内",
      advice: "适合拿样测试，风险较低。",
      riskLevel: "低",
    };
  }
  if (moq <= 150) {
    return {
      label: "50-150件",
      advice: "适合小批量测款，可以配合内容测试和私域反馈。",
      riskLevel: "中低",
    };
  }
  if (moq <= 300) {
    return {
      label: "150-300件",
      advice: "建议争取混批、分批拿货或降低首单量，避免压货。",
      riskLevel: "中高",
    };
  }
  return {
    label: "300件以上",
    advice: "新手压货风险较高，不建议直接下单，除非已有明确订单或渠道消化能力。",
    riskLevel: "高",
  };
}

export function getChannelFit(product, categoryKey) {
  const declared = product.channel || "";
  const map = {
    jewelry: {
      best: "小红书 + 校园私域",
      avoid: "1688/批发复购作为首选渠道",
      reason: "饰品依赖佩戴图、礼物包装和精致感表达，小红书适合种草，校园私域适合低门槛礼物和熟人推荐。",
      avoidReason: "没有形成稳定复购款前，直接走批发复购容易陷入同款比价。",
    },
    hair_accessory: {
      best: "校园私域 + 摆摊/市集",
      avoid: "单纯小红书高客单打法",
      reason: "发饰低客单、轻便、现场可决策，适合宿舍群拼单、校园摊位和颜色套装销售。",
      avoidReason: "如果只靠精致图文而没有套装和上头效果，容易被同款低价替代。",
    },
    home_lifestyle: {
      best: "小红书 + 校园私域",
      avoid: "高运费条件下的摆摊/大批量发货",
      reason: "家居生活类需要场景图和生活方式表达，小红书适合种草，校园私域适合宿舍/办公室场景成交。",
      avoidReason: "体积、易碎和包装成本会拉高履约压力，不适合没验证破损率就大批量铺货。",
    },
    stationery_cultural: {
      best: "小红书 + 校园/文旅市集",
      avoid: "缺少故事表达的抖音纯低价带货",
      reason: "文创类依赖审美、主题故事和现场陈列，适合小红书种草、校园社团、市集和文旅场景。",
      avoidReason: "如果没有文化叙事和套装陈列，只打低价会削弱文创调性。",
    },
    phone_accessory: {
      best: "抖音 + 摆摊/市集",
      avoid: "一次性铺满全机型",
      reason: "数码周边适合强演示、强对比和低价冲动消费，线下也容易现场确认机型后成交。",
      avoidReason: "机型变化和款式迭代快，全机型备货容易产生滞销库存。",
    },
    daily_necessity: {
      best: "校园私域 + 社群团购 + 1688/批发复购",
      avoid: "只靠小红书精致种草",
      reason: "低价日用更看重复购买、组合装和社群成交，适合走量、拼单和搭售。",
      avoidReason: "视觉种草能力通常弱于饰品家居，单条内容爆了也未必能覆盖履约成本。",
    },
    unknown: {
      best: declared || "小红书 + 校园私域",
      avoid: "未验证前直接大批量批发复购",
      reason: "当前品类不明确，建议先用内容和小范围私域验证用户是否理解卖点。",
      avoidReason: "品类、价格和目标人群不清楚时，直接压货会放大库存风险。",
    },
  };

  const fit = map[categoryKey] || map.unknown;
  const declaredText = declared.trim();
  const normalizedDeclared = declaredText.replace(/\s/g, "");
  const bestTokens = fit.best.split(/[+\/]/).map((item) => item.trim()).filter(Boolean);
  const directMatches = bestTokens.filter((token) => normalizedDeclared.includes(token.replace(/\s/g, ""))).length;
  const hasClearChannel = /小红书|抖音|校园|私域|摆摊|市集|社群|团购|1688|批发|复购/.test(declaredText);
  const visualSeedCategory = ["jewelry", "hair_accessory", "home_lifestyle", "stationery_cultural"].includes(categoryKey);
  const onlyWholesale = /1688|批发|复购/.test(declaredText) && !/小红书|抖音|校园|私域|摆摊|市集|社群|团购/.test(declaredText);
  let score = 65;
  let scoreReason = "销售渠道填写较少，当前只能按品类默认渠道给出建议。";

  if (!declaredText) {
    score = 64;
  } else if (visualSeedCategory && onlyWholesale) {
    score = 56;
    scoreReason = "该品类更依赖视觉种草或现场试看，但当前渠道偏低价批发复购，首轮转化路径不够匹配。";
  } else if (directMatches >= 2) {
    score = 84;
    scoreReason = "填写渠道与推荐渠道高度重合，内容形式和成交场景都比较明确。";
  } else if (directMatches === 1) {
    score = 77;
    scoreReason = "填写渠道与推荐方向基本匹配，但仍需要通过图片、短视频或私域反馈验证转化效率。";
  } else if (hasClearChannel) {
    score = 68;
    scoreReason = "渠道方向可尝试，但与该品类的优先渠道不完全一致，需要先做小范围验证。";
  } else {
    score = 60;
    scoreReason = "渠道描述偏模糊，建议明确首发平台、成交方式和补货路径。";
  }

  return {
    ...fit,
    declared: declared || "未填写",
    score,
    scoreReason,
  };
}

export function getCategoryNarrative(product, categoryKey, productIdentity = null) {
  const name = product.name || "该产品";
  const identityKey = productIdentity?.identityKey || categoryKey;
  const narratives = {
    earring_accessory: `耳饰类产品的成交不只取决于款式好不好看，更取决于佩戴效果能否被图片快速证明。${name}如果缺少真人佩戴图，用户很难判断大小、风格和质感；如果材质说明不清楚，又容易产生过敏、掉色和廉价感疑虑。内容测款时应优先验证佩戴效果、近景做工和礼物包装是否能支撑溢价，小红书穿搭和礼物场景会比单纯白底图更适合种草。`,
    wrist_accessory: `手链/手绳类产品的核心不是“挂在哪里”，而是戴在手腕上的搭配效果、舒适度和细节感。${name}应重点验证手腕佩戴图、编织绳或串珠细节、尺寸松紧和礼物属性；如果只用平铺图，用户很难判断戴上是否显精致、是否适合学生党日常搭配。首轮内容更适合用手腕近景、穿搭场景和低预算礼物角度验证收藏与询单。`,
    cultural_charm: `文创挂饰/钥匙扣类产品面对的是更垂直的审美人群，成交理由通常来自故事感、材质细节和使用场景。${name}应围绕包包装饰、钥匙串、校园市集、文旅纪念和低预算礼物建立购买理由，而不是把它当作手腕佩戴类饰品。内容上要讲清楚挂在哪里、细节是否有手作感、送朋友是否不尴尬。`,
    stationery_cultural: `文创纸品类产品的成交更依赖主题、系列化和收藏感。${name}不能只说“好看”，需要说清楚适合手帐拼贴、旅行纪念、校园市集、书桌收藏或低预算送礼的具体场景。复购可能弱于日用品，因此更适合通过系列套装、主题限定和收藏属性提升购买理由。`,
    jewelry: `饰品类产品的成交不只取决于款式好不好看，更取决于佩戴效果能否被图片快速证明。${name}如果缺少真人佩戴图，用户很难判断大小、风格和质感；如果材质说明不清楚，又容易产生过敏、掉色和廉价感疑虑。内容测款时应优先验证佩戴效果、近景做工和礼物包装是否能支撑溢价，小红书穿搭和礼物场景会比单纯白底图更适合种草。补货前建议先完成2-3套佩戴内容测试，再看收藏、询单和材质相关评论。`,
    hair_accessory: `发饰类产品单价低、决策快，适合做校园私域和短内容测款，但单件利润通常有限，不能只靠单品售卖。${name}更适合通过颜色组合、套装销售和宿舍/校园场景提升客单价；内容上要重点展示上头效果、不同发型适配和颜色矩阵，否则很容易被用户认为是普通低价发圈。首轮测款应先测试颜色偏好，再决定补哪几个色，并通过3件装、5件装或同色系组合提高客单价。`,
    home_lifestyle: `家居生活类产品的内容表现高度依赖真实使用场景和氛围感，用户需要看到它放在宿舍、办公桌或礼物场景里是否自然。${name}不能只看测算毛利率，还要核算包装、体积、易碎、运费和售后破损对真实利润的影响。内容素材要用真实环境降低退货风险，而不是只依赖精修图。`,
    stationery_category: `文创类产品面对的是更垂直的审美人群，成交理由通常来自故事感、文化符号和场景叙事。${name}不能只用“好看”作为卖点，需要说清楚适合手帐、校园、市集、文旅或送礼的具体场景。复购可能弱于日用品，因此更适合通过系列化、收藏属性和主题限定提升购买理由。`,
    phone_accessory: `手机周边类产品要优先控制机型适配和库存风险，热门款生命周期短，适合小批量快测快补。${name}需要把上机效果、孔位、按键、边框厚度和功能演示拍清楚，否则售后问题会集中在“不适配”“手感差”“孔位偏”。内容上适合短视频做强演示和个性化表达，库存上不要一次性铺满全机型。`,
    daily_necessity: `低价日用类产品不能只看单次毛利，真正的逻辑是复购、组合、走量和私域转化。${name}更适合作为引流品、搭售品或社群团购品，通过组合装、囤货装和使用前后对比提高转化。首轮测款应重点看真实复购、搭售率和群内成交效率，而不是只看一条内容的曝光。`,
    unknown: `当前信息还不足以稳定判断品类，建议先补充产品名称、材质、使用场景、竞品价格和目标渠道。只有明确品类后，才能进一步判断内容素材、渠道匹配和压货风险。`,
  };
  return narratives[identityKey] || narratives[categoryKey] || narratives.unknown;
}

function getImageContentPlan(categoryKey, channelFit, productIdentity = null) {
  const identityKey = productIdentity?.identityKey || categoryKey;
  if (identityKey === "wrist_accessory") {
    return {
      mustShoot: ["手腕佩戴图：自然光下展示戴在手腕的大小和松紧", "近景细节图：编织绳、串珠、扣头和结尾做工", "尺寸参照图：和手腕、掌心或硬币对比", "穿搭场景图：校园、通勤、日常手部动作", "礼物包装图：卡纸、袋子或小礼盒"],
      bonusShots: ["不同手腕粗细佩戴效果", "同色系或情侣/闺蜜款组合", "手部动作短视频封面图"],
      missingRisk: "不要只拍平铺图，建议补充手腕佩戴图和细节图，否则用户很难判断大小、松紧和搭配效果。",
      coverAdvice: "首图建议用手腕佩戴近景 + 编织绳/珠子细节，让用户先看到戴上后的精致感。",
      channelFocus: {
        xhs: "小红书重点拍手腕佩戴、学生党礼物、小众饰品和低预算搭配。",
        douyin: "抖音重点拍平铺到戴上手腕的前后对比，以及细节近景。",
        private: "校园私域重点用实拍、价格、可选颜色和礼物场景降低决策成本。",
        market: "摆摊/市集重点展示试戴、颜色组合和小礼物包装。",
      },
      preferredFocus: ["小红书重点拍手腕佩戴、学生党礼物、小众饰品和低预算搭配。", "抖音重点拍平铺到戴上手腕的前后对比，以及细节近景。", "校园私域重点用实拍、价格、可选颜色和礼物场景降低决策成本。"],
    };
  }
  if (identityKey === "stationery_cultural") {
    return {
      mustShoot: ["主题故事图：城市、国风、旅行或节日主题", "使用场景图：手帐、笔记本、明信片墙或书桌", "系列化展示图：同主题不同款并排", "细节图：印刷、纹理、边缘、透明度或防水材质", "包装图：卡纸、信封、礼袋或套装外封"],
      bonusShots: ["手帐拼贴前后对比", "校园/文旅市集陈列图", "送朋友或收藏展示图"],
      missingRisk: "不要只拍单张纸品，要讲清楚主题、使用场景和系列化，否则用户很难形成收藏或送礼理由。",
      coverAdvice: "首图建议用手帐/书桌场景 + 系列化小图，3秒内让用户看出主题和收藏感。",
      channelFocus: {
        xhs: "小红书重点讲主题故事、手帐拼贴、低预算礼物和收藏感。",
        douyin: "抖音重点拍拼贴前后对比、开箱和系列快速展示。",
        private: "校园私域重点做套装价、主题选择和同学实拍。",
        market: "摆摊/市集重点做系列陈列、主题牌和现场翻看效果。",
      },
      preferredFocus: ["小红书重点讲主题故事、手帐拼贴、低预算礼物和收藏感。", "抖音重点拍拼贴前后对比、开箱和系列快速展示。", "校园私域重点做套装价、主题选择和同学实拍。"],
    };
  }
  const plans = {
    jewelry: {
      mustShoot: ["真人佩戴图：正脸、侧脸、近距离耳部或颈部效果", "近景细节图：材质、珍珠、金属光泽、接口和做工", "尺寸参照图：和手指、耳朵、硬币或掌心对比", "包装图：礼盒、卡纸、袋子，突出礼物属性"],
      bonusShots: ["通勤、约会、校园、春夏穿搭场景图", "同款不同穿搭风格对比", "佩戴前后精致感对比"],
      missingRisk: "不要只放白底图，否则用户无法判断佩戴效果、大小和真实质感。",
      coverAdvice: "首图建议用真人佩戴特写，3秒内让用户看出风格、大小和精致感。",
      channelFocus: {
        xhs: "小红书重点做穿搭、礼物、氛围感和标题种草。",
        douyin: "抖音重点拍佩戴前后对比、开箱和光泽细节。",
        private: "校园私域重点用实拍、价格、礼盒款和同学试戴降低决策成本。",
        market: "摆摊/市集重点展示远看吸引的陈列和近看有质感的细节。",
      },
    },
    hair_accessory: {
      mustShoot: ["上头效果图：扎发、半扎、丸子头和低马尾", "颜色矩阵图：多个颜色并排展示，方便选色", "套装组合图：3件装、5件装、同色系组合", "宿舍/校园场景图：镜子前、课桌旁、通勤包搭配", "材质细节图：布料纹理、弹力、缝线和厚度"],
      bonusShots: ["普通发圈 vs 该款上头效果对比", "不同发量试戴效果", "校园群颜色投票截图风格素材"],
      missingRisk: "不要只拍单个平铺图，否则看不出体积、佩戴氛围和颜色组合价值。",
      coverAdvice: "首图建议用上头效果 + 颜色矩阵，直接展示“好看、好选、适合宿舍拼单”。",
      channelFocus: {
        xhs: "小红书重点拍宿舍好物、显发量、颜色组合和套装种草。",
        douyin: "抖音前3秒展示普通头绳和上头效果对比。",
        private: "校园私域重点用实拍、套装价、颜色投票和宿舍拼单。",
        market: "摆摊/市集重点做颜色矩阵、套装陈列和现场试戴。",
      },
    },
    home_lifestyle: {
      mustShoot: ["真实使用场景图：宿舍、办公桌、床头、书桌或厨房", "氛围图：灯光、桌搭、生活方式感", "尺寸参照图：和手机、书本、杯子或手掌对比", "包装保护图：是否防摔、防碎、包装是否稳", "细节图：材质、纹理、容量、开口和边角"],
      bonusShots: ["易碎品包装厚度和保护方式", "使用前后环境变化", "礼物开箱场景"],
      missingRisk: "不要只放精修图，要补真实场景图和包装保护图，降低退货和破损风险。",
      coverAdvice: "首图建议用真实桌面/宿舍氛围图，让用户快速看到使用后的生活方式变化。",
      channelFocus: {
        xhs: "小红书重点做生活方式、桌搭、宿舍改造和氛围感。",
        douyin: "抖音重点拍开箱、使用过程和前后空间变化。",
        private: "校园私域重点说清楚尺寸、价格、运费和宿舍适配。",
        market: "摆摊/市集重点展示现场陈列、触感细节和包装保护。",
      },
    },
    stationery_cultural: {
      mustShoot: ["主题故事图：国风、自然感、手作感或文旅元素", "使用场景图：帆布包、钥匙串、手账包和书桌", "系列化展示图：同系列不同款并排，提升收藏感", "细节图：木珠、果核、纹理、挂件边缘和绳结", "市集/摊位图：展示线下售卖氛围"],
      bonusShots: ["送礼图：包装、卡片、礼袋", "市集/摊位图：展示线下售卖氛围", "大小参照图：放在掌心、钥匙串或帆布包旁边"],
      missingRisk: "不要只拍单品，要拍清楚文化符号、使用场景和大小参照，否则用户很难判断挂在包上或钥匙串上的真实效果。",
      coverAdvice: "首图建议用帆布包/钥匙串使用场景 + 木珠、果核、绳结细节小图，让用户先看到故事感和真实搭配效果。",
      channelFocus: {
        xhs: "小红书重点讲审美、故事感、手帐和送礼。",
        douyin: "抖音重点做开箱、系列展示和用途切换。",
        private: "校园私域重点结合社团、节日和同学送礼场景。",
        market: "摆摊/市集重点做系列化陈列、主题牌和现场氛围。",
      },
    },
    phone_accessory: {
      mustShoot: ["机型适配图：明确适配机型", "上机效果图：手机壳、支架或挂绳装上后的效果", "功能演示图：防摔、支架角度、挂绳承重、镜头保护", "细节图：孔位、按键、边框、材质和厚度", "对比图：裸机 vs 使用后效果"],
      bonusShots: ["短视频封面图：突出个性化、好看、实用", "不同机型/颜色组合", "通勤、拍照、出门携带场景"],
      missingRisk: "不要缺少机型适配说明，否则容易产生售后和退换货。",
      coverAdvice: "首图建议把机型、上机效果和核心功能放在一起，快速证明适配和实用。",
      channelFocus: {
        xhs: "小红书重点拍个性表达、穿搭配色和上机美观。",
        douyin: "抖音前3秒展示防摔、挂绳、支架角度等强演示。",
        private: "校园私域重点标清机型、价格和可选颜色。",
        market: "摆摊/市集重点按机型分类陈列，方便现场决策。",
      },
    },
    daily_necessity: {
      mustShoot: ["使用前后对比图", "一图看懂功能图", "多件组合图", "家庭/宿舍/办公场景图", "尺寸和容量说明图"],
      bonusShots: ["批量囤货图或组合装图", "使用步骤分解图", "搭售组合图"],
      missingRisk: "不要只拍产品本身，要强调使用价值、性价比和解决了什么具体问题。",
      coverAdvice: "首图建议用前后对比或功能结果图，让用户立刻看懂为什么需要它。",
      channelFocus: {
        xhs: "小红书重点拍真实使用场景、收纳清洁结果和性价比。",
        douyin: "抖音前3秒展示使用前后差异和功能结果。",
        private: "校园私域重点突出组合优惠、团购价和复购场景。",
        market: "摆摊/市集重点展示组合装、囤货量和现场试用。",
      },
    },
    unknown: {
      mustShoot: ["清晰产品图", "使用场景图", "尺寸参照图", "细节图"],
      bonusShots: ["竞品对比图", "包装图", "用户使用过程图"],
      missingRisk: "不要只靠文字描述，至少补齐产品、场景和尺寸信息。",
      coverAdvice: "首图先让用户看懂产品是什么、解决什么问题、适合谁。",
      channelFocus: {
        xhs: "小红书重点补场景和标题种草感。",
        douyin: "抖音重点补使用演示和前后对比。",
        private: "校园私域重点补实拍、价格和购买理由。",
        market: "摆摊/市集重点补陈列和现场试用。",
      },
    },
  };
  const plan = plans[categoryKey] || plans.unknown;
  const best = channelFit?.best || "";
  const preferredFocus = [
    best.includes("小红书") ? plan.channelFocus.xhs : "",
    best.includes("抖音") ? plan.channelFocus.douyin : "",
    best.includes("校园") || best.includes("私域") || best.includes("社群") ? plan.channelFocus.private : "",
    best.includes("摆摊") || best.includes("市集") ? plan.channelFocus.market : "",
  ].filter(Boolean);
  return {
    ...plan,
    preferredFocus: preferredFocus.length ? preferredFocus : Object.values(plan.channelFocus).slice(0, 2),
  };
}

function getSamplingStrategy({ categoryKey, priceBand, moqAdvice, channelFit, status, productIdentity = null }) {
  const identityKey = productIdentity?.identityKey || categoryKey;
  const strategies = {
    earring_accessory: ["验证佩戴效果是否能明显提升精致感", "检查材质质感、掉色和过敏反馈", "测试包装是否能支撑礼物溢价", "用小红书穿搭/礼物内容判断询单质量"],
    wrist_accessory: ["验证手腕佩戴效果、松紧和尺寸适配", "检查编织绳、串珠、扣头和结尾做工", "测试低预算礼物和学生党日常搭配反馈", "用手腕近景和穿搭图判断收藏与询单"],
    cultural_charm: ["验证挂包/钥匙串场景是否有记忆点", "检查木珠、果核、绳结和挂扣牢固度", "测试低预算礼物、校园市集和文旅纪念反馈", "用系列化陈列判断是否有收藏感"],
    stationery_cultural: ["验证主题故事和系列化是否被用户理解", "测试手帐/书桌/旅行纪念场景的收藏反馈", "观察用户是否询问套装、材质和包装", "用小批量主题款判断后续开发方向"],
    jewelry: ["验证佩戴效果是否能明显提升精致感", "检查材质质感、掉色和过敏反馈", "测试包装是否能支撑礼物溢价", "用小红书穿搭/礼物内容判断询单质量"],
    hair_accessory: ["先测颜色偏好，决定首批补哪几个色", "验证上头效果和不同发型适配", "测试3件装/5件装能否提升客单价", "在宿舍/校园场景里观察拼单意愿"],
    home_lifestyle: ["验证真实使用场景是否有氛围感", "核算包装保护、破损和运费影响", "观察宿舍/办公室/礼物场景哪一个更容易成交", "先测小批量履约再考虑补货"],
    stationery_category: ["验证文化符号和主题故事是否被用户理解", "测试系列化展示是否提升收藏感", "观察校园/市集/文旅场景的停留和询价", "用小批量主题款判断后续开发方向"],
    phone_accessory: ["先限定热门机型测试，不铺满全型号", "验证孔位、按键、边框和上机效果", "通过短视频收集用户机型和颜色需求", "根据评论区机型需求决定补货结构"],
    daily_necessity: ["验证复购和组合装转化，不只看单件毛利", "测试社群团购和搭售场景", "观察使用前后对比是否能促成下单", "控制履约成本，优先做走量小单"],
    unknown: ["先补齐品类、价格、渠道和竞品信息", "用小范围内容测试验证卖点是否被理解", "不要在信息不清楚时放大首单量"],
  };
  return {
    headline: status === "暂不考虑" ? "先降风险，再判断是否拿样" : status === "建议补货" ? "可以进入补货观察，但先复核验证点" : "适合用小批量完成关键验证",
    context: `${priceBand.label} · ${moqAdvice.label} · ${channelFit.best}`,
    checkpoints: strategies[identityKey] || strategies[categoryKey] || strategies.unknown,
  };
}

function getTestDecisionStandards(categoryKey, productIdentity = null) {
  const identityKey = productIdentity?.identityKey || categoryKey;
  const categoryNote = testDecisionStandardTemplates.categoryNote;

  return [
    ...testDecisionStandardTemplates.baseStandards,
    categoryNote[identityKey] || categoryNote[categoryKey] || categoryNote.unknown,
  ];
}

function getSupplierQuestions(categoryKey, productIdentity = null) {
  const identityKey = productIdentity?.identityKey || categoryKey;
  const questions = supplierQuestionTemplates;
  const selectedQuestions = questions[identityKey] || questions[categoryKey] || questions.unknown;

  return [...selectedQuestions];
}

function getIdentityDifferentiation(productIdentity, fallback = []) {
  const map = {
    earring_accessory: ["补真人佩戴图和尺寸参照，证明上耳效果", "用礼物包装、卡纸或小礼盒提高低预算礼物感", "用材质说明和售后承诺降低过敏、掉色疑虑"],
    wrist_accessory: ["用手腕佩戴图替代单纯平铺图，证明大小和松紧", "突出编织绳、珠子、扣头和结尾做工，降低廉价感", "做低预算礼物包装或闺蜜/情侣组合，提高购买理由"],
    cultural_charm: ["用包包、钥匙串和书包场景证明挂饰用途", "给木珠、果核、绳结或主题元素补故事卡，强化文创感", "做系列化陈列和低预算礼物包装，提高收藏和送礼理由"],
    stationery_cultural: ["做主题系列套装，提高收藏感和客单价", "用手帐拼贴、书桌和旅行纪念场景证明纸品用途", "补印刷、材质、边缘和包装细节，降低质感疑虑"],
    hair_accessory: ["做3件/5件颜色套装，提升客单价", "用宿舍、校园群和姐妹拼单场景强化购买理由", "拍不同发量上头效果，减少用户担心不适配"],
    phone_accessory: ["先集中热门机型，不一次性铺太多型号", "用短视频演示防摔、挂绳、支架等功能点", "评论区收集机型需求，再决定补货结构"],
    home_lifestyle: ["用宿舍/办公室真实场景图增强代入感", "把尺寸、重量、包装保护说清楚，降低售后风险", "做套装或礼物版，给用户一个完整生活方式场景"],
    daily_necessity: ["做组合装、宿舍拼单装或家庭补充装", "在私域和社群团购里验证复购，而不是只看单条内容流量", "把产品设计成搭售品，提高客单和订单稳定性"],
  };
  return map[productIdentity?.identityKey] || fallback;
}

export function getXhsContentPackage(product, categoryKey, productIdentity = null) {
  const name = product.name || "这款小物";
  const identityKey = productIdentity?.identityKey || categoryKey;
  const packages = {
    jewelry: {
      coverHooks: ["不打耳洞也能戴的温柔感耳夹", "这对珍珠耳夹，真的很适合春夏通勤", "低预算礼物感小配饰，戴上比平铺好看太多"],
      titles: [
        `${name}戴上比平铺图更温柔`,
        "不打耳洞也能有精致感，通勤戴刚刚好",
        "低预算礼物感耳夹，送朋友也不敷衍",
        "春夏小裙子可以搭的珍珠蝴蝶结配饰",
        "耳夹别只看平铺，上耳效果才是重点",
      ],
      coverDesign: "首图用真人侧脸佩戴特写，旁边补一张近景质感小图，标题只留一句场景文案，例如“通勤戴也不夸张”。",
      pages: [
        "第1页：佩戴特写封面，用“戴上更温柔”的结果吸引点击。",
        "第2页：正脸/侧脸上耳效果，让用户判断大小和修饰感。",
        "第3页：近拍珍珠、金属光泽、接口和做工。",
        "第4页：通勤、约会、校园穿搭三种场景切换。",
        "第5页：说明适合不打耳洞、低预算送礼、春夏穿搭人群。",
        "第6页：展示礼盒、卡纸或袋子，强化仪式感。",
        "第7页：补充尺寸参照和佩戴舒适度。",
        "第8页：提问“自用还是送朋友”，引导收藏和评论。",
      ],
      body: "最近真的很喜欢这种不用打耳洞也能戴的小耳夹。珍珠和蝴蝶结放在一起不会太夸张，通勤、约会、春夏小裙子都能搭。比起平铺图，我更建议看上耳效果，大小和脸型适配真的很重要。低预算想送朋友的话，配个小礼盒也挺有仪式感。",
      interactions: ["你们更喜欢自用还是送朋友？", "这个风格适合通勤还是约会？", "想看正脸效果还是侧脸效果？", "你会更在意材质、包装还是价格？", "不打耳洞的姐妹会想试这种耳夹吗？"],
      tags: ["#耳夹", "#珍珠耳夹", "#不打耳洞", "#通勤配饰", "#春夏穿搭", "#低预算礼物", "#小众配饰", "#温柔风穿搭", "#礼物推荐"],
      merchantStrategy: "这组内容重点测试消费者是否被佩戴效果和礼物感吸引。发布后观察收藏率、评论里的材质疑问和私信询价；如果只有点赞没有询单，优先补充价格、包装和佩戴尺寸说明。",
    },
    hair_accessory: {
      coverHooks: ["奶油色大肠发圈，上头比平铺好看", "宿舍姐妹问爆的温柔发圈", "扎丸子头的时候，这个颜色真的很显干净"],
      titles: [
        `${name}上头效果比平铺图好看太多`,
        "奶油色发圈真的很适合宿舍日常",
        "低丸子头加这个发圈，温柔感一下就有了",
        "姐妹们选发圈别只看平铺，一定看上头效果",
        "3个颜色组一套，日常扎发更好搭",
      ],
      coverDesign: "首图用上头效果做主画面，角落放颜色矩阵和扎发前后对比，让用户一眼看出颜色、体积和发型效果。",
      pages: [
        "第1页：上头效果封面，用“扎上更温柔”的结果吸引点击。",
        "第2页：低丸子头、半扎发、低马尾三种发型效果。",
        "第3页：颜色矩阵并排展示，方便用户选色。",
        "第4页：宿舍镜子前、课桌旁、通勤包搭配场景。",
        "第5页：展示弹力、布料纹理、缝线和厚度。",
        "第6页：3件装/5件装同色系组合，强化搭配理由。",
        "第7页：普通皮筋 vs 该款发圈的前后对比。",
        "第8页：提问“想看哪个颜色上头”，收集颜色偏好。",
      ],
      body: "奶油色发圈真的比想象中更百搭，扎低丸子头或者半扎都很温柔。它不是那种很夸张的大肠发圈，日常上课、宿舍出门、通勤都能用。建议姐妹们选颜色的时候别只看平铺图，一定要看上头效果，颜色和发量适不适配差别挺大的。",
      interactions: ["你们想看哪几个颜色上头效果？", "这个颜色更适合校园还是通勤？", "如果出套装，你们想要3件还是5件？", "你是发量多还是发量少？", "想看丸子头、半扎还是低马尾？"],
      tags: ["#发圈", "#大肠发圈", "#宿舍好物", "#发型分享", "#校园穿搭", "#低预算好物", "#温柔风", "#扎发教程", "#奶油色系", "#学生党好物"],
      merchantStrategy: "这组内容重点测试消费者对颜色组合和上头效果的偏好。发布后看收藏率、评论区选色、套装询问和私信询价；如果播放不错但询单弱，补充套装价格、上头对比和更多发量效果。",
    },
    home_lifestyle: {
      coverHooks: ["宿舍桌面变好看，其实只差这个小物", "让书桌有氛围感的小东西", "办公室和宿舍都能用的生活感好物"],
      titles: [
        `${name}放在桌面上，氛围感真的会变好`,
        "宿舍桌面想变整洁，可以从这个小物开始",
        "低预算提升生活感，这个小东西挺加分",
        "床头/书桌/办公室都能放的实用小物",
        "不是精修图，真实桌面上也好看吗？",
      ],
      coverDesign: "首图用真实桌面或宿舍场景，保留一点使用痕迹和氛围光，旁边加手机或书本做尺寸参照。",
      pages: [
        "第1页：真实桌面/宿舍场景封面，用结果感吸引点击。",
        "第2页：使用前后对比，展示空间变化。",
        "第3页：尺寸、容量、材质、边角等细节。",
        "第4页：宿舍、办公桌、床头不同位置效果。",
        "第5页：说明适合自用、送室友或办公室小礼物。",
        "第6页：展示包装保护和开箱状态。",
        "第7页：补充清洁、摆放或日常维护细节。",
        "第8页：提问“你会放在哪里”，引导评论。",
      ],
      body: "有些小物不是特别贵，但放到真实桌面上会让空间立刻顺眼很多。这个更适合宿舍、床头或者办公室小角落，拍照的时候也挺出片。选这类东西我会看三个点：尺寸会不会占地方、材质会不会显廉价、真实场景里是不是自然。",
      interactions: ["你会把它放在书桌、床头还是办公室？", "你更喜欢实用型还是氛围感小物？", "想看白天自然光还是晚上开灯效果？", "会介意尺寸大一点吗？", "这种小物适合自用还是送室友？"],
      tags: ["#宿舍好物", "#桌面改造", "#生活方式", "#氛围感好物", "#办公室好物", "#低预算改造", "#礼物推荐", "#桌搭分享", "#实用小物"],
      merchantStrategy: "这组内容重点测试消费者是否被真实场景和氛围变化吸引。发布后看收藏率、评论里的尺寸/运费疑问和私信询价；如果互动高但询单弱，补充尺寸参照、包装保护和真实使用细节。",
    },
    stationery_cultural: {
      coverHooks: ["这个木珠果核小挂饰，挂在包上真的很有氛围", "低预算但不敷衍的文创小礼物", "喜欢自然感小物的人，会懂这个钥匙扣"],
      titles: [
        `${name}，木珠和果核拼在一起更有故事感`,
        "帆布包上挂一个小物，氛围感一下就有了",
        "低预算文创小礼物，送朋友不尴尬",
        "喜欢自然感小物的人应该会懂这个质感",
        "校园市集看到这种小挂件，我真的会停下来",
      ],
      coverDesign: "首图用帆布包或钥匙串的真实使用场景，叠加木珠、果核纹理和手作绳结细节，让用户同时看到自然感、故事感和实际大小。",
      pages: [
        "第1页：帆布包或钥匙串场景封面，突出“有记忆点”的感觉。",
        "第2页：木珠、果核纹理、绳结和金属扣细节。",
        "第3页：挂在帆布包、钥匙串、手账包上的效果。",
        "第4页：同系列不同款并排，提升收藏感。",
        "第5页：说明适合送朋友、校园市集、自用搭配场景。",
        "第6页：展示包装、卡片或礼袋。",
        "第7页：补充大小参照和手作感细节。",
        "第8页：提问“你会挂哪里”，引导评论。",
      ],
      body: "有些小物不是因为多贵才特别，而是因为它有一点自己的故事感。这个木珠和果核拼接的小挂饰，挂在帆布包、钥匙串或者手账包上都很有氛围。喜欢自然感、国风感、手作感小物的人应该会懂，它适合当作低预算小礼物，也适合日常搭配。",
      interactions: ["你会挂在包上还是当钥匙扣？", "你更喜欢国风、自然感还是城市主题？", "这种小物适合自用还是送朋友？", "想看同系列其他款吗？", "你会为包装和故事感加分吗？"],
      tags: ["#文创小物", "#国风小物", "#钥匙扣", "#低预算礼物", "#校园市集", "#手作感", "#小众礼物", "#包包挂件", "#文创礼物", "#帆布包搭配"],
      merchantStrategy: "这组内容重点测试消费者是否被故事感、文化符号和使用场景吸引。发布后看收藏率、评论主题偏好和私信询价；如果收藏高但评论弱，补充系列化展示、包装图和更明确的使用场景。",
    },
    phone_accessory: {
      coverHooks: ["手机壳好不好看，上机才知道", "裸机普通，装上这个立刻有风格", "这个手机小配件，实用和好看都想要"],
      titles: [
        `${name}上机效果比单看产品图直观多了`,
        "手机配件别只看颜值，孔位和手感也很重要",
        "通勤党会喜欢的实用手机小配件",
        "镜头、按键、边框细节一次看清楚",
        "实用款和高颜值款，你更选哪种？",
      ],
      coverDesign: "首图用裸机和上机效果对比，角落写清适配机型，并把孔位、镜头保护或支架功能放到小图里。",
      pages: [
        "第1页：裸机 vs 上机效果封面，快速展示变化。",
        "第2页：手持、放桌面、出门携带等真实使用效果。",
        "第3页：孔位、按键、镜头保护、边框厚度细节。",
        "第4页：支架、挂绳、防摔或功能演示。",
        "第5页：明确适配机型和颜色选择。",
        "第6页：展示穿搭、通勤、拍照场景。",
        "第7页：解决“会不会厚、会不会挡镜头”等疑虑。",
        "第8页：提问喜欢实用款还是高颜值款。",
      ],
      body: "手机配件真的不能只看单独产品图，上机效果才最直观。这个装上之后风格会明显一点，但我更在意孔位、按键和镜头保护这些细节。选之前一定要看清适配机型，手感、厚度和日常使用方便程度也很影响体验。",
      interactions: ["你更喜欢实用款还是高颜值款？", "想看哪个机型的上机效果？", "你会介意手机壳变厚吗？", "挂绳、支架、防摔哪个功能最重要？", "你喜欢透明款还是有图案的？"],
      tags: ["#手机壳", "#手机配件", "#上机效果", "#通勤好物", "#数码配件", "#手机挂绳", "#防摔手机壳", "#高颜值手机壳", "#实用好物"],
      merchantStrategy: "这组内容重点测试消费者对上机效果、机型适配和功能演示的关注。发布后看完播率、评论区机型需求、收藏和私信询价；如果播放高但询单少，补充适配机型、价格和功能细节。",
    },
    daily_necessity: {
      coverHooks: ["这个小问题，我以前每天都忍", "用前用后差别太明显了", "宿舍和办公室都能囤的实用小东西"],
      titles: [
        `${name}这种小东西，用过才知道方便`,
        "低预算解决一个日常小麻烦",
        "宿舍里可以一次囤几件的实用小物",
        "一图看懂它到底解决什么问题",
        "不是大件，但真的会提高日常幸福感",
      ],
      coverDesign: "首图用使用前后对比做主视觉，旁边放一图看懂功能和组合装，让用户立刻理解用途。",
      pages: [
        "第1页：痛点/结果对比封面，让用户马上看懂用途。",
        "第2页：具体怎么用，步骤越简单越好。",
        "第3页：使用前后对比，突出解决的问题。",
        "第4页：宿舍、家庭、办公室不同场景。",
        "第5页：尺寸、容量、材质和一次用量说明。",
        "第6页：多件组合、囤货装或搭配使用方式。",
        "第7页：说明适合哪些人和什么频率使用。",
        "第8页：提问“一次会买几个”，收集购买偏好。",
      ],
      body: "这种小东西看起来不起眼，但真的会解决一个每天都会遇到的小麻烦。放在宿舍、办公室或者家里都能用，重点是用法简单、占地方少，囤几件也不心疼。比起只看产品图，我更建议看使用前后对比，能不能真的省事一眼就知道。",
      interactions: ["这种小东西你会一次买几个？", "你更想放宿舍、办公室还是家里？", "组合装会更有吸引力吗？", "你最在意便宜、方便还是耐用？", "想看使用前后对比还是具体步骤？"],
      tags: ["#日用好物", "#宿舍好物", "#办公室好物", "#低预算好物", "#实用小物", "#生活小妙招", "#囤货清单", "#组合装", "#性价比好物"],
      merchantStrategy: "这组内容重点测试消费者是否被使用前后对比和组合价值吸引。发布后看完播率、收藏、评论里的使用场景和私信询价；如果互动高但转化弱，补充价格、组合数量和更直接的使用结果。",
    },
  };

  const fallbackPackage = {
    coverHooks: ["这个小物，实际用起来比想象中更有存在感", "低预算也能提升一点日常幸福感", "刷到会想点开看的实用小东西"],
    titles: [`${name}适合什么场景？先看真实使用效果`, "这个小物到底值不值得买，看完场景再决定", "低预算小东西，也要看实用和质感", "适合自用还是送人？这几个细节很关键", "别只看产品图，真实场景更有参考价值"],
    coverDesign: "首图先拍清楚产品的真实使用场景，再用小图补充尺寸、细节或对比，让用户在3秒内看懂用途。",
    pages: ["第1页：用结果或场景吸引点击。", "第2页：展示最好看的使用效果。", "第3页：展示细节、尺寸或功能。", "第4页：放到真实生活场景里。", "第5页：说明适合什么人或场合。", "第6页：补充组合、包装或对比。", "第7页：突出实用价值或礼物感。", "第8页：用问题引导评论和收藏。"],
    body: "这种小物最重要的是放到真实场景里看效果。单看产品图可能很普通，但如果能解决一个小麻烦，或者让桌面、穿搭、包包变得更有细节，就会更有购买理由。建议先看尺寸、材质和使用场景，再决定适不适合自己。",
    interactions: ["你会自用还是送朋友？", "更想看细节图还是使用图？", "这个适合宿舍、通勤还是办公室？", "你更在意颜值还是实用？", "想看哪个颜色/款式？"],
    tags: ["#低预算好物", "#实用小物", "#生活好物", "#礼物推荐", "#宿舍好物", "#小众好物", "#日常分享", "#种草清单"],
    merchantStrategy: "这组内容重点测试消费者是否能快速理解用途和购买理由。发布后看收藏、评论问题、私信询价和转化；如果反馈弱，优先补充真实场景、价格信息和更明确的使用结果。",
  };
  packages.earring_accessory = packages.jewelry;
  packages.cultural_charm = packages.stationery_cultural;
  packages.wrist_accessory = {
    coverHooks: ["这个手绳戴在手腕上，比平铺图可爱多了", "低预算学生党小礼物，戴着不夸张", "编织绳和小珠子，日常搭配刚刚好"],
    titles: [
      `${name}戴在手腕上才看得出细节`,
      "低预算小手绳，送朋友也不尴尬",
      "学生党日常可以戴的编织手链",
      "别只看平铺图，手腕佩戴效果更重要",
      "可爱但不幼稚的小众手腕配饰",
    ],
    coverDesign: "首图用手腕佩戴近景，旁边补编织绳、珠子和扣头细节，让用户一眼看出大小、松紧和日常搭配效果。",
    pages: [
      "第1页：手腕佩戴封面，用“戴上更好看”的结果吸引点击。",
      "第2页：不同角度展示手腕佩戴效果和大小。",
      "第3页：近拍编织绳、珠子、扣头和结尾做工。",
      "第4页：校园、通勤、日常穿搭三个手部场景。",
      "第5页：说明适合学生党、低预算礼物或闺蜜小礼物。",
      "第6页：展示可选颜色、组合款或包装。",
      "第7页：补充手腕尺寸、松紧和佩戴舒适度。",
      "第8页：提问“自用还是送朋友”，引导评论和收藏。",
    ],
    body: "最近会更喜欢这种不夸张的小手绳，戴在手腕上比平铺图更有细节。编织绳和小珠子放在一起不会太复杂，日常上课、通勤或者送朋友都挺合适。选这种小配饰我会重点看手腕佩戴效果、松紧和做工，低预算也可以有一点仪式感。",
    interactions: ["你们更喜欢自用还是送朋友？", "这个颜色适合校园还是通勤？", "想看细节图还是手腕佩戴图？", "你会更在意松紧、材质还是包装？", "如果出组合款，你想要哪几个颜色？"],
    tags: ["#手绳", "#手链", "#腕饰", "#编织手链", "#低预算礼物", "#学生党礼物", "#小众饰品", "#日常搭配", "#手腕配饰"],
    merchantStrategy: "这组内容重点测试消费者是否被手腕佩戴效果和低预算礼物感吸引。发布后观察收藏率、评论里的尺寸/松紧问题和私信询价；如果只有点赞没有询单，优先补充价格、包装和佩戴尺寸说明。",
  };
  packages.stationery_cultural = {
    coverHooks: ["这套国风贴纸，贴进手帐里真的有故事感", "低预算文创纸品，送朋友也不敷衍", "喜欢旅行纪念和手帐的人会懂"],
    titles: [
      `${name}，做手帐和旅行纪念都挺有氛围`,
      "国风城市贴纸套装，低预算也有收藏感",
      "喜欢手帐的人，会懂这种文创纸品的细节",
      "书桌上放一套主题贴纸，真的很想慢慢收集",
      "校园市集看到这种纸品，我会停下来翻一翻",
    ],
    coverDesign: "首图用手帐拼贴或书桌场景，叠加系列化小图和印刷细节，让用户先看到主题、用途和收藏感。",
    pages: [
      "第1页：手帐/书桌场景封面，用主题氛围吸引点击。",
      "第2页：展示整套纸品和不同图案。",
      "第3页：近拍印刷、材质、透明度或边缘细节。",
      "第4页：手帐、明信片墙、笔记本或书桌使用场景。",
      "第5页：说明适合旅行纪念、校园市集、送朋友或自用收藏。",
      "第6页：展示包装、卡纸或套装组合。",
      "第7页：补充大小参照和系列化收藏感。",
      "第8页：提问“你想用在哪个主题手帐里”，引导评论。",
    ],
    body: "有些文创纸品不是因为多贵才特别，而是因为主题和细节会让人想慢慢收集。这个系列放进手帐、笔记本或者书桌小角落都挺有氛围。喜欢国风、城市记忆、旅行纪念的朋友应该会懂，低预算送人也不会太随便。",
    interactions: ["你会拿来做手帐还是收藏？", "更喜欢国风、城市还是旅行主题？", "低预算文创礼物会考虑这种吗？", "想看整套图案还是上手拼贴效果？", "你会为系列化和包装加分吗？"],
    tags: ["#文创纸品", "#国风贴纸", "#手帐贴纸", "#旅行纪念", "#低预算礼物", "#校园市集", "#文创小物", "#手帐分享", "#小众礼物"],
    merchantStrategy: "这组内容重点测试消费者是否被主题故事、系列化和手帐使用场景吸引。发布后看收藏率、评论里的主题偏好和套装询问；如果收藏高但询单弱，补充包装、价格和更多拼贴场景。",
  };
  return packages[identityKey] || packages[categoryKey] || fallbackPackage;
}

export function getDouyinVideoPackage(product, categoryKey, productIdentity = null) {
  const identityKey = productIdentity?.identityKey || categoryKey;
  const packages = {
    jewelry: {
      direction: "主打佩戴效果和低预算礼物感。",
      shots: [
        { time: "0-2秒", focus: "强钩子", visual: "平铺图切到侧脸佩戴特写。", copy: "这对耳夹，戴上比平铺好看太多。", purpose: "用反差让用户停下来。" },
        { time: "3-6秒", focus: "展示最强效果", visual: "正脸、侧脸、近距离耳部效果快速切换。", copy: "不打耳洞也能有一点温柔精致感。", purpose: "证明上耳大小和修饰效果。" },
        { time: "7-11秒", focus: "细节质感", visual: "近拍珍珠、蝴蝶结、金属光泽和接口。", copy: "珍珠和金属细节要近看，才知道会不会显廉价。", purpose: "降低用户对质感的疑虑。" },
        { time: "12-16秒", focus: "场景/疑虑", visual: "通勤、约会、礼盒包装三个画面。", copy: "自用不夸张，送朋友也有一点仪式感。", purpose: "补充购买场景和礼物理由。" },
        { time: "17-20秒", focus: "互动引导", visual: "两个佩戴角度定格。", copy: "你觉得它更适合自用还是送朋友？", purpose: "引导评论和收藏。" },
      ],
      coverTexts: ["戴上才知道它有多温柔", "平铺普通，上耳真的不一样", "低预算礼物也可以很有心意"],
      shootingNotes: ["不要只拍平铺，一定要有佩戴图。", "光线不要太暗，否则珍珠和金属质感拍不出来。", "镜头要给耳部/颈部近景，方便判断大小。", "包装只作为加分画面，不要抢过佩戴效果。"],
      merchantGoal: "这条视频主要测试消费者是否被佩戴反差和礼物感吸引。发布后看完播率、收藏、评论里的材质疑问和私信询价；如果播放高但询单少，补充价格、包装和佩戴尺寸说明。",
    },
    hair_accessory: {
      direction: "主打上头效果、颜色组合和宿舍日常。",
      shots: [
        { time: "0-2秒", focus: "强钩子", visual: "普通皮筋扎发切到大肠发圈上头效果。", copy: "扎头发好不好看，真的差一个发圈。", purpose: "用前后对比抓住注意力。" },
        { time: "3-6秒", focus: "展示最强效果", visual: "低丸子头、半扎发、低马尾三连切。", copy: "奶油色系上头之后很显干净。", purpose: "展示不同发型适配。" },
        { time: "7-11秒", focus: "颜色选择", visual: "多个颜色并排铺开，再逐个拿起对比。", copy: "这几个颜色放在宿舍里真的很容易被问。", purpose: "引导用户选择颜色。" },
        { time: "12-16秒", focus: "细节/组合", visual: "拉伸弹力、布料纹理、3件装/5件装组合。", copy: "日常用的话，组一套会比单个更好搭。", purpose: "强化套装购买理由。" },
        { time: "17-20秒", focus: "互动引导", visual: "定格颜色矩阵和上头效果。", copy: "你们想看哪几个颜色上头？", purpose: "收集颜色偏好和评论。" },
      ],
      coverTexts: ["平铺普通，上头真的不一样", "宿舍姐妹问链接的发圈", "奶油色系扎发太显干净了"],
      shootingNotes: ["一定要拍上头效果，不要只拍单个平铺图。", "颜色尽量在自然光下拍，避免色差太大。", "最好展示不同发型和发量。", "套装画面要拍清楚颜色组合和数量。"],
      merchantGoal: "这条视频主要测试消费者是否被上头效果和颜色组合吸引。发布后重点看完播率、评论区选色、私信询价和收藏；如果播放高但询单少，需要补充价格、套装和购买理由。",
    },
    home_lifestyle: {
      direction: "主打真实使用场景和宿舍/桌面氛围变化。",
      shots: [
        { time: "0-2秒", focus: "强钩子", visual: "杂乱桌面切到整理后氛围画面。", copy: "宿舍桌面变好看，其实只差这个小物。", purpose: "用结果对比让用户停留。" },
        { time: "3-6秒", focus: "展示最强效果", visual: "产品放在书桌、床头或办公室的真实画面。", copy: "放上去以后，整个角落会顺眼很多。", purpose: "让用户代入自己的空间。" },
        { time: "7-11秒", focus: "细节/功能", visual: "尺寸参照、材质纹理、容量或边角细节。", copy: "大小和质感要看清，不然很容易买回来不合适。", purpose: "解决尺寸和质感疑虑。" },
        { time: "12-16秒", focus: "包装/便利", visual: "开箱、包装保护、摆放过程。", copy: "如果是送人或者宿舍用，包装和稳定性也很重要。", purpose: "补充真实使用信任。" },
        { time: "17-20秒", focus: "互动引导", visual: "桌面、床头、办公室三格定格。", copy: "你会放在书桌、床头还是办公室？", purpose: "引导场景评论。" },
      ],
      coverTexts: ["宿舍桌面变好看就靠它", "小物一放，氛围感就来了", "这个角落终于顺眼了"],
      shootingNotes: ["不要只拍精修图，要拍真实使用环境。", "一定要给尺寸参照，避免用户误判大小。", "灯光可以有氛围，但不能暗到看不清细节。", "易碎或体积类产品要展示包装保护。"],
      merchantGoal: "这条视频主要测试消费者是否被真实场景和前后变化吸引。发布后看完播率、收藏、评论里的尺寸/摆放问题和私信询价；如果反馈弱，重拍更明确的使用前后对比。",
    },
    stationery_cultural: {
      direction: "主打故事感和包包装饰效果。",
      shots: [
        { time: "0-2秒", focus: "强钩子", visual: "普通帆布包切到挂上木珠果核挂饰后的效果。", copy: "包包有时候只差一个有记忆点的小挂件。", purpose: "用前后对比抓住注意力。" },
        { time: "3-6秒", focus: "展示细节", visual: "近拍木珠、果核纹理、绳结和金属扣。", copy: "木珠和果核拼在一起，有一点自然感和手作感。", purpose: "突出材质和细节。" },
        { time: "7-11秒", focus: "展示使用场景", visual: "切换帆布包、钥匙串、手账包三个使用场景。", copy: "挂包上、钥匙上、手账包上都不突兀。", purpose: "扩展使用场景。" },
        { time: "12-16秒", focus: "礼物感", visual: "包装、卡片或送朋友场景。", copy: "低预算但不敷衍的小礼物。", purpose: "强化送礼理由。" },
        { time: "17-20秒", focus: "互动引导", visual: "展示不同款式并排。", copy: "你会挂包上，还是当钥匙扣？", purpose: "引导评论和选择偏好。" },
      ],
      coverTexts: ["木珠果核小挂饰，挂包上很有氛围", "低预算文创礼物也能很特别", "喜欢自然感小物的人会懂"],
      shootingNotes: ["不要只拍单品，要拍帆布包、钥匙串或手账包使用场景。", "木珠、果核纹理和手作绳结要给近景。", "可以拍包装、卡片和送朋友场景。", "系列款要并排展示，收藏感会更强。"],
      merchantGoal: "这条视频主要测试消费者是否被故事感和使用场景吸引。发布后看完播率、收藏、评论里的主题偏好和私信询价；如果收藏高但询单少，补充包装、价格和更多使用场景。",
    },
    phone_accessory: {
      direction: "主打上机效果、功能演示和机型适配。",
      shots: [
        { time: "0-2秒", focus: "强钩子", visual: "裸机和装上后的快速对比。", copy: "手机壳好不好看，上机才知道。", purpose: "用反差吸引停留。" },
        { time: "3-6秒", focus: "展示最强效果", visual: "手持、侧面、背面、镜头区多个角度。", copy: "装上以后，风格会明显很多。", purpose: "证明上机颜值和手感。" },
        { time: "7-11秒", focus: "细节/功能", visual: "孔位、按键、镜头保护、边框厚度。", copy: "孔位和按键这些细节，真的会影响体验。", purpose: "解决适配疑虑。" },
        { time: "12-16秒", focus: "功能演示", visual: "支架角度、挂绳承重、防摔或镜头保护演示。", copy: "好看之外，日常用也要顺手。", purpose: "补充实用购买理由。" },
        { time: "17-20秒", focus: "互动引导", visual: "不同颜色或功能款定格。", copy: "你更喜欢实用款还是高颜值款？", purpose: "收集款式偏好。" },
      ],
      coverTexts: ["手机壳上机才知道好不好看", "裸机普通，装上立刻有风格", "实用和好看我都想要"],
      shootingNotes: ["一定要拍上机效果和手持效果。", "机型适配要写清楚，避免用户误会。", "孔位、按键、镜头保护要给近景。", "功能款要直接演示，不要只口播。"],
      merchantGoal: "这条视频主要测试消费者是否被上机效果和功能演示吸引。发布后看完播率、评论区机型需求、收藏和私信询价；如果评论都在问机型，优先补充适配清单和不同机型画面。",
    },
    daily_necessity: {
      direction: "主打使用前后对比和低预算实用价值。",
      shots: [
        { time: "0-2秒", focus: "强钩子", visual: "痛点画面直接出现。", copy: "这个小问题，我以前每天都忍。", purpose: "让用户快速共鸣。" },
        { time: "3-6秒", focus: "展示最强效果", visual: "使用前后对比。", copy: "用了以后差别其实很明显。", purpose: "证明它解决了具体问题。" },
        { time: "7-11秒", focus: "具体怎么用", visual: "一步一步展示使用过程。", copy: "用法很简单，不需要额外准备什么。", purpose: "降低使用门槛。" },
        { time: "12-16秒", focus: "组合/场景", visual: "宿舍、办公室、家庭和多件组合。", copy: "这种小东西适合放几个常用位置。", purpose: "强化囤货和组合理由。" },
        { time: "17-20秒", focus: "互动引导", visual: "组合装和使用结果定格。", copy: "这种小东西你会一次买几个？", purpose: "收集购买数量偏好。" },
      ],
      coverTexts: ["这个小问题终于解决了", "用前用后差别太明显", "宿舍和办公室都能囤"],
      shootingNotes: ["开头一定要先拍痛点，不要直接拍产品。", "使用前后对比要清楚，结果越直观越好。", "步骤不要太复杂，尽量一镜到底。", "组合装要拍出数量感和性价比。"],
      merchantGoal: "这条视频主要测试消费者是否被痛点和使用结果吸引。发布后看完播率、收藏、评论使用场景和私信询价；如果播放好但转化弱，补充价格、组合数量和真实使用频率。",
    },
  };

  packages.earring_accessory = packages.jewelry;
  packages.cultural_charm = packages.stationery_cultural;
  packages.wrist_accessory = {
    direction: "主打手腕佩戴效果、细节质感和低预算礼物感。",
    shots: [
      { time: "0-2秒", focus: "强钩子", visual: "平铺图切到戴在手腕上的近景。", copy: "这个手绳，戴上比平铺图更有细节。", purpose: "用佩戴反差让用户停留。" },
      { time: "3-6秒", focus: "展示最强效果", visual: "手腕自然摆动、拿书、拿杯子三个动作。", copy: "日常上课和通勤戴都不夸张。", purpose: "让用户代入真实佩戴场景。" },
      { time: "7-11秒", focus: "细节质感", visual: "近拍编织绳、珠子、扣头和结尾处。", copy: "编织绳和珠子细节要近看，才知道会不会廉价。", purpose: "降低做工和材质疑虑。" },
      { time: "12-16秒", focus: "尺寸/礼物", visual: "展示手腕松紧、可调节位置和小包装。", copy: "低预算送朋友，也可以有一点仪式感。", purpose: "补充购买理由。" },
      { time: "17-20秒", focus: "互动引导", visual: "不同颜色或款式并排。", copy: "你会自用，还是送朋友？", purpose: "引导评论和选择偏好。" },
    ],
    coverTexts: ["戴上手腕才知道它有多可爱", "低预算小手绳也能很有心意", "平铺普通，戴上更有细节"],
    shootingNotes: ["不要拍成挂件，一定要有手腕佩戴图。", "自然光下拍编织绳、珠子和扣头细节。", "要展示松紧、长度和不同手腕佩戴效果。", "礼物包装只作为补充，不要抢过佩戴效果。"],
    merchantGoal: "这条视频主要测试消费者是否被手腕佩戴效果、低预算礼物感和做工细节吸引。发布后看完播率、收藏、评论里的尺寸/松紧问题和私信询价；如果播放高但询单少，补充价格、包装和可选颜色。",
  };
  packages.stationery_cultural = {
    direction: "主打手帐/书桌使用场景、主题故事和系列收藏感。",
    shots: [
      { time: "0-2秒", focus: "强钩子", visual: "空白手帐页切到贴好主题贴纸后的效果。", copy: "一页手帐，有时候只差一套有主题的贴纸。", purpose: "用前后对比抓住注意力。" },
      { time: "3-6秒", focus: "展示主题", visual: "快速铺开整套贴纸、卡片或书签。", copy: "国风、城市记忆和旅行感放在一起很适合收藏。", purpose: "突出主题和系列感。" },
      { time: "7-11秒", focus: "细节质感", visual: "近拍印刷、透明度、边缘裁切和材质。", copy: "纸品细节要近看，才知道会不会显廉价。", purpose: "降低质感疑虑。" },
      { time: "12-16秒", focus: "使用场景", visual: "切换手帐、笔记本、明信片墙和书桌。", copy: "做手帐、装饰书桌、送朋友都挺合适。", purpose: "扩大使用场景。" },
      { time: "17-20秒", focus: "互动引导", visual: "不同主题系列并排展示。", copy: "你更喜欢国风、城市还是旅行主题？", purpose: "收集主题偏好。" },
    ],
    coverTexts: ["手帐有主题，真的会更想翻开", "低预算文创纸品也很有收藏感", "喜欢旅行纪念的人会懂"],
    shootingNotes: ["不要只拍单张纸品，要拍手帐或书桌使用场景。", "印刷、边缘、透明度和防水材质要给近景。", "系列款要并排展示，收藏感会更强。", "可以拍包装和送朋友场景，但不要混成钥匙扣挂件。"],
    merchantGoal: "这条视频主要测试消费者是否被主题故事、手帐使用效果和系列化吸引。发布后看完播率、收藏、评论区主题偏好和套装询价；如果互动高但询单弱，补充套装价格、包装和更多拼贴效果。",
  };
  return packages[identityKey] || packages[categoryKey] || packages.daily_necessity;
}

function uniqueWords(words, limit = 6) {
  return [...new Set((words || []).map((word) => String(word || "").trim()).filter(Boolean))].slice(0, limit);
}

function getProductMaterialWords(product) {
  const text = `${product.name} ${product.category} ${product.material} ${product.keywords} ${product.note}`;
  const materialMap = [
    ["珍珠", "珍珠质感"],
    ["合金", "合金材质"],
    ["钛钢", "钛钢"],
    ["925", "925银"],
    ["布", "布料纹理"],
    ["绒", "绒感面料"],
    ["木", "木质感"],
    ["果核", "果核元素"],
    ["PET", "防水PET"],
    ["玻璃", "玻璃质感"],
    ["陶瓷", "陶瓷质感"],
    ["TPU", "TPU软壳"],
    ["硅胶", "硅胶材质"],
  ];
  return materialMap.filter(([key]) => text.includes(key)).map(([, value]) => value);
}

function buildKeywordPlanFromIdentity(product, productIdentity) {
  if (!productIdentity?.identityKey) return null;
  const name = product?.name || productIdentity.displayName || "";
  const materialWords = getProductMaterialWords(product || {});
  const core = uniqueWords([name, ...(productIdentity.coreProductTerms || [])], 6);
  const scene = uniqueWords(productIdentity.scenarioTerms || [], 6);
  const style = uniqueWords(productIdentity.styleTerms || [], 6);
  const attribute = uniqueWords([...(materialWords || []), ...(productIdentity.functionTerms || [])], 6);
  const longTail = uniqueWords(productIdentity.longTailTerms || [], 6);
  const platformCopy = {
    earring_accessory: {
      xhsPain: ["不打耳洞戴什么", "耳夹不痛推荐", "显脸小耳饰", "平铺普通戴上好看"],
      dyPain: ["平铺普通戴上好看", "不打耳洞也能戴", "低预算变精致", "耳夹不痛"],
      ecommercePain: ["无耳洞可戴", "不夹耳", "显脸小", "低预算礼物"],
      titles: [
        ["小红书", `${name || "这款耳夹"}，春夏通勤戴真的很温柔`],
        ["抖音", `平铺普通，戴上才知道${name || "这对耳夹"}有多显气质`],
        ["电商平台", `${name || "珍珠耳夹"}女不打耳洞温柔风学生党通勤耳饰礼物`],
      ],
    },
    wrist_accessory: {
      xhsPain: ["手腕戴什么好看", "低预算手链推荐", "送朋友小礼物", "手绳松紧怎么选"],
      dyPain: ["平铺普通戴上好看", "手腕空空少点细节", "低预算礼物不尴尬", "小饰品戴上才知道"],
      ecommercePain: ["低预算礼物", "手腕佩戴", "可调节", "学生党礼物"],
      titles: [
        ["小红书", `${name || "这款手绳"}戴在手腕上，比平铺图更有细节`],
        ["抖音", `平铺普通，戴上手腕才知道${name || "这款手绳"}有多可爱`],
        ["电商平台", `${name || "编织手绳"}学生党低预算礼物小众手链手腕配饰`],
      ],
    },
    cultural_charm: {
      xhsPain: ["送朋友什么不尴尬", "小众礼物推荐", "钥匙串太普通", "包包怎么装饰"],
      dyPain: ["普通包太单调", "钥匙串太普通", "送礼不知道选什么", "小挂件怎么搭"],
      ecommercePain: ["低预算礼物", "钥匙串装饰", "包包装饰", "小众不撞款"],
      titles: [
        ["小红书", `${name || "这个小挂件"}挂在帆布包上真的很有氛围`],
        ["抖音", `普通包加一个${productIdentity.fallbackTerm || "小挂件"}，氛围感立刻不一样`],
        ["电商平台", `${name || "文创钥匙扣"}包包挂件小众低预算礼物手作挂饰`],
      ],
    },
    stationery_cultural: {
      xhsPain: ["手帐贴什么好看", "低预算文创礼物", "旅行纪念怎么收集", "贴纸套装怎么选"],
      dyPain: ["空白手帐太单调", "贴上之后氛围感不一样", "低预算文创礼物", "喜欢收藏的人会懂"],
      ecommercePain: ["低预算礼物", "手帐装饰", "旅行纪念", "系列套装"],
      titles: [
        ["小红书", `${name || "这套文创纸品"}，做手帐和旅行纪念都挺有氛围`],
        ["抖音", `空白手帐贴上${name || "这套贴纸"}，主题感立刻出来了`],
        ["电商平台", `${name || "国风贴纸套装"}手帐文创纸品旅行纪念低预算礼物`],
      ],
    },
    hair_accessory: {
      xhsPain: ["扎头发不好看", "发量少怎么扎", "发圈不勒头", "平铺普通上头好看"],
      dyPain: ["普通皮筋显土", "扎发没氛围", "发量少显秃", "颜色不会选"],
      ecommercePain: ["不勒头", "显发量", "不掉发", "百搭颜色"],
      titles: [
        ["小红书", `${name || "这款发圈"}上头效果比平铺图好看太多`],
        ["抖音", `扎头发好不好看，真的差一个${productIdentity.fallbackTerm || "发圈"}`],
        ["电商平台", `${name || "大肠发圈"}女温柔风显发量不勒头学生党扎发套装`],
      ],
    },
  };
  const copy = platformCopy[productIdentity.identityKey] || {
    xhsPain: ["真实使用效果", "低预算好物", "适合谁用", "不踩雷"],
    dyPain: ["用了才知道", "解决小麻烦", "真实效果", "便宜但实用"],
    ecommercePain: ["性价比", "实用", "多场景", "便宜"],
    titles: [
      ["小红书", `${name || "这个小物"}真实使用效果，比单看产品图更有参考`],
      ["抖音", `${name || "这个小物"}用了才知道，到底解决了什么小麻烦`],
      ["电商平台", `${name || "实用小物"}低预算多场景日用学生党好物`],
    ],
  };
  return {
    xhs: {
      core,
      scene,
      pain: uniqueWords(copy.xhsPain, 6),
      style,
      attribute,
      longTail,
    },
    douyin: {
      core: uniqueWords([...(productIdentity.coreProductTerms || []), `${productIdentity.fallbackTerm || "小物"}推荐`], 6),
      scene: uniqueWords([...(scene || []), "使用演示", "前后对比"], 6),
      pain: uniqueWords(copy.dyPain, 6),
      style: uniqueWords([...(style || []), "戴上才知道", "真实效果"], 6),
      attribute,
      longTail,
    },
    ecommerce: {
      core,
      scene: uniqueWords([...(scene || []), "学生党", "送朋友"], 6),
      pain: uniqueWords(copy.ecommercePain, 6),
      style,
      attribute,
      longTail,
    },
    titles: copy.titles,
  };
}

export function getPlatformKeywordPlan(product, categoryKey, productIdentity = null) {
  const identityPlan = buildKeywordPlanFromIdentity(product, productIdentity);
  if (identityPlan) return identityPlan;
  const name = product.name || "";
  const materialWords = getProductMaterialWords(product);
  const withName = (items) => uniqueWords(name ? [name, ...items] : items, 6);
  const templates = {
    jewelry: {
      xhs: {
        core: withName(["珍珠耳夹", "不打耳洞耳夹", "蝴蝶结耳夹", "温柔风耳夹", "显脸小耳饰"]),
        scene: ["通勤配饰", "春夏穿搭", "约会配饰", "低预算礼物", "校园穿搭"],
        pain: ["不打耳洞戴什么", "耳夹不痛推荐", "显脸小耳饰", "平铺普通戴上好看"],
        style: ["温柔风", "法式感", "氛围感", "小众配饰", "精致感"],
        attribute: uniqueWords([...materialWords, "不打耳洞", "轻便", "礼盒装", "珍珠光泽"], 6),
      },
      douyin: {
        core: withName(["耳夹推荐", "珍珠耳夹", "显脸小耳饰", "不打耳洞耳饰"]),
        scene: ["约会穿搭", "通勤变精致", "春夏配饰", "低预算礼物"],
        pain: ["平铺普通戴上好看", "不打耳洞也能戴", "低预算变精致", "耳夹不痛"],
        style: ["戴上才知道", "氛围感拉满", "温柔显气质", "精致感加分"],
        attribute: uniqueWords([...materialWords, "上耳效果", "近景光泽", "礼盒包装", "轻便耳夹"], 6),
      },
      ecommerce: {
        core: withName(["珍珠耳夹", "蝴蝶结耳夹", "无耳洞耳夹", "女款耳饰"]),
        scene: ["学生党", "通勤", "约会", "送女友", "生日礼物"],
        pain: ["无耳洞可戴", "不夹耳", "显脸小", "低预算礼物"],
        style: ["温柔风", "法式", "小众", "春夏", "精致"],
        attribute: uniqueWords([...materialWords, "合金", "仿珍珠", "轻便", "礼盒装"], 6),
      },
      titles: [
        ["小红书", "不打耳洞也能戴的珍珠耳夹，春夏通勤真的很温柔"],
        ["抖音", "平铺普通，戴上才知道这对耳夹有多显气质"],
        ["电商平台", "蝴蝶结珍珠耳夹女不打耳洞温柔风学生党通勤耳饰礼物"],
      ],
    },
    hair_accessory: {
      xhs: {
        core: withName(["大肠发圈", "奶油色发圈", "温柔发饰", "显发量发圈"]),
        scene: ["宿舍好物", "校园穿搭", "通勤扎发", "上课发型", "镜子前出门"],
        pain: ["扎头发不好看", "发量少怎么扎", "发圈不勒头", "平铺普通上头好看"],
        style: ["奶油色系", "温柔感", "干净感", "低预算好物", "宿舍姐妹同款"],
        attribute: uniqueWords([...materialWords, "弹力好", "布料纹理", "不勒头", "套装组合", "颜色矩阵"], 6),
      },
      douyin: {
        core: withName(["发圈推荐", "大肠发圈", "上头好看的发圈", "扎发神器"]),
        scene: ["宿舍日常", "校园出门", "通勤扎发", "半扎发", "丸子头"],
        pain: ["普通皮筋显土", "扎发没氛围", "发量少显秃", "颜色不会选"],
        style: ["上头才知道", "温柔显干净", "奶油色太百搭", "宿舍姐妹问链接"],
        attribute: uniqueWords([...materialWords, "弹力展示", "颜色组合", "3件装", "5件装", "布料厚度"], 6),
      },
      ecommerce: {
        core: withName(["大肠发圈", "奶油色发圈", "女款发饰", "扎发发圈"]),
        scene: ["学生党", "宿舍", "通勤", "日常扎发", "送同学"],
        pain: ["不勒头", "显发量", "不掉发", "百搭颜色"],
        style: ["温柔风", "奶油色", "韩系", "简约", "少女感"],
        attribute: uniqueWords([...materialWords, "弹力发绳", "布艺", "套装", "多色可选", "厚实"], 6),
      },
      titles: [
        ["小红书", "奶油色大肠发圈，上头效果比平铺图好看太多"],
        ["抖音", "扎头发好不好看，真的差一个发圈"],
        ["电商平台", "奶油色大肠发圈女温柔风显发量不勒头学生党扎发套装"],
      ],
    },
    home_lifestyle: {
      xhs: {
        core: withName(["桌面好物", "宿舍好物", "家居小物", "氛围感摆件"]),
        scene: ["宿舍桌面", "办公桌", "床头小物", "书桌改造", "低预算改造"],
        pain: ["桌面乱怎么办", "宿舍太单调", "小空间改造", "提升幸福感"],
        style: ["生活方式感", "治愈感", "氛围感", "干净桌搭", "精致生活"],
        attribute: uniqueWords([...materialWords, "尺寸参照", "容量", "防碎包装", "易摆放", "不占地方"], 6),
      },
      douyin: {
        core: withName(["宿舍桌面好物", "家居小物", "办公室好物", "桌面改造"]),
        scene: ["宿舍改造", "办公桌整理", "床头布置", "书桌氛围", "开箱摆放"],
        pain: ["桌面杂乱", "宿舍没氛围", "小空间不好收纳", "买回来怕不合适"],
        style: ["改造前后对比", "小物提升幸福感", "低预算变好看", "氛围感来了"],
        attribute: uniqueWords([...materialWords, "尺寸对比", "真实使用", "包装保护", "材质细节", "稳定摆放"], 6),
      },
      ecommerce: {
        core: withName(["家居小物", "宿舍桌面摆件", "办公室桌面好物", "生活用品"]),
        scene: ["宿舍", "办公室", "床头", "书桌", "送室友"],
        pain: ["收纳整理", "不占地方", "桌面美化", "低预算改造"],
        style: ["简约", "氛围感", "治愈", "ins风", "实用"],
        attribute: uniqueWords([...materialWords, "尺寸", "容量", "材质", "防摔包装", "轻便"], 6),
      },
      titles: [
        ["小红书", "宿舍桌面变好看，其实只差这个低预算小物"],
        ["抖音", "杂乱桌面变顺眼，这个小物放上去氛围感就来了"],
        ["电商平台", "宿舍桌面好物家居小物办公室床头摆件低预算氛围感礼物"],
      ],
    },
    stationery_cultural: {
      xhs: {
        core: withName(["文创小物", "国风挂件", "钥匙扣", "包包挂件", "手作感小物"]),
        scene: ["校园市集", "文旅纪念", "低预算礼物", "帆布包搭配", "手账周边"],
        pain: ["送朋友什么不尴尬", "小众礼物推荐", "钥匙串太普通", "包包怎么装饰"],
        style: ["国风感", "自然感", "故事感", "手作感", "小众审美"],
        attribute: uniqueWords([...materialWords, "木珠", "果核元素", "挂饰", "可挂包", "可当钥匙扣"], 6),
      },
      douyin: {
        core: withName(["小挂件推荐", "钥匙扣推荐", "包包挂件", "文创小物"]),
        scene: ["包包装饰", "低预算礼物", "校园市集小物", "文旅小礼物"],
        pain: ["普通包太单调", "钥匙串太普通", "送礼不知道选什么"],
        style: ["有故事感", "氛围感小物", "手作感", "自然风"],
        attribute: uniqueWords([...materialWords, "木珠挂件", "果核挂饰", "可挂包", "轻便小物"], 6),
      },
      ecommerce: {
        core: withName(["钥匙扣", "包包挂件", "文创挂件", "国风挂饰", "手作挂件"]),
        scene: ["送朋友", "学生礼物", "文旅纪念", "校园市集", "帆布包挂件"],
        pain: ["低预算礼物", "钥匙串装饰", "包包装饰", "小众不撞款"],
        style: ["国风", "自然感", "手作感", "小众", "故事感"],
        attribute: uniqueWords([...materialWords, "木珠", "果核", "手作风", "挂饰", "钥匙圈", "轻便"], 6),
        longTail: ["文创钥匙扣小众礼物", "木珠果核包包挂件", "国风手作钥匙扣", "低预算送女生小礼物"],
      },
      titles: [
        ["小红书", "这个木珠小挂件，挂在帆布包上真的很有氛围"],
        ["抖音", "普通包加一个小挂件，氛围感立刻不一样"],
        ["电商平台", "木珠果核文创钥匙扣包包挂件小众低预算礼物"],
      ],
    },
    phone_accessory: {
      xhs: {
        core: withName(["手机壳", "手机挂绳", "手机支架", "镜头保护", "数码配件"]),
        scene: ["通勤出门", "拍照出片", "上机效果", "日常防摔", "个性化搭配"],
        pain: ["裸机怕摔", "孔位不准怎么办", "手机壳太厚", "挂绳好不好用"],
        style: ["高颜值", "实用党", "个性化", "简约耐看", "上机才知道"],
        attribute: uniqueWords([...materialWords, "机型适配", "防摔", "支架角度", "挂绳承重", "按键孔位"], 6),
      },
      douyin: {
        core: withName(["手机壳推荐", "上机效果", "手机挂绳", "防摔手机壳", "支架手机壳"]),
        scene: ["裸机对比", "通勤使用", "单手携带", "拍照支架", "出门解放双手"],
        pain: ["手机壳好不好看上机才知道", "孔位不准很麻烦", "怕摔手机", "挂绳牢不牢"],
        style: ["装上立刻有风格", "实用和好看都要", "高颜值数码配件", "功能演示"],
        attribute: uniqueWords([...materialWords, "防摔测试", "镜头保护", "孔位细节", "支架演示", "机型清单"], 6),
      },
      ecommerce: {
        core: withName(["手机壳", "手机挂绳", "手机支架", "防摔手机壳", "镜头保护壳"]),
        scene: ["学生党", "通勤", "拍照", "出门", "送朋友"],
        pain: ["防摔", "不挡镜头", "孔位精准", "挂绳承重", "轻薄"],
        style: ["透明", "高颜值", "个性", "简约", "实用"],
        attribute: uniqueWords([...materialWords, "适配机型", "TPU", "镜头保护", "按键灵敏", "支架功能"], 6),
      },
      titles: [
        ["小红书", "手机壳别只看产品图，上机效果才最直观"],
        ["抖音", "裸机普通，装上这个手机壳立刻有风格"],
        ["电商平台", "透明防摔手机壳挂绳支架镜头保护适配多机型高颜值实用"],
      ],
    },
    daily_necessity: {
      xhs: {
        core: withName(["低价好物", "实用小物", "生活小工具", "宿舍神器", "办公室好物"]),
        scene: ["宿舍日常", "办公室", "家庭收纳", "清洁整理", "囤货清单"],
        pain: ["每天都忍的小问题", "使用前后对比", "懒人友好", "提升效率", "便宜又实用"],
        style: ["性价比", "实用党", "低预算", "方便省事", "生活幸福感"],
        attribute: uniqueWords([...materialWords, "多件组合", "独立包装", "小巧", "耐用", "易收纳"], 6),
      },
      douyin: {
        core: withName(["生活小妙招", "实用小物", "低价好物", "宿舍神器", "懒人工具"]),
        scene: ["宿舍清洁", "办公室使用", "家庭日用", "囤货组合", "使用演示"],
        pain: ["这个问题终于解决了", "用前用后差别明显", "每天都用得到", "便宜但实用"],
        style: ["懒人友好", "效率提升", "小东西大作用", "性价比高", "真实好用"],
        attribute: uniqueWords([...materialWords, "组合装", "批量囤货", "尺寸说明", "容量", "独立包装"], 6),
      },
      ecommerce: {
        core: withName(["低价日用", "实用小物", "生活小工具", "宿舍神器", "家庭收纳"]),
        scene: ["宿舍", "办公室", "家庭", "清洁", "团购"],
        pain: ["便宜又实用", "多件组合", "囤货", "省时省力", "懒人必备"],
        style: ["性价比", "简约", "实用", "耐用", "低预算"],
        attribute: uniqueWords([...materialWords, "组合装", "尺寸", "容量", "独立包装", "批量装"], 6),
      },
      titles: [
        ["小红书", "这个低价实用小物，宿舍和办公室都能用"],
        ["抖音", "这个小问题我以前每天都忍，用了以后差别太明显"],
        ["电商平台", "低价实用小物宿舍办公室家庭日用多件组合懒人清洁收纳工具"],
      ],
    },
  };
  const fallback = {
    xhs: {
      core: withName(["实用小物", "低预算好物", "生活好物", "小众好物"]),
      scene: ["宿舍", "通勤", "办公室", "送朋友", "日常使用"],
      pain: ["不知道怎么选", "真实使用效果", "性价比", "不踩雷"],
      style: ["实用", "小众", "低预算", "氛围感", "方便"],
      attribute: uniqueWords([...materialWords, "尺寸", "材质", "功能", "包装", "轻便"], 6),
    },
    douyin: {
      core: withName(["实用小物推荐", "低价好物", "生活小工具", "真实使用"]),
      scene: ["使用演示", "前后对比", "日常场景", "开箱展示", "评论区选款"],
      pain: ["用了才知道", "解决小麻烦", "便宜但实用", "真实效果"],
      style: ["一眼看懂", "实用党", "低预算", "小东西大作用", "真实好用"],
      attribute: uniqueWords([...materialWords, "功能展示", "尺寸参照", "材质细节", "组合", "包装"], 6),
    },
    ecommerce: {
      core: withName(["实用小物", "生活好物", "低价好物", "日用小商品"]),
      scene: ["学生党", "宿舍", "办公室", "家庭", "送礼"],
      pain: ["性价比", "实用", "不占地方", "多场景", "便宜"],
      style: ["简约", "小众", "实用", "低预算", "百搭"],
      attribute: uniqueWords([...materialWords, "尺寸", "材质", "功能", "包装", "多件装"], 6),
    },
    titles: [
      ["小红书", `${name || "这个小物"}真实使用效果，比单看产品图更有参考`],
      ["抖音", `${name || "这个小物"}用了才知道，到底解决了什么小麻烦`],
      ["电商平台", `${name || "实用小物"}低预算多场景日用学生党宿舍办公室好物`],
    ],
  };
  const plan = templates[categoryKey] || fallback;
  const normalizePlatform = (platform) => ({
    core: uniqueWords(platform.core, 6),
    scene: uniqueWords(platform.scene, 6),
    pain: uniqueWords(platform.pain, 6),
    style: uniqueWords(platform.style, 6),
    attribute: uniqueWords(platform.attribute, 6),
    longTail: uniqueWords(platform.longTail || [], 6),
  });
  return {
    xhs: normalizePlatform(plan.xhs),
    douyin: normalizePlatform(plan.douyin),
    ecommerce: normalizePlatform(plan.ecommerce),
    titles: plan.titles,
  };
}

function formatKeywordPlatform(platform) {
  return [
    `核心产品词：${platform.core.join("、")}`,
    `场景词：${platform.scene.join("、")}`,
    `痛点词：${platform.pain.join("、")}`,
    `风格/情绪词：${platform.style.join("、")}`,
    `属性/功能词：${platform.attribute.join("、")}`,
    platform.longTail?.length ? `长尾词：${platform.longTail.join("、")}` : "",
  ].filter(Boolean).join(String.fromCharCode(10));
}function getCategoryRule(categoryKey) {
  return categoryTermRules[categoryKey] || categoryTermRules.unknown;
}

function contentToText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(contentToText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(contentToText).join(" ");
  return String(value || "");
}

function hasAnyTerm(text, terms) {
  return (terms || []).some((term) => term && String(text || "").includes(term));
}

function getCoreProductTerms(product, categoryKey) {
  const rule = getCategoryRule(categoryKey);
  const source = `${product?.name || ""} ${product?.category || ""} ${product?.material || ""} ${product?.keywords || ""} ${product?.note || ""}`;
  const fromAllowed = rule.allowedTerms.filter((term) => source.includes(term) || productText(product || {}).includes(term.toLowerCase()));
  const name = String(product?.name || "").trim();
  const category = String(product?.category || "").trim();
  const material = String(product?.material || "").trim();
  return uniqueWords([name, category, ...fromAllowed, material, ...rule.allowedTerms.slice(0, 4)].filter((term) => String(term).length >= 2), 10);
}

function buildProductIdentity(product, categoryKey) {
  return inferProductIdentity(product, categoryKey);
}

export function createContentContext(product, hasImage, market, channelFit, priceBand, moqAdvice) {
  const productIdentity = buildProductIdentity(product, market?.categoryKey);
  const categoryKey = productIdentity.categoryKey || market?.categoryKey || inferCategoryKey(product);
  const rule = getCategoryRule(categoryKey);
  const effectivePrice = getEffectivePrice(product);
  const rawCoreTerms = getCoreProductTerms(product, categoryKey);
  const coreProductTerms = uniqueWords([
    productIdentity.displayName,
    productIdentity.productTypeLabel,
    ...(productIdentity.coreProductTerms || []),
    ...rawCoreTerms.filter((term) => !hasAnyTerm(term, productIdentity.forbiddenIdentityTerms || [])),
    ...(productIdentity.allowedIdentityTerms || []).slice(0, 6),
  ], 12);
  return {
    productName: productIdentity.displayName,
    category: productIdentity.productTypeLabel || product?.category || market?.marketType || "",
    categoryKey,
    categoryName: market?.categoryName || categoryTemplates[categoryKey]?.label || "待判断品类",
    material: product?.material || "",
    audience: product?.audience || "",
    channel: product?.channel || "",
    price: effectivePrice.price,
    cost: effectivePrice.cost,
    moq: n(product?.moq),
    supplier: product?.supplier || "",
    keywords: product?.keywords || "",
    uploadedImage: Boolean(hasImage),
    productIdentity,
    identityKey: productIdentity.identityKey,
    coreProductTerms,
    allowedTerms: uniqueWords([...(rule.allowedTerms || []), ...(productIdentity.allowedTerms || []), ...(productIdentity.allowedIdentityTerms || [])], 48),
    bannedTerms: uniqueWords([...(rule.bannedTerms || []), ...(productIdentity.bannedTerms || []), ...(productIdentity.forbiddenIdentityTerms || [])], 48),
    sceneTerms: uniqueWords([...(productIdentity.scenarioTerms || []), ...rule.allowedTerms.filter((term) => /场景|宿舍|校园|通勤|约会|市集|文旅|帆布包|办公室|家庭|包包|手腕|钥匙|手机/.test(term))], 10),
    sellingPoints: uniqueWords([...coreProductTerms, ...(productIdentity.styleTerms || []), ...(productIdentity.functionTerms || []), ...rule.allowedTerms.slice(0, 4)], 10),
    risks: [],
    platformFit: channelFit,
    priceBand,
    moqRisk: moqAdvice,
    effectivePrice,
    fallbackTerm: productIdentity.fallbackTerm || rule.fallbackTerm,
  };
}

function dedupeRepeatedSentences(text) {
  const counts = new Map();
  return String(text || "")
    .split(/(?<=[。！？\n])/)
    .filter((part) => {
      const key = part.trim().replace(/\s+/g, "");
      if (key.length < 18) return true;
      const count = counts.get(key) || 0;
      counts.set(key, count + 1);
      return count < 2;
    })
    .join("");
}

function getNaturalReplacementTerm(contentContext, bannedTerm = "") {
  const identityKey = contentContext?.identityKey || contentContext?.productIdentity?.identityKey;
  const term = String(bannedTerm || "");

  if (identityKey === "wrist_accessory") {
    if (/钥匙|挂件|挂饰|挂包|包包|帆布包|文创挂件/.test(term)) return "手腕佩戴效果";
    if (/发圈|扎发|上头|丸子头|发量|皮筋|不勒头/.test(term)) return "手腕佩戴效果";
    if (/耳夹|耳洞|耳饰|耳环/.test(term)) return "手腕饰品";
    return "手腕饰品";
  }

  if (identityKey === "cultural_charm") {
    if (/手链|手绳|腕饰|手腕/.test(term)) return "包包装饰效果";
    if (/发圈|扎发|上头|丸子头/.test(term)) return "挂饰搭配效果";
    if (/耳夹|耳洞|耳饰|耳环/.test(term)) return "文创挂饰";
    return contentContext?.productIdentity?.fallbackTerm || "文创挂饰";
  }

  if (identityKey === "hair_accessory") {
    if (/钥匙|挂件|挂饰|挂包|包包/.test(term)) return "上头效果";
    if (/手链|手绳|腕饰|手腕/.test(term)) return "发饰";
    if (/耳夹|耳洞|耳饰|耳环/.test(term)) return "发饰";
    return contentContext?.productIdentity?.fallbackTerm || "发饰";
  }

  if (identityKey === "earring_accessory" || contentContext?.categoryKey === "jewelry") {
    if (/发圈|扎发|上头|丸子头/.test(term)) return "佩戴效果";
    if (/钥匙|挂件|挂饰|挂包|包包/.test(term)) return "饰品";
    if (/手链|手绳|腕饰|手腕/.test(term)) return "饰品";
    return contentContext?.productIdentity?.fallbackTerm || "饰品";
  }

  return contentContext?.productIdentity?.fallbackTerm || getCategoryRule(contentContext?.categoryKey).fallbackTerm || "该产品";
}

function normalizeGeneratedText(value) {
  let text = String(value || "");

  const wristCoverFallback = "不要只拍平铺图，建议补充手腕佩戴图和细节图，否则用户很难判断大小、松紧和搭配效果。";
  text = text
    .replace(/不要把手绳拍成(?:手链手绳|手腕饰品|手腕佩戴效果)(?:\s*(?:或|和|、|\/)\s*(?:手链手绳|手腕饰品|手腕佩戴效果))*[^。；;\n]*(?:[。；;]|$)/g, wristCoverFallback)
    .replace(/不要把手链拍成(?:手链手绳|手腕饰品|手腕佩戴效果)(?:\s*(?:或|和|、|\/)\s*(?:手链手绳|手腕饰品|手腕佩戴效果))*[^。；;\n]*(?:[。；;]|$)/g, wristCoverFallback)
    .replace(/不要把手腕饰品拍成手腕饰品[^。；;\n]*(?:[。；;]|$)/g, wristCoverFallback)
    .replace(/手链手绳(?:\s*(?:或|和|、|\/)\s*手链手绳)+/g, "手链 / 手绳")
    .replace(/手腕饰品(?:\s*(?:或|和|、|\/)\s*手腕饰品)+/g, "手腕饰品")
    .replace(/手腕佩戴效果(?:\s*(?:或|和|、|\/)\s*手腕佩戴效果)+/g, "手腕佩戴效果")
    .replace(/手链手绳类/g, "手链 / 手绳类")
    .replace(/手链手绳/g, "手链 / 手绳");

  for (let i = 0; i < 3; i += 1) {
    text = text
      .replace(/([\u4e00-\u9fa5A-Za-z0-9]{2,10})\s*(或|和|、|\/)\s*\1/g, "$1")
      .replace(/([\u4e00-\u9fa5A-Za-z0-9]{2,10})(，\1)+/g, "$1")
      .replace(/([\u4e00-\u9fa5A-Za-z0-9]{2,10})(、\1)+/g, "$1");
  }

  return text
    .replace(/\s*\/\s*\/\s*/g, " / ")
    .replace(/、{2,}/g, "、")
    .replace(/，，+/g, "，")
    .replace(/。。+/g, "。")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeStringByContext(contentContext, value, moduleName = "") {
  const rule = getCategoryRule(contentContext?.categoryKey);
  let text = String(value || "");
  const bannedTerms = uniqueWords([...(rule.bannedTerms || []), ...(contentContext?.productIdentity?.bannedTerms || []), ...(contentContext?.productIdentity?.forbiddenIdentityTerms || [])], 80);
  bannedTerms.sort((a, b) => b.length - a.length).forEach((term) => {
    if (term) text = text.replaceAll(term, getNaturalReplacementTerm(contentContext, term));
  });
  text = normalizeGeneratedText(text);
  if (moduleName === "report") text = dedupeRepeatedSentences(text);
  return normalizeGeneratedText(text);
}

function sanitizeGeneratedObject(contentContext, value, moduleName = "") {
  if (typeof value === "string") return sanitizeStringByContext(contentContext, value, moduleName);
  if (Array.isArray(value)) return value.map((item) => sanitizeGeneratedObject(contentContext, item, moduleName));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeGeneratedObject(contentContext, item, moduleName)]));
  }
  return value;
}

function anchorGeneratedContent(contentContext, value) {
  const anchor = contentContext?.productName || contentContext?.fallbackTerm || "该产品";
  if (typeof value === "string") return `针对${anchor}：${value}`;
  if (Array.isArray(value)) {
    if (!value.length) return [`针对${anchor}补充当前品类判断。`];
    return [`针对${anchor}：${value[0]}`, ...value.slice(1)];
  }
  if (value && typeof value === "object") return { contextAnchor: `当前内容基于${anchor}生成。`, ...value };
  return value;
}

export function validateGeneratedContent(contentContext, generatedContent, moduleName = "module") {
  const cleaned = sanitizeGeneratedObject(contentContext, generatedContent, moduleName);
  const text = contentToText(cleaned);
  const bannedHits = (contentContext?.bannedTerms || []).filter((term) => term && text.includes(term));
  const missingCoreTerm = contextRequiredModules.has(moduleName) && !hasAnyTerm(text, contentContext?.coreProductTerms || []);
  const content = missingCoreTerm ? anchorGeneratedContent(contentContext, cleaned) : cleaned;
  return {
    ok: bannedHits.length === 0 && !missingCoreTerm,
    content,
    bannedHits,
    missingCoreTerm,
  };
}

function validateContentByCategory(categoryKey, generatedContent) {
  const market = categoryTemplates[categoryKey] || categoryTemplates.unknown;
  const contentContext = createContentContext({}, false, { categoryKey, categoryName: market.label, marketType: market.marketType }, null, null, null);
  return validateGeneratedContent(contentContext, generatedContent);
}

function scrubHairOnlyTerms(categoryKey, content) {
  const market = categoryTemplates[categoryKey] || categoryTemplates.unknown;
  const contentContext = createContentContext({}, false, { categoryKey, categoryName: market.label, marketType: market.marketType }, null, null, null);
  return sanitizeStringByContext(contentContext, content);
}

export function inferMarketInfo(product) {
  const categoryKey = inferCategoryKey(product);
  const template = categoryTemplates[categoryKey] || categoryTemplates.unknown;

  return {
    categoryKey,
    categoryName: template.label,
    marketType: product.category || template.marketType,
    categoryFocus: template.focus,
    categoryInsight: template.insight,
    cover: template.cover,
    xhsTitles: template.titles(product),
    douyinScript: template.script,
    imageAdvice: template.imageAdvice,
    contentRisk: template.contentRisk,
    differentiation: template.differentiation,
    testActions: template.testActions,
    contentWords: template.contentWords,
  };
}

export function analyzeProduct(product, hasImage) {
  const market = inferMarketInfo(product);
  const categoryKey = market.categoryKey;
  const channelFit = getChannelFit(product, categoryKey);
  const effectivePrice = getEffectivePrice(product);
  const cost = effectivePrice.cost;
  const price = effectivePrice.price;
  const moq = n(product.moq);
  const priceBand = getPriceBand(price);
  const moqAdvice = getMoqAdvice(moq);
  const contentContext = createContentContext(product, hasImage, market, channelFit, priceBand, moqAdvice);
  const identityProduct = {
    ...product,
    name: contentContext.productIdentity.displayName,
    category: contentContext.productIdentity.productTypeLabel,
  };
  const validateModule = (moduleName, generatedContent) => validateGeneratedContent(contentContext, generatedContent, moduleName).content;
  const imagePlan = validateModule("imagePlan", getImageContentPlan(contentContext.categoryKey, contentContext.platformFit, contentContext.productIdentity));
  const xhsPackage = validateModule("xhsPackage", getXhsContentPackage(identityProduct, contentContext.categoryKey, contentContext.productIdentity));
  const douyinPackage = validateModule("douyinPackage", getDouyinVideoPackage(identityProduct, contentContext.categoryKey, contentContext.productIdentity));
  const keywordPlan = validateModule("keywordPlan", getPlatformKeywordPlan(identityProduct, contentContext.categoryKey, contentContext.productIdentity));

  const categoryPackaging = {
    jewelry: /礼盒|包装|礼物/.test(`${product.supplier} ${product.note}`) ? 1.8 : 1.1,
    hair_accessory: 0.6,
    home_lifestyle: /易碎|玻璃|陶瓷|杯/.test(`${product.material} ${product.logistics}`) ? 4.2 : 2.5,
    stationery_cultural: 0.8,
    phone_accessory: 0.9,
    daily_necessity: 0.45,
    unknown: 0.8,
  };

  const categoryLogistics = {
    jewelry: 1.2,
    hair_accessory: 0.9,
    home_lifestyle: /易碎|玻璃|陶瓷|杯/.test(`${product.material} ${product.logistics}`) ? 5.5 : 3.2,
    stationery_cultural: 0.9,
    phone_accessory: 1.1,
    daily_necessity: 0.8,
    unknown: 1.2,
  };

  const packaging = categoryPackaging[categoryKey] ?? 0.8;
  const logisticsCost = categoryLogistics[categoryKey] ?? 1.2;
  const platformFee = price * 0.05;
  const extraCost = price > 0 && cost > 0 ? packaging + logisticsCost + platformFee : 0;
  const unitCost = cost;
  const profit = effectivePrice.grossProfit;
  const margin = effectivePrice.grossMargin;
  const stockCost = cost * moq;

  const text = `${product.name} ${product.category} ${product.material} ${product.audience} ${product.channel} ${product.keywords} ${product.note}`;
  const hotWords = ["小红书", "抖音", "学生", "礼物", "拍照", "出片", "通勤", "校园", "宿舍", "私域", "市集", ...market.contentWords];
  const hotScore = hotWords.filter((word) => text.includes(word)).length * 4;
  const declaredChannelFit = channelFit.declared !== "未填写" && channelFit.best.split(/[+ /]/).some((item) => item && channelFit.declared.includes(item.trim()));
  const channelScore = channelFit.score;
  const categoryRiskPenalty =
    (categoryKey === "home_lifestyle" && /易碎|玻璃|陶瓷/.test(`${product.material} ${product.logistics}`) ? 10 : 0) +
    (categoryKey === "phone_accessory" && moq > 200 ? 12 : 0) +
    (categoryKey === "daily_necessity" && margin < 0.45 ? 8 : 0) +
    (categoryKey === "jewelry" && !/925|银|钛钢|合金|珍珠|材质/.test(`${product.material} ${product.note}`) ? 6 : 0);

  const profitScore = price > 0 && cost > 0 ? clamp(margin * 145, 30, 96) : 35;
  const contentScore = clamp(48 + hotScore + (hasImage ? 9 : 0) + (declaredChannelFit ? 7 : 0), 38, 96);
  const supplyScore = clamp(92 - (moq > 300 ? 28 : moq > 150 ? 18 : moq > 80 ? 10 : 2) + ((product.supplier || "").includes("补货") ? 6 : 0), 35, 95);
  const riskScore = clamp(82 - (product.competitorPrice ? 0 : 8) - categoryRiskPenalty - (moq > 300 ? 10 : 0), 35, 92);
  const infoScore = clamp(45 + [product.name, product.category, cost, price, product.moq, product.audience, product.channel, product.supplier].filter(Boolean).length * 6 + (hasImage ? 7 : 0), 35, 98);

  const totalScore = Math.round(
    profitScore * 0.24 +
      channelScore * 0.18 +
      contentScore * 0.22 +
      supplyScore * 0.14 +
      riskScore * 0.12 +
      infoScore * 0.1
  );

  let level = "建议小批量测款";
  let status = "正在测款";
  if (totalScore >= 82 && margin >= 0.35 && stockCost <= 1800 && moq <= 150) {
    level = "推荐拿样并快速测款";
    status = "准备拿样";
  }
  if (totalScore >= 88 && margin >= 0.45 && (product.supplier || "").includes("补货") && moq <= 150) {
    level = "高潜力，建议进入补货观察";
    status = "建议补货";
  }
  if (totalScore < 65 || margin < 0.22 || stockCost > 3000 || (moq > 300 && totalScore < 82)) {
    level = "暂不建议直接进货";
    status = "暂不考虑";
  }

  const imageExamples = (imagePlan.mustShoot || [])
    .slice(0, 3)
    .map((item) => String(item).split("：")[0])
    .join("、");
  const visualEvidenceNote = hasImage
    ? `已基于上传图片完成初步判断，但仍建议补充更完整的实拍素材，例如${imageExamples || "细节图、场景图和尺寸参照图"}，以提升测款准确性。`
    : `暂未上传产品图片，当前视觉判断主要基于文字信息。建议补充${imageExamples || "实拍图"}后，再校准封面吸引力、细节质感和内容测款判断。`;

  const contentRisk = validateGeneratedContent(contentContext, market.contentRisk, "risks").content;
  const differentiation = validateModule("differentiation", getIdentityDifferentiation(contentContext.productIdentity, market.differentiation));
  const categoryTestActions = validateGeneratedContent(contentContext, market.testActions, "testStandards").content;
  const safeMarket = {
    ...market,
    contentRisk,
    differentiation,
    testActions: categoryTestActions,
  };
  const categoryNarrative = validateGeneratedContent(contentContext, getCategoryNarrative(identityProduct, categoryKey, contentContext.productIdentity), "categoryNarrative").content;

  let risks = [];
  if (price > 0 && cost > 0 && margin < 0.35) risks.push("毛利率偏低，后续广告、退换货和包装成本会挤压利润。建议重新核算售价或寻找更低拿货价。");
  if (price > 0 && !cost) risks.push("当前已有建议售价，但缺少单件成本，暂时无法准确判断毛利空间。");
  if (!price && cost > 0) risks.push("当前已有单件成本，但缺少建议售价，暂时无法判断利润空间。");
  if (!price && !cost) risks.push("价格与成本都待补充，建议先补充建议售价和拿货成本后再判断利润空间。");
  if (moq > 150) risks.push(`MOQ处于${moqAdvice.label}，${moqAdvice.advice}`);
  if (!(product.supplier || "").includes("补货")) risks.push("供应商补货周期不明确，爆单后可能出现断货风险。");
  if (!product.competitorPrice) risks.push("缺少同类竞品价格，建议补充1688/淘宝/小红书同款价格区间。");
  risks.push(contentRisk);
  if (risks.length === 0) risks.push("基础风险较可控，但仍需核实样品与大货一致性、质检信息和售后条款。");
  risks = validateModule("risks", risks).slice(0, 3);
  contentContext.risks = risks;

  const nextTestActions = validateGeneratedContent(contentContext, [
    ...categoryTestActions,
    "收集收藏、评论、询单和私信数据，至少观察24-72小时。",
    "把测款数据回填到测款复盘，再决定补货、改图、降价或停测。",
  ], "testStandards").content;

  const actions = validateGeneratedContent(contentContext, [
    "先拿样或小批量进货，不建议直接大批量压货。",
    "用小红书/抖音发布2-3条测款内容，观察收藏率、评论询单率、私信咨询量。",
    "用校园群、朋友圈或私域做小范围成交验证，记录真实转化。",
    "如果互动率和询单率较好，再和供应商谈补货周期、混批政策和包装定制。",
    "复盘每款产品的数据，把评分、利润、内容表现和销量记录到产品库。",
  ], "testStandards").content;

  const xhsStructure = xhsPackage.pages;

  const fitReasons = validateModule("fitReasons", [
    price > 0 && cost > 0
      ? margin >= 0.35
        ? `毛利率约${(margin * 100).toFixed(1)}%，有一定空间覆盖后续包装、物流和平台费用。`
        : "毛利率偏低，暂时不适合作为高投入主推款。"
      : getProfitPriceDescription(effectivePrice, priceBand),
    stockCost <= 1800 ? `首批压货约¥${money(stockCost)}，仍处在可小批量测试范围。` : `首批压货约¥${money(stockCost)}，对新手压力偏高。`,
    `渠道验证路径相对清楚，可优先围绕${channelFit.best}做首轮反馈收集。`,
    `当前信息足以形成一轮最小测试，但补货前仍需要看真实询单和成交数据。`,
  ]);

  const unfitReasons = validateModule("unfitReasons", [
    moq > 150 ? `MOQ风险偏高：${moqAdvice.advice}` : "若供应商不能提供样品或混批，仍要重新评估首单风险。",
    `${safeMarket.categoryName}常见风险：${safeMarket.contentRisk}`,
    `暂不建议渠道：${channelFit.avoid}。${channelFit.avoidReason}`,
  ]);

  const samplingStrategy = validateModule("samplingStrategy", getSamplingStrategy({ categoryKey, priceBand, moqAdvice, channelFit, status, productIdentity: contentContext.productIdentity }));
  const testStandards = validateModule("testStandards", getTestDecisionStandards(categoryKey, contentContext.productIdentity));
  const supplierQuestions = validateModule("supplierQuestions", getSupplierQuestions(categoryKey, contentContext.productIdentity));
  const biggestRisk = risks.find((risk) => !risk.includes("暂未上传产品图片")) || risks[0] || safeMarket.contentRisk;
  const executiveSummary = validateModule("executiveSummary", [
    status === "暂不考虑" ? "暂不建议直接下单，先降低首单量或补充关键信息。" : status === "建议补货" ? "可以进入补货观察，但仍需用真实测款数据复核。" : "建议先拿样或小批量测款，不建议直接大批量压货。",
    `核心理由：${price > 0 ? `${priceBand.label}的售价区间` : "当前价格信息"}与${channelFit.best}的验证路径较匹配，首批压货约¥${money(stockCost)}。`,
    `最大风险：${biggestRisk}`,
    "下一步：完成一轮最小内容测试，并把反馈回填到测款复盘。",
  ]);

  const scoringItems = [
    { title: "利润与价格带", score: Math.round(profitScore), description: getProfitPriceDescription(effectivePrice, priceBand) },
    { title: "内容潜力", score: Math.round(contentScore), description: hasImage ? "已有图片输入，可进一步判断封面吸引力、细节完整度和内容素材丰富度。" : "暂缺图片输入，内容潜力主要来自文本信息，建议补图后再校准判断。" },
    { title: "渠道适配", score: Math.round(channelScore), description: `最适合渠道：${channelFit.best}。${channelFit.reason} 评分原因：${channelFit.scoreReason}` },
    { title: "MOQ与供应", score: Math.round(supplyScore), description: `${moqAdvice.label}：${moqAdvice.advice} ${(product.supplier || "").includes("补货") ? "供应商补货信息较清楚。" : "还需要确认补货周期和混批政策。"}` },
    { title: "风险控制", score: Math.round(riskScore), description: `${safeMarket.categoryName}需重点关注：${safeMarket.categoryFocus.slice(-3).join("、")}。${product.competitorPrice ? "已有竞品价格区间，可辅助校准定价。" : "仍缺少竞品价格校准。"}` },
    { title: "信息完整", score: Math.round(infoScore), description: infoScore >= 80 ? "产品基础信息较完整，报告可信度较高。" : "信息仍不完整，建议补充人群、渠道、供应商和物流风险。" },
  ].map((item) => ({
    ...item,
    description: validateGeneratedContent(contentContext, item.description, "scoringItems").content,
  }));
  const explanations = scoringItems;

  let report = `【TradePilot AI 进货决策报告】

一、产品基础信息
产品名称：${contentContext.productIdentity.displayName || "未填写"}
产品类型：${contentContext.productIdentity.productTypeLabel || safeMarket.marketType || "未填写"}
拿货价：${cost > 0 ? money(cost) : "未填写"} 元
建议售价：${price > 0 ? `${moneyDisplay(price)} 元${effectivePrice.hasEstimatedPrice ? "（估算）" : ""}` : "未填写"}
MOQ：${product.moq || "未填写"} 件
材质：${product.material || "未填写"}
目标人群：${product.audience || "未填写"}
销售渠道：${product.channel || "未填写"}
竞品价格：${product.competitorPrice || "未填写"}
供应商信息：${product.supplier || "未填写"}

二、AI综合判断
综合评分：${totalScore}/100
状态：${status}
决策建议：${level}
执行摘要：
${executiveSummary.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

三、利润测算
单件成本：${money(unitCost)} 元
预估单件利润：${money(profit)} 元
预估毛利率：${Math.round(margin * 100)}%
首批压货资金：${money(stockCost)} 元
说明：当前毛利按用户填写的建议售价与单件成本计算；包装、物流、平台费和售后成本仍需按实际渠道另行校正。

四、品类判断
识别品类：${safeMarket.categoryName}（${categoryKey}）
品类逻辑：${categoryNarrative}

五、渠道适配建议
最适合渠道：${channelFit.best}
适合理由：${channelFit.reason}
渠道适配评分：${Math.round(channelScore)}/100
评分说明：${channelFit.scoreReason}
暂不建议渠道：${channelFit.avoid}
不建议理由：${channelFit.avoidReason}
当前填写渠道：${channelFit.declared}

六、价格带与 MOQ 判断
价格带：${priceBand.label}
价格判断：${priceBand.advice}
价格风险：${priceBand.risk}
MOQ区间：${moqAdvice.label}
MOQ风险等级：${moqAdvice.riskLevel}
MOQ建议：${moqAdvice.advice}

七、图片与内容素材建议
视觉判断状态：${visualEvidenceNote}
必拍图片：
${imagePlan.mustShoot.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
加分图片：
${imagePlan.bonusShots.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
不建议缺失的图片：${imagePlan.missingRisk}
首图/封面建议：${imagePlan.coverAdvice}
渠道拍摄重点：
${imagePlan.preferredFocus.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

八、测款判断标准
${testStandards.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

九、供应商沟通清单
${supplierQuestions.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

十、产品差异化建议
${differentiation.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}

十一、风险备忘
${risks.map((risk, index) => `${index + 1}. ${risk}`).join(String.fromCharCode(10))}

十二、跨平台搜索关键词建议
小红书搜索词：
${formatKeywordPlatform(keywordPlan.xhs)}
抖音搜索词：
${formatKeywordPlatform(keywordPlan.douyin)}
电商平台搜索词：
${formatKeywordPlatform(keywordPlan.ecommerce)}
标题组合建议：
${keywordPlan.titles.map(([platform, title], index) => `${index + 1}. ${platform}标题：${title}`).join(String.fromCharCode(10))}

十三、小红书种草发布方案
封面钩子：
${xhsPackage.coverHooks.map((hook, index) => `${index + 1}. ${hook}`).join(String.fromCharCode(10))}
标题建议：
${xhsPackage.titles.map((title, index) => `${index + 1}. ${title}`).join(String.fromCharCode(10))}
首图/封面设计建议：${xhsPackage.coverDesign}
图文结构：
${xhsStructure.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
正文示例：${xhsPackage.body}
互动引导：
${xhsPackage.interactions.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
推荐标签：${xhsPackage.tags.join(" ")}
商家发布策略：${xhsPackage.merchantStrategy}

十四、抖音视频脚本
视频方向：${douyinPackage.direction}
20秒分镜脚本：
${douyinPackage.shots.map((shot, index) => `镜头${index + 1}｜${shot.time}｜${shot.focus}
画面：${shot.visual}
口播/字幕：${shot.copy}
目的：${shot.purpose}`).join(String.fromCharCode(10))}
抖音封面文案：
${douyinPackage.coverTexts.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
拍摄注意点：
${douyinPackage.shootingNotes.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
商家测试目标：${douyinPackage.merchantGoal}

十五、下一步执行动作
拿样验证重点：${samplingStrategy.headline}
验证背景：${samplingStrategy.context}
${samplingStrategy.checkpoints.map((action, index) => `${index + 1}. ${action}`).join(String.fromCharCode(10))}
${nextTestActions.slice(-2).map((action, index) => `${samplingStrategy.checkpoints.length + index + 1}. ${action}`).join(String.fromCharCode(10))}

十六、AI评分依据
${scoringItems.map((item, index) => `${index + 1}. ${item.title}：${item.score}分。${item.description}`).join(String.fromCharCode(10))}`;

  report = validateGeneratedContent(contentContext, report, "report").content;

  return {
    market: safeMarket,
    contentContext,
    categoryNarrative,
    productIdentity: contentContext.productIdentity,
    categoryKey,
    categoryName: safeMarket.categoryName,
    channelFit,
    imagePlan,
    samplingStrategy,
    priceBand,
    moqAdvice,
    effectivePrice,
    unitCost,
    profit,
    margin,
    stockCost,
    totalScore,
    level,
    status,
    risks,
    actions,
    nextTestActions,
    executiveSummary,
    fitReasons,
    unfitReasons,
    scoringItems,
    explanations,
    xhsStructure,
    xhsPackage,
    douyinPackage,
    keywordPlan,
    testStandards,
    supplierQuestions,
    visualEvidenceNote,
    report,
    contentPotentialScore: Math.round(contentScore),
    scores: [
      ["利润与价格带", Math.round(profitScore)],
      ["渠道适配", Math.round(channelScore)],
      [`${safeMarket.categoryName}内容`, Math.round(contentScore)],
      ["MOQ供应", Math.round(supplyScore)],
      ["风险控制", Math.round(riskScore)],
      ["信息完整", Math.round(infoScore)],
    ],
  };
}

export function getRecordStatus(record) {
  return record?.result?.status || record?.result?.level || record?.advice || (record?.score >= 85 ? "准备拿样" : record?.score >= 70 ? "正在测款" : "暂不考虑");
}

export function getRecordMetrics(record) {
  const fallback = record?.product ? analyzeProduct(record.product, Boolean(record.product.imagePreview)) : null;
  const result = record?.result || {};
  return {
    score: Number(fallback?.totalScore ?? record?.score ?? result.totalScore ?? 0) || 0,
    status: fallback?.status || getRecordStatus(record),
    margin: Number(fallback?.margin ?? result.margin ?? 0) || 0,
    stockCost: Number(fallback?.stockCost ?? result.stockCost ?? 0) || 0,
    riskCount: fallback?.risks?.length || (Array.isArray(result.risks) ? result.risks.length : 0),
    contentPotential: Number(fallback?.contentPotentialScore ?? result.contentPotentialScore ?? 0) || 0,
    channelFit: fallback?.channelFit?.best || result.channelFit?.best || "待补充渠道",
    categoryName: fallback?.categoryName || result.categoryName || record?.category || "未分类",
    displayName: fallback?.productIdentity?.displayName || result.productIdentity?.displayName || record?.product_name || "未命名产品",
    productTypeLabel: fallback?.productIdentity?.productTypeLabel || result.productIdentity?.productTypeLabel || record?.category || "未分类",
  };
}

function getRecordReport(record) {
  if (record?.product) {
    return analyzeProduct(record.product, Boolean(record.product.imagePreview)).report;
  }
  const categoryKey = inferCategoryKey({ name: record?.product_name, category: record?.category });
  const market = categoryTemplates[categoryKey] || categoryTemplates.unknown;
  const contentContext = createContentContext({ name: record?.product_name, category: record?.category }, false, { categoryKey, categoryName: market.label, marketType: market.marketType }, null, null, null);
  return validateGeneratedContent(contentContext, record?.report || "暂无报告内容", "report").content;
}













export function getPkRecommendation(left, right) {
  if (!left || !right) return "请选择两个产品后生成优先级建议。";
  const leftMetrics = getRecordMetrics(left);
  const rightMetrics = getRecordMetrics(right);
  const leftIndex = leftMetrics.score + leftMetrics.contentPotential * 0.25 + leftMetrics.margin * 35 - leftMetrics.riskCount * 3 - (leftMetrics.stockCost > 2500 ? 8 : 0);
  const rightIndex = rightMetrics.score + rightMetrics.contentPotential * 0.25 + rightMetrics.margin * 35 - rightMetrics.riskCount * 3 - (rightMetrics.stockCost > 2500 ? 8 : 0);
  const winner = leftIndex >= rightIndex ? left : right;
  const winnerMetrics = leftIndex >= rightIndex ? leftMetrics : rightMetrics;
  const action = winnerMetrics.status === "建议补货" ? "优先进入补货观察" : winnerMetrics.status === "准备拿样" ? "优先拿样" : "优先测款";
  return `${winnerMetrics.displayName || "候选产品"}更适合${action}，原因是评分、内容潜力和渠道适配综合更稳，同时当前风险数量为${winnerMetrics.riskCount}个。`;
}













export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeScoringItem(item) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return {
      title: item.title || item.label || "未命名维度",
      score: Number(item.score ?? item.value ?? 0) || 0,
      description: item.description || item.reason || "暂无说明",
    };
  }
  if (Array.isArray(item)) {
    const [title, score, description] = item;
    return {
      title: String(title || "未命名维度"),
      score: Number(score ?? 0) || 0,
      description: String(description || "暂无说明"),
    };
  }
  return null;
}

export function getScoringItems(result) {
  return safeArray(result?.scoringItems || result?.explanations)
    .map(normalizeScoringItem)
    .filter((item) => item && item.title.length > 1 && !["针", "对", "田"].includes(item.title));
}

function getScoreValue(result, keyword, fallback = "") {
  const found = (result?.scores || []).find(([label]) => String(label).includes(keyword));
  return found?.[1] ?? fallback;
}



function App() {
  const [page, setPage] = useState("cover");
  const [mode, setMode] = useState("intro");
  const [product, setProduct] = useState(blankProduct);
  const [image, setImage] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("全部");
  const [historySort, setHistorySort] = useState("saved_desc");
  const [pkLeftId, setPkLeftId] = useState("");
  const [pkRightId, setPkRightId] = useState("");
  const [review, setReview] = useState({
    views: "",
    likes: "",
    saves: "",
    comments: "",
    inquiries: "",
    orders: "",
    cost: "",
  });
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const result = useMemo(() => analyzeProduct(product, Boolean(image)), [product, image]);

  function update(key, value) {
    setProduct((old) => ({ ...old, [key]: value }));
    setAnalyzed(false);
    setSaveMessage("");
  }

  function copyReport() {
    navigator.clipboard?.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function downloadReport() {
    const html = generateHtmlReport(product, result);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const cleanName = cleanFileName(result.productIdentity?.displayName || product.name);
    anchor.href = url;
    anchor.download = cleanName ? `TradePilot-${cleanName}-进货决策报告.html` : "TradePilot-进货决策报告.html";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportRecordsBackup() {
    try {
      const records = JSON.parse(localStorage.getItem("tradepilot_local_records") || "[]");

      if (!Array.isArray(records) || records.length === 0) {
        alert("当前暂无可导出的产品记录");
        return;
      }

      const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "tradepilot_records_backup.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setHistoryMessage("产品库备份已导出。");
    } catch (error) {
      alert("产品库备份导出失败：" + error.message);
    }
  }

  function exportProductLibraryDocument() {
    const records = Array.isArray(historyRecords) ? historyRecords : [];

    if (records.length === 0) {
      alert("当前暂无可导出的产品记录");
      return;
    }

    const html = generateProductLibraryWordDocument(records);
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tradepilot_product_library_report.doc";
    anchor.click();
    URL.revokeObjectURL(url);
    setHistoryMessage("产品库文档已导出。");
  }

  async function importRecordsBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedRecords = JSON.parse(text);

      if (!Array.isArray(importedRecords)) {
        throw new Error("invalid_backup_format");
      }

      let oldRecords = [];
      try {
        const parsed = JSON.parse(localStorage.getItem("tradepilot_local_records") || "[]");
        oldRecords = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        oldRecords = [];
      }

      const existingIds = new Set(
        oldRecords
          .map((record) => record?.id)
          .filter((id) => id !== undefined && id !== null)
          .map(String)
      );
      const importedIds = new Set();
      const uniqueImportedRecords = importedRecords.reduce((records, record, index) => {
        if (!record || typeof record !== "object" || Array.isArray(record)) return records;

        const id = record.id !== undefined && record.id !== null && String(record.id).trim()
          ? String(record.id)
          : `imported-${Date.now()}-${index}`;

        if (existingIds.has(id) || importedIds.has(id)) return records;

        importedIds.add(id);
        records.push({ ...record, id });
        return records;
      }, []);

      const nextRecords = [...uniqueImportedRecords, ...oldRecords];
      localStorage.setItem("tradepilot_local_records", JSON.stringify(nextRecords));
      setHistoryRecords(nextRecords);
      setHistoryMessage("产品库备份导入成功");
      alert("产品库备份导入成功");
    } catch (error) {
      setHistoryMessage("备份文件格式不正确，请选择 TradePilot 导出的 JSON 文件");
      alert("备份文件格式不正确，请选择 TradePilot 导出的 JSON 文件");
    } finally {
      event.target.value = "";
    }
  }

  async function saveCurrentReport() {
    try {
      setSaveMessage("正在保存到我的产品库...");

      const smallImage = image && image.length < 180000 ? image : "";

      const localRecord = {
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        product_name: result?.productIdentity?.displayName || product?.name || "未命名产品",
        category: result?.productIdentity?.productTypeLabel || product?.category || "未分类",
        score: Number(result?.totalScore ?? 0) || 0,
        advice: result?.level || "暂无建议",
        price: result?.effectivePrice?.price ? formatEffectivePrice(result.effectivePrice) : product?.price || "",
        competitor_price: product?.competitorPrice || "",
        product: {
          ...product,
          price: product?.price || (result?.effectivePrice?.hasEstimatedPrice ? String(result.effectivePrice.price) : product?.price),
          imagePreview: smallImage,
        },
        result: {
          status: result?.status || "",
          totalScore: result?.totalScore ?? 0,
          level: result?.level || "",
          risks: result?.risks || [],
          scores: result?.scores || [],
          scoringItems: result?.scoringItems || [],
          explanations: result?.explanations || [],
          margin: result?.margin ?? 0,
          profit: result?.profit ?? 0,
          unitCost: result?.unitCost ?? 0,
          effectivePrice: result?.effectivePrice || null,
          stockCost: result?.stockCost ?? 0,
          contentPotentialScore: result?.contentPotentialScore ?? 0,
          channelFit: result?.channelFit || null,
          categoryName: result?.categoryName || "",
          productIdentity: result?.productIdentity || null,
          review,
        },
        report: result?.report || "暂无报告内容",
      };

      const oldRecords = JSON.parse(
        localStorage.getItem("tradepilot_local_records") || "[]"
      );

      const nextRecords = [localRecord, ...oldRecords].slice(0, 50);

      localStorage.setItem(
        "tradepilot_local_records",
        JSON.stringify(nextRecords)
      );

      setHistoryRecords(nextRecords);
      setSaveMessage("已保存到我的产品库 ✓（游客演示模式，本地保存）");
    } catch (error) {
      setSaveMessage("保存失败：" + error.message);
    }
  }

  async function loadHistoryRecords() {
    try {
      setHistoryLoading(true);
      setHistoryMessage("");

      const localRecords = JSON.parse(
        localStorage.getItem("tradepilot_local_records") || "[]"
      );

      setHistoryRecords(localRecords);

      if (localRecords.length === 0) {
        setHistoryMessage("当前为游客演示模式，保存的产品会记录在本浏览器中。");
      }
    } catch (error) {
      setHistoryMessage("读取产品库失败：" + error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteHistoryRecord(id) {
    const ok = window.confirm("确定删除这条产品记录吗？");
    if (!ok) return;

    const oldRecords = JSON.parse(
      localStorage.getItem("tradepilot_local_records") || "[]"
    );

    const nextRecords = oldRecords.filter((record) => record.id !== id);

    localStorage.setItem(
      "tradepilot_local_records",
      JSON.stringify(nextRecords)
    );

    setHistoryRecords(nextRecords);
  }

  async function analyzeImageWithAI() {
    if (!image) {
      alert("请先上传产品图片；如果暂时没有图片，也可以直接手动填写产品信息并生成进货报告。");
      return;
    }

    if (getTextByteSize(image) > IMAGE_COMPRESSION_OPTIONS.maxDataUrlBytes) {
      alert(IMAGE_TOO_LARGE_FALLBACK_MESSAGE);
      return;
    }

    setAiLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 55000);

    const pickText = (...values) => {
      const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
      return found ? String(found).trim() : "";
    };

    const pickNumber = (...values) => {
      const raw = pickText(...values);
      const match = String(raw).match(/\d+(\.\d+)?/);
      return match ? match[0] : "";
    };

    try {
      const response = await fetch(ANALYZE_IMAGE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          image,
          hint:
            "请只根据上传图片识别产品。不要沿用页面旧字段。先判断这是项链/耳饰/发饰/其他，若看到一整圈珍珠串、扣头、延长链或包装盒内圆形珠链，优先判断为珍珠项链/锁骨链，不要判断为耳夹。",
        }),
      });

      clearTimeout(timer);

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("接口返回不是 JSON：", text);
        alert(IMAGE_RECOGNITION_FALLBACK_MESSAGE);
        return;
      }

      if (!response.ok) {
        console.error("AI识别接口错误：", data);
        const apiMessage = data.error || data.message || "";
        if (/EXCEED_MAX_PAYLOAD_SIZE|payload|请求体|too large/i.test(apiMessage)) {
          alert(IMAGE_TOO_LARGE_FALLBACK_MESSAGE);
          return;
        }
        alert(IMAGE_RECOGNITION_FALLBACK_MESSAGE);
        return;
      }

      const aiProduct = data?.product || {};

      const hasAiProductInfo = Object.values(aiProduct).some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === "object") return Object.keys(value).length > 0;
        return String(value ?? "").trim();
      });

      if (!hasAiProductInfo) {
        setAiInsight(data);
        alert(IMAGE_RECOGNITION_FALLBACK_MESSAGE);
        return;
      }

      setAiInsight(data);

      setProduct((old) => ({
        ...old,
        name: pickText(aiProduct.name, aiProduct.productName, old.name),
        category: pickText(aiProduct.category, aiProduct.type, old.category),
        material: pickText(aiProduct.material, old.material),
        cost: pickNumber(aiProduct.cost, aiProduct.purchasePrice, aiProduct.sourcePrice, aiProduct.wholesalePrice, old.cost),
        price: pickText(aiProduct.price, aiProduct.suggestedPrice, aiProduct.sellingPrice, old.price),
        moq: pickNumber(aiProduct.moq, aiProduct.MOQ, aiProduct.minimumOrderQuantity, old.moq),
        audience: pickText(aiProduct.audience, aiProduct.targetAudience, old.audience),
        channel: pickText(aiProduct.channel, aiProduct.salesChannel, old.channel),
        supplier: pickText(aiProduct.supplier, aiProduct.supplierInfo, old.supplier),
        competitorPrice: pickText(aiProduct.competitorPrice, aiProduct.competitor_price, old.competitorPrice),
        logistics: pickText(aiProduct.logistics, aiProduct.packageRisk, old.logistics),
        keywords: pickText(aiProduct.keywords, aiProduct.tags, old.keywords),
        note: pickText(aiProduct.note, aiProduct.description, old.note),
      }));

      setAnalyzed(false);
      alert("AI识别完成，已自动回填产品信息");
    } catch (error) {
      clearTimeout(timer);

      if (error.name === "AbortError") {
        alert(IMAGE_RECOGNITION_FALLBACK_MESSAGE);
      } else {
        console.error(error);
        alert(IMAGE_RECOGNITION_FALLBACK_MESSAGE);
      }
    } finally {
      clearTimeout(timer);
      setAiLoading(false);
    }
  }

  function restoreRecord(record) {
    if (record.product) {
      const { imagePreview, ...restProduct } = record.product;
      setProduct({ ...blankProduct, ...restProduct });
      setImage(imagePreview || null);
    }
    setAnalyzed(true);
    setMode("result");
  }

  function applyDemo(demo) {
    setProduct(demo);
    setImage(null);
    setAiInsight(null);
    setAnalyzed(true);
    setSaveMessage("");
    setPage("app");
    setMode("result");
  }

  function loadDemoRecords() {
    const demoRecords = demoProducts.map((demo, index) => {
      const demoResult = analyzeProduct(demo, false);
      return {
        id: `demo-local-${Date.now()}-${index}`,
        created_at: new Date(Date.now() - index * 3600 * 1000).toISOString(),
        product_name: demoResult.productIdentity?.displayName || demo.name,
        category: demoResult.productIdentity?.productTypeLabel || demo.category,
        score: demoResult.totalScore,
        advice: demoResult.level,
        price: demoResult.effectivePrice?.price ? formatEffectivePrice(demoResult.effectivePrice) : demo.price,
        competitor_price: demo.competitorPrice,
        product: { ...demo, imagePreview: "" },
        result: {
          status: demoResult.status,
          totalScore: demoResult.totalScore,
          level: demoResult.level,
          risks: demoResult.risks,
          scores: demoResult.scores,
          scoringItems: demoResult.scoringItems,
          explanations: demoResult.explanations,
          productIdentity: demoResult.productIdentity,
          margin: demoResult.margin,
          profit: demoResult.profit,
          unitCost: demoResult.unitCost,
          effectivePrice: demoResult.effectivePrice,
          stockCost: demoResult.stockCost,
          contentPotentialScore: demoResult.contentPotentialScore,
          channelFit: demoResult.channelFit,
          categoryName: demoResult.categoryName,
          review,
        },
        report: demoResult.report,
      };
    });

    const oldRecords = JSON.parse(localStorage.getItem("tradepilot_local_records") || "[]");
    const nextRecords = [...demoRecords, ...oldRecords].slice(0, 50);
    localStorage.setItem("tradepilot_local_records", JSON.stringify(nextRecords));
    setHistoryRecords(nextRecords);
    setHistoryMessage("已加载示例产品到本浏览器产品库，可直接体验筛选、PK和复盘流程。");
  }

  if (page === "cover") {
    return (
      <div className="min-h-screen bg-[#08100d] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-12">
          <div className="mb-6 inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-200">
            TradePilot AI｜拿货搭子 · 进货选品与爆款测款智能体
          </div>

          <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight md:text-6xl xl:text-7xl">
            <span className="block text-white">TradePilot AI</span>
            <span className="mt-3 block text-emerald-300">进货前，先算清楚</span>
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            面向小商品进货、内容电商测款和大学生创业场景的 AI 决策工作台，覆盖义乌拿货、校园零售和小微电商，让用户从凭感觉拿货转向先测算、再测款、后复盘。
          </p>
          <div className="mt-5 max-w-4xl rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-100">
            当前为游客演示模式：无需注册即可体验完整流程；产品记录将暂存在本浏览器中，正式版可接入账号体系实现云端同步。
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {painPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] px-4 py-3 text-sm font-bold text-amber-100">
                {point}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map(([title, desc], index) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-black">
                  {index + 1}
                </div>
                <h3 className="font-black text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <CoverCard title="项目介绍" desc="了解 TradePilot AI 的目标用户、核心痛点与完整工作流。" onClick={() => { setPage("app"); setMode("intro"); }} />
            <CoverCard title="开始进货判断" desc="上传图片并填写拿货价、MOQ，生成一份可复盘的进货报告。" highlight onClick={() => { setPage("app"); setMode("operate"); }} />
            <CoverCard title="游客快速体验" desc="无需注册登录，直接查看完整案例，体验报告、产品库、PK和复盘流程。" onClick={() => { setPage("app"); setMode("demo"); }} />
          </div>
        </main>
        <FloatingFeedback
          open={feedbackOpen}
          setOpen={setFeedbackOpen}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08100d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08100d]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <button onClick={() => setPage("cover")} className="text-left">
            <p className="text-sm text-emerald-300">TradePilot AI</p>
            <h1 className="text-xl font-black">进货判断、内容测款与产品复盘</h1>
          </button>

          <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100">
            游客演示模式 · 本地体验不强制登录
          </div>

          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Tab active={mode === "intro"} onClick={() => setMode("intro")}>项目介绍</Tab>
            <Tab active={mode === "operate"} onClick={() => setMode("operate")}>开始判断</Tab>
            <Tab active={mode === "result"} onClick={() => setMode("result")}>进货报告</Tab>
            <Tab active={mode === "history"} onClick={() => { setMode("history"); loadHistoryRecords(); }}>我的产品库</Tab>
            <Tab active={mode === "pk"} onClick={() => { setMode("pk"); loadHistoryRecords(); }}>候选产品PK</Tab>
            <Tab active={mode === "review"} onClick={() => setMode("review")}>测款复盘</Tab>
            <Tab active={mode === "demo"} onClick={() => setMode("demo")}>评委演示</Tab>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {mode === "intro" && <IntroView setMode={setMode} />}
        {mode === "operate" && (
          <OperateView
            product={product}
            update={update}
            image={image}
            setImage={setImage}
            result={result}
            setProduct={setProduct}
            setAnalyzed={setAnalyzed}
            setMode={setMode}
            analyzeImageWithAI={analyzeImageWithAI}
            aiLoading={aiLoading}
          />
        )}
        {mode === "result" && (
          <ResultView
            product={product}
            image={image}
            result={result}
            analyzed={analyzed}
            setMode={setMode}
            copyReport={copyReport}
            copied={copied}
            saveCurrentReport={saveCurrentReport}
            saveMessage={saveMessage}
            aiInsight={aiInsight}
            downloadReport={downloadReport}
          />
        )}
        {mode === "history" && (
          <HistoryView
            records={historyRecords}
            loading={historyLoading}
            message={historyMessage}
            onDelete={deleteHistoryRecord}
            onRestore={restoreRecord}
            onRefresh={loadHistoryRecords}
            onLoadDemo={loadDemoRecords}
            onExportBackup={exportRecordsBackup}
            onExportDocument={exportProductLibraryDocument}
            onImportBackup={importRecordsBackup}
            search={historySearch}
            setSearch={setHistorySearch}
            statusFilter={historyStatus}
            setStatusFilter={setHistoryStatus}
            sortMode={historySort}
            setSortMode={setHistorySort}
          />
        )}
        {mode === "pk" && (
          <PKView
            records={historyRecords}
            loading={historyLoading}
            message={historyMessage}
            onRefresh={loadHistoryRecords}
            onRestore={restoreRecord}
            leftId={pkLeftId}
            setLeftId={setPkLeftId}
            rightId={pkRightId}
            setRightId={setPkRightId}
          />
        )}
        {mode === "review" && (
          <ReviewView
            product={product}
            result={result}
            review={review}
            setReview={setReview}
            saveCurrentReport={saveCurrentReport}
            saveMessage={saveMessage}
          />
        )}
        {mode === "demo" && <DemoView applyDemo={applyDemo} />}
      </main>
      <FloatingFeedback
        open={feedbackOpen}
        setOpen={setFeedbackOpen}
      />
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 ${active ? "bg-emerald-300 text-black" : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"}`}>
      {children}
    </button>
  );
}

function IntroView({ setMode }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
        <p className="mb-4 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-black">项目介绍</p>
        <h2 className="text-4xl font-black leading-tight">把“凭感觉拿货”变成可记录、可比较、可复盘的选品流程。</h2>
        <p className="mt-5 text-base leading-8 text-slate-300">
          TradePilot AI 帮你在进货前先看利润、风险、人群和内容潜力，再把每次判断保存为产品记录，方便后续做候选比较和测款复盘。
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Info title="核心痛点" items={painPoints} />
          <Info title="目标用户" items={["大学生创业者", "校园零售经营者", "小红书/抖音卖家", "义乌拿货新手", "小微电商", "社群团购运营者"]} />
          <Info title="核心能力" items={["图片识别", "利润测算", "风险判断", "内容测款", "产品库", "候选PK", "测款复盘"]} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-white/10 bg-black/35 p-8">
          <p className="text-sm font-bold text-emerald-300">Why TradePilot AI</p>
          <h3 className="mt-2 text-2xl font-black text-white">为什么需要 TradePilot AI</h3>
          <p className="mt-5 text-sm leading-8 text-slate-300">
            很多新手卖家和大学生创业者第一次进货时，往往依赖主观判断：觉得款式好看、价格便宜、供应商说好卖，就直接下单。但真正的问题在于：利润是否够、MOQ 是否压货、内容平台能不能测出反馈、爆款潜力是否可持续，往往没有被系统评估。
          </p>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            TradePilot AI 希望把这套判断过程结构化，让每一次进货都留下数据、依据和复盘记录，而不是只留下库存压力。
          </p>
          <button onClick={() => setMode("operate")} className="mt-6 rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black shadow-lg shadow-emerald-300/10">
            开始判断一款产品
          </button>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
          <h3 className="text-2xl font-black text-emerald-300">从判断到复盘</h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {flowSteps.map(([title, desc], index) => (
              <div key={title} className="rounded-2xl bg-black/25 p-4 text-sm text-slate-300">
                <b className="text-emerald-300">{index + 1}. {title}</b>
                <p className="mt-2 leading-6">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ title, items }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <h3 className="font-black text-white">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full bg-emerald-300/10 px-3 py-1 text-sm font-bold text-emerald-200">{item}</span>
        ))}
      </div>
    </div>
  );
}

function getTextByteSize(value) {
  try {
    return new Blob([String(value || "")]).size;
  } catch (error) {
    return String(value || "").length;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败，请换一张图片再试。"));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片解析失败，请换一张图片再试。"));
    img.src = dataUrl;
  });
}

function getScaledImageSize(image, maxWidth, maxHeight) {
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
  };
}

function renderImageToJpegDataUrl(image, width, height, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressImageToDataUrl(file, options = {}) {
  const config = { ...IMAGE_COMPRESSION_OPTIONS, ...options };
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);
  let best = null;

  const compressionSteps = config.compressionSteps || [
    { maxWidth: config.maxWidth || 900, maxHeight: config.maxHeight || 900, qualities: [0.68] },
    { maxWidth: 720, maxHeight: 720, qualities: [0.52] },
    { maxWidth: 512, maxHeight: 512, qualities: [0.36] },
    { maxWidth: 384, maxHeight: 384, qualities: [0.3] },
    { maxWidth: 320, maxHeight: 320, qualities: [0.24] },
  ];

  for (const step of compressionSteps) {
    const { width, height } = getScaledImageSize(image, step.maxWidth, step.maxHeight);

    for (const quality of step.qualities) {
      const roundedQuality = Number(quality.toFixed(2));
      const dataUrl = renderImageToJpegDataUrl(image, width, height, roundedQuality);
      const bytes = getTextByteSize(dataUrl);
      const candidate = {
        dataUrl,
        width,
        height,
        quality: roundedQuality,
        bytes,
        originalBytes: file.size || getTextByteSize(sourceDataUrl),
        tooLarge: bytes > config.maxDataUrlBytes,
      };

      if (!best || candidate.bytes < best.bytes) best = candidate;
      if (bytes <= config.targetDataUrlBytes) return candidate;
    }
  }

  if (best && best.bytes <= config.maxDataUrlBytes) {
    return { ...best, tooLarge: false };
  }

  return best || {
    dataUrl: sourceDataUrl,
    width: image.width,
    height: image.height,
    quality: 1,
    bytes: getTextByteSize(sourceDataUrl),
    originalBytes: file.size || getTextByteSize(sourceDataUrl),
    tooLarge: true,
  };
}

export function StructuredReport({ product, result }) {
  const xhs = result.xhsPackage;
  const douyin = result.douyinPackage;
  const keywordPlan = result.keywordPlan;
  const effectivePrice = result.effectivePrice || getEffectivePrice(product);
  const summaryMetrics = [
    ["综合评分", `${result.totalScore}/100`],
    ["状态", `状态：${result.status}`],
    ["决策建议", result.level],
    ["预计毛利率", `${Math.round(result.margin * 100)}%`],
    ["首批压货资金", `¥${money(result.stockCost)}`],
    ["最适合渠道", result.channelFit?.best],
    ["风险等级", result.moqAdvice?.riskLevel],
    ["MOQ区间", result.moqAdvice?.label],
  ];
  const basics = [
    ["产品名称", result.productIdentity?.displayName || product.name || "未填写"],
    ["产品类型", result.productIdentity?.productTypeLabel || product.category || result.market?.marketType || "未填写"],
    ["拿货价", effectivePrice.cost ? `${money(effectivePrice.cost)} 元` : "未填写"],
    ["建议售价", effectivePrice.price ? `${moneyDisplay(effectivePrice.price)} 元${effectivePrice.hasEstimatedPrice ? "（估算）" : ""}` : "未填写"],
    ["MOQ", `${product.moq || "未填写"} 件`],
    ["材质", product.material || "未填写"],
    ["目标人群", product.audience || "未填写"],
    ["销售渠道", product.channel || "未填写"],
    ["竞品价格", product.competitorPrice || "未填写"],
    ["供应商信息", product.supplier || "未填写"],
  ];

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Executive Summary</p>
        <h3 className="mt-2 text-2xl font-black text-white">执行摘要</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {summaryMetrics.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-2 text-sm font-black text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(result.executiveSummary || []).map((item) => (
            <p key={item} className="rounded-2xl bg-black/25 p-4 text-sm leading-7 text-emerald-50">{item}</p>
          ))}
        </div>
      </div>

      <ReportSection number="一" title="产品基础信息">
        <ReportInfoGrid items={basics} />
      </ReportSection>

      <ReportSection number="二" title="AI综合判断">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <h4 className="font-black text-emerald-200">为什么适合</h4>
            <ReportList items={result.fitReasons || []} />
          </div>
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <h4 className="font-black text-amber-200">为什么需要谨慎</h4>
            <ReportList items={result.unfitReasons || []} />
          </div>
        </div>
      </ReportSection>

      <ReportSection number="三" title="利润测算">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReportMetric label="单件成本" value={`¥${money(result.unitCost)}`} />
          <ReportMetric label="预估单件利润" value={`¥${money(result.profit)}`} />
          <ReportMetric label="预估毛利率" value={`${Math.round(result.margin * 100)}%`} />
          <ReportMetric label="首批压货资金" value={`¥${money(result.stockCost)}`} />
        </div>
        <p className="mt-4 rounded-2xl bg-black/25 p-4 text-sm leading-7 text-slate-300">当前毛利按建议售价与单件成本计算；包装、物流、平台费和售后成本仍需按实际渠道另行校正。</p>
      </ReportSection>

      <ReportSection number="四" title="品类判断">
        <div className="rounded-2xl bg-black/25 p-4">
          <p className="text-xs font-bold text-emerald-300">识别品类：{result.categoryName}（{result.categoryKey}）</p>
          <p className="mt-3 text-sm leading-8 text-slate-200">{result.categoryNarrative}</p>
        </div>
      </ReportSection>

      <ReportSection number="五" title="渠道适配建议">
        <div className="grid gap-3 lg:grid-cols-3">
          <ReportMetric label="最适合渠道" value={result.channelFit?.best} />
          <ReportMetric label="渠道适配评分" value={`${result.scores?.find(([label]) => label === "渠道适配")?.[1] || result.channelFit?.score}/100`} />
          <ReportMetric label="暂不建议渠道" value={result.channelFit?.avoid} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <p className="rounded-2xl bg-white/[0.05] p-4 text-sm leading-7 text-slate-300">{result.channelFit?.reason}</p>
          <p className="rounded-2xl bg-white/[0.05] p-4 text-sm leading-7 text-slate-300">{result.channelFit?.scoreReason}</p>
        </div>
      </ReportSection>

      <ReportSection number="六" title="价格带与 MOQ 判断">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <h4 className="font-black text-emerald-200">{result.priceBand?.label}</h4>
            <p className="mt-2 text-sm leading-7 text-slate-300">{result.priceBand?.advice}</p>
            <p className="mt-2 text-xs leading-6 text-amber-100">{result.priceBand?.risk}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <h4 className="font-black text-emerald-200">{result.moqAdvice?.label} · {result.moqAdvice?.riskLevel}</h4>
            <p className="mt-2 text-sm leading-7 text-slate-300">{result.moqAdvice?.advice}</p>
          </div>
        </div>
      </ReportSection>

      <ReportSection number="七" title="图片与内容素材建议">
        <p className="rounded-2xl bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">{result.visualEvidenceNote}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ReportSubList title="必拍图片" items={result.imagePlan?.mustShoot || []} />
          <ReportSubList title="加分图片" items={result.imagePlan?.bonusShots || []} />
          <ReportSubList title="渠道拍摄重点" items={result.imagePlan?.preferredFocus || []} />
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <h4 className="font-black text-white">首图/封面建议</h4>
            <p className="mt-3 text-sm leading-7 text-slate-300">{result.imagePlan?.coverAdvice}</p>
            <p className="mt-3 rounded-2xl bg-amber-300/10 p-3 text-xs leading-6 text-amber-100">{result.imagePlan?.missingRisk}</p>
          </div>
        </div>
      </ReportSection>

      <ReportSection number="八" title="测款判断标准">
        <div className="grid gap-3 md:grid-cols-2">
          {(result.testStandards || []).map((item) => (
            <p key={item} className="rounded-2xl bg-black/25 p-4 text-sm leading-7 text-slate-200">{item}</p>
          ))}
        </div>
      </ReportSection>

      <ReportSection number="九" title="供应商沟通清单">
        <Checklist items={result.supplierQuestions || []} />
      </ReportSection>

      <ReportSection number="十" title="跨平台搜索关键词建议">
        <p className="mb-4 rounded-2xl bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
          用于标题、正文、标签、短视频字幕和商品标题。小红书偏种草场景，抖音偏效果钩子，电商平台偏产品属性和长尾搜索。
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <KeywordPlatformCard title="小红书搜索词" platform={keywordPlan.xhs} />
          <KeywordPlatformCard title="抖音搜索词" platform={keywordPlan.douyin} />
          <KeywordPlatformCard title="电商平台搜索词" platform={keywordPlan.ecommerce} />
        </div>
        <div className="mt-4 rounded-2xl bg-white/[0.05] p-4">
          <h4 className="font-black text-white">标题组合建议</h4>
          <div className="mt-3 space-y-2">
            {keywordPlan.titles.map(([platform, title]) => (
              <p key={`${platform}-${title}`} className="rounded-2xl bg-black/25 p-3 text-sm leading-7 text-slate-300">
                <b className="text-emerald-200">{platform}标题：</b>{title}
              </p>
            ))}
          </div>
        </div>
      </ReportSection>

      <ReportSection number="十一" title="小红书种草发布方案">
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportSubList title="封面钩子" items={xhs.coverHooks} strong />
          <ReportSubList title="标题建议" items={xhs.titles} />
          <div className="rounded-2xl bg-white/[0.05] p-4 lg:col-span-2">
            <h4 className="font-black text-white">首图/封面设计</h4>
            <p className="mt-3 text-sm leading-7 text-slate-300">{xhs.coverDesign}</p>
          </div>
          <ReportSubList title="图文结构" items={xhs.pages} />
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <h4 className="font-black text-white">正文示例</h4>
            <p className="mt-3 text-sm leading-8 text-slate-200">{xhs.body}</p>
          </div>
          <ReportSubList title="互动引导" items={xhs.interactions} />
          <div className="rounded-2xl bg-white/[0.05] p-4">
            <h4 className="font-black text-white">推荐标签</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {xhs.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100">{tag}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 lg:col-span-2">
            <h4 className="font-black text-emerald-100">商家发布策略</h4>
            <p className="mt-3 text-sm leading-7 text-emerald-50">{xhs.merchantStrategy}</p>
          </div>
        </div>
      </ReportSection>

      <ReportSection number="十二" title="抖音视频脚本">
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <h4 className="font-black text-white">视频方向</h4>
          <p className="mt-3 text-sm leading-7 text-slate-300">{douyin.direction}</p>
        </div>
        <div className="mt-4 grid gap-3">
          {douyin.shots.map((shot, index) => (
            <ShotCard key={`${shot.time}-${shot.copy}`} index={index} shot={shot} />
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ReportSubList title="抖音封面文案" items={douyin.coverTexts} strong />
          <ReportSubList title="拍摄注意点" items={douyin.shootingNotes} />
        </div>
        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
          <h4 className="font-black text-cyan-100">商家测试目标</h4>
          <p className="mt-3 text-sm leading-7 text-cyan-50">{douyin.merchantGoal}</p>
        </div>
      </ReportSection>

      <ReportSection number="十三" title="产品差异化建议">
        <ReportList items={result.market?.differentiation || []} />
      </ReportSection>

      <ReportSection number="十四" title="风险备忘">
        <ReportList items={result.risks || []} tone="warning" />
      </ReportSection>

      <ReportSection number="十五" title="下一步执行动作">
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <h4 className="font-black text-emerald-200">{result.samplingStrategy?.headline}</h4>
          <p className="mt-2 text-xs text-slate-400">{result.samplingStrategy?.context}</p>
          <ReportList items={[...(result.samplingStrategy?.checkpoints || []), ...(result.nextTestActions || []).slice(-2)]} />
        </div>
      </ReportSection>

      <ReportSection number="十六" title="AI评分依据">
        <div className="grid gap-3 lg:grid-cols-2">
          {getScoringItems(result).map((item) => (
            <div key={item.title} className="rounded-2xl bg-white/[0.05] p-4">
              <Score label={item.title} value={item.score} />
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
            </div>
          ))}
        </div>
      </ReportSection>
    </div>
  );
}

function ReportSection({ number, title, children }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-300 px-3 text-sm font-black text-black">{number}</span>
        <h3 className="text-xl font-black text-white">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KeywordPlatformCard({ title, platform }) {
  const rows = [
    ["核心产品词", platform?.core || []],
    ["场景词", platform?.scene || []],
    ["痛点词", platform?.pain || []],
    ["风格 / 情绪词", platform?.style || []],
    ["属性 / 功能词", platform?.attribute || []],
    ...(platform?.longTail?.length ? [["长尾词", platform.longTail]] : []),
  ];
  return (
    <div className="rounded-2xl bg-white/[0.05] p-4">
      <h4 className="font-black text-white">{title}</h4>
      <div className="mt-3 space-y-3">
        {rows.map(([label, words]) => (
          <div key={label}>
            <p className="text-xs font-bold text-emerald-200">{label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {words.map((word) => (
                <span key={word} className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-slate-200">
                  {word}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportInfoGrid({ items }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-black/25 p-4">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-100">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] p-4">
      <p className="text-xs text-emerald-200">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-white">{value}</p>
    </div>
  );
}

function ReportSubList({ title, items, strong = false }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] p-4">
      <h4 className="font-black text-white">{title}</h4>
      <div className="mt-3 space-y-2">
        {(items || []).map((item, index) => (
          <p key={item} className={`rounded-2xl p-3 text-sm leading-7 ${strong ? "bg-emerald-300 text-black font-black" : "bg-black/25 text-slate-300"}`}>
            {index + 1}. {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function ReportList({ items, tone = "default" }) {
  const warning = tone === "warning";
  return (
    <div className="mt-3 space-y-2">
      {(items || []).map((item, index) => (
        <p key={item} className={`rounded-2xl p-3 text-sm leading-7 ${warning ? "bg-amber-300/10 text-amber-50" : "bg-black/25 text-slate-300"}`}>
          {index + 1}. {item}
        </p>
      ))}
    </div>
  );
}

function Checklist({ items }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(items || []).map((item) => (
        <div key={item} className="flex gap-3 rounded-2xl bg-black/25 p-4 text-sm leading-7 text-slate-200">
          <span className="mt-1 h-4 w-4 shrink-0 rounded border border-emerald-300/60 bg-emerald-300/10" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ShotCard({ index, shot }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-black">镜头{index + 1}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-200">{shot.time}</span>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">{shot.focus}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <p className="rounded-2xl bg-white/[0.05] p-3 text-sm leading-7 text-slate-300"><b className="text-white">画面：</b>{shot.visual}</p>
        <p className="rounded-2xl bg-white/[0.05] p-3 text-sm leading-7 text-slate-300"><b className="text-white">口播/字幕：</b>{shot.copy}</p>
        <p className="rounded-2xl bg-white/[0.05] p-3 text-sm leading-7 text-slate-300"><b className="text-white">目的：</b>{shot.purpose}</p>
      </div>
    </div>
  );
}

export function SamplingStrategyCard({ result }) {
  return (
    <section className="rounded-[2rem] border border-emerald-300/15 bg-emerald-300/[0.07] p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Sampling Strategy</p>
      <h3 className="mt-2 text-xl font-black text-white">专属拿样策略</h3>
      <p className="mt-2 text-sm font-bold text-emerald-100">{result.samplingStrategy?.headline}</p>
      <p className="mt-1 text-xs leading-6 text-slate-400">{result.samplingStrategy?.context}</p>
      <div className="mt-4 space-y-2">
        {(result.samplingStrategy?.checkpoints || []).slice(0, 4).map((item) => (
          <p key={item} className="rounded-2xl bg-black/25 px-4 py-3 text-sm leading-6 text-slate-200">{item}</p>
        ))}
      </div>
    </section>
  );
}

export function MaterialChecklistCard({ result }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Content Materials</p>
      <h3 className="mt-2 text-xl font-black text-white">本品必拍素材</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {(result.imagePlan?.mustShoot || []).slice(0, 5).map((item) => (
          <span key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-5 text-slate-200">
            {item.split("：")[0]}
          </span>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-amber-300/10 p-3 text-xs leading-6 text-amber-100">
        {result.imagePlan?.missingRisk}
      </p>
    </section>
  );
}

export function HistoryCard({ record, onDelete, onRestore }) {
  const metrics = getRecordMetrics(record);
  const displayReport = getRecordReport(record);
  return (
    <article className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="flex gap-4">
        {record.product?.imagePreview && <img src={record.product.imagePreview} alt="" className="h-24 w-24 rounded-2xl object-cover" />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-black text-white">{metrics.displayName || record.product_name || "未命名产品"}</h3>
          <p className="mt-2 text-sm text-slate-400">{metrics.productTypeLabel || record.category || "未分类"} · {new Date(record.created_at).toLocaleString()}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-300/10 px-3 py-1 font-bold text-emerald-200">评分：{record.score ?? "暂无"}</span>
            <span className="px-1 py-1 font-bold text-cyan-200">状态：{metrics.status}</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold text-slate-300">售价：{record.price || "待补充"}</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold text-slate-300">毛利率：{Math.round(metrics.margin * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onRestore(record)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看报告</button>
        <button onClick={() => onDelete(record.id)} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white">删除</button>
      </div>

      {displayReport && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold text-emerald-300">展开报告</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/[0.06] p-4 text-xs leading-6 text-slate-300">{displayReport}</pre>
        </details>
      )}
    </article>
  );
}

export function Input({ label, value, onChange, placeholder, wide }) {
  return (
    <label className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
    </label>
  );
}

export function Card({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

export function PkMetricRow({ label, left, right }) {
  return (
    <div className="grid grid-cols-[0.9fr_1fr_1fr] border-b border-white/10 text-sm">
      <div className="p-4 font-bold text-slate-400">{label}</div>
      <div className="p-4 font-semibold text-slate-100">{left}</div>
      <div className="p-4 font-semibold text-slate-100">{right}</div>
    </div>
  );
}

export function Score({ label, value }) {
  const scoreValue = clamp(Number(value) || 0, 0, 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-300">{label}</span>
        <span className="font-black text-emerald-300">{scoreValue}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${scoreValue}%` }} />
      </div>
    </div>
  );
}

export function MetricBar({ label, value, max, desc, suffix = "", prefix = "" }) {
  const safeMax = max > 0 ? max : 1;
  const width = clamp((value / safeMax) * 100, 0, 100);
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-white">{label}</span>
        <span className="font-black text-emerald-300">{prefix}{money(value)}{suffix}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-400">{desc}</p>
    </div>
  );
}

export default App;
