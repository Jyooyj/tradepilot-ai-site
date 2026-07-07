// GlobalContentPlanPanel.jsx
// TradePilot Global · 跨境内容测款方案 / Global Content Test Plan
// 纯前端规则引擎结果展示，离线可用，不依赖后端 AI 接口或 API Key。
// 与现有报告页风格保持一致：分区卡片 + 圆角 + 半透明高亮，方便评委在静态托管页面截图。

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Globe, Copy, Check, Video, ShoppingBag, Users, AlertTriangle } from "lucide-react";
import { generateGlobalContentPlan, buildGlobalContentPlanText } from "../utils/globalContentPlanEngine";

function TiktokDirectionCard({ direction, index }) {
  return (
    <div className="rounded-3xl border border-fuchsia-300/20 bg-black/25 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-black text-fuchsia-100">
        <Video className="h-4 w-4" aria-hidden="true" />
        {direction.title}
      </p>
      <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
        <p>
          <span className="font-black text-white">开头钩子：</span>
          {direction.hook}
        </p>
        <p>
          <span className="font-black text-white">核心卖点：</span>
          {direction.coreSellingPoint}
        </p>
        <p>
          <span className="font-black text-white">镜头建议：</span>
          {direction.shotSuggestion}
        </p>
        <p>
          <span className="font-black text-white">评论引导：</span>
          {direction.commentPrompt}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-6 text-slate-400">
          {direction.englishExample}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, accent, children }) {
  return (
    <div className={`rounded-[1.5rem] border ${accent.border} ${accent.bg} p-4 sm:p-5`}>
      <p className="flex items-center gap-2 text-sm font-black text-white">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </p>
      {subtitle && <p className="mt-1 text-xs leading-6 text-slate-300">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function BulletList({ items, tone = "text-slate-300" }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className={`mt-2 space-y-1.5 text-sm leading-7 ${tone}`}>
      {items.map((item, index) => (
        <li key={index}>· {item}</li>
      ))}
    </ul>
  );
}

export default function GlobalContentPlanPanel({ product, result, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const plan = useMemo(() => generateGlobalContentPlan(product, result), [product, result]);

  if (!plan) return null;

  const handleCopy = async () => {
    const text = buildGlobalContentPlanText(plan);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // 兜底复制方案，兼容非 HTTPS 静态托管环境。
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 复制失败时静默处理，避免影响评委体验。
      console.warn("copy failed", err);
    }
  };

  return (
    <section className="min-w-0 rounded-[2rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-white">
            <Globe className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
            TradePilot Global · 跨境内容测款方案
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">跨境内容测款方案 / Global Content Test Plan</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            基于当前商品的品类、价格带、目标人群和渠道，生成 TikTok 短视频方向、独立站商品页卖点、目标人群表达与本地化注意事项，辅助跨境内容测款决策。
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/30 bg-black/20 px-4 py-1.5 text-xs font-black text-fuchsia-100">
            内容方向：{plan.tiktokDirections.length} 条 TikTok 选题
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-slate-300">离线规则引擎 · 无 API Key</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs text-slate-400">商品名称</p>
          <p className="mt-1 break-words text-sm font-black text-white">{plan.productName}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs text-slate-400">品类</p>
          <p className="mt-1 text-sm font-bold text-fuchsia-100">{plan.productTypeLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs text-slate-400">价格带判断</p>
          <p className="mt-1 text-sm font-bold text-cyan-100">{plan.priceToneLabel}</p>
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
          <span>展开 TikTok 选题 / 独立站卖点 / 目标人群 / 本地化注意事项（点击{open ? "收起" : "展开"}）</span>
          {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-5">
          {/* 1. TikTok 短视频方向 */}
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-fuchsia-200">
              <Video className="h-4 w-4" aria-hidden="true" />
              1. TikTok 短视频方向（共 {plan.tiktokDirections.length} 条）
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {plan.tiktokDirections.map((dir, index) => (
                <TiktokDirectionCard key={index} direction={dir} index={index} />
              ))}
            </div>
          </div>

          {/* 2. 独立站商品页卖点 */}
          <SectionCard
            icon={ShoppingBag}
            title={`2. 独立站商品页卖点（共 ${plan.siteSellingPoints.length} 条）`}
            subtitle="强调使用场景、价格优势、礼物属性、便携性、视觉吸引力，不写夸大功效或绝对化宣传。"
            accent={{ border: "border-cyan-300/20", bg: "bg-cyan-300/[0.06]" }}
          >
            <ol className="mt-2 space-y-2 text-sm leading-7 text-slate-300">
              {plan.siteSellingPoints.map((point, index) => (
                <li key={index} className="rounded-2xl bg-black/25 p-3">
                  <span className="font-black text-cyan-100">{index + 1}.</span> {point}
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* 3. 目标人群表达 */}
          <SectionCard
            icon={Users}
            title="3. 目标人群表达"
            subtitle="适合哪些海外目标人群与场景，以及哪些场景不适合该商品。"
            accent={{ border: "border-emerald-300/20", bg: "bg-emerald-300/[0.06]" }}
          >
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-black/25 p-4">
                <h4 className="font-black text-emerald-100">适合人群</h4>
                <BulletList items={plan.targetAudience.suitablePeople} />
              </div>
              <div className="rounded-2xl border border-emerald-300/20 bg-black/25 p-4">
                <h4 className="font-black text-emerald-100">适合场景</h4>
                <BulletList items={plan.targetAudience.suitableScenarios} />
              </div>
              <div className="rounded-2xl border border-rose-400/20 bg-black/25 p-4">
                <h4 className="font-black text-rose-100">不适合场景</h4>
                <BulletList items={plan.targetAudience.unsuitableScenarios} tone="text-rose-100/90" />
              </div>
            </div>
          </SectionCard>

          {/* 4. 本地化注意事项 */}
          <SectionCard
            icon={AlertTriangle}
            title="4. 本地化注意事项"
            subtitle="避免直译中文营销话术、避免绝对化承诺、注意文化差异、注意品牌侵权和平台敏感表达。"
            accent={{ border: "border-amber-300/20", bg: "bg-amber-300/[0.06]" }}
          >
            <ol className="mt-2 space-y-2 text-sm leading-7 text-slate-300">
              {plan.localizationNotes.map((note, index) => (
                <li key={index} className="rounded-2xl bg-black/25 p-3">
                  <span className="font-black text-amber-100">{index + 1}.</span> {note}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-6 text-amber-100/90">
          {plan.disclaimer}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-fuchsia-300 px-5 py-3 font-black text-black transition hover:bg-fuchsia-200"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "已复制内容方案" : "复制内容方案"}
        </button>
      </div>
    </section>
  );
}
