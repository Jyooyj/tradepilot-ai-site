export default function StorageStatusBadge({ status, onMigrate }) {
  const mode = status?.mode || "local";
  const isCloud = mode === "cloud";
  const label = isCloud ? "当前存储：云端同步" : "当前存储：本地模式";
  const description = status?.description || "正在检测产品库存储状态。";
  const warning = status?.warning || "";
  const localCount = Number(status?.localCount || 0);
  const localRecordLimit = Number(status?.localRecordLimit || 100);
  const nearLimit = !warning && localCount >= Math.floor(localRecordLimit * 0.8);

  return (
    <section className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-cyan-50">{label}</p>
          <p className="mt-1 leading-6 text-cyan-100/80">{description}</p>
          {status?.userEmail && (
            <p className="mt-1 text-xs text-cyan-100/60">同步账号：{status.userEmail}</p>
          )}
        </div>
        <div className={`w-fit rounded-full px-3 py-1 text-xs font-black ${isCloud ? "bg-emerald-300 text-black" : "bg-amber-300/15 text-amber-100"}`}>
          {isCloud ? "Cloud Ready" : "Local Fallback"}
        </div>
      </div>

      {(warning || nearLimit) && (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs leading-6 text-amber-100">
          {warning || `本地记录较多，当前已有 ${localCount} 条；本地模式最多建议保存 ${localRecordLimit} 条，建议后续开启云端同步。`}
        </div>
      )}

      {status?.canUseCloud && localCount > 0 && onMigrate && (
        <button
          type="button"
          onClick={onMigrate}
          className="mt-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100"
        >
          同步本地记录到云端
        </button>
      )}
    </section>
  );
}
