import { Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";

function actionLabel(result, fallback) {
  if (!result) return fallback;
  if (typeof result === "string") return result;
  return result.message || fallback;
}

export default function ProductBackupActions({
  onExportJson,
  onExportCsv,
  onImportJson,
  storageStatus,
}) {
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const effectiveMode = storageStatus?.effectiveMode || storageStatus?.mode || "local";
  const showLocalTip = effectiveMode !== "cloud";

  async function runAction(action, fallback) {
    if (!action) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      setMessage(actionLabel(result, fallback));
    } catch (error) {
      setMessage(error?.message || "操作失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event) {
    if (!onImportJson) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await onImportJson(event);
      setMessage(actionLabel(result, "JSON 备份已导入。"));
    } catch (error) {
      setMessage(error?.message || "备份文件格式不正确");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-black text-cyan-50">产品库备份与表格导出</p>
          <p className="mt-1 break-words text-xs leading-6 text-cyan-100/80">
            本地模式下，产品库数据仅保存在当前浏览器。建议定期导出 JSON 备份；CSV 可用于 Excel / WPS 二次分析。
          </p>
          {showLocalTip && (
            <p className="mt-2 break-words text-xs leading-6 text-cyan-100/75">
              清除浏览器缓存、更换设备或使用无痕模式可能导致本地记录丢失；登录后开启云端同步可降低这个风险。
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(onExportJson, "JSON 备份已导出。")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60 sm:w-auto"
          >
            <FileJson className="h-4 w-4" />
            导出 JSON 备份
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(onExportCsv, "CSV 表格已导出。")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-60 sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            导出 CSV 表格
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-60 sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            导入 JSON 备份
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {message && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-cyan-50">
          <Download className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{message}</span>
        </div>
      )}
    </section>
  );
}
