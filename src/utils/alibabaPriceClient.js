import { alibabaPriceNotices } from "../constants/alibabaPriceConfig";
import { buildAlibabaSearchLinks, evaluatePriceEvidence } from "./priceEvidenceUtils";

function buildRequestPayload(product = {}) {
  return {
    name: product.name || "",
    keywords: product.keywords || "",
    category: product.category || "",
    price: product.price || "",
    cost: product.cost || "",
    competitorPrice: product.competitorPrice || "",
    marketReference: product.marketReference || "",
  };
}

function buildUnavailableResponse(product, sourceNotice = alibabaPriceNotices.apiUnavailable) {
  return {
    ok: true,
    query: "",
    sourceType: "api_unavailable",
    fallback: true,
    wholesaleResults: [],
    retailResults: [],
    searchLinks: buildAlibabaSearchLinks(product),
    sourceNotice,
  };
}

export async function fetchAlibabaPriceEvidence(product = {}) {
  try {
    const response = await fetch("/api/alibaba-price-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestPayload(product)),
    });

    if (!response.ok) {
      throw new Error(`price_api_${response.status}`);
    }

    const data = await response.json();
    return evaluatePriceEvidence(product, data);
  } catch (error) {
    return evaluatePriceEvidence(
      product,
      buildUnavailableResponse(product, alibabaPriceNotices.apiFailed)
    );
  }
}
