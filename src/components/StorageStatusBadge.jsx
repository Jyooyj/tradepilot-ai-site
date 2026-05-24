const statusTone = {
  cloud: "bg-emerald-300 text-black",
  local: "bg-cyan-300/15 text-cyan-100",
  cloud_unavailable: "bg-amber-300/15 text-amber-100",
};

export default function StorageStatusBadge({ status, onMigrate, onSignOut, onUseLocal }) {
  const selectedLabel = status?.selectedModeLabel || "自动选择";
  const effectiveMode = status?.effectiveMode || status?.mode || "local";
  const effectiveLabel = status?.effectiveModeLabel || (effectiveMode === "cloud" ? "云端同步" : "本地模式");
  const description = status?.description || "正在检测产品库存储状态。";
  const warning = status?.warning || "";
  const localCount = Number(status?.localCount || 0);
  const localRecordLimit = Number(status?.localRecordLimit || 100);
  const nearLimit = !warning && localCount >= Math.floor(localRecordLimit * 0.8);
  const selectedMode = status?.selectedMode || "auto";
  const showLocalRisk = effectiveMode !== "cloud";
  const canMigrate = selectedMode !== "local" && localCount > 0 && onMigrate;
  const canSwitchLocal = effectiveMode === "cloud_unavailable" && onUseLocal;

  return (
    <section className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold text-cyan-100/60">当前选择</p>
          <p className="mt-1 font-black text-cyan-50">{selectedLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold text-cyan-100/60">实际状态</p>
          <p className="mt-1 font-black text-cyan-50">{effectiveLabel}</p>
        </div>
        <div className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusTone[effectiveMode] || statusTone.local}`}>
          {effectiveMode === "cloud" ? "Cloud Ready" : effectiveMode === "cloud_unavailable" ? "Cloud Unavailable" : "Local Active"}
        </div>
      </div>

      <p className="mt-3 leading-6 text-cyan-100/80">{description}</p>

      {showLocalRisk && (
        <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-black/20 px-4 py-3 text-xs leading-6 text-cyan-100">
          当前为本地保存模式，数据仅保存在本浏览器中。清除浏览器缓存、更换设备或使用无痕模式可能导致产品库记录丢失。建议定期导出备份，或登录后开启云端同步。
        </div>
      )}

      {status?.userEmail && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-xs leading-6 text-emerald-50 sm:flex-row sm:items-center sm:justify-between">
          <span>当前云端账号：{status.userEmail}</span>
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="w-fit rounded-xl border border-emerald-300/30 bg-black/20 px-3 py-1 font-black text-emerald-100">
              退出登录
            </button>
          )}
        </div>
      )}

      {(warning || nearLimit) && (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs leading-6 text-amber-100">
          {warning || `本地记录较多，当前已有 ${localCount} 条；本地模式最多建议保存 ${localRecordLimit} 条，建议后续开启云端同步。`}
        </div>
      )}

      {canSwitchLocal && (
        <button
          type="button"
          onClick={onUseLocal}
          className="mt-3 rounded-2xl bg-amber-300 px-4 py-2 text-xs font-black text-black"
        >
          切换到本地模式继续体验
        </button>
      )}

      {canMigrate && (
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
