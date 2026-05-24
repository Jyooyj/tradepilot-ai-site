import { Card, Input, MetricBar, n } from "../../App.jsx";
import AiInsightPanel from "./AiInsightPanel";
import ReviewMetricChart from "./charts/ReviewMetricChart";
import { hasReviewInsightData } from "../utils/aiInsightUtils";

export default function ReviewView({
  product,
  result,
  review,
  setReview,
  saveCurrentReport,
  saveMessage,
  records,
  aiReviewInsight,
  aiReasoningLoading,
}) {
  const safeReview = review && typeof review === "object" ? review : {};
  const safeProduct = product && typeof product === "object" ? product : {};
  const safeResult = result && typeof result === "object" ? result : {};
  const safeRecords = Array.isArray(records) ? records : [];
  const views = n(safeReview.views);
  const likes = n(safeReview.likes);
  const saves = n(safeReview.saves);
  const comments = n(safeReview.comments);
  const inquiries = n(safeReview.inquiries);
  const orders = n(safeReview.orders);
  const cost = n(safeReview.cost);
  const hasReviewData = hasReviewInsightData(safeReview);

  const engagementRate = views ? ((likes + saves + comments) / views) * 100 : 0;
  const inquiryRate = views ? (inquiries / views) * 100 : 0;
  const conversionRate = inquiries ? (orders / inquiries) * 100 : 0;
  const costPerOrder = orders ? cost / orders : 0;

  let suggestion = "继续观察";
  let suggestionDetail = "先积累足够浏览和询单数据，再判断是否改内容、改价格或补货。";
  if (engagementRate >= 8 && conversionRate < 20 && inquiries > 0) {
    suggestion = "互动高但成交偏低";
    suggestionDetail = "说明内容能吸引用户，但成交信任还没有建立。建议优化售价、详情页、包装展示、材质说明、评价证明和售后承诺。";
  }
  if (views > 0 && engagementRate < 3) {
    suggestion = "内容吸引力不足";
    suggestionDetail = "建议重做封面、标题和前3秒内容，把使用前后对比、佩戴/使用场景和价格利益点提前展示。";
  }
  if (inquiryRate >= 1 && conversionRate < 20 && inquiries >= 5) {
    suggestion = "询单高但成交低";
    suggestionDetail = "用户有购买兴趣，但下单链路可能卡住了。建议检查售价、运费、付款路径、库存说明和客服回复速度。";
  }
  if (orders >= 5 && conversionRate >= 25 && costPerOrder > 0 && costPerOrder <= Math.max(safeResult.profit, 1) * 0.6) {
    suggestion = "成交好且成本可控";
    suggestionDetail = "可以进入小批量补货观察，但仍建议控制首单量，继续跟踪退换货、复购和真实利润。";
  }

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

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
        <p className="text-sm text-emerald-300">Test Review</p>
        <h2 className="break-words text-2xl font-black sm:text-3xl">测款数据复盘</h2>
        <p className="mt-2 break-words text-sm leading-7 text-slate-400">把小红书、抖音或私域的真实反馈填进来，用测款数据辅助下一步补货判断。</p>
        <button onClick={applyReviewDemo} className="mt-5 min-h-11 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black shadow-lg shadow-emerald-300/10 sm:w-auto">
          填入示例数据
        </button>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="浏览量" value={safeReview.views || ""} onChange={(value) => updateReview("views", value)} placeholder="如：3000" />
          <Input label="点赞数" value={safeReview.likes || ""} onChange={(value) => updateReview("likes", value)} placeholder="如：120" />
          <Input label="收藏数" value={safeReview.saves || ""} onChange={(value) => updateReview("saves", value)} placeholder="如：80" />
          <Input label="评论数" value={safeReview.comments || ""} onChange={(value) => updateReview("comments", value)} placeholder="如：20" />
          <Input label="私信/询单数" value={safeReview.inquiries || ""} onChange={(value) => updateReview("inquiries", value)} placeholder="如：15" />
          <Input label="实际成交数" value={safeReview.orders || ""} onChange={(value) => updateReview("orders", value)} placeholder="如：5" />
          <Input label="测款成本 / 元" value={safeReview.cost || ""} onChange={(value) => updateReview("cost", value)} placeholder="如：50" wide />
        </div>
      </section>

      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-black/35 p-4 sm:p-6">
        <h2 className="text-2xl font-black">测款复盘结论</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card label="当前产品" value={safeProduct.name || "未命名产品"} />
          <Card label="进货评分" value={`${safeResult.totalScore || 0}/100`} />
        </div>

        <div className="mt-5 space-y-4">
          <MetricBar label="互动率" value={engagementRate} max={12} suffix="%" desc="判断内容吸引力，收藏、点赞和评论越集中，说明封面与卖点越能抓住用户。" />
          <MetricBar label="询单率" value={inquiryRate} max={3} suffix="%" desc="判断购买兴趣，用户愿意私信或评论问价，说明产品已经进入购买考虑。" />
          <MetricBar label="成交转化率" value={conversionRate} max={35} suffix="%" desc="判断价格、信任和付款路径是否成立，高询单低成交时优先排查成交阻力。" />
          <MetricBar label="单均测款成本" value={costPerOrder} max={Math.max((safeResult.profit || 0) * 1.2, 20)} prefix="¥" desc="判断获客成本是否可接受，单均成本应低于可承受利润空间。" />
        </div>

        <div className="mt-6 min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-300">Review Chart</p>
              <h3 className="text-2xl font-black text-white">测款复盘可视化</h3>
            </div>
            <p className="max-w-xl text-xs leading-6 text-slate-400">
              图表仅展示已填写或已保存的复盘数据，不改变复盘结论和保存字段。
            </p>
          </div>
          <div className="overflow-x-auto">
            <ReviewMetricChart review={safeReview} records={safeRecords} />
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-emerald-300 p-5 text-black">
          <p className="text-sm font-bold opacity-70">复盘建议</p>
          <h3 className="mt-2 text-2xl font-black">{suggestion}</h3>
          <p className="mt-3 text-sm leading-7 opacity-80">
            {suggestionDetail}
          </p>
        </div>

       {hasReviewData && (
  <div className="mt-5">
    <AiInsightPanel
      title={aiReviewInsight?.source === "llm" ? "AI 测款复盘总结" : "基础测款复盘建议"}
      scenario="review_summary"
      insight={aiReviewInsight}
      loading={aiReasoningLoading && !aiReviewInsight}
      compact
    />
  </div>
)}

        <button onClick={saveCurrentReport} className="mt-5 min-h-11 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
          保存本次复盘到我的产品库
        </button>
        {saveMessage && <p className="mt-3 rounded-2xl bg-white/[0.06] p-3 text-sm text-emerald-100">{saveMessage}</p>}
      </section>
    </div>
  );
}
