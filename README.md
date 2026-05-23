# TradePilot AI｜拿货搭子：进货选品与爆款测款智能体

## 在线体验入口

Vercel 主站（功能最完整，建议优先使用）：  
https://tradepilot-ai-site.vercel.app/

备用访问链接（如 Vercel 因网络环境无法正常打开，可使用该链接体验核心功能）：  
https://tradepilot-ai-cn-d8e0br35fa97442-1433170191.tcloudbaseapp.com/

完整项目代码仓库：  
https://github.com/Jyooyj/tradepilot-ai-site

---

## 项目说明

TradePilot AI｜拿货搭子 是一个面向小商品进货、内容电商测款和大学生创业场景的 AI 进货选品与爆款测款智能体。项目围绕“产品信息采集—图片识别—进货决策报告—内容测款建议—产品库沉淀—候选产品 PK—测款复盘”形成完整业务闭环。

项目不是单纯的图片识别工具，也不是简单的文案生成器，而是围绕“进货前如何判断一个商品值不值得拿样、测款、补货”这一真实场景，提供结构化辅助判断。

核心功能包括：游客演示模式、上传产品图片识别、图片质量检测、手动填写产品信息、生成进货决策报告、市场证据补充、保存到我的产品库、产品库搜索筛选排序、候选产品 PK、测款复盘、数据可视化图表、HTML 可视化报告下载、PDF 报告导出和反馈建议入口。

备用访问链接支持游客模式、手动填写产品信息、生成进货决策报告、产品库、候选产品 PK、测款复盘和 HTML 报告下载等核心功能。图片识别建议上传截图或压缩后的产品图；如图片识别失败，仍可手动填写信息继续生成报告。

---

## 1. 项目简介

TradePilot AI｜拿货搭子 是一个面向小商品进货、内容电商测款和大学生创业场景的 AI 进货决策智能体。

项目帮助用户完成从产品图片识别、进货信息填写、利润测算、风险判断、内容测款建议、市场证据补充、产品库沉淀、候选产品 PK 到测款复盘的完整决策流程，降低新手卖家和小微创业者在选品进货中的盲目性。

项目口号：

> 进货前，先算清楚。别让第一次进货，变成第一次压货。

---

## 2. 体验说明

当前线上版本支持游客演示模式，评委无需注册即可直接体验完整流程。产品记录默认可保存在本地浏览器中，方便快速完成产品识别、进货判断、产品库保存、候选产品 PK 和测款复盘。

项目同时支持 Supabase 云端同步能力。用户可以在产品库中选择：

1. 自动选择：已登录且云端可用时优先使用 Supabase；否则回退本地模式。
2. 仅本地保存：数据保存在当前浏览器中，适合游客模式和比赛演示。
3. 云端同步：用户登录 Supabase 后，可将产品记录同步到云端数据库。

建议优先使用 Vercel 主站体验完整功能；如因网络环境导致 Vercel 无法正常访问，可使用备用访问链接体验核心流程。国内网络环境下 Supabase 可能不稳定，因此项目保留本地模式作为稳定兜底。

---

## 3. 目标用户

- 大学生创业者
- 校园摆摊 / 校园零售经营者
- 小红书、抖音、视频号内容电商卖家
- 义乌小商品进货新手
- 小微电商和社群团购运营者
- 会展采购和批发市场看货用户
- 需要快速测款和复盘的初创团队

---

## 4. 核心功能

### 4.1 产品图片上传与 AI 识别

用户可以上传商品图片，系统辅助识别产品类型、材质、目标人群、内容关键词等信息，并回填到进货信息表单中。

图片识别用于提升录入效率，但不是生成报告的唯一依据。即使图片识别失败，用户也可以继续手动填写商品信息并生成完整进货报告。

### 4.2 图片质量检测与识别降级

为提升图片识别的稳定性，系统新增图片质量预检测机制。上传图片后，系统会在前端进行轻量检测，包括图片格式、文件大小、分辨率、亮度、对比度和模糊程度。

当图片存在模糊、过暗、过亮、分辨率过低、主体不清晰、多个商品同图、商品被遮挡、模型无法稳定判断品类或图片过大导致上传失败等情况时，系统会给出提示。

系统不会因为图片质量问题直接中断流程。用户可以重新上传更清晰的图片，也可以跳过图片识别，直接手动填写商品信息继续生成报告。

### 4.3 进货信息采集

用户可填写商品名称、拿货价、建议售价、MOQ、材质、供应商信息、目标人群、销售渠道、竞品价格区间、物流和供应风险、市场观察备注等字段。

### 4.4 AI 进货决策报告

系统根据产品信息生成结构化进货报告，包含综合评分、AI 建议、预计毛利率、首批压货资金、单件利润、单件综合成本、风险提示和下一步行动建议。

评分结果属于进货前辅助判断，不代表真实销量预测，也不等同于平台真实市场表现。

### 4.5 内容测款建议

系统自动生成适合小红书和抖音的内容测款方案，包括小红书封面文案、标题建议、图文结构、抖音短视频脚本、推荐话题标签、跨平台搜索关键词和供应商沟通清单。

系统强调“先测款，再决定是否补货”，避免直接大量进货造成压货风险。

### 4.6 市场证据补充

由于抖音、淘宝、1688 等平台 API 权限和网络环境存在限制，项目采用“市场证据模式”。

系统不会伪造平台价格、销量、点赞、播放、收藏、评论数据，也不会声称已经自动抓取真实平台数据。

系统支持用户手动填写真实调研信息，例如 1688 批发价参考、淘宝 / 拼多多零售价参考、抖音 / 小红书内容热度观察、同类竞品数量、内容同质化程度和市场调研备注。

系统会基于这些人工市场证据生成证据完整度评分、价格风险判断、内容测款风险和下一步验证建议。

### 4.7 淘宝 / 竞品价格证据分析

系统支持用户填写竞品价格区间，并结合商品拿货价、建议售价进行判断，包括当前售价是否高于竞品区间、拿货价是否明显偏高、是否仍有利润空间，以及是否需要依靠材质、包装、设计或场景卖点支撑溢价。

当前版本保留淘宝搜索参考入口，用于用户人工复核竞品价格。系统不会自动抓取淘宝真实价格数据。

### 4.8 抖音内容测款参考

系统支持基于用户填写的内容热度观察生成短视频测款建议，例如是否有点赞、收藏、询价等互动信号，同类内容是否过多，是否存在内容同质化风险，以及是否适合先拍短视频 / 图文进行轻量测款。

当前版本未调用真实抖音 API，不生成或伪造真实播放、点赞、收藏、评论数据。

### 4.9 我的产品库

用户可将生成的进货判断保存到产品库中，形成长期选品记录。产品库支持保存产品记录、搜索产品、筛选产品、排序产品、查看历史报告、删除记录、进入候选产品 PK 和进行测款复盘。

游客模式下，产品记录保存在本地浏览器。登录 Supabase 后，可选择云端同步。

### 4.10 候选产品 PK

系统会根据产品库中的候选商品进行对比分析，帮助用户判断哪个产品更适合优先拿样、测款或补货。

系统支持多商品综合评分对比、利润空间对比、风险水平对比、内容测款价值对比和进货优先级参考。

本项目已新增候选产品 PK 可视化图表，包括雷达图和柱状对比图。图表仅基于系统已有评分和用户填写信息生成，不改变原有评分逻辑。

### 4.11 测款复盘

用户可输入浏览量、点赞数、收藏数、评论数、询单数、成交数和测款成本，系统自动计算互动率、询单率、转化率和单均测款成本，并给出复盘建议。

本项目已新增测款复盘可视化展示：多条复盘记录展示趋势图，单条复盘记录展示指标条形图，无复盘数据时显示空状态提示。

### 4.12 报告下载与导出

系统支持两种报告导出方式：

- HTML 可视化报告：用户可将完整 AI 进货报告下载为 HTML 可视化报告，方便提交、复盘或团队讨论。
- PDF 报告导出：系统新增“导出 PDF 报告”按钮，采用浏览器打印方案，生成打印优化版 HTML，用户可在打印窗口中选择“另存为 PDF”。

该方案不新增复杂 PDF 依赖，不使用 jsPDF 或 html2canvas，稳定性更高，也便于评委快速查看。

---

## 5. 产品工作流

上传产品图 / 手动填写产品信息  
↓  
图片质量检测与 AI 辅助识别  
↓  
完善进货信息  
↓  
补充竞品价格、内容热度等市场证据  
↓  
生成 AI 进货决策报告  
↓  
保存到我的产品库  
↓  
候选产品 PK  
↓  
测款数据复盘  
↓  
决定是否拿样、补货或放弃  

---

## 6. 项目亮点

1. 聚焦真实细分场景：项目不是泛 AI 工具，而是聚焦“小商品进货决策”这一具体痛点。
2. 形成完整决策闭环：从识别、测算、判断、内容测款到复盘，覆盖进货前后的关键环节。
3. 报告结果可解释：每份报告不仅给出结论，还展示利润空间、人群匹配、内容潜力、供应稳定、风险可控和信息完整度等评分依据。
4. 支持市场证据补充：系统不伪造平台数据，而是支持用户补充真实调研信息，并据此生成辅助判断。
5. 支持数据可视化：候选产品 PK 和测款复盘新增图表展示，让产品对比和测款反馈更加直观。
6. 支持 HTML 与 PDF 报告导出：报告可下载为 HTML，也可通过浏览器打印另存为 PDF，便于提交和分享。
7. 适合比赛演示：当前线上版本支持游客演示模式，评委无需注册即可直接体验完整流程。
8. 具备商业化延展空间：后续可拓展为面向小微电商、校园创业者、批发市场采购者的 SaaS 工具或选品决策助手。

---

## 7. 技术栈

### 前端

- React
- Vite
- Tailwind CSS
- Recharts
- Framer Motion
- Lucide React

### 后端 / 服务

- Vercel
- Vercel Serverless Function
- 腾讯云 CloudBase 备用访问部署
- Supabase Auth
- Supabase Database
- 阿里云百炼视觉模型接口

### 数据与存储

- localStorage 游客演示数据存储
- Supabase 可选云端产品库同步
- Vercel / CloudBase 环境变量管理密钥

### 工程化

- TypeScript 基础类型文件
- Vitest 单元测试
- 组件拆分
- 工具函数拆分
- 常量配置拆分

---

## 8. 技术路线

### 8.1 前端

- 使用 React + Vite 构建单页应用，保证页面加载速度和开发效率。
- 使用 Tailwind CSS 实现暗色科技风界面、卡片式布局和响应式展示。
- 通过组件化方式组织游客模式、产品信息采集、报告生成、产品库、候选产品 PK、测款复盘等模块。
- 使用 Recharts 增加候选产品 PK 和测款复盘数据可视化。
- 使用 localStorage 实现游客演示数据持久化，核心 key 为 `tradepilot_local_records`。
- 通过存储模式选择器支持本地保存、自动选择和 Supabase 云端同步。
- 前端集成图片上传预览、压缩和图片质量检测逻辑，降低大图、模糊图、低质量图导致识别失败的风险。

### 8.2 AI 与接口

- 通过 Vercel Serverless Function 调用阿里云百炼视觉模型接口，实现商品图片识别。
- 通过腾讯云 CloudBase 云函数提供备用图片识别接口，提升不同网络环境下的可访问性。
- 图片识别结果用于辅助回填产品名称、品类、材质、目标人群、销售渠道和内容关键词等字段。
- 进货决策报告基于产品结构化信息生成，覆盖利润测算、风险判断、内容潜力、渠道适配和下一步行动建议。
- API Key 仅保存在服务端环境变量中，不写入前端代码和公开仓库。

### 8.3 数据与业务逻辑

- 系统围绕“产品信息采集—图片识别—利润测算—风险判断—爆款潜力评分—内容测款建议—产品库沉淀—候选产品 PK—测款复盘”构建完整业务闭环。
- 内置产品身份识别与品类校验逻辑，减少发饰、耳夹、手链、文创挂饰、纸品等小商品之间的内容串模板问题。
- 根据拿货价、建议售价、MOQ、竞品价格等字段计算单件利润、毛利率和首批压货资金。
- 根据产品名称、品类、材质、场景、目标人群和渠道，生成小红书 / 抖音内容测款建议。
- 测款复盘模块根据浏览量、点赞数、收藏数、评论数、询单数、成交数和测款成本，计算互动率、询单率、转化率和单均测款成本。
- 市场证据模块基于用户填写的批发价、零售价、内容热度观察、竞品数量和同质化程度生成辅助判断，不伪造平台真实数据。

### 8.4 部署

- Vercel 作为主站部署平台，提供完整线上演示入口。
- 腾讯云 CloudBase 作为备用访问部署方案，提供静态网站托管和云函数能力。
- 通过环境变量 `VITE_ANALYZE_IMAGE_URL` 支持不同部署环境下切换图片识别接口。
- 前端构建产物不包含 API Key，服务端密钥通过 Vercel / CloudBase 环境变量管理。
- 备用访问链接主要用于在 Vercel 因网络环境无法正常打开时体验核心功能。

---

## 9. 项目结构

```text
tradepilot-ai-site
├── api/
│   ├── analyze-image.js
│   └── alibaba-price-search.js
│
├── docs/
│   └── Deployment-Entry.md
│
├── src/
│   ├── components/
│   │   ├── CoverCard.jsx
│   │   ├── OperateView.jsx
│   │   ├── ResultView.jsx
│   │   ├── HistoryView.jsx
│   │   ├── PKView.jsx
│   │   ├── ReviewView.jsx
│   │   ├── DemoView.jsx
│   │   ├── StorageModeSelector.jsx
│   │   ├── StorageStatusBadge.jsx
│   │   ├── SupabaseLoginPanel.jsx
│   │   └── charts/
│   │       ├── ProductPKRadarChart.jsx
│   │       ├── ProductPKBarChart.jsx
│   │       └── ReviewMetricChart.jsx
│   │
│   ├── constants/
│   │   ├── demoData.js
│   │   ├── uiContent.js
│   │   ├── productConfig.js
│   │   ├── contentTemplates.js
│   │   ├── alibabaPriceConfig.js
│   │   ├── douyinFallbackConfig.js
│   │   ├── manualMarketEvidenceConfig.js
│   │   └── imageQualityConfig.js
│   │
│   ├── services/
│   │   └── productStorage.js
│   │
│   ├── types/
│   │   ├── product.ts
│   │   ├── review.ts
│   │   └── report.ts
│   │
│   └── utils/
│       ├── reportUtils.js
│       ├── priceEvidenceUtils.js
│       ├── douyinFallbackUtils.js
│       ├── manualMarketEvidenceUtils.js
│       ├── alibabaPriceClient.js
│       ├── imageQualityUtils.js
│       ├── priceEvidenceUtils.test.js
│       ├── douyinFallbackUtils.test.js
│       └── manualMarketEvidenceUtils.test.js
│
├── App.jsx
├── main.jsx
├── index.html
├── index.css
├── supabaseClient.js
├── package.json
├── vite.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 10. 工程化优化

项目原始版本中，较多逻辑集中在 `App.jsx` 中。后续已进行多轮低风险拆分。

### 10.1 静态配置拆分

已拆分到 `src/constants/`，包括商品品类配置、商品身份识别词库、内容模板、抖音 fallback 配置、价格证据配置、人工市场证据配置和图片质量检测配置。

### 10.2 组件拆分

已拆分到 `src/components/`，包括操作页、结果页、产品库、候选产品 PK、测款复盘、演示页、存储模式选择、Supabase 登录面板和图表组件。

### 10.3 工具函数拆分

已拆分到 `src/utils/`，包括报告生成、价格证据分析、抖音 fallback、人工市场证据分析、图片质量检测和 Supabase 价格客户端。

---

## 11. TypeScript 基础接入

项目当前主体仍为 React JSX，以保证演示功能稳定。

同时项目已新增 TypeScript 基础配置：

```text
tsconfig.json
src/types/product.ts
src/types/review.ts
src/types/report.ts
```

并新增：

```bash
npm run typecheck
```

当前 TypeScript 用于定义核心数据结构，为后续逐步迁移分析函数、评分函数和报告生成函数做准备。

---

## 12. 自动化测试

项目已新增 Vitest 单元测试，用于降低后续重构和功能扩展带来的回归风险。

当前测试覆盖：

- 价格区间解析；
- 价格证据空 API 兜底；
- 竞品价格高风险判断；
- 抖音内容热度 fallback；
- 未调用真实抖音 API 的兜底说明；
- 人工市场证据完整度判断；
- 竞品数量风险；
- 内容同质化风险；
- evidence 合并时不破坏原字段；
- scoreAdjustment 范围限制。

运行测试：

```bash
npm run test
```

监听模式：

```bash
npm run test:watch
```

---

## 13. Supabase 配置

项目支持 Supabase 可选云端同步。

需要在 Vercel 环境变量中配置：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

注意：

- 必须使用 `VITE_` 前缀；
- `VITE_SUPABASE_ANON_KEY` 应使用 Supabase 的 anon public key / publishable key；
- 不要使用 service_role key；
- 配置后需要重新部署 Vercel。

### 13.1 Supabase 表结构

云端产品库使用表：

```text
public.tradepilot_product_records
```

建议 SQL：

```sql
create table if not exists public.tradepilot_product_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product jsonb,
  result jsonb,
  review jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tradepilot_product_records enable row level security;

drop policy if exists "Users can view own product records" on public.tradepilot_product_records;
drop policy if exists "Users can insert own product records" on public.tradepilot_product_records;
drop policy if exists "Users can update own product records" on public.tradepilot_product_records;
drop policy if exists "Users can delete own product records" on public.tradepilot_product_records;

create policy "Users can view own product records"
on public.tradepilot_product_records
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own product records"
on public.tradepilot_product_records
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own product records"
on public.tradepilot_product_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own product records"
on public.tradepilot_product_records
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists tradepilot_product_records_user_id_idx
on public.tradepilot_product_records(user_id);

create index if not exists tradepilot_product_records_updated_at_idx
on public.tradepilot_product_records(updated_at desc);
```

---

## 14. 环境变量

### 14.1 Supabase

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 14.2 阿里云百炼视觉模型

```text
DASHSCOPE_API_KEY=
```

具体变量名称需与当前 `api/analyze-image.js` 中读取方式保持一致。

### 14.3 备用图片识别接口

```text
VITE_ANALYZE_IMAGE_URL=
```

该变量可用于在不同部署环境下切换图片识别接口，例如 Vercel Serverless Function 或 CloudBase 云函数。

---

## 15. 本地运行

### 15.1 安装依赖

```bash
npm install
```

### 15.2 启动开发环境

```bash
npm run dev
```

### 15.3 构建项目

```bash
npm run build
```

### 15.4 预览构建结果

```bash
npm run preview
```

### 15.5 运行测试

```bash
npm run test
```

### 15.6 类型检查

```bash
npm run typecheck
```

---

## 16. 部署说明

当前项目入口为：

```text
index.html → main.jsx → App.jsx
```

项目不在入口层启用强制 AuthGate / LoginGate。

原因：

- 保证评委和游客可以快速进入系统；
- 保留游客模式；
- 避免登录门槛影响演示；
- Supabase 登录仅作为产品库云端同步能力，由用户主动选择启用。

Vercel 部署时，Production 分支为：

```text
main
```

---

## 17. 当前版本说明

当前版本为复赛演示版，重点保证评委可以快速体验完整功能流程。

为了降低体验门槛，线上版本默认开放游客模式。游客模式下无需注册登录，产品库数据暂存在本地浏览器中。

正式使用场景下，可以启用 Supabase Auth，实现用户注册登录、云端产品库保存和跨设备同步。国内网络环境下如 Supabase 访问不稳定，用户可以切换为“仅本地保存”模式继续体验。

---

## 18. 评分规则与可靠性说明

TradePilot AI 的评分结果属于进货前辅助判断，不是对销量的绝对预测。

系统会综合考虑：

- 利润空间；
- MOQ 风险；
- 渠道适配；
- 内容测款潜力；
- 供应商与物流风险；
- 市场证据完整度；
- 用户填写的人工调研信息。

### 18.1 风险等级说明

低风险通常表示：

- 利润空间较清晰；
- MOQ 可控；
- 价格证据较完整；
- 内容测款路径明确。

中风险通常表示：

- 部分证据缺失；
- 竞品价格不足；
- 内容热度不明确；
- 供应商信息有限。

高风险通常表示：

- MOQ 偏高；
- 利润空间不足；
- 竞品价格明显压制；
- 内容同质化严重；
- 供应商或物流风险较高。

### 18.2 “适合测款”的含义

“适合测款”不代表建议直接大量进货。

它通常表示：

- 可以先小批量拿样；
- 通过短视频、图文、社群等方式测试点击、收藏、询价和成交反馈；
- 根据测款复盘结果再决定是否补货。

---

## 19. 图片识别失败与降级机制

图片识别可能受到以下因素影响：

- 图片模糊；
- 商品被遮挡；
- 图片中出现多个商品；
- 背景复杂；
- 图片过大；
- 网络异常；
- 模型返回异常；
- 商品过于小众。

当图片识别失败时，系统不会中断流程。

用户仍然可以手动填写：

- 商品名称；
- 商品品类；
- 成本；
- 售价；
- MOQ；
- 材质；
- 渠道；
- 目标人群；
- 市场证据。

系统会基于用户填写的信息继续生成进货报告。

---

## 20. 当前限制

当前版本仍属于比赛原型，存在以下限制：

1. 抖音、淘宝、1688 等平台暂未真正接入完整开放 API；
2. 市场证据主要来自用户填写和搜索入口辅助；
3. 评分为启发式辅助判断，不代表真实销量预测；
4. 图片识别受图片质量和模型能力影响；
5. 国内网络环境下 Supabase 可能不稳定，因此默认保留本地模式；
6. PDF 报告采用浏览器打印方案，不直接生成后端 PDF 文件；
7. 云端同步需要正确配置 Supabase 环境变量和数据表结构。

---

## 21. 后续优化方向

后续可以继续优化：

- 接入正式授权的电商平台价格 API；
- 接入真实内容平台热度数据；
- 增强图片识别准确率，覆盖更多小商品品类；
- 将核心评分函数逐步迁移到 TypeScript；
- 增加更多评分规则单元测试；
- 增加更完整的 ErrorBoundary；
- 增加报告模板选择；
- 优化移动端体验；
- 增加多用户团队协作空间；
- 增加智能问答式“拿货搭子”助手；
- 增加供应商沟通模板和询价话术生成。

---

## 22. 项目亮点总结

- 面向真实进货决策痛点；
- 覆盖“看货—判断—测款—复盘”完整流程；
- 支持图片识别与手动填写双路径；
- 支持图片质量检测与识别失败降级；
- 支持市场证据补充，不伪造平台数据；
- 支持产品库、候选产品 PK 和测款复盘；
- 支持 HTML 与 PDF 报告导出；
- 支持候选产品 PK 和测款复盘数据可视化；
- 支持本地存储与 Supabase 云端同步；
- 已补充 TypeScript 基础、Vitest 测试和工程化拆分。

---

## 23. 一句话介绍

TradePilot AI｜拿货搭子，是一个帮助新手卖家在进货前完成商品识别、利润测算、风险判断、内容测款和复盘沉淀的 AI 进货决策智能体。
