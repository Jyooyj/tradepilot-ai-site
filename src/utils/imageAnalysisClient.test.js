import { describe, it, expect, vi } from "vitest";
import {
  classifyAnalyzeResult,
  requestImageAnalysis,
  ANALYZE_IMAGE_ENDPOINT_DEFAULT,
} from "./imageAnalysisClient.js";

function makeResponse({ ok = true, status = 200, body = {} }) {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

const silentLogger = { info: () => {} };

describe("classifyAnalyzeResult", () => {
  it("识别成功（vision_llm）", () => {
    const r = classifyAnalyzeResult({
      ok: true,
      source: "vision_llm",
      hasVisionConfig: true,
      product: { name: "珍珠项链" },
    });
    expect(r.kind).toBe("success");
    expect(r.source).toBe("vision_llm");
    expect(r.product.name).toBe("珍珠项链");
  });

  it("ok:false 视为降级并带 errorCode", () => {
    const r = classifyAnalyzeResult({
      ok: false,
      error: "vision_config_missing",
      hasVisionConfig: false,
    });
    expect(r.kind).toBe("degraded");
    expect(r.errorCode).toBe("vision_config_missing");
    expect(r.hasVisionConfig).toBe(false);
  });

  it("兼容旧后端 fallback:true", () => {
    const r = classifyAnalyzeResult({ fallback: true, fallbackMessage: "兜底" });
    expect(r.kind).toBe("degraded");
    expect(r.message).toBe("兜底");
  });

  it("非对象响应视为降级", () => {
    expect(classifyAnalyzeResult(null).kind).toBe("degraded");
  });
});

describe("requestImageAnalysis", () => {
  it("会向 /api/analyze-image 发起 POST JSON 请求", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(makeResponse({ body: { ok: true, source: "vision_llm", product: { name: "x" } } }))
    );
    await requestImageAnalysis({ image: "data:...", hint: "h", fetchImpl, logger: silentLogger });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe(ANALYZE_IMAGE_ENDPOINT_DEFAULT);
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(opts.body)).toMatchObject({ image: "data:...", hint: "h" });
  });

  it("source=vision_llm 时返回 success 并带 product", async () => {
    const fetchImpl = () =>
      Promise.resolve(
        makeResponse({ body: { ok: true, source: "vision_llm", hasVisionConfig: true, product: { name: "珍珠项链" } } })
      );
    const r = await requestImageAnalysis({ image: "x", fetchImpl, logger: silentLogger });
    expect(r.kind).toBe("success");
    expect(r.source).toBe("vision_llm");
    expect(r.product.name).toBe("珍珠项链");
  });

  it("vision_config_missing 时返回 degraded（不抛错）", async () => {
    const fetchImpl = () =>
      Promise.resolve(makeResponse({ body: { ok: false, error: "vision_config_missing", hasVisionConfig: false } }));
    const r = await requestImageAnalysis({ image: "x", fetchImpl, logger: silentLogger });
    expect(r.kind).toBe("degraded");
    expect(r.errorCode).toBe("vision_config_missing");
  });

  it("vision_request_failed 时返回 degraded（不抛错）", async () => {
    const fetchImpl = () =>
      Promise.resolve(makeResponse({ body: { ok: false, error: "vision_request_failed", hasVisionConfig: true } }));
    const r = await requestImageAnalysis({ image: "x", fetchImpl, logger: silentLogger });
    expect(r.kind).toBe("degraded");
    expect(r.errorCode).toBe("vision_request_failed");
  });

  it("输出 [vision] 调试信息，且不包含图片 base64 与 Key", async () => {
    const logs = [];
    const logger = { info: (...args) => logs.push(args.join(" ")) };
    const fetchImpl = () =>
      Promise.resolve(makeResponse({ body: { ok: true, source: "vision_llm", product: { name: "x" } } }));
    await requestImageAnalysis({ image: "data:image/png;base64,SECRETIMAGE", fetchImpl, logger });
    const joined = logs.join("\n");
    expect(joined).toContain("[vision] calling /api/analyze-image");
    expect(joined).toContain("[vision] result source:");
    expect(joined).toContain("vision_llm");
    expect(joined).not.toContain("SECRETIMAGE");
  });
});
