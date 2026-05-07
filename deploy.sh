#!/bin/bash
# GeoPunch 部署脚本

set -e

PROJECT_DIR="/root/.openclaw/workspaces/coordinator/GeoPunch-project"
BACKEND_DIR="$PROJECT_DIR/attendance-system"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "========== GeoPunch 部署启动 =========="

# 1. 检查 MySQL
echo "[1/6] 检查 MySQL..."
mysql -u root -e "SELECT 1" > /dev/null 2>&1 && echo "✅ MySQL 正常" || { echo "❌ MySQL 连接失败"; exit 1; }

# 2. 检查 Redis
echo "[2/6] 检查 Redis..."
redis-cli ping > /dev/null 2>&1 && echo "✅ Redis 正常" || { echo "❌ Redis 连接失败"; exit 1; }

# 3. 创建上传目录
echo "[3/6] 创建上传目录..."
mkdir -p $PROJECT_DIR/uploads/{avatar,clock,general}
echo "✅ 上传目录已创建"

# 4. 启动后端 (PM2)
echo "[4/6] 启动后端服务..."
cd $BACKEND_DIR

# 使用 PM2 启动，如果不存在则安装
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 重启或启动应用
pm2 restart geopunch-backend --name geopunch-backend --time > /dev/null 2>&1 || \
pm2 start dist/src/main.js --name geopunch-backend --time

echo "✅ 后端服务已启动 (PID: $(pm2 pid geopunch-backend))"

# 5. 部署前端 (Nginx)
echo "[5/6] 配置 Nginx..."
sudo bash -c "cat > /etc/nginx/conf.d/geopunch.conf << EOF
server {
    listen 8888;
    server_name _;

    root $FRONTEND_DIR/dist;
    index index.html;

    # 前端静态资源
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # 上传文件访问
    location /uploads/ {
        alias $PROJECT_DIR/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF"

# 测试并重载 Nginx
nginx -t && sudo nginx -s reload && echo "✅ Nginx 配置完成" || echo "⚠️ Nginx 配置失败，请检查"

# 6. 健康检查
echo "[6/6] 健康检查..."
sleep 2
curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1 && echo "✅ 后端健康检查通过" || echo "⚠️ 后端健康检查失败"
curl -sf http://localhost:8888/ > /dev/null 2>&1 && echo "✅ 前端访问正常" || echo "⚠️ 前端访问失败"

echo ""
echo "========== 部署完成 =========="
echo "前端地址: http://localhost:8888"
echo "后端地址: http://localhost:3000/api/v1"
echo "API文档:  http://localhost:3000/api/v1/docs"
echo "================================"
