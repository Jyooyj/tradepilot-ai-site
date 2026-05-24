import { AlertTriangle, CheckCircle2, Lightbulb, ListChecks, Sparkles } from "lucide-react";
import {
  AI_INSIGHT_UNAVAILABLE_MESSAGE,
  buildAiInsightFallback,
  getAiInsightTitle,
  normalizeAiInsight,
} from "../utils/aiInsightUtils";

function InsightList({ title, icon: Icon, items, tone = "default" }) {
  const colorClass = tone === "risk"
    ? "text-amber-100"
    : tone === "action"
      ? "text-emerald-100"
      : "text-slate-200";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-200" aria-hidden="true" />
        <h4 className="text-sm font-black text-white">{title}</h4>
      </div>
      <ul className={`mt-3 space-y-2 text-sm leading-6 ${colorClass}`}>
        {(items || []).slice(0, 4).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-cyan-200/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AiInsightPanel({
  title,
  scenario = "purchase_decision",
  insight,
  loading = false,
  compact = false,
}) {
  const normalizedInsight = insight
    ? normalizeAiInsight(insight, scenario)
    : buildAiInsightFallback(scenario);
  const isFallback = normalizedInsight.source !== "llm";
  const displayTitle = title || getAiInsightTitle(scenario);

  return (
    <article className="rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-5 shadow-lg shadow-cyan-950/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-200" aria-hidden="true" />
            <h3 className="text-xl font-black text-white">{displayTitle}</h3>
          </div>
          <p className="mt-2 text-sm leading-7 text-cyan-50">
            {loading ? "AI 正在生成推理补充，规则报告已可正常使用。" : normalizedInsight.summary}
          </p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${
          isFallback
            ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
            : "border-emerald-200/30 bg-emerald-300/10 text-emerald-100"
        }`}>
          {isFallback ? "fallback" : "LLM"}
        </span>
      </div>

      {isFallback && !loading && (
        <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-6 text-amber-100">
          {AI_INSIGHT_UNAVAILABLE_MESSAGE}
        </p>
      )}

      {!compact && (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <InsightList title="推理要点" icon={ListChecks} items={normalizedInsight.reasoningPoints} />
          <InsightList title="下一步建议" icon={Lightbulb} items={normalizedInsight.nextActions} tone="action" />
          <InsightList title="风险提醒" icon={AlertTriangle} items={normalizedInsight.riskWarnings} tone="risk" />
        </div>
      )}

      {compact && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InsightList title="关键判断" icon={ListChecks} items={normalizedInsight.reasoningPoints} />
          <InsightList title="下一轮动作" icon={Lightbulb} items={normalizedInsight.nextActions} tone="action" />
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-slate-300">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-200" aria-hidden="true" />
        <p>{normalizedInsight.confidenceNote}</p>
      </div>
    </article>
  );
}
