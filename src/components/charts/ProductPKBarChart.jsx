import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(toFiniteNumber(value))));
}

function compactName(value, fallback) {
  const text = String(value || fallback);
  return text.length > 10 ? `${text.slice(0, 10)}...` : text;
}

export default function ProductPKBarChart({ candidates }) {
  const safeCandidates = Array.isArray(candidates) ? candidates.slice(0, 3) : [];
  const chartData = safeCandidates.map((candidate, index) => ({
    name: compactName(candidate?.name, `候选${index + 1}`),
    综合评分: clampScore(candidate?.score),
    爆款潜力: clampScore(candidate?.hotPotential),
  }));
  const hasChartData = chartData.some((item) => item.综合评分 > 0 || item.爆款潜力 > 0);

  if (!chartData.length || !hasChartData) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-sm leading-7 text-slate-400">
        暂无足够评分数据，保存候选产品后将生成柱状对比。
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#07130f",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              color: "#ecfdf5",
            }}
          />
          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
          <Bar dataKey="综合评分" fill="#34d399" radius={[8, 8, 0, 0]} />
          <Bar dataKey="爆款潜力" fill="#22d3ee" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
