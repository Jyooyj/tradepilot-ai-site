export const douyinFallbackPlatform = {
  platform: "douyin",
  label: "抖音",
  purpose: "短视频内容热度参考 / 测款内容参考",
};

export const douyinSearchRules = {
  fields: ["name", "keywords", "category"],
  maxTerms: 6,
  separatorPattern: /[\s,，、/|;；]+/,
  links: [
    {
      label: "抖音搜索参考",
      purpose: "进入抖音搜索同款或相近关键词，人工查看内容互动和同质化情况。",
      urlTemplate: "https://www.douyin.com/search/{query}?type=general",
    },
  ],
};

export const douyinHeatLevels = {
  high: {
    label: "高",
    description: "用户备注中出现较明确的热门、爆款、同款或高互动线索。",
  },
  medium: {
    label: "中",
    description: "用户备注中有一定内容热度或搜索参考线索，但仍需要人工核验。",
  },
  low: {
    label: "低",
    description: "用户备注中出现低互动、搜索少或无明显热度等谨慎信号。",
  },
  unknown: {
    label: "未知",
    description: "缺少可用于判断抖音内容热度的手动市场证据。",
  },
};

export const douyinSourceTypes = {
  manual_input: "用户填写的内容热度备注",
  search_reference: "平台搜索入口",
  fallback: "市场证据模式",
  api_pending: "市场证据模式",
};

export const douyinManualSignalRules = [
  { keyword: "点赞", signal: "用户备注提到点赞表现" },
  { keyword: "评论", signal: "用户备注提到评论互动" },
  { keyword: "询价", signal: "用户备注提到评论区或私信询价" },
  { keyword: "收藏", signal: "用户备注提到收藏或留存兴趣" },
  { keyword: "爆款", signal: "用户备注提到爆款线索" },
  { keyword: "热门", signal: "用户备注提到热门内容" },
  { keyword: "同款", signal: "用户备注提到同款内容或同款竞争" },
  { keyword: "种草", signal: "用户备注提到种草内容" },
  { keyword: "搜索多", signal: "用户备注提到搜索结果较多" },
  { keyword: "搜索少", signal: "用户备注提到搜索结果较少" },
  { keyword: "竞争大", signal: "用户备注提到竞争较大" },
  { keyword: "低互动", signal: "用户备注提到互动偏低" },
  { keyword: "无明显热度", signal: "用户备注提到无明显热度" },
];

export const douyinFallbackRiskMessages = {
  apiUnauthorized: "本模块仅作内容热度辅助判断，不代表平台真实热度。",
  searchRecommendation: "建议进入抖音搜索同款关键词，人工查看点赞、评论、收藏、完播/互动情况。",
  homogenization: "若热门内容多但同质化严重，需要注意内容差异化，避免只跟随同款低价竞争。",
  sparseResults: "若搜索结果少，说明内容机会可能存在，但需要通过小样测款验证真实需求。",
  missingManualEvidence: "用户未填写内容热度备注，当前市场热度证据不足。",
};
