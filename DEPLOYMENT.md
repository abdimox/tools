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

务必修改 `APP_PASSWORD` 与 `AUTH_SECRET`。生产环境可将 `CLIENT_ORIGIN` 设置为正式域名。

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
- 确保运行用户对 `server/temp-uploads` 和 `server/temp-outputs` 有写权限。
- 无需安装数据库和对象存储。
- 临时目录可随时清空，但正在下载的封面会失效。
- 建议通过防火墙、安全组或企业 VPN 限制访问范围。
