import { Card, formatEffectivePrice, getScoringItems, MaterialChecklistCard, money, SamplingStrategyCard, Score, StructuredReport } from "../../App.jsx";
import AgentStatusPanel from "./AgentStatusPanel";
import AiInsightPanel from "./AiInsightPanel";
import SupplierCommunicationPanel from "./SupplierCommunicationPanel";
import { hasReviewInsightData } from "../utils/aiInsightUtils";

const douyinHeatLevelText = {
  high: "高",
  medium: "中",
  low: "低",
  unknown: "未知",
};

function getDouyinEvidence(result) {
  return result?.douyinEvidence || result?.marketEvidence?.douyin || null;
}

const pricePositionText = {
  below_market: "低于竞品区间",
  within_market: "处于竞品区间",
  above_market: "高于竞品区间",
  unknown: "未知",
};

const dataCompletenessText = {
  high: "高",
  medium: "中",
  low: "低",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function getPriceEvidence(result) {
  const marketEvidence = asObject(result?.marketEvidence);
  const priceEvidence = result?.priceEvidence || marketEvidence.price || null;

  if (!priceEvidence || typeof priceEvidence !== "object") return null;

  const safePriceEvidence = asObject(priceEvidence);

  return {
    ...safePriceEvidence,
    competitorPriceRange: asObject(safePriceEvidence.competitorPriceRange),
    wholesaleResults: asArray(safePriceEvidence.wholesaleResults),
    retailResults: asArray(safePriceEvidence.retailResults),
    searchLinks: asArray(safePriceEvidence.searchLinks),
    riskWarnings: asArray(safePriceEvidence.riskWarnings),
  };
}

function getManualMarketEvidence(result) {
  return result?.manualMarketEvidence || result?.marketEvidence?.manual || null;
}

function formatPriceRange(range) {
  if (!range?.isValid) return "待补充";
  if (range.min === range.max) return `¥${range.min}`;
  return `¥${range.min} - ¥${range.max}`;
}

export default function ResultView({
  product,
  image,
  result,
  analyzed,
  records,
  reviewRecords,
  imageQuality,
  recognitionStatus,
  setMode,
  copyReport,
  copied,
  saveCurrentReport,
  saveMessage,
  aiInsight,
  aiReasoningInsights,
  aiReasoningLoading,
  reviewData,
  downloadReport,
  onExportPdfReport,
}) {
  if (!result || typeof result !== "object") {
    return (
      <div className="rounded-[2rem] border border-dashed border-white/20 bg-white/[0.06] p-5 text-sm leading-7 text-slate-300 sm:p-6">
        暂无可展示的报告结果。请返回开始判断页，补充商品信息后重新生成报告。
      </div>
    );
  }

  const douyinEvidence = getDouyinEvidence(result);
  const priceEvidence = getPriceEvidence(result);
  const manualMarketEvidence = getManualMarketEvidence(result);
  const defaultRiskWarning = "暂无明确高风险，但建议继续核验同款价格、内容热度和成交反馈。";
  const priceRiskWarnings = asArray(priceEvidence?.riskWarnings).length ? asArray(priceEvidence?.riskWarnings) : [defaultRiskWarning];
  const visiblePriceSearchLinks = asArray(priceEvidence?.searchLinks).filter((link) => link?.platform !== "1688" && !String(link?.label || "").includes("1688"));
  const priceSearchLinks = visiblePriceSearchLinks.length
    ? visiblePriceSearchLinks
    : priceEvidence?.query
      ? [{
          label: "淘宝搜索参考",
          url: `https://s.taobao.com/search?q=${encodeURIComponent(priceEvidence.query)}`,
          purpose: "人工查看零售价、竞品标题、主图和价格带。",
        }]
      : [];
  const priceAnalysisConclusions = asArray(priceEvidence?.analysisConclusions);
  const priceNextActions = asArray(priceEvidence?.nextActions).length ? asArray(priceEvidence?.nextActions) : ["继续核验同款价格、规格、起订量和运费，确认当前价格判断可复盘。"];
  const manualRiskWarnings = asArray(manualMarketEvidence?.riskWarnings).length ? asArray(manualMarketEvidence?.riskWarnings) : [defaultRiskWarning];
  const manualAnalysisConclusions = asArray(manualMarketEvidence?.analysisConclusions);
  const manualNextActions = asArray(manualMarketEvidence?.nextActions).length ? asArray(manualMarketEvidence?.nextActions) : ["先小批量测款，观察点击、收藏、询价和成交后再决定是否扩大进货。"];
  const douyinRiskWarnings = asArray(douyinEvidence?.riskWarnings).length ? asArray(douyinEvidence?.riskWarnings) : [defaultRiskWarning];
  const douyinAnalysisConclusions = asArray(douyinEvidence?.analysisConclusions);
  const douyinNextActions = asArray(douyinEvidence?.nextActions).length ? asArray(douyinEvidence?.nextActions) : ["先做小样内容测试，再根据互动和询价反馈决定是否进货。"];
  const douyinSearchLinks = asArray(douyinEvidence?.searchLinks).slice(0, 1);
  const marketEvidenceNotice = "当前为市场证据模式：未调用外部平台 API，不生成或伪造平台真实价格、销量、点赞、播放数据；系统基于用户填写信息和搜索入口进行辅助判断。";
  const hasMarketEvidence = Boolean(priceEvidence || douyinEvidence || manualMarketEvidence);
  const agentResult = analyzed ? result : null;
  const reasoningInsights = aiReasoningInsights && typeof aiReasoningInsights === "object" ? aiReasoningInsights : {};
  const showReviewInsight = hasReviewInsightData(reviewData);

  return (
    <div className="min-w-0 space-y-6 break-words">
      {!analyzed && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
          当前展示的是实时预览结果，建议返回开始判断页面生成正式报告。
        </div>
      )}

      <AgentStatusPanel
        product={product}
        result={agentResult}
        records={records}
        reviewRecords={reviewRecords}
        imageQuality={imageQuality}
        recognitionStatus={recognitionStatus}
      />

      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-emerald-300">Key Conclusion</p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">进货关键结论</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400 sm:text-base">先确认状态和关键指标，再展开查看评分依据与完整报告。</p>
          </div>
          <span className="w-fit text-sm font-bold text-cyan-200">状态：{result.status}</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="综合评分" value={`${result.totalScore}/100`} />
          <Card label="AI建议" value={result.level} />
          <Card label="预计毛利率" value={`${Math.round(result.margin * 100)}%`} />
          <Card label="首批压货" value={`¥${money(result.stockCost)}`} />
        </div>
      </section>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
            <p className="text-sm text-slate-400">当前产品</p>
            <h2 className="mt-2 break-words text-2xl font-black text-emerald-300 sm:text-3xl">{result.productIdentity?.displayName || product.name || "未命名产品"}</h2>
            <p className="mt-2 text-sm font-bold text-emerald-100">{result.productIdentity?.productTypeLabel || product.category || "未分类"}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Card label="单件利润" value={`¥${money(result.profit)}`} />
              <Card label="单件成本" value={`¥${money(result.unitCost)}`} />
              <Card label="建议售价" value={formatEffectivePrice(result.effectivePrice)} />
              <Card label="竞品价格" value={product.competitorPrice || "待补充"} />
            </div>
            {image && <img src={image} alt="产品图" className="mt-5 max-h-80 w-full rounded-3xl object-contain bg-black/30" />}
          </div>
          <SamplingStrategyCard result={result} />
          <MaterialChecklistCard result={result} />
        </div>

        <div className="min-w-0 rounded-[2rem] border border-white/10 bg-black/35 p-4 sm:p-6">
          <h2 className="text-2xl font-black">AI评分依据</h2>
          <div className="mt-5 space-y-4">
            {getScoringItems(result).map((item) => (
              <div key={item.title} className="rounded-3xl bg-white/[0.06] p-4">
                <Score label={item.title} value={item.score} />
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {aiInsight && (
        <section className="min-w-0 rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-4 sm:p-6">
          <h2 className="text-2xl font-black text-cyan-200">AI图片识别结果</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="识别产品" value={aiInsight.product?.name || "未识别"} />
            <Card label="推断品类" value={aiInsight.product?.category || "未识别"} />
            <Card label="置信度" value={aiInsight.confidence || "中等"} />
          </div>
        </section>
      )}

      <section className="min-w-0 rounded-[2rem] border border-cyan-300/20 bg-white/[0.05] p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-cyan-200">LLM Reasoning Layer</p>
            <h2 className="mt-2 text-2xl font-black text-white">AI 智能推理补充</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              规则评分继续负责稳定数值计算；LLM 只补充解释、策略建议和复盘洞察，不覆盖综合评分、利润率、MOQ 或风险等级。
            </p>
          </div>
          <span className="w-fit rounded-full border border-emerald-200/25 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100">
            辅助建议
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          <AiInsightPanel
            title="AI 进货决策推理"
            scenario="purchase_decision"
            insight={reasoningInsights.purchase_decision}
            loading={aiReasoningLoading && !reasoningInsights.purchase_decision}
          />
          <AiInsightPanel
            title="AI 内容测款策略"
            scenario="content_testing"
            insight={reasoningInsights.content_testing}
            loading={aiReasoningLoading && !reasoningInsights.content_testing}
          />
          {showReviewInsight && (
            <AiInsightPanel
              title="AI 测款复盘总结"
              scenario="review_summary"
              insight={reasoningInsights.review_summary}
              loading={aiReasoningLoading && !reasoningInsights.review_summary}
            />
          )}
        </div>
      </section>

      <section className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <h2 className="text-2xl font-black">小红书内容包</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">消费者视角的种草素材，商家策略单独放在最后，避免把经营分析写进对外文案。</p>
          <div className="mt-4 grid gap-2">
            {result.xhsPackage.coverHooks.map((hook) => (
              <p key={hook} className="rounded-2xl bg-emerald-300 p-3 text-sm font-black text-black">封面钩子：{hook}</p>
            ))}
          </div>
          <h3 className="mt-5 font-black text-white">标题建议</h3>
          <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            {result.xhsPackage.titles.slice(0, 5).map((title, index) => (
              <p key={title} className="rounded-2xl bg-black/25 p-4">标题{index + 1}：{title}</p>
            ))}
          </div>
          <h3 className="mt-5 font-black text-white">图文结构</h3>
          <ol className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            {result.xhsStructure.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
          </ol>
          <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-7 text-emerald-50">
            商家发布策略：{result.xhsPackage.merchantStrategy}
          </p>
        </div>

        <div className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <h2 className="text-2xl font-black">抖音视频脚本</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">{result.douyinPackage.direction}</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {result.douyinPackage.shots.map((shot, index) => (
              <div key={`${shot.time}-${shot.copy}`} className="rounded-2xl bg-black/25 p-4">
                <p className="font-black text-emerald-200">镜头{index + 1}｜{shot.time}｜{shot.focus}</p>
                <p className="mt-2">画面：{shot.visual}</p>
                <p>口播/字幕：{shot.copy}</p>
                <p className="text-slate-400">目的：{shot.purpose}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-5 font-black text-white">封面文案</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.douyinPackage.coverTexts.map((text) => (
              <span key={text} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100">{text}</span>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
            商家测试目标：{result.douyinPackage.merchantGoal}
          </p>
        </div>
      </section>

      <SupplierCommunicationPanel product={product} result={result} />

      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-black/35 p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-black">完整AI进货报告</h2>
            <p className="mt-2 text-sm text-slate-400">报告可复制给团队、保存到产品库，也可以下载为可视化HTML留档。</p>
            {saveMessage && <p className="mt-3 rounded-2xl bg-emerald-300/10 p-3 text-sm text-emerald-100">{saveMessage}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setMode("operate")} className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white sm:w-auto">返回修改</button>
            <button onClick={saveCurrentReport} className="min-h-11 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black sm:w-auto">保存到我的产品库</button>
            <button onClick={copyReport} className="min-h-11 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black sm:w-auto">{copied ? "已复制" : "复制给团队"}</button>
            <button onClick={() => downloadReport?.(product, result, reasoningInsights)} className="min-h-11 w-full rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-black text-emerald-200 sm:w-auto">下载可视化报告</button>
            <button
              onClick={() => onExportPdfReport?.(product, result, reasoningInsights)}
              title="将打开浏览器打印窗口，可选择另存为 PDF。"
              className="min-h-11 w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 font-black text-cyan-200 sm:w-auto"
            >
              导出 PDF 报告
            </button>
          </div>
        </div>
        <StructuredReport product={product} result={result} />
      </section>

      {priceEvidence && (
        <section className="min-w-0 rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-200">Price Evidence Analysis</p>
              <h2 className="mt-2 text-2xl font-black text-white">淘宝/竞品价格证据分析</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                该评分根据用户是否填写批发价、零售价等证据项计算，不代表平台真实数据准确率。
              </p>
            </div>
            <span className="rounded-full border border-amber-200/30 bg-black/20 px-4 py-2 text-xs font-black text-amber-100">
              证据完整度：{dataCompletenessText[priceEvidence.dataCompleteness] || "低"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="价格证据完整度评分" value={`${priceEvidence.evidenceScore ?? priceEvidence.confidenceScore ?? 0}/100`} />
            <Card label="批发价参考" value={formatPriceRange(priceEvidence.wholesalePriceRange)} />
            <Card label="零售价/竞品价参考" value={formatPriceRange(priceEvidence.competitorPriceRange)} />
            <Card label="建议售价位置" value={pricePositionText[priceEvidence.pricePosition] || "未知"} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-amber-100">价格分析结论</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {(priceAnalysisConclusions.length ? priceAnalysisConclusions : [priceEvidence.evidenceSummary]).map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-amber-100">价格风险提示</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {priceRiskWarnings.map((warning) => (
                  <li key={warning}>· {warning}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-amber-200/20 bg-black/20 p-5">
            <h3 className="font-black text-amber-100">下一步建议</h3>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
              {priceNextActions.map((action) => (
                <li key={action}>· {action}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <h3 className="font-black text-emerald-100">淘宝搜索参考入口</h3>
            <div className="mt-3 grid gap-3">
              {priceSearchLinks.map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-emerald-200/20 bg-black/20 p-4 text-sm leading-7 text-emerald-50 transition hover:border-emerald-200/50 hover:bg-emerald-300/10"
                >
                  <span className="block font-black">{link.label}</span>
                  <span className="mt-1 block text-xs text-emerald-100/80">{link.purpose}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {douyinEvidence && (
        <section className="min-w-0 rounded-[2rem] border border-violet-300/20 bg-violet-300/10 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-200">Short Video Evidence</p>
              <h2 className="mt-2 text-2xl font-black text-white">抖音内容测款参考</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                基于用户填写的内容热度观察和搜索参考入口，辅助判断短视频测款优先级。
              </p>
            </div>
            <span className="rounded-full border border-violet-200/30 bg-black/20 px-4 py-2 text-xs font-black text-violet-100">
              内容热度：{douyinEvidence.heatLevelLabel || douyinHeatLevelText[douyinEvidence.heatLevel] || "未知"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="搜索关键词" value={douyinEvidence.query || "待补充"} />
            <Card label="内容热度判断" value={douyinEvidence.heatLevelLabel || douyinHeatLevelText[douyinEvidence.heatLevel] || "未知"} />
            <Card label="证据完整度评分" value={`${douyinEvidence.evidenceScore ?? douyinEvidence.confidenceScore ?? 0}/100`} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-violet-100">内容测款分析结论</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {(douyinAnalysisConclusions.length ? douyinAnalysisConclusions : [douyinEvidence.evidenceSummary]).map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-violet-100">风险提示</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {douyinRiskWarnings.map((warning) => (
                  <li key={warning}>· {warning}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
            <h3 className="font-black text-violet-100">下一步建议</h3>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
              {douyinNextActions.map((action) => (
                <li key={action}>· {action}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <h3 className="font-black text-cyan-100">抖音搜索参考入口</h3>
            <div className="mt-3 grid gap-3">
              {douyinSearchLinks.map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-cyan-200/20 bg-black/20 p-4 text-sm leading-7 text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-300/10"
                >
                  <span className="block font-black">{link.label}</span>
                  <span className="mt-1 block text-xs text-cyan-100/80">{link.purpose}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {manualMarketEvidence && (
        <section className="min-w-0 rounded-[2rem] border border-teal-300/20 bg-teal-300/10 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-teal-200">Manual Market Evidence</p>
              <h2 className="mt-2 text-2xl font-black text-white">人工市场证据参考</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                围绕批发价、零售价、内容热度、竞品数量和同质化程度，判断现有人工证据是否足以支撑进货决策。
              </p>
            </div>
            <span className="rounded-full border border-teal-200/30 bg-black/20 px-4 py-2 text-xs font-black text-teal-100">
              证据完整度：{dataCompletenessText[manualMarketEvidence.dataCompleteness] || "低"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Card label="证据完整度评分" value={`${manualMarketEvidence.evidenceScore ?? manualMarketEvidence.confidenceScore ?? 0}/100`} />
            <Card label="评分修正" value={`${manualMarketEvidence.scoreAdjustment ?? 0}`} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-teal-100">证据分析结论</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {(manualAnalysisConclusions.length ? manualAnalysisConclusions : [manualMarketEvidence.evidenceSummary]).map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-teal-100">风险判断</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {manualRiskWarnings.map((warning) => (
                  <li key={warning}>· {warning}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-teal-100">下一步建议</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {manualNextActions.map((action) => (
                  <li key={action}>· {action}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {hasMarketEvidence && (
        <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-slate-400">
          {marketEvidenceNotice} 参考链接仅供人工复核，系统当前不会自动打开或解析外部页面。
        </p>
      )}
    </div>
  );
}
