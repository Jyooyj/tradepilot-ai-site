import { Card, formatEffectivePrice, getScoringItems, MaterialChecklistCard, money, SamplingStrategyCard, Score, StructuredReport } from "../../App.jsx";

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

function getPriceEvidence(result) {
  const marketEvidence = result?.marketEvidence || {};
  const priceEvidence = result?.priceEvidence || marketEvidence.price || null;
  return priceEvidence && typeof priceEvidence === "object" ? priceEvidence : null;
}

function getManualMarketEvidence(result) {
  return result?.manualMarketEvidence || result?.marketEvidence?.manual || null;
}

function formatPriceRange(range) {
  if (!range?.isValid) return "待补充";
  if (range.min === range.max) return `¥${range.min}`;
  return `¥${range.min} - ¥${range.max}`;
}

export default function ResultView({ product, image, result, analyzed, setMode, copyReport, copied, saveCurrentReport, saveMessage, aiInsight, downloadReport }) {
  const douyinEvidence = getDouyinEvidence(result);
  const priceEvidence = getPriceEvidence(result);
  const manualMarketEvidence = getManualMarketEvidence(result);
  const priceRiskWarnings = asArray(priceEvidence?.riskWarnings);
  const priceSearchLinks = asArray(priceEvidence?.searchLinks);

  return (
    <div className="space-y-6">
      {!analyzed && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
          当前展示的是实时预览结果，建议返回开始判断页面生成正式报告。
        </div>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-emerald-300">Key Conclusion</p>
            <h2 className="text-3xl font-black text-white">进货关键结论</h2>
            <p className="mt-2 text-slate-400">先确认状态和关键指标，再展开查看评分依据与完整报告。</p>
          </div>
          <span className="text-sm font-bold text-cyan-200">状态：{result.status}</span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Card label="综合评分" value={`${result.totalScore}/100`} />
          <Card label="AI建议" value={result.level} />
          <Card label="预计毛利率" value={`${Math.round(result.margin * 100)}%`} />
          <Card label="首批压货" value={`¥${money(result.stockCost)}`} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
            <p className="text-sm text-slate-400">当前产品</p>
            <h2 className="mt-2 text-3xl font-black text-emerald-300">{result.productIdentity?.displayName || product.name || "未命名产品"}</h2>
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

        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
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
        <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6">
          <h2 className="text-2xl font-black text-cyan-200">AI图片识别结果</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Card label="识别产品" value={aiInsight.product?.name || "未识别"} />
            <Card label="推断品类" value={aiInsight.product?.category || "未识别"} />
            <Card label="置信度" value={aiInsight.confidence || "中等"} />
          </div>
        </section>
      )}

      {priceEvidence && (
        <section className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-200">1688 / Taobao Price Reference</p>
              <h2 className="mt-2 text-2xl font-black text-white">1688 / 淘宝价格参考</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                当前用于回应批发价和竞品价参考需求；无平台授权时只展示搜索入口和用户填写竞品价格区间，不生成真实平台价格。
              </p>
            </div>
            <span className="rounded-full border border-amber-200/30 bg-black/20 px-4 py-2 text-xs font-black text-amber-100">
              {priceEvidence.sourceTypeLabel || (priceEvidence.sourceType === "api_real" ? "真实 API" : "API 未配置 / 搜索参考")}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Card label="搜索关键词" value={priceEvidence.query || "待补充"} />
            <Card label="竞品价格区间" value={formatPriceRange(priceEvidence.competitorPriceRange)} />
            <Card label="价格位置" value={pricePositionText[priceEvidence.pricePosition] || "未知"} />
            <Card label="可信度评分" value={`${priceEvidence.confidenceScore ?? 0}/100`} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-amber-100">数据完整度</h3>
              <p className="mt-3 text-3xl font-black text-white">{dataCompletenessText[priceEvidence.dataCompleteness] || "低"}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{priceEvidence.evidenceSummary}</p>
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

          <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <h3 className="font-black text-emerald-100">1688 / 淘宝搜索参考入口</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
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
            <p className="mt-4 text-xs leading-6 text-emerald-100/80">{priceEvidence.sourceNotice}</p>
          </div>
        </section>
      )}

      {manualMarketEvidence && (
        <section className="rounded-[2rem] border border-teal-300/20 bg-teal-300/10 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-teal-200">Manual Market Evidence</p>
              <h2 className="mt-2 text-2xl font-black text-white">人工市场证据参考</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                这些信息来自用户手动填写的市场调研记录，用于在平台 API 未授权或不可用时辅助判断，不等同于平台自动抓取数据。
              </p>
            </div>
            <span className="rounded-full border border-teal-200/30 bg-black/20 px-4 py-2 text-xs font-black text-teal-100">
              完整度：{dataCompletenessText[manualMarketEvidence.dataCompleteness] || "低"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Card label="可信度评分" value={`${manualMarketEvidence.confidenceScore ?? 0}/100`} />
            <Card label="1688 批发价参考" value={manualMarketEvidence.evidence?.wholesalePriceReference || "未填写"} />
            <Card label="淘宝/拼多多零售价参考" value={manualMarketEvidence.evidence?.retailPriceReference || "未填写"} />
            <Card label="评分修正" value={`${manualMarketEvidence.scoreAdjustment ?? 0}`} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-teal-100">用户填写的市场观察</h3>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
                <p><b className="text-teal-100">内容热度：</b>{manualMarketEvidence.evidence?.contentHeatReference || "未填写"}</p>
                <p><b className="text-teal-100">竞品数量：</b>{manualMarketEvidence.evidence?.competitorDensity || "未观察"}</p>
                <p><b className="text-teal-100">内容同质化：</b>{manualMarketEvidence.evidence?.contentHomogeneity || "未观察"}</p>
                <p><b className="text-teal-100">参考链接：</b>{manualMarketEvidence.evidence?.marketReferenceLinks || "未填写"}</p>
                <p><b className="text-teal-100">调研备注：</b>{manualMarketEvidence.evidence?.manualMarketNote || "未填写"}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-teal-100">风险提示</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {(manualMarketEvidence.riskWarnings || []).map((warning) => (
                  <li key={warning}>· {warning}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-teal-300/20 bg-black/20 p-5">
            <h3 className="font-black text-teal-100">证据摘要</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{manualMarketEvidence.evidenceSummary}</p>
            {!!manualMarketEvidence.positiveSignals?.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {manualMarketEvidence.positiveSignals.map((signal) => (
                  <span key={signal} className="rounded-full bg-teal-300/15 px-3 py-2 text-xs font-bold text-teal-100">{signal}</span>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs leading-6 text-teal-100/80">{manualMarketEvidence.sourceNotice}</p>
          </div>
        </section>
      )}

      {douyinEvidence && (
        <section className="rounded-[2rem] border border-violet-300/20 bg-violet-300/10 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-200">Douyin Fallback Reference</p>
              <h2 className="mt-2 text-2xl font-black text-white">抖音内容热度参考</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                当前状态：API 未授权 / 搜索参考模式。此模块不调用真实抖音 API，也不生成真实点赞、评论、播放或收藏数据。
              </p>
            </div>
            <span className="rounded-full border border-violet-200/30 bg-black/20 px-4 py-2 text-xs font-black text-violet-100">
              {douyinEvidence.sourceTypeLabel || "API 未授权降级"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Card label="搜索关键词" value={douyinEvidence.query || "待补充"} />
            <Card label="热度等级" value={douyinEvidence.heatLevelLabel || douyinHeatLevelText[douyinEvidence.heatLevel] || "未知"} />
            <Card label="可信度评分" value={`${douyinEvidence.confidenceScore ?? 0}/100`} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-violet-100">用户填写的热度信号</h3>
              {douyinEvidence.manualSignals?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {douyinEvidence.manualSignals.map((signal) => (
                    <span key={signal} className="rounded-full bg-violet-300/15 px-3 py-2 text-xs font-bold text-violet-100">{signal}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-slate-400">暂未识别到用户填写的抖音内容热度备注。</p>
              )}
              <p className="mt-4 text-sm leading-7 text-slate-300">{douyinEvidence.evidenceSummary}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <h3 className="font-black text-violet-100">风险提示</h3>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {(douyinEvidence.riskWarnings || []).map((warning) => (
                  <li key={warning}>· {warning}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <h3 className="font-black text-cyan-100">抖音搜索参考入口</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(douyinEvidence.searchLinks || []).map((link) => (
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
            <p className="mt-4 text-xs leading-6 text-cyan-100/80">{douyinEvidence.sourceNotice}</p>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
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

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
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

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">完整AI进货报告</h2>
            <p className="mt-2 text-sm text-slate-400">报告可复制给团队、保存到产品库，也可以下载为可视化HTML留档。</p>
            {saveMessage && <p className="mt-3 rounded-2xl bg-emerald-300/10 p-3 text-sm text-emerald-100">{saveMessage}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setMode("operate")} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white">返回修改</button>
            <button onClick={saveCurrentReport} className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">保存到我的产品库</button>
            <button onClick={copyReport} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">{copied ? "已复制" : "复制给团队"}</button>
            <button onClick={downloadReport} className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-black text-emerald-200">下载可视化报告</button>
          </div>
        </div>
        <StructuredReport product={product} result={result} />
      </section>
    </div>
  );
}
