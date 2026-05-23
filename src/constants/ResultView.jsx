import { Card, formatEffectivePrice, getScoringItems, MaterialChecklistCard, money, SamplingStrategyCard, Score, StructuredReport } from "../../App.jsx";

export default function ResultView({ product, image, result, analyzed, setMode, copyReport, copied, saveCurrentReport, saveMessage, aiInsight, downloadReport }) {
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
