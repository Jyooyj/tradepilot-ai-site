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
      return res.status(500).json({
        error: "服务器未配置 DASHSCOPE_API_KEY，请在 Vercel 环境变量中添加阿里云百炼 API Key。",
      });
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
      return res.status(response.status).json({
        error: data?.error?.message || "阿里云百炼视觉模型调用失败",
        detail: data,
      });
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
      return res.status(500).json({
        error: "模型返回内容不是合法 JSON",
        raw: rawText,
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({
      error: "服务器处理失败",
      message: error.message,
    });
  }
}
