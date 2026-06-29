# Cloudflare 多员工版实施计划

## 实施原则

- 先建立可测试的 Workers/D1/R2 后端，再接入前端页面。
- 每一步都保持类型检查与测试可运行。
- 不将密码、API Key、Cloudflare Token 或真实 D1/R2 标识提交到 Git。
- AI 自动测试全部使用模拟中转站。

## 任务 1：建立 Cloudflare 工程骨架

涉及文件：`package.json`、`wrangler.toml.example`、`functions/api/[[path]].ts`、`worker/package.json`、`worker/tsconfig.json`、`worker/src/env.ts`、`client/vite.config.ts`、`.gitignore`。

1. 新建 Worker 兼容的 TypeScript workspace，使用 Hono 组织 Pages Functions API。
2. 增加 Pages、D1、R2 绑定类型和本地 Wrangler 脚本。
3. 调整 Vite 开发代理，使前端开发服务器调用本地 Pages Functions。
4. 增加不含真实资源 ID 的 Wrangler 示例配置。
5. 验证 Worker 类型检查、前端构建和本地 Pages Functions 启动。

## 任务 2：D1 schema、密码登录和员工隔离

涉及文件：`migrations/0001_initial.sql`、`worker/src/crypto.ts`、`worker/src/db.ts`、`worker/src/auth.ts`、`worker/src/app.ts`、`worker/src/auth.test.ts`。

1. 创建用户、会话、对话、消息、附件和 AI 配置表及索引。
2. 使用 Web Crypto 实现密码 lookup、PBKDF2 验证、会话 token 哈希和安全 cookie。
3. 实现引导管理员、登录、退出、当前用户和管理员员工管理 API。
4. 所有对话和文件读取均绑定当前用户 ID。
5. 测试密码错误、停用、过期、普通员工越权和跨用户资源读取。

## 任务 3：迁移 AI 配置与中转站 Provider

涉及文件：`worker/src/ai-config.ts`、`worker/src/llmhub.ts`、`worker/src/types.ts`、`worker/src/ai-config.test.ts`、`worker/src/llmhub.test.ts`。

1. 使用 AES-GCM 加密两个 API Key 后写入 D1。
2. 实现环境变量覆盖、脱敏状态、留空保留旧 Key及两个独立测试接口。
3. 将 OpenAI 兼容文字、视觉和图片调用迁移为 Workers Web API 实现。
4. 保留鉴权失败、模型不存在、超时和非法响应的明确错误。
5. 测试文字 Key 与图片 Key 不混用。

## 任务 4：优化小红书生成质量

涉及文件：`worker/src/prompts.ts`、`worker/src/content.ts`、`worker/src/content.test.ts`、`client/src/pages/NoteGenerator.tsx`。

1. 写入 DIY 5 场景和 Photobooth 4 场景的决策人、动机、点击原因矩阵。
2. 初稿提示词先形成受众策略，再生成 3 个差异化标题和正文。
3. 终审提示词执行事实、业务隔离、标题正文一致、合规和 humanizer 检查。
4. 服务端验证严格 3 标题、1 正文、8–12 话题并把话题放到正文末尾。
5. 前端只展示最终结果，删除多余的内部检查堆叠。

## 任务 5：GPT 对话、D1 历史和 R2 图片

涉及文件：`worker/src/chat.ts`、`worker/src/files.ts`、`worker/src/chat.test.ts`、`client/src/pages/Chat.tsx`、`client/src/api.ts`、`client/src/types.ts`、`client/src/styles.css`。

1. 实现对话新建、列表、读取、重命名和删除。
2. 实现单条消息最多 4 张图片的校验和私有 R2 保存。
3. 组装当前对话上下文调用文字模型；优先流式，失败时回退完整响应。
4. 成功后保存助手消息，失败时保留用户消息和错误状态。
5. 建立桌面双栏、移动抽屉、自动保存、图片预览和发送状态。
6. 测试刷新后历史存在、用户隔离、附件鉴权和删除清理。

## 任务 6：最简封面图

涉及文件：`worker/src/cover.ts`、`worker/src/cover.test.ts`、`client/src/pages/CoverStudio.tsx`、`client/src/types.ts`、`client/src/styles.css`。

1. 删除提示词生成、原图分析、场景、评分、封面文字和 Sharp 排版流程。
2. 新接口只接收提示词和一张参考图，并只使用图片 Key 调用 `gpt-image-2`。
3. 结果写入 R2 临时路径，返回鉴权下载地址。
4. 页面只保留提示词、上传、生成、预览和保存。
5. 测试未填提示词、未上传图片、错误类型、图片 Key 路由和结果读取。

## 任务 7：前端认证、导航和管理员设置

涉及文件：`client/src/App.tsx`、`client/src/api.ts`、`client/src/pages/Login.tsx`、`client/src/pages/Settings.tsx`、`client/src/components/AppLayout.tsx`、`client/src/styles.css`。

1. 从 sessionStorage Bearer token 改为 HttpOnly Cookie 和 `/api/auth/me`。
2. 显示当前员工名称，普通员工隐藏设置导航。
3. 在生成笔记后插入 GPT 对话导航。
4. 设置页合并员工管理与文字/图片接口配置，不再二次输入管理员密码。
5. 更新所有“不保存历史”文案为“每位员工的对话独立保存”。

## 任务 8：部署、文档与整体验证

涉及文件：`.github/workflows/deploy-cloudflare.yml`、`wrangler.toml.example`、`README.md`、`DEPLOYMENT.md`、`.dev.vars.example`。

1. GitHub Actions 在主分支执行安装、测试、构建、D1 migration 和 Pages 发布。
2. 文档说明 Cloudflare 项目、D1、R2、Secrets、GitHub Secrets 和首次管理员创建。
3. 记录 R2 24 小时生命周期配置命令。
4. 运行全量测试、类型检查、生产构建和 Wrangler dry run。
5. 本地浏览器回归登录、员工隔离、笔记、聊天、封面和设置。
6. GitHub/Cloudflare 账号连接完成后执行线上冒烟测试。

## 完成门槛

- 所有自动测试通过，且不读取真实 API Key。
- 前端和 Worker 类型检查通过。
- 生产构建与 Wrangler 部署配置验证通过。
- 两名测试员工的对话和图片无法互相读取。
- 封面页没有已删除的分析和提示词生成功能。
- 生成笔记稳定返回 3 个标题与 1 篇话题内联正文。
- 部署文档可以由未参与开发的人逐步执行。
