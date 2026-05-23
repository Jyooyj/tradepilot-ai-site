const ENV_KEYS = {
  alibabaAppKey: "ALIBABA_APP_KEY",
  alibabaAppSecret: "ALIBABA_APP_SECRET",
  alibabaAccessToken: "ALIBABA_ACCESS_TOKEN",
  alibabaEndpoint: "ALIBABA_PRICE_SEARCH_ENDPOINT",
  taobaoAppKey: "TAOBAO_APP_KEY",
  taobaoAppSecret: "TAOBAO_APP_SECRET",
  taobaoAccessToken: "TAOBAO_ACCESS_TOKEN",
  taobaoEndpoint: "TAOBAO_PRICE_SEARCH_ENDPOINT",
};

const API_UNAVAILABLE_NOTICE = "1688 / 淘宝价格 API 未配置，当前使用平台搜索入口和用户填写竞品价格进行价格证据分析。";
const API_FAILED_NOTICE = "1688 / 淘宝价格 API 调用失败，当前使用平台搜索入口和用户填写竞品价格进行价格证据分析。";

function readEnv() {
  return Object.fromEntries(
    Object.entries(ENV_KEYS).map(([key, envKey]) => [key, process.env[envKey] || ""])
  );
}

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

function normalizeText(value) {
  return String(value || "").trim();
}

function buildQuery(body = {}) {
  const terms = [
    body.name,
    body.keywords,
    body.category,
  ].map(normalizeText).filter(Boolean);

  return [...new Set(terms)].join(" ") || "小商品 批发";
}

function buildSearchLinks(query) {
  const encodedQuery = encodeURIComponent(query);
  return [
    {
      platform: "1688",
      label: "1688 搜索参考",
      url: `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodedQuery}`,
      purpose: "人工查看批发价、起订量、规格和供应商信息。",
      sourceType: "search_reference",
    },
    {
      platform: "taobao",
      label: "淘宝搜索参考",
      url: `https://s.taobao.com/search?q=${encodedQuery}`,
      purpose: "人工查看零售价、竞品标题、主图和价格带。",
      sourceType: "search_reference",
    },
  ];
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getItemsFromApiPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.result?.items)) return payload.result.items;
  return [];
}

function normalizeResult(platform, item) {
  const price = toNumber(item.price ?? item.salePrice ?? item.offerPrice ?? item.priceInfo?.price);
  const priceMin = toNumber(item.priceMin ?? item.minPrice ?? item.priceInfo?.min);
  const priceMax = toNumber(item.priceMax ?? item.maxPrice ?? item.priceInfo?.max);

  return {
    platform,
    sourceType: "api_real",
    title: normalizeText(item.title || item.subject || item.name),
    price,
    priceMin,
    priceMax,
    moq: toNumber(item.moq ?? item.minOrderQuantity ?? item.quantityBegin),
    salesHint: normalizeText(item.salesHint || item.sales || item.sold || item.tradeCount),
    shopName: normalizeText(item.shopName || item.sellerName || item.companyName),
    url: normalizeText(item.url || item.detailUrl || item.itemUrl),
    raw: item,
  };
}

async function callPlatformAdapter({ platform, endpoint, accessToken, appKey, appSecret, query, body }) {
  if (!endpoint || !accessToken) return [];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-App-Key": appKey || "",
    },
    body: JSON.stringify({
      query,
      name: body.name || "",
      keywords: body.keywords || "",
      category: body.category || "",
      price: body.price || "",
      cost: body.cost || "",
      competitorPrice: body.competitorPrice || "",
      marketReference: body.marketReference || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`${platform}_api_${response.status}`);
  }

  const payload = await response.json();
  void appSecret;
  return getItemsFromApiPayload(payload).map((item) => normalizeResult(platform, item));
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const env = readEnv();
  const body = getBody(req);
  const query = buildQuery(body);
  const searchLinks = buildSearchLinks(query);
  const hasAlibabaApi = Boolean(env.alibabaEndpoint && env.alibabaAccessToken);
  const hasTaobaoApi = Boolean(env.taobaoEndpoint && env.taobaoAccessToken);

  if (!hasAlibabaApi && !hasTaobaoApi) {
    sendJson(res, 200, {
      ok: true,
      query,
      sourceType: "api_unavailable",
      fallback: true,
      wholesaleResults: [],
      retailResults: [],
      searchLinks,
      sourceNotice: API_UNAVAILABLE_NOTICE,
    });
    return;
  }

  try {
    const [wholesaleResults, retailResults] = await Promise.all([
      hasAlibabaApi
        ? callPlatformAdapter({
          platform: "1688",
          endpoint: env.alibabaEndpoint,
          accessToken: env.alibabaAccessToken,
          appKey: env.alibabaAppKey,
          appSecret: env.alibabaAppSecret,
          query,
          body,
        })
        : Promise.resolve([]),
      hasTaobaoApi
        ? callPlatformAdapter({
          platform: "taobao",
          endpoint: env.taobaoEndpoint,
          accessToken: env.taobaoAccessToken,
          appKey: env.taobaoAppKey,
          appSecret: env.taobaoAppSecret,
          query,
          body,
        })
        : Promise.resolve([]),
    ]);

    sendJson(res, 200, {
      ok: true,
      query,
      sourceType: "api_real",
      fallback: false,
      wholesaleResults,
      retailResults,
      searchLinks,
      sourceNotice: "1688 / 淘宝价格结果来自后端 API adapter，前端未暴露任何平台 Key。",
    });
  } catch (error) {
    sendJson(res, 200, {
      ok: true,
      query,
      sourceType: "api_unavailable",
      fallback: true,
      wholesaleResults: [],
      retailResults: [],
      searchLinks,
      sourceNotice: API_FAILED_NOTICE,
    });
  }
}
