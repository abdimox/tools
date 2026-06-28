# 乐活互动小红书 AI 运营工作台

一个面向乐活互动内部运营人员的一次性内容生成工作台。当前版本使用本地演示引擎，不需要 AI API Key，即可完整体验笔记生成、账号诊断、同行拆解、合规检查与封面制作。

## 功能

- 简单访问密码登录，无注册和用户数据库。
- 手作 DIY 与 Photobooth 两套独立内容逻辑。
- 从一句案例简述和活动图片生成 30 个标题、5 版正文、20 条封面文案、8–12 个标签。
- 分析图片顺序、裁剪、提亮和封面选择。
- 自动生成封面提示词，并从首张活动图制作 3:4 演示封面。
- 检查私信、微信、VX、报价、二维码、扫码等导流风险。
- 上传账号截图，输出定位建议与 14 天行动计划。
- 上传同行截图或文字，拆解爆款结构并分别改写成两条业务方向。
- 所有文字可复制，封面可下载。
- 无数据库、无历史记录，临时文件自动清理。

## 技术栈

- 前端：React、TypeScript、Vite、React Router、Lucide Icons、原生 CSS。
- 后端：Node.js、Express、TypeScript、Multer、Sharp。
- 测试：Vitest、Supertest。

## 本地启动

环境要求：Node.js 20.19+ 或 22.12+。

```bash
npm install
copy server\.env.example server\.env
npm run dev
```

PowerShell 用户如果受到脚本执行策略限制，可以使用：

```powershell
npm.cmd install
Copy-Item server/.env.example server/.env
npm.cmd run dev
```

启动后访问 [http://localhost:5173](http://localhost:5173)。默认演示密码为 `loho2026`；复制 `.env.example` 后，请使用其中配置的密码。

前端开发服务会将 `/api` 代理到 `http://localhost:3001`。

## 环境变量

在 `server/.env` 中配置：

```dotenv
APP_PASSWORD=change_this_password
AUTH_SECRET=change_this_to_a_long_random_string
PORT=3001
TEMP_FILE_EXPIRE_MINUTES=30
CLIENT_ORIGIN=http://localhost:5173
```

- `APP_PASSWORD`：同事访问工作台时输入的密码。
- `AUTH_SECRET`：用于签发访问令牌，应设置为独立的长随机字符串。
- `TEMP_FILE_EXPIRE_MINUTES`：生成封面的保留时间，默认 30 分钟。
- `CLIENT_ORIGIN`：允许访问 API 的前端地址，多个地址用逗号分隔。

## AI 接口配置

当前版本按用户选择采用完整演示模式。`server/.env.example` 已预留文本、图片理解与图片生成三类接口的 Key、Base URL 和模型字段，但演示 Provider 不读取它们。

后续接入真实 AI 时，实现 `server/src/aiProvider.ts` 中的 `AiProvider` 接口，并在 `server/src/app.ts` 中将 `DemoProvider` 替换为真实 Provider。API Key 只能放在后端 `.env`，不能写入前端或返回给浏览器。

## 构建与测试

```bash
npm run test
npm run build
```

生产构建会生成：

- `client/dist`：前端静态文件。
- `server/dist`：后端 JavaScript。

构建后可执行：

```bash
set NODE_ENV=production
npm start
```

生产模式由 Express 同时提供前端页面和 API，默认访问 `http://localhost:3001`。

## 图片与临时文件

- 上传图片临时写入 `server/temp-uploads`，请求处理结束后删除。
- 生成封面写入 `server/temp-outputs`，默认保留 30 分钟。
- 服务启动时清空两个临时目录。
- 定时清理任务会删除过期文件。
- 文件名随机生成，不使用用户原始文件名。

## 为什么不需要数据库

本工具是一次性生成工作台。结果只在当前页面展示，刷新后清空；用户自行复制内容和下载封面。登录令牌、文案结果和分析报告均不落库，因此无需 SQLite、MySQL 或其他数据库。

## 给同事使用

部署后将网址和访问密码提供给同事即可。所有人使用同一个内部访问密码，不需要注册。请控制访问范围，避免公开暴露，以免未来接入真实 AI 后产生非预期调用费用。

## 响应式适配

- 电脑端：左侧导航、右侧工作区；生成和分析页采用输入区与结果区双栏。
- 手机端：顶部菜单、单列卡片；按钮和上传区域按触屏尺寸优化。
- 建议使用现代版 Chrome、Edge、Safari 或 Firefox。

## 常见问题

### 密码错误

确认输入值与 `server/.env` 中的 `APP_PASSWORD` 完全一致，修改后需要重启后端。

### 图片上传失败

仅支持 JPG、PNG、WEBP；单张不超过 10MB；一次最多 12 张。

### 封面文件已过期

生成图片默认保留 30 分钟。过期后使用原活动图重新生成即可。

### 没有配置 AI Key，为什么仍可生成？

当前是演示模式，使用本地规则生成内容，方便先确认产品流程。页面和 API 均明确标注 `DEMO`。

### 是否会保存账号截图？

不会。截图只在请求期间临时保存，分析完成后立即删除。

云服务器部署方式见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
