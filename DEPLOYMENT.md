# GitHub Pages 部署

项目已配置 `.github/workflows/deploy-pages.yml`。推送到 `master` 或 `main` 后自动构建和部署。

首次使用需要在 GitHub 仓库中完成一次设置：

1. 打开仓库 `Settings → Pages`。
2. `Build and deployment → Source` 选择 `GitHub Actions`。
3. 打开 `Actions`，等待 `Deploy GitHub Pages` 完成。
4. 访问 Actions 输出的 Pages 地址。

网页首次打开时：

1. 设置本机解锁密码。
2. 进入“设置”。
3. 填写 llmhub API Base URL、API Key 和模型名称。
4. 分别测试文字接口和图片接口。

GitHub Pages 仅托管静态前端。API 请求由浏览器直接发送到 llmhub，因此 API Key 只应保存在自己的设备上。
