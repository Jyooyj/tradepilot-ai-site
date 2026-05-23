export const competitorDensityOptions = ["未观察", "少", "中等", "多"];

export const contentHomogeneityOptions = ["未观察", "低", "中", "高"];

export const competitorDensityDescriptions = {
  未观察: "暂未观察同类竞品数量。",
  少: "同类竞品较少，可能存在内容或供给机会，但仍需验证搜索需求。",
  中等: "同类竞品适中，适合通过价格、内容角度和供应链稳定性做差异化。",
  多: "同类竞品较多，竞争压力较高，需要明确差异化卖点和利润空间。",
};

export const contentHomogeneityDescriptions = {
  未观察: "暂未观察内容同质化程度。",
  低: "内容角度较分散，仍有机会测试差异化表达。",
  中: "内容角度已有一定重复，需要优化封面、标题和场景。",
  高: "内容同质化明显，单纯跟款风险较高。",
};

export const manualEvidenceCompletenessRules = {
  high: "填写了价格、内容热度、参考链接和竞争情况中的多数信息。",
  medium: "填写了部分关键市场证据，可作为辅助判断。",
  low: "人工市场证据较少，仍需补充平台观察。",
};

export const manualMarketEvidenceTips = [
  "可填写 1688 批发价、淘宝/拼多多零售价、抖音/小红书热度观察。",
  "可粘贴搜索页、商品页或内容页链接，便于复盘时回看证据。",
  "记录同类竞品数量和内容同质化程度，系统会提示竞争和差异化风险。",
];

export const manualMarketRiskMessages = {
  insufficientEvidence: "人工市场证据不足，建议补充 1688、淘宝/拼多多、抖音/小红书的观察记录。",
  wholesaleMissing: "缺少 1688 批发价参考，拿货价判断仍需人工核验。",
  retailMissing: "缺少淘宝/拼多多零售价参考，建议售价与竞品价格带的关系不够清晰。",
  heatMissing: "缺少抖音/小红书内容热度观察，内容测款机会仍需验证。",
  linkMissing: "未填写参考链接，建议补充 1-3 个同款链接，便于交叉验证价格和内容表现。",
  highDensity: "同类竞品数量较多，需要警惕价格竞争和素材撞款。",
  highHomogeneity: "内容同质化程度较高，需要提前设计差异化内容角度。",
};

export const manualMarketNextActionTemplates = {
  addLinks: "补充 1-3 个同款商品页或搜索页链接，后续用于人工复核价格、规格、销量口径和内容表现。",
  addHeat: "补充抖音/小红书热度观察，记录点赞、评论、收藏、询价和同质化情况。",
  addPrice: "补齐批发价与零售价参考，再判断建议售价是否有足够利润空间。",
  testSmallBatch: "先小批量测款，观察点击、收藏、询价和成交后再决定是否扩大进货。",
  differentiate: "围绕图片风格、标题钩子、使用场景或组合套装设计差异化内容。",
};
