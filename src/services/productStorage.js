import { hasSupabaseConfig, supabase } from "../../supabaseClient";

export const LOCAL_STORAGE_KEY = "tradepilot_local_records";
export const STORAGE_MODE_KEY = "tradepilot_storage_mode";
export const LOCAL_RECORD_LIMIT = 100;
export const PRODUCT_RECORDS_TABLE = "tradepilot_product_records";

export const STORAGE_MODES = {
  AUTO: "auto",
  LOCAL: "local",
  CLOUD: "cloud",
};

const selectedModeLabels = {
  auto: "自动选择",
  local: "仅本地保存",
  cloud: "云端同步",
};

const effectiveModeLabels = {
  local: "本地模式",
  cloud: "云端同步",
  cloud_unavailable: "云端不可用",
};

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeError(error) {
  if (!error) return "";
  const message = error.message || error.error_description || error.details || String(error);
  if (/failed to fetch|network|fetch/i.test(message)) {
    return "Supabase 当前不可达，建议检查网络或环境变量。你仍可切换到本地模式继续使用。";
  }
  return message;
}

function normalizeSelectedMode(mode) {
  return [STORAGE_MODES.AUTO, STORAGE_MODES.LOCAL, STORAGE_MODES.CLOUD].includes(mode)
    ? mode
    : STORAGE_MODES.AUTO;
}

export function getStorageMode() {
  if (!storageAvailable()) return STORAGE_MODES.AUTO;
  return normalizeSelectedMode(window.localStorage.getItem(STORAGE_MODE_KEY));
}

export function saveStorageMode(mode) {
  const nextMode = normalizeSelectedMode(mode);
  if (storageAvailable()) {
    window.localStorage.setItem(STORAGE_MODE_KEY, nextMode);
  }
  return nextMode;
}

function resolveMode(mode) {
  return normalizeSelectedMode(mode || getStorageMode());
}

function isPlainRecord(record) {
  return record && typeof record === "object" && !Array.isArray(record);
}

function normalizeRecord(record, index = 0) {
  const now = new Date().toISOString();
  const id = record?.id !== undefined && record?.id !== null && String(record.id).trim()
    ? String(record.id)
    : `local-${Date.now()}-${index}`;
  const createdAt = record?.created_at || record?.createdAt || now;
  const updatedAt = record?.updated_at || record?.updatedAt || createdAt || now;

  return {
    ...record,
    id,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function normalizeRecords(records = []) {
  const seen = new Set();
  return (Array.isArray(records) ? records : [])
    .filter(isPlainRecord)
    .map(normalizeRecord)
    .filter((record) => {
      if (seen.has(record.id)) return false;
      seen.add(record.id);
      return true;
    });
}

function getRecordTimestamp(record) {
  const value = record?.updated_at || record?.updatedAt || record?.created_at || record?.createdAt || "";
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortRecordsByUpdatedAt(records = []) {
  return normalizeRecords(records).sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
}

function hasRecordPayload(record) {
  if (!isPlainRecord(record)) return false;
  return Boolean(
    record.id ||
    record.product_name ||
    record.category ||
    isPlainRecord(record.product) ||
    isPlainRecord(record.result) ||
    isPlainRecord(record.review) ||
    record.report
  );
}

function normalizeBackupRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter(hasRecordPayload)
    .map((record, index) => normalizeRecord(record, index));
}

function getBackupRecordsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (isPlainRecord(payload) && Array.isArray(payload.records)) return payload.records;
  throw new Error("invalid_backup_format");
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

function toBackupRecord(record) {
  const normalized = normalizeRecord(record);
  return {
    ...normalized,
    createdAt: normalized.created_at,
    updatedAt: normalized.updated_at,
  };
}

function getLimitWarning(count) {
  if (count > LOCAL_RECORD_LIMIT) {
    return `本地模式最多建议保存 ${LOCAL_RECORD_LIMIT} 条，当前已有 ${count} 条；已保留全部记录，建议后续开启云端同步。`;
  }
  if (count >= Math.floor(LOCAL_RECORD_LIMIT * 0.8)) {
    return `本地记录较多，当前已有 ${count} 条；本地模式最多建议保存 ${LOCAL_RECORD_LIMIT} 条，建议后续开启云端同步。`;
  }
  return "";
}

function getStatusDescription(selectedMode, effectiveMode) {
  if (effectiveMode === "cloud") {
    return "云端同步：登录 Supabase 后可跨设备保存产品库，当前云端读写已启用。";
  }

  if (effectiveMode === "cloud_unavailable") {
    if (!hasSupabaseConfig) {
      return "云端同步当前不可用：未配置 Supabase。系统会保留本地模式体验，建议定期导出备份。";
    }
    return "云端同步当前不可用：请登录或检查 Supabase 配置。系统不会阻断本地产品库使用。";
  }

  if (selectedMode === STORAGE_MODES.LOCAL) {
    return "仅本地保存：适合游客体验和国内网络不稳定场景，但需要定期导出备份。";
  }

  return "自动选择：云端可用时优先云端，否则回退本地；当前使用本地浏览器存储。";
}

function buildStatus({
  selectedMode,
  effectiveMode,
  warning = "",
  error = "",
  user = null,
  localCount = 0,
}) {
  const normalizedSelectedMode = resolveMode(selectedMode);
  const normalizedEffectiveMode = effectiveMode || "local";
  const userEmail = user?.email || "";

  return {
    selectedMode: normalizedSelectedMode,
    selectedModeLabel: selectedModeLabels[normalizedSelectedMode],
    effectiveMode: normalizedEffectiveMode,
    effectiveModeLabel: effectiveModeLabels[normalizedEffectiveMode] || effectiveModeLabels.local,
    mode: normalizedEffectiveMode,
    label: effectiveModeLabels[normalizedEffectiveMode] || effectiveModeLabels.local,
    description: getStatusDescription(normalizedSelectedMode, normalizedEffectiveMode),
    warning,
    error,
    userEmail,
    localCount,
    localRecordLimit: LOCAL_RECORD_LIMIT,
    hasSupabaseConfig,
    tableName: PRODUCT_RECORDS_TABLE,
    canUseCloud: normalizedEffectiveMode === "cloud",
    needsLogin: normalizedSelectedMode === STORAGE_MODES.CLOUD && hasSupabaseConfig && !userEmail && normalizedEffectiveMode !== "cloud",
  };
}

function buildResult(records, selectedMode, effectiveMode, extra = {}) {
  const normalized = normalizeRecords(records);
  const warning = extra.warning || getLimitWarning(normalized.length);
  const status = buildStatus({
    selectedMode,
    effectiveMode,
    warning,
    error: extra.error || "",
    user: extra.user || null,
    localCount: normalized.length,
  });

  return {
    records: normalized,
    selectedMode: status.selectedMode,
    effectiveMode,
    mode: effectiveMode,
    warning,
    error: extra.error || "",
    status,
  };
}

function localResult(records, selectedMode, extra = {}) {
  return buildResult(records, selectedMode, "local", extra);
}

function cloudResult(records, selectedMode, user, extra = {}) {
  return buildResult(records, selectedMode, "cloud", { ...extra, user });
}

function cloudUnavailableResult(records, selectedMode, extra = {}) {
  return buildResult(records, selectedMode, "cloud_unavailable", extra);
}

export function getLocalRecords(options = {}) {
  const selectedMode = resolveMode(options.selectedMode);

  if (!storageAvailable()) {
    return localResult([], selectedMode, { warning: "当前环境无法访问 localStorage，产品库只能保存在本次页面会话中。" });
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return localResult([], selectedMode, { warning: "本地产品库格式异常，已临时按空产品库处理。" });
    }
    return localResult(parsed, selectedMode);
  } catch (error) {
    return localResult([], selectedMode, {
      warning: "本地产品库读取失败，已临时按空产品库处理。",
      error: normalizeError(error),
    });
  }
}

export function saveLocalRecords(records = [], options = {}) {
  const selectedMode = resolveMode(options.selectedMode);
  const normalized = normalizeRecords(records);

  if (!storageAvailable()) {
    return localResult(normalized, selectedMode, { warning: "当前环境无法访问 localStorage，产品库只能保存在本次页面会话中。" });
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
    return localResult(normalized, selectedMode);
  } catch (error) {
    return localResult(normalized, selectedMode, {
      warning: "本地产品库写入失败，请导出备份或减少图片预览后再试。",
      error: normalizeError(error),
    });
  }
}

export function mergeProductRecords(existingRecords = [], importedRecords = []) {
  const mergedById = new Map();

  normalizeRecords(existingRecords).forEach((record) => {
    mergedById.set(record.id, record);
  });

  normalizeBackupRecords(importedRecords).forEach((record) => {
    const oldRecord = mergedById.get(record.id);
    if (!oldRecord || getRecordTimestamp(record) >= getRecordTimestamp(oldRecord)) {
      mergedById.set(record.id, record);
    }
  });

  return sortRecordsByUpdatedAt([...mergedById.values()]);
}

export function exportLocalRecordsBackup(records = [], options = {}) {
  const normalized = sortRecordsByUpdatedAt(records);

  if (!normalized.length) {
    throw new Error("empty_records");
  }

  const exportedAtDate = options.exportedAt ? new Date(options.exportedAt) : new Date();
  const exportedAt = Number.isFinite(exportedAtDate.getTime())
    ? exportedAtDate.toISOString()
    : new Date().toISOString();
  const fileName = `tradepilot-product-backup-${formatBackupTimestamp(new Date(exportedAt))}.json`;
  const payload = {
    app: "TradePilot AI",
    version: 1,
    exportedAt,
    localStorageKey: LOCAL_STORAGE_KEY,
    records: normalized.map(toBackupRecord),
  };

  return {
    fileName,
    payload,
    records: payload.records,
    json: JSON.stringify(payload, null, 2),
  };
}

export async function importLocalRecordsBackup(file, options = {}) {
  if (!file || typeof file.text !== "function") {
    throw new Error("invalid_backup_format");
  }

  let payload = null;
  try {
    payload = JSON.parse(await file.text());
  } catch (error) {
    throw new Error("invalid_backup_format");
  }

  const rawImportedRecords = getBackupRecordsFromPayload(payload);
  const importedRecords = normalizeBackupRecords(rawImportedRecords);

  if (!importedRecords.length && rawImportedRecords.length > 0) {
    throw new Error("invalid_backup_format");
  }

  const selectedMode = resolveMode(options.selectedMode);
  const currentRecords = Array.isArray(options.existingRecords)
    ? options.existingRecords
    : getLocalRecords({ selectedMode }).records;
  const mergedRecords = mergeProductRecords(currentRecords, importedRecords);
  const saveResult = saveLocalRecords(mergedRecords, { selectedMode });

  return {
    ...saveResult,
    importedCount: importedRecords.length,
    skippedCount: Math.max(0, rawImportedRecords.length - importedRecords.length),
    mergedCount: mergedRecords.length,
  };
}

function upsertRecord(records, record) {
  const normalizedRecord = normalizeRecord(record);
  return [
    normalizedRecord,
    ...normalizeRecords(records).filter((item) => item.id !== normalizedRecord.id),
  ];
}

function removeRecord(records, recordId) {
  return normalizeRecords(records).filter((record) => record.id !== String(recordId));
}

async function getCloudUser() {
  if (!hasSupabaseConfig || !supabase) {
    return { user: null, warning: "当前未配置 Supabase，无法启用云端同步。" };
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const errorText = normalizeError(error);
      return { user: null, warning: errorText || "Supabase 登录状态不可用，请重新登录后启用云端同步。", error: errorText };
    }
    if (!data?.user) {
      return { user: null, warning: "请登录后启用云端同步。" };
    }
    return { user: data.user, warning: "" };
  } catch (error) {
    const errorText = normalizeError(error);
    return { user: null, warning: errorText || "Supabase 登录状态检查失败，请稍后重试。", error: errorText };
  }
}

export async function canUseCloudStorage(mode) {
  const selectedMode = resolveMode(mode);
  const local = getLocalRecords({ selectedMode });

  if (selectedMode === STORAGE_MODES.LOCAL) {
    return {
      canUseCloud: false,
      selectedMode,
      effectiveMode: "local",
      mode: "local",
      warning: local.warning,
      error: local.error || "",
      status: local.status,
    };
  }

  const cloud = await getCloudUser();
  if (!cloud.user) {
    const result = selectedMode === STORAGE_MODES.CLOUD
      ? cloudUnavailableResult(local.records, selectedMode, {
          warning: cloud.warning,
          error: cloud.error || local.error || "",
        })
      : localResult(local.records, selectedMode, {
          warning: local.warning,
          error: local.error || "",
        });

    return {
      canUseCloud: false,
      selectedMode,
      effectiveMode: result.effectiveMode,
      mode: result.mode,
      warning: result.warning,
      error: result.error,
      status: result.status,
    };
  }

  const result = cloudResult(local.records, selectedMode, cloud.user, {
    warning: local.warning,
    error: local.error || "",
  });

  return {
    canUseCloud: true,
    selectedMode,
    effectiveMode: "cloud",
    mode: "cloud",
    user: cloud.user,
    warning: result.warning,
    error: result.error,
    status: result.status,
  };
}

export async function getStorageStatus(mode) {
  const selectedMode = resolveMode(mode);
  const availability = await canUseCloudStorage(selectedMode);
  return availability.status;
}

function recordToCloudRow(record, user) {
  const normalized = normalizeRecord(record);
  const resultPayload = isPlainRecord(normalized.result) ? normalized.result : {};
  const reviewPayload = isPlainRecord(normalized.review)
    ? normalized.review
    : isPlainRecord(resultPayload.review)
      ? resultPayload.review
      : {};

  return {
    id: normalized.id,
    user_id: user.id,
    product: isPlainRecord(normalized.product) ? normalized.product : {},
    result: {
      ...resultPayload,
      __recordMeta: {
        product_name: normalized.product_name || "",
        category: normalized.category || "",
        score: normalized.score ?? resultPayload.totalScore ?? 0,
        advice: normalized.advice || resultPayload.level || "",
        price: normalized.price || "",
        competitor_price: normalized.competitor_price || "",
        report: normalized.report || resultPayload.report || "",
      },
    },
    review: reviewPayload,
    created_at: normalized.created_at,
    updated_at: new Date().toISOString(),
  };
}

function cloudRowToRecord(row) {
  const resultPayload = isPlainRecord(row?.result) ? { ...row.result } : {};
  const meta = isPlainRecord(resultPayload.__recordMeta) ? resultPayload.__recordMeta : {};
  delete resultPayload.__recordMeta;

  const review = isPlainRecord(row?.review)
    ? row.review
    : isPlainRecord(resultPayload.review)
      ? resultPayload.review
      : {};

  return normalizeRecord({
    id: row?.id,
    created_at: row?.created_at,
    updated_at: row?.updated_at,
    product_name: meta.product_name || row?.product?.name || resultPayload.productIdentity?.displayName || "未命名产品",
    category: meta.category || row?.product?.category || resultPayload.productIdentity?.productTypeLabel || "未分类",
    score: Number(meta.score ?? resultPayload.totalScore ?? 0) || 0,
    advice: meta.advice || resultPayload.level || "暂无建议",
    price: meta.price || row?.product?.price || "",
    competitor_price: meta.competitor_price || row?.product?.competitorPrice || "",
    product: isPlainRecord(row?.product) ? row.product : {},
    result: {
      ...resultPayload,
      review,
    },
    review,
    report: meta.report || resultPayload.report || "暂无报告内容",
  });
}

export async function loadProductRecords(mode) {
  const selectedMode = resolveMode(mode);
  const local = getLocalRecords({ selectedMode });

  if (selectedMode === STORAGE_MODES.LOCAL) {
    return localResult(local.records, selectedMode, {
      warning: local.warning,
      error: local.error || "",
    });
  }

  const cloud = await getCloudUser();
  if (!cloud.user) {
    if (selectedMode === STORAGE_MODES.CLOUD) {
      return cloudUnavailableResult(local.records, selectedMode, {
        warning: cloud.warning,
        error: cloud.error || local.error || "",
      });
    }

    return localResult(local.records, selectedMode, {
      warning: local.warning,
      error: local.error || "",
    });
  }

  try {
    const { data, error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .select("id,user_id,product,result,review,created_at,updated_at")
      .eq("user_id", cloud.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const records = normalizeRecords((data || []).map(cloudRowToRecord));
    saveLocalRecords(records, { selectedMode });
    return cloudResult(records, selectedMode, cloud.user);
  } catch (error) {
    const errorText = normalizeError(error);
    const warning = selectedMode === STORAGE_MODES.CLOUD
      ? `云端产品库读取失败，当前未成功云端同步。${errorText}`
      : `自动选择：云端读取失败，已回退本地。${errorText}`;

    return selectedMode === STORAGE_MODES.CLOUD
      ? cloudUnavailableResult(local.records, selectedMode, { warning, error: errorText, user: cloud.user })
      : localResult(local.records, selectedMode, { warning, error: errorText });
  }
}

export async function saveProductRecord(record, mode) {
  const selectedMode = resolveMode(mode);
  const local = getLocalRecords({ selectedMode });
  const nextLocalRecords = upsertRecord(local.records, record);
  const localSave = saveLocalRecords(nextLocalRecords, { selectedMode });

  if (selectedMode === STORAGE_MODES.LOCAL) {
    return localSave;
  }

  const cloud = await getCloudUser();
  if (!cloud.user) {
    if (selectedMode === STORAGE_MODES.CLOUD) {
      return cloudUnavailableResult(localSave.records, selectedMode, {
        warning: `${cloud.warning} 本次记录已先保存在本地缓存，未完成云端同步。`,
        error: cloud.error || localSave.error || "",
      });
    }

    return localResult(localSave.records, selectedMode, {
      warning: localSave.warning,
      error: localSave.error || "",
    });
  }

  try {
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .upsert(recordToCloudRow(record, cloud.user), { onConflict: "id" });

    if (error) throw error;
    return loadProductRecords(selectedMode);
  } catch (error) {
    const errorText = normalizeError(error);
    const warning = selectedMode === STORAGE_MODES.CLOUD
      ? `云端保存失败；本次记录已先保存在本地缓存，未完成云端同步。${errorText}`
      : `自动选择：云端保存失败，已回退本地。${errorText}`;

    return selectedMode === STORAGE_MODES.CLOUD
      ? cloudUnavailableResult(localSave.records, selectedMode, { warning, error: errorText, user: cloud.user })
      : localResult(localSave.records, selectedMode, { warning, error: errorText });
  }
}

export async function deleteProductRecord(recordId, mode) {
  const selectedMode = resolveMode(mode);
  const local = getLocalRecords({ selectedMode });
  const nextLocalRecords = removeRecord(local.records, recordId);
  const localSave = saveLocalRecords(nextLocalRecords, { selectedMode });

  if (selectedMode === STORAGE_MODES.LOCAL) {
    return localSave;
  }

  const cloud = await getCloudUser();
  if (!cloud.user) {
    if (selectedMode === STORAGE_MODES.CLOUD) {
      return cloudUnavailableResult(localSave.records, selectedMode, {
        warning: `${cloud.warning} 已先删除本地缓存，云端未执行删除。`,
        error: cloud.error || localSave.error || "",
      });
    }

    return localResult(localSave.records, selectedMode, {
      warning: localSave.warning,
      error: localSave.error || "",
    });
  }

  try {
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .delete()
      .eq("user_id", cloud.user.id)
      .eq("id", String(recordId));

    if (error) throw error;
    return loadProductRecords(selectedMode);
  } catch (error) {
    const errorText = normalizeError(error);
    const warning = selectedMode === STORAGE_MODES.CLOUD
      ? `云端删除失败，已先删除本地缓存。${errorText}`
      : `自动选择：云端删除失败，已先删除本地缓存。${errorText}`;

    return selectedMode === STORAGE_MODES.CLOUD
      ? cloudUnavailableResult(localSave.records, selectedMode, { warning, error: errorText, user: cloud.user })
      : localResult(localSave.records, selectedMode, { warning, error: errorText });
  }
}

export async function clearProductRecords(mode) {
  const selectedMode = resolveMode(mode);
  const localSave = saveLocalRecords([], { selectedMode });

  if (selectedMode === STORAGE_MODES.LOCAL) {
    return localSave;
  }

  const cloud = await getCloudUser();
  if (!cloud.user) {
    if (selectedMode === STORAGE_MODES.CLOUD) {
      return cloudUnavailableResult([], selectedMode, {
        warning: `${cloud.warning} 已清空本地缓存，云端未执行清空。`,
        error: cloud.error || localSave.error || "",
      });
    }

    return localResult([], selectedMode, {
      warning: localSave.warning,
      error: localSave.error || "",
    });
  }

  try {
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .delete()
      .eq("user_id", cloud.user.id);

    if (error) throw error;
    return cloudResult([], selectedMode, cloud.user);
  } catch (error) {
    const errorText = normalizeError(error);
    return selectedMode === STORAGE_MODES.CLOUD
      ? cloudUnavailableResult([], selectedMode, { warning: `云端清空失败，已清空本地缓存。${errorText}`, error: errorText, user: cloud.user })
      : localResult([], selectedMode, { warning: `自动选择：云端清空失败，已清空本地缓存。${errorText}`, error: errorText });
  }
}

export async function migrateLocalRecordsToCloud(mode) {
  const selectedMode = resolveMode(mode);
  const local = getLocalRecords({ selectedMode });

  if (selectedMode === STORAGE_MODES.LOCAL) {
    return localResult(local.records, selectedMode, {
      warning: "当前选择了仅本地保存；如需同步，请先切换到云端同步或自动选择。",
      error: local.error || "",
    });
  }

  const cloud = await getCloudUser();
  if (!cloud.user) {
    if (selectedMode === STORAGE_MODES.CLOUD) {
      return cloudUnavailableResult(local.records, selectedMode, {
        warning: `${cloud.warning} 本地记录仍保留在浏览器中。`,
        error: cloud.error || local.error || "",
      });
    }

    return localResult(local.records, selectedMode, {
      warning: "当前未登录，自动选择仍使用本地模式；本地记录未同步到云端。",
      error: cloud.error || local.error || "",
    });
  }

  if (local.records.length === 0) {
    return loadProductRecords(selectedMode);
  }

  try {
    const rows = local.records.map((record) => recordToCloudRow(record, cloud.user));
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .upsert(rows, { onConflict: "id" });

    if (error) throw error;
    const loaded = await loadProductRecords(selectedMode);
    return {
      ...loaded,
      warning: loaded.warning || "已同步本地记录到云端。",
      status: {
        ...loaded.status,
        warning: loaded.status?.warning || "已同步本地记录到云端。",
      },
    };
  } catch (error) {
    const errorText = normalizeError(error);
    const warning = `本地记录迁移到云端失败，已继续保留本地记录。${errorText}`;
    return selectedMode === STORAGE_MODES.CLOUD
      ? cloudUnavailableResult(local.records, selectedMode, { warning, error: errorText, user: cloud.user })
      : localResult(local.records, selectedMode, { warning, error: errorText });
  }
}
