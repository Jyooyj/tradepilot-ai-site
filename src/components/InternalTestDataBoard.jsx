import { Database } from "lucide-react";
import { analyzeInternalTestData, getMaturityText } from "../utils/internalTestDataEngine";

const MATURITY_TONE = {
  low: "bg-amber-300/15 text-amber-100 border-amber-300/30",
  medium: "bg-cyan-300/15 text-cyan-100 border-cyan-300/30",
  high: "bg-emerald-300/15 text-emerald-100 border-emerald-300/30",
};

function formatPercent(value) {
  return value == null ? "待补充" : `${value.toFixed(1)}%`;
}
function formatMargin(value) {
  return value == null ? "待补充" : `${Math.round(value * 100)}%`;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

export default function InternalTestDataBoard({ records, demo = false }) {
  const data = analyzeInternalTestData(records);
  const empty = data.totalTestedProducts === 0;

  return (
    <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-200">
            <Database className="h-4 w-4" aria-hidden="true" />
            自有测款数据沉淀
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">TradePilot 自有测款知识库</h2>
        </div>
        {!empty && (
          <span className={`rounded-full border px-4 py-1.5 text-sm font-black ${MATURITY_TONE[data.dataMaturityLevel]}`}>
            数据成熟度：{getMaturityText(data.dataMaturityLevel)}
          </span>
        )}
      </div>

      {demo && (
        <p className="mt-2 inline-flex rounded-full bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-100">示例演示数据</p>
      )}

      {empty ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/20 bg-black/25 p-6 text-sm leading-7 text-slate-300">
          {data.summary}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="已沉淀测款记录" value={`${data.totalTestedProducts} 条`} />
            <Stat label="平均毛利率" value={formatMargin(data.averageGrossMargin)} />
            <Stat label="平均询价率" value={formatPercent(data.averageInquiryRate)} />
            <Stat label="平均成交率" value={formatPercent(data.averageConversionRate)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <p className="text-sm font-black text-emerald-100">表现较好的类目</p>
              <p className="mt-2 text-sm leading-7 text-emerald-50">
                {data.bestPerformingCategories.length ? data.bestPerformingCategories.join("、") : "样本不足，待积累"}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-sm font-black text-amber-100">表现较弱的类目</p>
              <p className="mt-2 text-sm leading-7 text-amber-50">
                {data.weakCategories.length ? data.weakCategories.join("、") : "样本不足，待积累"}
              </p>
            </div>
          </div>

          {data.channelStats.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-black text-cyan-100">渠道表现</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.channelStats.map((stat) => (
                  <div key={stat.channel} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                    <p className="font-black text-white">{stat.channel}（{stat.count}）</p>
                    <p className="mt-1 text-slate-400">毛利率 {formatMargin(stat.averageGrossMargin)} · 成交率 {formatPercent(stat.averageConversionRate)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recommendedActions.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-black text-white">下一步建议</p>
              <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-300">
                {data.recommendedActions.map((action) => <li key={action}>· {action}</li>)}
              </ul>
            </div>
          )}

          <p className="text-xs leading-6 text-slate-500">{data.summary}</p>
        </div>
      )}
    </section>
  );
}
