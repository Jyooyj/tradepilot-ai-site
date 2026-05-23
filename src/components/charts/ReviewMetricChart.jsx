import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasReviewValue(review) {
  if (!review || typeof review !== "object") return false;
  return ["views", "likes", "saves", "comments", "inquiries", "orders", "cost"].some((key) => {
    const value = String(review[key] ?? "").trim();
    return value && toFiniteNumber(value) > 0;
  });
}

function getReviewFromRecord(record) {
  return record?.review || record?.result?.review || null;
}

function buildReviewMetrics(review, label = "当前记录") {
  const views = toFiniteNumber(review?.views);
  const likes = toFiniteNumber(review?.likes);
  const saves = toFiniteNumber(review?.saves);
  const comments = toFiniteNumber(review?.comments);
  const inquiries = toFiniteNumber(review?.inquiries);
  const orders = toFiniteNumber(review?.orders);
  const cost = toFiniteNumber(review?.cost);
  const engagement = likes + saves + comments;
  const inquiryRate = views ? (inquiries / views) * 100 : 0;
  const conversionRate = inquiries ? (orders / inquiries) * 100 : 0;

  return {
    name: label,
    曝光量: views,
    互动: engagement,
    收藏: saves,
    询价: inquiries,
    成交: orders,
    测款成本: cost,
    询价率: Number(inquiryRate.toFixed(2)),
    转化率: Number(conversionRate.toFixed(2)),
  };
}

function compactName(value, fallback) {
  const text = String(value || fallback);
  return text.length > 8 ? `${text.slice(0, 8)}...` : text;
}

export default function ReviewMetricChart({ review, records }) {
  const savedRecords = Array.isArray(records) ? records : [];
  const savedReviewRows = savedRecords
    .map((record, index) => {
      const savedReview = getReviewFromRecord(record);
      if (!hasReviewValue(savedReview)) return null;
      const label = compactName(record?.product_name || record?.product?.name, `记录${index + 1}`);
      return buildReviewMetrics(savedReview, label);
    })
    .filter(Boolean)
    .slice(0, 8);

  const currentReviewRows = hasReviewValue(review) ? [buildReviewMetrics(review, "当前填写")] : [];
  const chartRows = savedReviewRows.length >= 2 ? savedReviewRows : currentReviewRows;

  if (!chartRows.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-sm leading-7 text-slate-400">
        暂无复盘数据，完成测款记录后将生成可视化图表。
      </div>
    );
  }

  if (chartRows.length >= 2) {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 10, right: 16, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "#07130f",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 16,
                color: "#ecfdf5",
              }}
            />
            <Line type="monotone" dataKey="曝光量" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="互动" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="询价" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="成交" stroke="#f472b6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const metricRows = [
    { name: "曝光量", value: chartRows[0].曝光量 },
    { name: "互动", value: chartRows[0].互动 },
    { name: "收藏", value: chartRows[0].收藏 },
    { name: "询价", value: chartRows[0].询价 },
    { name: "成交", value: chartRows[0].成交 },
    { name: "测款成本", value: chartRows[0].测款成本 },
    { name: "询价率", value: chartRows[0].询价率 },
    { name: "转化率", value: chartRows[0].转化率 },
  ].filter((item) => item.value > 0);

  if (!metricRows.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-sm leading-7 text-slate-400">
        暂无复盘数据，完成测款记录后将生成可视化图表。
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={metricRows} layout="vertical" margin={{ top: 10, right: 18, left: 10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.12)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={72} tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#07130f",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              color: "#ecfdf5",
            }}
          />
          <Bar dataKey="value" fill="#34d399" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
