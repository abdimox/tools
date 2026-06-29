# 乐活互动小红书 AI 运营工作台

面向乐活互动内部运营人员的真实 AI 工作台。系统通过 `llmhub.ltd` 中转站调用 `gpt-5.5` 与 `gpt-image-2`，用于生成和复核小红书文案、制作封面、分析账号截图及拆解同行内容。

本版本不再使用本地模板冒充 AI。接口未配置或调用失败时会明确报错。

## 功能

### 生成小红书笔记

- 手作 DIY 与 Photobooth 严格分开。
- 场景必须由用户明确选择，AI 不自行猜测。
- 手作 DIY：企业、商场、楼盘、社区、4S 店。
- Photobooth：婚礼、企业活动、宝宝宴、聚会。
- 文案生成不需要上传图片。
- 每次只输出 3 个精选标题、1 篇正文和正文末尾的 8–12 个话题。
- 使用两次 `gpt-5.5` 调用：第一次生成，第二次执行 Humanizer、事实、业务隔离和合规复核。

### 封面图制作

- 与文案生成功能完全独立。
- 上传 1–12 张活动原图。
- `gpt-5.5` 分析图片、选择首图、生成 3 条封面大字和可编辑提示词。
- `gpt-image-2` 根据选中原图和提示词编辑画面。
- 服务端使用 Sharp 准确叠加中文标题，避免图片模型生成错字。
- 最终封面为 3:4 竖图，支持预览、重新生成和下载。

### 账号与同行分析

- 使用 `gpt-5.5` 读取真实截图。
- 每条账号诊断包含截图依据、置信度和优先级。
- 同行分析区分事实与推断，证据不足时明确显示“信息不足”。
- 不再返回固定模板分析。

### 接口配置

- 管理员在网页中配置中转站地址、API Key 和模型。
- 支持模型列表、鉴权和最小文本调用测试。
- API Key 使用 AES-256-GCM 加密后保存在服务器本地文件。
- 浏览器只显示密钥掩码，无法读取完整 Key。
- 不需要数据库。

## 技术栈

- 前端：React、TypeScript、Vite、React Router、Lucide Icons、原生 CSS。
- 后端：Node.js、Express、TypeScript、Multer、Sharp。
- 测试：Vitest、Supertest。
- AI 协议：OpenAI 兼容 `/models`、`/chat/completions` 和 `/images/edits`。

## 本地启动

环境要求：Node.js 20.19+ 或 22.12+。

```powershell
npm.cmd install
Copy-Item server/.env.example server/.env
npm.cmd run dev
```

访问 [http://localhost:5173](http://localhost:5173)。

开发默认密码：

- 工作台访问密码：`loho2026`
- 接口配置管理员密码：`admin2026`

如果复制了 `.env.example`，则使用文件中配置的新密码。

## 第一次配置 llmhub

1. 使用工作台密码登录。
2. 打开左侧“接口配置”。
3. 输入管理员密码。
4. 保持 Base URL 为 `https://llmhub.ltd/v1`。
5. 填入中转站 API Key。
6. 文字与视觉模型填写 `gpt-5.5`。
7. 图片模型填写 `gpt-image-2`。
8. 点击“测试连接”。
9. 测试成功后点击“加密保存”。

不要把 API Key 发到聊天、截图、Git 或前端代码中。

## 环境变量

生产环境必须修改：

```dotenv
APP_PASSWORD=change_this_password
ADMIN_PASSWORD=change_this_admin_password
AUTH_SECRET=change_this_to_a_long_random_string
CONFIG_ENCRYPTION_KEY=change_this_to_another_long_random_string
PORT=3001
TEMP_FILE_EXPIRE_MINUTES=30
CLIENT_ORIGIN=http://localhost:5173
```

- `APP_PASSWORD`：同事进入工作台的密码。
- `ADMIN_PASSWORD`：解锁接口配置页的独立密码。
- `AUTH_SECRET`：签发登录令牌。
- `CONFIG_ENCRYPTION_KEY`：加密网页中保存的 AI 配置。修改后旧配置将无法解密。

### 使用环境变量直接配置 AI

云服务器也可以跳过网页保存，直接设置：

```dotenv
AI_API_BASE_URL=https://llmhub.ltd/v1
AI_API_KEY=your_key
AI_TEXT_MODEL=gpt-5.5
AI_IMAGE_MODEL=gpt-image-2
AI_REQUEST_TIMEOUT_MS=120000
ALLOWED_AI_HOSTS=llmhub.ltd
```

环境变量优先于网页保存的加密配置。使用环境变量时，设置页只显示状态，不能覆盖。

## 配置文件位置

网页保存的 AI 配置位于：

```text
server/config/ai-config.enc.json
```

文件内容已加密，并被 `.gitignore` 排除。业务文案、截图和分析结果不会保存。

## 图片与临时文件

- 上传文件写入 `server/temp-uploads`，请求结束后删除。
- 生成封面写入 `server/temp-outputs`，默认保留 30 分钟。
- 服务启动时清空临时目录。
- 定时任务删除过期输出。

## 测试与构建

```powershell
npm.cmd run test
npm.cmd run build
```

自动测试使用本地模拟中转站，不读取真实 Key、不产生调用费用。

生产启动：

```powershell
$env:NODE_ENV='production'
npm.cmd start
```

访问 [http://localhost:3001](http://localhost:3001)。

## 常见问题

### 提示“尚未配置真实 AI 接口”

进入“接口配置”，填写 llmhub Key，测试成功后保存。

### 中转站鉴权失败

检查 Key 是否完整、是否已启用以及是否有可用额度。不要在 Base URL 后重复添加 `/v1/v1`。

### 模型不存在

在中转站模型列表确认实际模型字符串，并在设置页修改。默认值是 `gpt-5.5` 和 `gpt-image-2`。

### 图片生成很慢

复杂图片编辑可能需要较长时间。默认超时是 120 秒，可在设置中提高到最多 300 秒。

### 为什么图片和文案分开？

文案只需要业务、场景和案例简介。图片只用于首图分析与封面制作，分开后不会为了写文案强制上传素材。

### 是否会返回演示模板？

不会。真实接口不可用时系统直接报错并保留浏览器输入。

云服务器部署见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
