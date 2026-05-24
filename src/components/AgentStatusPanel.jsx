import { useMemo } from "react";
import { getAgentState } from "../utils/agentOrchestrator";

const confidenceText = {
  low: "低",
  medium: "中",
  high: "高",
};

const confidenceClass = {
  low: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  medium: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  high: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
};

function safeItems(items, fallback) {
  return Array.isArray(items) && items.length ? items : [fallback];
}

function ChipList({ items, fallback, tone = "default" }) {
  const toneClass = tone === "risk"
    ? "border-amber-300/20 bg-amber-300/10 text-amber-50"
    : tone === "missing"
      ? "border-rose-300/20 bg-rose-300/10 text-rose-50"
      : "border-white/10 bg-white/[0.06] text-slate-200";

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {safeItems(items, fallback).map((item) => (
        <span key={item} className={`rounded-full border px-3 py-1.5 text-xs font-bold leading-5 ${toneClass}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function ActionList({ items }) {
  return (
    <ol className="mt-2 grid gap-2 sm:grid-cols-2">
      {safeItems(items, "暂无可执行操作").map((item, index) => (
        <li key={item} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold leading-5 text-slate-200">
          {index + 1}. {item}
        </li>
      ))}
    </ol>
  );
}

export default function AgentStatusPanel({
  product,
  result,
  records,
  reviewRecords,
  imageQuality,
  recognitionStatus,
}) {
  const agentState = useMemo(() => getAgentState({
    product,
    result,
    records,
    reviewRecords,
    imageQuality,
    recognitionStatus,
  }), [product, result, records, reviewRecords, imageQuality, recognitionStatus]);
  const confidence = agentState.confidenceLevel || "medium";

  return (
    <section className="rounded-[2rem] border border-emerald-300/15 bg-gradient-to-br from-white/[0.07] via-black/30 to-cyan-300/[0.05] p-5 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Workflow Agent</p>
          <h2 className="mt-1 text-2xl font-black text-white">TradePilot Agent 当前判断</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-100">
            当前阶段：{agentState.stageLabel || "待判断"}
          </span>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${confidenceClass[confidence] || confidenceClass.medium}`}>
            可信度：{confidenceText[confidence] || "中"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-bold text-slate-400">当前状态</p>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-100">
            {agentState.statusText || "Agent 正在等待更多信息。"}
          </p>
          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="text-xs font-bold text-cyan-100">推荐下一步</p>
            <p className="mt-2 text-base font-black leading-7 text-white">
              {agentState.recommendedAction || "继续补充商品信息"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-400">可执行操作列表</p>
          <ActionList items={agentState.nextActions} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-slate-400">缺失信息</p>
          <ChipList items={agentState.missingFields} fallback="暂无明显缺失" tone="missing" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400">风险关注点</p>
          <ChipList items={agentState.riskFocus} fallback="暂无明显新增风险" tone="risk" />
        </div>
      </div>
    </section>
  );
}
