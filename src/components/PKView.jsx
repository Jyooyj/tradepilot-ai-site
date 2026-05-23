import { getPkRecommendation, getRecordMetrics, getRecordStatus, money, PkMetricRow } from "../../App.jsx";
import ProductPKBarChart from "./charts/ProductPKBarChart";
import ProductPKRadarChart from "./charts/ProductPKRadarChart";

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(toFiniteNumber(value))));
}

function buildPkChartCandidate(record) {
  const metrics = getRecordMetrics(record);
  const result = record?.result || {};
  const marginScore = clampScore(toFiniteNumber(metrics.margin) * 100);
  const riskControl = clampScore(100 - toFiniteNumber(metrics.riskCount) * 18);
  const hotPotential = clampScore(
    result.hotPotentialScore ??
    result.viralPotentialScore ??
    result.contentPotentialScore ??
    metrics.contentPotential,
  );

  return {
    id: record?.id || metrics.displayName,
    name: metrics.displayName || record?.product_name || "候选产品",
    score: clampScore(metrics.score),
    hotPotential,
    profitSpace: marginScore,
    riskControl,
    contentValue: clampScore(metrics.contentPotential),
    channelFit: clampScore(result.channelFit?.score),
  };
}

export default function PKView({ records, loading, message, onRefresh, onRestore, leftId, setLeftId, rightId, setRightId }) {
  const sorted = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
  const left = sorted.find((record) => record.id === leftId) || sorted[0] || null;
  const right = sorted.find((record) => record.id === rightId) || sorted.find((record) => record.id !== left?.id) || null;
  const leftMetrics = left ? getRecordMetrics(left) : null;
  const rightMetrics = right ? getRecordMetrics(right) : null;
  const chartCandidates = [left, right, ...sorted]
    .filter(Boolean)
    .filter((record, index, source) => source.findIndex((item) => item?.id === record?.id) === index)
    .slice(0, 3)
    .map(buildPkChartCandidate);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-emerald-300">Candidate PK</p>
          <h2 className="text-3xl font-black">候选产品PK</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">按已保存产品的评分排序，帮助你快速比较哪些款更适合优先拿样、继续测款或进入补货观察。</p>
        </div>
        <button onClick={onRefresh} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">刷新候选池</button>
      </div>

      {loading && <div className="rounded-3xl bg-black/25 p-6 text-slate-300">正在读取候选产品...</div>}
      {message && <div className="mb-4 rounded-3xl bg-amber-300/10 p-5 text-amber-100">{message}</div>}

      {!loading && sorted.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center text-slate-400">
          还没有候选产品。先保存几份进货报告，再回来比较候选款。
        </div>
      )}

      {sorted.length === 1 && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
          当前只有一个候选产品。保存至少两个产品后，就可以进行完整 PK。
        </div>
      )}

      {sorted.length >= 2 && (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">候选产品 A</span>
              <select value={left?.id || ""} onChange={(event) => setLeftId(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
                {sorted.map((record) => <option key={record.id} value={record.id} className="bg-[#08100d]">{getRecordMetrics(record).displayName}</option>)}
              </select>
            </label>
            <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">候选产品 B</span>
              <select value={right?.id || ""} onChange={(event) => setRightId(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
                {sorted.map((record) => <option key={record.id} value={record.id} className="bg-[#08100d]">{getRecordMetrics(record).displayName}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-3xl bg-emerald-300 p-6 text-black">
            <p className="text-sm font-bold opacity-70">AI 推荐结论</p>
            <h3 className="mt-2 text-2xl font-black">{getPkRecommendation(left, right)}</h3>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-300">Candidate Charts</p>
                <h3 className="text-2xl font-black text-white">候选产品对比图</h3>
              </div>
              <p className="max-w-xl text-xs leading-6 text-slate-400">
                图表仅基于已保存报告字段做辅助展示，不改变原有 PK 排序、判断和保存逻辑。
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-3 font-black text-slate-100">核心维度雷达图</h4>
                <ProductPKRadarChart candidates={chartCandidates} />
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <h4 className="mb-3 font-black text-slate-100">综合分 / 爆款潜力柱状图</h4>
                <ProductPKBarChart candidates={chartCandidates} />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
            <div className="grid grid-cols-[0.9fr_1fr_1fr] border-b border-white/10 bg-white/[0.06] text-sm font-black text-slate-200">
              <div className="p-4">对比维度</div>
              <div className="p-4">{leftMetrics?.displayName}</div>
              <div className="p-4">{rightMetrics?.displayName}</div>
            </div>
            <PkMetricRow label="评分" left={`${leftMetrics?.score || 0}/100`} right={`${rightMetrics?.score || 0}/100`} />
            <PkMetricRow label="状态" left={`状态：${leftMetrics?.status || "待判断"}`} right={`状态：${rightMetrics?.status || "待判断"}`} />
            <PkMetricRow label="毛利率" left={`${Math.round((leftMetrics?.margin || 0) * 100)}%`} right={`${Math.round((rightMetrics?.margin || 0) * 100)}%`} />
            <PkMetricRow label="首批压货" left={`¥${money(leftMetrics?.stockCost || 0)}`} right={`¥${money(rightMetrics?.stockCost || 0)}`} />
            <PkMetricRow label="风险数量" left={`${leftMetrics?.riskCount || 0} 个`} right={`${rightMetrics?.riskCount || 0} 个`} />
            <PkMetricRow label="内容潜力" left={`${leftMetrics?.contentPotential || 0}/100`} right={`${rightMetrics?.contentPotential || 0}/100`} />
            <PkMetricRow label="渠道适配" left={leftMetrics?.channelFit || "待补充"} right={rightMetrics?.channelFit || "待补充"} />
            <div className="grid grid-cols-[0.9fr_1fr_1fr] border-t border-white/10">
              <div className="p-4 text-sm font-bold text-slate-400">操作</div>
              <div className="p-4"><button onClick={() => left && onRestore(left)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看</button></div>
              <div className="p-4"><button onClick={() => right && onRestore(right)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看</button></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {sorted.map((record, index) => (
          <div key={record.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-300">#{index + 1}</p>
                <h3 className="text-2xl font-black">{getRecordMetrics(record).displayName}</h3>
                <p className="mt-2 text-sm text-slate-400">{record.advice}</p>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <span className="rounded-full bg-emerald-300/10 px-3 py-2 font-bold text-emerald-200">评分 {record.score ?? 0}</span>
                <span className="px-1 py-2 font-bold text-cyan-200">状态：{getRecordStatus(record)}</span>
                <button onClick={() => onRestore(record)} className="rounded-full bg-emerald-300 px-3 py-2 font-black text-black">查看</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
