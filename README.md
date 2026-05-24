# TradePilot AI｜拿货搭子：进货选品与爆款测款智能体

## 在线体验入口

Vercel 主站（功能最完整，建议优先使用）：  
https://tradepilot-ai-site.vercel.app/

备用访问链接（如 Vercel 因网络环境无法正常打开，可使用该链接体验核心功能）：  
https://tradepilot-ai-cn-d8e0br35fa97442-1433170191.tcloudbaseapp.com/

完整项目代码仓库：  
https://github.com/Jyooyj/tradepilot-ai-site

---

## 1. 项目简介

TradePilot AI｜拿货搭子 是一个面向小商品进货、内容电商测款和大学生创业场景的 AI 进货选品与爆款测款智能体。

项目围绕“产品信息采集—图片识别—进货决策报告—内容测款建议—供应商沟通—产品库沉淀—候选产品 PK—测款复盘—报告导出”形成完整业务闭环，帮助新手卖家在进货前更清楚地判断一个商品是否值得拿样、测款或补货，降低盲目囤货和压货风险。

项目口号：

> 进货前，先算清楚。别让第一次进货，变成第一次压货。

---

## 2. 项目定位

TradePilot AI 不是一个泛化 AI 助手，而是一个聚焦“小商品进货决策”的垂直场景工具。

目标用户包括：

- 义乌小商品拿货新手
- 大学生创业者
- 校园摆摊 / 校园零售经营者
- 小红书、抖音、视频号内容电商卖家
- 小微电商和社群团购运营者
- 需要快速测款和复盘的初创团队

核心解决的问题是：

- 进货前缺少结构化判断
- 拿货决策依赖主观感觉
- 不清楚利润空间和 MOQ 风险
- 不知道商品适合什么内容测款方式
- 产品记录分散，难以长期复盘
- 多个候选产品之间缺少对比依据
- 测款后缺少数据沉淀和二次决策

---

## 3. 体验说明

当前线上版本为半决赛演示版，重点保证评委和用户可以快速体验完整功能流程。

项目支持游客模式，无需注册即可完成：

- 商品图片上传
- AI 辅助识别
- 手动填写商品信息
- 生成进货决策报告
- 保存到产品库
- 候选产品 PK
- 测款复盘
- HTML 可视化报告下载
- 浏览器打印 / 另存为 PDF
- JSON / CSV 数据导出

游客模式下，产品记录默认保存在本地浏览器中。正式使用场景下，可选择 Supabase 云端同步，实现账号登录、云端产品库保存和跨设备同步。

备用访问链接支持游客模式、手动填写产品信息、生成进货报告、产品库、候选产品 PK、测款复盘、HTML 报告下载和 PDF 导出等核心功能。图片识别和 LLM 推理能力可能受部署环境、后端接口和 API Key 配置影响；即使接口不可用，系统也会保留手动填写、示例数据体验和基础策略建议，不影响主流程演示。

---

## 4. 核心工作流

```text
上传产品图 / 手动填写产品信息
↓
图片质量检测与 AI 识别
↓
商品信息结构化采集
↓
利润测算、MOQ 判断与风险评分
↓
生成 AI 进货决策报告
↓
生成内容测款建议和供应商沟通话术
↓
保存到我的产品库
↓
候选产品 PK
↓
测款数据复盘
↓
决定是否拿样、补货、优化内容或放弃
```

---

## 5. 核心功能

### 5.1 产品图片上传与 AI 识别

用户可以上传商品图片，系统会进行图片格式、大小、分辨率、亮度、对比度和清晰度检测，并调用阿里云百炼 / DashScope 视觉模型辅助识别商品名称、品类、材质、目标人群、销售渠道和内容关键词等信息。

图片识别失败或接口不可用时，系统不会中断流程。用户可以继续手动填写商品信息，也可以使用示例数据体验完整流程。

当前示例入口统一为：

> 使用示例数据体验完整流程

示例数据仅用于演示识别回填和报告生成流程，不代表真实图片识别结果，也不会伪造平台价格、销量、播放量或点赞量。

### 5.2 图片质量提示与手动兜底

项目内置图片质量检测逻辑，支持识别以下情况：

- 图片格式不支持
- 图片过大或过小
- 图片分辨率过低
- 图片过暗或过亮
- 对比度过低
- 图片疑似模糊
- 商品主体不清晰
- 多商品、遮挡或大图影响识别

图片质量提示已做降噪处理，清晰图片不会轻易触发强警告。识别成功时，轻微质量提醒会弱化展示；只有严重模糊、低置信度、品类 unknown、商品名为空或接口异常等情况，才会提示用户重新上传或手动填写。

### 5.3 进货信息采集

用户可填写或修改以下信息：

- 商品名称
- 品类
- 拿货价
- 建议售价
- MOQ 最小起订量
- 材质
- 供应商信息
- 目标人群
- 销售渠道
- 竞品价格
- 物流 / 包装风险
- 内容关键词
- 市场证据补充

系统会将用户填写信息与 AI 识别结果结合，用于后续利润测算、风险判断和内容测款建议。

### 5.4 AI 进货决策报告

系统根据结构化商品信息生成进货决策报告，包括：

- 综合评分
- 进货建议
- 当前状态
- 预计毛利率
- 单件利润
- 单件综合成本
- 首批压货资金
- MOQ 风险
- 价格带判断
- 渠道适配建议
- 风险提示
- 下一步行动建议

报告不是简单给出“买 / 不买”，而是解释商品为什么适合或不适合拿样、当前最大风险是什么、下一步应该验证什么。

### 5.5 LLM 智能推理补充

在保留规则评分稳定性的基础上，项目新增 LLM 智能推理补充模块，用于生成：

- AI 进货决策推理
- AI 内容测款策略
- AI 测款复盘总结

LLM 只作为定性分析辅助，不覆盖综合评分、利润率、MOQ、风险等级等规则结果，也不伪造真实平台数据。

当 LLM 接口不可用、超时或未配置 Key 时，系统会自动展示基础策略建议，不影响报告生成、产品库保存、PK、复盘和报告导出。页面不直接展示 `fallback`、`timeout`、`请求超时` 等技术词。

### 5.6 内容测款建议

系统会根据商品品类、目标人群、渠道和内容场景生成内容测款方案，包括：

- 小红书封面文案
- 小红书标题建议
- 图文结构
- 推荐标签
- 抖音短视频方向
- 20 秒分镜脚本
- 封面文案
- 拍摄注意点
- 平台搜索关键词
- 商家发布策略

内容测款建议强调“小范围验证”，用于判断用户是否理解卖点、是否产生收藏、评论、询单和成交，而不是直接预测商品必爆。

### 5.7 供应商沟通 Skill

项目已新增供应商沟通模块，用于根据商品信息、利润空间、MOQ 和风险提示生成可复制的话术。

包括：

- 询价话术
- 议价话术
- 打样确认话术
- 发货与售后确认话术
- 风险确认清单

该模块不接入 1688 API，也不伪造供应商名称、电话或店铺数据，只作为用户拿样前的沟通辅助工具。HTML / PDF 报告中也会同步展示供应商沟通内容。

### 5.8 我的产品库

用户可以将生成的进货判断保存到产品库中，用于长期复盘和候选产品管理。

产品库支持：

- 保存当前报告
- 搜索产品
- 筛选记录
- 排序查看
- 查看历史报告
- 保存测款复盘
- 本地存储与云端同步状态提示
- JSON 导出备份
- JSON 导入恢复
- CSV 导出分析

游客模式下，记录默认保存在本地浏览器中。清除浏览器缓存或更换设备可能导致数据丢失，因此项目提供 JSON 备份与导入恢复功能。

### 5.9 本地 / 云端存储模式

项目支持三种存储模式：

- 自动选择
- 仅本地保存
- 云端同步

本地模式使用：

```text
localStorage key: tradepilot_local_records
```

云端同步使用 Supabase，表结构预留为：

```text
tradepilot_product_records
```

如果 Supabase 不可用，系统会自动保留本地模式，不影响评测体验和核心流程。

### 5.10 候选产品 PK

系统可以基于产品库中的候选商品进行对比，帮助用户判断哪个产品更适合优先拿样、测款或补货。

候选产品 PK 支持：

- 综合评分对比
- 利润空间对比
- MOQ 风险对比
- 渠道适配对比
- 内容测款潜力对比
- 雷达图可视化
- 柱状图可视化

图表基于已有保存记录字段生成，不修改原有评分算法和产品库数据结构。

### 5.11 测款复盘

用户可输入以下测款数据：

- 浏览量
- 点赞数
- 收藏数
- 评论数
- 私信 / 询单数
- 实际成交数
- 测款成本

系统会自动计算：

- 互动率
- 询单率
- 成交转化率
- 单均测款成本

并给出复盘建议，例如：

- 内容吸引力不足
- 互动高但成交偏低
- 询单高但成交低
- 成交好且成本可控
- 建议继续测试、优化内容或谨慎补货

测款复盘支持可视化图表：多条记录展示趋势图，单条记录展示指标条形图，无数据时显示空状态提示。

### 5.12 报告下载与导出

项目支持多种报告与数据导出方式：

- HTML 可视化报告下载
- 浏览器打印 / 另存为 PDF
- 产品库 JSON 导出
- 产品库 JSON 导入恢复
- 产品库 CSV 导出

PDF 采用浏览器打印方案，不引入 jsPDF、html2canvas 或其他复杂依赖，降低部署体积和兼容风险。

报告中的淘宝 / 抖音搜索参考入口已优化为按钮式链接，例如：

```text
点击打开淘宝搜索参考
```

不再直接展示超长 URL，避免链接换行、溢出或看起来像断链。链接 href 仍保留真实搜索地址，并使用安全的属性转义方式处理。

### 5.13 移动端适配

项目已补充基础移动端响应式适配，确保在手机端也能完成核心流程。

已适配页面包括：

- 首页
- 商品填写页
- 报告页
- 产品库
- 候选产品 PK
- 测款复盘
- 图表组件

重点场景是批发市场现场使用手机上传图片、快速填写信息并查看进货建议。

### 5.14 ErrorBoundary 防白屏

项目已新增 React ErrorBoundary，在应用顶层捕获运行时异常，例如：

- 图片上传异常
- 图表渲染异常
- 历史记录字段缺失
- 局部组件渲染失败

出现异常时，系统会显示友好的降级 UI，避免整页白屏。

---

## 6. Agent / Skills 架构说明

TradePilot AI 当前不定义为多个完全自主运行的 LLM Agent，而是采用：

```text
1 个工作流式主 Agent + 多个 Skills 能力模块
```

主 Agent 负责围绕进货决策任务组织流程，Skills 分别完成具体能力。

### 6.1 工作流式主 Agent

TradePilot 主 Agent 的任务是：

- 判断当前用户处于哪个进货决策阶段
- 检查商品信息是否完整
- 提示缺失字段
- 根据已有 product / result / records / review 状态给出下一步建议
- 串联图片识别、报告生成、产品库、PK、复盘和导出流程

项目已新增 Agent Orchestrator 和 Agent 状态面板，用于展示当前阶段和下一步任务建议。

### 6.2 Skills 能力模块

当前 Skills 包括：

| Skill | 作用 |
|---|---|
| Image Quality Skill | 图片质量检测与识别前预检查 |
| Image Recognition Skill | 调用视觉模型识别商品信息 |
| Product Input Skill | 采集进货所需字段 |
| Purchase Decision Skill | 利润测算、MOQ 判断、风险评分 |
| Market Evidence Skill | 人工市场证据、搜索参考入口和价格判断 |
| LLM Insight Skill | 进货推理、内容策略和复盘总结 |
| Content Testing Skill | 小红书 / 抖音内容测款建议 |
| Supplier Communication Skill | 供应商沟通话术生成 |
| Product Library Skill | 产品库保存、搜索、筛选、导出 |
| Product PK Skill | 候选产品可视化对比 |
| Review Skill | 测款复盘指标计算 |
| Report Export Skill | HTML / PDF / JSON / CSV 导出 |

当前项目重点是“工作流式 AI 进货决策智能体”，不是完全自主采购机器人。后续可继续引入 Planning、Tool Calling、Memory 和多步执行循环，增强 Agent 自主性。

---

## 7. 技术栈

- React
- Vite
- Tailwind CSS
- Recharts
- Supabase
- Vercel
- 腾讯云 CloudBase
- 阿里云百炼 / DashScope 视觉模型
- DashScope / 通义千问兼容接口用于 LLM 推理补充
- localStorage 游客演示数据存储
- Vitest 自动化测试
- TypeScript 类型说明文件

说明：当前主体代码仍以 JavaScript / JSX 为主，`src/types/` 中提供核心数据模型的 TypeScript 类型说明。TypeScript 目前主要用于类型文档和后续迁移基础，不代表所有 JSX 文件已完全类型约束。

---

## 8. 项目结构

```text
tradepilot-ai-site/
├── api/
│   ├── analyze-image.js
│   └── generate-ai-insight.js
├── docs/
│   ├── Agent-Data-Model.md
│   └── Technical-Architecture.md
├── src/
│   ├── components/
│   │   ├── AgentStatusPanel.jsx
│   │   ├── AiInsightPanel.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── HistoryView.jsx
│   │   ├── OperateView.jsx
│   │   ├── PKView.jsx
│   │   ├── ProductBackupActions.jsx
│   │   ├── ResultView.jsx
│   │   ├── ReviewView.jsx
│   │   ├── StorageModeSelector.jsx
│   │   ├── StorageStatusBadge.jsx
│   │   ├── SupplierCommunicationPanel.jsx
│   │   └── charts/
│   │       ├── ProductPKBarChart.jsx
│   │       ├── ProductPKRadarChart.jsx
│   │       └── ReviewMetricChart.jsx
│   ├── constants/
│   │   ├── imageQualityConfig.js
│   │   └── productConfig.js
│   ├── services/
│   │   └── productStorage.js
│   ├── types/
│   │   ├── product.ts
│   │   ├── report.ts
│   │   └── review.ts
│   └── utils/
│       ├── agentOrchestrator.js
│       ├── aiInsightClient.js
│       ├── aiInsightUtils.js
│       ├── douyinFallbackUtils.test.js
│       ├── imageQualityUtils.js
│       ├── manualMarketEvidenceUtils.test.js
│       ├── priceEvidenceUtils.test.js
│       ├── productBackupUtils.js
│       ├── reportUtils.js
│       └── supplierCommunicationUtils.js
├── App.jsx
├── main.jsx
├── README.md
├── Demo-Guide.md
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 9. 技术路线

### 9.1 前端

- 使用 React + Vite 构建单页应用；
- 使用 Tailwind CSS 实现暗色科技风界面、卡片式布局和响应式适配；
- 使用 Recharts 实现候选产品 PK 和测款复盘可视化；
- 通过组件化方式组织游客模式、图片上传、报告生成、产品库、PK、复盘等模块；
- 使用 ErrorBoundary 防止局部运行时错误导致整页白屏；
- 使用 localStorage 实现游客演示数据持久化。

### 9.2 AI 与接口

- `api/analyze-image.js` 调用阿里云百炼 / DashScope 视觉模型进行商品图片识别；
- `api/generate-ai-insight.js` 调用 LLM 接口生成智能推理补充；
- 图片识别结果用于辅助回填产品名称、品类、材质、目标人群、渠道和内容关键词；
- LLM 推理仅提供定性解释、策略建议和复盘总结，不直接修改评分；
- API Key 仅保存在服务端环境变量中，不写入前端代码和公开仓库。

### 9.3 数据与业务逻辑

系统围绕以下对象组织数据流：

- ProductInput
- ImageAnalysisResult
- MarketEvidence
- PurchaseDecisionResult
- SupplierCommunicationPack
- ReviewData
- ProductRecord
- AiInsightResult
- AgentStageState

更详细的数据模型说明见：

```text
docs/Agent-Data-Model.md
```

### 9.4 存储

- 本地游客模式使用 localStorage；
- 云端同步使用 Supabase；
- 支持自动选择 / 仅本地保存 / 云端同步；
- 支持 JSON / CSV 导出；
- 支持 JSON 导入恢复；
- localStorage key 保持为 `tradepilot_local_records`。

### 9.5 部署

- Vercel 作为主站部署平台；
- 腾讯云 CloudBase 作为国内备用访问方案；
- Vercel 部署源码；
- CloudBase 静态网站托管上传 `dist` 构建产物；
- 服务端 API Key 通过 Vercel / CloudBase 环境变量管理。

---

## 10. 环境变量

本项目可能使用以下环境变量：

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

DASHSCOPE_API_KEY=
DASHSCOPE_TEXT_MODEL=
DASHSCOPE_TEXT_ENDPOINT=

VITE_AI_INSIGHT_URL=
VITE_ANALYZE_IMAGE_URL=
```

说明：

- `DASHSCOPE_API_KEY` 用于服务端图片识别和 LLM 推理；
- 不建议使用 `VITE_` 前缀存储任何密钥；
- `VITE_` 变量会暴露到前端；
- 本地测试可使用 `.env.local`；
- `.env.local` 不应上传 GitHub。

---

## 11. 本地运行

安装依赖：

```bash
npm install
```

如果 PowerShell 拦截，可以使用：

```bash
npm.cmd install
```

启动开发环境：

```bash
npm run dev
```

或：

```bash
npm.cmd run dev
```

构建生产版本：

```bash
npm run build
```

或：

```bash
npm.cmd run build
```

运行测试：

```bash
npm run test
```

或：

```bash
npm.cmd run test
```

运行类型检查：

```bash
npm run typecheck
```

或：

```bash
npm.cmd run typecheck
```

---

## 12. 测试说明

项目已配置 Vitest，并补充了 3 个测试文件，共 21 个测试用例。

当前测试文件包括：

```text
src/utils/priceEvidenceUtils.test.js
src/utils/manualMarketEvidenceUtils.test.js
src/utils/douyinFallbackUtils.test.js
```

测试覆盖内容包括：

- 价格证据解析
- 人工市场证据完整度
- 内容热度 fallback
- 风险判断
- scoreAdjustment 范围限制
- 空输入兜底
- 字段合并不破坏原数据
- 不输出 fake 平台数据

测试不依赖真实外部 API，不需要联网，不调用真实 DashScope、淘宝、1688、抖音或小红书接口。

---

## 13. 开发者技术文档

本项目已补充面向开发者的技术文档：

- `docs/Technical-Architecture.md`：说明项目整体架构、Agent / Skills 协作流程、数据流、API 接口、存储方式、fallback 机制和部署结构。
- `docs/Agent-Data-Model.md`：说明 ProductInput、PurchaseDecisionResult、MarketEvidence、ProductRecord、ReviewData、AiInsightResult 等核心数据模型。

这些文档用于帮助评审和开发者理解 TradePilot AI 的技术实现，而 README 主要面向项目介绍、部署和体验说明。

---

## 14. 合规与数据边界

项目明确遵守以下原则：

1. 不伪造真实平台数据；
2. 不伪造淘宝、1688、抖音、小红书真实价格、销量、播放量、点赞量或成交数据；
3. 市场证据主要来自用户填写和搜索参考入口；
4. 搜索参考链接仅用于人工复核；
5. 当前版本不会自动打开或解析外部平台页面；
6. LLM 推理仅作为辅助建议，不替代真实经营判断；
7. 报告不构成绝对经营承诺；
8. 示例数据仅用于演示流程，不代表真实识别结果。

---

## 15. API fallback 与演示模式

考虑到比赛评测环境中可能出现 API Key 未配置、额度不足、接口超时、国内备用站无法访问后端接口等情况，项目设计了多层 fallback 机制。

### 15.1 图片识别 fallback

当图片识别接口不可用时：

- 页面提示识别接口暂不可用；
- 用户可以继续手动填写商品信息；
- 用户可以使用示例数据体验完整流程；
- 示例数据仅用于演示，不代表真实图片识别结果；
- 后续报告仍基于用户确认后的表单信息生成。

### 15.2 LLM 推理 fallback

当 LLM 推理不可用时：

- 页面展示基础策略建议；
- 不暴露 `fallback`、`timeout`、`请求超时` 等技术词；
- 不影响报告生成；
- 不影响产品库保存；
- 不影响 HTML / PDF 导出；
- 不影响候选产品 PK 和测款复盘。

### 15.3 Supabase fallback

当 Supabase 不可用时：

- 系统保留本地保存模式；
- 用户仍可保存产品记录；
- 页面提示当前数据存储状态；
- 用户可通过 JSON / CSV 导出备份数据。

---

## 16. 技术护城河与差异化

TradePilot AI 当前不以自研大模型作为底层技术壁垒，而是通过垂直场景工作流、结构化数据、品类规则库和测款复盘闭环形成差异化。

短期差异化来自：

- 小商品进货决策的垂直工作流；
- 品类识别规则库；
- 利润、MOQ、风险和内容测款的组合判断；
- 产品库、候选 PK 和测款复盘闭环；
- 低门槛在线 Demo 和游客模式；
- 本地 / 云端双存储与导出能力。

中期壁垒来自：

- 用户进货记录沉淀；
- 测款复盘数据积累；
- 不同品类、价格带、渠道和内容策略之间的经验映射；
- 供应商沟通记录和风险确认清单；
- 小商品品类规则和关键词库持续扩展。

长期壁垒来自：

- 正式授权的电商平台数据接入；
- 批发价、零售价、内容热度和成交反馈的结构化数据资产；
- 面向小商品选品场景的专有评分和复盘模型；
- 供应商资源与真实交易数据沉淀。

因此，TradePilot AI 的壁垒不是“调用某个大模型”，而是围绕小商品进货场景持续积累的数据、流程、规则和用户决策经验。

---

## 17. 数据采集与 RPA 路线说明

当前版本不直接接入 Puppeteer / Playwright 抓取淘宝、1688、抖音或小红书页面。

原因包括：

- 平台授权限制；
- 登录和验证码限制；
- 反爬策略；
- 部署稳定性；
- 合规风险；
- 页面结构变化导致采集不稳定。

当前版本采用更稳妥的方案：

- 人工市场证据填写；
- 搜索参考入口；
- API Adapter 预留；
- 用户人工核验；
- 不伪造真实平台数据。

后续可在合规授权前提下探索：

- Chrome 浏览器插件；
- 用户授权下的本地页面信息辅助采集；
- 用户粘贴商品链接后辅助提取标题、价格区间、MOQ 和供应商基础字段；
- 用户二次确认后写入市场证据；
- 正式平台 API 授权接入。

项目不会绕过登录、验证码、反爬机制，也不会将自动抓取受限平台数据作为当前已实现能力。

---

## 18. 当前版本说明

当前版本为半决赛演示版，重点保证评委可以快速体验完整功能流程。

当前已完成：

- 游客模式
- 图片上传与质量检测
- 图片识别接口调用
- 手动填写兜底
- 示例数据体验入口
- AI 进货报告
- LLM 智能推理补充
- 内容测款建议
- 供应商沟通 Skill
- 产品库保存
- Supabase 可选云同步
- JSON / CSV 导出
- JSON 导入恢复
- 候选产品 PK 可视化
- 测款复盘可视化
- HTML 报告下载
- PDF 打印导出
- 移动端基础适配
- ErrorBoundary 防白屏
- 技术架构文档
- Agent 数据模型文档
- Vitest 测试用例

---

## 19. 当前限制

当前版本仍存在以下限制：

1. 图片识别效果受图片质量和模型能力影响；
2. LLM 推理依赖服务端 API Key 和接口稳定性；
3. 淘宝、1688、抖音、小红书等平台暂未接入完整开放 API；
4. 市场证据主要来自用户填写和搜索参考入口；
5. 评分为启发式辅助判断，不代表真实销量预测；
6. 本地模式下数据依赖浏览器 localStorage；
7. PDF 报告采用浏览器打印方案，不直接生成后端 PDF 文件；
8. TypeScript 目前主要用于数据模型说明，核心 JSX 代码尚未完全迁移；
9. App.jsx 仍包含较多核心业务逻辑，后续可继续拆分；
10. 核心评分函数测试覆盖仍可进一步增强。

---

## 20. 后续优化方向

后续可继续优化：

- 将 `analyzeProduct`、`getScoringItems`、`inferProductIdentity` 等核心函数拆分到独立 `src/logic/` 或 `src/utils/` 模块；
- 补充核心评分函数单元测试；
- 继续压缩 App.jsx 体积；
- 深化 TypeScript 迁移；
- 规范 utils 目录结构；
- 增强真实平台数据接入能力；
- 探索合规 Chrome Extension 数据采集；
- 增强 LLM Agent 的 Planning、Tool Calling 和 Memory 能力；
- 增加更多小商品品类规则库；
- 优化 PDF 报告样式与分页控制；
- 增加团队协作与多账号产品库；
- 增加供应商评分与历史交易复盘；
- 增加真实测款数据趋势分析。

---

## 21. 验证情况

最近版本验证结果：

```text
npm.cmd run build：通过
npm.cmd run test：通过，3 个测试文件，21 个测试用例
npm.cmd run typecheck：通过
```

构建时可能出现 Vite chunk size warning，但不影响当前构建结果和线上运行。
v
