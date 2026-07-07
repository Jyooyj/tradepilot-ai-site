// GlobalFitScorePanel.jsx
// TradePilot Global 跨境适配评分面板。
// 纯前端规则引擎结果展示，不依赖后端 AI 接口，保证静态托管 Demo 可完整展示。

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Globe, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";
import { evaluateGlobalFit } from "../utils/globalFitEngine";

const LEVEL_STYLE = {
  高: {
    border: "border-emerald-300/30",
    bg: "bg-emerald-300/10",
    pill: "bg-emerald-300/20 text-emerald-100",
    ring: "text-emerald-300",
    bar: "bg-emerald-300",
  },
  中: {
    border: "border-amber-300/30",
    bg: "bg-amber-300/10",
    pill: "bg-amber-300/20 text-amber-100",
    ring: "text-amber-300",
    bar: "bg-amber-300",
  },
  低: {
    border: "border-rose-400/30",
    bg: "bg-rose-500/10",
    pill: "bg-rose-500/20 text-rose-100",
    ring: "text-rose-300",
    bar: "bg-rose-400",
  },
};

function getScoreTone(score) {
  if (score >= 75) return "text-emerald-200";
  if (score >= 55) return "text-amber-200";
  return "text-rose-200";
}

function getBarTone(score) {
  if (score >= 75) return "bg-emerald-300";
  if (score >= 55) return "bg-amber-300";
  return "bg-rose-400";
}

function DimensionRow({ dimension }) {
  const score = Number(dimension.score) || 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-white">{dimension.label}</p>
          <p className="mt-0.5 text-xs text-slate-400">权重 {Math.round(dimension.weight * 100)}%</p>
        </div>
        <span className={`text-lg font-black ${getScoreTone(score)}`}>{score}/100</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${getBarTone(score)} transition-all`}
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
          aria-hidden="true"
        />
      </div>
      {dimension.hits && dimension.hits.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-100/90">
          {dimension.hits.map((hit, index) => (
            <li key={index}>· {hit}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NarrativeList({ title, items, tone }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <h3 className={`font-black ${tone}`}>{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
        {items.map((item, index) => (
          <li key={index}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function GlobalFitScorePanel({ product, result, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const report = useMemo(() => evaluateGlobalFit(product, result), [product, result]);

  if (!report) return null;

  const style = LEVEL_STYLE[report.level] || LEVEL_STYLE["中"];
  const recommendationTone =
    report.recommendation.startsWith("建议")
      ? "text-emerald-200"
      : report.recommendation.startsWith("谨慎")
        ? "text-amber-200"
        : "text-rose-200";

  return (
    <section className={`min-w-0 rounded-[2rem] border ${style.border} ${style.bg} p-4 sm:p-6`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-white">
            <Globe className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            TradePilot Global · 跨境出海判断
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">跨境适配评分 / Global Fit Score</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            基于价格带、体积重量、破损、退货、内容表达与合规敏感度六项维度，对当前商品是否适合低客单跨境出海给出辅助判断。
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-black ${style.pill}`}>
            {report.level === "高" ? (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            )}
            跨境适配等级：{report.level}
          </span>
          <span className="text-3xl font-black text-white">
            {report.totalScore}
            <span className="text-base font-bold text-slate-300">/100</span>
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs text-slate-400">跨境适配总分</p>
          <p className="mt-1 text-xl font-black text-white">{report.totalScore}/100</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs text-slate-400">跨境适配等级</p>
          <p className={`mt-1 text-xl font-black ${style.ring}`}>{report.level}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs text-slate-400">是否建议进入跨境测款</p>
          <p className={`mt-1 text-base font-black ${recommendationTone}`}>{report.recommendation}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs text-slate-400">数据来源</p>
          <p className="mt-1 text-sm font-bold text-slate-200">
            前端规则引擎
            <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">离线可用</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-left text-sm font-bold text-white"
          aria-expanded={open}
        >
          <span>展开六维评分明细与跨境行动建议（点击{open ? "收起" : "展开"}）</span>
          {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.dimensions.map((dimension) => (
              <DimensionRow key={dimension.key} dimension={dimension} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <NarrativeList
              title="主要优势"
              items={report.advantages}
              tone="text-emerald-100"
            />
            <NarrativeList
              title="主要风险"
              items={report.risks}
              tone="text-rose-100"
            />
            <NarrativeList
              title="下一步建议"
              items={report.nextActions}
              tone="text-cyan-100"
            />
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
        <p className="flex items-center gap-2 font-black">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          跨境测款建议
        </p>
        <p className="mt-2 text-cyan-50/90">{report.recommendation}。</p>
        <p className="mt-1 text-xs leading-6 text-cyan-100/80">
          首单建议小批量（50–100 件）走小包物流测款，结合点击率、加购率、退货率和实际履约成本再决定是否补货。
        </p>
      </div>

      <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-6 text-amber-100">
        {report.disclaimer}
      </p>
    </section>
  );
}
