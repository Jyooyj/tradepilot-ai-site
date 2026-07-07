const storageOptions = [
  {
    value: "auto",
    label: "自动选择",
    description: "优先使用云端同步；如果云端暂不可用，系统会自动回退到本地保存，保证演示和使用流程不中断。",
  },
  {
    value: "local",
    label: "仅本地保存",
    description: "数据仅保存在当前浏览器，适合快速体验和离线演示；清除缓存、换设备或使用无痕模式可能导致记录丢失，建议定期导出备份。",
  },
  {
    value: "cloud",
    label: "云端同步",
    description: "使用 Supabase 保存产品库记录，系统会自动创建匿名云端会话；适合演示云端备份能力，正式账号登录后可扩展为稳定跨设备同步。",
  },
];

export default function StorageModeSelector({ mode = "auto", onChange, disabled = false }) {
  return (
    <section className="mb-4 min-w-0 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="mb-3 flex flex-col gap-1">
        <p className="text-sm font-black text-emerald-200">存储方式</p>
        <p className="break-words text-xs leading-6 text-slate-400">选择产品库记录的保存方式。当前支持本地保存与 Supabase 云端同步；云端模式会自动创建匿名云端会话，无需注册即可保存记录。</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {storageOptions.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(option.value)}
              className={`min-w-0 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-emerald-300 bg-emerald-300/15 text-emerald-50 shadow-lg shadow-emerald-300/10"
                  : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/40 hover:bg-cyan-300/10"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span className="block break-words text-sm font-black">{option.label}</span>
              <span className="mt-2 block break-words text-xs leading-6 text-slate-400">{option.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
