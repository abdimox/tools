# GitHub + Cloudflare 免费部署

本项目使用 Cloudflare Pages Functions、D1 和 R2，不需要购买服务器或域名。

## 1. 准备账号

需要：

- 一个 GitHub 仓库。
- 一个 Cloudflare 账号。
- llmhub 的文字 API Key 和图片 API Key。

不要把任何 Key、员工密码或 Cloudflare Token 写入 GitHub 文件。

## 2. 创建 Cloudflare 资源

安装依赖并登录 Wrangler：

```bash
npm ci
npx wrangler login
```

创建 D1：

```bash
npx wrangler d1 create loho-xhs-workbench
```

记录输出中的 `database_id`，稍后存入 GitHub Secret `CLOUDFLARE_D1_DATABASE_ID`。

创建私有 R2 桶：

```bash
npx wrangler r2 bucket create loho-xhs-workbench-files
```

在 Cloudflare Pages 中创建项目 `loho-xhs-ai-workbench`，生产分支选择当前仓库的 `master` 或 `main`。项目可以先不连接自动构建，GitHub Actions 会负责发布。

## 3. 配置 Pages Secrets

在 Cloudflare 控制台打开 Pages 项目：Settings → Variables and Secrets，添加生产环境秘密：

```text
AUTH_PEPPER=<至少32位随机字符串>
CONFIG_ENCRYPTION_KEY=<另一条至少32位随机字符串>
BOOTSTRAP_ADMIN_PASSWORD=<第一次登录使用的管理员密码，至少8位>
```

`AUTH_PEPPER` 和 `CONFIG_ENCRYPTION_KEY` 一旦正式使用不要随意修改，否则现有密码查找或接口配置会失效。

可选环境变量：

```text
ALLOWED_AI_HOSTS=llmhub.ltd
```

文字和图片 API Key 建议在部署后的管理员设置页填写。这样两个 Key 会分别加密保存到 D1，不需要放入 GitHub。

## 4. 创建 Cloudflare API Token

在 Cloudflare 用户设置中创建 API Token，至少允许：

- Account / Cloudflare Pages / Edit
- Account / D1 / Edit
- Account / Workers R2 Storage / Edit

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_D1_DATABASE_ID
```

## 5. 推送并自动部署

推送到 `master` 或 `main` 后，`.github/workflows/deploy-cloudflare.yml` 会依次执行：

1. `npm ci`
2. 全部测试
3. 前端和 Worker 类型检查、构建
4. D1 migration
5. Cloudflare Pages 发布

成功后访问：

```text
https://loho-xhs-ai-workbench.pages.dev
```

## 6. 第一次登录

1. 使用 `BOOTSTRAP_ADMIN_PASSWORD` 登录。
2. 第一次成功登录会在 D1 创建管理员；之后引导密码不再直接代表额外账号。
3. 打开“设置”，添加每位员工的姓名和独立密码。
4. 在同一页面填写文字 API Key、图片 API Key。
5. 分别测试两个接口，成功后保存。

## 7. R2 临时封面清理

在 R2 桶的 Lifecycle Rules 中增加规则：

- 前缀：`cover-output/`
- 动作：对象创建 1 天后删除

聊天图片使用 `chat/` 前缀，不设置自动过期；删除对话时程序会同步删除对应图片。

## 8. 本地回归

```powershell
Copy-Item wrangler.toml.example wrangler.toml
# 将 wrangler.toml 中的 database_id 改为 local-development 即可用于纯本地测试
Copy-Item .dev.vars.example .dev.vars
npm.cmd run db:local
npm.cmd run dev
```

本地 Pages Functions 为 `http://127.0.0.1:8788`，Vite 页面为 `http://localhost:5173`。

## 常见问题

### 登录提示 Secret 未配置

检查 Pages 项目的 `AUTH_PEPPER`、`CONFIG_ENCRYPTION_KEY` 和 `BOOTSTRAP_ADMIN_PASSWORD`，修改后重新部署。

### D1 提示表不存在

检查 GitHub Actions 的 D1 migration 步骤，以及 `CLOUDFLARE_D1_DATABASE_ID` 是否对应正式数据库。

### 中转站鉴权失败

根据错误确认是文字 Key 还是图片 Key；两个 Key 不会互相回退或替代。

### 图片看不到

R2 桶保持私有。图片必须通过已登录的 `/api/files/*` 接口读取，不要开启公开桶地址。
