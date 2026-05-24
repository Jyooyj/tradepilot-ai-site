const PROJECT_NAME = "TradePilot AI";
const BACKUP_VERSION = 1;
const LOCAL_STORAGE_KEY = "tradepilot_local_records";

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function formatBackupTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

function getRecordTimestamp(record = {}) {
  const value = record.updatedAt || record.updated_at || record.createdAt || record.created_at || "";
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeRecord(record, index = 0) {
  const now = new Date().toISOString();
  const id = record?.id !== undefined && record?.id !== null && String(record.id).trim()
    ? String(record.id)
    : `local-${Date.now()}-${index}`;
  const createdAt = record?.createdAt || record?.created_at || now;
  const updatedAt = record?.updatedAt || record?.updated_at || createdAt || now;

  return {
    ...record,
    id,
    createdAt,
    updatedAt,
    created_at: record?.created_at || createdAt,
    updated_at: record?.updated_at || updatedAt,
    product: isPlainObject(record?.product) ? record.product : {},
    result: isPlainObject(record?.result) ? record.result : {},
    review: isPlainObject(record?.review) ? record.review : {},
  };
}

function hasRecordPayload(record) {
  if (!isPlainObject(record)) return false;
  return Boolean(
    record.id ||
    record.product_name ||
    record.category ||
    isPlainObject(record.product) ||
    isPlainObject(record.result) ||
    isPlainObject(record.review) ||
    record.report
  );
}

function normalizeRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter(hasRecordPayload)
    .map(normalizeRecord);
}

function getPayloadRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (isPlainObject(payload) && Array.isArray(payload.records)) return payload.records;
  throw new Error("invalid_backup_format");
}

function textValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => textValue(item))
      .filter(Boolean)
      .join("；");
  }
  if (isPlainObject(value)) {
    return Object.entries(value)
      .slice(0, 6)
      .map(([key, item]) => `${key}:${textValue(item)}`)
      .filter((item) => !item.endsWith(":"))
      .join("；");
  }
  return String(value);
}

function csvCell(value) {
  const text = textValue(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function pickFirst(...values) {
  for (const value of values) {
    const text = textValue(value).trim();
    if (text) return text;
  }
  return "";
}

function numberText(...values) {
  const text = pickFirst(...values);
  if (!text) return "";
  const parsed = Number(String(text).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? String(parsed) : text;
}

function buildCsvRow(record) {
  const product = isPlainObject(record.product) ? record.product : {};
  const result = isPlainObject(record.result) ? record.result : {};
  const effectivePrice = isPlainObject(result.effectivePrice) ? result.effectivePrice : {};
  const moqAdvice = isPlainObject(result.moqAdvice) ? result.moqAdvice : {};

  return [
    record.id,
    pickFirst(product.name, record.product_name, result.productIdentity?.displayName),
    pickFirst(product.category, record.category, result.productIdentity?.productTypeLabel, result.categoryName),
    numberText(product.cost, product.wholesalePrice, result.unitCost, effectivePrice.cost),
    numberText(product.price, record.price, effectivePrice.price),
    pickFirst(product.moq),
    pickFirst(product.audience),
    pickFirst(product.channel, result.channelFit?.best),
    numberText(record.score, result.totalScore),
    numberText(result.margin, effectivePrice.grossMargin),
    numberText(result.profit, effectivePrice.grossProfit),
    numberText(result.stockCost),
    pickFirst(moqAdvice.riskLevel, result.riskLevel, result.status),
    pickFirst(record.advice, result.level, result.samplingStrategy?.headline),
    pickFirst(result.status, result.testDecision, result.level),
    pickFirst(record.createdAt, record.created_at),
    pickFirst(record.updatedAt, record.updated_at),
  ];
}

export function exportProductRecordsToJson(records = []) {
  const normalized = normalizeRecords(records).sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

  if (!normalized.length) {
    throw new Error("empty_records");
  }

  const exportedAt = new Date();
  const payload = {
    projectName: PROJECT_NAME,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    localStorageKey: LOCAL_STORAGE_KEY,
    records: normalized,
  };

  return {
    fileName: `tradepilot-product-backup-${formatBackupTimestamp(exportedAt)}.json`,
    payload,
    records: normalized,
    content: JSON.stringify(payload, null, 2),
  };
}

export function exportProductRecordsToCsv(records = []) {
  const normalized = normalizeRecords(records).sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));

  if (!normalized.length) {
    throw new Error("empty_records");
  }

  const headers = [
    "记录ID",
    "商品名称",
    "品类",
    "拿货价",
    "建议售价",
    "MOQ",
    "目标人群",
    "销售渠道",
    "综合评分",
    "毛利率",
    "单件利润",
    "首批压货资金",
    "风险等级",
    "AI建议",
    "是否适合测款",
    "创建时间",
    "更新时间",
  ];
  const rows = normalized.map((record) => buildCsvRow(record).map(csvCell).join(","));
  const exportedAt = new Date();

  return {
    fileName: `tradepilot-product-records-${formatBackupTimestamp(exportedAt)}.csv`,
    content: `\ufeff${headers.map(csvCell).join(",")}\n${rows.join("\n")}`,
    records: normalized,
  };
}

export async function importProductRecordsFromJson(file) {
  if (!file || typeof file.text !== "function") {
    throw new Error("invalid_backup_format");
  }

  let payload = null;
  try {
    payload = JSON.parse(await file.text());
  } catch (error) {
    throw new Error("invalid_backup_format");
  }

  const records = getPayloadRecords(payload);
  const normalized = normalizeRecords(records);

  if (!Array.isArray(records) || (records.length > 0 && normalized.length === 0)) {
    throw new Error("invalid_backup_format");
  }

  return normalized;
}

export function mergeProductRecords(existingRecords = [], importedRecords = []) {
  const mergedById = new Map();

  normalizeRecords(existingRecords).forEach((record) => {
    mergedById.set(record.id, record);
  });

  normalizeRecords(importedRecords).forEach((record) => {
    const existing = mergedById.get(record.id);
    if (!existing || getRecordTimestamp(record) >= getRecordTimestamp(existing)) {
      mergedById.set(record.id, record);
    }
  });

  return [...mergedById.values()].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
}

export function downloadTextFile(content, fileName, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
