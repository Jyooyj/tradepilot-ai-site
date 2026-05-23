import { IMAGE_TOO_LARGE_FALLBACK_MESSAGE } from "../constants/uiContent";
import { blankProduct, compressImageToDataUrl, initialProduct, Input } from "../../App.jsx";

export default function OperateView({ product, update, image, setImage, result, setProduct, setAnalyzed, setMode, analyzeImageWithAI, aiLoading }) {
  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("请上传 JPG、PNG、WebP 等图片文件。");
      return;
    }

    try {
      const compressed = await compressImageToDataUrl(file);
      setImage(compressed.dataUrl);
      setAnalyzed(false);

      if (compressed.tooLarge) {
        alert(IMAGE_TOO_LARGE_FALLBACK_MESSAGE);
      }
    } catch (error) {
      alert(error.message ? `${error.message}；也可以手动填写产品信息继续生成报告。` : "图片读取失败，请换一张图片再试；也可以手动填写产品信息继续生成报告。");
    }
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
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>
        <p className="mt-2 text-xs leading-6 text-slate-400">图片已自动压缩后用于识别，不影响报告生成。</p>
        <p className="mt-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-6 text-cyan-100">
          图片识别是加速入口，不是唯一入口。识别失败时，可手动填写产品名称、拿货价、建议售价、MOQ、材质、目标人群和销售渠道，系统仍可生成完整进货决策报告。
        </p>

        <button onClick={analyzeImageWithAI} disabled={aiLoading} className="mt-3 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black disabled:opacity-60">
          {aiLoading ? "AI正在识别图片..." : "AI识别图片并自动填写"}
        </button>

        <button onClick={() => { setProduct(initialProduct); setAnalyzed(false); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-white">套用示例产品</button>
        <button onClick={() => { setProduct(blankProduct); setImage(null); setAnalyzed(false); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-5 py-3 font-bold text-slate-300">清空重填</button>
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

        <button onClick={analyze} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-lg font-black text-black">
          生成进货决策报告
        </button>
      </section>
    </div>
  );
}
