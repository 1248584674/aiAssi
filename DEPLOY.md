# 腾讯云部署指南

## 服务器准备（一次性）

```bash
# 1. SSH 登录服务器
ssh root@你的服务器IP

# 2. 安装 Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# 3. 安装 PM2 和 Git
npm install -g pm2
apt-get install -y git

# 4. 安装构建工具（Prisma 需要）
apt-get install -y build-essential python3
```

## 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/1248584674/aiAssi.git
cd aiAssi

# 2. 安装依赖
npm install

# 3. 创建 .env 文件（替换为你的真实 Key）
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
API_PORT=3001
LLM_PROVIDER=openai
LLM_MODEL=deepseek-chat
OPENAI_API_KEY=sk-你的Key
OPENAI_BASE_URL=https://api.deepseek.com/v1
EOF

# 4. 初始化数据库
npx prisma generate
npx prisma db push
npx tsx packages/database/prisma/seed.ts

# 5. 构建前端
npx vite build apps/web

# 6. 启动（PM2 守护）
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # 设置开机自启

# 7. 验证
curl http://localhost:3001/api/health
```

## 腾讯云控制台操作

1. **安全组** → 添加入站规则：端口 3001（TCP，0.0.0.0/0）
2. **防火墙**（如有）→ 放行 3001 端口

## 访问

```
http://你的服务器公网IP:3001
```

## 更新部署

```bash
cd aiAssi
git pull
npm install
npx prisma generate
npx vite build apps/web
pm2 restart ai-assistant
```

## 可选：Nginx 反代 + HTTPS

```nginx
server {
    listen 80;
    server_name 你的域名;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;  # SSE 流式需要长超时
    }
}
```
