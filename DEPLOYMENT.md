# 云服务器部署

适用于 Ubuntu/Debian 轻量云服务器，推荐 Node.js 20.19+ 或 22.12+、PM2、Nginx 与 HTTPS。

## 1. 安装并构建

```bash
git clone <repository-url> xhs-ai-workbench
cd xhs-ai-workbench
npm ci
cp server/.env.example server/.env
nano server/.env
npm run test
npm run build
```

务必修改 `APP_PASSWORD`、`ADMIN_PASSWORD`、`AUTH_SECRET` 与 `CONFIG_ENCRYPTION_KEY`。生产环境可将 `CLIENT_ORIGIN` 设置为正式域名。

AI 接口可以在部署后的管理员设置页配置，也可以直接在 `.env` 中设置 `AI_API_BASE_URL`、`AI_API_KEY`、`AI_TEXT_MODEL` 与 `AI_IMAGE_MODEL`。环境变量优先于网页保存配置。

## 2. 使用 PM2 运行

```bash
npm install -g pm2
NODE_ENV=production pm2 start server/dist/server.js --name loho-xhs-workbench
pm2 save
pm2 startup
```

应用默认监听 `127.0.0.1:3001` 对外由 Nginx 代理。

## 3. Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 125M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. HTTPS

使用 Certbot 为域名申请证书：

```bash
sudo certbot --nginx -d your-domain.com
```

## 5. 更新

```bash
git pull
npm ci
npm run test
npm run build
pm2 restart loho-xhs-workbench --update-env
```

## 运维注意

- 不要将 `server/.env` 提交到 Git。
- 不要修改 `CONFIG_ENCRYPTION_KEY`，否则已经保存的接口配置无法解密。
- `server/config/ai-config.enc.json` 是加密后的接口配置，备份时应与环境变量配套处理。
- 确保运行用户对 `server/temp-uploads` 和 `server/temp-outputs` 有写权限。
- 无需安装数据库和对象存储。
- 临时目录可随时清空，但正在下载的封面会失效。
- 建议通过防火墙、安全组或企业 VPN 限制访问范围。
