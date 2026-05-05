import React, { useMemo, useState } from "react";

const sample = {
  name: "蝴蝶结珍珠耳夹",
  category: "饰品",
  cost: 3.8,
  price: 19.9,
  moq: 100,
  material: "合金 + 仿珍珠",
  audience: "18-25岁女生、学生党、通勤人群",
  channel: "小红书 / 抖音 / 校园私域",
  supplier: "支持混批，7天补货，可定制包装",
  keywords: "温柔风、法式、不打耳洞、学生党、春夏氛围感",
};

function App() {
  const [form, setForm] = useState(sample);

  const result = useMemo(() => {
    const cost = Number(form.cost) || 0;
    const price = Number(form.price) || 0;
    const moq = Number(form.moq) || 0;

    const packaging = 0.8;
    const logistics = 1.2;
    const platformFee = price * 0.05;
    const unitCost = cost + packaging + logistics + platformFee;
    const profit = price - unitCost;
    const margin = price > 0 ? profit / price : 0;
    const stockCost = cost * moq;

    const text = `${form.name} ${form.category} ${form.audience} ${form.channel} ${form.keywords}`;
    const hotWords = ["学生", "礼物", "小红书", "拍照", "法式", "温柔", "春夏", "不打耳洞", "通勤"];
    const hotScore = hotWords.filter((w) => text.includes(w)).length * 5;

    const profitScore = Math.min(95, Math.max(45, margin * 140));
    const socialScore = Math.min(95, 55 + hotScore);
    const audienceScore = form.audience.length > 8 ? 86 : 65;
    const supplyScore = moq <= 100 ? 86 : moq <= 200 ? 74 : 60;
    const riskScore = form.supplier.includes("补货") ? 82 : 68;

    const score = Math.round(
      profitScore * 0.3 +
        socialScore * 0.25 +
        audienceScore * 0.2 +
        supplyScore * 0.15 +
        riskScore * 0.1
    );

    let advice = "建议小批量测款";
    if (score >= 85 && margin >= 0.45) advice = "推荐拿样并快速测款";
    if (score < 65 || margin < 0.25) advice = "暂不建议直接进货";

    return {
      unitCost,
      profit,
      margin,
      stockCost,
      profitScore: Math.round(profitScore),
      socialScore: Math.round(socialScore),
      audienceScore,
      supplyScore,
      riskScore,
      score,
      advice,
    };
  }, [form]);

  const update = (key, value) => {
    setForm((old) => ({ ...old, [key]: value }));
  };

  const report = `
【TradePilot AI 选品报告】

产品名称：${form.name}
产品类型：${form.category}
拿货价：${form.cost} 元
建议售价：${form.price} 元
MOQ：${form.moq} 件
目标人群：${form.audience}
销售渠道：${form.channel}

一、AI综合评分
综合评分：${result.score}/100
进货建议：${result.advice}

二、利润测算
单件综合成本：${result.unitCost.toFixed(2)} 元
单件利润：${result.profit.toFixed(2)} 元
预估毛利率：${Math.round(result.margin * 100)}%
首批压货资金：${result.stockCost.toFixed(2)} 元

三、测款建议
建议先拿样或小批量进货，用小红书/抖音发布测款内容，重点观察收藏率、评论询单率和私域转化情况。若互动数据较好，再进行补货。

四、风险提示
重点确认样品与大货是否一致、补货周期是否稳定、是否支持混批、是否能提供产品图片与质检信息。
`;

  return (
    <div className="min-h-screen bg-[#08100d] text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute left-[-100px] top-[-100px] h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-[-80px] top-40 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-sm text-emerald-300">AI 会展采购决策系统</p>
          <h1 className="text-2xl font-black">拿货搭子 TradePilot AI</h1>
        </div>
        <a
          href="#demo"
          className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-black"
        >
          开始判货
        </a>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-20">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
            <div className="mb-6 inline-block rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-black">
              你逛展，我判货；爆不爆，先算过
            </div>
            <h2 className="text-5xl font-black leading-tight tracking-tight md:text-6xl">
              从展会看货到社媒测款，
              <span className="block text-emerald-300">把凭感觉拿货变成数据决策。</span>
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              TradePilot AI 面向义乌小商品展、饰品展、文创展等会展采购场景，
              帮助大学生创业者和小微商家完成产品采集、利润测算、供应商风险诊断、
              爆款潜力评分与小红书/抖音测款内容生成。
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 backdrop-blur">
            <p className="text-sm text-slate-400">当前样例产品</p>
            <h3 className="mt-2 text-3xl font-black text-emerald-300">{form.name}</h3>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Card label="综合评分" value={`${result.score}/100`} />
              <Card label="进货建议" value={result.advice} />
              <Card label="单件利润" value={`¥${result.profit.toFixed(2)}`} />
              <Card label="毛利率" value={`${Math.round(result.margin * 100)}%`} />
            </div>
          </div>
        </section>

        <section id="demo" className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
            <h2 className="text-2xl font-black">逛展采集</h2>
            <p className="mt-2 text-sm text-slate-400">
              输入产品信息，AI 自动完成选品判断、利润测算和测款建议。
            </p>

            <div className="mt-6 grid gap-3">
              <Input label="产品名称" value={form.name} onChange={(v) => update("name", v)} />
              <Input label="产品类型" value={form.category} onChange={(v) => update("category", v)} />
              <Input label="拿货价 / 元" value={form.cost} onChange={(v) => update("cost", v)} />
              <Input label="建议售价 / 元" value={form.price} onChange={(v) => update("price", v)} />
              <Input label="MOQ 最小起订量 / 件" value={form.moq} onChange={(v) => update("moq", v)} />
              <Input label="材质" value={form.material} onChange={(v) => update("material", v)} />
              <Input label="目标人群" value={form.audience} onChange={(v) => update("audience", v)} />
              <Input label="销售渠道" value={form.channel} onChange={(v) => update("channel", v)} />
              <Input label="供应商备注" value={form.supplier} onChange={(v) => update("supplier", v)} />
              <Input label="社媒热词" value={form.keywords} onChange={(v) => update("keywords", v)} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
              <h2 className="text-2xl font-black">AI 爆款评分</h2>
              <div className="mt-6 grid gap-4">
                <Score label="利润空间" value={result.profitScore} />
                <Score label="社媒传播潜力" value={result.socialScore} />
                <Score label="目标人群匹配" value={result.audienceScore} />
                <Score label="供应链稳定性" value={result.supplyScore} />
                <Score label="风险可控度" value={result.riskScore} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
              <h2 className="text-2xl font-black">小红书/抖音测款内容</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                <p className="rounded-2xl bg-emerald-300 p-4 font-black text-black">
                  封面文案：别让第一次拿货，变成第一次压货
                </p>
                <p>
                  标题1：{form.name} 到底值不值得拿？我先用 AI 算了一遍账
                </p>
                <p>
                  标题2：逛展看到这款 {form.name}，适合先小批量测款吗？
                </p>
                <p>
                  标签：#义乌小商品 #选品测款 #创业日记 #小红书开店 #学生党好物
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-black/35 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">AI 决策报告</h2>
              <p className="mt-2 text-sm text-slate-400">
                适合比赛演示、团队协作和后续选品复盘。
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(report)}
              className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-black"
            >
              复制报告
            </button>
          </div>
          <pre className="mt-6 whitespace-pre-wrap rounded-3xl bg-white/[0.06] p-5 text-sm leading-8 text-slate-200">
            {report}
          </pre>
        </section>
      </main>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-transparent text-sm text-white outline-none"
      />
    </label>
  );
}

function Score({ label, value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-300">{label}</span>
        <span className="font-black text-emerald-300">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default App;
