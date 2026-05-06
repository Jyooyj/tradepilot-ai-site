import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const candidateStatuses = ["已保存", "准备拿样", "正在测款", "建议补货", "暂不考虑"];

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
  status: "准备拿样",
  reviewViews: "2400",
  reviewLikes: "168",
  reviewCollects: "96",
  reviewComments: "31",
  reviewInquiries: "18",
  reviewOrders: "9",
  reviewCost: "80",
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
  status: "已保存",
  reviewViews: "",
  reviewLikes: "",
  reviewCollects: "",
  reviewComments: "",
  reviewInquiries: "",
  reviewOrders: "",
  reviewCost: "",
};

const demoProducts = [
  {
    ...initialProduct,
    name: "蝴蝶结珍珠耳夹",
    category: "饰品 / 耳饰",
    status: "准备拿样",
    note: "适合拍穿搭、礼物推荐和学生党低预算精致感内容。",
  },
  {
    ...initialProduct,
    name: "大肠发圈套装",
    category: "饰品 / 发饰",
    cost: "1.2",
    price: "9.9",
    moq: "200",
    material: "雪纺 / 缎面 / 弹力绳",
    audience: "学生党、宿舍女生、低价配饰用户",
    keywords: "多巴胺、发量神器、宿舍好物、平价配饰",
    competitorPrice: "6.9-15.9元",
    logistics: "轻货不易碎，但同质化较高",
    status: "正在测款",
    reviewViews: "3800",
    reviewLikes: "210",
    reviewCollects: "170",
    reviewComments: "43",
    reviewInquiries: "12",
    reviewOrders: "7",
    reviewCost: "70",
    note: "单价低，适合套装和颜色组合销售，但同质化较强，需要靠内容包装和组合策略提高客单价。",
  },
  {
    ...initialProduct,
    name: "淡水珍珠项链",
    category: "饰品 / 项链",
    cost: "18",
    price: "69",
    moq: "50",
    material: "淡水珍珠 + 钛钢扣",
    audience: "通勤女生、轻熟风用户、礼物消费人群",
    keywords: "通勤精致感、低预算礼物、珍珠项链、白衬衫穿搭",
    competitorPrice: "49-129元",
    logistics: "小件轻货，需注意包装防压和珍珠瑕疵说明",
    status: "建议补货",
    reviewViews: "5200",
    reviewLikes: "460",
    reviewCollects: "330",
    reviewComments: "76",
    reviewInquiries: "42",
    reviewOrders: "21",
    reviewCost: "120",
    note: "礼物属性和穿搭属性强，内容场景清晰，建议先做高质感拍摄和礼盒包装。",
  },
];

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

function pct(part, total) {
  const p = n(part);
  const t = n(total);
  if (!t) return 0;
  return (p / t) * 100;
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
  const hotWords = ["小红书", "抖音", "学生", "礼物", "拍照", "出片", "法式", "温柔", "春夏", "不打耳洞", "通勤", "新中式", "文创", "治愈", "盲袋", "校园", "精致", "多巴胺", "宿舍", "低预算", "穿搭"];
  const hitWords = hotWords.filter((w) => text.includes(w));
  const hotScore = hitWords.length * 4;

  const profitScore = clamp(margin * 145, 30, 96);
  const audienceScore = clamp(55 + product.audience.length / 2 + (product.channel.includes("小红书") ? 8 : 0) + (product.channel.includes("抖音") ? 6 : 0), 45, 95);
  const socialScore = clamp(50 + hotScore + (hasImage ? 8 : 0), 40, 96);
  const supplyScore = clamp(92 - (moq > 300 ? 28 : moq > 150 ? 18 : moq > 80 ? 10 : 2) + (product.supplier.includes("补货") ? 6 : 0) + (product.supplier.includes("混批") ? 4 : 0), 35, 95);
  const riskScore = clamp(78 - (product.competitorPrice ? 0 : 8) - (product.logistics.includes("易碎") ? 14 : 0) - (text.includes("同质化") ? 8 : 0), 40, 92);
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
  if (text.includes("同质化")) risks.push("产品同质化较高，需要通过组合套装、包装、场景化内容或差异化定价提高竞争力。 ");
  if (risks.length === 0) risks.push("基础风险较可控，但仍需核实样品与大货一致性、质检信息和售后条款。 ");

  const actions = [
    "先拿样或小批量进货，不建议直接大批量压货。",
    "用小红书/抖音发布2-3条测款内容，观察收藏率、评论询单率、私信咨询量。",
    "用朋友圈、校园群、社群或私域做小范围成交验证，记录真实转化。",
    "如果互动率和询单率较好，再和供应商谈补货周期、混批政策和包装定制。",
    "复盘每款产品的数据，把评分、利润、内容表现和销量记录到选品表。",
  ];

  const titles = [
    `进货前我用AI算了算：这款${product.name || "产品"}到底值不值得拿？`,
    `${product.price || "这个价位"}元的${product.name || "小商品"}，利润空间真的够吗？`,
    `别盲目进货！这款${product.name || "产品"}更适合先小批量测款`,
    `新手进货别只看颜值，我建议先看这4个指标`,
  ];

  const xhsPackage = {
    cover: `别让第一次进货，变成第一次压货`,
    titles,
    noteStructure: [
      "第1页：封面——一句话讲清楚产品卖点或避坑点",
      "第2页：产品图——展示细节、材质、尺寸和使用场景",
      "第3页：价格账本——拿货价、建议售价、预估利润",
      "第4页：适合人群——谁会买、为什么买、什么场景买",
      "第5页：竞品对比——同类价格区间和差异化卖点",
      "第6页：风险提示——MOQ、补货、包装、同质化",
      "第7页：测款计划——先发几条内容、看哪些数据",
      "第8页：互动问题——你觉得这个价位能接受吗？",
    ],
    body: `我现在不会看到好看的货就冲动下单，而是先看四件事：利润空间、目标人群、内容传播、供应风险。以${product.name || "这款产品"}为例，拿货价约${product.cost || "待补充"}元，建议售价约${product.price || "待补充"}元，适合${product.audience || "目标用户待补充"}。如果先做内容测款，我会重点观察收藏率、评论询单和私信咨询量，再决定是否补货。`,
    hashtags: ["#进货避坑", "#选品测款", "#小红书开店", "#创业日记", "#低成本创业", "#拿货笔记"],
    commentGuide: ["这个价位你会买吗？", "你更喜欢哪个颜色/款式？", "想看我继续测哪类产品？"],
  };

  const douyinPackage = {
    hook: `进货前别急着下单，先用30秒算清这款${product.name || "产品"}能不能赚钱。`,
    script: [
      "镜头1：展示产品近景，口播：这款看起来好卖，但我不会直接压货。",
      `镜头2：展示计算过程，口播：拿货价${product.cost || "待补充"}元，建议售价${product.price || "待补充"}元，先看毛利够不够。`,
      "镜头3：展示适合人群，口播：它适合谁、在哪个平台卖、内容好不好拍，这些比颜值更重要。",
      "镜头4：展示风险提示，口播：MOQ、补货周期和同款竞争决定了能不能长期卖。",
      "镜头5：结尾互动，口播：你觉得这款值得拿样吗？评论区投票。",
    ],
    shootingTips: ["多拍产品细节", "展示使用场景", "用价格对比增强决策感", "结尾做投票互动"],
  };

  const review = analyzeReview(product);
  const explanations = [
    {
      label: "利润空间",
      score: Math.round(profitScore),
      reason: margin >= 0.45 ? "售价相对拿货价有较明显空间，扣除包装、物流和平台费后仍有较好毛利。" : "利润空间偏紧，后续推广、退换货和包装成本可能压缩利润。",
    },
    {
      label: "人群匹配",
      score: Math.round(audienceScore),
      reason: product.audience ? "目标人群描述较清晰，便于做内容定位、定价和渠道选择。" : "目标人群信息不足，后续内容表达和投放方向会不够聚焦。",
    },
    {
      label: "内容传播潜力",
      score: Math.round(socialScore),
      reason: hitWords.length > 0 ? `命中 ${hitWords.slice(0, 6).join("、")} 等内容关键词，适合做种草、避坑或穿搭场景。` : "缺少明显内容关键词，需要补充卖点、场景或情绪价值。",
    },
    {
      label: "供应稳定性",
      score: Math.round(supplyScore),
      reason: product.supplier.includes("补货") ? "供应商补货信息较明确，适合在测款成功后继续跟进。" : "补货周期不明确，爆单后可能出现断货或交付不稳定。",
    },
    {
      label: "风险可控度",
      score: Math.round(riskScore),
      reason: product.competitorPrice ? "已有竞品价格参考，能更好判断定价区间和竞争压力。" : "竞品价格缺失，容易出现定价过高或低估竞争的问题。",
    },
    {
      label: "信息完整度",
      score: Math.round(infoScore),
      reason: missing.length === 0 ? "核心字段基本完整，可以生成较可靠的进货判断。" : `仍缺少 ${missing.join("、")}，建议补充后再做最终决策。`,
    },
  ];

  const report = `【TradePilot AI 进货决策报告】

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
候选状态：${product.status || "已保存"}

二、AI综合判断
综合评分：${totalScore}/100
决策建议：${level}
判断逻辑：系统综合考虑利润空间、目标人群清晰度、内容传播潜力、供应链稳定性、风险可控度和信息完整度。

三、利润测算
单件综合成本：${money(unitCost)} 元
预估单件利润：${money(profit)} 元
预估毛利率：${Math.round(margin * 100)}%
首批压货资金：${money(stockCost)} 元
说明：该测算默认包装成本0.8元、物流成本1.2元、平台费率5%，实际经营时需根据渠道重新校正。

四、评分依据
${explanations.map((e) => `${e.label}：${e.score}分。${e.reason}`).join(String.fromCharCode(10))}

五、核心风险提示
${risks.map((r, i) => `${i + 1}. ${r}`).join(String.fromCharCode(10))}

六、小红书测款内容包
封面文案：${xhsPackage.cover}
标题建议：
${titles.map((t, i) => `${i + 1}. ${t}`).join(String.fromCharCode(10))}
正文开头：${xhsPackage.body}
推荐标签：${xhsPackage.hashtags.join(" ")}
评论区互动：${xhsPackage.commentGuide.join(" / ")}

七、抖音短视频内容包
前3秒钩子：${douyinPackage.hook}
分镜脚本：
${douyinPackage.script.map((s, i) => `${i + 1}. ${s}`).join(String.fromCharCode(10))}

八、测款复盘
浏览量：${product.reviewViews || "未填写"}
收藏率：${money(review.collectRate)}%
询单率：${money(review.inquiryRate)}%
成交转化率：${money(review.orderRate)}%
复盘建议：${review.advice}

九、下一步行动清单
${actions.map((a, i) => `${i + 1}. ${a}`).join(String.fromCharCode(10))}

十、补充建议
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
    explanations,
    xhsPackage,
    douyinPackage,
    review,
    hitWords,
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

function analyzeReview(product) {
  const views = n(product.reviewViews);
  const likes = n(product.reviewLikes);
  const collects = n(product.reviewCollects);
  const comments = n(product.reviewComments);
  const inquiries = n(product.reviewInquiries);
  const orders = n(product.reviewOrders);
  const cost = n(product.reviewCost);
  const interactRate = pct(likes + collects + comments, views);
  const collectRate = pct(collects, views);
  const inquiryRate = pct(inquiries, views);
  const orderRate = pct(orders, inquiries || views);
  const cac = orders > 0 ? cost / orders : 0;

  let advice = "测款数据不足，建议先发布2-3条内容积累基础反馈。";
  let level = "待观察";
  if (views >= 1000 && collectRate >= 3 && inquiryRate >= 0.5) {
    advice = "内容反馈较好，建议进入小批量拿样或补货谈判阶段。";
    level = "可继续推进";
  }
  if (views >= 1000 && collectRate < 1 && inquiryRate < 0.2) {
    advice = "内容吸引力和询单偏弱，建议先优化封面、标题、价格锚点和使用场景，不建议贸然补货。";
    level = "暂缓补货";
  }
  if (orders >= 10 && cac > 0 && cac < 10) {
    advice = "已有较明确成交反馈，获客成本可控，可考虑和供应商谈更低拿货价或稳定补货。";
    level = "建议补货";
  }

  return { views, likes, collects, comments, inquiries, orders, cost, interactRate, collectRate, inquiryRate, orderRate, cac, advice, level };
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
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => analyzeProduct(product, Boolean(image)), [product, image]);

  useEffect(() => {
    if (mode === "history" || mode === "pk") {
      loadHistoryRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function update(key, value) {
    setProduct((old) => ({ ...old, [key]: value }));
    setAnalyzed(false);
  }

  function copyReport() {
    navigator.clipboard?.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function downloadReport() {
    const blob = new Blob([result.report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.name || "TradePilot进货报告"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function saveCurrentReport() {
    try {
      if (!supabase) {
        alert("Supabase 未初始化，请检查 supabaseClient.js 和 Vercel 环境变量。");
        return;
      }

      setSaving(true);
      const userResult = await supabase.auth.getUser();
      const user = userResult.data?.user;

      if (userResult.error) {
        alert("获取用户失败：" + userResult.error.message);
        return;
      }

      if (!user) {
        alert("请先登录后再保存历史记录。");
        return;
      }

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
          status: product.status || "已保存",
          hasImage: Boolean(image),
          imagePreview: image && image.length < 500000 ? image : "",
        },
        result: {
          totalScore: result?.totalScore ?? 0,
          level: result?.level || "",
          risks: result?.risks || [],
          scores: result?.scores || [],
          explanations: result?.explanations || [],
          review: result?.review || {},
          xhsPackage: result?.xhsPackage || {},
          douyinPackage: result?.douyinPackage || {},
        },
        report: result?.report || "暂无报告内容",
      };

      const insertResult = await supabase.from("product_history").insert(payload);

      if (insertResult.error) {
        alert("保存失败：" + insertResult.error.message);
        console.error(insertResult.error);
        return;
      }

      alert("保存成功，已加入历史记录。");
      await loadHistoryRecords();
    } catch (error) {
      console.error(error);
      alert("保存失败：" + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadHistoryRecords() {
    try {
      if (!supabase) return;
      setHistoryLoading(true);
      setHistoryMessage("");

      const { data, error } = await supabase
        .from("product_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error(error);
        setHistoryMessage("读取历史记录失败：" + error.message);
        return;
      }

      setHistoryRecords(data || []);
    } catch (error) {
      console.error(error);
      setHistoryMessage("读取历史记录失败：" + error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteHistoryRecord(id) {
    const ok = window.confirm("确定删除这条历史记录吗？");
    if (!ok) return;

    const { error } = await supabase.from("product_history").delete().eq("id", id);

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

    try {
      setAiLoading(true);

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          hint: `${product.name || ""} ${product.category || ""} ${product.material || ""} ${product.keywords || ""}`,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("接口返回原文：", text);
        alert("AI识图返回格式异常，请检查接口日志。");
        return;
      }

      if (!response.ok) {
        alert("AI识图失败：" + (data.error || data.message || "未知错误"));
        return;
      }

      const aiProduct = data?.product || {};
      setAiInsight(data);
      setProduct((old) => ({
        ...old,
        name: aiProduct.name || old.name,
        category: aiProduct.category || old.category,
        material: aiProduct.material || old.material,
        channel: aiProduct.channel || old.channel,
        price: aiProduct.price || old.price,
        audience: aiProduct.audience || old.audience,
        competitorPrice: aiProduct.competitorPrice || old.competitorPrice,
        keywords: aiProduct.keywords || old.keywords,
        note: aiProduct.note || old.note,
      }));

      alert("AI识别完成，已自动回填产品信息。");
    } catch (error) {
      console.error(error);
      alert("前端调用失败：" + error.message);
    } finally {
      setAiLoading(false);
    }
  }

  function openDemo(item) {
    setProduct(item);
    setImage(null);
    setAiInsight(null);
    setAnalyzed(true);
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
            OPC AI Challenge · 进货决策与爆款测款智能体
          </div>
          <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
            拿货搭子 TradePilot AI
            <span className="block text-emerald-300">你进货，我判货。</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            面向小商品、饰品、文创、家居、校园零售和内容电商等进货场景，帮助新手创业者完成产品识别、利润测算、风险判断、测款内容生成、历史复盘和候选产品PK。
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <CoverCard title="项目介绍与示例" desc="了解这个项目解决什么问题、适合谁用、进货判断逻辑是什么。" onClick={() => { setPage("app"); setMode("intro"); }} />
            <CoverCard title="开始进货判断" desc="上传产品图，填写拿货价、MOQ、目标人群，一键生成AI进货报告。" highlight onClick={() => { setPage("app"); setMode("operate"); }} />
            <CoverCard title="评委快速演示" desc="3个内置案例，直接展示评分、内容包、复盘和决策报告。" onClick={() => { setPage("app"); setMode("demo"); }} />
          </div>
          <p className="mt-10 text-sm text-slate-500">别让第一次进货，变成第一次压货。先算账，再冲动。</p>
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
            <h1 className="text-xl font-black">拿货搭子｜进货决策与爆款测款智能体</h1>
          </button>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Tab active={mode === "intro"} onClick={() => setMode("intro")}>介绍示例</Tab>
            <Tab active={mode === "operate"} onClick={() => setMode("operate")}>用户操作</Tab>
            <Tab active={mode === "result"} onClick={() => setMode("result")}>识别报告</Tab>
            <Tab active={mode === "review"} onClick={() => setMode("review")}>测款复盘</Tab>
            <Tab active={mode === "history"} onClick={() => setMode("history")}>历史记录</Tab>
            <Tab active={mode === "pk"} onClick={() => setMode("pk")}>选品PK台</Tab>
            <Tab active={mode === "demo"} onClick={() => setMode("demo")}>评委演示</Tab>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {mode === "intro" && <IntroView setMode={setMode} openDemo={openDemo} />}
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
            saving={saving}
            aiInsight={aiInsight}
            downloadReport={downloadReport}
          />
        )}
        {mode === "review" && <ReviewView product={product} update={update} result={result} setMode={setMode} />}
        {mode === "history" && (
          <HistoryView
            historyRecords={historyRecords}
            historyLoading={historyLoading}
            historyMessage={historyMessage}
            deleteHistoryRecord={deleteHistoryRecord}
            restoreHistoryRecord={(record) => {
              if (record.product) setProduct({ ...blankProduct, ...record.product });
              setAnalyzed(true);
              setMode("result");
            }}
          />
        )}
        {mode === "pk" && <PKView historyRecords={historyRecords} historyLoading={historyLoading} openDemo={openDemo} />}
        {mode === "demo" && <DemoView openDemo={openDemo} />}
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

function IntroView({ setMode, openDemo }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
        <p className="mb-4 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-black">项目介绍</p>
        <h2 className="text-4xl font-black leading-tight">把“凭感觉进货”变成“有评分、有内容、有复盘”的AI进货决策流程。</h2>
        <p className="mt-5 text-base leading-8 text-slate-300">
          新手进货常见问题不是找不到货，而是不会判断：利润够不够、目标人群清不清楚、内容好不好测、供应链稳不稳、要不要补货。TradePilot AI 将这些问题拆解成可执行流程：采集产品信息、AI识别、利润测算、风险判断、测款内容生成、历史保存、选品PK和数据复盘。
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Info title="适合谁" items={["大学生创业者", "小微商家", "内容电商卖家", "校园零售团队", "低成本副业人群"]} />
          <Info title="核心能力" items={["AI识图", "利润测算", "爆款评分", "内容测款", "数据复盘", "候选PK"]} />
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-8">
        <h3 className="text-2xl font-black text-emerald-300">评委可快速理解的产品闭环</h3>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          <p className="rounded-2xl bg-white/[0.06] p-4">1. 进货前：上传图片和价格信息，AI识别产品并测算利润。</p>
          <p className="rounded-2xl bg-white/[0.06] p-4">2. 进货中：生成评分依据、风险提示、小红书/抖音测款内容包。</p>
          <p className="rounded-2xl bg-white/[0.06] p-4">3. 进货后：保存历史、记录测款数据、PK候选产品，判断是否补货。</p>
        </div>
        <button onClick={() => setMode("operate")} className="mt-6 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">开始填写产品</button>
        <button onClick={() => openDemo(demoProducts[2])} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-black text-white">查看高潜力示例</button>
      </section>
    </div>
  );
}

function Info({ title, items }) {
  return <div className="rounded-3xl border border-white/10 bg-black/25 p-5"><h3 className="font-black text-white">{title}</h3><div className="mt-4 flex flex-wrap gap-2">{items.map((i) => <span key={i} className="rounded-full bg-emerald-300/10 px-3 py-1 text-sm font-bold text-emerald-200">{i}</span>)}</div></div>;
}

function OperateView({ product, update, image, setImage, result, setProduct, setAnalyzed, setMode, analyzeImageWithAI, aiLoading }) {
  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("图片建议小于3MB，避免AI识别接口超限。请压缩后再上传。");
      return;
    }
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
        <p className="mt-2 text-sm leading-7 text-slate-400">适合上传供应商图、样品图、商品细节图。图片用于辅助识别产品、推断人群和内容表现。</p>
        <div className="mt-5 grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/20 bg-black/25 p-4">
          {image ? <img src={image} alt="产品图" className="max-h-80 rounded-3xl object-contain" /> : <div className="text-center text-slate-400"><p className="text-5xl">📷</p><p className="mt-3 font-bold">暂未上传产品图</p></div>}
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
            <p className="mt-2 text-sm text-slate-400">字段越完整，AI判断越可靠。价格、MOQ、人群和渠道是核心字段。</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-300">当前建议：{result.level}</div>
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
          <SelectInput label="候选状态" value={product.status} onChange={(v) => update("status", v)} options={candidateStatuses} />
          <Input label="竞品价格" value={product.competitorPrice} onChange={(v) => update("competitorPrice", v)} placeholder="如：15.9-29.9元" />
          <Input label="供应商信息" value={product.supplier} onChange={(v) => update("supplier", v)} placeholder="如：支持混批，7天补货" wide />
          <Input label="社媒热词" value={product.keywords} onChange={(v) => update("keywords", v)} placeholder="如：温柔风、法式、学生党" wide />
          <Input label="物流/包装风险" value={product.logistics} onChange={(v) => update("logistics", v)} placeholder="如：小件轻货/易碎" />
          <Input label="补充备注" value={product.note} onChange={(v) => update("note", v)} placeholder="如：适合礼物场景，建议先拿样" wide />
        </div>

        {result.missing.length > 0 && <p className="mt-4 rounded-2xl bg-amber-300/10 p-4 text-sm leading-7 text-amber-200">还缺少：{result.missing.join("、")}。补充后报告会更准确。</p>}
        <button onClick={analyze} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-lg font-black text-black">AI识别判断，生成进货报告</button>
      </section>
    </div>
  );
}

function ResultView({ product, image, result, analyzed, setMode, copyReport, copied, saveCurrentReport, saving, aiInsight, downloadReport }) {
  const score = result?.totalScore ?? 0;
  const advice = result?.level || "暂无建议";
  const report = result?.report || "暂无报告";
  return (
    <div className="space-y-6">
      {!analyzed && <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">你还没有点击“AI识别判断”。当前展示的是实时预览结果。</div>}
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <p className="text-sm text-slate-400">当前产品</p>
          <h2 className="mt-2 text-3xl font-black text-emerald-300">{product.name || "未命名产品"}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Card label="综合评分" value={`${score}/100`} />
            <Card label="AI建议" value={advice} />
            <Card label="候选状态" value={product.status || "已保存"} />
            <Card label="单件利润" value={`¥${money(result.profit)}`} />
            <Card label="毛利率" value={`${Math.round(result.margin * 100)}%`} />
            <Card label="首批压货" value={`¥${money(result.stockCost)}`} />
          </div>
          {image && <img src={image} alt="产品图" className="mt-5 max-h-80 w-full rounded-3xl object-contain bg-black/30" />}
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
          <h2 className="text-2xl font-black">多维度识别结果</h2>
          <div className="mt-5 space-y-4">{result.scores.map(([label, value]) => <Score key={label} label={label} value={value} />)}</div>
          <div className="mt-6 rounded-3xl bg-white/[0.06] p-5">
            <h3 className="font-black text-white">用户下一步应该怎么做？</h3>
            <ol className="mt-3 space-y-2 text-sm leading-7 text-slate-300">{result.actions.map((a, i) => <li key={a}>{i + 1}. {a}</li>)}</ol>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-6">
        <h2 className="text-2xl font-black text-emerald-200">AI评分依据解释</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{result.explanations.map((item) => <ExplainCard key={item.label} item={item} />)}</div>
      </section>

      {aiInsight && <AIInsightView aiInsight={aiInsight} />}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <h2 className="text-2xl font-black">核心风险提示</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">{result.risks.map((r, i) => <p key={r} className="rounded-2xl bg-black/25 p-4"><b className="text-amber-300">风险 {i + 1}：</b>{r}</p>)}</div>
        </div>
        <ContentPackage result={result} />
      </section>

      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6">
        <h2 className="text-2xl font-black text-cyan-200">测款复盘结果</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card label="收藏率" value={`${money(result.review.collectRate)}%`} />
          <Card label="询单率" value={`${money(result.review.inquiryRate)}%`} />
          <Card label="成交转化率" value={`${money(result.review.orderRate)}%`} />
        </div>
        <p className="mt-4 rounded-2xl bg-black/25 p-4 text-sm leading-7 text-slate-300">{result.review.advice}</p>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">完整AI进货决策报告</h2>
            <p className="mt-2 text-sm text-slate-400">可复制给队友、下载留档、放进项目仓库、用于评审演示或后续复盘。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setMode("operate")} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white">返回修改</button>
            <button onClick={saveCurrentReport} disabled={saving} className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black disabled:opacity-60">{saving ? "保存中..." : "保存到历史"}</button>
            <button onClick={downloadReport} className="rounded-2xl bg-violet-300 px-5 py-3 font-black text-black">下载报告</button>
            <button onClick={copyReport} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">{copied ? "已复制" : "复制报告"}</button>
          </div>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-3xl bg-white/[0.06] p-5 text-sm leading-8 text-slate-200">{report}</pre>
      </section>
    </div>
  );
}

function ReviewView({ product, update, result, setMode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <h2 className="text-2xl font-black">测款数据录入</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">用于进货后的复盘判断：内容有没有吸引力、是否有人询单、是否值得补货。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="浏览量" value={product.reviewViews} onChange={(v) => update("reviewViews", v)} placeholder="如：2400" />
          <Input label="点赞数" value={product.reviewLikes} onChange={(v) => update("reviewLikes", v)} placeholder="如：168" />
          <Input label="收藏数" value={product.reviewCollects} onChange={(v) => update("reviewCollects", v)} placeholder="如：96" />
          <Input label="评论数" value={product.reviewComments} onChange={(v) => update("reviewComments", v)} placeholder="如：31" />
          <Input label="私信/询单数" value={product.reviewInquiries} onChange={(v) => update("reviewInquiries", v)} placeholder="如：18" />
          <Input label="成交数" value={product.reviewOrders} onChange={(v) => update("reviewOrders", v)} placeholder="如：9" />
          <Input label="测款成本 / 元" value={product.reviewCost} onChange={(v) => update("reviewCost", v)} placeholder="如：80" />
        </div>
        <button onClick={() => setMode("result")} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">生成复盘结论</button>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6">
        <h2 className="text-2xl font-black">复盘指标</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Card label="互动率" value={`${money(result.review.interactRate)}%`} />
          <Card label="收藏率" value={`${money(result.review.collectRate)}%`} />
          <Card label="询单率" value={`${money(result.review.inquiryRate)}%`} />
          <Card label="成交转化率" value={`${money(result.review.orderRate)}%`} />
          <Card label="单个订单获客成本" value={`¥${money(result.review.cac)}`} />
          <Card label="复盘等级" value={result.review.level} />
        </div>
        <p className="mt-5 rounded-3xl bg-white/[0.06] p-5 text-sm leading-7 text-slate-300">{result.review.advice}</p>
      </section>
    </div>
  );
}

function HistoryView({ historyRecords, historyLoading, historyMessage, deleteHistoryRecord, restoreHistoryRecord }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-emerald-300">Product History</p>
          <h2 className="text-3xl font-black text-white">历史记录</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">保存当前账号判断过的产品、评分、建议和完整报告。每个用户只能看到自己的记录。</p>
        </div>
        <div className="flex flex-wrap gap-2">{candidateStatuses.map((s) => <span key={s} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">{s}</span>)}</div>
      </div>
      {historyLoading && <div className="rounded-3xl bg-black/25 p-6 text-slate-300">正在读取历史记录...</div>}
      {historyMessage && <div className="mb-4 rounded-3xl bg-amber-300/10 p-5 text-amber-100">{historyMessage}</div>}
      {!historyLoading && historyRecords.length === 0 && <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center text-slate-400">暂无历史记录。生成报告后，点击“保存到历史”即可保存。</div>}
      <div className="grid gap-4">
        {historyRecords.map((record) => (
          <article key={record.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                {record.product?.imagePreview && <img src={record.product.imagePreview} alt="历史产品图" className="mb-4 max-h-44 rounded-2xl bg-black/30 object-contain" />}
                <h3 className="text-xl font-black text-white">{record.product_name || "未命名产品"}</h3>
                <p className="mt-2 text-sm text-slate-400">{record.category || "未分类"} · {new Date(record.created_at).toLocaleString()}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Badge text={`评分：${record.score ?? "暂无"}`} />
                  <Badge text={`售价：${record.price || "待补充"}`} />
                  <Badge text={record.product?.status || "已保存"} />
                  <Badge text={record.advice || "暂无建议"} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => restoreHistoryRecord(record)} className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看</button>
                <button onClick={() => deleteHistoryRecord(record.id)} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white">删除</button>
              </div>
            </div>
            {record.report && <details className="mt-4"><summary className="cursor-pointer text-sm font-bold text-emerald-300">展开报告</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/[0.06] p-4 text-xs leading-6 text-slate-300">{record.report}</pre></details>}
          </article>
        ))}
      </div>
    </section>
  );
}

function PKView({ historyRecords, historyLoading, openDemo }) {
  const source = historyRecords.length > 0 ? historyRecords : demoProducts.map((p, index) => {
    const r = analyzeProduct(p, false);
    return { id: `demo-${index}`, product_name: p.name, category: p.category, score: r.totalScore, advice: r.level, price: p.price, product: p, result: r, created_at: new Date().toISOString() };
  });
  const ranked = [...source].sort((a, b) => (b.score || 0) - (a.score || 0));
  const best = ranked[0];
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6">
        <p className="text-sm text-emerald-300">Candidate Pool</p>
        <h2 className="text-3xl font-black">选品PK台</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">系统会把历史记录中的候选产品按评分、利润空间和风险建议排序，帮助用户判断哪个更值得拿样、测款或补货。</p>
      </div>
      {historyLoading && <p className="rounded-2xl bg-black/25 p-4 text-slate-300">正在读取候选产品...</p>}
      {best && <div className="mb-5 rounded-3xl bg-emerald-300 p-6 text-black"><p className="text-sm font-bold">当前最推荐</p><h3 className="mt-2 text-3xl font-black">{best.product_name}</h3><p className="mt-2 font-bold">评分 {best.score}/100 · {best.advice}</p></div>}
      <div className="grid gap-4 md:grid-cols-3">
        {ranked.map((item, index) => (
          <button key={item.id} onClick={() => item.product ? openDemo({ ...blankProduct, ...item.product }) : null} className="rounded-3xl border border-white/10 bg-black/30 p-5 text-left hover:bg-white/[0.08]">
            <p className="text-sm font-black text-emerald-300">Rank {index + 1}</p>
            <h3 className="mt-2 text-xl font-black text-white">{item.product_name}</h3>
            <p className="mt-2 text-sm text-slate-400">{item.category || "未分类"}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Badge text={`${item.score ?? 0}分`} /><Badge text={item.product?.status || "候选"} /><Badge text={item.advice || "暂无建议"} /></div>
          </button>
        ))}
      </div>
    </section>
  );
}

function DemoView({ openDemo }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="mb-6">
        <p className="text-sm text-emerald-300">Judge Demo</p>
        <h2 className="text-3xl font-black">评委快速演示</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">不用上传图片，不依赖接口，直接查看3个固定案例，避免现场网络或API不稳定影响展示。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{demoProducts.map((item) => <CoverCard key={item.name} title={item.name} desc={`${item.category}｜拿货价${item.cost}元｜售价${item.price}元｜${item.status}`} onClick={() => openDemo(item)} highlight={item.status === "建议补货"} />)}</div>
    </section>
  );
}

function AIInsightView({ aiInsight }) {
  return (
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
    </section>
  );
}

function ContentPackage({ result }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <h2 className="text-2xl font-black">AI测款内容包</h2>
      <p className="mt-4 rounded-2xl bg-emerald-300 p-4 font-black text-black">封面文案：{result.xhsPackage.cover}</p>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
        {result.xhsPackage.titles.map((t, i) => <p key={t} className="rounded-2xl bg-black/25 p-4">小红书标题{i + 1}：{t}</p>)}
        <p className="rounded-2xl bg-black/25 p-4">正文开头：{result.xhsPackage.body}</p>
        <p className="rounded-2xl bg-black/25 p-4">标签：{result.xhsPackage.hashtags.join(" ")}</p>
        <p className="rounded-2xl bg-black/25 p-4">抖音钩子：{result.douyinPackage.hook}</p>
      </div>
    </div>
  );
}

function ExplainCard({ item }) {
  return <div className="rounded-3xl bg-black/25 p-5"><div className="flex items-center justify-between"><h3 className="font-black text-white">{item.label}</h3><span className="rounded-full bg-emerald-300 px-3 py-1 text-sm font-black text-black">{item.score}分</span></div><p className="mt-3 text-sm leading-7 text-slate-300">{item.reason}</p></div>;
}

function Input({ label, value, onChange, placeholder, wide }) {
  return <label className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-400">{label}</span><input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" /></label>;
}

function SelectInput({ label, value, onChange, options }) {
  return <label className="rounded-2xl border border-white/10 bg-black/25 p-4"><span className="text-xs font-semibold text-slate-400">{label}</span><select value={value || options[0]} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full bg-transparent text-sm text-white outline-none">{options.map((o) => <option key={o} value={o} className="bg-[#08100d] text-white">{o}</option>)}</select></label>;
}

function Card({ label, value }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>;
}

function Score({ label, value }) {
  return <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold text-slate-300">{label}</span><span className="font-black text-emerald-300">{value}</span></div><div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${value}%` }} /></div></div>;
}

function Badge({ text }) {
  return <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">{text}</span>;
}

export default App;
