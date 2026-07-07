// 视觉识别接口：真正调用阿里云百炼 / DashScope Qwen-VL 视觉模型。
// 复用已有环境变量，不新增 Key 名，不读取 / 不打印 / 不返回任何 Key。
//
// 配置优先级（只判断是否存在，不泄露值）：
//   - DASHSCOPE_API_KEY                  必填，缺失则返回 vision_config_missing
//   - DASHSCOPE_VISION_MODEL / QWEN_VL_MODEL   视觉模型名（默认 qwen-vl-plus）
//   - DASHSCOPE_VISION_ENDPOINT          视觉接口地址（默认百炼 compatible-mode）

const DEFAULT_VISION_MODEL = "qwen-vl-plus";
const DEFAULT_VISION_ENDPOINT =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

function asText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean);
  }
  const text = asText(value);
  return text ? [text] : [];
}

function joinText(list) {
  return asArray(list).join(" / ");
}

function getVisionConfig() {
  const apiKey = process.env.DASHSCOPE_API_KEY || "";
  const model =
    process.env.DASHSCOPE_VISION_MODEL ||
    process.env.QWEN_VL_MODEL ||
    DEFAULT_VISION_MODEL;
  const endpoint = process.env.DASHSCOPE_VISION_ENDPOINT || DEFAULT_VISION_ENDPOINT;
  return {
    apiKey,
    model,
    endpoint,
    hasVisionConfig: Boolean(apiKey),
  };
}

const VISION_PROMPT = `
你是一个面向义乌小商品展、饰品展、文创展的 AI 选品与内容测款视觉识别智能体。

请只根据用户上传的产品图片和补充线索，识别并推断以下字段：
1. 产品名称 name
2. 产品品类 category
3. 可能材质 material（看不清时写“疑似xx / 需人工确认”，不要编造）
4. 主要颜色 color
5. 风格 style
6. 目标人群 targetAudience
7. 卖点 sellingPoints（数组）
8. 风险提示 risks（数组）
9. 建议销售渠道 suggestedChannels（数组）
10. 搜索 / 内容关键词 searchKeywords（数组）
11. 建议售价区间 price（只能给区间推断）
12. 竞品价格区间 competitorPrice（只能给区间推断）
13. 补充备注 note

用户补充线索：__HINT__

硬性要求：
- 不要编造确定信息：材质看不清写“疑似 / 需人工确认”。
- 类别不确定时，把不确定说明写入 warningMessages 数组。
- 不要伪造任何平台真实销量、点赞、收藏、播放量、成交数据。
- 价格只能给“区间推断”，不能声称绝对准确。
- 输出必须是严格 JSON，不要 Markdown，不要解释。
- JSON 结构必须如下：

{
  "product": {
    "name": "",
    "category": "",
    "material": "",
    "color": "",
    "style": "",
    "targetAudience": "",
    "sellingPoints": [],
    "risks": [],
    "suggestedChannels": [],
    "searchKeywords": [],
    "price": "",
    "competitorPrice": "",
    "note": ""
  },
  "rawVisionSummary": "",
  "confidence": "",
  "warningMessages": []
}
`;

function buildVisionProduct(parsed) {
  const p = (parsed && typeof parsed === "object" && parsed.product) || {};

  const targetAudience = asText(p.targetAudience || p.audience);
  const suggestedChannels = asArray(p.suggestedChannels || p.channel || p.salesChannel);
  const sellingPoints = asArray(p.sellingPoints || parsed.sellingPoints);
  const risks = asArray(p.risks || parsed.risks);
  const searchKeywords = asArray(p.searchKeywords || p.keywords || p.tags);

  return {
    // 规范字段
    name: asText(p.name || p.productName),
    category: asText(p.category || p.type),
    material: asText(p.material),
    color: asText(p.color),
    style: asText(p.style),
    targetAudience,
    sellingPoints,
    risks,
    suggestedChannels,
    searchKeywords,
    // 兼容字段：供前端旧的回填逻辑直接使用，避免破坏现有产品信息回填
    audience: targetAudience,
    channel: joinText(suggestedChannels),
    keywords: joinText(searchKeywords),
    price: asText(p.price),
    competitorPrice: asText(p.competitorPrice || p.competitor_price),
    note: asText(p.note || p.description),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed", message: "Only POST is allowed" });
  }

  const { apiKey, model, endpoint, hasVisionConfig } = getVisionConfig();

  try {
    const { image, hint } = req.body || {};

    if (!image) {
      return res.status(400).json({
        ok: false,
        error: "missing_image",
        message: "缺少图片，请先上传产品图。",
        hasVisionConfig,
      });
    }

    // 视觉配置缺失：温和降级，不假装识别成功，也不泄露 Key 名称之外的信息。
    if (!hasVisionConfig) {
      return res.status(200).json({
        ok: false,
        error: "vision_config_missing",
        message: "服务端未配置视觉识别模型，已切换为手动填写模式。",
        hasVisionConfig: false,
      });
    }

    const prompt = VISION_PROMPT.replace("__HINT__", asText(hint) || "无");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: image } },
              { type: "text", text: prompt },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        error: "vision_request_failed",
        message:
          asText(data?.error?.message) ||
          `视觉识别模型调用失败：${response.status}`,
        hasVisionConfig: true,
        model,
      });
    }

    const rawText = asText(data?.choices?.[0]?.message?.content);
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return res.status(200).json({
        ok: false,
        error: "vision_parse_failed",
        message: "视觉模型返回内容不是合法 JSON，已切换为手动填写模式。",
        hasVisionConfig: true,
        model,
      });
    }

    const product = buildVisionProduct(parsed);

    return res.status(200).json({
      ok: true,
      source: "vision_llm",
      model,
      hasVisionConfig: true,
      product,
      rawVisionSummary:
        asText(parsed.rawVisionSummary || parsed.summary) || rawText.slice(0, 500),
      confidence: asText(parsed.confidence) || "中",
      warningMessages: asArray(parsed.warningMessages || parsed.warnings),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: "vision_request_failed",
      message: asText(error?.message) || "服务器处理失败，已切换为手动填写模式。",
      hasVisionConfig,
      model,
    });
  }
}
