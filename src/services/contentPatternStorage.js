import { normalizeContentPattern } from "../utils/contentPatternUtils";

export const CONTENT_PATTERN_STORAGE_KEY = "tradepilot_content_patterns_v1";
export const CONTENT_PATTERN_LIMIT = 50;

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function safePatternForStorage(pattern) {
  const normalized = normalizeContentPattern(pattern);
  return {
    id: normalized.id,
    name: normalized.name,
    targetScene: normalized.targetScene,
    sourceCount: normalized.sourceCount,
    headlineFormula: normalized.headlineFormula,
    openingHook: normalized.openingHook,
    narrativeFlow: normalized.narrativeFlow,
    persuasionElements: normalized.persuasionElements,
    styleTags: normalized.styleTags,
    originalityRules: normalized.originalityRules,
    complianceNotes: normalized.complianceNotes,
    source: normalized.source,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  };
}

export function loadContentPatterns() {
  if (!canUseLocalStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTENT_PATTERN_STORAGE_KEY) || "[]");
    return (Array.isArray(parsed) ? parsed : [])
      .map((pattern) => safePatternForStorage(pattern))
      .slice(0, CONTENT_PATTERN_LIMIT);
  } catch (error) {
    return [];
  }
}

export function saveContentPattern(pattern) {
  if (!canUseLocalStorage()) {
    return { ok: false, patterns: [], message: "当前浏览器无法使用本地存储，结构仅保留在本次页面中。" };
  }

  try {
    const safePattern = safePatternForStorage(pattern);
    const existing = loadContentPatterns().filter((item) => item.id !== safePattern.id);
    const patterns = [safePattern, ...existing].slice(0, CONTENT_PATTERN_LIMIT);
    window.localStorage.setItem(CONTENT_PATTERN_STORAGE_KEY, JSON.stringify(patterns));
    return { ok: true, patterns, pattern: safePattern, message: "结构已保存到当前浏览器。原始参考标题和正文未保存。" };
  } catch (error) {
    return { ok: false, patterns: loadContentPatterns(), message: "结构保存失败，请检查浏览器存储空间。" };
  }
}

export function deleteContentPattern(id) {
  const patterns = loadContentPatterns().filter((pattern) => pattern.id !== id);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(CONTENT_PATTERN_STORAGE_KEY, JSON.stringify(patterns));
  }
  return patterns;
}

export function clearContentPatterns() {
  if (canUseLocalStorage()) window.localStorage.removeItem(CONTENT_PATTERN_STORAGE_KEY);
  return [];
}

export { safePatternForStorage };
