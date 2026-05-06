import React, { useMemo, useState } from "react";

const initialProduct = {
  name: "蝴蝶结珍珠耳夹",
  category: "饰品 / 小商品",
  cost: "3.8",
  price: "19.9",
  moq: "100",
  material: "合金 + 仿珍珠",
  audience: "18-25岁女生、学生党、通勤人群",
  channel: "小红书 / 抖音 / 校园私域",
  supplier: "支持混批，7天补货，可定制包装",
  keywords: "温柔风、法式、不打耳洞、学生党、春夏氛围感",
  competitorPrice: "15.9-29.9元",
  logistics: "小件轻货，包装成本低",
  note: "适合春夏穿搭、校园摆摊、礼物场景，建议先拿样拍图测款。",
};

const blankProduct = {
  name: "",
  category: "",
  cost: "",
  price: "",
  moq: "",
  material: "",
  audience: "",
  channel: "",
  supplier: "",
  keywords: "",
  competitorPrice: "",
  logistics: "",
  note: "",
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function money(v) {
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function analyzeProduct(product, hasImage) {
  const cost = n(product.cost);
  const price = n(product.price);
  const moq = n(product.moq);
  const packaging = 0.8;
  const logisticsCost = 1.2;
  const platformFee = price * 0.05;
  const unitCost = cost + packaging + logisticsCost + platformFee;
  const profit = price - unitCost;
  const margin = price > 0 ? profit / price : 0;
  const stockCost = cost * moq;

  const text = `${product.name} ${product.category} ${product.material} ${product.audience} ${product.channel} ${product.keywords} ${product.note}`;
  const hotWords = ["小红书", "抖音", "学生", "礼物", "拍照", "出片", "法式", "温柔", "春夏", "不打耳洞", "通勤", "新中式", "文创", "治愈", "盲袋", "校园"];
  const hitWords = hotWords.filter((w) => text.includes(w));
  const hotScore = hitWords.length * 4;

  const profitScore = clamp(margin * 145, 30, 96);
  const audienceScore = clamp(55 + product.audience.length / 2 + (product.channel.includes("小红书") ? 8 : 0), 45, 95);
  const socialScore = clamp(50 + hotScore + (hasImage ? 8 : 0), 40, 96);
  const supplyScore = clamp(92 - (moq > 300 ? 28 : moq > 150 ? 18 : moq > 80 ? 10 : 2) + (product.supplier.includes("补货") ? 6 : 0), 35, 95);
  const riskScore = clamp(78 - (product.competitorPrice ? 0 : 8) - (product.logistics.includes("易碎") ? 14 : 0), 40, 92);
  const infoScore = clamp(45 + [product.name, product.category, product.cost, product.price, product.moq, product.audience, product.channel, product.supplier].filter(Boolean).length * 6 + (hasImage ? 7 : 0), 35, 98);

  const totalScore = Math.round(
    profitScore * 0.24 + audienceScore * 0.18 + socialScore * 0.2 + supplyScore * 0.16 + riskScore * 0.12 + infoScore * 0.1
  );

  let level = "建议小批量测款";
  let color = "amber";
  if (totalScore >= 85 && margin >= 0.45 && stockCost <= 1200) {
    level = "推荐拿样并快速测款";
    color = "green";
  }
  if (totalScore < 65 || margin < 0.25 || stockCost > 2500) {
    level = "暂不建议直接进货";
    color = "red";
  }

  const missing = [];
  if (!product.name) missing.push("产品名称");
  if (!product.cost) missing.push("拿货价");
  if (!product.price) missing.push("建议售价");
  if (!product.moq) missing.push("MOQ");
  if (!product.audience) missing.push("目标人群");
  if (!product.channel) missing.push("销售渠道");

  const risks = [];
  if (margin < 0.35) risks.push("毛利率偏低，后续广告、退换货和包装成本会挤压利润。建议重新核算售价或寻找更低拿货价。 ");
  if (moq > 200) risks.push("MOQ偏高，首批压货资金压力较大，建议争取混批、拿样或降低首单量。 ");
  if (!hasImage) risks.push("暂未上传产品图片，无法判断视觉吸引力、拍摄难度和社媒封面表现。 ");
  if (!product.supplier.includes("补货")) risks.push("供应商补货周期不明确，爆单后可能出现断货风险。 ");
  if (!product.competitorPrice) risks.push("缺少同类竞品价格，建议补充1688/淘宝/小红书同款价格区间。 ");
  if (risks.length === 0) risks.push("基础风险较可控，但仍需核实样品与大货一致性、质检信息和售后条款。 ");

  const actions = [
    "第一步：先拿样或小批量进货，不建议直接大批量压货。",
    "第二步：用小红书/抖音发布2-3条测款内容，观察收藏率、评论询单率、私信咨询量。",
    "第三步：用校园群、朋友圈或私域做小范围成交验证，记录真实转化。",
    "第四步：如果互动率和询单率较好，再和供应商谈补货周期、混批政策和包装定制。",
    "第五步：复盘每款产品的数据，把评分、利润、内容表现和销量记录到选品表。",
  ];

  const titles = [
    `逛展看到这款${product.name || "产品"}，我先用AI算了一遍账`,
    `${product.price || "这个价位"}元的${product.name || "小商品"}，到底值不值得拿？`,
    `别盲目拿货！这款${product.name || "产品"}更适合先小批量测款`,
    `第一次去展会拿货，我建议先看这4个指标`,
  ];

  const report = `【TradePilot AI 选品决策报告】

一、产品基础信息
产品名称：${product.name || "未填写"}
产品类型：${product.category || "未填写"}
拿货价：${product.cost || "未填写"} 元
建议售价：${product.price || "未填写"} 元
MOQ：${product.moq || "未填写"} 件
材质：${product.material || "未填写"}
目标人群：${product.audience || "未填写"}
销售渠道：${product.channel || "未填写"}
供应商信息：${product.supplier || "未填写"}

二、AI综合判断
综合评分：${totalScore}/100
决策建议：${level}
判断逻辑：系统综合考虑利润空间、目标人群清晰度、社媒传播潜力、供应链稳定性、风险可控度和信息完整度。

三、利润测算
单件综合成本：${money(unitCost)} 元
预估单件利润：${money(profit)} 元
预估毛利率：${Math.round(margin * 100)}%
首批压货资金：${money(stockCost)} 元
说明：该测算默认包装成本0.8元、物流成本1.2元、平台费率5%，实际经营时需根据渠道重新校正。

四、核心风险提示
${risks.map((r, i) => `${i + 1}. ${r}`).join(String.fromCharCode(10))}

五、测款内容建议
封面文案：别让第一次拿货，变成第一次压货
标题建议：
${titles.map((t, i) => `${i + 1}. ${t}`).join(String.fromCharCode(10))}
推荐标签：#义乌小商品 #选品测款 #创业日记 #小红书开店 #学生党好物

六、下一步行动清单
${actions.map((a, i) => `${i + 1}. ${a}`).join(String.fromCharCode(10))}

七、补充建议
如果要继续优化判断，请补充产品图片、竞品价格、供应商补货周期、样品质量、真实评论反馈和首轮测款数据。`;

  return {
    unitCost,
    profit,
    margin,
    stockCost,
    totalScore,
    level,
    color,
    missing,
    risks,
    actions,
    titles,
    report,
    scores: [
      ["利润空间", Math.round(profitScore)],
      ["人群匹配", Math.round(audienceScore)],
      ["传播潜力", Math.round(socialScore)],
      ["供应稳定", Math.round(supplyScore)],
      ["风险可控", Math.round(riskScore)],
      ["信息完整", Math.round(infoScore)],
    ],
  };
}

function App() {
  const [page, setPage] = useState("cover");
  const [mode, setMode] = useState("intro");
  const [product, setProduct] = useState(initialProduct);
  const [image, setImage] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  const result = useMemo(() => analyzeProduct(product, Boolean(image)), [product, image]);

  function update(key, value) {
    setProduct((old) => ({ ...old, [key]: value }));
    setAnalyzed(false);
  }

  function copyReport() {
    navigator.clipboard?.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  async function analyzeImageWithAI() {
  if (!image) {
    alert("请先上传产品图片");
    return;
  }

  try {
    setAiLoading(true);

    const response = await fetch("/api/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image,
        hint: `${product.name} ${product.category} ${product.material} ${product.keywords}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      alert(data.error || "图片识别失败，请检查接口配置");
      return;
    }

    setAiInsight(data);

    setProduct((old) => ({
      ...old,
      name: data.product?.name || old.name,
      category: data.product?.category || old.category,
      material: data.product?.material || old.material,
      channel: data.product?.channel || old.channel,
      price: data.product?.price || old.price,
      audience: data.product?.audience || old.audience,
      competitorPrice: data.product?.competitorPrice || old.competitorPrice,
      keywords: data.product?.keywords || old.keywords,
      note: data.product?.note || old.note,
    }));

    alert("AI识别完成，已自动回填产品信息");
  } catch (error) {
    console.error(error);
    alert("识别失败，请稍后重试");
  } finally {
    setAiLoading(false);
  }
}

  if (page === "cover") {
    return (
      <div className="min-h-screen bg-[#08100d] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
          <div className="mb-6 inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-200">
            OPC AI Challenge · 会展选品与爆款测款智能体
          </div>
          <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
            拿货搭子 TradePilot AI
            <span className="block text-emerald-300">你逛展，我判货。</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            面向义乌小商品展、饰品展、文创展等线下采购场景，帮助大学生创业者和小微商家完成产品识别、利润测算、风险判断、测款内容生成和进货决策报告。
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <CoverCard title="项目介绍与示例" desc="了解这个项目解决什么问题、适合谁用、示例产品如何分析。" onClick={() => { setPage("app"); setMode("intro"); }} />
            <CoverCard title="开始选品判断" desc="上传产品图，填写拿货价、MOQ、目标人群，一键生成AI报告。" highlight onClick={() => { setPage("app"); setMode("operate"); }} />
            <CoverCard title="评委快速演示" desc="使用内置样例，直接查看完整评分、测款文案和决策报告。" onClick={() => { setProduct(initialProduct); setAnalyzed(true); setPage("app"); setMode("result"); }} />
          </div>
          <p className="mt-10 text-sm text-slate-500">别让第一次拿货，变成第一次压货。先算账，再冲动。</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08100d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08100d]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <button onClick={() => setPage("cover")} className="text-left">
            <p className="text-sm text-emerald-300">TradePilot AI</p>
            <h1 className="text-xl font-black">拿货搭子｜会展选品与爆款测款智能体</h1>
          </button>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Tab active={mode === "intro"} onClick={() => setMode("intro")}>介绍示例</Tab>
            <Tab active={mode === "operate"} onClick={() => setMode("operate")}>用户操作</Tab>
            <Tab active={mode === "result"} onClick={() => setMode("result")}>识别报告</Tab>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {mode === "intro" && (
          <IntroView setMode={setMode} setProduct={setProduct} setAnalyzed={setAnalyzed} />
        )}

        {mode === "operate" && (
          <OperateView
            product={product}
            update={update}
            image={image}
            setImage={setImage}
            result={result}
            setProduct={setProduct}
            setAnalyzed={setAnalyzed}
            setMode={setMode}
          />
        )}

        {mode === "result" && (
          <ResultView
            product={product}
            image={image}
            result={result}
            analyzed={analyzed}
            setMode={setMode}
            copyReport={copyReport}
            copied={copied}
          />
        )}
      </main>
    </div>
  );
}

function CoverCard({ title, desc, onClick, highlight }) {
  return (
    <button onClick={onClick} className={`rounded-[2rem] border p-6 text-left transition hover:-translate-y-1 hover:shadow-2xl ${highlight ? "border-emerald-300 bg-emerald-300 text-black shadow-emerald-300/20" : "border-white/10 bg-white/[0.06] text-white"}`}>
      <h3 className="text-2xl font-black">{title}</h3>
      <p className={`mt-3 text-sm leading-7 ${highlight ? "text-black/70" : "text-slate-400"}`}>{desc}</p>
      <p className="mt-6 font-black">进入 →</p>
    </button>
  );
}

function Tab({ active, onClick, children }) {
  return <button onClick={onClick} className={`rounded-full px-4 py-2 ${active ? "bg-emerald-300 text-black" : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"}`}>{children}</button>;
}

function IntroView({ setMode, setProduct, setAnalyzed }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
        <p className="mb-4 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-black">项目介绍</p>
        <h2 className="text-4xl font-black leading-tight">把“凭感觉拿货”变成“有数据、有评分、有行动清单”的选品流程。</h2>
        <p className="mt-5 text-base leading-8 text-slate-300">
          很多新手去展会时会遇到三个问题：看到产品很多但不知道哪个值得拿；不知道利润、MOQ和补货风险如何判断；拿货后不会做内容测款。TradePilot AI 将这些判断拆成可执行流程：采集产品信息、识别关键字段、计算利润、判断风险、生成测款内容和报告。
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Info title="适合谁" items={["大学生创业者", "小微商家", "内容电商卖家", "跨境电商新手"]} />
          <Info title="能做什么" items={["产品信息采集", "利润测算", "爆款评分", "供应商诊断", "测款文案", "进货报告"]} />
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-8">
        <h3 className="text-2xl font-black text-emerald-300">示例：蝴蝶结珍珠耳夹</h3>
        <p className="mt-4 text-sm leading-7 text-slate-300">拿货价3.8元，建议售价19.9元，MOQ100件。系统会判断利润空间、目标人群、传播潜力和供应链风险，并给出“是否适合拿样测款”的建议。</p>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          <p className="rounded-2xl bg-white/[0.06] p-4">输入：产品图 + 拿货价 + MOQ + 材质 + 目标人群 + 渠道</p>
          <p className="rounded-2xl bg-white/[0.06] p-4">分析：利润、毛利率、首批压货、传播潜力、风险点</p>
          <p className="rounded-2xl bg-white/[0.06] p-4">输出：评分、进货建议、小红书标题、行动清单、完整报告</p>
        </div>
        <button onClick={() => { setProduct(initialProduct); setAnalyzed(true); setMode("result"); }} className="mt-6 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">查看示例报告</button>
        <button onClick={() => setMode("operate")} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-white">我来填写产品</button>
      </section>
    </div>
  );
}

function Info({ title, items }) {
  return <div className="rounded-3xl border border-white/10 bg-black/25 p-5"><h3 className="font-black text-white">{title}</h3><div className="mt-4 flex flex-wrap gap-2">{items.map((i) => <span key={i} className="rounded-full bg-emerald-300/10 px-3 py-1 text-sm font-bold text-emerald-200">{i}</span>)}</div></div>;
}

function OperateView({ product, update, image, setImage, result, setProduct, setAnalyzed, setMode }) {
  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function analyze() {
    setAnalyzed(true);
    setMode("result");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <h2 className="text-2xl font-black">第一步：上传产品图片</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">建议上传展会现场图、产品细节图或供应商图。图片会参与信息完整度和传播潜力判断。</p>
        <div className="mt-5 grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/20 bg-black/25 p-4">
          {image ? <img src={image} alt="产品图" className="max-h-80 rounded-3xl object-contain" /> : <div className="text-center text-slate-400"><p className="text-5xl">📷</p><p className="mt-3 font-bold">暂未上传产品图</p></div>}
        </div>
        <label className="mt-4 block cursor-pointer rounded-2xl bg-emerald-300 px-5 py-3 text-center font-black text-black">
          上传图片
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>
        <button
  onClick={analyzeImageWithAI}
  disabled={aiLoading}
  className="mt-3 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black disabled:opacity-60"
>
  {aiLoading ? "AI正在识别图片..." : "AI识别图片并自动填写"}
</button>
        <button onClick={() => { setProduct(initialProduct); setAnalyzed(false); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-white">套用示例产品</button>
        <button onClick={() => { setProduct(blankProduct); setImage(null); setAnalyzed(false); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-5 py-3 font-bold text-slate-300">清空重填</button>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">第二步：填写产品信息</h2>
            <p className="mt-2 text-sm text-slate-400">字段越完整，AI判断越可靠。带价格和MOQ才能测算利润与压货风险。</p>
          </div>
<div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-300">
  识别状态：{result?.profile?.type || result?.profile?.kind || "待识别"}
</div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="产品名称" value={product.name} onChange={(v) => update("name", v)} placeholder="如：蝴蝶结珍珠耳夹" />
          <Input label="产品类型" value={product.category} onChange={(v) => update("category", v)} placeholder="如：饰品/文创/家居" />
          <Input label="拿货价 / 元" value={product.cost} onChange={(v) => update("cost", v)} placeholder="如：3.8" />
          <Input label="建议售价 / 元" value={product.price} onChange={(v) => update("price", v)} placeholder="如：19.9" />
          <Input label="MOQ 最小起订量 / 件" value={product.moq} onChange={(v) => update("moq", v)} placeholder="如：100" />
          <Input label="材质" value={product.material} onChange={(v) => update("material", v)} placeholder="如：合金+仿珍珠" />
          <Input label="目标人群" value={product.audience} onChange={(v) => update("audience", v)} placeholder="如：18-25岁女生、学生党" />
          <Input label="销售渠道" value={product.channel} onChange={(v) => update("channel", v)} placeholder="如：小红书/抖音/私域" />
          <Input label="供应商信息" value={product.supplier} onChange={(v) => update("supplier", v)} placeholder="如：支持混批，7天补货" wide />
          <Input label="社媒热词" value={product.keywords} onChange={(v) => update("keywords", v)} placeholder="如：温柔风、法式、学生党" wide />
          <Input label="竞品价格" value={product.competitorPrice} onChange={(v) => update("competitorPrice", v)} placeholder="如：15.9-29.9元" />
          <Input label="物流/包装风险" value={product.logistics} onChange={(v) => update("logistics", v)} placeholder="如：小件轻货/易碎" />
          <Input label="补充备注" value={product.note} onChange={(v) => update("note", v)} placeholder="如：适合礼物场景，建议先拿样" wide />
        </div>

        {result.missing.length > 0 && <p className="mt-4 rounded-2xl bg-amber-300/10 p-4 text-sm leading-7 text-amber-200">还缺少：{result.missing.join("、")}。补充后报告会更准确。</p>}

        <button onClick={analyze} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-lg font-black text-black">AI识别判断，生成决策报告</button>
      </section>
    </div>
  );
}

function ResultView({ product, image, result, analyzed, setMode, copyReport, copied }) {
  return (
    <div className="space-y-6">
      {!analyzed && <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">你还没有点击“AI识别判断”。当前展示的是实时预览结果，建议返回用户操作入口生成正式报告。</div>}
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <p className="text-sm text-slate-400">当前产品</p>
          <h2 className="mt-2 text-3xl font-black text-emerald-300">{product.name || "未命名产品"}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Card label="综合评分" value={`${result.totalScore}/100`} />
            <Card label="AI建议" value={result.level} />
            <Card label="单件利润" value={`¥${money(result.profit)}`} />
            <Card label="毛利率" value={`${Math.round(result.margin * 100)}%`} />
            <Card label="单件成本" value={`¥${money(result.unitCost)}`} />
            <Card label="首批压货" value={`¥${money(result.stockCost)}`} />
          </div>
          {image && <img src={image} alt="产品图" className="mt-5 max-h-80 w-full rounded-3xl object-contain bg-black/30" />}
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
          <h2 className="text-2xl font-black">多维度识别结果</h2>
          <div className="mt-5 space-y-4">
            {result.scores.map(([label, value]) => <Score key={label} label={label} value={value} />)}
          </div>
          <div className="mt-6 rounded-3xl bg-white/[0.06] p-5">
            <h3 className="font-black text-white">用户下一步应该怎么做？</h3>
            <ol className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
              {result.actions.map((a, i) => <li key={a}>{i + 1}. {a}</li>)}
            </ol>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {aiInsight && (
  <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6">
    <h2 className="text-2xl font-black text-cyan-200">AI图片识别结果</h2>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <Card label="识别产品" value={aiInsight.product?.name || "未识别"} />
      <Card label="推断品类" value={aiInsight.product?.category || "未识别"} />
      <Card label="建议售价" value={aiInsight.product?.price || "待补充"} />
      <Card label="目标人群" value={aiInsight.product?.audience || "待补充"} />
      <Card label="竞品价格" value={aiInsight.product?.competitorPrice || "待检索"} />
      <Card label="置信度" value={aiInsight.confidence || "中等"} />
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl bg-black/25 p-5">
        <h3 className="font-black text-white">小红书内容建议</h3>
        <p className="mt-3 rounded-2xl bg-emerald-300 p-4 font-black text-black">
          封面：{aiInsight.content?.xhsCover || "待生成"}
        </p>
        <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
          {(aiInsight.content?.xhsTitles || []).map((title, index) => (
            <p key={title} className="rounded-2xl bg-white/[0.06] p-3">
              标题{index + 1}：{title}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-black/25 p-5">
        <h3 className="font-black text-white">抖音视频脚本</h3>
        <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
          {(aiInsight.content?.douyinScript || []).map((shot, index) => (
            <p key={shot} className="rounded-2xl bg-white/[0.06] p-3">
              镜头{index + 1}：{shot}
            </p>
          ))}
        </div>
      </div>
    </div>
  </section>
)}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <h2 className="text-2xl font-black">核心风险提示</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {result.risks.map((r, i) => <p key={r} className="rounded-2xl bg-black/25 p-4"><b className="text-amber-300">风险 {i + 1}：</b>{r}</p>)}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <h2 className="text-2xl font-black">测款内容生成</h2>
          <p className="mt-4 rounded-2xl bg-emerald-300 p-4 font-black text-black">封面文案：别让第一次拿货，变成第一次压货</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {result.titles.map((t, i) => <p key={t} className="rounded-2xl bg-black/25 p-4">标题{i + 1}：{t}</p>)}
            <p className="rounded-2xl bg-black/25 p-4">标签：#义乌小商品 #选品测款 #创业日记 #小红书开店 #学生党好物</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">完整AI决策报告</h2>
            <p className="mt-2 text-sm text-slate-400">可复制给队友、放进项目仓库、用于评审演示或后续复盘。</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMode("operate")} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white">返回修改</button>
            <button onClick={copyReport} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">{copied ? "已复制" : "复制报告"}</button>
          </div>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-3xl bg-white/[0.06] p-5 text-sm leading-8 text-slate-200">{result.report}</pre>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, wide }) {
  return (
    <label className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
    </label>
  );
}

function Card({ label, value }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>;
}

function Score({ label, value }) {
  return <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold text-slate-300">{label}</span><span className="font-black text-emerald-300">{value}</span></div><div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${value}%` }} /></div></div>;
}

export default App;
