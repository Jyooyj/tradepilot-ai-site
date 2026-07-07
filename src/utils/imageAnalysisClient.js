// 图片视觉识别前端客户端。
// 单一职责：向 /api/analyze-image 发起真实请求，解析响应并归一化为
// { kind: "success" | "degraded", ... }，并输出非敏感调试信息。
//
// 不输出 API Key、不输出 base64 图片完整内容、不输出用户隐私信息。

export const ANALYZE_IMAGE_ENDPOINT_DEFAULT = "/api/analyze-image";

// 根据后端返回结构判断：成功识别（vision_llm）还是降级。
// 兼容三种形态：
//   1. 新契约成功：{ ok:true, source:"vision_llm", product, ... }
//   2. 新契约降级：{ ok:false, error:"vision_config_missing" | "vision_request_failed" | ... }
//   3. 旧后端兜底：{ fallback:true, ... } 或裸 { product } 成功结构
export function classifyAnalyzeResult(data) {
  if (!data || typeof data !== "object") {
    return {
      kind: "degraded",
      source: "fallback",
      errorCode: "invalid_response",
      hasVisionConfig: null,
      message: "接口返回不是有效 JSON。",
      product: {},
    };
  }

  const hasVisionConfig =
    data.hasVisionConfig === undefined ? null : Boolean(data.hasVisionConfig);

  if (data.ok === false || data.fallback === true) {
    return {
      kind: "degraded",
      source: "fallback",
      errorCode: data.error || (data.fallback ? "fallback" : "unknown_error"),
      hasVisionConfig,
      message:
        data.message || data.fallbackMessage || data.detail || data.reason || "",
      product: {},
    };
  }

  return {
    kind: "success",
    source: data.source || "vision_llm",
    errorCode: "",
    hasVisionConfig: hasVisionConfig === null ? true : hasVisionConfig,
    message: "",
    product: data.product || {},
  };
}

// 真正请求 /api/analyze-image。fetchImpl / logger 可注入，便于测试。
export async function requestImageAnalysis({
  image,
  hint = "",
  endpoint = ANALYZE_IMAGE_ENDPOINT_DEFAULT,
  fetchImpl,
  signal,
  logger = console,
} = {}) {
  const doFetch =
    fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!doFetch) {
    throw new Error("fetch is not available in this environment");
  }

  logger?.info?.("[vision] calling /api/analyze-image");

  const response = await doFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ image, hint }),
  });

  const rawText = await response.text();

  let data = null;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    data = null;
  }

  const classified = classifyAnalyzeResult(data);

  logger?.info?.(
    "[vision] result source:",
    classified.kind === "success" ? classified.source : "fallback"
  );
  logger?.info?.("[vision] errorCode:", classified.errorCode || "none");
  logger?.info?.("[vision] hasVisionConfig:", classified.hasVisionConfig);

  return {
    ...classified,
    httpOk: response.ok,
    status: response.status,
    raw: data,
    rawText,
  };
}
