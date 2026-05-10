import React, { useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

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

const demoProducts = [
  {
    name: "蝴蝶结珍珠耳夹",
    category: "饰品 / 耳饰",
    cost: "3.8",
    price: "19.9",
    moq: "100",
    material: "合金 + 仿珍珠",
    audience: "18-25岁女生、学生党、通勤人群、礼物消费人群",
    channel: "小红书 / 抖音 / 校园私域",
    supplier: "支持混批，7天补货，可提供礼盒包装",
    keywords: "法式、温柔风、不打耳洞、春夏氛围感、礼物推荐",
    competitorPrice: "15.9-29.9元",
    logistics: "小件轻货，包装成本低",
    note: "适合做小红书穿搭场景和礼物场景测款。",
  },
  {
    name: "奶油色大肠发圈",
    category: "发饰 / 女生日用小商品",
    cost: "2.1",
    price: "12.9",
    moq: "200",
    material: "绒感布料 / 弹力发绳",
    audience: "16-28岁女生、学生党、宿舍人群、通勤女性",
    channel: "小红书 / 抖音 / 校园社群",
    supplier: "支持混批，10天补货，颜色可选",
    keywords: "氛围感发圈、宿舍好物、低成本变精致、显发量",
    competitorPrice: "8.8-25.9元",
    logistics: "轻货，适合组合销售",
    note: "单价低但同质化强，建议做套装和颜色组合测款。",
  },
  {
    name: "轻熟风珍珠项链",
    category: "饰品 / 项链",
    cost: "8.8",
    price: "39.9",
    moq: "80",
    material: "仿珍珠 + 合金扣",
    audience: "18-35岁女性、通勤白领、轻熟风穿搭人群、礼物消费人群",
    channel: "小红书 / 抖音 / 私域礼物推荐",
    supplier: "支持混批，7天补货，可提供礼盒",
    keywords: "法式珍珠、通勤项链、轻熟风、低预算精致感、约会穿搭",
    competitorPrice: "18.8-69.9元",
    logistics: "小件轻货，礼盒包装成本略高",
    note: "适合用通勤、约会、礼物三个场景做内容测款。",
  },
];

const flowSteps = [
  ["上传产品图", "拍照或上传进货样品，先看视觉卖点。"],
  ["AI识别推断", "自动补全品类、材质、人群和内容关键词。"],
  ["利润测算", "计算单件成本、毛利率和首批压货资金。"],
  ["风险判断", "识别MOQ、补货、同质化和物流风险。"],
  ["内容测款", "生成小红书图文和抖音短视频脚本。"],
  ["复盘决策", "保存产品库，PK候选品，再决定是否补货。"],
];

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferMarketInfo(product) {
  const text = `${product.name} ${product.category} ${product.material} ${product.keywords} ${product.note}`;

  if (/大肠|发圈|头绳|发饰/.test(text)) {
    return {
      marketType: "发饰 / 女生日用小商品",
      cover: "低成本提升精致感的发圈，真的有用吗？",
      xhsTitles: [
        "宿舍随手扎也好看的氛围感发圈",
        "低成本提升精致感的女生小物",
        "不同发量怎么选发圈：细发/多发/卷发都能用",
        "一周不重样发型搭配：发圈+穿搭",
      ],
      douyinScript: [
        "0-2秒：普通头绳太勒、太单调，大肠发圈能不能解决？",
        "3-6秒：展示发圈的蓬松度、褶皱和颜色",
        "7-12秒：对比普通头绳与大肠发圈的上头效果",
        "13-18秒：展示低丸子、半扎发、低马尾三种用法",
        "结尾：评论区投票，哪个颜色最想买？",
      ],
      imageAdvice: "重点拍材质褶皱、上头效果和颜色组合。封面最好有人手持或半扎发佩戴图。",
      contentRisk: "同质化较高，需要靠颜色、材质、套装组合和上头效果做差异。",
    };
  }

  if (/珍珠|项链|锁骨链/.test(text)) {
    return {
      marketType: "饰品 / 项链 / 轻熟风小商品",
      cover: "普通穿搭变精致，只差一条珍珠项链",
      xhsTitles: [
        "一条珍珠项链，让普通白衬衫直接变贵",
        "低预算轻熟风配饰，通勤女生真的能戴",
        "珍珠项链怎么选不显老：长度、珠径、扣头都要看",
        "约会/面试/通勤都能用的万能项链",
      ],
      douyinScript: [
        "0-2秒：白T/衬衫无配饰 vs 戴上珍珠项链对比",
        "3-7秒：特写珠光、扣头、延长链和包装",
        "8-12秒：展示通勤、约会、拍照三个场景",
        "13-18秒：讲清楚珠径和长度怎么选",
        "结尾：问用户觉得珍珠项链显贵还是显成熟？",
      ],
      imageAdvice: "图片要突出珠光、扣头细节、包装盒和佩戴效果。单纯平铺容易显普通，最好补一张上身图。",
      contentRisk: "珍珠类容易被质感和珠光影响信任感，图像质感、包装和售后说明很重要。",
    };
  }

  if (/发簪|国风|新中式|汉服|流苏/.test(text)) {
    return {
      marketType: "国风文创 / 发饰",
      cover: "一支发簪，让普通盘发变国风",
      xhsTitles: [
        "新中式穿搭少不了的发簪",
        "一支发簪让普通盘发变国风",
        "汉服拍照配饰怎么选不廉价",
        "文旅集市适合卖什么：国风小饰品测款",
      ],
      douyinScript: [
        "0-2秒：普通盘发和插发簪对比",
        "3-8秒：展示流苏摆动和细节",
        "9-14秒：搭配新中式/汉服场景",
        "15-20秒：讲清楚适合发量和固定方式",
      ],
      imageAdvice: "必须补充佩戴图和国风场景图，单纯白底图很难体现价值。",
      contentRisk: "容易损坏，包装和物流保护要核实；审美门槛较高，适合垂直人群。",
    };
  }

  return {
    marketType: product.category || "小商品 / 待分类",
    cover: "别让第一次进货，变成第一次压货",
    xhsTitles: [
      `逛到这款${product.name || "产品"}，我先用AI算了一遍账`,
      `${product.price || "这个价位"}元的小商品，到底值不值得进？`,
      "新手进货前一定要看这4个指标",
      "低成本测款：先发内容再决定是否补货",
    ],
    douyinScript: [
      "0-2秒：展示产品并提出痛点",
      "3-8秒：展示核心卖点和细节",
      "9-14秒：展示使用场景和价格结构",
      "15-20秒：给出是否建议拿样的结论",
      "结尾：评论区投票收集购买意愿",
    ],
    imageAdvice: "建议补充清晰产品图、使用场景图和细节图，方便判断视觉卖点。",
    contentRisk: "信息不足，建议先补充竞品价格、目标人群和供应商政策。",
  };
}

function analyzeProduct(product, hasImage) {
  const market = inferMarketInfo(product);
  const cost = n(product.cost);
  const price = n(product.price);
  const moq = n(product.moq);

  const packaging = /项链|礼盒/.test(`${product.category} ${product.note}`) ? 1.5 : /杯|易碎/.test(`${product.category} ${product.logistics}`) ? 3.5 : 0.8;
  const logisticsCost = /杯|易碎/.test(`${product.category} ${product.logistics}`) ? 5.5 : /发簪/.test(`${product.category}`) ? 2 : 1.2;
  const platformFee = price * 0.05;
  const unitCost = cost + packaging + logisticsCost + platformFee;
  const profit = price - unitCost;
  const margin = price > 0 ? profit / price : 0;
  const stockCost = cost * moq;

  const text = `${product.name} ${product.category} ${product.material} ${product.audience} ${product.channel} ${product.keywords} ${product.note}`;
  const hotWords = ["小红书", "抖音", "学生", "礼物", "拍照", "出片", "法式", "温柔", "春夏", "不打耳洞", "通勤", "新中式", "文创", "治愈", "盲袋", "校园"];
  const hotScore = hotWords.filter((word) => text.includes(word)).length * 4;

  const profitScore = clamp(margin * 145, 30, 96);
  const audienceScore = clamp(55 + (product.audience || "").length / 2 + ((product.channel || "").includes("小红书") ? 8 : 0), 45, 95);
  const contentScore = clamp(50 + hotScore + (hasImage ? 8 : 0), 40, 96);
  const supplyScore = clamp(92 - (moq > 300 ? 28 : moq > 150 ? 18 : moq > 80 ? 10 : 2) + ((product.supplier || "").includes("补货") ? 6 : 0), 35, 95);
  const riskScore = clamp(78 - (product.competitorPrice ? 0 : 8) - ((product.logistics || "").includes("易碎") ? 14 : 0), 40, 92);
  const infoScore = clamp(45 + [product.name, product.category, product.cost, product.price, product.moq, product.audience, product.channel, product.supplier].filter(Boolean).length * 6 + (hasImage ? 7 : 0), 35, 98);

  const totalScore = Math.round(
    profitScore * 0.24 +
      audienceScore * 0.18 +
      contentScore * 0.22 +
      supplyScore * 0.14 +
      riskScore * 0.12 +
      infoScore * 0.1
  );

  let level = "建议小批量测款";
  let status = "正在测款";
  if (totalScore >= 85 && margin >= 0.45 && stockCost <= 1500) {
    level = "推荐拿样并快速测款";
    status = "准备拿样";
  }
  if (totalScore >= 88 && margin >= 0.5 && (product.supplier || "").includes("补货")) {
    level = "高潜力，建议进入补货观察";
    status = "建议补货";
  }
  if (totalScore < 65 || margin < 0.25 || stockCost > 3000) {
    level = "暂不建议直接进货";
    status = "暂不考虑";
  }

  const risks = [];
  if (margin < 0.35) risks.push("毛利率偏低，后续广告、退换货和包装成本会挤压利润。建议重新核算售价或寻找更低拿货价。");
  if (moq > 200) risks.push("MOQ偏高，首批压货资金压力较大，建议争取混批、拿样或降低首单量。");
  if (!hasImage) risks.push("暂未上传产品图片，无法判断视觉吸引力、拍摄难度和社媒封面表现。");
  if (!(product.supplier || "").includes("补货")) risks.push("供应商补货周期不明确，爆单后可能出现断货风险。");
  if (!product.competitorPrice) risks.push("缺少同类竞品价格，建议补充1688/淘宝/小红书同款价格区间。");
  risks.push(market.contentRisk);
  if (risks.length === 0) risks.push("基础风险较可控，但仍需核实样品与大货一致性、质检信息和售后条款。");

  const actions = [
    "先拿样或小批量进货，不建议直接大批量压货。",
    "用小红书/抖音发布2-3条测款内容，观察收藏率、评论询单率、私信咨询量。",
    "用校园群、朋友圈或私域做小范围成交验证，记录真实转化。",
    "如果互动率和询单率较好，再和供应商谈补货周期、混批政策和包装定制。",
    "复盘每款产品的数据，把评分、利润、内容表现和销量记录到产品库。",
  ];

  const xhsStructure = [
    "封面提出痛点或结果，例如“这个货值不值得进？”",
    "展示产品图/佩戴图/使用图，说明第一眼卖点。",
    "讲价格结构：拿货价、建议售价、预计利润。",
    "讲适合人群和真实使用场景。",
    "讲风险点：同质化、材质、包装、补货周期。",
    "给出是否建议拿样/测款的结论。",
    "发起互动投票：你会买吗？哪个颜色/款式更好？",
    "引导收藏或评论，收集市场反馈。",
  ];

  const explanations = [
    ["利润空间", Math.round(profitScore), margin >= 0.45 ? "拿货价与建议售价之间有较好利润空间，能覆盖包装、物流和平台成本。" : "利润空间一般，需要谨慎核算广告、退换货和平台费用。"],
    ["人群匹配", Math.round(audienceScore), product.audience ? "目标人群描述较明确，便于后续做内容选题和投放。" : "目标人群不够明确，建议补充年龄、场景、购买动机。"],
    ["内容潜力", Math.round(contentScore), hasImage ? "已上传图片，适合进一步判断封面表现和内容种草角度。" : "缺少产品图，内容表现需要补充图片后再判断。"],
    ["供应稳定", Math.round(supplyScore), (product.supplier || "").includes("补货") ? "供应商补货信息较清楚，爆单后断货风险相对较低。" : "补货周期不明确，建议先确认交期、混批和售后。"],
    ["风险可控", Math.round(riskScore), product.competitorPrice ? "已有竞品价格区间，可辅助判断定价是否合理。" : "缺少竞品价格，建议先做同款搜索和价格校准。"],
    ["信息完整", Math.round(infoScore), infoScore >= 80 ? "产品基础信息较完整，报告可信度较高。" : "信息仍不完整，建议补充人群、渠道、供应商和物流风险。"],
  ];

  const report = `【TradePilot AI 进货决策报告】

一、产品基础信息
产品名称：${product.name || "未填写"}
产品类型：${product.category || market.marketType || "未填写"}
拿货价：${product.cost || "未填写"} 元
建议售价：${product.price || "未填写"} 元
MOQ：${product.moq || "未填写"} 件
材质：${product.material || "未填写"}
目标人群：${product.audience || "未填写"}
销售渠道：${product.channel || "未填写"}
竞品价格：${product.competitorPrice || "未填写"}
供应商信息：${product.supplier || "未填写"}

二、AI综合判断
综合评分：${totalScore}/100
候选状态：${status}
决策建议：${level}
判断逻辑：系统综合考虑利润空间、目标人群清晰度、内容种草潜力、供应链稳定性、风险可控度和信息完整度。

三、利润测算
单件综合成本：${money(unitCost)} 元
预估单件利润：${money(profit)} 元
预估毛利率：${Math.round(margin * 100)}%
首批压货资金：${money(stockCost)} 元
说明：测算默认平台费率5%，实际经营时需根据渠道重新校正。

四、AI评分依据
${explanations.map(([label, score, reason], index) => `${index + 1}. ${label}：${score}分。${reason}`).join(String.fromCharCode(10))}

五、核心风险提示
${risks.map((risk, index) => `${index + 1}. ${risk}`).join(String.fromCharCode(10))}

六、小红书内容包
封面文案：${market.cover}
标题建议：
${market.xhsTitles.map((title, index) => `${index + 1}. ${title}`).join(String.fromCharCode(10))}
图文结构：
${xhsStructure.map((item, index) => `${index + 1}. ${item}`).join(String.fromCharCode(10))}
推荐标签：#进货测款 #小商品创业 #选品笔记 #小红书开店 #低成本创业

七、抖音短视频脚本
${market.douyinScript.map((shot, index) => `${index + 1}. ${shot}`).join(String.fromCharCode(10))}

八、下一步行动清单
${actions.map((action, index) => `${index + 1}. ${action}`).join(String.fromCharCode(10))}`;

  return {
    market,
    unitCost,
    profit,
    margin,
    stockCost,
    totalScore,
    level,
    status,
    risks,
    actions,
    explanations,
    xhsStructure,
    report,
    scores: [
      ["利润空间", Math.round(profitScore)],
      ["人群匹配", Math.round(audienceScore)],
      ["内容潜力", Math.round(contentScore)],
      ["供应稳定", Math.round(supplyScore)],
      ["风险可控", Math.round(riskScore)],
      ["信息完整", Math.round(infoScore)],
    ],
  };
}

function getRecordStatus(record) {
  return record?.result?.status || record?.result?.level || record?.advice || (record?.score >= 85 ? "准备拿样" : record?.score >= 70 ? "正在测款" : "暂不考虑");
}

function App() {
  const [page, setPage] = useState("cover");
  const [mode, setMode] = useState("intro");
  const [product, setProduct] = useState(blankProduct);
  const [image, setImage] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [review, setReview] = useState({
    views: "",
    likes: "",
    saves: "",
    comments: "",
    inquiries: "",
    orders: "",
    cost: "",
  });

  const result = useMemo(() => analyzeProduct(product, Boolean(image)), [product, image]);

  function update(key, value) {
    setProduct((old) => ({ ...old, [key]: value }));
    setAnalyzed(false);
    setSaveMessage("");
  }

  function copyReport() {
    navigator.clipboard?.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function downloadReport() {
    const blob = new Blob([result.report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${product.name || "进货报告"}-TradePilot.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveCurrentReport() {
    try {
      setSaveMessage("正在保存到我的产品库...");

      if (!supabase) {
        setSaveMessage("保存失败：Supabase 未初始化。");
        return;
      }

      const userResult = await supabase.auth.getUser();
      const user = userResult.data?.user;

      if (userResult.error) {
        setSaveMessage("获取用户失败：" + userResult.error.message);
        return;
      }

      if (!user) {
        setSaveMessage("请先登录后再保存。");
        return;
      }

      const smallImage = image && image.length < 180000 ? image : "";

      const payload = {
        user_id: user.id,
        product_name: product?.name || "未命名产品",
        category: product?.category || "未分类",
        score: Number(result?.totalScore ?? 0) || 0,
        advice: result?.level || "暂无建议",
        price: product?.price || "",
        competitor_price: product?.competitorPrice || "",
        product: {
          ...product,
          imagePreview: smallImage,
        },
        result: {
          status: result?.status || "",
          totalScore: result?.totalScore ?? 0,
          level: result?.level || "",
          risks: result?.risks || [],
          scores: result?.scores || [],
          explanations: result?.explanations || [],
          review,
        },
        report: result?.report || "暂无报告内容",
      };

      const insertResult = await supabase.from("product_history").insert(payload);

      if (insertResult.error) {
        setSaveMessage("保存失败：" + insertResult.error.message);
        return;
      }

      setSaveMessage("已保存到我的产品库 ✓");
      loadHistoryRecords();
    } catch (error) {
      setSaveMessage("保存失败：" + error.message);
    }
  }

  async function loadHistoryRecords() {
    try {
      setHistoryLoading(true);
      setHistoryMessage("");

      if (!supabase) {
        setHistoryRecords([]);
        setHistoryMessage("Supabase 未初始化，产品库仅支持本地演示模式。");
        return;
      }

      const userResult = await supabase.auth.getUser();
      const user = userResult.data?.user;

      if (userResult.error) {
        setHistoryMessage("读取用户失败：" + userResult.error.message);
        return;
      }

      if (!user) {
        setHistoryRecords([]);
        setHistoryMessage("请先登录后查看我的产品库。");
        return;
      }

      const { data, error } = await supabase
        .from("product_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setHistoryMessage("读取产品库失败：" + error.message);
        return;
      }

      setHistoryRecords(data || []);
    } catch (error) {
      setHistoryMessage("读取产品库失败：" + error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteHistoryRecord(id) {
    const ok = window.confirm("确定删除这条产品记录吗？");
    if (!ok) return;

    if (!supabase) {
      alert("删除失败：Supabase 未初始化。");
      return;
    }

    const userResult = await supabase.auth.getUser();
    const user = userResult.data?.user;

    if (!user) {
      alert("请先登录后再删除产品记录。");
      return;
    }

    const { error } = await supabase
      .from("product_history")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert("删除失败：" + error.message);
      return;
    }

    loadHistoryRecords();
  }

  async function analyzeImageWithAI() {
    if (!image) {
      alert("请先上传产品图片");
      return;
    }

    setAiLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 55000);

    const pickText = (...values) => {
      const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
      return found ? String(found).trim() : "";
    };

    const pickNumber = (...values) => {
      const raw = pickText(...values);
      const match = String(raw).match(/\d+(\.\d+)?/);
      return match ? match[0] : "";
    };

    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          image,
          hint:
            "请只根据上传图片识别产品。不要沿用页面旧字段。先判断这是项链/耳饰/发饰/其他，若看到一整圈珍珠串、扣头、延长链或包装盒内圆形珠链，优先判断为珍珠项链/锁骨链，不要判断为耳夹。",
        }),
      });

      clearTimeout(timer);

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("接口返回不是 JSON：", text);
        alert("AI识别失败：接口返回格式异常。请稍后重试，或先手动填写产品信息生成报告。");
        return;
      }

      if (!response.ok) {
        console.error("AI识别接口错误：", data);
        alert(data.error || data.message || "AI识别失败，请检查模型权限或稍后重试。");
        return;
      }

      const aiProduct = data?.product || {};

      setAiInsight(data);

      setProduct((old) => ({
        ...old,
        name: pickText(aiProduct.name, aiProduct.productName, old.name),
        category: pickText(aiProduct.category, aiProduct.type, old.category),
        material: pickText(aiProduct.material, old.material),
        cost: pickNumber(aiProduct.cost, aiProduct.purchasePrice, aiProduct.sourcePrice, aiProduct.wholesalePrice, old.cost),
        price: pickText(aiProduct.price, aiProduct.suggestedPrice, aiProduct.sellingPrice, old.price),
        moq: pickNumber(aiProduct.moq, aiProduct.MOQ, aiProduct.minimumOrderQuantity, old.moq),
        audience: pickText(aiProduct.audience, aiProduct.targetAudience, old.audience),
        channel: pickText(aiProduct.channel, aiProduct.salesChannel, old.channel),
        supplier: pickText(aiProduct.supplier, aiProduct.supplierInfo, old.supplier),
        competitorPrice: pickText(aiProduct.competitorPrice, aiProduct.competitor_price, old.competitorPrice),
        logistics: pickText(aiProduct.logistics, aiProduct.packageRisk, old.logistics),
        keywords: pickText(aiProduct.keywords, aiProduct.tags, old.keywords),
        note: pickText(aiProduct.note, aiProduct.description, old.note),
      }));

      setAnalyzed(false);
      alert("AI识别完成，已自动回填产品信息");
    } catch (error) {
      clearTimeout(timer);

      if (error.name === "AbortError") {
        alert("AI识别超时：模型响应较慢。你可以换一张更清晰的图片，或先手动填写信息生成报告。");
      } else {
        console.error(error);
        alert("AI识别失败：" + error.message);
      }
    } finally {
      clearTimeout(timer);
      setAiLoading(false);
    }
  }

  function restoreRecord(record) {
    if (record.product) {
      const { imagePreview, ...restProduct } = record.product;
      setProduct({ ...blankProduct, ...restProduct });
      setImage(imagePreview || null);
    }
    setAnalyzed(true);
    setMode("result");
  }

  function applyDemo(demo) {
    setProduct(demo);
    setImage(null);
    setAiInsight(null);
    setAnalyzed(true);
    setSaveMessage("");
    setPage("app");
    setMode("result");
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
            AI Procurement Workspace · 进货决策与爆款测款智能体
          </div>

         <h1 className="mt-6 max-w-5xl text-5xl font-black leading-tight tracking-tight md:text-6xl xl:text-7xl">
  <span className="block text-white">TradePilot AI</span>
  <span className="mt-3 block text-emerald-300">
    进货前，先算清楚
  </span>
</h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
  面向小商品、饰品、文创、家居、校园零售和内容电商进货场景，帮助创业者完成产品识别、利润测算、风险判断、内容测款和复盘决策。
</p>
          <p className="mt-4 text-sm font-bold text-emerald-200/80">
  别让第一次进货，变成第一次压货。
</p>

          <div className="mt-8 grid gap-3 md:grid-cols-6">
            {flowSteps.map(([title, desc], index) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-black">
                  {index + 1}
                </div>
                <h3 className="font-black text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <CoverCard title="项目介绍" desc="了解产品逻辑、适用场景和工作流程。" onClick={() => { setPage("app"); setMode("intro"); }} />
            <CoverCard title="开始进货判断" desc="上传产品图，填写拿货价、MOQ，一键生成进货报告。" highlight onClick={() => { setPage("app"); setMode("operate"); }} />
            <CoverCard title="评委快速演示" desc="不依赖实时接口，直接查看3个完整案例。" onClick={() => { setPage("app"); setMode("demo"); }} />
          </div>
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
            <h1 className="text-xl font-black">进货决策与爆款测款智能体</h1>
          </button>

          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Tab active={mode === "intro"} onClick={() => setMode("intro")}>项目介绍</Tab>
            <Tab active={mode === "operate"} onClick={() => setMode("operate")}>开始判断</Tab>
            <Tab active={mode === "result"} onClick={() => setMode("result")}>进货报告</Tab>
            <Tab active={mode === "history"} onClick={() => { setMode("history"); loadHistoryRecords(); }}>我的产品库</Tab>
            <Tab active={mode === "pk"} onClick={() => { setMode("pk"); loadHistoryRecords(); }}>候选产品PK</Tab>
            <Tab active={mode === "review"} onClick={() => setMode("review")}>测款复盘</Tab>
            <Tab active={mode === "demo"} onClick={() => setMode("demo")}>评委演示</Tab>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {mode === "intro" && <IntroView setMode={setMode} />}
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
            analyzeImageWithAI={analyzeImageWithAI}
            aiLoading={aiLoading}
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
            saveCurrentReport={saveCurrentReport}
            saveMessage={saveMessage}
            aiInsight={aiInsight}
            downloadReport={downloadReport}
          />
        )}
        {mode === "history" && (
          <HistoryView
            records={historyRecords}
            loading={historyLoading}
            message={historyMessage}
            onDelete={deleteHistoryRecord}
            onRestore={restoreRecord}
            onRefresh={loadHistoryRecords}
          />
        )}
        {mode === "pk" && (
          <PKView
            records={historyRecords}
            loading={historyLoading}
            message={historyMessage}
            onRefresh={loadHistoryRecords}
            onRestore={restoreRecord}
          />
        )}
        {mode === "review" && (
          <ReviewView
            product={product}
            result={result}
            review={review}
            setReview={setReview}
            saveCurrentReport={saveCurrentReport}
            saveMessage={saveMessage}
          />
        )}
        {mode === "demo" && <DemoView applyDemo={applyDemo} />}
      </main>
    </div>
  );
}

function CoverCard({ title, desc, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[2rem] border p-6 text-left transition hover:-translate-y-1 hover:shadow-2xl ${
        highlight ? "border-emerald-300 bg-emerald-300 text-black shadow-emerald-300/20" : "border-white/10 bg-white/[0.06] text-white"
      }`}
    >
      <h3 className="text-2xl font-black">{title}</h3>
      <p className={`mt-3 text-sm leading-7 ${highlight ? "text-black/70" : "text-slate-400"}`}>{desc}</p>
      <p className="mt-6 font-black">进入 →</p>
    </button>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 ${active ? "bg-emerald-300 text-black" : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"}`}>
      {children}
    </button>
  );
}

function IntroView({ setMode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
        <p className="mb-4 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-black">项目介绍</p>
        <h2 className="text-4xl font-black leading-tight">把“凭感觉进货”变成“有数据、有内容、有复盘”的进货工作流。</h2>
        <p className="mt-5 text-base leading-8 text-slate-300">
          TradePilot AI 不只是生成一份报告，而是把进货前判断、内容测款、产品库沉淀、候选产品PK和复盘决策整合成一个闭环式 AI 进货工作台。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Info title="核心能力" items={["图片识别", "利润测算", "风险判断", "内容测款", "产品库", "候选PK"]} />
          <Info title="适用场景" items={["义乌拿货", "校园零售", "小红书开店", "抖音测款", "文创产品", "饰品家居"]} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-8">
        <h3 className="text-2xl font-black text-emerald-300">完整闭环</h3>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          {flowSteps.map(([title, desc], index) => (
            <p key={title} className="rounded-2xl bg-white/[0.06] p-4">
              <b className="text-emerald-300">{index + 1}. {title}：</b>{desc}
            </p>
          ))}
        </div>
        <button onClick={() => setMode("operate")} className="mt-6 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">
          开始进货判断
        </button>
      </section>
    </div>
  );
}

function Info({ title, items }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <h3 className="font-black text-white">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full bg-emerald-300/10 px-3 py-1 text-sm font-bold text-emerald-200">{item}</span>
        ))}
      </div>
    </div>
  );
}

function OperateView({ product, update, image, setImage, result, setProduct, setAnalyzed, setMode, analyzeImageWithAI, aiLoading }) {
function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSize = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedImage = canvas.toDataURL("image/jpeg", 0.72);
        setImage(compressedImage);
        setProduct(blankProduct);
        setAnalyzed(false);
      };

      img.onerror = () => {
        alert("图片读取失败，请换一张图片再试。");
      };

      img.src = String(reader.result);
    };

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

function ResultView({ product, image, result, analyzed, setMode, copyReport, copied, saveCurrentReport, saveMessage, aiInsight, downloadReport }) {
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
            <p className="mt-2 text-slate-400">先看结论，再看依据，最后看完整报告。</p>
          </div>
          <span className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-black">{result.status}</span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Card label="综合评分" value={`${result.totalScore}/100`} />
          <Card label="AI建议" value={result.level} />
          <Card label="预计毛利率" value={`${Math.round(result.margin * 100)}%`} />
          <Card label="首批压货" value={`¥${money(result.stockCost)}`} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <p className="text-sm text-slate-400">当前产品</p>
          <h2 className="mt-2 text-3xl font-black text-emerald-300">{product.name || "未命名产品"}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Card label="单件利润" value={`¥${money(result.profit)}`} />
            <Card label="单件成本" value={`¥${money(result.unitCost)}`} />
            <Card label="建议售价" value={`¥${product.price || 0}`} />
            <Card label="竞品价格" value={product.competitorPrice || "待补充"} />
          </div>
          {image && <img src={image} alt="产品图" className="mt-5 max-h-80 w-full rounded-3xl object-contain bg-black/30" />}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
          <h2 className="text-2xl font-black">AI评分依据</h2>
          <div className="mt-5 space-y-4">
            {result.explanations.map(([label, value, reason]) => (
              <div key={label} className="rounded-3xl bg-white/[0.06] p-4">
                <Score label={label} value={value} />
                <p className="mt-3 text-sm leading-7 text-slate-300">{reason}</p>
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
          <p className="mt-4 rounded-2xl bg-emerald-300 p-4 font-black text-black">封面：{result.market.cover}</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {result.market.xhsTitles.map((title, index) => (
              <p key={title} className="rounded-2xl bg-black/25 p-4">标题{index + 1}：{title}</p>
            ))}
          </div>
          <h3 className="mt-5 font-black text-white">8页图文结构</h3>
          <ol className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            {result.xhsStructure.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
          </ol>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <h2 className="text-2xl font-black">抖音视频脚本</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {result.market.douyinScript.map((shot, index) => (
              <p key={shot} className="rounded-2xl bg-black/25 p-4">镜头{index + 1}：{shot}</p>
            ))}
          </div>
          <h3 className="mt-5 font-black text-white">主要风险</h3>
          <div className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
            {result.risks.map((risk, index) => (
              <p key={risk} className="rounded-2xl bg-black/25 p-4"><b className="text-amber-300">风险{index + 1}：</b>{risk}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">完整AI进货报告</h2>
            <p className="mt-2 text-sm text-slate-400">可复制给团队、保存到产品库，或下载为TXT报告。</p>
            {saveMessage && <p className="mt-3 rounded-2xl bg-emerald-300/10 p-3 text-sm text-emerald-100">{saveMessage}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setMode("operate")} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white">返回修改</button>
            <button onClick={saveCurrentReport} className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">保存到我的产品库</button>
            <button onClick={copyReport} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">{copied ? "已复制" : "复制给团队"}</button>
            <button onClick={downloadReport} className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-black text-emerald-200">下载报告</button>
          </div>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-3xl bg-white/[0.06] p-5 text-sm leading-8 text-slate-200">{result.report}</pre>
      </section>
    </div>
  );
}

function ReviewView({ product, result, review, setReview, saveCurrentReport, saveMessage }) {
  const views = n(review.views);
  const likes = n(review.likes);
  const saves = n(review.saves);
  const comments = n(review.comments);
  const inquiries = n(review.inquiries);
  const orders = n(review.orders);
  const cost = n(review.cost);

  const engagementRate = views ? ((likes + saves + comments) / views) * 100 : 0;
  const inquiryRate = views ? (inquiries / views) * 100 : 0;
  const conversionRate = inquiries ? (orders / inquiries) * 100 : 0;
  const costPerOrder = orders ? cost / orders : 0;

  let suggestion = "继续观察";
  if (engagementRate >= 8 && inquiryRate >= 1 && orders >= 3) suggestion = "建议补货或扩大测款";
  if (views > 0 && engagementRate < 3 && inquiries === 0) suggestion = "内容吸引力不足，建议先换封面/标题，不建议补货";

  function updateReview(key, value) {
    setReview((old) => ({ ...old, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <p className="text-sm text-emerald-300">Test Review</p>
        <h2 className="text-3xl font-black">测款数据复盘</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">把小红书/抖音/私域的真实数据填进来，判断是否值得补货。</p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="浏览量" value={review.views} onChange={(value) => updateReview("views", value)} placeholder="如：3000" />
          <Input label="点赞数" value={review.likes} onChange={(value) => updateReview("likes", value)} placeholder="如：120" />
          <Input label="收藏数" value={review.saves} onChange={(value) => updateReview("saves", value)} placeholder="如：80" />
          <Input label="评论数" value={review.comments} onChange={(value) => updateReview("comments", value)} placeholder="如：20" />
          <Input label="私信/询单数" value={review.inquiries} onChange={(value) => updateReview("inquiries", value)} placeholder="如：15" />
          <Input label="实际成交数" value={review.orders} onChange={(value) => updateReview("orders", value)} placeholder="如：5" />
          <Input label="测款成本 / 元" value={review.cost} onChange={(value) => updateReview("cost", value)} placeholder="如：50" wide />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <h2 className="text-2xl font-black">复盘结论</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card label="当前产品" value={product.name || "未命名产品"} />
          <Card label="进货评分" value={`${result.totalScore}/100`} />
          <Card label="互动率" value={`${engagementRate.toFixed(2)}%`} />
          <Card label="询单率" value={`${inquiryRate.toFixed(2)}%`} />
          <Card label="成交转化率" value={`${conversionRate.toFixed(2)}%`} />
          <Card label="单均测款成本" value={`¥${money(costPerOrder)}`} />
        </div>

        <div className="mt-6 rounded-3xl bg-emerald-300 p-5 text-black">
          <p className="text-sm font-bold opacity-70">AI复盘建议</p>
          <h3 className="mt-2 text-2xl font-black">{suggestion}</h3>
          <p className="mt-3 text-sm leading-7 opacity-80">
            判断逻辑：结合互动率、询单率、成交数和测款成本。如果互动高但成交低，优先优化价格和信任信息；如果互动低，优先重做内容封面和标题。
          </p>
        </div>

        <button onClick={saveCurrentReport} className="mt-5 w-full rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black">
          保存本次复盘到产品库
        </button>
        {saveMessage && <p className="mt-3 rounded-2xl bg-white/[0.06] p-3 text-sm text-emerald-100">{saveMessage}</p>}
      </section>
    </div>
  );
}

function HistoryView({ records, loading, message, onDelete, onRestore, onRefresh }) {
  const groups = ["建议补货", "准备拿样", "正在测款", "暂不考虑"];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-emerald-300">My Product Library</p>
          <h2 className="text-3xl font-black text-white">我的产品库</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">保存进货判断、测款结论和完整报告，形成长期选品资产。</p>
        </div>
        <button onClick={onRefresh} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">刷新产品库</button>
      </div>

      {loading && <div className="rounded-3xl bg-black/25 p-6 text-slate-300">正在读取产品库...</div>}
      {message && <div className="mb-4 rounded-3xl bg-amber-300/10 p-5 text-amber-100">{message}</div>}

      {!loading && records.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center text-slate-400">
          你还没有保存任何进货判断。先生成一份进货报告，再点击“保存到我的产品库”。
        </div>
      )}

      <div className="space-y-8">
        {groups.map((group) => {
          const groupRecords = records.filter((record) => getRecordStatus(record).includes(group));
          if (groupRecords.length === 0) return null;
          return (
            <div key={group}>
              <h3 className="mb-3 text-xl font-black text-emerald-300">{group}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {groupRecords.map((record) => (
                  <HistoryCard key={record.id} record={record} onDelete={onDelete} onRestore={onRestore} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HistoryCard({ record, onDelete, onRestore }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="flex gap-4">
        {record.product?.imagePreview && <img src={record.product.imagePreview} alt="" className="h-24 w-24 rounded-2xl object-cover" />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-black text-white">{record.product_name || "未命名产品"}</h3>
          <p className="mt-2 text-sm text-slate-400">{record.category || "未分类"} · {new Date(record.created_at).toLocaleString()}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-300/10 px-3 py-1 font-bold text-emerald-200">评分：{record.score ?? "暂无"}</span>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 font-bold text-cyan-200">{getRecordStatus(record)}</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold text-slate-300">售价：{record.price || "待补充"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => onRestore(record)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看报告</button>
        <button onClick={() => onDelete(record.id)} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white">删除</button>
      </div>

      {record.report && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold text-emerald-300">展开报告</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/[0.06] p-4 text-xs leading-6 text-slate-300">{record.report}</pre>
        </details>
      )}
    </article>
  );
}

function PKView({ records, loading, message, onRefresh, onRestore }) {
  const sorted = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top = sorted[0];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-emerald-300">Candidate PK</p>
          <h2 className="text-3xl font-black">候选产品PK</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">从产品库中自动排序，帮助你判断哪个产品最值得拿样、测款或补货。</p>
        </div>
        <button onClick={onRefresh} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">刷新候选池</button>
      </div>

      {loading && <div className="rounded-3xl bg-black/25 p-6 text-slate-300">正在读取候选产品...</div>}
      {message && <div className="mb-4 rounded-3xl bg-amber-300/10 p-5 text-amber-100">{message}</div>}

      {!loading && sorted.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center text-slate-400">
          还没有候选产品。先保存几份报告，再来做PK。
        </div>
      )}

      {top && (
        <div className="rounded-3xl bg-emerald-300 p-6 text-black">
          <p className="text-sm font-bold opacity-70">AI优先推荐</p>
          <h3 className="mt-2 text-3xl font-black">{top.product_name}</h3>
          <p className="mt-3 leading-7 opacity-80">
            当前候选池中评分最高，适合作为优先拿样或重点测款对象。建议结合实际测款数据再次复盘后决定是否补货。
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {sorted.map((record, index) => (
          <div key={record.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-300">#{index + 1}</p>
                <h3 className="text-2xl font-black">{record.product_name}</h3>
                <p className="mt-2 text-sm text-slate-400">{record.advice}</p>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <span className="rounded-full bg-emerald-300/10 px-3 py-2 font-bold text-emerald-200">评分 {record.score ?? 0}</span>
                <span className="rounded-full bg-cyan-300/10 px-3 py-2 font-bold text-cyan-200">{getRecordStatus(record)}</span>
                <button onClick={() => onRestore(record)} className="rounded-full bg-emerald-300 px-3 py-2 font-black text-black">查看</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DemoView({ applyDemo }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <p className="text-sm text-emerald-300">Judge Demo</p>
      <h2 className="text-3xl font-black">评委快速演示</h2>
      <p className="mt-2 text-sm leading-7 text-slate-400">不用依赖实时识图接口，直接查看三个不同品类的完整判断结果，保证现场展示稳定。</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {demoProducts.map((demo) => (
          <button key={demo.name} onClick={() => applyDemo(demo)} className="rounded-[2rem] border border-white/10 bg-black/30 p-6 text-left transition hover:-translate-y-1 hover:bg-white/[0.08]">
            <p className="text-sm text-emerald-300">{demo.category}</p>
            <h3 className="mt-2 text-2xl font-black text-white">{demo.name}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-400">{demo.note}</p>
            <p className="mt-5 font-black text-emerald-300">查看完整案例 →</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function Input({ label, value, onChange, placeholder, wide }) {
  return (
    <label className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
    </label>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
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