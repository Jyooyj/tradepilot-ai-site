// policySources.js
// Policy Source Registry｜政策来源与规则更新。
// 登记真实政策与平台规则来源，将公开法规、平台规范与本地风险规则进行映射。
// 当前版本不接入官方实时 API、不做爬虫、不自动抓取平台页面；采用「真实来源登记 + 本地规则映射 + 人工审核更新」。
// 仅为合规风险提示，不构成法律意见。

export const POLICY_SOURCES_CHECKED_AT = "2026-06-27";

export const policySources = [
  {
    sourceId: "samr_law_database",
    title: "国家市场监督管理总局法律法规规章数据库",
    authority: "国家市场监督管理总局",
    sourceType: "法律法规数据库",
    official: true,
    url: "https://www.samr.gov.cn",
    publishDate: "",
    effectiveDate: "",
    lastCheckedAt: POLICY_SOURCES_CHECKED_AT,
    coveredRiskCategories: [
      "广告法绝对化用语",
      "功效夸大",
      "医疗健康/身体功效风险",
      "美妆护肤/食品/保健品风险",
      "金融投资风险",
    ],
    summary: "后续用于检索广告、网络交易、食品、药品、消费者权益等相关公开规则。",
    updateMode: "人工维护",
    status: "已登记",
  },
  {
    sourceId: "samr_absolute_terms_2023",
    title: "广告绝对化用语执法指南",
    authority: "国家市场监督管理总局",
    sourceType: "监管指南",
    official: true,
    url: "https://www.samr.gov.cn",
    publishDate: "2023-02-25",
    effectiveDate: "2023-02-25",
    lastCheckedAt: POLICY_SOURCES_CHECKED_AT,
    coveredRiskCategories: ["广告法绝对化用语", "功效夸大"],
    summary: "用于识别国家级、最高级、最佳及近似绝对化表达风险。",
    updateMode: "人工维护",
    status: "已登记",
  },
  {
    sourceId: "douyin_product_info_rules",
    title: "抖音电商商品信息发布规范",
    authority: "抖音电商",
    sourceType: "平台规则",
    official: true,
    url: "https://school.jinritemai.com",
    publishDate: "",
    effectiveDate: "",
    lastCheckedAt: POLICY_SOURCES_CHECKED_AT,
    coveredRiskCategories: [
      "未证实销量/热度/平台数据",
      "侵权/品牌风险",
      "平台敏感营销表达",
    ],
    summary: "用于商品标题、主图、商品描述、禁发信息等内容风险提示。",
    updateMode: "人工维护",
    status: "已登记",
  },
  {
    sourceId: "douyin_forbidden_goods_rules",
    title: "抖音电商禁止发布商品/信息规则",
    authority: "抖音电商",
    sourceType: "平台规则",
    official: true,
    url: "https://school.jinritemai.com",
    publishDate: "",
    effectiveDate: "",
    lastCheckedAt: POLICY_SOURCES_CHECKED_AT,
    coveredRiskCategories: ["违禁或高风险商品提示"],
    summary: "用于违禁商品、高风险商品、禁售信息风险提示。",
    updateMode: "人工维护",
    status: "已登记",
  },
  {
    sourceId: "xiaohongshu_community_rules",
    title: "小红书社区规范 / 商业内容规范",
    authority: "小红书",
    sourceType: "平台规则",
    official: true,
    url: "",
    publishDate: "",
    effectiveDate: "",
    lastCheckedAt: POLICY_SOURCES_CHECKED_AT,
    coveredRiskCategories: ["平台敏感营销表达", "未成年人/敏感人群风险"],
    summary: "用于内容发布、商业推广、敏感表达风险提示。官方链接待补充，未使用伪造 URL。",
    updateMode: "人工维护",
    status: "待补充来源",
  },
  {
    sourceId: "tradepilot_general_compliance_seed",
    title: "TradePilot 内置通用合规规则",
    authority: "TradePilot",
    sourceType: "内置规则",
    official: false,
    url: "",
    publishDate: "",
    effectiveDate: "",
    lastCheckedAt: POLICY_SOURCES_CHECKED_AT,
    coveredRiskCategories: [
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
    ],
    summary: "在官方政策未覆盖或无法结构化时，提供基础风险提示。",
    updateMode: "人工维护",
    status: "已登记",
  },
];

export function getPolicySourceById(sourceId) {
  return policySources.find((source) => source.sourceId === sourceId) || null;
}

export function getPolicySourcesByIds(sourceIds = []) {
  return (Array.isArray(sourceIds) ? sourceIds : [])
    .map((id) => getPolicySourceById(id))
    .filter(Boolean);
}

// 接入状态（明确说明：不接入官方实时接口、不接入平台实时审核数据）。
export const POLICY_CONNECTION_STATUS = [
  { key: "registered_sources", label: "真实政策来源", value: "已登记" },
  { key: "official_api", label: "官方实时接口", value: "未接入" },
  { key: "platform_realtime_audit", label: "平台实时审核数据", value: "未接入" },
  { key: "update_mode", label: "更新方式", value: "人工维护 / 版本更新" },
  { key: "positioning", label: "定位", value: "合规风险提示，不构成法律意见" },
];

// 新政策更新流程（人工维护）。
export const POLICY_UPDATE_FLOW = [
  "发现新法规或平台规则",
  "登记政策来源、链接、发布时间和适用范围",
  "提取高风险表达、禁售品类或内容限制",
  "生成待审核规则",
  "人工确认后写入规则库",
  "更新规则版本号和更新时间",
  "前端展示新的风险提示",
];

export const POLICY_UPDATE_FLOW_NOTE =
  "当前版本为人工维护流程，后续可扩展为后台管理、Supabase 规则表或定时检查官方公开页面。当前不接入官方实时接口、不做爬虫。";

export const POLICY_REGISTRY_NOTE =
  "当前规则库为 TradePilot 内置通用合规风险规则库 + 真实政策来源登记，采用人工维护与版本更新，不接入官方实时政策接口，也不接入平台实时审核数据。";

export function getPolicySourceRegistryMeta() {
  const officialCount = policySources.filter((s) => s.official).length;
  return {
    total: policySources.length,
    officialCount,
    pendingCount: policySources.filter((s) => s.status === "待补充来源").length,
    lastCheckedAt: POLICY_SOURCES_CHECKED_AT,
  };
}

// ---------------- 前台产品化展示文案（不暴露版本号、日期、数量、维护流程与否定式技术表述） ----------------

export const POLICY_REGISTRY_TITLE = "政策来源与合规规则说明";

export const POLICY_REGISTRY_INTRO =
  "TradePilot 基于公开法规、平台规则和常见内容合规风险，建立了内容合规风险提示机制。系统会在生成标题、正文、脚本、标签和商品卖点后，自动检查可能涉及绝对化用语、未证实热度、功效夸大、品牌侵权和平台敏感表达的内容，并给出修改建议。";

export const POLICY_REGISTRY_FLOW = "生成内容 → 合规风险检查 → 输出风险类型与替代表达 → 用户发布前人工复核";

export const POLICY_REGISTRY_COVERAGE_NOTE = "当前已覆盖小商品内容营销中的主要合规风险场景。";

export const POLICY_REGISTRY_DISCLAIMER =
  "该模块用于发布前合规自检，帮助用户降低内容表达风险。由于平台规则和监管要求可能变化，系统提示仅作为风险参考，正式发布前仍建议结合最新平台规则进行人工复核。";

// 前台政策来源（产品化分组，仅展示名称 / 类型 / 覆盖方向 / 状态）。
export const POLICY_SOURCE_GROUPS = [
  {
    name: "市场监管相关公开法规",
    type: "法律法规 / 监管指南",
    coverage: "广告宣传、绝对化用语、虚假宣传风险",
    status: "已纳入参考",
  },
  {
    name: "电商平台内容发布规则",
    type: "平台规则",
    coverage: "商品标题、商品描述、禁发信息、平台敏感表达",
    status: "已纳入参考",
  },
  {
    name: "小红书 / 抖音等内容平台规范",
    type: "平台规则",
    coverage: "内容发布、商业推广、敏感表达",
    status: "持续补充",
  },
  {
    name: "TradePilot 通用合规规则",
    type: "内置规则",
    coverage: "小商品营销文案中的高频风险表达",
    status: "已启用",
  },
];
