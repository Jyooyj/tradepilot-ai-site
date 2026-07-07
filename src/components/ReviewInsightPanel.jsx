// ReviewInsightPanel.jsx
// 渲染“测款复盘 AI 总结”的结构化结果（summary / keyFindings / bottleneck /
// nextActions / decision / confidence / missingData / warning）。
// LLM 成功与降级使用不同的、自然的中文文案。

const DECISION_TONE = {
  小批量补货: "bg-emerald-300 text-black",
  继续测: "bg-cyan-300/20 text-cyan-100",
  改内容再测: "bg-amber-300/20 text-amber-100",
  暂停: "bg-rose-300/20 text-rose-100",
};

const CONFIDENCE_TONE = {
  高: "text-emerald-300",
  中: "text-amber-300",
  低: "text-rose-300",
};

function List({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-200">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function ReviewInsightPanel({ insight, loading }) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/5 p-5 text-sm text-cyan-100">
        正在调用 AI 分析当前测款数据……
      </div>
    );
  }

  if (!insight) return null;

  const isLlm = insight.source === "llm";
  const title = isLlm ? "AI 测款复盘总结" : "智能测款复盘总结";
  const statusText = isLlm
    ? "AI 已基于当前测款数据生成复盘建议。"
    : "当前使用规则复盘结论。AI 服务暂未返回可用结果。";
  const badgeText = isLlm ? "AI 生成" : "规则兜底";
  const badgeTone = isLlm ? "bg-emerald-300 text-black" : "bg-white/10 text-slate-200";
  const decisionTone = DECISION_TONE[insight.decision] || "bg-white/10 text-slate-100";
  const confidenceTone = CONFIDENCE_TONE[insight.confidence] || "text-slate-300";

  return (
    <div className="rounded-3xl border border-emerald-300/20 bg-black/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-emerald-300">{title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${badgeTone}`}>{badgeText}</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">{statusText}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${decisionTone}`}>
            决策：{insight.decision || "继续测"}
          </span>
          <span className="text-xs text-slate-400">
            置信度：<span className={`font-black ${confidenceTone}`}>{insight.confidence || "低"}</span>
          </span>
        </div>
      </div>

      {!isLlm && (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] leading-5 text-slate-400">
          AI 服务暂未返回可用结果，已自动切换为规则复盘，不影响测款判断。
        </p>
      )}

      {insight.summary && (
        <p className="mt-3 break-words text-sm font-bold leading-7 text-white">{insight.summary}</p>
      )}

      {Array.isArray(insight.keyFindings) && insight.keyFindings.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-cyan-300">关键发现</p>
          <List items={insight.keyFindings} />
        </div>
      )}

      {insight.bottleneck && (
        <div className="mt-4">
          <p className="text-xs font-bold text-amber-300">主要流失环节</p>
          <p className="mt-1 break-words text-sm leading-6 text-amber-100">{insight.bottleneck}</p>
        </div>
      )}

      {Array.isArray(insight.nextActions) && insight.nextActions.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-emerald-300">下一轮动作</p>
          <List items={insight.nextActions} />
        </div>
      )}

      {Array.isArray(insight.missingData) && insight.missingData.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-6 text-slate-300">
          待补充数据：{insight.missingData.join("、")}
        </div>
      )}

      {insight.warning && (
        <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-xs leading-6 text-rose-100">
          {insight.warning}
        </div>
      )}
    </div>
  );
}
