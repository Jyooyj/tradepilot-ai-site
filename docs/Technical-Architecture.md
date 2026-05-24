# TradePilot AI Technical Architecture

本文面向开发者说明 TradePilot AI 的工程架构、Agent / Skills 协作、数据流、API、存储和 fallback 机制。README 面向使用者和评审快速体验；`docs/` 面向开发者理解实现边界。

## 1. 项目整体架构

| 层级 | 技术 / 文件 | 说明 |
|---|---|---|
| 前端应用 | React + Vite + Tailwind | 入口为 `index.html -> main.jsx -> App.jsx`。页面组件位于 `src/components/`，工具函数位于 `src/utils/`。 |
| 主站 Serverless | Vercel Serverless Function | `api/analyze-image.js`、`api/generate-ai-insight.js`、`api/alibaba-price-search.js` 由 Vercel 部署为后端接口。 |
| 国内备用站 | CloudBase 静态托管 + 云函数 | 国内版上传 `dist` 构建产物；图片识别可通过 `VITE_ANALYZE_IMAGE_URL` 指向 CloudBase 云函数。 |
| 视觉模型 | DashScope / 阿里云百炼视觉模型 | 图片识别接口通过服务端环境变量调用，不在前端暴露 Key。 |
| LLM 智能推理补充 | DashScope compatible-mode 文本模型 | 只做定性解释和下一步建议，不覆盖规则评分、利润、MOQ 或风险等级。 |
| 可选云同步 | Supabase | 前端使用 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 初始化客户端；产品库表为 `tradepilot_product_records`。 |
| 本地 fallback | localStorage | 本地产品库 key 为 `tradepilot_local_records`；Supabase 不可用时仍可保存、导出、导入和复盘。 |
| 报告导出 | `src/utils/reportUtils.js` | 负责 HTML、PDF 打印版、产品库文档等导出逻辑。 |

## 2. Agent / Skills 协作流程

TradePilot AI 当前采用一个工作流式 TradePilot Agent 编排多个 Skills，而不是多个独立 Agent 互相调用。Agent 根据当前商品、报告、产品库和复盘数据判断阶段，Skills 负责完成具体能力模块。

```text
用户上传图片 / 手动填写
→ Image Quality Skill
→ Image Recognition Skill
→ ProductInput
→ Purchase Decision Skill
→ Market Evidence Skill
→ LLM Insight Skill
→ Supplier Communication Skill
→ Product Library Skill
→ PK Skill
→ Review Skill
→ Report Export Skill
```

| Skill | 主要代码位置 | 输入 | 输出 |
|---|---|---|---|
| Image Quality Skill | `src/utils/imageQualityUtils.js`、`src/components/OperateView.jsx` | 上传文件 | 图片质量提示，允许手动填写兜底。 |
| Image Recognition Skill | `api/analyze-image.js`、`App.jsx` | 图片 base64 / hint | 商品识别结果或手动 / 演示 fallback payload。 |
| Purchase Decision Skill | `App.jsx` 的 `analyzeProduct()` | `product`、是否有图片 | 规则评分、利润、风险、内容包、报告文本。 |
| Market Evidence Skill | `priceEvidenceUtils`、`douyinFallbackUtils`、`manualMarketEvidenceUtils` | `product`、基础 `result`、可选 API 返回 | 价格证据、内容热度证据、人工市场证据和风险提示。 |
| LLM Insight Skill | `api/generate-ai-insight.js`、`aiInsightClient.js`、`aiInsightUtils.js` | `product`、`result`、`marketEvidence`、`reviewData`、`scenario` | `AiInsightResult`，失败时返回 fallback。 |
| Supplier Communication Skill | `src/utils/supplierCommunicationUtils.js` | `product`、`result` | 询价、议价、打样、发货售后话术和风险问题。 |
| Product Library Skill | `src/services/productStorage.js`、`productBackupUtils.js` | `ProductRecord` | localStorage / Supabase 保存、读取、删除、导入、导出。 |
| PK Skill | `App.jsx`、`src/components/PKView.jsx` | 多个 `ProductRecord` | 候选产品优先级建议。 |
| Review Skill | `src/components/ReviewView.jsx` | `ReviewData`、当前 `product/result` | 测款复盘指标、复盘建议和可选 AI 总结。 |
| Report Export Skill | `src/utils/reportUtils.js` | `product`、`result`、`review`、`aiReasoningInsights` | HTML / PDF 打印版 / 产品库文档。 |

## 3. 数据流说明

| 阶段 | 数据流 |
|---|---|
| 商品输入 | `product` 从 `OperateView` 进入，可以来自手动填写，也可以来自图片识别回填。核心字段包括名称、品类、成本、售价、MOQ、材质、人群、渠道、供应商和竞品价格。 |
| 规则分析 | `result` 由 `analyzeProduct(product, Boolean(image))` 生成，包含 `totalScore`、`level`、`status`、`margin`、`profit`、`stockCost`、`risks`、`actions`、`xhsPackage`、`douyinPackage` 等。 |
| 市场证据 | 价格、抖音 / 内容热度、人工市场证据在基础 `result` 上叠加。系统会明确区分真实 API adapter、搜索参考入口和用户手动填写证据。 |
| LLM 补充 | `aiReasoningInsights` 作为补充层保存于前端状态，并传入结果视图和报告导出。它解释评分和风险，但不覆盖 `totalScore`、利润、MOQ 或规则结论。 |
| 产品库保存 | `saveCurrentReport()` 组装 `ProductRecord`，保存 `product`、`result` 摘要、`review` 和报告文本。存储函数决定写入 localStorage 或 Supabase。 |
| 测款复盘 | `reviewData` 在 `ReviewView` 中填写，包含浏览、点赞、收藏、评论、询单、成交和成本。复盘指标在 UI 中计算，并可随记录保存。 |
| 报告导出 | `reportUtils` 负责 HTML / PDF 打印版 / 产品库文档导出。导出时会合并当前 `product`、`result`、`review`、`aiReasoningInsights` 和供应商沟通包。 |

## 4. API 接口说明

### `api/analyze-image.js`

| 项目 | 说明 |
|---|---|
| 作用 | 调用 DashScope / 阿里云百炼视觉模型，根据图片识别商品基础信息和内容建议。 |
| 方法 | `POST`。请求体包含 `image`，可选 `hint`。 |
| 主要环境变量 | `DASHSCOPE_API_KEY`、`QWEN_VL_MODEL`。 |
| 成功输出 | JSON，包含 `product`、`content`、`risks`、`confidence`。 |
| fallback | 未配置 Key、模型请求失败、模型返回非 JSON、服务端异常时，接口仍返回 200 和 fallback payload：`fallback: true`、`fallbackMode: manual_or_demo`、`reason`、`detail`、空 `product`，提示用户手动填写或使用演示 fallback。 |

### `api/generate-ai-insight.js`

| 项目 | 说明 |
|---|---|
| 作用 | 为进货决策、内容测款、测款复盘生成 LLM 定性推理补充。 |
| 方法 | `POST`。请求体包含 `product`、`result`、`marketEvidence`、`reviewData`、`scenario`。 |
| 主要环境变量 | `DASHSCOPE_API_KEY`、`DASH_SCOPE_API_KEY`、`ALIYUN_DASHSCOPE_API_KEY`、`DASHSCOPE_TEXT_ENDPOINT`、`DASHSCOPE_TEXT_MODEL`、`QWEN_TEXT_MODEL`。 |
| 成功输出 | `source: llm` 的 `AiInsightResult`，包含 `summary`、`reasoningPoints`、`nextActions`、`riskWarnings`、`confidenceNote`。 |
| fallback | 未配置 Key、请求失败、模型返回解析失败时返回 `source: fallback` 的基础策略建议。fallback 明确不替代规则评分，不编造真实平台数据。 |

### `api/alibaba-price-search.js`

| 项目 | 说明 |
|---|---|
| 作用 | 作为 1688 / 淘宝价格查询 adapter。已接入时从后端调用平台 adapter；未接入时返回搜索参考入口。 |
| 方法 | `POST`。请求体使用商品名称、关键词、品类、价格、成本、竞品价格、市场参考等字段构造查询。 |
| 主要环境变量 | `ALIBABA_APP_KEY`、`ALIBABA_APP_SECRET`、`ALIBABA_ACCESS_TOKEN`、`ALIBABA_PRICE_SEARCH_ENDPOINT`、`TAOBAO_APP_KEY`、`TAOBAO_APP_SECRET`、`TAOBAO_ACCESS_TOKEN`、`TAOBAO_PRICE_SEARCH_ENDPOINT`。 |
| 成功输出 | 已接入 adapter 时返回 `sourceType: api_real`、批发结果、零售结果和搜索参考链接。 |
| fallback | 未配置 adapter 或请求失败时返回 `sourceType: api_unavailable`、`fallback: true`、空结果和 1688 / 淘宝搜索入口。系统不会伪造平台真实价格、销量或成交数据。 |

## 5. 存储架构

| 存储对象 | 位置 | 说明 |
|---|---|---|
| 本地产品库 | `localStorage` key: `tradepilot_local_records` | 游客模式和云端不可用时使用。保存核心对象 `ProductRecord`。 |
| 存储模式 | `localStorage` key: `tradepilot_storage_mode` | 保存用户选择的模式：自动选择、仅本地保存、云端同步。 |
| Supabase 产品库 | 表名: `tradepilot_product_records` | 云端同步保存 `id`、`user_id`、`product`、`result`、`review`、`created_at`、`updated_at`。 |
| JSON 导出 / 导入 | `productBackupUtils` / `productStorage` | 用于完整备份、迁移和恢复产品库。导出 payload 包含 `localStorageKey` 和 `records`。 |
| CSV 导出 | `productBackupUtils` | 用于 Excel / WPS 二次分析，适合评审查看候选产品数据。 |

三种产品库模式：

| 模式 | 行为 |
|---|---|
| 自动选择 | 云端可用且已登录时使用 Supabase；否则回退 localStorage。 |
| 仅本地保存 | 始终使用 localStorage。适合游客体验和国内网络不稳定场景。 |
| 云端同步 | 尝试使用 Supabase。未配置、未登录或网络失败时，会提示云端不可用并保留本地缓存。 |

## 6. fallback 机制

| 场景 | fallback 行为 | 业务影响 |
|---|---|---|
| 图片识别失败 | 返回手动填写 / 演示 fallback，前端展示原因和提示。 | 用户仍可手动填写 ProductInput 并生成完整进货报告。 |
| 图片质量不佳 | 前端展示图片质量 warning，提示可换图或继续手动填写。 | 不阻断核心规则报告。 |
| LLM 失败 | 返回基础策略建议，`source` 标记为 `fallback`。 | 不影响评分、利润、MOQ、内容包和报告核心结论。 |
| 1688 / 淘宝 adapter 不可用 | 返回搜索参考入口和无 API 提示。 | 价格证据降级为人工市场证据和搜索入口，不伪造真实平台数据。 |
| 抖音真实 API 不可用 | 使用用户填写的内容热度观察和搜索入口。 | 内容测款建议仍可生成，但会提示证据不足。 |
| Supabase 不可用 | 自动或显式回退 localStorage。 | 产品库保存、导入、导出、PK 和复盘仍可继续。 |
| 国内静态站 API 不可用 | 手动填写、规则评分、localStorage 产品库、PK、复盘和报告导出仍可用。 | 外部 AI 能力降级，核心规则流程保留。 |
| 页面运行时异常 | `ErrorBoundary` 捕获异常并展示友好降级提示。 | 避免页面直接白屏，用户可刷新或继续恢复流程。 |

## 7. 部署说明

| 部署目标 | 方式 |
|---|---|
| Vercel 主站 | 部署源码，使用 Vercel Serverless Functions 运行 `api/` 下接口。DashScope、Supabase 和平台 adapter Key 通过环境变量配置。 |
| CloudBase 国内备用站 | 本地或 CI 运行 `npm run build`，上传 `dist` 构建产物到 CloudBase 静态网站托管。图片识别可通过 CloudBase 云函数代理 DashScope。 |
| 开发文档 | README 面向使用者和评审体验入口；`docs/Technical-Architecture.md` 和 `docs/Agent-Data-Model.md` 面向开发者和评审理解实现细节。 |

部署边界：

- 不把 `DASHSCOPE_API_KEY`、平台 adapter token 或 Supabase service role 写入前端代码。
- Vercel 主站可直接使用 `/api/analyze-image` 和 `/api/generate-ai-insight`。
- CloudBase 国内版通过 `VITE_ANALYZE_IMAGE_URL` 切换图片识别接口地址。
- `dist` 是构建产物，上传到 CloudBase，不需要改动源码核心逻辑。
