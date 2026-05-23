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
  api_unavailable: "1688 / 淘宝价格 API 未配置",
  manual_input: "用户填写竞品价格区间",
  search_reference: "平台搜索入口",
  fallback: "无授权降级参考",
};

export const alibabaPriceNotices = {
  apiUnavailable: "1688 / 淘宝价格 API 未配置，当前使用平台搜索入口和用户填写竞品价格进行价格证据分析。",
  apiFailed: "1688 / 淘宝价格 API 调用失败，当前降级使用平台搜索入口和用户填写竞品价格进行价格证据分析。",
  apiReal: "价格结果来自后端 API adapter 的真实返回，前端未暴露任何平台 Key。",
};

export const alibabaPriceRiskMessages = {
  noApi: "当前未配置 1688 / 淘宝开放平台接口权限，不能自动获取真实平台价格。",
  noManualPrice: "用户未填写竞品价格区间，价格证据完整度较低。",
  aboveMarket: "建议售价明显高于用户填写的竞品价格区间，需要验证差异化卖点和转化承受力。",
  belowMarket: "建议售价低于用户填写的竞品价格区间，需要确认是否有足够利润空间和供应稳定性。",
  withinMarket: "建议售价处于用户填写的竞品价格区间内，但仍需人工核验平台同款价格和规格差异。",
  searchCheck: "建议打开 1688 / 淘宝搜索入口，人工核验同款价格、规格、起订量、运费和供应商可靠性。",
};
