import {
  flattenCopywritingPackageText,
  normalizeXiaohongshuCopywritingPackage,
} from "../utils/contentPatternCopywriting.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const CONTENT_RAW_STAGING_KEY = "tradepilot_content_raw_staging_v1";
export const CONTENT_PATTERN_DATASET_KEY = "tradepilot_content_pattern_dataset_v1";
export const CONTENT_PATTERN_DATABASE_META_KEY = "tradepilot_content_pattern_database_meta_v1";
export const CONTENT_RAW_STAGING_LIMIT = 2000;
export const CONTENT_PATTERN_DATASET_LIMIT = 5000;
export const CONTENT_RAW_RETENTION_DAYS = 7;
export const CONTENT_PATTERN_SEED_URL = "/datasets/content_pattern_seed.json";

export const STAGING_STATUSES = ["pending", "extracted", "duplicate", "rejected_raw_leak", "saved", "failed"];

export const CONTENT_PATTERN_DATASET_FIELDS = [
  "pattern_id", "platform", "category_key", "hook_type", "title_structure", "opening_structure",
  "reusable_template", "suitable_audience", "selling_points", "content_angle", "suitable_channel",
  "avoid_claims", "example_generated_title", "source_type", "raw_text_stored", "human_reviewed",
  "structure_fingerprint", "source_batch_id", "created_at", "updated_at",
  "copywriting_package", "copywriting_generated", "copywriting_source", "copywriting_generated_at",
];

const RAW_STAGING_FIELDS = [
  "platform", "source_type", "keyword", "category_key", "title_raw", "opening_raw", "content_type",
  "product_name", "manual_note", "collected_at",
];
const LEAKAGE_FIELDS = ["reusable_template", "opening_structure", "example_generated_title", "openingHook", "title_structure"];

export const CONTENT_PATTERN_HOOK_LABELS = {
  question: "提问型",
  pain_point: "痛点型",
  low_price: "低价种草型",
  scene: "场景种草型",
  identity: "身份认同型",
  comparison: "对比反差型",
  avoid_pitfall: "避坑提醒型",
  gift: "礼物推荐型",
  result: "结果利益型",
  number_list: "清单步骤型",
  general: "通用种草型",
};

export function getContentPatternHookLabel(value) {
  return CONTENT_PATTERN_HOOK_LABELS[value] || CONTENT_PATTERN_HOOK_LABELS.general;
}

export function getContentPatternPlatformLabel(value) {
  return /xiaohongshu|小红书/i.test(String(value || "")) ? "小红书风格" : "历史兼容来源";
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function cleanText(value, limit = 2000) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, limit);
}

function cleanList(value, limit = 12) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(/[\n|；;]/);
  return [...new Set(source.map((item) => cleanText(item, 240)).filter(Boolean))].slice(0, limit);
}

function normalizeXiaohongshuMeaning(value, limit = 2000) {
  return cleanText(value, limit)
    .replace(/抖音风格|douyin|tiktok/gi, "小红书风格")
    .replace(/短视频|short_video/gi, "图文笔记")
    .replace(/前三秒钩子/g, "正文开头钩子")
    .replace(/镜头脚本|shot_script/gi, "配图建议")
    .replace(/视频脚本|video_script/gi, "图文正文结构")
    .replace(/口播脚本|oral_script/gi, "图文正文")
    .replace(/视频内容/g, "图文内容");
}

function normalizeXiaohongshuList(value, limit = 12) {
  return cleanList(value, limit).map((item) => normalizeXiaohongshuMeaning(item, 240));
}

function safeIso(value, fallback = "") {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readArray(key) {
  if (!canUseLocalStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeArray(key, value) {
  if (!canUseLocalStorage()) return false;
  window.localStorage.setItem(key, JSON.stringify(value));
  return true;
}

function loadMeta() {
  if (!canUseLocalStorage()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTENT_PATTERN_DATABASE_META_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function updateMeta(changes) {
  const next = { ...loadMeta(), ...changes };
  if (canUseLocalStorage()) window.localStorage.setItem(CONTENT_PATTERN_DATABASE_META_KEY, JSON.stringify(next));
  return next;
}

function incrementDuplicateCount() {
  const meta = loadMeta();
  updateMeta({ duplicate_count: Math.max(0, Number(meta.duplicate_count) || 0) + 1 });
}

export function createContentPatternBatchId() {
  return createId("content-batch");
}

export function sanitizeRawStagingItem(value = {}, defaults = {}) {
  const source = value && typeof value === "object" ? value : {};
  const now = new Date().toISOString();
  const safe = {};
  for (const field of RAW_STAGING_FIELDS) safe[field] = cleanText(source[field], field === "manual_note" ? 1000 : 5000);
  return {
    raw_id: cleanText(source.raw_id || defaults.raw_id, 120) || createId("raw"),
    batch_id: cleanText(source.batch_id || defaults.batch_id, 120) || createContentPatternBatchId(),
    ...safe,
    extraction_status: STAGING_STATUSES.includes(source.extraction_status) ? source.extraction_status : "pending",
    delete_after: safeIso(source.delete_after || defaults.delete_after, new Date(Date.now() + CONTENT_RAW_RETENTION_DAYS * DAY_MS).toISOString()),
    created_at: safeIso(source.created_at || defaults.created_at, now),
  };
}

export function loadContentRawStaging() {
  const stored = readArray(CONTENT_RAW_STAGING_KEY);
  const now = Date.now();
  const staging = stored
    .map((item) => sanitizeRawStagingItem(item, item))
    .filter((item) => new Date(item.delete_after).getTime() > now)
    .slice(0, CONTENT_RAW_STAGING_LIMIT);
  if (staging.length !== stored.length) writeArray(CONTENT_RAW_STAGING_KEY, staging);
  return staging;
}

export function importContentRawStaging(items = [], options = {}) {
  const batchId = cleanText(options.batchId, 120) || createContentPatternBatchId();
  const now = new Date().toISOString();
  const deleteAfter = new Date(Date.now() + Math.max(1, Number(options.retentionDays) || CONTENT_RAW_RETENTION_DAYS) * DAY_MS).toISOString();
  const incoming = (Array.isArray(items) ? items : [])
    .map((item) => sanitizeRawStagingItem(item, { batch_id: batchId, delete_after: deleteAfter, created_at: now }))
    .filter((item) => item.title_raw || item.opening_raw)
    .slice(0, CONTENT_RAW_STAGING_LIMIT);
  const existing = loadContentRawStaging();
  const accepted = incoming.slice(0, Math.max(0, CONTENT_RAW_STAGING_LIMIT - existing.length));
  const staging = [...accepted, ...existing].slice(0, CONTENT_RAW_STAGING_LIMIT);
  writeArray(CONTENT_RAW_STAGING_KEY, staging);
  if (accepted.length) updateMeta({ last_import_at: now });
  return { ok: true, batch_id: batchId, imported: accepted.length, rejected: incoming.length - accepted.length, staging };
}

export function updateContentRawStagingStatus(rawId, extractionStatus) {
  const status = STAGING_STATUSES.includes(extractionStatus) ? extractionStatus : "failed";
  const staging = loadContentRawStaging().map((item) => item.raw_id === rawId ? { ...item, extraction_status: status } : item);
  writeArray(CONTENT_RAW_STAGING_KEY, staging);
  return staging;
}

export function clearContentRawStagingBatch(batchId) {
  const staging = loadContentRawStaging().filter((item) => item.batch_id !== batchId);
  writeArray(CONTENT_RAW_STAGING_KEY, staging);
  return staging;
}

export function clearAllContentRawStaging() {
  if (canUseLocalStorage()) window.localStorage.removeItem(CONTENT_RAW_STAGING_KEY);
  return [];
}

export function cleanupExpiredContentRawStaging(now = new Date()) {
  const current = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const before = readArray(CONTENT_RAW_STAGING_KEY).map((item) => sanitizeRawStagingItem(item, item));
  const staging = before.filter((item) => new Date(item.delete_after).getTime() > current);
  writeArray(CONTENT_RAW_STAGING_KEY, staging);
  return { removed: before.length - staging.length, staging };
}

function normalizeFingerprintPart(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return text.normalize("NFKC").toLowerCase()
    .replace(/[，。！？、；：、“”‘’（）【】《》,.!?;:'"()[\]{}<>]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function generateStructureFingerprint(pattern = {}) {
  const canonical = [pattern.platform, pattern.category_key, pattern.hook_type, pattern.title_structure, pattern.opening_structure, pattern.reusable_template]
    .map(normalizeFingerprintPart).join("||");
  return `cpf1-${stableHash(canonical)}`;
}

export function sanitizePatternForStorage(value = {}, defaults = {}) {
  const source = value && typeof value === "object" ? value : {};
  const now = new Date().toISOString();
  const sanitized = {
    pattern_id: cleanText(source.pattern_id || source.id || defaults.pattern_id, 120) || createId("pattern"),
    platform: "xiaohongshu",
    category_key: cleanText(source.category_key, 100),
    hook_type: cleanText(source.hook_type, 100) || "general",
    title_structure: normalizeXiaohongshuMeaning(source.title_structure || source.headlineFormula, 500),
    opening_structure: normalizeXiaohongshuMeaning(source.opening_structure || source.openingHook, 800),
    reusable_template: normalizeXiaohongshuMeaning(source.reusable_template, 1200),
    suitable_audience: normalizeXiaohongshuMeaning(source.suitable_audience, 500),
    selling_points: normalizeXiaohongshuList(source.selling_points || source.persuasionElements),
    content_angle: normalizeXiaohongshuList(source.content_angle || source.narrativeFlow),
    suitable_channel: "小红书图文笔记",
    avoid_claims: normalizeXiaohongshuList(source.avoid_claims || source.complianceNotes),
    example_generated_title: normalizeXiaohongshuMeaning(source.example_generated_title, 500),
    source_type: cleanText(source.source_type || source.source, 80) || "manual",
    raw_text_stored: false,
    human_reviewed: source.human_reviewed === true,
    structure_fingerprint: "",
    source_batch_id: cleanText(source.source_batch_id, 120),
    created_at: safeIso(source.created_at || defaults.created_at, now),
    updated_at: safeIso(source.updated_at || defaults.updated_at, now),
    copywriting_package: normalizeXiaohongshuCopywritingPackage(source.copywriting_package),
    copywriting_generated: source.copywriting_generated === true,
    copywriting_source: ["ai", "fallback", "manual", "seed"].includes(source.copywriting_source) ? source.copywriting_source : "",
    copywriting_generated_at: safeIso(source.copywriting_generated_at, ""),
  };
  sanitized.structure_fingerprint = generateStructureFingerprint(sanitized);
  return sanitized;
}

function normalizedLeakText(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function chineseOnly(value) {
  return String(value ?? "").match(/[\p{Script=Han}]/gu)?.join("") || "";
}

function findSharedWindow(source, target, size) {
  if (source.length < size || target.length < size) return "";
  const shorter = source.length <= target.length ? source : target;
  const longer = source.length <= target.length ? target : source;
  for (let index = 0; index <= shorter.length - size; index += 1) {
    const fragment = shorter.slice(index, index + size);
    if (longer.includes(fragment)) return fragment;
  }
  return "";
}

export function checkRawTextLeakage(pattern = {}, rawInput = {}) {
  const rawValues = [rawInput.title_raw, rawInput.opening_raw, rawInput.body, rawInput.originalText, rawInput.rawTitle, rawInput.rawOpening]
    .map((item) => cleanText(item, 10000)).filter(Boolean);
  const matches = [];
  const candidates = [
    ...LEAKAGE_FIELDS.map((field) => ({ field, value: pattern[field] })),
    ...flattenCopywritingPackageText(pattern.copywriting_package).map((value) => ({ field: "copywriting_package", value })),
  ];
  for (const candidateItem of candidates) {
    const candidate = cleanText(candidateItem.value, 6000);
    if (!candidate) continue;
    for (const rawValue of rawValues) {
      const chineseMatch = findSharedWindow(chineseOnly(rawValue), chineseOnly(candidate), 8);
      const generalMatch = chineseMatch ? "" : findSharedWindow(normalizedLeakText(rawValue), normalizedLeakText(candidate), 16);
      const fragment = chineseMatch || generalMatch;
      if (fragment) matches.push({ field: candidateItem.field, fragment });
    }
  }
  return { risk: matches.length > 0, blocked: matches.length > 0, matches, message: matches.length ? "检测到结构字段包含原文长片段，已禁止保存。" : "未检测到原文长片段泄漏。" };
}

export function loadContentPatternDataset() {
  const stored = readArray(CONTENT_PATTERN_DATASET_KEY).slice(0, CONTENT_PATTERN_DATASET_LIMIT);
  const dataset = stored.map((item) => sanitizePatternForStorage(item, item));
  if (canUseLocalStorage() && JSON.stringify(dataset) !== JSON.stringify(stored)) writeArray(CONTENT_PATTERN_DATASET_KEY, dataset);
  return dataset;
}

export function saveContentPatternDataset(pattern, rawInput = {}) {
  const safePattern = sanitizePatternForStorage(pattern);
  const leakage = checkRawTextLeakage(safePattern, rawInput);
  if (leakage.blocked) return { ok: false, status: "rejected_raw_leak", pattern: safePattern, leakage, dataset: loadContentPatternDataset(), message: leakage.message };
  const dataset = loadContentPatternDataset();
  const duplicate = dataset.find((item) => item.structure_fingerprint === safePattern.structure_fingerprint);
  if (duplicate) {
    incrementDuplicateCount();
    return { ok: false, status: "duplicate", duplicate, pattern: safePattern, dataset, message: "该结构可能已存在。" };
  }
  if (dataset.length >= CONTENT_PATTERN_DATASET_LIMIT) return { ok: false, status: "failed", pattern: safePattern, dataset, message: "正式结构库已达到本地容量上限。" };
  const next = [safePattern, ...dataset];
  if (!writeArray(CONTENT_PATTERN_DATASET_KEY, next)) return { ok: false, status: "failed", pattern: safePattern, dataset, message: "当前环境无法使用 localStorage。" };
  updateMeta({ last_saved_at: safePattern.updated_at });
  return { ok: true, status: "saved", pattern: safePattern, dataset: next, message: "结构已保存到 content_pattern_dataset；原文未写入正式库。" };
}

export function updateContentPatternDataset(patternId, changes = {}, rawInput = {}) {
  const dataset = loadContentPatternDataset();
  const current = dataset.find((item) => item.pattern_id === patternId);
  if (!current) return { ok: false, status: "failed", dataset, message: "未找到需要更新的结构。" };
  const safePattern = sanitizePatternForStorage({
    ...current,
    ...changes,
    pattern_id: current.pattern_id,
    created_at: current.created_at,
    updated_at: new Date().toISOString(),
  });
  const leakage = checkRawTextLeakage(safePattern, rawInput);
  if (leakage.blocked) return { ok: false, status: "rejected_raw_leak", dataset, leakage, message: leakage.message };
  const duplicate = dataset.find((item) => item.pattern_id !== patternId && item.structure_fingerprint === safePattern.structure_fingerprint);
  if (duplicate) {
    incrementDuplicateCount();
    return { ok: false, status: "duplicate", dataset, duplicate, message: "该结构可能已存在。" };
  }
  const next = dataset.map((item) => item.pattern_id === patternId ? safePattern : item);
  writeArray(CONTENT_PATTERN_DATASET_KEY, next);
  updateMeta({ last_saved_at: safePattern.updated_at });
  return { ok: true, status: "saved", pattern: safePattern, dataset: next, message: "结构已更新。" };
}

export function markContentPatternReviewed(patternId, reviewed = true) {
  return updateContentPatternDataset(patternId, { human_reviewed: reviewed === true });
}

export function saveContentPatternCopywriting(patternId, copywritingPackage, source = "fallback", rawInput = {}) {
  return updateContentPatternDataset(patternId, {
    copywriting_package: normalizeXiaohongshuCopywritingPackage(copywritingPackage),
    copywriting_generated: true,
    copywriting_source: source === "ai" ? "ai" : "fallback",
    copywriting_generated_at: new Date().toISOString(),
  }, rawInput);
}

export function deleteContentPatternDatasetItem(patternId) {
  const dataset = loadContentPatternDataset().filter((item) => item.pattern_id !== patternId);
  writeArray(CONTENT_PATTERN_DATASET_KEY, dataset);
  return dataset;
}

function inferHookType(staging = {}, extracted = {}) {
  const source = `${staging.title_raw || ""} ${extracted.headlineFormula || ""}`;
  if (/[?？]|为什么|怎么|如何/.test(source)) return "question";
  if (/避坑|别踩|不要买错/.test(source)) return "avoid_pitfall";
  if (/低价|预算|平价|省钱/.test(source)) return "low_price";
  if (/痛点|困扰|夹痛|不方便/.test(source)) return "pain_point";
  if (/礼物|送人|生日/.test(source)) return "gift";
  if (/学生党|通勤党|打工人|新手|身份/.test(source)) return "identity";
  if (/场景|宿舍|通勤|上课|约会/.test(source)) return "scene";
  if (/对比|区别|vs/i.test(source)) return "comparison";
  if (/结果|省事|更方便|解决/.test(source)) return "result";
  if (/\d|清单|步骤|个/.test(source)) return "number_list";
  return "general";
}

export function buildDatasetPatternFromExtracted(extracted = {}, staging = {}) {
  const titleStructure = cleanText(extracted.headlineFormula, 500);
  const openingStructure = cleanText(extracted.openingHook, 800);
  return sanitizePatternForStorage({
    platform: "xiaohongshu",
    category_key: staging.category_key,
    hook_type: inferHookType(staging, extracted),
    title_structure: titleStructure,
    opening_structure: openingStructure,
    reusable_template: titleStructure && openingStructure ? `标题：${titleStructure}\n开头：${openingStructure}` : titleStructure || openingStructure,
    suitable_audience: "",
    selling_points: extracted.persuasionElements,
    content_angle: extracted.narrativeFlow,
    suitable_channel: "小红书图文笔记",
    avoid_claims: extracted.complianceNotes,
    example_generated_title: "",
    source_type: staging.source_type || extracted.source,
    source_batch_id: staging.batch_id,
    human_reviewed: false,
  });
}

function csvCell(value) {
  const text = value && typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportDate(now = new Date()) {
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

export function exportContentPatternDatasetJson(dataset = loadContentPatternDataset(), now = new Date()) {
  const safe = dataset.map((item) => sanitizePatternForStorage(item, item));
  return { fileName: `tradepilot_content_pattern_dataset_${exportDate(now)}.json`, mimeType: "application/json;charset=utf-8", content: JSON.stringify(safe, null, 2) };
}

export function exportContentPatternDatasetCsv(dataset = loadContentPatternDataset(), now = new Date()) {
  const safe = dataset.map((item) => sanitizePatternForStorage(item, item));
  const rows = safe.map((item) => CONTENT_PATTERN_DATASET_FIELDS.map((field) => csvCell(item[field])).join(","));
  return { fileName: `tradepilot_content_pattern_dataset_${exportDate(now)}.csv`, mimeType: "text/csv;charset=utf-8", content: `\ufeff${CONTENT_PATTERN_DATASET_FIELDS.map(csvCell).join(",")}\n${rows.join("\n")}` };
}

export function exportContentPatternSeedJson(dataset = loadContentPatternDataset(), now = new Date()) {
  const safe = dataset.map((item) => sanitizePatternForStorage(item, item));
  return {
    fileName: `tradepilot_content_pattern_seed_${exportDate(now)}.json`,
    mimeType: "application/json;charset=utf-8",
    content: JSON.stringify({ version: 1, platform: "xiaohongshu", patterns: safe }, null, 2),
  };
}

export function mergeContentPatternSeed(seedItems = []) {
  const local = loadContentPatternDataset();
  const fingerprints = new Set(local.map((item) => item.structure_fingerprint));
  const additions = [];
  for (const item of Array.isArray(seedItems) ? seedItems : []) {
    const safe = sanitizePatternForStorage({ ...item, source_type: item.source_type || "public_seed" }, item);
    if (!fingerprints.has(safe.structure_fingerprint)) {
      fingerprints.add(safe.structure_fingerprint);
      additions.push(safe);
    }
  }
  const dataset = [...local, ...additions].slice(0, CONTENT_PATTERN_DATASET_LIMIT);
  writeArray(CONTENT_PATTERN_DATASET_KEY, dataset);
  return { added: additions.length, dataset };
}

export async function loadPublicContentPatternSeed(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") return { ok: false, added: 0, dataset: loadContentPatternDataset() };
  try {
    const response = await fetchImpl(CONTENT_PATTERN_SEED_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`seed_http_${response.status}`);
    const payload = await response.json();
    const result = mergeContentPatternSeed(Array.isArray(payload) ? payload : payload.patterns);
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, added: 0, dataset: loadContentPatternDataset() };
  }
}

function distribution(items, field) {
  return items.reduce((result, item) => {
    const key = cleanText(item[field], 100) || "未分类";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

export function getContentPatternDatabaseStats(dataset = loadContentPatternDataset(), staging = loadContentRawStaging()) {
  const meta = loadMeta();
  const reviewed = dataset.filter((item) => item.human_reviewed).length;
  const rawFalse = dataset.filter((item) => item.raw_text_stored === false).length;
  const fingerprints = new Set();
  let storedDuplicates = 0;
  for (const item of dataset) {
    if (fingerprints.has(item.structure_fingerprint)) storedDuplicates += 1;
    fingerprints.add(item.structure_fingerprint);
  }
  return {
    dataset_count: dataset.length,
    staging_count: staging.length,
    reviewed_count: reviewed,
    unreviewed_count: dataset.length - reviewed,
    platform_distribution: distribution(dataset, "platform"),
    category_distribution: distribution(dataset, "category_key"),
    hook_type_distribution: distribution(dataset, "hook_type"),
    raw_text_stored_false_ratio: dataset.length ? rawFalse / dataset.length : 1,
    duplicate_count: Math.max(storedDuplicates, Number(meta.duplicate_count) || 0),
    last_import_at: meta.last_import_at || "",
    last_saved_at: meta.last_saved_at || "",
  };
}

export function __resetContentPatternDatabaseForTests() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(CONTENT_RAW_STAGING_KEY);
  window.localStorage.removeItem(CONTENT_PATTERN_DATASET_KEY);
  window.localStorage.removeItem(CONTENT_PATTERN_DATABASE_META_KEY);
}
