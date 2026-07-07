import { useEffect, useState } from "react";
import { Card, Input } from "../../App.jsx";
import ReviewFunnelChart from "./charts/ReviewFunnelChart";
import ReviewInsightPanel from "./ReviewInsightPanel";
import InternalTestDataBoard from "./InternalTestDataBoard";
import { hasReviewInsightData } from "../utils/aiInsightUtils";
import { buildReviewMetrics, buildReviewMetricCards } from "../utils/reviewMetrics";
import { generateReviewInsight } from "../utils/reviewInsightClient";

const DECISION_TONE = {
  小批量补货: "bg-emerald-300 text-black",
  继续测: "bg-cyan-300/20 text-cyan-100",
  改内容再测: "bg-amber-300/20 text-amber-100",
  暂停: "bg-rose-300/20 text-rose-100",
};

export default function ReviewView({
  product,
  result,
  review,
  setReview,
  saveCurrentReport,
  saveMessage,
  records,
}) {
  const safeReview = review && typeof review === "object" ? review : {};
  const safeProduct = product && typeof product === "object" ? product : {};
  const safeResult = result && typeof result === "object" ? result : {};
  const hasReviewData = hasReviewInsightData(safeReview);

  const productContext = {
    productName: safeResult.productExpression?.displayName || safeProduct.name || "未命名产品",
    category: safeResult.productIdentity?.productTypeLabel || safeProduct.category || "",
    targetAudience: safeProduct.audience || "",
    sellingChannels: safeProduct.channel || "",
    price: safeProduct.price || "",
    suggestedPrice: safeProduct.price || "",
    grossProfit: safeResult.profit,
    grossMargin: safeResult.margin,
  };

  const metrics = buildReviewMetrics(safeReview, productContext);
  const metricCards = buildReviewMetricCards(metrics);

  const [reviewInsight, setReviewInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // 测款数据变化时调用 LLM 生成复盘总结；失败安全降级为规则版。
  const signature = JSON.stringify({
    v: safeReview.views,
    l: safeReview.likes,
    s: safeReview.saves,
    c: safeReview.comments,
    i: safeReview.inquiries,
    o: safeReview.orders,
    cost: safeReview.cost,
    name: productContext.productName,
  });

  useEffect(() => {
    if (!hasReviewData) {
      setReviewInsight(null);
      setInsightLoading(false);
      return undefined;
    }
    let active = true;
    setInsightLoading(true);
    generateReviewInsight({ reviewData: safeReview, productContext, metrics })
      .then((res) => {
        if (active) setReviewInsight(res);
      })
      .finally(() => {
        if (active) setInsightLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, hasReviewData]);

  function updateReview(key, value) {
    setReview((old) => ({ ...old, [key]: value }));
  }

  function applyReviewDemo() {
    setReview({
      views: "4200",
      likes: "260",
      saves: "180",
      comments: "42",
      inquiries: "68",
      orders: "16",
      cost: "120",
    });
  }

  const decisionTone = DECISION_TONE[metrics.decision] || "bg-white/10 text-slate-100";

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <p className="text-sm text-emerald-300">Test Review</p>
          <h2 className="break-words text-2xl font-black sm:text-3xl">测款数据复盘</h2>
          <p className="mt-2 break-words text-sm leading-7 text-slate-400">把小红书、抖音或私域的真实反馈填进来，用测款数据辅助下一步补货判断。</p>
        <button onClick={applyReviewDemo} className="mt-5 min-h-11 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black shadow-lg shadow-emerald-300/10 sm:w-auto">
          填入示例数据
        </button>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="浏览量 / 曝光量" value={safeReview.views || ""} onChange={(value) => updateReview("views", value)} placeholder="如：3000" />
          <Input label="点赞数" value={safeReview.likes || ""} onChange={(value) => updateReview("likes", value)} placeholder="如：120" />
          <Input label="收藏数" value={safeReview.saves || ""} onChange={(value) => updateReview("saves", value)} placeholder="如：80" />
          <Input label="评论数" value={safeReview.comments || ""} onChange={(value) => updateReview("comments", value)} placeholder="如：20" />
          <Input label="私信/询单数" value={safeReview.inquiries || ""} onChange={(value) => updateReview("inquiries", value)} placeholder="如：15" />
          <Input label="实际成交数" value={safeReview.orders || ""} onChange={(value) => updateReview("orders", value)} placeholder="如：5" />
          <Input label="测款成本 / 元" value={safeReview.cost || ""} onChange={(value) => updateReview("cost", value)} placeholder="如：50" wide />
        </div>
        {metrics.missingFields.length > 0 && (
          <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs leading-6 text-amber-100">
            待补充：{metrics.missingFields.join("、")}。补全后漏斗与复盘建议会更准确。
          </p>
        )}
      </section>

      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-black/35 p-4 sm:p-6">
        <h2 className="text-2xl font-black">测款复盘结论</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card label="当前产品" value={productContext.productName} />
          <Card label="进货评分" value={`${safeResult.totalScore || 0}/100`} />
        </div>

        {/* 关键指标卡 */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((card) => (
            <div key={card.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] font-bold text-slate-400">{card.label}</p>
              <p className={`mt-1 text-xl font-black ${card.value === "待补充" ? "text-slate-500" : "text-emerald-300"}`}>{card.value}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">{card.hint}</p>
            </div>
          ))}
        </div>

        {/* 转化漏斗 */}
        <div className="mt-6 min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-sm font-bold text-cyan-300">测款转化漏斗</p>
            <p className="mt-1 text-xs leading-6 text-slate-400">从曝光到成交，判断用户在哪一步流失（数量同一量纲，比例单独标注）。</p>
          </div>
          <ReviewFunnelChart metrics={metrics} />
        </div>

        {/* 决策象限 / 判断结果 */}
        <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-emerald-300">规则判断结果</p>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${decisionTone}`}>决策：{metrics.decision}</span>
              <span className="text-xs text-slate-300">置信度：<span className="font-black text-emerald-300">{metrics.confidenceLevel}</span></span>
            </div>
          </div>
          <p className="mt-3 break-words text-sm leading-7 text-emerald-50">{metrics.judgment}</p>
          {metrics.decisionReason && (
            <p className="mt-2 break-words text-xs leading-6 text-slate-300">数据解读：{metrics.decisionReason}</p>
          )}
        </div>

        {/* AI 复盘总结 */}
        {hasReviewData && (
          <div className="mt-5">
            <ReviewInsightPanel insight={reviewInsight} loading={insightLoading && !reviewInsight} />
          </div>
        )}

        <button onClick={saveCurrentReport} className="mt-5 min-h-11 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
          保存本次复盘到我的产品库
        </button>
        {saveMessage && <p className="mt-3 rounded-2xl bg-white/[0.06] p-3 text-sm text-emerald-100">{saveMessage}</p>}
      </section>
      </div>
      <InternalTestDataBoard records={records} />
    </div>
  );
}
