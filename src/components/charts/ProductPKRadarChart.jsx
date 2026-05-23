import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const chartColors = ["#34d399", "#22d3ee", "#fbbf24"];

const dimensions = [
  ["score", "综合评分"],
  ["hotPotential", "爆款潜力"],
  ["profitSpace", "利润空间"],
  ["riskControl", "风险控制"],
  ["contentValue", "内容测款价值"],
  ["channelFit", "渠道适配"],
];

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(toFiniteNumber(value))));
}

export default function ProductPKRadarChart({ candidates }) {
  const safeCandidates = Array.isArray(candidates) ? candidates.slice(0, 3) : [];
  const visibleCandidates = safeCandidates.map((candidate, index) => ({
    id: candidate?.id || `candidate-${index}`,
    name: candidate?.name || `候选产品 ${index + 1}`,
    score: clampScore(candidate?.score),
    hotPotential: clampScore(candidate?.hotPotential),
    profitSpace: clampScore(candidate?.profitSpace),
    riskControl: clampScore(candidate?.riskControl),
    contentValue: clampScore(candidate?.contentValue),
    channelFit: clampScore(candidate?.channelFit),
  }));

  const hasChartData = visibleCandidates.some((candidate) =>
    dimensions.some(([key]) => candidate[key] > 0),
  );

  if (!visibleCandidates.length || !hasChartData) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-sm leading-7 text-slate-400">
        暂无足够评分数据，保存带有完整评分的候选产品后将生成雷达图。
      </div>
    );
  }

  const chartData = dimensions.map(([key, label]) => {
    const row = { dimension: label };
    visibleCandidates.forEach((candidate) => {
      row[candidate.name] = candidate[key];
    });
    return row;
  });

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.16)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "#07130f",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              color: "#ecfdf5",
            }}
          />
          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
          {visibleCandidates.map((candidate, index) => (
            <Radar
              key={candidate.id}
              dataKey={candidate.name}
              stroke={chartColors[index % chartColors.length]}
              fill={chartColors[index % chartColors.length]}
              fillOpacity={0.14}
              strokeWidth={2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
