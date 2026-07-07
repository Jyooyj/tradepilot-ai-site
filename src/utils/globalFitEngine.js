// globalFitEngine.js
// TradePilot Global 跨境适配评分（Global Fit Score）
// 纯前端规则引擎，离线运行，不依赖任何后端 AI 接口。
// 用于在 Demo 阶段对“低客单小商品是否适合跨境出海”给出辅助判断。
// 不构成真实销售承诺，正式出海前仍需结合平台规则、物流成本和目标市场情况人工复核。

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
  return String(value);
}

// 跨境评分维度（与页面展示一一对应）。
export const GLOBAL_FIT_DIMENSIONS = [
  { key: "priceBand", label: "价格带适配", weight: 0.2 },
  { key: "volumeWeight", label: "体积重量风险", weight: 0.18 },
  { key: "damage", label: "破损风险", weight: 0.16 },
  { key: "returnRisk", label: "退货风险", weight: 0.16 },
  { key: "contentExpression", label: "内容表达空间", weight: 0.16 },
  { key: "compliance", label: "合规敏感风险", weight: 0.14 },
];

// 品类特征库：基于现有 domestic categoryKey 推断跨境物流/破损/退货风险倾向。
const CATEGORY_CROSSBORDER_PROFILE = {
  jewelry: {
    volumeWeightRisk: "low",
    damageRisk: "low",
    returnRisk: "high", // 材质过敏、佩戴不适、颜色差异
    complianceRisk: "medium", // 材质宣称、过敏
  },
  hair_accessory: {
    volumeWeightRisk: "low",
    damageRisk: "low",
    returnRisk: "medium", // 颜色、弹力、上头效果主观
    complianceRisk: "low",
  },
  home_lifestyle: {
    volumeWeightRisk: "high", // 玻璃/陶瓷/大体积
    damageRisk: "high",
    returnRisk: "medium",
    complianceRisk: "medium", // 功效（香薰/精油）
  },
  stationery_cultural: {
    volumeWeightRisk: "low",
    damageRisk: "low",
    returnRisk: "low",
    complianceRisk: "low",
  },
  phone_accessory: {
    volumeWeightRisk: "low",
    damageRisk: "low",
    returnRisk: "high", // 机型适配、孔位、按键不符
    complianceRisk: "low",
  },
  daily_necessity: {
    volumeWeightRisk: "low",
    damageRisk: "low",
    returnRisk: "medium",
    complianceRisk: "high", // 清洁/功效宣称容易触线
  },
  unknown: {
    volumeWeightRisk: "medium",
    damageRisk: "medium",
    returnRisk: "medium",
    complianceRisk: "medium",
  },
};

// 敏感词规则：用于合规风险评分加成（仅做风险提示，不删除/改写）。
const COMPLIANCE_SENSITIVE_PATTERNS = [
  { pattern: /美白|祛斑|祛痘|淡斑|抗皱|抗老|修复|治疗|治愈|疗效|药用|医用/i, risk: "high", reason: "功效宣称，跨境平台（尤其美区）对功效描述审核严格" },
  { pattern: /正品|授权|官方|品牌同款|1:1|复刻|高仿|a货|原单/i, risk: "high", reason: "疑似品牌侵权或仿冒表达，平台会直接下架" },
  { pattern: /食品|保健品|口服|饮用|食用|成分|配方|减肥|瘦身/i, risk: "high", reason: "食品/口服类目跨境合规门槛高，需认证" },
  { pattern: /电池|充电|电源|插头|usb|type-c|锂电池/i, risk: "medium", reason: "带电产品跨境物流与认证要求更高" },
  { pattern: /儿童|婴儿|幼儿|母婴|玩具|3岁以下/i, risk: "medium", reason: "儿童用品合规审查严格（如 CPSIA、CE-Toy）" },
  { pattern: /限量|限定|联名|版权|ip|卡通形象/i, risk: "medium", reason: "涉及版权/IP，需确认授权链路" },
];

// 易碎/易变形材质关键词。
const FRAGILE_PATTERNS = [/玻璃|陶瓷|瓷器|陶土|亚克力.*薄|水晶/i, /易碎|易裂|易断|易变形|怕压|怕摔/i];
const HEAVY_PATTERNS = [/玻璃|陶瓷|金属|铁|木|实木|大理石/i, /重货|大件|体积大|占地方|重物/i];

function matchAny(patterns, content) {
  return patterns.some((re) => re.test(content));
}

// 体积重量风险评分：0=高风险（低分），100=低风险（高分）。
function scoreVolumeWeight(categoryKey, product) {
  const profile = CATEGORY_CROSSBORDER_PROFILE[categoryKey] || CATEGORY_CROSSBORDER_PROFILE.unknown;
  const content = `${text(product?.material)} ${text(product?.logistics)} ${text(product?.note)}`;
  let base = { low: 88, medium: 65, high: 38 }[profile.volumeWeightRisk] ?? 60;
  if (matchAny(HEAVY_PATTERNS, content)) base -= 18;
  if (matchAny(FRAGILE_PATTERNS, content)) base -= 6; // 体积风险维度只算重物影响
  if (/轻货|轻便|小巧|小件|轻/.test(content)) base += 8;
  return clamp(base, 15, 96);
}

// 破损风险评分：100=不易破损，0=极易破损。
function scoreDamage(categoryKey, product) {
  const profile = CATEGORY_CROSSBORDER_PROFILE[categoryKey] || CATEGORY_CROSSBORDER_PROFILE.unknown;
  const content = `${text(product?.material)} ${text(product?.logistics)} ${text(product?.note)} ${text(product?.name)}`;
  let base = { low: 88, medium: 62, high: 32 }[profile.damageRisk] ?? 60;
  if (matchAny(FRAGILE_PATTERNS, content)) base -= 22;
  if (/防震|气泡|泡沫|包装保护|礼盒|硬盒/.test(content)) base += 10;
  if (/软|硅胶|布|塑料|tpu|pvc/i.test(content)) base += 6;
  return clamp(base, 12, 96);
}

// 退货风险评分：100=退货风险低，0=退货风险高。
function scoreReturnRisk(categoryKey, product) {
  const profile = CATEGORY_CROSSBORDER_PROFILE[categoryKey] || CATEGORY_CROSSBORDER_PROFILE.unknown;
  const content = `${text(product?.keywords)} ${text(product?.audience)} ${text(product?.note)}`;
  let base = { low: 86, medium: 64, high: 38 }[profile.returnRisk] ?? 60;
  // 颜色/款式主观偏好会放大退货风险。
  const subjectiveCount = (content.match(/颜色|色|款|尺码|机型|版本|配色|风格/g) || []).length;
  base -= Math.min(subjectiveCount * 5, 18);
  // 若已说明材质/保养，退货风险略降。
  if (/材质|保养|过敏|说明|售后/.test(content)) base += 6;
  return clamp(base, 18, 95);
}

// 价格带适配评分：低客单跨境最友好。
function scorePriceBand(product, result) {
  const price = num(result?.effectivePrice?.price ?? product?.price);
  const cost = num(result?.effectivePrice?.cost ?? product?.cost);
  if (!price) return 50;
  // 跨境低客单最佳区间：零售价 ¥9.9–¥49.9，成本最好 ≤ ¥15。
  let score = 70;
  if (price >= 9.9 && price <= 49.9) score += 20;
  else if (price < 9.9) score -= 5; // 过低，利润空间不足
  else if (price <= 99) score -= 6;
  else score -= 18; // 高客单跨境测款风险高

  if (cost > 0 && cost <= 15) score += 8;
  else if (cost > 30) score -= 8;

  const margin = price > 0 && cost > 0 ? (price - cost) / price : 0;
  if (margin >= 0.5) score += 6;
  else if (margin < 0.3 && margin > 0) score -= 8;

  return clamp(score, 20, 96);
}

// 内容表达空间评分：复用国内 contentScore 思路并做跨境偏移。
function scoreContentExpression(product, result) {
  const contentScore = num(result?.contentPotentialScore, 50);
  const content = `${text(product?.name)} ${text(product?.keywords)} ${text(product?.note)} ${text(product?.audience)}`;
  let score = 50 + contentScore * 0.4;
  // 视觉表达强 / 故事性强的类目跨境更易展示。
  if (/氛围|场景|故事|治愈|礼物|穿搭|演示|对比|改造|收纳/.test(content)) score += 8;
  if (/实拍|视频|演示|上头|佩戴|上机/.test(content)) score += 6;
  if (result?.xhsPackage?.coverHooks?.length) score += 3;
  return clamp(score, 25, 96);
}

// 合规敏感风险评分：100=无明显敏感词，0=明显敏感。
function scoreCompliance(categoryKey, product, result) {
  const profile = CATEGORY_CROSSBORDER_PROFILE[categoryKey] || CATEGORY_CROSSBORDER_PROFILE.unknown;
  const contentParts = [
    text(product?.name),
    text(product?.keywords),
    text(product?.note),
    text(product?.material),
    text(result?.xhsPackage?.merchantStrategy),
    text(result?.douyinPackage?.merchantGoal),
    asArray(result?.xhsPackage?.titles).join(" "),
    asArray(result?.douyinPackage?.coverTexts).join(" "),
  ];
  const content = contentParts.join(" ");
  let base = { low: 88, medium: 60, high: 40 }[profile.complianceRisk] ?? 60;
  let hitCount = 0;
  const hits = [];
  COMPLIANCE_SENSITIVE_PATTERNS.forEach((rule) => {
    if (rule.pattern.test(content)) {
      hitCount += 1;
      hits.push(rule.reason);
      base -= rule.risk === "high" ? 16 : 8;
    }
  });
  return {
    score: clamp(base, 15, 95),
    hits: Array.from(new Set(hits)).slice(0, 3),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// 计算跨境适配总分（0-100，加权）。
function computeTotalScore(dimensions) {
  let total = 0;
  GLOBAL_FIT_DIMENSIONS.forEach((dim) => {
    total += (dimensions[dim.key]?.score ?? 0) * dim.weight;
  });
  return Math.round(total);
}

function getLevel(score) {
  if (score >= 78) return { level: "高", recommendation: "建议进入跨境测款" };
  if (score >= 60) return { level: "中", recommendation: "谨慎进入跨境测款" };
  return { level: "低", recommendation: "暂不建议直接进入跨境测款" };
}

// 生成主要优势 / 主要风险 / 下一步建议。
function buildNarrative(product, result, dimensions, complianceHits) {
  const advantages = [];
  const risks = [];
  const nextActions = [];

  const price = num(result?.effectivePrice?.price ?? product?.price);
  const cost = num(result?.effectivePrice?.cost ?? product?.cost);
  const margin = price > 0 && cost > 0 ? (price - cost) / price : 0;

  // 优势
  if (dimensions.priceBand.score >= 70) {
    advantages.push("价格带处于低客单跨境友好区间，便于海外用户冲动决策与测款。");
  }
  if (dimensions.volumeWeight.score >= 75) {
    advantages.push("体积重量轻，跨境小包物流成本可控，有利于压低首单试错成本。");
  }
  if (dimensions.damage.score >= 75) {
    advantages.push("不易破损，跨境长途运输和退换货损耗风险较低。");
  }
  if (dimensions.contentExpression.score >= 70) {
    advantages.push("具备较强视觉/故事表达空间，适合 TikTok / 独立站短视频展示。");
  }
  if (advantages.length === 0) {
    advantages.push("可在小批量范围内尝试跨境测款，重点验证海外用户对价格和卖点的反馈。");
  }
  while (advantages.length < 2) {
    advantages.push("首单投入低，可作为品类试探，验证海外市场反馈后再决定是否加码。");
  }

  // 风险
  if (dimensions.volumeWeight.score < 55) {
    risks.push("体积或重量偏大，跨境小包物流成本较高，需重点核算头程与尾程运费。");
  }
  if (dimensions.damage.score < 55) {
    risks.push("材质易碎/易变形，跨境长途运输破损率可能上升，影响利润与评分。");
  }
  if (dimensions.returnRisk.score < 55) {
    risks.push("颜色、款式、机型适配等主观因素较多，海外退货率可能高于国内。");
  }
  if (dimensions.compliance.score < 55) {
    const extra = complianceHits[0] ? `（${complianceHits[0]}）` : "";
    risks.push(`存在合规敏感表达${extra}，可能触发平台审核或下架，需要提前调整文案。`);
  }
  if (dimensions.priceBand.score < 55) {
    risks.push("价格带或毛利结构不利于覆盖跨境履约和售后成本，需重新核算售价。");
  }
  if (risks.length === 0) {
    risks.push("仍需关注目标市场认证、税务和平台规则变化，避免上线后被拒收或下架。");
  }
  while (risks.length < 2) {
    risks.push("首单建议小批量，结合实际退货率与物流时效再决定是否补货。");
  }

  // 下一步建议
  if (dimensions.priceBand.score >= 70 && dimensions.volumeWeight.score >= 70) {
    nextActions.push("先发 50–100 件小包跨境测款，重点观察点击率、加购率和首单转化。");
  } else {
    nextActions.push("先核算头程运费、关税和平台佣金，确认毛利仍可覆盖后再小批量测款。");
  }
  if (dimensions.contentExpression.score >= 65) {
    nextActions.push("准备 2–3 条 TikTok / 独立站短视频脚本，A/B 测试不同卖点和场景钩子。");
  } else {
    nextActions.push("补拍场景化、对比化视觉素材，提升内容表达力，再启动跨境内容测款。");
  }
  if (dimensions.compliance.score < 75) {
    nextActions.push("对标题、卖点、脚本做一次合规自检，移除功效、品牌侵权等敏感表达后再上架。");
  } else {
    nextActions.push("复核目标市场平台规则（如 TikTok Shop、Amazon、独立站政策）后上线。");
  }

  return {
    advantages: advantages.slice(0, 3),
    risks: risks.slice(0, 3),
    nextActions: nextActions.slice(0, 3),
  };
}

// 主入口：根据 product + result 计算跨境适配评分。
export function evaluateGlobalFit(product, result) {
  const safeProduct = product && typeof product === "object" ? product : {};
  const safeResult = result && typeof result === "object" ? result : {};
  const categoryKey = safeResult.categoryKey || "unknown";

  const compliance = scoreCompliance(categoryKey, safeProduct, safeResult);

  const dimensions = {
    priceBand: { score: scorePriceBand(safeProduct, safeResult), label: "价格带适配" },
    volumeWeight: { score: scoreVolumeWeight(categoryKey, safeProduct), label: "体积重量风险" },
    damage: { score: scoreDamage(categoryKey, safeProduct), label: "破损风险" },
    returnRisk: { score: scoreReturnRisk(categoryKey, safeProduct), label: "退货风险" },
    contentExpression: { score: scoreContentExpression(safeProduct, safeResult), label: "内容表达空间" },
    compliance: { score: compliance.score, label: "合规敏感风险", hits: compliance.hits },
  };

  const totalScore = computeTotalScore(dimensions);
  const { level, recommendation } = getLevel(totalScore);
  const narrative = buildNarrative(safeProduct, safeResult, dimensions, compliance.hits);

  return {
    totalScore,
    level,
    recommendation,
    dimensions: GLOBAL_FIT_DIMENSIONS.map((dim) => ({
      key: dim.key,
      label: dim.label,
      weight: dim.weight,
      score: dimensions[dim.key].score,
      hits: dimensions[dim.key].hits || [],
    })),
    advantages: narrative.advantages,
    risks: narrative.risks,
    nextActions: narrative.nextActions,
    complianceHits: compliance.hits,
    disclaimer:
      "该结果为 Demo 阶段的跨境辅助判断，不代表真实销售承诺，正式出海前仍需结合平台规则、物流成本和目标市场情况人工复核。",
    generatedAt: new Date().toISOString(),
    engine: "rule-based-v1",
  };
}

export const GLOBAL_FIT_DISCLAIMER =
  "该结果为 Demo 阶段的跨境辅助判断，不代表真实销售承诺，正式出海前仍需结合平台规则、物流成本和目标市场情况人工复核。";
