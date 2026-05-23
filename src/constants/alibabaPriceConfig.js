export const alibabaPricePlatforms = {
  wholesale: {
    key: "1688",
    label: "1688",
    purpose: "批发价 / 拿货价参考",
  },
  retail: {
    key: "taobao",
    label: "淘宝",
    purpose: "零售价 / 竞品售价参考",
  },
};

export const alibabaPriceSearchRules = {
  fields: ["name", "keywords", "category"],
  maxTerms: 6,
  separatorPattern: /[\s,，、/|;；]+/,
  links: [
    {
      platform: "1688",
      label: "1688 搜索参考",
      purpose: "人工查看批发价、起订量、规格和供应商信息。",
      urlTemplate: "https://s.1688.com/selloffer/offer_search.htm?keywords={query}",
    },
    {
      platform: "taobao",
      label: "淘宝搜索参考",
      purpose: "人工查看零售价、竞品标题、主图和价格带。",
      urlTemplate: "https://s.taobao.com/search?q={query}",
    },
  ],
};

export const alibabaPriceSourceTypes = {
  api_real: "后端真实 API 返回",
  api_unavailable: "市场证据模式",
  manual_input: "用户填写竞品价格区间",
  search_reference: "搜索参考入口",
  fallback: "市场证据参考",
};

export const alibabaPriceNotices = {
  marketEvidenceMode: "当前为市场证据模式：未调用外部平台 API，不生成或伪造平台真实价格、销量、点赞、播放数据；系统基于用户填写信息和搜索入口进行辅助判断。",
  apiUnavailable: "当前为市场证据模式：未调用外部平台 API，不生成或伪造平台真实价格、销量、点赞、播放数据；系统基于用户填写信息和搜索入口进行辅助判断。",
  apiFailed: "当前为市场证据模式：外部价格接口不可用，本次仅基于用户填写信息和搜索入口进行辅助判断。",
  apiReal: "价格结果来自后端 API adapter 的真实返回，前端未暴露任何平台 Key。",
};

export const alibabaPriceRiskMessages = {
  noApi: "仅依赖手动填写数据，建议至少补充 2-3 个同款链接交叉验证。",
  noManualPrice: "用户未填写竞品价格区间，价格证据完整度较低。",
  aboveMarket: "建议售价明显高于用户填写的竞品价格区间，需要验证差异化卖点和转化承受力。",
  belowMarket: "建议售价低于用户填写的竞品价格区间，需要确认是否有足够利润空间和供应稳定性。",
  withinMarket: "建议售价处于用户填写的竞品价格区间内，但仍需人工核验平台同款价格和规格差异。",
  searchCheck: "建议打开淘宝搜索入口，人工核验同款价格、规格、运费和主图差异。",
  noWholesalePrice: "缺少批发价参考，拿货成本判断证据不足。",
  wholesaleMismatch: "拿货价与用户填写批发价差异较大，需核验供应商报价、规格和起订量。",
  noHighRisk: "暂无明确高风险，但仍建议核验同款价格、规格、起订量和运费。",
};
