import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Check, Copy, FileText, ShieldCheck } from "lucide-react";
import { getRiskLevelText } from "../utils/policyRiskEngine";
import { POLICY_RISK_CATEGORY_DISPLAY } from "../data/policyRiskRules";
import {
  POLICY_REGISTRY_COVERAGE_NOTE,
  POLICY_REGISTRY_DISCLAIMER,
  POLICY_REGISTRY_FLOW,
  POLICY_REGISTRY_INTRO,
  POLICY_REGISTRY_TITLE,
  POLICY_SOURCE_GROUPS,
} from "../data/policySources";

const LEVEL_STYLE = {
  low: {
    border: "border-emerald-300/25",
    bg: "bg-emerald-300/10",
    pill: "bg-emerald-300/20 text-emerald-100",
    text: "text-emerald-100",
  },
  medium: {
    border: "border-amber-300/25",
    bg: "bg-amber-300/10",
    pill: "bg-amber-300/20 text-amber-100",
    text: "text-amber-100",
  },
  high: {
    border: "border-orange-400/30",
    bg: "bg-orange-500/10",
    pill: "bg-orange-500/20 text-orange-100",
    text: "text-orange-100",
  },
};

function fallbackCopyText(value) {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

export default function PolicyRiskPanel({
  report,
  title = "政策风险提示",
  subtitle = "基于内置政策风险规则库，对标题、正文、脚本、标签和商品卖点进行合规自检，提示可能涉及虚假宣传、绝对化用语、功效夸大、品牌侵权和平台敏感表达的内容。",
  defaultOpen = false,
  showRegistry = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  if (!report || typeof report !== "object") return null;

  const level = report.overallRiskLevel || "low";
  const style = LEVEL_STYLE[level] || LEVEL_STYLE.low;
  const hits = Array.isArray(report.hits) ? report.hits : [];
  const categories = Array.isArray(report.categories) ? report.categories : [];

  async function handleCopy(key, value) {
    if (!value) return;
    let ok = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        ok = true;
      } else {
        ok = fallbackCopyText(value);
      }
    } catch (error) {
      ok = fallbackCopyText(value);
    }
    setCopiedKey(ok ? key : "");
    const timer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
    timer(() => setCopiedKey(""), 1500);
  }

  return (
    <section className={`min-w-0 rounded-[1.5rem] border ${style.border} ${style.bg} p-4 sm:p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-white">
            {level === "low" ? (
              <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            )}
            {title}
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-300">{subtitle}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-black ${style.pill}`}>
          政策风险：{getRiskLevelText(level)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-slate-200">{report.summary}</p>

      {categories.length > 0 && (
        <p className="mt-2 text-xs leading-6 text-slate-400">
          主要风险：{categories.slice(0, 5).join("、")}
        </p>
      )}

      {hits.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-left text-sm font-bold text-white"
            aria-expanded={open}
          >
            <span>命中风险词 {hits.length} 处（点击{open ? "收起" : "展开"}详情与安全改写建议）</span>
            {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          </button>

          {open && (
            <div className="mt-3 grid gap-3">
              {hits.map((hit, index) => {
                const key = `${hit.ruleId}-${hit.field}-${hit.matchedText}-${index}`;
                return (
                  <div key={key} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-black text-white">命中词：{hit.matchedText}</span>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-300">位置：{hit.fieldLabel}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${hit.severity === "high" ? "bg-orange-500/20 text-orange-100" : "bg-amber-300/15 text-amber-100"}`}>
                        {hit.category}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-300">风险说明：{hit.riskReason}</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-emerald-100">建议改为：{hit.safeRewrite}</p>
                      <button
                        type="button"
                        onClick={() => handleCopy(key, hit.safeRewrite)}
                        className="inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl border border-emerald-200/25 bg-black/20 px-3 py-1.5 text-xs font-black text-emerald-100"
                      >
                        {copiedKey === key ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                        {copiedKey === key ? "已复制" : "复制改写"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showRegistry && <PolicySourceRegistry open={registryOpen} onToggle={() => setRegistryOpen((v) => !v)} />}

      <p className="mt-3 text-xs leading-6 text-slate-500">{report.disclaimer}</p>
    </section>
  );
}

function PolicySourceRegistry({ open, onToggle }) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2 text-left text-sm font-bold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" aria-hidden="true" />
          政策来源与合规规则说明
        </span>
        {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-slate-200">
          <p className="font-black text-white">{POLICY_REGISTRY_TITLE}</p>
          <p className="text-slate-300">{POLICY_REGISTRY_INTRO}</p>

          <div>
            <p className="font-black text-white">接入方式</p>
            <p className="mt-1 text-slate-300">{POLICY_REGISTRY_FLOW}</p>
          </div>

          <div>
            <p className="font-black text-white">政策来源</p>
            <div className="mt-2 grid gap-2">
              {POLICY_SOURCE_GROUPS.map((source) => (
                <div key={source.name} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-white">{source.name}</p>
                    <span className="rounded-full bg-emerald-300/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-100">{source.status}</span>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-slate-400">来源类型：{source.type}</p>
                  <p className="text-xs leading-6 text-slate-400">覆盖方向：{source.coverage}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-black text-white">覆盖风险类别</p>
            <p className="mt-1 text-xs leading-6 text-slate-400">{POLICY_REGISTRY_COVERAGE_NOTE}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {POLICY_RISK_CATEGORY_DISPLAY.map((cat) => (
                <span key={cat} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-200">{cat}</span>
              ))}
            </div>
          </div>

          <p className="text-xs leading-6 text-slate-500">{POLICY_REGISTRY_DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
}
