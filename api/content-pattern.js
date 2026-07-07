import {
  buildLocalContentPattern,
  buildLocalOriginalCopy,
  normalizeContentPattern,
  normalizeOriginalCopy,
  sanitizeReferenceItems,
} from "../src/utils/contentPatternUtils.js";
import {
  buildLocalXiaohongshuCopywritingPackage,
  mergeXiaohongshuCopywritingPackage,
} from "../src/utils/contentPatternCopywriting.js";

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

function getDashScopeConfig() {
  return {
    apiKey: process.env.DASHSCOPE_API_KEY || "",
    endpoint: process.env.DASHSCOPE_TEXT_ENDPOINT || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: process.env.DASHSCOPE_TEXT_MODEL || "qwen-plus",
  };
}

function buildDebugConfig(config) {
  let endpointHost = "";
  try {
    endpointHost = new URL(config.endpoint).hostname;
  } catch (error) {
    endpointHost = "";
  }

  return {
    hasDashScopeApiKey: Boolean(config.apiKey),
    hasTextEndpoint: Boolean(config.endpoint),
    textModel: config.model,
    endpointHost,
  };
}

function getSafeModelError(error) {
  const errorCode = String(error?.message || "");
  const httpMatch = /^llm_http_(\d{3})$/.exec(errorCode);
  if (httpMatch) return `DashScope HTTP ${httpMatch[1]}`;
  if (errorCode === "model_response_empty") return "AI 返回内容为空";
  if (errorCode === "model_response_invalid_json") return "AI 返回格式无效";
  if (error?.name === "AbortError") return "AI 请求超时";
  return "AI 请求失败";
}

function cleanText(value, limit = 1000) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, limit);
}

function compactReferences(references) {
  const safe = sanitizeReferenceItems(references);
  let remaining = 24000;
  const compact = [];
  for (const item of safe) {
    if (remaining <= 0) break;
    const title = cleanText(item.title, Math.min(180, remaining));
    remaining -= title.length;
    const body = cleanText(item.body, Math.min(3000, Math.max(0, remaining)));
    remaining -= body.length;
    compact.push({ title, body });
  }
  return compact;
}

function compactBrief(value = {}) {
  return {
    topic: cleanText(value.topic || value.productName, 100),
    audience: cleanText(value.audience, 120),
    channel: "小红书图文",
    goal: cleanText(value.goal, 160),
    keyPoints: cleanText(value.keyPoints, 800),
    scene: cleanText(value.scene, 240),
    price: cleanText(value.price, 80),
    material: cleanText(value.material, 120),
    category: cleanText(value.category || value.category_key, 100),
    tone: cleanText(value.tone, 100),
    avoid: cleanText(value.avoid, 300),
  };
}

function parseModelJson(rawText) {
  const cleaned = String(rawText || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!cleaned) throw new Error("model_response_empty");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  try {
    return JSON.parse(firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned);
  } catch (error) {
    throw new Error("model_response_invalid_json");
  }
}

async function callModel(config, prompt, maxTokens = 1200) {
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: "你是 TradePilot AI 的小红书图文结构与原创文案助手。只处理用户主动提供的文本，不访问外部平台，不收集用户资料，不复刻参考内容，不生成视频或口播脚本。必须返回严格 JSON。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.45,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) throw new Error(`llm_http_${response.status}`);
  const data = await response.json();
  return parseModelJson(data.choices?.[0]?.message?.content || "");
}

function extractionPrompt({ references, name, targetScene }) {
  return `
请把用户主动提供的参考内容提炼为可复用的“抽象结构”，用于后续原创写作。

硬性要求：
- 不复述、摘抄或拼接任何原始标题和正文。
- 不输出博主昵称、账号、头像、主页、评论、粉丝数或平台用户信息。
- 不推测真实销量、热度、点赞或转化数据。
- 只总结写作结构、叙事顺序、说服元素和风格特征。
- 加入原创改写与事实核验提醒。

结构名称：${cleanText(name, 80) || "未命名内容结构"}
适用场景：${cleanText(targetScene, 80) || "通用种草内容"}
参考内容（请求结束后不保存）：
${JSON.stringify(references)}

严格返回以下 JSON：
{
  "headlineFormula": "",
  "openingHook": "",
  "narrativeFlow": [],
  "persuasionElements": [],
  "styleTags": [],
  "originalityRules": [],
  "complianceNotes": []
}`;
}

function generationPrompt({ pattern, brief }) {
  return `
请根据“抽象结构”和“用户商品简报”生成一份全新中文文案草稿。

硬性要求：
- 不复刻任何第三方标题、句子或案例，不声称看过外部平台内容。
- 只能使用商品简报中的事实；缺失的信息不要编造。
- 不编造销量、点赞、排名、用户评价、功效、最低价或绝对承诺。
- 保持消费者视角，避免夸张营销；输出发布前仍需人工核对。
- 结构可以借鉴，但标题、表达、顺序、例子必须原创。

抽象结构：
${JSON.stringify(pattern)}

商品简报：
${JSON.stringify(brief)}

严格返回以下 JSON：
{
  "titles": [],
  "opening": "",
  "body": "",
  "cta": "",
  "hashtagSuggestions": []
}`;
}

function xiaohongshuGenerationPrompt({ pattern, brief }) {
  return `
请根据抽象内容结构和用户已经核实的商品简报，生成一份可直接人工校对的小红书图文发布文案包。

硬性要求：
- 只生成小红书图文，不生成短视频、口播、主播话术或镜头脚本。
- 标题 5 个、封面字 5 个、正文开头 3 个、完整正文 1 篇、结尾互动 3 个、话题标签 8 个、配图建议 5 个。
- 正文结构为：生活化开头 → 痛点 → 已核实卖点 → 适用场景 → 测款建议 → 互动结尾。
- 只能使用商品简报中已经核实的事实。没有价格不写价格，没有材质不写材质。
- 不编造销量、点赞、收藏、成交、排名、用户评价或功效。
- 不使用“爆卖、卖疯、万人下单、点赞过万、收藏过万、全网最低、必买、100%有效”等表达。
- 不复刻任何参考帖子原句，不输出平台原文或用户信息。
- 文案生活化、克制、可读，不写大段创作方法论。

抽象结构：
${JSON.stringify(pattern)}

商品简报：
${JSON.stringify(brief)}

严格返回以下 JSON，不增加其他字段：
{
  "xiaohongshu": {
    "titles": [],
    "cover_texts": [],
    "openings": [],
    "body": "",
    "body_outline": [],
    "ending_guides": [],
    "hashtags": [],
    "image_suggestions": [],
    "layout_suggestions": []
  },
  "selling_points": {
    "core_lines": [],
    "pain_points": [],
    "scene_lines": [],
    "audience_lines": []
  },
  "generation_basis": {
    "pattern_type": "",
    "platform_style": "小红书图文",
    "target_audience": "",
    "selling_points_used": [],
    "safety_notes": []
  }
}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const body = getBody(req);
  const action = body.action === "generate_xiaohongshu"
    ? "generate_xiaohongshu"
    : body.action === "generate"
      ? "generate"
      : body.action === "extract"
        ? "extract"
        : "";
  if (!action) {
    res.status(400).json({ ok: false, error: "invalid_action" });
    return;
  }

  const config = getDashScopeConfig();
  const debugConfig = buildDebugConfig(config);

  if (action === "extract") {
    const references = compactReferences(body.references);
    if (!references.length) {
      res.status(400).json({ ok: false, error: "references_required" });
      return;
    }
    const fallback = buildLocalContentPattern({ references, name: body.name, targetScene: body.targetScene });
    if (!config.apiKey) {
      res.status(200).json({
        ok: true,
        mode: "local_fallback",
        source: "fallback",
        pattern: fallback,
        message: "未配置 AI 文本服务，已使用本地规则提取结构。",
        debugConfig,
      });
      return;
    }
    try {
      const parsed = await callModel(config, extractionPrompt({ references, name: body.name, targetScene: body.targetScene }));
      const pattern = normalizeContentPattern({
        ...parsed,
        name: body.name,
        targetScene: body.targetScene,
        sourceCount: references.length,
        source: "ai",
      }, { id: fallback.id });
      res.status(200).json({
        ok: true,
        mode: "ai",
        source: "ai",
        pattern,
        message: "AI 文本服务已完成结构提取。",
        debugConfig,
      });
    } catch (error) {
      res.status(200).json({
        ok: true,
        mode: "local_fallback",
        source: "fallback",
        pattern: fallback,
        message: "AI 调用失败，已使用本地规则提取结构。",
        errorMessage: getSafeModelError(error),
        debugConfig,
      });
    }
    return;
  }

  if (action === "generate_xiaohongshu") {
    const brief = compactBrief(body.brief);
    const pattern = body.pattern && typeof body.pattern === "object" ? body.pattern : {};
    if (!brief.topic) {
      res.status(400).json({ ok: false, error: "topic_required" });
      return;
    }
    const fallback = buildLocalXiaohongshuCopywritingPackage({ pattern, brief });
    if (!config.apiKey) {
      res.status(200).json({
        ok: true,
        mode: "local_fallback",
        source: "fallback",
        copywritingPackage: fallback,
        message: "未配置 AI 文本服务，已生成本地原创小红书图文文案。",
        debugConfig,
      });
      return;
    }
    try {
      const parsed = await callModel(config, xiaohongshuGenerationPrompt({ pattern, brief }), 3000);
      const copywritingPackage = mergeXiaohongshuCopywritingPackage(parsed, fallback, brief);
      res.status(200).json({
        ok: true,
        mode: "ai",
        source: "ai",
        copywritingPackage,
        message: "AI 原创小红书文案已生成，请在发布前核对事实。",
        debugConfig,
      });
    } catch (error) {
      res.status(200).json({
        ok: true,
        mode: "local_fallback",
        source: "fallback",
        copywritingPackage: fallback,
        message: "AI 调用失败，已生成本地原创小红书图文文案。",
        errorMessage: getSafeModelError(error),
        debugConfig,
      });
    }
    return;
  }

  const brief = compactBrief(body.brief);
  const pattern = normalizeContentPattern(body.pattern);
  if (!brief.topic) {
    res.status(400).json({ ok: false, error: "topic_required" });
    return;
  }
  const fallback = buildLocalOriginalCopy({ pattern, brief });
  if (!config.apiKey) {
    res.status(200).json({ ok: true, mode: "local_fallback", source: "fallback", copy: fallback, message: "未配置 AI 文本服务，已生成本地原创草稿。", debugConfig });
    return;
  }
  try {
    const parsed = await callModel(config, generationPrompt({ pattern, brief }), 1500);
    const copy = normalizeOriginalCopy({ ...parsed, source: "ai" }, brief);
    res.status(200).json({ ok: true, mode: "ai", source: "ai", copy, message: "原创文案草稿已生成，请在发布前核对事实。", debugConfig });
  } catch (error) {
    res.status(200).json({
      ok: true,
      mode: "local_fallback",
      source: "fallback",
      copy: fallback,
      message: "AI 调用失败，已生成本地原创草稿。",
      errorMessage: getSafeModelError(error),
      debugConfig,
    });
  }
}
