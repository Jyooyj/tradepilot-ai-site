const VISION_API_FALLBACK_MESSAGE =
  "当前视觉识别接口暂不可用，已切换为手动填写 / 演示兜底模式，仍可继续生成进货报告。";

function buildVisionFallbackPayload(reason = "api_unavailable", detail = "") {
  return {
    ok: true,
    fallback: true,
    fallbackMode: "manual_or_demo",
    fallbackMessage: VISION_API_FALLBACK_MESSAGE,
    sourceNotice: "演示 fallback 不代表真实识别结果；请继续手动填写或点击前端演示 fallback，并按实物人工核对字段。",
    reason,
    detail,
    product: {},
    content: {
      xhsCover: "",
      xhsTitles: [],
      xhsStructure: [],
      douyinScript: [],
    },
    risks: ["视觉识别接口暂不可用，当前未生成真实图片识别结果。"],
    confidence: "fallback",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST is allowed" });
  }

  try {
    const { image, hint } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: "缺少图片，请先上传产品图。" });
    }

    if (!process.env.DASHSCOPE_API_KEY) {
      return res.status(200).json(
        buildVisionFallbackPayload(
          "missing_api_key",
          "服务器未配置 DASHSCOPE_API_KEY。"
        )
      );
    }

    const prompt = `
你是一个面向义乌小商品展、饰品展、文创展的AI选品与内容测款智能体。

请根据用户上传的产品图片和补充线索，识别并推断：
1. 产品名称
2. 产品品类
3. 可能材质
4. 适合销售渠道
5. 建议售价区间
6. 目标人群
7. 竞品价格区间
8. 小红书内容关键词
9. 小红书图文选题
10. 抖音短视频脚本
11. 主要风险
12. 下一步测款建议

用户补充线索：${hint || "无"}

要求：
- 不要编造具体平台真实销量。
- 价格只能给“区间推断”，不能说绝对准确。
- 输出必须是严格 JSON，不要 Markdown，不要解释。
- JSON 格式必须如下：

{
  "product": {
    "name": "",
    "category": "",
    "material": "",
    "channel": "",
    "price": "",
    "audience": "",
    "competitorPrice": "",
    "keywords": "",
    "note": ""
  },
  "content": {
    "xhsCover": "",
    "xhsTitles": [],
    "xhsStructure": [],
    "douyinScript": []
  },
  "risks": [],
  "confidence": ""
}
`;

    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.QWEN_VL_MODEL || "qwen3.6-plus",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json(
        buildVisionFallbackPayload(
          "dashscope_request_failed",
          data?.error?.message || `阿里云百炼视觉模型调用失败：${response.status}`
        )
      );
    }

    const rawText = data.choices?.[0]?.message?.content || "";

    const cleaned = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return res.status(200).json(
        buildVisionFallbackPayload(
          "invalid_model_json",
          "模型返回内容不是合法 JSON。"
        )
      );
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(200).json(
      buildVisionFallbackPayload(
        "server_error",
        error.message || "服务器处理失败。"
      )
    );
  }
}
