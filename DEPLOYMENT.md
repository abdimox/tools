# GitHub Pages 部署

当前 GitHub 账号关闭了 Actions，因此使用 `gh-pages` 分支发布静态构建结果。

首次使用需要在 GitHub 仓库中完成一次设置：

1. 本地执行 `npm.cmd run build`。
2. 将 `client/dist` 内容发布到 `gh-pages` 分支。
3. 仓库 Pages 来源设置为 `gh-pages / (root)`。
4. 访问 `https://like84farm.github.io/rbht/`。

网页首次打开时：

1. 设置本机解锁密码。
2. 进入“设置”。
3. 填写 llmhub API Base URL、API Key 和模型名称。
4. 分别测试文字接口和图片接口。

GitHub Pages 仅托管静态前端。API 请求由浏览器直接发送到 llmhub，因此 API Key 只应保存在自己的设备上。
