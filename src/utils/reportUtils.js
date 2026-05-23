import {
  analyzeProduct,
  createContentContext,
  formatEffectivePrice,
  getCategoryNarrative,
  getChannelFit,
  getDouyinVideoPackage,
  getEffectivePrice,
  getMoqAdvice,
  getPlatformKeywordPlan,
  getPriceBand,
  getRecordMetrics,
  getScoringItems,
  getXhsContentPackage,
  inferMarketInfo,
  money,
  n,
  safeArray,
  validateGeneratedContent,
} from "../../App.jsx";

export function formatRecordDate(value) {
  if (!value) return "未填写";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function formatWordMoney(value, fallback = "暂无") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return `¥${money(parsed)}`;
}

export function getReviewRows(review = {}) {
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

  return [
    ["浏览量", views || "未填写"],
    ["点赞", likes || "未填写"],
    ["收藏", saves || "未填写"],
    ["评论", comments || "未填写"],
    ["询单", inquiries || "未填写"],
    ["成交", orders || "未填写"],
    ["测款成本", cost ? `¥${money(cost)}` : "未填写"],
    ["互动率", views ? `${engagementRate.toFixed(1)}%` : "暂无"],
    ["询单率", views ? `${inquiryRate.toFixed(1)}%` : "暂无"],
    ["询单转化率", inquiries ? `${conversionRate.toFixed(1)}%` : "暂无"],
  ];
}

export function hasReviewData(review = {}) {
  return Object.values(review || {}).some((value) => String(value ?? "").trim());
}

export function getWordContentAdvice(result = {}) {
  const items = [
    result.samplingStrategy?.headline,
    ...(result.samplingStrategy?.checkpoints || []).slice(0, 3),
    ...(result.nextTestActions || []).slice(0, 2),
    result.xhsPackage?.coverDesign,
    result.xhsPackage?.merchantStrategy,
    result.douyinPackage?.direction,
    result.douyinPackage?.merchantGoal,
  ].filter(Boolean);

  return items.length ? items : ["暂无"];
}

export function generateProductLibraryWordDocument(records = []) {
  const exportedAt = new Date().toLocaleString("zh-CN", { hour12: false });
  const productSections = records.map((record, index) => {
    const product = record?.product || {};
    const analyzedResult = record?.product ? analyzeProduct(product, Boolean(product.imagePreview)) : null;
    const savedResult = record?.result || {};
    const result = analyzedResult || savedResult;
    const metrics = getRecordMetrics(record);
    const review = savedResult.review || record?.review || {};
    const effectivePrice = analyzedResult?.effectivePrice || savedResult.effectivePrice || getEffectivePrice(product);
    const risks = safeArray(analyzedResult?.risks || savedResult.risks);
    const logisticsRisk = [
      product.logistics,
      product.supplier,
      risks.slice(0, 2).join("；"),
    ].filter(Boolean).join("；") || "未填写";
    const margin = Number(analyzedResult?.margin ?? savedResult.margin ?? metrics.margin);
    const profit = Number(analyzedResult?.profit ?? savedResult.profit);
    const stockCost = Number(analyzedResult?.stockCost ?? savedResult.stockCost ?? metrics.stockCost);
    const rows = [
      ["产品名称", metrics.displayName || record?.product_name || product.name || "未命名产品"],
      ["产品类型 / 品类", metrics.productTypeLabel || record?.category || product.category || "未分类"],
      ["拿货价", product.cost || (effectivePrice.cost ? `¥${money(effectivePrice.cost)}` : "未填写")],
      ["建议售价", record?.price || product.price || formatEffectivePrice(effectivePrice, "未填写")],
      ["MOQ 最小起订量", product.moq || "未填写"],
      ["材质", product.material || "未填写"],
      ["目标人群", product.audience || "未填写"],
      ["销售渠道", product.channel || "未填写"],
      ["竞品价格", record?.competitor_price || product.competitorPrice || "未填写"],
      ["物流 / 供应风险", logisticsRisk],
      ["综合评分", metrics.score ? `${Math.round(metrics.score)}/100` : "暂无"],
      ["AI 进货建议", result.level || record?.advice || metrics.status || "暂无"],
      ["预计毛利率", Number.isFinite(margin) ? `${Math.round(margin * 100)}%` : "暂无"],
      ["单件利润", Number.isFinite(profit) ? formatWordMoney(profit) : "暂无"],
      ["首批压货资金", Number.isFinite(stockCost) ? formatWordMoney(stockCost) : "暂无"],
      ["保存时间 / 创建时间", formatRecordDate(record?.created_at)],
    ];

    return `
      <section class="product-card">
        <h2>${index + 1}. ${escapeHtml(metrics.displayName || record?.product_name || product.name || "未命名产品")}</h2>
        ${htmlTable(["字段", "内容"], rows)}
        <h3>内容测款建议</h3>
        ${htmlList(getWordContentAdvice(result), false)}
        <h3>测款复盘数据</h3>
        ${hasReviewData(review) ? htmlTable(["指标", "数据"], getReviewRows(review)) : '<p class="muted">暂无测款复盘数据。</p>'}
      </section>
      <hr>
    `;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>TradePilot AI｜产品库复盘报告</title>
  <style>
    body {
      margin: 0;
      padding: 28px;
      color: #14221b;
      font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
      line-height: 1.7;
      background: #ffffff;
    }
    h1 {
      margin: 0 0 12px;
      color: #0f3f2d;
      font-size: 28px;
      font-weight: 800;
    }
    h2 {
      margin: 0 0 14px;
      color: #11633f;
      font-size: 20px;
      font-weight: 800;
    }
    h3 {
      margin: 18px 0 8px;
      color: #164d38;
      font-size: 16px;
      font-weight: 800;
    }
    p { margin: 8px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px;
    }
    th, td {
      border: 1px solid #cbd5d0;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }
    th {
      background: #e7f5ee;
      color: #0f3f2d;
      font-weight: 800;
    }
    ul { margin: 8px 0 14px 22px; padding: 0; }
    li { margin: 4px 0; }
    .summary {
      margin-bottom: 22px;
      padding: 16px 18px;
      border: 1px solid #b7d8ca;
      background: #f3fbf7;
    }
    .product-card {
      margin: 22px 0;
      padding: 18px;
      border: 1px solid #b7d8ca;
      background: #fbfffd;
      page-break-inside: avoid;
    }
    .strong { font-weight: 800; color: #0f3f2d; }
    .muted { color: #64756d; }
    hr {
      border: none;
      border-top: 1px solid #d8e4df;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>TradePilot AI｜产品库复盘报告</h1>
  <div class="summary">
    <p><span class="strong">导出时间：</span>${escapeHtml(exportedAt)}</p>
    <p><span class="strong">产品记录数量：</span>${escapeHtml(records.length)}</p>
    <p><span class="strong">说明：</span>本报告由 TradePilot AI 根据本地产品库记录生成，用于选品复盘、候选产品对比和团队讨论。</p>
  </div>
  ${productSections || '<p class="muted">暂无产品记录。</p>'}
</body>
</html>`;
}

export function cleanFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export function escapeHtml(value) {
  const text = value === undefined || value === null || value === "" ? "未填写" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\r?\n/g, "<br>")
    .trim() || "未填写";
}

export function htmlTable(headers, rows) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${(rows || [])
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function htmlList(items, ordered = true) {
  const safeItems = (items || []).filter(Boolean);
  const tag = ordered ? "ol" : "ul";
  if (!safeItems.length) return `<${tag}><li>暂无</li></${tag}>`;
  return `<${tag}>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
}

export function htmlChecklist(items) {
  const safeItems = (items || []).filter(Boolean);
  if (!safeItems.length) return `<ul class="checklist"><li><span class="box"></span><span>暂无</span></li></ul>`;
  return `<ul class="checklist">${safeItems.map((item) => `<li><span class="box"></span><span>${escapeHtml(item)}</span></li>`).join("")}</ul>`;
}

export function htmlPills(items) {
  const safeItems = (items || []).filter(Boolean);
  return `<div class="pills">${safeItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>暂无</span>"}</div>`;
}

function renderDouyinEvidenceSection(douyinEvidence) {
  if (!douyinEvidence) return "";

  const heatLevelText = {
    high: "高",
    medium: "中",
    low: "低",
    unknown: "未知",
  };
  const searchLinks = douyinEvidence.searchLinks || [];
  const linkCards = searchLinks.length
    ? searchLinks.map((link) => `
        <div class="card">
          <h3>${escapeHtml(link.label)}</h3>
          <p>${escapeHtml(link.purpose)}</p>
          <p><a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.url)}</a></p>
        </div>
      `).join("")
    : '<div class="card"><p>暂无搜索入口。</p></div>';

  return `
    <section>
      <h2>抖音内容热度参考</h2>
      <p class="footer">当前状态：API 未授权 / 搜索参考模式。本章节不调用真实抖音 API，也不生成真实点赞、评论、播放、收藏或完播数据。</p>
      ${htmlTable(["项目", "内容"], [
        ["数据来源", douyinEvidence.sourceTypeLabel || "API 未授权降级"],
        ["搜索关键词", douyinEvidence.query || "待补充"],
        ["热度等级", douyinEvidence.heatLevelLabel || heatLevelText[douyinEvidence.heatLevel] || "未知"],
        ["可信度评分", `${douyinEvidence.confidenceScore ?? 0}/100`],
        ["评分小幅修正", `${douyinEvidence.scoreAdjustment ?? 0}`],
      ])}
      <h3>用户填写的热度信号</h3>
      ${htmlList(douyinEvidence.manualSignals?.length ? douyinEvidence.manualSignals : ["暂未识别到用户填写的抖音内容热度备注。"], false)}
      <h3>证据摘要</h3>
      <p class="card">${escapeHtml(douyinEvidence.evidenceSummary)}</p>
      <h3>风险提示</h3>
      ${htmlList(douyinEvidence.riskWarnings || [], false)}
      <h3>抖音搜索参考入口</h3>
      <div class="grid">${linkCards}</div>
      <h3>数据来源说明</h3>
      <p class="card">${escapeHtml(douyinEvidence.sourceNotice)}</p>
    </section>
  `;
}

function renderPriceEvidenceSection(priceEvidence) {
  if (!priceEvidence) return "";

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
  const range = priceEvidence.competitorPriceRange || {};
  const rangeText = range.isValid
    ? range.min === range.max ? `¥${range.min}` : `¥${range.min} - ¥${range.max}`
    : "待补充";
  const searchLinks = priceEvidence.searchLinks || [];
  const linkCards = searchLinks.length
    ? searchLinks.map((link) => `
        <div class="card">
          <h3>${escapeHtml(link.label)}</h3>
          <p>${escapeHtml(link.purpose)}</p>
          <p><a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.url)}</a></p>
        </div>
      `).join("")
    : '<div class="card"><p>暂无搜索入口。</p></div>';

  return `
    <section>
      <h2>1688 / 淘宝价格参考</h2>
      <p class="footer">当前用于批发价和竞品售价参考；API 未配置时仅使用平台搜索入口和用户填写竞品价格区间，不生成真实平台价格、销量、店铺或供应商数据。</p>
      ${htmlTable(["项目", "内容"], [
        ["当前状态", priceEvidence.sourceTypeLabel || (priceEvidence.sourceType === "api_real" ? "真实 API" : "API 未配置 / 搜索参考")],
        ["搜索关键词", priceEvidence.query || "待补充"],
        ["竞品价格区间", rangeText],
        ["价格位置", pricePositionText[priceEvidence.pricePosition] || "未知"],
        ["可信度评分", `${priceEvidence.confidenceScore ?? 0}/100`],
        ["数据完整度", dataCompletenessText[priceEvidence.dataCompleteness] || "低"],
        ["评分小幅修正", `${priceEvidence.scoreAdjustment ?? 0}`],
      ])}
      <h3>证据摘要</h3>
      <p class="card">${escapeHtml(priceEvidence.evidenceSummary)}</p>
      <h3>风险提示</h3>
      ${htmlList(priceEvidence.riskWarnings || [], false)}
      <h3>1688 / 淘宝搜索参考入口</h3>
      <div class="grid">${linkCards}</div>
      <h3>数据来源说明</h3>
      <p class="card">${escapeHtml(priceEvidence.sourceNotice)}</p>
    </section>
  `;
}

function renderManualMarketEvidenceSection(manualEvidence) {
  if (!manualEvidence) return "";

  const dataCompletenessText = {
    high: "高",
    medium: "中",
    low: "低",
  };
  const evidence = manualEvidence.evidence || {};

  return `
    <section>
      <h2>人工市场证据参考</h2>
      <p class="footer">本章节来自用户手动填写的市场调研信息，用于在平台 API 未授权或不可用时辅助判断；不代表平台真实 API 数据，也不伪造销量、热度、点赞、播放或价格。</p>
      ${htmlTable(["项目", "内容"], [
        ["数据完整度", dataCompletenessText[manualEvidence.dataCompleteness] || "低"],
        ["可信度评分", `${manualEvidence.confidenceScore ?? 0}/100`],
        ["1688 批发价参考", evidence.wholesalePriceReference || "未填写"],
        ["淘宝/拼多多零售价参考", evidence.retailPriceReference || "未填写"],
        ["抖音/小红书内容热度观察", evidence.contentHeatReference || "未填写"],
        ["同类竞品数量观察", evidence.competitorDensity || "未观察"],
        ["内容同质化程度", evidence.contentHomogeneity || "未观察"],
        ["市场参考链接", evidence.marketReferenceLinks || "未填写"],
        ["人工市场调研备注", evidence.manualMarketNote || "未填写"],
        ["评分小幅修正", `${manualEvidence.scoreAdjustment ?? 0}`],
      ])}
      <h3>证据摘要</h3>
      <p class="card">${escapeHtml(manualEvidence.evidenceSummary)}</p>
      <h3>正向信号</h3>
      ${htmlList(manualEvidence.positiveSignals?.length ? manualEvidence.positiveSignals : ["暂无"], false)}
      <h3>风险提示</h3>
      ${htmlList(manualEvidence.riskWarnings || [], false)}
      <h3>数据来源说明</h3>
      <p class="card">${escapeHtml(manualEvidence.sourceNotice)}</p>
    </section>
  `;
}

export function generateHtmlReport(product, result) {
  const fallbackMarket = result.market || inferMarketInfo(product);
  const fallbackChannelFit = result.channelFit || getChannelFit(product, fallbackMarket.categoryKey);
  const fallbackEffectivePrice = result.effectivePrice || getEffectivePrice(product);
  const contentContext = result.contentContext || createContentContext(product, Boolean(product?.imagePreview), fallbackMarket, fallbackChannelFit, result.priceBand || getPriceBand(fallbackEffectivePrice.price), result.moqAdvice || getMoqAdvice(n(product.moq)));
  const effectivePrice = result.effectivePrice || contentContext.effectivePrice || getEffectivePrice(product);
  const identityProduct = {
    ...product,
    name: contentContext.productIdentity.displayName,
    category: contentContext.productIdentity.productTypeLabel,
  };
  const xhs = validateGeneratedContent(contentContext, result.xhsPackage || getXhsContentPackage(identityProduct, contentContext.categoryKey, contentContext.productIdentity), "xhsPackage").content;
  const douyin = validateGeneratedContent(contentContext, result.douyinPackage || getDouyinVideoPackage(identityProduct, contentContext.categoryKey, contentContext.productIdentity), "douyinPackage").content;
  const keywordPlan = validateGeneratedContent(contentContext, result.keywordPlan || getPlatformKeywordPlan(identityProduct, contentContext.categoryKey, contentContext.productIdentity), "keywordPlan").content;
  const nextActions = (result.actions && result.actions.length)
    ? result.actions
    : [...(result.samplingStrategy?.checkpoints || []), ...(result.nextTestActions || []).slice(-2)];
  const channelScore = getScoreValue(result, "渠道", result.channelFit?.score || "");
  const douyinEvidence = result.douyinEvidence || result.marketEvidence?.douyin || null;
  const priceEvidence = result.priceEvidence || result.marketEvidence?.price || null;
  const manualMarketEvidence = result.manualMarketEvidence || result.marketEvidence?.manual || null;
  const basicRows = [
    ["产品名称", contentContext.productIdentity?.displayName || product.name || "未填写"],
    ["产品类型", contentContext.productIdentity?.productTypeLabel || product.category || result.market?.marketType || "未填写"],
    ["拿货价", effectivePrice.cost ? `¥${money(effectivePrice.cost)}` : "未填写"],
    ["建议售价", formatEffectivePrice(effectivePrice, "未填写")],
    ["MOQ", product.moq ? `${product.moq} 件` : "未填写"],
    ["材质", product.material || "未填写"],
    ["目标人群", product.audience || "未填写"],
    ["销售渠道", product.channel || "未填写"],
    ["竞品价格", product.competitorPrice || "未填写"],
    ["供应商信息", product.supplier || "未填写"],
  ];
  const scoreRows = getScoringItems(result).map((item) => [item.title, item.score, item.description]);

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TradePilot AI 进货决策报告</title>
  <style>
    :root { color-scheme: dark; --bg: #06120d; --panel: #0d2017; --panel-2: #10291d; --line: rgba(129, 255, 193, .22); --accent: #7df5ac; --accent-2: #b6ffd1; --text: #edfdf4; --muted: #a8bfb0; --warn: #fde68a; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at top left, rgba(125,245,172,.14), transparent 32rem), var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif; line-height: 1.72; }
    .page { max-width: 1080px; margin: 0 auto; padding: 40px 20px 64px; }
    .hero { border: 1px solid var(--line); background: linear-gradient(135deg, rgba(125,245,172,.14), rgba(255,255,255,.035)); border-radius: 28px; padding: 32px; box-shadow: 0 24px 80px rgba(0,0,0,.28); }
    h1 { margin: 0; font-size: 36px; line-height: 1.15; letter-spacing: 0; }
    .subtitle { margin: 12px 0 0; color: var(--accent-2); font-weight: 700; }
    .print-note { margin: 18px 0 0; color: var(--muted); font-size: 14px; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 22px; }
    .metric { border: 1px solid rgba(255,255,255,.08); border-radius: 18px; background: rgba(0,0,0,.22); padding: 14px; }
    .metric span { display: block; color: var(--muted); font-size: 12px; }
    .metric strong { display: block; margin-top: 6px; color: var(--text); font-size: 17px; }
    section { margin-top: 22px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.045); border-radius: 24px; padding: 24px; break-inside: avoid; }
    h2 { margin: 0 0 16px; display: flex; align-items: center; gap: 10px; font-size: 22px; line-height: 1.3; }
    h2::before { content: ""; width: 6px; height: 24px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 18px rgba(125,245,172,.5); }
    h3 { margin: 22px 0 10px; color: var(--accent-2); font-size: 16px; }
    p { margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 16px; background: rgba(0,0,0,.18); }
    th, td { border: 1px solid rgba(255,255,255,.08); padding: 11px 12px; text-align: left; vertical-align: top; }
    th { background: rgba(125,245,172,.13); color: var(--accent-2); font-size: 13px; }
    td { color: #e4f5eb; font-size: 14px; }
    ol, ul { margin: 10px 0 0 22px; padding: 0; }
    li { margin: 8px 0; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .card { border: 1px solid rgba(255,255,255,.08); border-radius: 18px; background: rgba(0,0,0,.2); padding: 16px; }
    .card strong { color: var(--accent-2); }
    .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .summary p { margin: 0; border-radius: 16px; background: rgba(0,0,0,.22); padding: 14px; }
    .checklist { list-style: none; margin-left: 0; }
    .checklist li { display: flex; gap: 10px; align-items: flex-start; border-radius: 14px; background: rgba(0,0,0,.18); padding: 10px 12px; }
    .box { width: 15px; height: 15px; flex: 0 0 auto; margin-top: 6px; border: 1px solid var(--accent); border-radius: 4px; background: rgba(125,245,172,.08); }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .pills span { border: 1px solid var(--line); border-radius: 999px; background: rgba(125,245,172,.1); color: var(--accent-2); padding: 6px 10px; font-size: 13px; font-weight: 700; }
    .notice { border-color: rgba(253,230,138,.22); background: rgba(253,230,138,.08); color: #fff4bc; }
    .footer { color: var(--muted); font-size: 13px; }
    @media (max-width: 760px) { .metrics, .grid, .summary { grid-template-columns: 1fr; } h1 { font-size: 28px; } .hero, section { padding: 20px; border-radius: 20px; } }
    @media print { body { background: #fff; color: #111; } .hero, section { box-shadow: none; break-inside: avoid; } .print-note { color: #444; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <h1>TradePilot AI 进货决策报告</h1>
      <p class="subtitle">进货前，先算清楚。别让第一次进货，变成第一次压货。</p>
      <p class="print-note">可在浏览器中使用 Ctrl+P / 打印功能导出为 PDF。</p>
      <div class="metrics">
        <div class="metric"><span>综合评分</span><strong>${escapeHtml(result.totalScore)}/100</strong></div>
        <div class="metric"><span>状态</span><strong>状态：${escapeHtml(result.status)}</strong></div>
        <div class="metric"><span>决策建议</span><strong>${escapeHtml(result.level)}</strong></div>
        <div class="metric"><span>最适合渠道</span><strong>${escapeHtml(result.channelFit?.best)}</strong></div>
      </div>
    </header>

    <section>
      <h2>基础信息</h2>
      ${htmlTable(["项目", "内容"], basicRows)}
    </section>

    <section>
      <h2>一、执行摘要</h2>
      <div class="summary">${(result.executiveSummary || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
    </section>

    <section>
      <h2>二、利润测算</h2>
      ${htmlTable(["指标", "数值"], [
        ["单件成本", `¥${money(result.unitCost)}`],
        ["预估单件利润", `¥${money(result.profit)}`],
        ["预估毛利率", `${Math.round(result.margin * 100)}%`],
        ["首批压货资金", `¥${money(result.stockCost)}`],
      ])}
      <p class="footer">说明：当前毛利按建议售价与单件成本计算；包装、物流、平台费和售后成本仍需按实际渠道另行校正。</p>
    </section>

    <section>
      <h2>三、品类判断</h2>
      <div class="card"><p><strong>识别品类：</strong>${escapeHtml(result.categoryName || contentContext.categoryName)}（${escapeHtml(contentContext.productIdentity?.identityKey || contentContext.categoryKey)}）</p><p>${escapeHtml(result.categoryNarrative || getCategoryNarrative(identityProduct, contentContext.categoryKey, contentContext.productIdentity))}</p></div>
    </section>

    <section>
      <h2>四、渠道适配建议</h2>
      ${htmlTable(["项目", "内容"], [
        ["最适合渠道", result.channelFit?.best || "未填写"],
        ["适合理由", result.channelFit?.reason || "未填写"],
        ["暂不建议渠道", result.channelFit?.avoid || "未填写"],
        ["不建议理由", result.channelFit?.avoidReason || "未填写"],
        ["当前填写渠道", result.channelFit?.declared || product.channel || "未填写"],
        ["渠道适配评分", `${channelScore}/100`],
      ])}
    </section>

    <section>
      <h2>五、价格带与 MOQ 判断</h2>
      <div class="grid">
        <div class="card"><h3>价格带判断</h3><p><strong>价格带：</strong>${escapeHtml(result.priceBand?.label)}</p><p><strong>建议：</strong>${escapeHtml(result.priceBand?.advice)}</p><p><strong>风险：</strong>${escapeHtml(result.priceBand?.risk)}</p></div>
        <div class="card"><h3>MOQ 风险判断</h3><p><strong>MOQ 区间：</strong>${escapeHtml(result.moqAdvice?.label)}</p><p><strong>风险等级：</strong>${escapeHtml(result.moqAdvice?.riskLevel)}</p><p><strong>建议：</strong>${escapeHtml(result.moqAdvice?.advice)}</p></div>
      </div>
    </section>

    <section>
      <h2>六、图片与内容素材建议</h2>
      <p class="card">${escapeHtml(result.visualEvidenceNote)}</p>
      <div class="grid">
        <div class="card"><h3>必拍图片</h3>${htmlList(result.imagePlan?.mustShoot || [])}</div>
        <div class="card"><h3>加分图片</h3>${htmlList(result.imagePlan?.bonusShots || [])}</div>
        <div class="card"><h3>首图 / 封面建议</h3><p>${escapeHtml(result.imagePlan?.coverAdvice)}</p><h3>不建议缺失的图片</h3><p>${escapeHtml(result.imagePlan?.missingRisk)}</p></div>
        <div class="card"><h3>渠道拍摄重点</h3>${htmlList(result.imagePlan?.preferredFocus || [])}</div>
      </div>
    </section>

    <section>
      <h2>七、测款判断标准</h2>
      ${htmlList(result.testStandards || [], false)}
    </section>

    <section>
      <h2>八、供应商沟通清单</h2>
      ${htmlChecklist(result.supplierQuestions || [])}
    </section>

    <section>
      <h2>九、产品差异化建议</h2>
      ${htmlList(result.market?.differentiation || [])}
    </section>

    <section>
      <h2>十、风险备忘</h2>
      ${htmlList((result.risks || []).slice(0, 3))}
    </section>

    <section>
      <h2>十一、跨平台搜索关键词建议</h2>
      <p class="footer">这些词用于标题、正文、标签、短视频字幕和商品标题，按平台区分消费者真实搜索习惯。</p>
      <div class="grid">
        <div class="card"><h3>小红书搜索词</h3><p><strong>核心产品词：</strong>${escapeHtml(keywordPlan.xhs.core.join("、"))}</p><p><strong>场景词：</strong>${escapeHtml(keywordPlan.xhs.scene.join("、"))}</p><p><strong>痛点词：</strong>${escapeHtml(keywordPlan.xhs.pain.join("、"))}</p><p><strong>风格/情绪词：</strong>${escapeHtml(keywordPlan.xhs.style.join("、"))}</p><p><strong>属性/功能词：</strong>${escapeHtml(keywordPlan.xhs.attribute.join("、"))}</p></div>
        <div class="card"><h3>抖音搜索词</h3><p><strong>核心产品词：</strong>${escapeHtml(keywordPlan.douyin.core.join("、"))}</p><p><strong>场景词：</strong>${escapeHtml(keywordPlan.douyin.scene.join("、"))}</p><p><strong>痛点词：</strong>${escapeHtml(keywordPlan.douyin.pain.join("、"))}</p><p><strong>风格/情绪词：</strong>${escapeHtml(keywordPlan.douyin.style.join("、"))}</p><p><strong>属性/功能词：</strong>${escapeHtml(keywordPlan.douyin.attribute.join("、"))}</p></div>
        <div class="card"><h3>电商平台搜索词</h3><p><strong>核心产品词：</strong>${escapeHtml(keywordPlan.ecommerce.core.join("、"))}</p><p><strong>场景词：</strong>${escapeHtml(keywordPlan.ecommerce.scene.join("、"))}</p><p><strong>痛点词：</strong>${escapeHtml(keywordPlan.ecommerce.pain.join("、"))}</p><p><strong>风格/情绪词：</strong>${escapeHtml(keywordPlan.ecommerce.style.join("、"))}</p><p><strong>属性/功能词：</strong>${escapeHtml(keywordPlan.ecommerce.attribute.join("、"))}</p>${keywordPlan.ecommerce.longTail?.length ? `<p><strong>长尾词：</strong>${escapeHtml(keywordPlan.ecommerce.longTail.join("、"))}</p>` : ""}</div>
        <div class="card"><h3>标题组合建议</h3>${htmlList(keywordPlan.titles.map(([platform, title]) => `${platform}标题：${title}`))}</div>
      </div>
    </section>

    ${renderManualMarketEvidenceSection(manualMarketEvidence)}

    ${renderPriceEvidenceSection(priceEvidence)}

    ${renderDouyinEvidenceSection(douyinEvidence)}

    <section>
      <h2>十二、小红书种草发布方案</h2>
      <p class="footer">这一部分是给卖家/创业者使用的内容发布方案，但标题、正文、封面文案使用消费者视角。</p>
      <div class="grid">
        <div class="card"><h3>封面钩子</h3>${htmlList(xhs.coverHooks)}</div>
        <div class="card"><h3>标题建议</h3>${htmlList(xhs.titles)}</div>
        <div class="card"><h3>首图 / 封面设计建议</h3><p>${escapeHtml(xhs.coverDesign)}</p></div>
        <div class="card"><h3>互动引导</h3>${htmlList(xhs.interactions)}</div>
      </div>
      <h3>图文结构</h3>${htmlList(xhs.pages)}
      <h3>正文示例</h3><p class="card">${escapeHtml(xhs.body)}</p>
      <h3>推荐标签</h3>${htmlPills(xhs.tags || [])}
      <h3>商家发布策略</h3><p class="card">${escapeHtml(xhs.merchantStrategy)}</p>
    </section>

    <section>
      <h2>十三、抖音视频脚本</h2>
      <p class="footer">这一部分是给卖家/创业者使用的短视频拍摄方案，但脚本本身面向消费者。</p>
      <div class="card"><h3>视频方向</h3><p>${escapeHtml(douyin.direction)}</p></div>
      <h3>抖音封面文案</h3>${htmlList(douyin.coverTexts)}
      <h3>20 秒分镜脚本</h3>
      ${htmlTable(["镜头", "时间", "画面怎么拍", "字幕 / 口播", "目的"], (douyin.shots || []).map((shot, index) => [
        `镜头${index + 1}`,
        shot.time,
        shot.visual,
        shot.copy,
        shot.purpose,
      ]))}
      <h3>拍摄注意点</h3>${htmlList(douyin.shootingNotes)}
      <h3>商家测试目标</h3><p class="card">${escapeHtml(douyin.merchantGoal)}</p>
    </section>

    <section>
      <h2>十四、下一步执行动作</h2>
      ${htmlList(nextActions)}
    </section>

    <section>
      <h2>十五、AI 评分依据</h2>
      ${htmlTable(["维度", "分数", "说明"], scoreRows)}
    </section>

    <section class="notice">
      <h2>报告说明</h2>
      <p>本报告由 TradePilot AI 基于用户填写的产品信息、图片识别结果、成本结构、目标人群、销售渠道和测款逻辑自动生成。报告适用于进货前判断、内容测款准备、团队讨论和后续复盘，不构成绝对经营承诺。</p>
    </section>
  </main>
</body>
</html>`;
  return validateGeneratedContent(contentContext, html, "htmlReport").content;
}
