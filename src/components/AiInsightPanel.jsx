import { AlertTriangle, CheckCircle2, Lightbulb, ListChecks, Sparkles } from "lucide-react";
import {
  buildAiInsightFallback,
  getAiInsightTitle,
  normalizeAiInsight,
} from "../utils/aiInsightUtils";

const TECHNICAL_FALLBACK_PATTERNS = [
  /fallback/gi,
  /timeout/gi,
  /请求超时/g,
  /接口异常/g,
  /AI\s*推理补充暂不可用/g,
  /AI\s*内容测款策略暂不可用/g,
  /已保留原内容包和规则报告/g,
  /已保留规则报告/g,
];

const FRIENDLY_FALLBACK_SUMMARY =
  "当前已基于商品信息、规则报告和用户填写内容生成可执行建议。后续如启用实时 LLM 推理，系统可进一步补充更细化的策略分析。";

const FRIENDLY_FALLBACK_NOTE =
  "当前展示为基础策略建议，已保留进货判断、内容测款和风险提示，不影响报告使用。";

function cleanUserFacingText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  const raw = String(value).trim();
  if (!raw) return fallback;

  const hasTechnicalText = TECHNICAL_FALLBACK_PATTERNS.some((pattern) => pattern.test(raw));
  if (hasTechnicalText) return fallback;

  return raw;
}

function cleanListItems(items, fallbackItems = []) {
  const safeItems = Array.isArray(items) ? items : [];

  const cleanedItems = safeItems
    .map((item) => cleanUserFacingText(item, ""))
    .filter(Boolean);

  return cleanedItems.length > 0 ? cleanedItems : fallbackItems;
}

function getFriendlyFallbackInsight(normalizedInsight, scenario) {
  const fallbackByScenario = {
    purchase_decision: {
      summary: "当前已基于商品信息、利润测算、MOQ 和风险判断生成基础进货建议，可先用于小批量拿样决策。",
      reasoningPoints: [
        "规则报告已经覆盖利润空间、首批压货资金、MOQ 和基础风险判断。",
        "当前建议优先用于判断是否小批量拿样，而不是直接大量补货。",
        "如果市场证据不足，应先补充竞品价格、内容热度或供应商信息。",
      ],
      nextActions: [
        "先核对拿货价、建议售价和 MOQ 是否准确。",
        "补充 1-2 个竞品价格作为参考。",
        "优先小批量拿样，并通过内容测款验证真实反馈。",
      ],
      riskWarnings: [
        "不要把规则评分理解为销量预测。",
        "市场证据不足时，不建议直接大量进货。",
        "供应商价格、包装费和运费需要在拿样前再次确认。",
      ],
    },
    content_testing: {
      summary: "当前已基于商品信息、目标人群和规则报告生成基础内容测款建议，可用于首轮小范围测试。",
      reasoningPoints: [
        "原小红书内容包和抖音脚本仍可作为首轮测款参考。",
        "内容测试应验证用户是否理解卖点，而不是直接判断商品必爆。",
        "如果缺少市场证据，应把测试目标设为探索反馈，而不是放大投放。",
      ],
      nextActions: [
        "首轮准备 2-3 个封面或开头角度，对比点击、收藏、评论和询单。",
        "小红书重点表达使用场景、风格搭配和价格理由。",
        "抖音前 3 秒优先展示痛点、对比或上身/使用效果。",
      ],
      riskWarnings: [
        "避免照搬同类爆款话术导致内容同质化。",
        "不要编造播放量、点赞量或真实成交数据。",
        "首轮测款样本较小时，不建议直接据此大量补货。",
      ],
    },
    review_summary: {
      summary: "当前已基于测款数据生成基础复盘建议，可用于判断是否继续测试、调整内容或谨慎补货。",
      reasoningPoints: [
        "复盘应同时观察曝光、互动、询单和成交，不只看单一指标。",
        "如果互动高但成交低，可能需要检查价格、信任感或购买路径。",
        "如果曝光低但点击反馈不错，可以优先优化封面、标题和发布时间。",
      ],
      nextActions: [
        "对比互动率、询单率和成交率，判断问题出在内容还是商品本身。",
        "保留表现较好的内容角度，再做一轮小范围测试。",
        "补货前再次确认供应商价格、库存和发货周期。",
      ],
      riskWarnings: [
        "单次测款数据不足时，不建议直接大量补货。",
        "测款成本过高时，需要降低内容制作或投放成本。",
        "成交少不一定代表商品无效，也可能是内容表达或价格设置问题。",
      ],
    },
  };

  const preset = fallbackByScenario[scenario] || fallbackByScenario.purchase_decision;

  return {
    ...normalizedInsight,
    summary: cleanUserFacingText(normalizedInsight.summary, preset.summary),
    reasoningPoints: cleanListItems(normalizedInsight.reasoningPoints, preset.reasoningPoints),
    nextActions: cleanListItems(normalizedInsight.nextActions, preset.nextActions),
    riskWarnings: cleanListItems(normalizedInsight.riskWarnings, preset.riskWarnings),
    confidenceNote: cleanUserFacingText(normalizedInsight.confidenceNote, FRIENDLY_FALLBACK_NOTE),
  };
}

function InsightList({ title, icon: Icon, items, tone = "default" }) {
  const colorClass = tone === "risk"
    ? "text-amber-100"
    : tone === "action"
      ? "text-emerald-100"
      : "text-slate-200";

  const safeItems = Array.isArray(items) ? items.filter(Boolean).slice(0, 4) : [];

  if (safeItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-200" aria-hidden="true" />
        <h4 className="text-sm font-black text-white">{title}</h4>
      </div>
      <ul className={`mt-3 space-y-2 text-sm leading-6 ${colorClass}`}>
        {safeItems.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-cyan-200/80" />
            <span className="break-words">{item}</span>
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
  const baseInsight = insight
    ? normalizeAiInsight(insight, scenario)
    : buildAiInsightFallback(scenario);

  const isLlmInsight = baseInsight.source === "llm";
  const normalizedInsight = isLlmInsight
    ? {
        ...baseInsight,
        summary: cleanUserFacingText(baseInsight.summary, FRIENDLY_FALLBACK_SUMMARY),
        reasoningPoints: cleanListItems(baseInsight.reasoningPoints),
        nextActions: cleanListItems(baseInsight.nextActions),
        riskWarnings: cleanListItems(baseInsight.riskWarnings),
        confidenceNote: cleanUserFacingText(baseInsight.confidenceNote, "本建议基于当前商品信息、报告结果和市场证据生成，请结合实际测款数据复核。"),
      }
    : getFriendlyFallbackInsight(baseInsight, scenario);

  const displayTitle = title || getAiInsightTitle(scenario);
  const badgeText = isLlmInsight ? "AI 智能推理" : "基础策略建议";
  const summaryText = loading
    ? "AI 正在生成推理补充，规则报告已可正常使用。"
    : normalizedInsight.summary;

  return (
    <article className="rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-4 shadow-lg shadow-cyan-950/10 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 flex-none text-cyan-200" aria-hidden="true" />
            <h3 className="break-words text-lg font-black text-white sm:text-xl">{displayTitle}</h3>
          </div>
          <p className="mt-2 break-words text-sm leading-7 text-cyan-50">
            {summaryText}
          </p>
        </div>

        <span className={`w-fit flex-none rounded-full border px-3 py-1.5 text-xs font-black ${
          isLlmInsight
            ? "border-emerald-200/30 bg-emerald-300/10 text-emerald-100"
            : "border-cyan-200/30 bg-cyan-300/10 text-cyan-100"
        }`}>
          {badgeText}
        </span>
      </div>

      {!isLlmInsight && !loading && (
        <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-black/20 p-3 text-xs leading-6 text-cyan-50">
          当前展示为规则增强版建议，已保留进货判断、内容测款和风险提示，不影响报告使用。
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
        <p className="break-words">{normalizedInsight.confidenceNote || FRIENDLY_FALLBACK_NOTE}</p>
      </div>
    </article>
  );
}
