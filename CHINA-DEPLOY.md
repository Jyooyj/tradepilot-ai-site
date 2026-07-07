# TradePilot AI 国内备用部署说明

本文档用于把当前 TradePilot AI 项目部署为国内可访问的 CloudBase 备用入口。该方案不替换现有 Vercel 正式站，只为比赛互评提供一个国内访问链路。

## 部署目标

- 前端继续使用 React + Vite + Tailwind 构建静态站点。
- 静态资源上传到腾讯云 CloudBase 静态网站托管。
- 图片识别接口使用 CloudBase 云函数 `analyzeImage` 转发到阿里云百炼 DashScope compatible-mode。
- 前端通过 `VITE_ANALYZE_IMAGE_URL` 切换图片识别接口地址。
- 游客模式、`localStorage` 产品库、产品 PK、测款复盘和下载 HTML 报告保持不变。

## 一、部署 CloudBase 云函数

1. 在腾讯云 CloudBase 控制台创建或进入已有环境。
2. 进入「云函数」，新建函数：
   - 函数名称：`analyzeImage`
   - 运行环境：Node.js 18 或更高版本
   - 触发方式：HTTP 访问服务 / HTTP 触发器
3. 上传本项目目录：
   - `cloudfunctions/analyzeImage/index.js`
4. 不需要安装额外 npm 依赖，函数使用 Node 18+ 原生 `fetch`。

## 二、配置云函数环境变量

在 CloudBase 云函数 `analyzeImage` 的环境变量中配置：

| 变量名 | 说明 |
|---|---|
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key。只放在云函数环境变量中，不要写入前端代码。 |
| `QWEN_VL_MODEL` | 视觉模型名称。可不填，默认使用 `qwen3.6-plus`。 |

部署后复制云函数 HTTP 访问地址，后续用于前端变量 `VITE_ANALYZE_IMAGE_URL`。

## 三、配置前端环境变量

国内 CloudBase 版本构建前，在本地或 CloudBase 构建环境中配置：

```bash
VITE_ANALYZE_IMAGE_URL=https://你的-cloudbase-云函数-http-地址
```

说明：

- Vercel 正式站不配置该变量时，仍默认请求 `/api/analyze-image`。
- 国内备用入口配置后，请求会走 CloudBase 云函数。
- 不要把 `DASHSCOPE_API_KEY` 写进 `.env` 前端变量，也不要提交到 GitHub。

## 四、构建前端

在项目根目录运行：

```bash
npm run build
```

构建产物位于：

```bash
dist
```

## 五、上传到 CloudBase 静态网站托管

1. 进入 CloudBase 控制台。
2. 打开「静态网站托管」。
3. 上传 `dist` 目录内的所有文件。
4. 等待部署完成，打开 CloudBase 分配的静态访问域名。

注意：不要把 `dist` 目录提交到 GitHub。它只作为部署产物上传到 CloudBase。

## 六、测试清单

部署后建议逐项检查：

- 首页游客演示模式是否可进入。
- 上传图片识别是否能调用 CloudBase 云函数。
- 手动填写产品信息是否能生成报告。
- 保存到我的产品库是否正常。
- 产品库搜索、筛选、排序是否正常。
- 候选产品 PK 是否正常。
- 测款复盘是否正常。
- 下载 HTML 可视化报告是否正常。
- 右下角反馈入口是否能打开问卷星链接。

## 七、安全提醒

- `DASHSCOPE_API_KEY` 只配置在 CloudBase 云函数环境变量中。
- 前端只配置云函数 HTTP 地址，不保存 API Key。
- 不要提交 `dist`、`node_modules`、日志文件或任何本地密钥文件。
- 不要删除或改坏现有 `api/analyze-image.js`，以保持 Vercel 正式站兼容。
