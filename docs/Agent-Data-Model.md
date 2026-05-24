# TradePilot AI Agent Data Model

本文说明 TradePilot AI 在「图片识别、进货决策、市场证据、供应商沟通、产品库、候选产品 PK、测款复盘、报告导出」之间传递的核心数据对象。

TradePilot AI 当前不是多个独立 LLM Agent 自主协商的架构，而是一个工作流式 TradePilot Agent 编排多个 Skills。本文使用统一对象名描述数据流；对应代码中的实际载体包括前端 `product` 状态、`analyzeProduct()` 返回的 `result`、`review` 状态、`aiReasoningInsights` 状态，以及 `ProductRecord` 存储记录。

## 字段来源约定

| 来源 | 说明 |
|---|---|
| 用户输入 | 用户在 OperateView、ReviewView 或产品库导入中填写的数据。 |
| 图片识别回填 | `api/analyze-image.js` 返回后，由前端回填到 `product` 的字段。 |
| 系统生成 | 规则分析函数、市场证据工具、Agent Orchestrator、LLM Insight 或报告工具生成的数据。 |
| 存储层生成 | `productStorage` 在 localStorage / Supabase 保存、读取、迁移时生成或标准化的数据。 |
| fallback 可用 | 外部 API 或云同步失败后，字段是否仍可通过手动填写、规则计算或本地缓存继续使用。 |

## ProductInput

`ProductInput` 是用户手动填写或图片识别回填后的商品基础信息。当前代码中的主要载体是 `App.jsx` 里的 `product` 状态，以及 `src/types/product.ts` 中的 `ProductInfo`。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `name` | 用户输入 / 图片识别回填 | 商品名称。用于报告标题、搜索关键词、产品库展示和 PK 展示。 | 可用。图片识别失败时可手动填写。 |
| `category` | 用户输入 / 图片识别回填 | 产品类型或品类，例如饰品、文创、家居。用于品类模板、内容包和风险判断。 | 可用。可手动填写。 |
| `cost` | 用户输入 | 拿货价 / 单件成本。用于利润、毛利率和首批压货资金计算。 | 可用。核心规则依赖用户填写。 |
| `price` | 用户输入 / 图片识别回填的建议区间 | 建议售价。用于利润和价格带判断。 | 可用。可手动填写；缺失时仍可生成谨慎报告。 |
| `moq` | 用户输入 | 最小起订量。用于 MOQ 风险和库存资金判断。 | 可用。可手动填写；缺失时 Agent 会标记信息不足。 |
| `material` | 用户输入 / 图片识别回填 | 材质描述。用于内容素材、供应商问题和风险提示。 | 可用。可手动填写。 |
| `supplier` | 用户输入 | 供应商信息，例如补货、混批、发货周期。用于供应商沟通和风险判断。 | 可用。缺失时供应商沟通包会提示补充。 |
| `targetUser` / `audience` | 用户输入 / 图片识别回填 | 统一文档中可称为目标用户；当前代码字段为 `audience`。 | 可用。可手动填写。 |
| `channel` | 用户输入 / 图片识别回填 | 销售渠道，例如小红书、抖音、私域、校园。用于渠道适配和内容建议。 | 可用。可手动填写。 |
| `competitorPrice` | 用户输入 / 图片识别回填 | 用户看到的竞品价格区间。用于价格证据和风险提示。 | 可用。缺失时系统会提示补充。 |
| `imagePreview` | 系统生成 / 存储层生成 | 保存到产品库时的小图预览，仅在图片较小时写入记录。 | 可选。图片失败或过大时为空，不阻断报告。 |

## ImageAnalysisResult

`ImageAnalysisResult` 描述图片识别 Skill 和图片质量 Skill 的输出。视觉识别接口是 `api/analyze-image.js`；图片质量预检由前端 `imageQualityUtils` 完成。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `product.name` | 图片识别回填 | 视觉模型识别出的商品名称，前端可回填到 `ProductInput.name`。 | 不保证可用。识别失败时为空，用户手动填写。 |
| `product.category` | 图片识别回填 | 视觉模型识别出的品类，前端可回填到 `ProductInput.category`。 | 不保证可用。识别失败时为空，用户手动填写。 |
| `confidence` | 系统生成 | 视觉模型或 fallback 返回的置信提示。fallback payload 中为 `fallback`。 | 可用。失败时用于提示置信度不足。 |
| `visualFeatures` | 图片识别回填 / 系统生成 | 当前接口没有单独的 `visualFeatures` 顶层字段，视觉特征主要落在 `product.material`、`product.keywords`、`content` 和 `risks` 中。 | 部分可用。失败时以空内容和人工复核提示替代。 |
| `imageQualityWarning` | 系统生成 | 前端图片质量预检生成的质量提示，包括格式、体积、清晰度、亮度、对比度等问题。 | 可用。质量预检失败时仍提示可手动填写。 |
| `failureReason` | 系统生成 | 识别失败原因。接口 fallback payload 中对应 `reason` 和 `detail`。 | 可用。用于解释为何进入手动填写 / 演示 fallback。 |
| `manualFallback` | 系统生成 | 是否进入手动填写或演示 fallback。接口字段包括 `fallback`、`fallbackMode`、`fallbackMessage`。 | 可用。核心报告仍可通过 ProductInput 生成。 |

## MarketEvidence

`MarketEvidence` 是市场证据 Skill 的聚合说明。当前代码会把价格证据、抖音 / 内容热度证据、人工市场证据挂到 `result.priceEvidence`、`result.douyinEvidence`、`result.manualMarketEvidence`，并同步聚合到 `result.marketEvidence.price / douyin / manual`。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `priceEvidence` | 系统生成 / 用户输入辅助 | 来自 `evaluatePriceEvidence()`。可使用 1688 / 淘宝 adapter 结果，也可只使用用户填写的批发价、零售价和搜索参考入口。 | 可用。平台 API 未配置时返回搜索入口和人工价格证据，不伪造真实价格。 |
| `douyinEvidence` | 系统生成 / 用户输入辅助 | 来自 `evaluateDouyinFallbackEvidence()`。当前以用户填写的内容热度观察和搜索参考入口为主。 | 可用。不会伪造播放量、点赞量或销量。 |
| `manualMarketEvidence` | 用户输入 / 系统生成 | 来自 `evaluateManualMarketEvidence()`。使用批发价参考、零售价参考、内容热度、链接、竞品数量、同质化程度和备注。 | 可用。完全依赖用户填写和规则分析。 |
| `evidenceScore` | 系统生成 | 当前主要存在于各子证据对象中，例如 `priceEvidence.evidenceScore`、`douyinEvidence.evidenceScore`、`manualMarketEvidence.evidenceScore`。 | 可用。fallback 下以证据完整度和人工信息计算。 |
| `riskWarnings` | 系统生成 | 各市场证据对象给出的风险提示，例如无 API、价格证据不足、内容同质化、缺少链接。 | 可用。fallback 会明确提示证据不足。 |
| `nextActions` | 系统生成 | 下一步补充证据或验证建议，例如补充竞品价格、人工查看搜索页、做小批量内容测试。 | 可用。fallback 下仍是核心输出。 |

## PurchaseDecisionResult

`PurchaseDecisionResult` 是进货报告核心结果。当前代码中的主要来源是 `analyzeProduct(product, hasImage)`，市场证据工具会在其基础上补充 `priceEvidence`、`douyinEvidence` 和 `manualMarketEvidence`。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `totalScore` | 系统生成 | 综合评分，来自规则评分。LLM Insight 不覆盖该数值。 | 可用。只要有基础输入即可计算。 |
| `level` | 系统生成 | 决策建议，例如推荐拿样、建议测款、暂不建议直接进货。 | 可用。由规则生成。 |
| `status` | 系统生成 | 产品状态，例如准备拿样、正在测款、建议补货、暂不考虑。 | 可用。由规则生成。 |
| `margin` | 系统生成 | 毛利率，基于用户填写的 `price` 和 `cost`。 | 可用。缺价格或成本时为保守值。 |
| `profit` | 系统生成 | 预估单件利润。 | 可用。依赖价格和成本。 |
| `unitCost` | 系统生成 | 单件成本，主要取自 `ProductInput.cost`。 | 可用。依赖用户输入。 |
| `stockCost` | 系统生成 | 首批压货资金，通常为成本乘 MOQ。 | 可用。依赖成本和 MOQ。 |
| `risks` | 系统生成 | 毛利、MOQ、供应商、竞品价格、品类风险等提示。 | 可用。fallback 下仍可生成。 |
| `actions` | 系统生成 | 拿样、内容测试、私域验证、供应商沟通、复盘等下一步动作。 | 可用。fallback 下仍可生成。 |
| `xhsPackage` | 系统生成 | 小红书图文测款内容包。 | 可用。由规则模板生成，不依赖 LLM。 |
| `douyinPackage` | 系统生成 | 抖音短视频脚本和测试目标。 | 可用。由规则模板生成，不依赖真实平台 API。 |
| `aiReasoningInsights` | 系统生成 / LLM fallback | LLM 智能推理补充层。当前在前端状态和报告导出参数中传递，不替代规则评分。 | 可用。LLM 失败时返回 fallback 建议。 |
| `supplierCommunication` | 系统生成 | 供应商沟通包由 `generateSupplierCommunicationPack(product, result)` 按需生成，当前不是评分核心输入。 | 可用。依赖产品和规则结果，不依赖外部 API。 |

## SupplierCommunicationPack

`SupplierCommunicationPack` 是供应商沟通 Skill 的输出。当前代码来源是 `src/utils/supplierCommunicationUtils.js`。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `summary` | 系统生成 | 汇总商品、价格、MOQ、材质、人群、渠道和沟通重点。 | 可用。缺字段时使用“未填写”提示。 |
| `inquiryMessage` | 系统生成 | 询价话术，用于确认现货、规格、阶梯价、MOQ、打样和发货。 | 可用。 |
| `negotiationMessage` | 系统生成 | 议价话术，围绕利润、MOQ、混批、返单价和附加费用。 | 可用。 |
| `sampleMessage` | 系统生成 | 打样确认话术，确认样品和大货一致性、材质、实拍图和瑕疵规则。 | 可用。 |
| `shippingMessage` | 系统生成 | 发货与售后确认话术。 | 可用。 |
| `riskCheckQuestions` | 系统生成 | 风险核对问题，结合基础问题、品类模板和动态风险生成。 | 可用。 |
| `copyBlocks` | 系统生成 | 可复制的话术块数组，包含标题和内容。 | 可用。 |

## ReviewData

`ReviewData` 是测款复盘输入。当前代码中的主要载体是前端 `review` 状态和 `src/types/review.ts`。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `views` | 用户输入 | 浏览量。用于互动率和询单率。 | 可用。用户手动填写。 |
| `likes` | 用户输入 | 点赞数。用于互动率。 | 可用。 |
| `saves` | 用户输入 | 收藏数。当前 ReviewView 使用 `saves`。 | 可用。 |
| `comments` | 用户输入 | 评论数。用于互动率。 | 可用。 |
| `inquiries` | 用户输入 | 私信 / 询单数。用于询单率和成交转化判断。 | 可用。 |
| `orders` | 用户输入 | 实际成交数。用于成交转化率和单均测款成本。 | 可用。 |
| `cost` | 用户输入 | 测款成本。用于单均测款成本。 | 可用。 |
| `interactionRate` | 系统生成 / 可选 | 互动率派生指标。当前 UI 现场计算，不一定持久化。 | 可重新计算。 |
| `inquiryRate` | 系统生成 / 可选 | 询单率派生指标。当前 UI 现场计算，不一定持久化。 | 可重新计算。 |
| `conversionRate` | 系统生成 / 可选 | 成交转化率派生指标。当前 UI 现场计算，不一定持久化。 | 可重新计算。 |
| `costPerOrder` | 系统生成 / 可选 | 单均测款成本。当前 UI 现场计算，不一定持久化。 | 可重新计算。 |

## ProductRecord

`ProductRecord` 是产品库保存到 localStorage / Supabase 的核心对象。localStorage key 为 `tradepilot_local_records`；Supabase 表为 `tradepilot_product_records`。存储层会在读写时标准化 `id`、`created_at`、`updated_at`，并在云端行和前端记录之间转换。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `id` | 存储层生成 | 产品记录唯一 ID，本地保存时通常为 `local-${Date.now()}`。 | 可用。 |
| `product` | 用户输入 / 图片识别回填 / 存储层生成 | 保存 ProductInput，包括可选 `imagePreview`。 | 可用。Supabase 不可用时保存在 localStorage。 |
| `result` | 系统生成 | 保存进货报告核心摘要，如 `totalScore`、`level`、`status`、`risks`、`scores`、`margin`、`profit`、`unitCost`、`stockCost` 等。 | 可用。由规则生成。 |
| `review` | 用户输入 / 系统生成 | 保存测款复盘输入。当前保存逻辑也会把 review 放入 `result.review`。 | 可用。用户手动填写。 |
| `createdAt` / `created_at` | 存储层生成 | 创建时间。当前存储层主要使用 `created_at`，导出备份时也补充 `createdAt`。 | 可用。 |
| `updatedAt` / `updated_at` | 存储层生成 | 更新时间。当前存储层主要使用 `updated_at`，导出备份时也补充 `updatedAt`。 | 可用。 |
| `storage source` | 存储层生成 / 运行态状态 | 记录来自本地或云端。当前代码主要通过存储返回值的 `mode`、`effectiveMode` 和 `status` 表示，而不是要求每条记录都持久化该字段。 | 可用。Supabase 不可用时 `effectiveMode` 回退本地。 |

## AiInsightResult

`AiInsightResult` 是 LLM Insight Skill 或 fallback 的统一输出。当前代码来源包括 `api/generate-ai-insight.js`、`src/utils/aiInsightClient.js` 和 `src/utils/aiInsightUtils.js`。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `source` | 系统生成 | `llm` 或 `fallback`。 | 可用。fallback 会明确标注。 |
| `scenario` | 系统生成 / 请求参数 | 场景，目前包括 `purchase_decision`、`content_testing`、`review_summary`。 | 可用。非法场景会回退到进货决策。 |
| `summary` | LLM / fallback | 定性总结。 | 可用。LLM 失败时使用内置基础策略。 |
| `reasoningPoints` | LLM / fallback | 推理要点，强调只基于已填信息和系统结果。 | 可用。 |
| `nextActions` | LLM / fallback | 下一步验证建议。 | 可用。 |
| `riskWarnings` | LLM / fallback | 风险提示，不编造销量、播放量、点赞量或真实平台数据。 | 可用。 |
| `confidenceNote` | LLM / fallback | 可信度说明。fallback 下说明以规则报告和人工复核为准。 | 可用。 |

## AgentStageState

`AgentStageState` 是 Agent Orchestrator 对当前阶段的判断。当前代码来源是 `src/utils/agentOrchestrator.js` 的 `getAgentState()`。

| 字段 | 来源 | 说明 | fallback 时是否可用 |
|---|---|---|---|
| `currentStage` / `stage` | 系统生成 | 当前阶段。代码中字段名为 `stage`，可能值包括 `collecting`、`analyzing`、`report_ready`、`saved`、`pk_ready`、`review_ready`。 | 可用。基于本地状态判断。 |
| `missingFields` | 系统生成 | 缺失关键信息，例如商品名称、品类、成本、售价、MOQ、目标人群、销售渠道。 | 可用。 |
| `riskFocus` | 系统生成 | 当前最需要关注的风险，聚合规则风险、价格证据风险、内容热度风险、人工市场证据风险、图片质量和识别状态。 | 可用。 |
| `nextActions` | 系统生成 | 阶段对应的建议动作，例如补字段、生成报告、保存产品库、进入 PK、查看复盘。 | 可用。 |
| `confidence` / `confidenceLevel` | 系统生成 | 当前阶段判断可信度。代码字段名为 `confidenceLevel`，值为 `low`、`medium`、`high`。 | 可用。识别失败或缺字段较多时会降低。 |

## Agent / Skills 数据传递关系

```text
用户上传图片 / 手动填写
→ Image Quality Skill 输出 imageQualityWarning
→ Image Recognition Skill 尝试回填 ProductInput
→ ProductInput 进入 Purchase Decision Skill
→ PurchaseDecisionResult 叠加 Market Evidence Skill
→ AiInsightResult 作为补充层解释 result，不覆盖评分
→ SupplierCommunicationPack 按 product + result 生成供应商话术
→ ProductRecord 保存 product / result / review
→ PK Skill 从 ProductRecord 读取多个候选产品做对比
→ Review Skill 使用 ReviewData 复盘测款表现
→ Report Export Skill 使用 product / result / review / aiReasoningInsights 生成 HTML / PDF / 文档
```

## fallback 下仍可运行的核心对象

| fallback 场景 | 仍可用对象 | 降级说明 |
|---|---|---|
| 图片识别失败 | `ProductInput`、`PurchaseDecisionResult`、`ProductRecord` | 用户手动填写基础字段后仍可生成报告和保存产品库。 |
| LLM Insight 失败 | `AiInsightResult` | 返回 `source: fallback` 的基础策略建议，不覆盖评分。 |
| 1688 / 淘宝 adapter 未配置 | `MarketEvidence.priceEvidence` | 使用搜索参考入口和用户填写竞品价格，不生成或伪造真实平台价格。 |
| 抖音真实 API 不可用 | `MarketEvidence.douyinEvidence` | 使用内容热度观察和搜索参考入口，不伪造播放量、点赞量或销量。 |
| Supabase 不可用 | `ProductRecord` | 写入和读取回退 `localStorage` 的 `tradepilot_local_records`。 |
| 国内静态站 API 不可用 | `ProductInput`、`PurchaseDecisionResult`、`ReviewData` | 手动填写、规则评分、产品库本地保存、PK、复盘和报告导出仍可使用。 |
