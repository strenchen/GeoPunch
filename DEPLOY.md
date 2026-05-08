# GeoPunch 部署及运维手册

> 本文档涵盖生产环境部署、运维监控、备份恢复、故障排查等内容。

---

## 📑 目录

1. [环境要求](#环境要求)
2. [服务器初始化](#服务器初始化)
3. [一键部署](#一键部署)
4. [手动部署详解](#手动部署详解)
5. [服务管理](#服务管理)
6. [备份与恢复](#备份与恢复)
7. [监控与告警](#监控与告警)
8. [故障排查](#故障排查)
9. [安全建议](#安全建议)
10. [版本升级](#版本升级)

---

## 环境要求

### 硬件配置（最小生产环境）

| 资源 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 50 GB SSD | 100 GB SSD |
| 公网带宽 | 5 Mbps | 10 Mbps |

### 软件依赖

| 软件 | 版本 | 说明 |
|------|------|------|
| Ubuntu / CentOS | 20.04+ | 操作系统 |
| Node.js | ≥ 18 | 后端运行环境 |
| MySQL | ≥ 8.0 | 主数据库 |
| Redis | ≥ 6 | 缓存 / 会话 |
| Nginx | ≥ 1.20 | 反向代理 |
| PM2 | 最新 | 进程管理 |
| MinIO (可选) | 最新 | 文件存储（可使用本机磁盘替代） |

---

## 服务器初始化

### 1. 创建项目用户

```bash
# 创建专用用户（生产安全）
sudo useradd -m -s /bin/bash geopunch
sudo mkdir -p /opt/geopunch
sudo chown -R geopunch:geopunch /opt/geopunch
```

### 2. 安装系统依赖

```bash
# Ubuntu
sudo apt update && sudo apt install -y \
  curl \
  git \
  nginx \
  mysql-server \
  redis-server \
  nodejs \
  npm \
  pwgen \
  ufw

# 确认 Node.js 版本
node -v  # 需要 ≥ 18
```

### 3. 配置 MySQL

```bash
# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 创建数据库和用户
mysql -u root <<EOF
CREATE DATABASE geopunch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'geopunch'@'localhost' IDENTIFIED BY 'YourStrongPassword123';
GRANT ALL PRIVILEGES ON geopunch.* TO 'geopunch'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 4. 配置 Redis

```bash
# 启动 Redis
sudo systemctl start redis
sudo systemctl enable redis

# 验证
redis-cli ping  # 应返回 PONG
```

### 5. 安装 Node.js 生产依赖

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 安装 Node.js 18（如果系统版本过低）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 一键部署

### 使用内置脚本

```bash
cd /root/.openclaw/workspaces/coordinator/GeoPunch-project

# 编辑环境变量（如需要）
vim attendance-system/.env

# 执行部署
chmod +x deploy.sh
./deploy.sh
```

脚本会自动：
- ✅ 检查 MySQL / Redis 连通性
- ✅ 创建上传目录
- ✅ 构建前端 + 后端
- ✅ 通过 PM2 启动后端
- ✅ 配置 Nginx
- ✅ 执行健康检查

### 验证部署

```bash
# 前端
curl http://localhost:8888

# 后端API
curl http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employeeNumber":"001","password":"admin123"}'
```

---

## 手动部署详解

### 第一步：构建后端

```bash
cd /opt/geopunch/GeoPunch-project/attendance-system

# 安装依赖
npm install --production

# 生成 Prisma Client
npx prisma generate

# 编译 TypeScript
npm run build

# 数据库迁移（生产环境建议使用 migrate deploy）
npx prisma migrate deploy
```

### 第二步：构建前端

```bash
cd /opt/geopunch/GeoPunch-project/frontend

# 安装依赖
npm install

# 生产构建
npm run build
```

### 第三步：配置 Nginx

```bash
sudo nano /etc/nginx/conf.d/geopunch.conf
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    root /opt/geopunch/GeoPunch-project/frontend/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain application/json application/javascript text/css image/svg+xml;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支持（如果需要）
        proxy_read_timeout 86400;
    }

    # 上传文件
    location /uploads/ {
        alias /opt/geopunch/GeoPunch-project/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

```bash
# 测试并重载
sudo nginx -t
sudo systemctl reload nginx
```

### 第四步：启动后端（PM2）

```bash
cd /opt/geopunch/GeoPunch-project/attendance-system

# 启动（生产环境建议使用 cluster 模式）
pm2 start dist/src/main.js \
  --name geopunch-backend \
  --env production \
  --time

# 保存进程列表（开机自启）
pm2 save

# 设置开机自启
pm2 startup
```

### 第五步：配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

---

## 服务管理

### 常用命令

```bash
# 查看服务状态
pm2 status
pm2 list

# 查看日志
pm2 logs geopunch-backend --lines 100
pm2 logs geopunch-backend --err --lines 50

# 重启服务
pm2 restart geopunch-backend

# 热重载（0停机）
pm2 reload geopunch-backend

# 停止服务
pm2 stop geopunch-backend

# 删除服务
pm2 delete geopunch-backend
```

### 服务健康检查

```bash
# 后端健康检查
curl -f http://localhost:3000/api/v1/health

# 前端健康检查
curl -f http://localhost:8888

# 数据库连接
mysql -u geopunch -p -e "SELECT 1"

# Redis 连接
redis-cli ping
```

### 日志管理

```bash
# 日志文件位置
~/.pm2/logs/

# 日志轮转（PM2 内置）
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 备份与恢复

### 自动备份脚本

```bash
#!/bin/bash
# /opt/geopunch/backup.sh

BACKUP_DIR="/opt/geopunch/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/opt/geopunch/GeoPunch-project"

mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u root -pYourRootPassword geopunch \
  > $BACKUP_DIR/geopunch_db_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/geopunch_uploads_$DATE.tar.gz \
  $PROJECT_DIR/uploads/

# 备份配置文件
tar -czf $BACKUP_DIR/geopunch_config_$DATE.tar.gz \
  $PROJECT_DIR/attendance-system/.env \
  /etc/nginx/conf.d/geopunch.conf

# 删除 7 天前的备份
find $BACKUP_DIR -name "geopunch_*" -mtime +7 -delete

echo "[$(date)] 备份完成: $BACKUP_DIR"
```

### 定时任务（crontab）

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点执行备份
0 3 * * * /opt/geopunch/backup.sh >> /var/log/backup.log 2>&1
```

### 数据恢复

```bash
# 恢复数据库
mysql -u root -p geopunch < /opt/geopunch/backups/geopunch_db_20260508_030000.sql

# 恢复上传文件
tar -xzf /opt/geopunch/backups/geopunch_uploads_20260508_030000.tar.gz -C /
```

---

## 监控与告警

### PM2 监控

```bash
# 查看实时监控面板
pm2 monit

# Keymetrics 监控（可选，需注册）
pm2 link <keymetrics_id> <keymetrics_secret>
```

### 系统监控脚本

```bash
#!/bin/bash
# /opt/geopunch/monitor.sh

CHECK_URL="http://localhost:3000/api/v1/health"
ALERT_EMAIL="admin@example.com"

# 检查后端
if ! curl -sf $CHECK_URL > /dev/null; then
    echo "[ALERT] 后端服务异常" | mail -s "GeoPunch 告警" $ALERT_EMAIL
    pm2 restart geopunch-backend
fi

# 检查磁盘
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "[ALERT] 磁盘使用率: ${DISK_USAGE}%" | mail -s "GeoPunch 磁盘告警" $ALERT_EMAIL
fi

# 检查内存
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "[ALERT] 内存使用率: ${MEM_USAGE}%" | mail -s "GeoPunch 内存告警" $ALERT_EMAIL
fi
```

---

## 故障排查

### 常见问题

#### 1. 后端无法启动

```bash
# 查看错误日志
pm2 logs geopunch-backend --err

# 常见原因：
# - .env 文件缺失或变量错误
# - MySQL / Redis 未启动
# - 端口 3000 被占用
# - Prisma Client 未生成

# 解决步骤
cd attendance-system
npx prisma generate
npx prisma migrate deploy
pm2 restart geopunch-backend
```

#### 2. 前端 502 Bad Gateway

```bash
# 检查 Nginx 日志
sudo tail -f /var/log/nginx/error.log

# 检查后端是否正常运行
pm2 status
curl http://localhost:3000/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{}'

# 重启 Nginx
sudo systemctl restart nginx
```

#### 3. 数据库连接失败

```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 检查连接
mysql -u geopunch -p -h 127.0.0.1 geopunch -e "SELECT 1"

# 检查连接数
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

#### 4. 小程序无法请求 API

```bash
# 检查 Nginx 是否正确代理 /api/
curl -I http://localhost:8888/api/v1/auth/login

# 检查 CORS 配置（浏览器 F12 控制台）
# 确认后端 CORS 白名单包含你的域名
```

### 日志文件位置

| 服务 | 日志路径 |
|------|---------|
| 后端 (PM2) | `~/.pm2/logs/` |
| Nginx | `/var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` |
| MySQL | `/var/log/mysql/error.log` |
| 系统日志 | `/var/log/syslog` |

---

## 安全建议

### 1. 修改默认密码

```bash
# MySQL root 密码
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPassword!';"
mysql -u root -pNewStrongPassword -e "ALTER USER 'geopunch'@'localhost' IDENTIFIED BY 'GeopunchDBPass!';"

# JWT Secret
# 编辑 attendance-system/.env
JWT_SECRET=$(pwgen -s 64 1)
echo "JWT_SECRET=$JWT_SECRET" >> attendance-system/.env
```

### 2. 配置防火墙

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. 关闭不必要的端口

```bash
# 只开放必要端口
sudo ufw deny 3000      # 后端端口不应直接暴露
sudo ufw deny 3306      # MySQL 端口不应直接暴露
sudo ufw deny 6379      # Redis 端口不应直接暴露
```

### 4. 定期更新

```bash
# 系统更新
sudo apt update && sudo apt upgrade -y

# Node.js 依赖更新（每季度）
cd attendance-system && npm audit fix
cd frontend && npm audit fix
```

---

## 版本升级

### 热更新流程

```bash
cd /opt/geopunch/GeoPunch-project

# 1. 备份当前版本
cp -r attendance-system attendance-system.bak.$(date +%Y%m%d)

# 2. 拉取新代码
git pull origin main

# 3. 安装依赖
cd attendance-system && npm install
cd ../frontend && npm install

# 4. 重新构建
cd attendance-system && npm run build
cd ../frontend && npm run build

# 5. 重启服务
pm2 restart geopunch-backend

# 6. 验证
curl http://localhost:3000/api/v1/health
curl http://localhost:8888
```

### 数据库迁移

```bash
# 生产环境建议先在测试环境执行
cd attendance-system

# 创建迁移（如有 schema 变更）
npx prisma migrate dev --name add_new_table

# 生产环境应用迁移
npx prisma migrate deploy
```

---

## 联系支持

- **项目管理**: @PM-Agent
- **技术问题**: @Architect-Agent  
- **生产故障**: @DevOps-Agent

---

*本文档最后更新: 2026-05-08*
