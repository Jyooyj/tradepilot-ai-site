// policyRiskRules.js
// Policy Risk Engine 内置政策与内容合规风险规则库（通用合规提醒，离线、无联网、无爬虫）。
// 仅用于发布前的合规自检与风险提示，不用于绕过平台审核或规避风控。
// 规则为通用提醒，不构成法律意见；平台规则变化较快，正式上线后需定期维护。

export const POLICY_RULES_UPDATED_AT = "2026-06-27";

// 所有可扫描的字段范围。
export const POLICY_SCOPES = ["title", "body", "script", "tag", "sellingPoint"];
const ALL_SCOPES = [...POLICY_SCOPES];

export const policyRiskRules = [
  {
    ruleId: "absolute_claim_high_001",
    sourceIds: ["samr_absolute_terms_2023", "samr_law_database", "tradepilot_general_compliance_seed"],
    category: "广告法绝对化用语",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "全网最低", "全网最低价", "全网第一", "行业第一", "销量第一", "效果最好",
      "最有效", "最低价", "100%有效", "百分百有效", "永久有效", "绝对有效",
      "保证爆款", "国家级", "唯一", "必爆", "绝对", "万能", "无敌", "极致",
    ],
    description: "可能涉及绝对化宣传或无法证明的营销承诺。",
    riskReason: "该类表达容易被理解为确定性承诺，若缺少证据支持，存在虚假宣传风险。",
    saferAlternatives: ["更适合", "较适合", "性价比较高", "适合多数使用场景", "建议以实测数据为准"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "absolute_claim_medium_001",
    sourceIds: ["samr_absolute_terms_2023", "tradepilot_general_compliance_seed"],
    category: "广告法绝对化用语",
    severity: "medium",
    matchType: "keyword",
    keywords: [
      "必买", "最值得买", "顶级", "顶尖", "最强", "最好", "爆款", "热卖",
    ],
    description: "偏夸大的营销用语，建议改为更克制、可被证据支持的表达。",
    riskReason: "该类表达带有较强营销诱导色彩，若缺少证据支持，可能被认定为夸大宣传。",
    saferAlternatives: ["更适合", "较受欢迎", "性价比较高", "适合先小范围测款验证", "建议以实测数据为准"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "unverified_sales_001",
    sourceIds: ["douyin_product_info_rules", "samr_law_database", "tradepilot_general_compliance_seed"],
    category: "未证实销量/热度/平台数据",
    severity: "medium",
    matchType: "keyword",
    keywords: [
      "销量爆了", "全网爆款", "平台热推", "官方推荐", "百万销量", "全网都在买",
      "回购率第一", "卖断货", "爆单", "热销榜第一",
    ],
    description: "涉及未经证实的销量、热度或平台数据。",
    riskReason: "缺乏可验证数据来源的销量/热度表述，容易被认定为虚假或夸大宣传。",
    saferAlternatives: ["近期关注度有所提升", "适合先小范围测款验证", "具体数据以真实后台为准"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "efficacy_exaggeration_001",
    sourceIds: ["samr_law_database", "samr_absolute_terms_2023", "tradepilot_general_compliance_seed"],
    category: "功效夸大",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "立刻见效", "立即见效", "根治", "彻底解决", "永久有效", "无副作用",
      "百分百有效", "一次见效", "马上变白", "秒见效",
    ],
    description: "对产品功效作出夸大或确定性承诺。",
    riskReason: "确定性功效承诺难以证明，存在虚假宣传与误导消费者风险。",
    saferAlternatives: ["部分用户反馈使用后有改善", "效果因人而异", "建议结合自身情况理性参考"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "medical_claim_001",
    sourceIds: ["samr_law_database", "tradepilot_general_compliance_seed"],
    category: "医疗健康/身体功效风险",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "治疗", "治愈", "消炎", "抗菌", "杀菌", "改善疾病", "减肥", "瘦身",
      "调理内分泌", "降血压", "降血糖", "壮阳", "助眠治疗",
    ],
    description: "涉及医疗、疾病或身体功效相关表述。",
    riskReason: "普通商品不得宣称医疗或治疗功效，涉及疾病/身体调理表述存在违规风险。",
    saferAlternatives: ["日常使用体验描述", "如有健康相关需求请咨询专业人士", "不作任何医疗功效承诺"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "beauty_food_health_001",
    sourceIds: ["samr_law_database", "tradepilot_general_compliance_seed"],
    category: "美妆护肤/食品/保健品风险",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "美白", "祛斑", "抗老", "抗衰", "修复皮肤屏障", "无添加", "纯天然",
      "零风险", "排毒", "细胞修复", "逆龄",
    ],
    description: "美妆护肤 / 食品 / 保健品类敏感功效或成分表述。",
    riskReason: "美白、抗老、纯天然、无添加等表述受严格监管，缺少资质与证据时存在合规风险。",
    saferAlternatives: ["日常护理感受", "成分信息以正规检测报告为准", "建议结合肤质理性参考"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "finance_claim_001",
    sourceIds: ["samr_law_database", "tradepilot_general_compliance_seed"],
    category: "金融投资风险",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "稳赚", "保本", "暴利", "稳赚不赔", "高回报", "无风险收益", "包赚",
      "躺赚", "一夜暴富", "保证收益",
    ],
    description: "涉及金融、投资、收益承诺类表述。",
    riskReason: "收益承诺与保本保收益表述属高风险违规，易被认定为误导或非法宣传。",
    saferAlternatives: ["投资有风险，请理性决策", "不对任何收益作出承诺", "请以官方与正规渠道信息为准"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "brand_infringement_001",
    sourceIds: ["douyin_product_info_rules", "samr_law_database", "tradepilot_general_compliance_seed"],
    category: "侵权/品牌风险",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "大牌同款", "平替", "仿款", "原单", "尾货", "正品保证", "官方授权",
      "联名款", "高仿", "A货", "代购正品",
    ],
    description: "可能涉及品牌侵权、货源真实性或授权问题。",
    riskReason: "在缺少品牌授权或货源证据时，大牌同款/原单/官方授权等表述存在侵权与虚假风险。",
    saferAlternatives: ["相似风格设计", "请确认是否存在品牌授权或外观侵权风险", "建议保留正规进货凭证"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "minor_sensitive_001",
    sourceIds: ["samr_law_database", "xiaohongshu_community_rules", "tradepilot_general_compliance_seed"],
    category: "未成年人/敏感人群风险",
    severity: "medium",
    matchType: "keyword",
    keywords: [
      "儿童必备", "婴儿专用", "学生党无脑入", "无脑入", "未成年人使用效果保证",
      "宝宝专用", "小孩必备",
    ],
    description: "涉及未成年人或敏感人群的诱导或承诺表述。",
    riskReason: "面向儿童/学生等群体的诱导性表述需谨慎，儿童用品还需材质、检测与合规证据。",
    saferAlternatives: ["适合预算有限、喜欢可爱小物的学生用户参考", "儿童用品请确认安全材质与检测报告", "请理性按需购买"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "platform_sensitive_001",
    sourceIds: ["douyin_product_info_rules", "xiaohongshu_community_rules", "tradepilot_general_compliance_seed"],
    category: "平台敏感营销表达",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "包过审", "引流私信", "加微信", "私下交易", "绕平台", "薅羊毛",
      "刷单", "刷评论", "刷量", "导流到微信", "私域成交",
    ],
    description: "涉及平台敏感或违规营销行为的表述。",
    riskReason: "诱导私下交易、刷单刷评、站外引流等属平台敏感行为，存在违规与账号风险。",
    saferAlternatives: ["在平台内合规沟通与成交", "通过正规客服与下单流程服务用户", "遵守平台社区规范"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
  {
    ruleId: "restricted_goods_001",
    sourceIds: ["douyin_forbidden_goods_rules", "samr_law_database", "tradepilot_general_compliance_seed"],
    category: "违禁或高风险商品提示",
    severity: "high",
    matchType: "keyword",
    keywords: [
      "药品", "处方药", "医疗器械", "减肥药", "电子烟", "刀具", "管制刀具",
      "危险化学品", "偷拍设备", "仿冒品牌", "盗版", "盗版周边", "枪支", "弹药",
    ],
    description: "涉及违禁或高风险商品类目。",
    riskReason: "违禁或高风险商品受严格管控，本工具仅作风险提醒，不提供任何规避或销售建议。",
    saferAlternatives: ["请确认该类目是否允许在目标平台销售", "如涉及管控商品请遵守相关法律法规", "建议咨询平台官方类目规则"],
    scope: ALL_SCOPES,
    sourceType: "general_compliance_seed",
    updatedAt: POLICY_RULES_UPDATED_AT,
  },
];

// 高风险类别：命中即整体判为 high。
// 注意：广告法绝对化用语已拆分为高/中两条规则，是否高风险由命中规则的 severity 决定，
// 不再把整个“广告法绝对化用语”类别强制判为 high（避免“最适合”等普通说明被误判）。
export const HIGH_RISK_CATEGORIES = [
  "功效夸大",
  "医疗健康/身体功效风险",
  "美妆护肤/食品/保健品风险",
  "金融投资风险",
  "侵权/品牌风险",
  "平台敏感营销表达",
  "违禁或高风险商品提示",
];

// 安全上下文白名单：这些属于产品说明、数据字段或系统建议，不应触发广告法等营销风险。
// 当命中的风险词只是某个白名单短语的一部分（例如“爆款”出现在“爆款潜力”里）时，忽略该命中。
export const SAFE_PHRASE_WHITELIST = [
  "最适合", "较适合", "更适合", "最后", "最终", "最近", "最多", "最少",
  "最低风险", "最高风险", "最低拿货价", "最高拿货价", "最低售价", "最高售价",
  "最终动作", "最近更新", "当前最需要补充", "最多展示", "最少展示",
  "爆款潜力", "爆款测款", "爆款潜质", "具备爆款", "是否具备爆款", "爆款机会",
  "爆款方向", "爆款属性", "潜在爆款", "热卖潜力",
];

// 安全语境模式：风险确认问题 / 风险提醒 / 合规提示 / 免责声明 / 系统分析说明。
// 命中这些语境时，相关营销类风险词不视为“用户对外发布的营销违规文案”。
export const SAFE_CONTEXT_PATTERNS = [
  "请确认", "确认是否", "是否有", "是否为", "是否支持", "是否存在", "是否具备",
  "需要确认", "建议确认", "请核实", "核实是否",
  "风险提醒", "合规提示", "建议改为", "替代表达", "免责", "不代表官方", "不代表实时",
  "不代表全网", "建议以实测数据为准", "仅供参考", "系统分析", "测款语境",
];

// 针对示例短语的安全改写映射（命中时优先使用）。
export const SAFE_REWRITE_MAP = [
  {
    match: ["全网最低", "100%必爆", "必爆", "保证爆款"],
    suggestion: "价格有一定优势，适合先小范围测款，具体表现以真实数据为准。",
  },
  {
    match: ["大牌同款", "原单", "尾货", "仿款", "平替"],
    suggestion: "相似风格设计，建议确认是否存在品牌授权或外观侵权风险。",
  },
  {
    match: ["学生党无脑入", "无脑入"],
    suggestion: "适合预算有限、喜欢可爱小物的学生用户参考。",
  },
];

export const POLICY_RISK_DISCLAIMER =
  "本规则库为通用合规提醒，不构成法律意见；平台规则变化较快，发布前请结合最新平台规则进行人工复核。";

// 规则库版本信息。
export const POLICY_RULES_VERSION = "policy-risk-rules-v1.1";

export const POLICY_RULES_CHANGELOG = [
  "删除单字“最”的误报规则",
  "新增语境白名单",
  "增加政策来源映射",
  "明确非官方实时接口",
];

// 当前覆盖的 10 类风险类别（固定顺序，用于规则库说明展示）。
export const POLICY_RISK_CATEGORY_LIST = [
  "广告法绝对化用语",
  "未证实销量/热度/平台数据",
  "功效夸大",
  "医疗健康/身体功效风险",
  "美妆护肤/食品/保健品风险",
  "金融投资风险",
  "侵权/品牌风险",
  "未成年人/敏感人群风险",
  "平台敏感营销表达",
  "违禁或高风险商品提示",
];

// 前台展示用的产品化风险类别文案（10 类）。
export const POLICY_RISK_CATEGORY_DISPLAY = [
  "绝对化宣传风险",
  "未证实销量 / 热度表达",
  "功效夸大风险",
  "医疗健康相关表述风险",
  "美妆 / 食品 / 保健品表述风险",
  "金融收益承诺风险",
  "品牌侵权 / 仿冒风险",
  "未成年人 / 敏感人群表达风险",
  "平台敏感营销表达",
  "违禁或高风险商品提示",
];

// 规则库统计信息（用于“政策风险规则库”入口展示）。
export function getPolicyRulesMeta() {
  const categories = [...new Set(policyRiskRules.map((rule) => rule.category))];
  const keywordCount = policyRiskRules.reduce((acc, rule) => acc + rule.keywords.length, 0);
  const allSourceIds = [...new Set(policyRiskRules.flatMap((rule) => rule.sourceIds || []))];
  return {
    ruleCount: policyRiskRules.length,
    categoryCount: categories.length,
    categories,
    keywordCount,
    version: POLICY_RULES_VERSION,
    changelog: POLICY_RULES_CHANGELOG,
    sourceIds: allSourceIds,
    updatedAt: POLICY_RULES_UPDATED_AT,
    note: "规则库为通用合规提醒，不构成法律意见；平台规则变化较快，正式上线后需要定期维护。",
  };
}
