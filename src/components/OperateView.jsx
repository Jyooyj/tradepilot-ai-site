import { IMAGE_TOO_LARGE_FALLBACK_MESSAGE } from "../constants/uiContent";
import { SUPPORTED_IMAGE_TYPES } from "../constants/imageQualityConfig";
import {
  competitorDensityOptions,
  contentHomogeneityOptions,
  manualMarketEvidenceTips,
} from "../constants/manualMarketEvidenceConfig";
import {
  analyzeImageQuality,
  buildImageQualityMessage,
  validateImageFile,
} from "../utils/imageQualityUtils";
import { blankProduct, compressImageToDataUrl, initialProduct, Input } from "../../App.jsx";

export default function OperateView({
  product,
  update,
  image,
  setImage,
  result,
  setProduct,
  setAnalyzed,
  setMode,
  analyzeImageWithAI,
  aiLoading,
  imageQualityNotice,
  setImageQualityNotice,
  imageRecognitionNotice,
  setImageRecognitionNotice,
}) {
  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageRecognitionNotice?.(null);
      const fileValidation = validateImageFile(file);

      if (!fileValidation.ok) {
        setImage(null);
        setAnalyzed(false);
        setImageQualityNotice?.(buildImageQualityMessage(fileValidation));
        alert(`${fileValidation.issues.join("；")}；也可以手动填写产品信息继续生成报告。`);
        return;
      }

      let qualityResult = null;
      try {
        qualityResult = await analyzeImageQuality(file);
      } catch (error) {
        qualityResult = {
          level: fileValidation.level === "warning" ? "warning" : "ok",
          issues: fileValidation.issues,
          suggestions: [
            ...fileValidation.suggestions,
            "图片质量预检测未完成，但仍可继续上传和手动填写。",
          ],
        };
      }

      const mergedQuality = buildImageQualityMessage({
        ...qualityResult,
        level: fileValidation.level === "warning" || qualityResult?.level === "warning" ? "warning" : qualityResult?.level || "ok",
        issues: [...(fileValidation.issues || []), ...(qualityResult?.issues || [])],
        suggestions: [...(fileValidation.suggestions || []), ...(qualityResult?.suggestions || [])],
      });
      setImageQualityNotice?.(mergedQuality);

      const compressed = await compressImageToDataUrl(file);
      setImage(compressed.dataUrl);
      setAnalyzed(false);

      if (compressed.tooLarge) {
        alert(IMAGE_TOO_LARGE_FALLBACK_MESSAGE);
      }
    } catch (error) {
      alert(error.message ? `${error.message}；也可以手动填写产品信息继续生成报告。` : "图片读取失败，请换一张图片再试；也可以手动填写产品信息继续生成报告。");
    } finally {
      e.target.value = "";
    }
  }

  function clearAll() {
    setProduct(blankProduct);
    setImage(null);
    setAnalyzed(false);
    setImageQualityNotice?.(null);
    setImageRecognitionNotice?.(null);
  }

  function analyze() {
    setAnalyzed(true);
    setMode("result");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <h2 className="text-2xl font-black">第一步：上传产品图片</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">建议上传进货样品图、供应商图或产品细节图。图片会参与信息完整度和内容潜力判断。</p>

        <div className="mt-5 grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/20 bg-black/25 p-4">
          {image ? (
            <img src={image} alt="产品图" className="max-h-80 rounded-3xl object-contain" />
          ) : (
            <div className="text-center text-slate-400">
              <p className="text-5xl">📷</p>
              <p className="mt-3 font-bold">暂未上传产品图</p>
            </div>
          )}
        </div>

        <label className="mt-4 block cursor-pointer rounded-2xl bg-emerald-300 px-5 py-3 text-center font-black text-black">
          上传图片
          <input type="file" accept={SUPPORTED_IMAGE_TYPES.join(",")} className="hidden" onChange={handleImage} />
        </label>
        <p className="mt-2 text-xs leading-6 text-slate-400">图片已自动压缩后用于识别，不影响报告生成。</p>
        <ImageDiagnosticPanel qualityNotice={imageQualityNotice} recognitionNotice={imageRecognitionNotice} />

        <button onClick={analyzeImageWithAI} disabled={aiLoading} className="mt-3 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black disabled:opacity-60">
          {aiLoading ? "AI正在识别图片..." : "AI识别图片并自动填写"}
        </button>

        <button onClick={() => { setProduct(initialProduct); setAnalyzed(false); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-white">套用示例产品</button>
        <button onClick={clearAll} className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-5 py-3 font-bold text-slate-300">清空重填</button>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">第二步：填写进货信息</h2>
            <p className="mt-2 text-sm text-slate-400">字段越完整，AI判断越可靠。带价格和MOQ才能测算利润与压货风险。</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-300">
            当前评分：{result.totalScore}/100
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="产品名称" value={product.name} onChange={(value) => update("name", value)} placeholder="如：珍珠项链" />
          <Input label="产品类型" value={product.category} onChange={(value) => update("category", value)} placeholder="如：饰品/文创/家居" />
          <Input label="拿货价 / 元" value={product.cost} onChange={(value) => update("cost", value)} placeholder="如：3.8" />
          <Input label="建议售价 / 元" value={product.price} onChange={(value) => update("price", value)} placeholder="如：19.9" />
          <Input label="MOQ 最小起订量 / 件" value={product.moq} onChange={(value) => update("moq", value)} placeholder="如：100" />
          <Input label="材质" value={product.material} onChange={(value) => update("material", value)} placeholder="如：合金+仿珍珠" />
          <Input label="目标人群" value={product.audience} onChange={(value) => update("audience", value)} placeholder="如：学生党、通勤人群" />
          <Input label="销售渠道" value={product.channel} onChange={(value) => update("channel", value)} placeholder="如：小红书/抖音/私域" />
          <Input label="供应商信息" value={product.supplier} onChange={(value) => update("supplier", value)} placeholder="如：支持混批，7天补货" wide />
          <Input label="内容关键词" value={product.keywords} onChange={(value) => update("keywords", value)} placeholder="如：温柔风、礼物推荐" wide />
          <Input label="竞品价格" value={product.competitorPrice} onChange={(value) => update("competitorPrice", value)} placeholder="如：15.9-29.9元" />
          <Input label="物流/包装风险" value={product.logistics} onChange={(value) => update("logistics", value)} placeholder="如：小件轻货/易碎" />
          <Input label="补充备注" value={product.note} onChange={(value) => update("note", value)} placeholder="如：适合礼物场景" wide />
        </div>

        <section className="mt-5 rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-black text-cyan-100">市场证据补充（可选）</h3>
              <p className="mt-2 text-sm leading-7 text-cyan-100/80">
                如果暂未接入平台 API，可以将你在 1688、淘宝、抖音、小红书等平台看到的价格、热度、链接和竞品情况填入，系统会将这些信息作为市场证据辅助判断。
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input label="1688 批发价参考" value={product.wholesalePriceReference || ""} onChange={(value) => update("wholesalePriceReference", value)} placeholder="3.8-6.5 元 / 约 5 元" />
            <Input label="淘宝/拼多多零售价参考" value={product.retailPriceReference || ""} onChange={(value) => update("retailPriceReference", value)} placeholder="15.9-29.9 元 / 约 20 元" />
            <Input label="抖音/小红书内容热度观察" value={product.contentHeatReference || ""} onChange={(value) => update("contentHeatReference", value)} placeholder="同款视频点赞较高，评论区有询价；或搜索结果较少，内容机会待验证" wide />
            <Input label="市场参考链接" value={product.marketReferenceLinks || ""} onChange={(value) => update("marketReferenceLinks", value)} placeholder="可粘贴 1688、淘宝、抖音、小红书搜索页或商品页链接" wide />

            <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">同类竞品数量观察</span>
              <select value={product.competitorDensity || "未观察"} onChange={(event) => update("competitorDensity", event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
                {competitorDensityOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#08100d]">{option}</option>
                ))}
              </select>
            </label>

            <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">内容同质化程度</span>
              <select value={product.contentHomogeneity || "未观察"} onChange={(event) => update("contentHomogeneity", event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
                {contentHomogeneityOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#08100d]">{option}</option>
                ))}
              </select>
            </label>

            <Input label="人工市场调研备注" value={product.manualMarketNote || ""} onChange={(value) => update("manualMarketNote", value)} placeholder="记录用户在线上平台看到的价格、销量、评论、爆款内容角度等信息" wide />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {manualMarketEvidenceTips.map((tip) => (
              <span key={tip} className="rounded-full border border-cyan-200/20 bg-black/20 px-3 py-2 text-xs font-bold text-cyan-100">{tip}</span>
            ))}
          </div>
        </section>

        <button onClick={analyze} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-lg font-black text-black">
          生成进货决策报告
        </button>
      </section>
    </div>
  );
}

function ImageDiagnosticPanel({ qualityNotice, recognitionNotice }) {
  const notices = [qualityNotice, recognitionNotice].filter(Boolean);

  if (!notices.length) {
    return (
      <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-xs leading-6 text-cyan-100">
        <p className="font-black text-cyan-50">图片质量提示 / 识别状态提示</p>
        <p className="mt-2">
          上传后会自动检查格式、大小、分辨率、亮度、对比度和清晰度。图片识别是加速入口，不是唯一入口；识别失败时，可手动填写产品信息继续生成报告。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {notices.map((notice) => (
        <DiagnosticNotice key={notice.title + notice.summary} notice={notice} />
      ))}
      <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-6 text-cyan-100">
        手动填写兜底：即使图片模糊、商品遮挡、多个商品同时出现或大图上传失败，也可以继续填写产品名称、拿货价、建议售价、MOQ、材质、目标人群和销售渠道，系统仍会生成完整进货决策报告。
      </p>
    </div>
  );
}

function DiagnosticNotice({ notice }) {
  const colorClass = notice.level === "error"
    ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
    : notice.level === "warning"
      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
      : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  const issues = Array.isArray(notice.issues) ? notice.issues : [];
  const suggestions = Array.isArray(notice.suggestions) ? notice.suggestions : [];
  const metrics = notice.metrics || {};
  const hasMetrics = metrics.width || metrics.height || metrics.brightness || metrics.contrast || metrics.blurScore;

  return (
    <div className={`rounded-2xl border p-4 text-xs leading-6 ${colorClass}`}>
      <p className="font-black">{notice.title}</p>
      <p className="mt-1">{notice.summary}</p>
      {hasMetrics && (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] opacity-90">
          {metrics.width && metrics.height && <span className="rounded-full bg-black/20 px-2 py-1">尺寸 {metrics.width}×{metrics.height}</span>}
          {metrics.brightness !== undefined && <span className="rounded-full bg-black/20 px-2 py-1">亮度 {metrics.brightness}</span>}
          {metrics.contrast !== undefined && <span className="rounded-full bg-black/20 px-2 py-1">对比度 {metrics.contrast}</span>}
          {metrics.blurScore !== undefined && <span className="rounded-full bg-black/20 px-2 py-1">清晰度 {metrics.blurScore}</span>}
        </div>
      )}
      {issues.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      )}
      {suggestions.length > 0 && (
        <div className="mt-2 rounded-2xl bg-black/20 p-3">
          <p className="font-black">下一步建议</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
