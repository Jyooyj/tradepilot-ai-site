import { hasSupabaseConfig, supabase } from "../../supabaseClient";

export const LOCAL_STORAGE_KEY = "tradepilot_local_records";
export const LOCAL_RECORD_LIMIT = 100;
export const PRODUCT_RECORDS_TABLE = "tradepilot_product_records";

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeError(error) {
  if (!error) return "";
  return error.message || error.error_description || error.details || String(error);
}

function isPlainRecord(record) {
  return record && typeof record === "object" && !Array.isArray(record);
}

function normalizeRecord(record, index = 0) {
  const now = new Date().toISOString();
  const id = record?.id !== undefined && record?.id !== null && String(record.id).trim()
    ? String(record.id)
    : `local-${Date.now()}-${index}`;

  return {
    ...record,
    id,
    created_at: record?.created_at || now,
    updated_at: record?.updated_at || now,
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

function getLimitWarning(count) {
  if (count > LOCAL_RECORD_LIMIT) {
    return `本地模式最多建议保存 ${LOCAL_RECORD_LIMIT} 条，当前已有 ${count} 条；已保留全部记录，建议后续开启云端同步。`;
  }
  if (count >= Math.floor(LOCAL_RECORD_LIMIT * 0.8)) {
    return `本地记录较多，当前已有 ${count} 条；本地模式最多建议保存 ${LOCAL_RECORD_LIMIT} 条，建议后续开启云端同步。`;
  }
  return "";
}

function buildStatus({ mode, warning = "", error = "", user = null, localCount = 0 }) {
  const isCloud = mode === "cloud";
  return {
    mode,
    label: isCloud ? "云端同步" : "本地模式",
    description: isCloud
      ? "已登录并启用 Supabase 云端同步，同时保留本地缓存。"
      : hasSupabaseConfig
        ? "Supabase 已配置，但当前未登录或云端暂不可用，正在使用本地浏览器存储。"
        : "Supabase 未配置，当前使用本地浏览器存储。",
    warning,
    error,
    userEmail: user?.email || "",
    localCount,
    localRecordLimit: LOCAL_RECORD_LIMIT,
    hasSupabaseConfig,
    tableName: PRODUCT_RECORDS_TABLE,
    canUseCloud: isCloud,
  };
}

function localResult(records, extra = {}) {
  const normalized = normalizeRecords(records);
  const warning = extra.warning || getLimitWarning(normalized.length);
  return {
    records: normalized,
    mode: "local",
    warning,
    error: extra.error || "",
    status: buildStatus({
      mode: "local",
      warning,
      error: extra.error || "",
      localCount: normalized.length,
    }),
  };
}

function cloudResult(records, user, extra = {}) {
  const normalized = normalizeRecords(records);
  const warning = extra.warning || getLimitWarning(normalized.length);
  return {
    records: normalized,
    mode: "cloud",
    warning,
    error: extra.error || "",
    status: buildStatus({
      mode: "cloud",
      warning,
      error: extra.error || "",
      user,
      localCount: normalized.length,
    }),
  };
}

export function getLocalRecords() {
  if (!storageAvailable()) {
    return localResult([], { warning: "当前环境无法访问 localStorage，产品库只能保存在本次页面会话中。" });
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return localResult([], { warning: "本地产品库格式异常，已临时按空产品库处理。" });
    }
    return localResult(parsed);
  } catch (error) {
    return localResult([], {
      warning: "本地产品库读取失败，已临时按空产品库处理。",
      error: normalizeError(error),
    });
  }
}

export function saveLocalRecords(records = []) {
  const normalized = normalizeRecords(records);

  if (!storageAvailable()) {
    return localResult(normalized, { warning: "当前环境无法访问 localStorage，产品库只能保存在本次页面会话中。" });
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
    return localResult(normalized);
  } catch (error) {
    return localResult(normalized, {
      warning: "本地产品库写入失败，请导出备份或减少图片预览后再试。",
      error: normalizeError(error),
    });
  }
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
    return { user: null, warning: "Supabase 未配置，当前使用本地模式。" };
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { user: null, warning: "Supabase 登录状态不可用，当前使用本地模式。", error: normalizeError(error) };
    }
    if (!data?.user) {
      return { user: null, warning: "当前未登录，产品库使用本地模式。" };
    }
    return { user: data.user, warning: "" };
  } catch (error) {
    return { user: null, warning: "Supabase 登录状态检查失败，当前使用本地模式。", error: normalizeError(error) };
  }
}

export async function canUseCloudStorage() {
  const local = getLocalRecords();
  const cloud = await getCloudUser();

  if (!cloud.user) {
    return {
      canUseCloud: false,
      mode: "local",
      warning: local.warning || cloud.warning,
      error: cloud.error || local.error || "",
      status: buildStatus({
        mode: "local",
        warning: local.warning || cloud.warning,
        error: cloud.error || local.error || "",
        localCount: local.records.length,
      }),
    };
  }

  return {
    canUseCloud: true,
    mode: "cloud",
    user: cloud.user,
    warning: local.warning,
    error: local.error || "",
    status: buildStatus({
      mode: "cloud",
      warning: local.warning,
      error: local.error || "",
      user: cloud.user,
      localCount: local.records.length,
    }),
  };
}

export async function getStorageStatus() {
  const availability = await canUseCloudStorage();
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

export async function loadProductRecords() {
  const local = getLocalRecords();
  const availability = await canUseCloudStorage();

  if (!availability.canUseCloud) {
    return {
      ...local,
      warning: local.warning || availability.warning,
      error: availability.error || local.error || "",
      status: availability.status,
    };
  }

  try {
    const { data, error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .select("id,user_id,product,result,review,created_at,updated_at")
      .eq("user_id", availability.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const records = normalizeRecords((data || []).map(cloudRowToRecord));
    saveLocalRecords(records);
    return cloudResult(records, availability.user);
  } catch (error) {
    const warning = `云端产品库读取失败，已自动切换到本地模式。${normalizeError(error)}`;
    return localResult(local.records, { warning, error: normalizeError(error) });
  }
}

export async function saveProductRecord(record) {
  const local = getLocalRecords();
  const nextLocalRecords = upsertRecord(local.records, record);
  const localSave = saveLocalRecords(nextLocalRecords);
  const availability = await canUseCloudStorage();

  if (!availability.canUseCloud) {
    return {
      ...localSave,
      warning: localSave.warning || availability.warning,
      error: availability.error || localSave.error || "",
      status: availability.status,
    };
  }

  try {
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .upsert(recordToCloudRow(record, availability.user), { onConflict: "id" });

    if (error) throw error;

    const cloudLoad = await loadProductRecords();
    return {
      ...cloudLoad,
      warning: localSave.warning || cloudLoad.warning,
      status: buildStatus({
        mode: cloudLoad.mode,
        warning: localSave.warning || cloudLoad.warning,
        error: cloudLoad.error,
        user: availability.user,
        localCount: cloudLoad.records.length,
      }),
    };
  } catch (error) {
    const warning = `云端保存失败，已保存在本地模式。${normalizeError(error)}`;
    return localResult(localSave.records, { warning, error: normalizeError(error) });
  }
}

export async function deleteProductRecord(recordId) {
  const local = getLocalRecords();
  const nextLocalRecords = removeRecord(local.records, recordId);
  const localSave = saveLocalRecords(nextLocalRecords);
  const availability = await canUseCloudStorage();

  if (!availability.canUseCloud) {
    return {
      ...localSave,
      warning: localSave.warning || availability.warning,
      error: availability.error || localSave.error || "",
      status: availability.status,
    };
  }

  try {
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .delete()
      .eq("user_id", availability.user.id)
      .eq("id", String(recordId));

    if (error) throw error;
    return loadProductRecords();
  } catch (error) {
    const warning = `云端删除失败，已先删除本地缓存。${normalizeError(error)}`;
    return localResult(localSave.records, { warning, error: normalizeError(error) });
  }
}

export async function clearProductRecords() {
  const localSave = saveLocalRecords([]);
  const availability = await canUseCloudStorage();

  if (!availability.canUseCloud) {
    return {
      ...localSave,
      warning: localSave.warning || availability.warning,
      error: availability.error || localSave.error || "",
      status: availability.status,
    };
  }

  try {
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .delete()
      .eq("user_id", availability.user.id);

    if (error) throw error;
    return cloudResult([], availability.user);
  } catch (error) {
    const warning = `云端清空失败，已清空本地缓存。${normalizeError(error)}`;
    return localResult([], { warning, error: normalizeError(error) });
  }
}

export async function migrateLocalRecordsToCloud() {
  const local = getLocalRecords();
  const availability = await canUseCloudStorage();

  if (!availability.canUseCloud) {
    return {
      ...local,
      warning: local.warning || availability.warning || "当前无法使用云端同步，已保留本地产品库。",
      error: availability.error || local.error || "",
      status: availability.status,
    };
  }

  if (local.records.length === 0) {
    return cloudResult([], availability.user);
  }

  try {
    const rows = local.records.map((record) => recordToCloudRow(record, availability.user));
    const { error } = await supabase
      .from(PRODUCT_RECORDS_TABLE)
      .upsert(rows, { onConflict: "id" });

    if (error) throw error;
    return loadProductRecords();
  } catch (error) {
    const warning = `本地记录迁移到云端失败，已继续保留本地记录。${normalizeError(error)}`;
    return localResult(local.records, { warning, error: normalizeError(error) });
  }
}
