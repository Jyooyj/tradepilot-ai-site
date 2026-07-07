# TradePilot Real Agent MVP

本轮实现的是最小真实 Agent 闭环，用来验证：

```text
LLM 自主选择工具
-> 服务端真实执行工具
-> 将工具结果返回给 LLM
-> LLM 继续判断
-> 输出结论或要求补充字段
-> 前端展示服务端真实 trace
```

它不是固定规则流程展示，也不是前端伪造工具状态。

## 当前 Agent 类型

当前 Agent 是受控半自主 Agent：

- LLM 只能在服务端白名单工具内选择下一步。
- 工具只读取前端传入的 canonical `product`、`result`、`marketEvidence`。
- Agent 不修改评分、不保存产品、不删除记录、不访问外部平台、不下单、不付款。
- 前端只触发 `/api/agent/run` 并展示后端返回的 trace。

## Function Calling

Planner 使用 DashScope OpenAI 兼容接口：

- Endpoint: `DASHSCOPE_TEXT_ENDPOINT`，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- Model 优先级：`DASHSCOPE_AGENT_MODEL` -> `DASHSCOPE_TEXT_MODEL` -> `QWEN_TEXT_MODEL` -> `qwen-plus`
- 请求包含 `tools` 和 `tool_choice: "auto"`
- 读取 `choices[0].message.tool_calls`
- 执行工具后追加：

```js
{
  role: "tool",
  tool_call_id: toolCallId,
  content: JSON.stringify(toolResult)
}
```

然后继续调用模型，直到模型输出最终 JSON 或达到最大工具轮次。

## Tools

当前注册的工具：

1. `calculate_profit`
   - 读取 canonical `product/result` 中的售价、成本、MOQ、利润、毛利率、首批压货资金。
   - 不重算综合评分。
   - 缺 MOQ 时返回 `missingFields: ["moq"]`，不编造压货资金。

2. `assess_purchase_risk`
   - 读取 MOQ、竞品价格、物流包装、既有风险字段和市场证据风险。
   - 只做风险摘要。
   - 不修改任何记录。

3. `inspect_market_evidence`
   - 只分析用户已填写的市场证据和已有 search reference。
   - 不访问淘宝、1688、小红书或抖音。
   - 不生成或夸大价格、销量、播放量、点赞或热度数据。

4. `retrieve_user_memory`
   - 只读用户已加载的产品库记录和复盘数据。
   - 输出相似记录数量、证据等级、价格带、MOQ、渠道、复盘指标和风险摘要。
   - 不修改、保存、删除或覆盖任何记录。

5. `generate_supplier_checklist`
   - 复用现有供应商沟通模块生成可复制询价、议价、打样、发货和售后清单。
   - 不自动联系供应商、不发送消息、不下单、不付款。

6. `generate_content_test_plan`
   - 读取原报告的小红书内容包和抖音脚本，生成首轮内容测款计划。
   - 不自动发布内容，不访问外部平台，不伪造平台数据。

## Trace

Trace 由服务端生成，每一条来自真实工具执行：

```json
{
  "toolName": "calculate_profit",
  "toolLabel": "利润测算",
  "status": "completed",
  "summary": "单件利润约...",
  "missingFields": [],
  "observation": {}
}
```

前端不会伪造调用顺序、工具结果或完成状态，也不会展示内部 Tool JSON。

## Guardrails

当前已实现：

- 工具白名单。
- Tool 参数解析和安全默认值。
- 最大 4 轮 Tool Calling。
- 禁止自动访问外部平台。
- 禁止自动下单、付款。
- 禁止自动保存产品库。
- 禁止自动删除或覆盖记录。
- 禁止修改原评分。
- 用户可见内容隐藏内部技术词。
- 内部错误只用 `console.warn` 记录。

## 当前限制

- 第一轮只实现 `POST /api/agent/run`。
- 第二轮已补齐 `/api/agent/resume`、`/api/agent/approve`、`/api/agent/session/:id`，详见 `docs/REAL-AGENT-SESSION-RESUME.md`。
- 第三轮已补齐 `retrieve_user_memory`，详见 `docs/REAL-AGENT-MEMORY.md`。
- 第四轮已补齐 `generate_supplier_checklist` 和 `generate_content_test_plan`，详见 `docs/REAL-AGENT-SUPPLIER-CONTENT-TOOLS.md`。
- 未新增 Supabase Agent session 表。
- 未实现自动保存候选产品。

如果 LLM 暂不可用，Agent 返回基础策略建议，原报告、产品库、PK、复盘和导出仍可使用。

## 后续计划

下一轮建议补齐：

- 真实 Key 端到端验收。
- ECS 部署验收。
- 手机扫码测试。
