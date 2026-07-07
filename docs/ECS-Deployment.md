# TradePilot AI 国内 ECS 独立部署

本文档用于在国内 Ubuntu ECS 上独立部署 TradePilot AI，保留现有 Vercel 部署能力，同时让用户扫码后直接访问：

```bash
http://ECS公网IP:3000
```

目标结构：

- Nginx 对外监听 `3000`。
- Node.js 后端只监听 `127.0.0.1:3001`。
- Nginx 将 `/api/` 反向代理到 `127.0.0.1:3001`。
- 前端调用同源相对路径 `/api/analyze-image` 和 `/api/generate-ai-insight`。
- `DASHSCOPE_API_KEY` 只放在服务端环境变量中，不使用任何 `VITE_` 前缀。

## 1. 安全组

比赛方 ECS 禁止使用 `80`、`443`、`8080`、`8443`，因此安全组只开放：

| 协议 | 端口 | 来源 |
| --- | --- | --- |
| TCP | 3000 | 需要访问的用户 IP 段，或比赛要求的来源 |

不要在安全组开放 `3001`。Node.js 只绑定 `127.0.0.1:3001`，只能被本机 Nginx 访问。

## 2. 安装 Node.js、Nginx、PM2

以下命令以 Ubuntu 为例：

```bash
sudo apt update
sudo apt install -y curl ca-certificates nginx git

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v

sudo npm install -g pm2
pm2 -v
nginx -v
```

建议使用 Node.js `22+`，因为后端依赖 Node 原生 `fetch`。如果服务器已有 Node.js，请确认版本至少为 `18+`。

## 3. 上传或拉取代码

示例部署目录：

```bash
sudo mkdir -p /opt/tradepilot-ai
sudo chown -R "$USER":"$USER" /opt/tradepilot-ai
cd /opt/tradepilot-ai
```

可以用 `git clone`、`scp`、`rsync` 或运维平台上传代码。部署目录应包含项目源码、`server.js`、`ecosystem.config.cjs` 和 `docs/ECS-Deployment.md`。

安装依赖：

```bash
cd /opt/tradepilot-ai
npm install
```

## 4. 配置前端 ECS 构建变量

ECS 构建时只配置前端需要公开的同源 API 路径：

```bash
export VITE_ANALYZE_IMAGE_URL=/api/analyze-image
export VITE_AI_INSIGHT_URL=/api/generate-ai-insight
npm run build
```

也可以创建 `.env.production.local`：

```bash
VITE_ANALYZE_IMAGE_URL=/api/analyze-image
VITE_AI_INSIGHT_URL=/api/generate-ai-insight
```

不要把 `DASHSCOPE_API_KEY`、`DASHSCOPE_AGENT_MODEL`、`DASHSCOPE_TEXT_MODEL`、`DASHSCOPE_TEXT_ENDPOINT`、`QWEN_VL_MODEL` 写成 `VITE_` 变量。`VITE_` 变量会进入前端构建产物。

## 5. 配置服务端环境变量

推荐在部署目录创建未提交的 `.env.ecs`：

```bash
cd /opt/tradepilot-ai
cat > .env.ecs <<'EOF'
DASHSCOPE_API_KEY=替换为你的服务端密钥
DASHSCOPE_AGENT_MODEL=qwen3.6-plus
DASHSCOPE_TEXT_MODEL=qwen-plus
DASHSCOPE_TEXT_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
QWEN_VL_MODEL=qwen3.6-plus
EOF

chmod 600 .env.ecs
```

`ecosystem.config.cjs` 会在 PM2 启动时读取 `.env.ecs`。也可以不用 `.env.ecs`，改为在服务器环境中直接导出这些变量：

```bash
export DASHSCOPE_API_KEY=替换为你的服务端密钥
export DASHSCOPE_AGENT_MODEL=qwen3.6-plus
export DASHSCOPE_TEXT_MODEL=qwen-plus
export DASHSCOPE_TEXT_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
export QWEN_VL_MODEL=qwen3.6-plus
```

项目中提供 `.env.ecs.example` 作为模板。真实 `.env.ecs` 包含服务端密钥，不要提交、不要放进前端构建产物，也不要复制到公开交付目录。

## 6. 启动 Node.js 后端

后端入口是 `server.js`，只监听 `127.0.0.1:3001`：

```bash
cd /opt/tradepilot-ai
pm2 start ecosystem.config.cjs
pm2 status
curl http://127.0.0.1:3001/health
```

健康检查应返回类似：

```json
{"ok":true,"service":"tradepilot-ecs-api","listen":"127.0.0.1:3001"}
```

配置 PM2 开机恢复：

```bash
pm2 startup systemd
```

按命令输出复制并执行那一行 `sudo env PATH=... pm2 startup systemd ...`，然后：

```bash
pm2 save
```

## 7. 配置 Nginx 监听 3000

创建 Nginx 配置：

```bash
sudo tee /etc/nginx/sites-available/tradepilot-ai.conf >/dev/null <<'EOF'
server {
    listen 3000;
    server_name _;

    root /opt/tradepilot-ai/dist;
    index index.html;

    client_max_body_size 25m;

    location = /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

启用配置：

```bash
sudo ln -sf /etc/nginx/sites-available/tradepilot-ai.conf /etc/nginx/sites-enabled/tradepilot-ai.conf
sudo nginx -t
sudo systemctl reload nginx
```

验证：

```bash
curl http://127.0.0.1:3000/health
curl http://ECS公网IP:3000/health
```

浏览器打开：

```bash
http://ECS公网IP:3000
```

## 8. 更新代码

在部署目录更新源码后重新安装、构建并重启：

```bash
cd /opt/tradepilot-ai
git pull
npm install

export VITE_ANALYZE_IMAGE_URL=/api/analyze-image
export VITE_AI_INSIGHT_URL=/api/generate-ai-insight
npm run build

pm2 reload tradepilot-ecs-api
sudo nginx -t
sudo systemctl reload nginx
```

如果不是 git 部署，可以先备份当前目录，再用 `rsync` 或运维平台覆盖源码，之后执行同样的 `npm install`、`npm run build`、`pm2 reload`。

## 9. 备份

建议至少备份：

- 项目源码。
- `.env.ecs`，注意它包含服务端密钥，备份文件也必须限制权限。
- Nginx 配置 `/etc/nginx/sites-available/tradepilot-ai.conf`。
- PM2 进程列表：`~/.pm2/dump.pm2`。
- 如果使用 Supabase 云端存储，按 Supabase 项目策略单独备份；游客模式和本地模式数据在用户浏览器 localStorage 中，不在 ECS 服务器集中保存。

示例：

```bash
sudo mkdir -p /opt/backups
sudo tar --exclude=node_modules --exclude=dist -czf /opt/backups/tradepilot-ai-$(date +%F).tar.gz /opt/tradepilot-ai
sudo cp /etc/nginx/sites-available/tradepilot-ai.conf /opt/backups/tradepilot-ai-nginx-$(date +%F).conf
```

## 10. Vercel 兼容说明

现有 Vercel API 文件仍保留在 `api/` 目录，Vercel 部署继续使用原有 serverless 入口。ECS 只新增 `server.js` 作为 Node.js 适配层，复用：

- `api/analyze-image.js`
- `api/generate-ai-insight.js`

前端默认已经使用同源 API 路径；ECS 构建时明确设置：

```bash
VITE_ANALYZE_IMAGE_URL=/api/analyze-image
VITE_AI_INSIGHT_URL=/api/generate-ai-insight
```

这样游客模式、手动填写、示例数据、报告、产品库、PK、复盘和导出都继续在前端本地运行；图片识别和 AI Insight 在 ECS 上经 `/api/` 同源反向代理调用 Node.js 后端。
