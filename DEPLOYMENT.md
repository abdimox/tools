# GitHub + Cloudflare 免费部署

本项目使用 Cloudflare Workers、Static Assets 和 D1。无需启用 R2，不需要银行卡、服务器或域名。

## 1. 准备

需要 GitHub 账号、Cloudflare 账号，以及 llmhub 的文字和图片 API Key。任何 Key、员工密码或 Cloudflare Token 都不能提交到 GitHub。

```bash
npm ci
npx wrangler login
npx wrangler d1 create loho-xhs-workbench
```

将输出的 `database_id` 写入本地 `wrangler.toml`，并保存为 GitHub Secret `CLOUDFLARE_D1_DATABASE_ID`。

## 2. 首次手动部署

```powershell
Copy-Item wrangler.toml.example wrangler.toml
# 把 wrangler.toml 中的 REPLACE_WITH_D1_DATABASE_ID 替换为真实 D1 ID
npm.cmd run build
npx.cmd wrangler d1 migrations apply DB --remote
npx.cmd wrangler secret put AUTH_PEPPER
npx.cmd wrangler secret put CONFIG_ENCRYPTION_KEY
npx.cmd wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
npx.cmd wrangler deploy
```

前两个 Secret 使用不同的至少 32 位随机字符串。管理员初始密码至少 8 位。正式使用后不要修改 `AUTH_PEPPER` 或 `CONFIG_ENCRYPTION_KEY`，否则已有密码查找或接口配置会失效。

部署完成后的地址类似：

```text
https://loho-xhs-ai-workbench.<你的子域>.workers.dev
```

## 3. GitHub 自动部署

在 Cloudflare 创建一个 API Token，权限至少包含：

- Account / Workers Scripts / Edit
- Account / D1 / Edit

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_D1_DATABASE_ID
```

推送到 `master` 或 `main` 后，GitHub Actions 会测试、构建、执行 D1 migration，并发布 Worker 和前端静态资源。

## 4. 第一次登录

1. 使用 `BOOTSTRAP_ADMIN_PASSWORD` 登录，系统会创建唯一管理员。
2. 在“设置”中为每位员工创建独立密码。
3. 分别填写文字 API Key 和图片 API Key，并单独测试后保存。

## 5. 图片保存方式

- 聊天图片在浏览器端自动压缩到约 1.2 MB 以内，再保存到 D1；只有所属员工登录后才能读取。
- 删除对话会同时删除其中的图片。
- 封面参考图和生成结果不保存到云端。生成成功后应直接点击“保存图片”。
- D1 免费容量适合几位内部员工日常使用，但不要把它当作长期图片素材库。

## 6. 本地运行

```powershell
Copy-Item wrangler.toml.example wrangler.toml
# 纯本地测试可把 database_id 改为 local-development
Copy-Item .dev.vars.example .dev.vars
npm.cmd run db:local
npm.cmd run dev
```

Worker API 为 `http://127.0.0.1:8788`，Vite 页面为 `http://localhost:5173`。

## 常见问题

### 登录提示 Secret 未配置

使用 `wrangler secret list` 检查三个 Secret，补充后重新部署。

### D1 提示表不存在

执行 `npx wrangler d1 migrations apply DB --remote`，并确认 `wrangler.toml` 指向正确数据库。

### 中转站鉴权失败

根据错误确认是文字 Key 还是图片 Key。两个 Key 独立保存，不会互相替代。

### 聊天图片上传失败

优先使用正常的 JPG、PNG 或 WEBP。浏览器会自动压缩；压缩后仍超过上限时需换一张尺寸较小的图片。

### `workers.dev` 在大陆网络打不开

这通常是免费域名的 DNS 或网络可达性问题，不是 Worker 部署失败。稳定的做法是购买一个可用国内支付方式结算的普通域名，再绑定到当前 Worker；不需要购买服务器。也可以把 Vercel 作为静态页面和 API 反向代理入口，但必须遵守其账号与用途规则。
