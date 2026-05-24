const storageOptions = [
  {
    value: "auto",
    label: "自动选择",
    description: "云端可用时优先云端，否则回退本地。",
  },
  {
    value: "local",
    label: "仅本地保存",
    description: "适合游客体验和国内网络不稳定场景，但需要定期导出备份。",
  },
  {
    value: "cloud",
    label: "云端同步",
    description: "登录 Supabase 后可跨设备保存产品库。",
  },
];

export default function StorageModeSelector({ mode = "auto", onChange, disabled = false }) {
  return (
    <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="mb-3 flex flex-col gap-1">
        <p className="text-sm font-black text-emerald-200">存储方式</p>
        <p className="text-xs leading-6 text-slate-400">选择产品库记录的保存位置。游客模式仍可完整体验，云端同步需要 Supabase 配置和账号登录。</p>
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
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-emerald-300 bg-emerald-300/15 text-emerald-50 shadow-lg shadow-emerald-300/10"
                  : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/40 hover:bg-cyan-300/10"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span className="mt-2 block text-xs leading-6 text-slate-400">{option.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
