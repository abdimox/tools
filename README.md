# 乐活互动小红书 AI 工作台

纯静态个人版，部署到 GitHub Pages。没有服务器和数据库。

## 功能

- Photobooth 与手作 DIY 两个业务入口
- 场景选择 → 生成选题 → 选择选题 → 生成并复核文案
- GPT 连续对话和图片输入
- 参考图封面生成
- 浏览器本地保存 API 配置、页面锁和聊天历史
- 聊天记录 JSON 导出与导入
- Obsidian Photobooth 运营知识库同步

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

生产构建：

```powershell
npm.cmd run build
```

## 同步知识库

Obsidian 是主库，项目中的 Markdown 是部署副本：

```powershell
npm.cmd run sync:knowledge
```

## 数据与安全

- API Key 存在浏览器 `localStorage`，不会写入仓库。
- 聊天记录存在浏览器 `IndexedDB`，清理浏览器数据会删除记录。
- 本地密码只是页面锁，不能替代服务端身份认证。
- 不要在公共电脑使用；清理浏览器前先导出聊天记录。
