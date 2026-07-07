import {
  buildLocalContentPattern,
  buildLocalOriginalCopy,
  normalizeContentPattern,
  normalizeOriginalCopy,
  sanitizeReferenceItems,
} from "./contentPatternUtils";
import {
  buildLocalXiaohongshuCopywritingPackage,
  mergeXiaohongshuCopywritingPackage,
} from "./contentPatternCopywriting";

const CONTENT_PATTERN_ENDPOINT = "/api/content-pattern";
const CONTENT_PATTERN_TIMEOUT_MS = 45000;

async function postContentPattern(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTENT_PATTERN_TIMEOUT_MS);
  try {
    const response = await fetch(CONTENT_PATTERN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`content_pattern_http_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function extractContentPattern({ references, name, targetScene } = {}) {
  const safeReferences = sanitizeReferenceItems(references);
  const fallback = buildLocalContentPattern({ references: safeReferences, name, targetScene });

  try {
    const data = await postContentPattern({ action: "extract", references: safeReferences, name, targetScene });
    const mode = data.mode === "ai" || data.source === "ai" ? "ai" : "local_fallback";
    return {
      ok: true,
      pattern: normalizeContentPattern(data.pattern, {
        id: fallback.id,
        name: name || fallback.name,
        targetScene: targetScene || fallback.targetScene,
        sourceCount: safeReferences.length,
      }),
      mode,
      source: mode === "ai" ? "ai" : "fallback",
      message: data.message || "内容结构已提取。",
    };
  } catch (error) {
    return {
      ok: true,
      pattern: fallback,
      mode: "local_fallback",
      source: "fallback",
      message: "AI 接口暂不可用，已使用本地规则提取可编辑结构。",
    };
  }
}

export async function generateOriginalContent({ pattern, brief } = {}) {
  const fallback = buildLocalOriginalCopy({ pattern, brief });
  try {
    const data = await postContentPattern({ action: "generate", pattern: normalizeContentPattern(pattern), brief });
    const mode = data.mode === "ai" || data.source === "ai" ? "ai" : "local_fallback";
    return {
      ok: true,
      copy: normalizeOriginalCopy({ ...data.copy, source: data.source }, brief),
      mode,
      source: mode === "ai" ? "ai" : "fallback",
      message: data.message || "原创文案已生成。",
    };
  } catch (error) {
    return {
      ok: true,
      copy: fallback,
      mode: "local_fallback",
      source: "fallback",
      message: "AI 接口暂不可用，已按结构生成本地原创草稿。",
    };
  }
}

export async function generateXiaohongshuCopywriting({ pattern, brief } = {}) {
  const fallback = buildLocalXiaohongshuCopywritingPackage({ pattern, brief });
  try {
    const data = await postContentPattern({ action: "generate_xiaohongshu", pattern, brief });
    const mode = data.mode === "ai" || data.source === "ai" ? "ai" : "local_fallback";
    return {
      ok: true,
      copywritingPackage: mergeXiaohongshuCopywritingPackage(data.copywritingPackage, fallback, brief),
      mode,
      source: mode === "ai" ? "ai" : "fallback",
      message: data.message || "小红书图文文案已生成。",
    };
  } catch (error) {
    return {
      ok: true,
      copywritingPackage: fallback,
      mode: "local_fallback",
      source: "fallback",
      message: "AI 接口暂不可用，已生成本地原创小红书图文文案。",
    };
  }
}
