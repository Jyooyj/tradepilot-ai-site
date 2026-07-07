import { formatCount, formatPercent } from "../../utils/reviewMetrics";

// 测款转化漏斗：曝光 → 互动 → 收藏 → 询价 → 成交。
// 同一量纲（数量）分层条形图；每层标注数值与“相对上一层”的转化率。
// 不把成本/比例和数量混在同一个图里。
export default function ReviewFunnelChart({ metrics }) {
  const steps = Array.isArray(metrics?.funnelSteps) ? metrics.funnelSteps : [];
  const values = steps.map((s) => (typeof s.value === "number" ? s.value : 0));
  const maxValue = Math.max(1, ...values);

  if (!metrics?.hasData) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-sm leading-7 text-slate-400">
        暂无复盘数据，填写曝光、互动、收藏、询价和成交后将生成转化漏斗。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const hasValue = typeof step.value === "number";
        const widthPct = hasValue ? Math.max(6, Math.round((step.value / maxValue) * 100)) : 6;
        return (
          <div key={step.key} className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-bold text-slate-200">
                {index + 1}. {step.label}
              </span>
              <span className="font-black text-emerald-300">{formatCount(step.value)}</span>
            </div>
            <div className="h-9 w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <div
                className="flex h-full items-center rounded-xl bg-gradient-to-r from-emerald-400/80 to-emerald-300/40 px-3"
                style={{ width: `${widthPct}%` }}
              >
                <span className="truncate text-[11px] font-bold text-emerald-950">
                  {hasValue ? formatCount(step.value) : "待补充"}
                </span>
              </div>
            </div>
            {index > 0 && (
              <p className="mt-1 text-[11px] leading-5 text-slate-400">
                {step.rateLabel}：
                <span className={step.rate == null ? "text-slate-500" : "font-bold text-cyan-300"}>
                  {formatPercent(step.rate)}
                </span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
