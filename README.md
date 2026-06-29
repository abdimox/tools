# 乐活互动小红书 AI 运营工作台

供乐活互动内部员工使用的在线 AI 工作台。代码保存在 GitHub，并部署到 Cloudflare Pages Functions；员工账号、个人对话和图片分别保存在 D1 与 R2。

## 功能

### 生成小红书笔记

- 手作 DIY：企业、商场、楼盘、社区、4S 店。
- Photobooth：婚礼、企业活动、宝宝宴、聚会。
- 按场景识别真正的决策人、客户动机和标题点击理由。
- 使用两次 `gpt-5.5` 调用完成策略初稿和事实/Humanizer/合规终审。
- 每次严格输出 3 个标题和 1 篇正文，8–12 个话题直接放在正文末尾。

### GPT 对话

- 每位员工使用独立密码，历史对话互相不可见。
- 支持新建、重命名、删除和自动保存。
- 支持连续上下文和每条消息最多 4 张图片。
- 使用后台配置的文字 API Key 和 `gpt-5.5`。

### 封面图制作

- 只保留提示词文本框、单张参考图上传、生成和保存。
- 不分析原图，不生成提示词，不提供评分或封面文字候选。
- 只调用图片 API Key 和 `gpt-image-2`。

### 账号与同行分析

- 读取真实截图，区分事实、推断和未知项。
- 账号诊断附证据与优先级；同行分析从目标客户点击原因出发。

### 管理员设置

- 添加、停用员工和重置员工密码。
- 分别配置、测试文字 API Key 和图片 API Key。
- 员工密码使用不可逆哈希；API Key 经 AES-GCM 加密后保存到 D1。

## 技术栈

- 前端：React、TypeScript、Vite、React Router。
- API：Cloudflare Pages Functions、Hono、Web Crypto。
- 数据：Cloudflare D1。
- 图片：Cloudflare R2 私有桶。
- AI：兼容 OpenAI `/chat/completions`、`/models`、`/images/edits` 的 `llmhub.ltd` 中转站。
- 测试：Vitest、现有 Express 回归测试、Wrangler 本地运行。

## 本地启动

要求 Node.js 22。

```powershell
npm.cmd install
Copy-Item wrangler.toml.example wrangler.toml
Copy-Item .dev.vars.example .dev.vars
npm.cmd run db:local
npm.cmd run dev
```

访问 [http://localhost:5173](http://localhost:5173)。本地示例管理员密码来自 `.dev.vars` 的 `BOOTSTRAP_ADMIN_PASSWORD`。

`.dev.vars`、`wrangler.toml`、D1/R2 本地状态和任何真实 Key 都已从 Git 排除。

## 验证

```powershell
npm.cmd test
npm.cmd run build
```

自动测试使用模拟中转站，不读取真实 API Key，也不会产生模型费用。

## 部署

完整步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。部署完成后使用 Cloudflare 自动分配的 `pages.dev` 地址，不需要购买服务器或域名。
