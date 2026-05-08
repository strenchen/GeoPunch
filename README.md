# GeoPunch 智慧考勤系统

> 基于位置定位的数字化企业考勤管理解决方案，支持小程序端员工打卡与 Web 端后台管理。

## 📋 项目概述

GeoPunch 是一款面向企业的智慧考勤系统，支持三种差异化考勤规则（领导豁免、销售外勤打卡、研发行政固定地点打卡），配套补卡申请、请假审批、考勤统计等完整流程。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      微信小程序 (员工端)                       │
│  ├── 打卡 (GPS / 拍照)                                       │
│  ├── 打卡记录查询                                             │
│  ├── 请假申请                                                │
│  ├── 补卡申请                                                │
│  └── 审批进度查看                                            │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP / WebSocket
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx 反向代理 (8888)                     │
│  ├── 前端静态资源 (/ )                                        │
│  ├── API 转发 (/api/* → :3000)                               │
│  └── 上传文件 (/uploads/*)                                   │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              NestJS 后端服务 (port 3000)                      │
│  ├── 员工管理 / 考勤规则 / 打卡 / 审批 / 统计                   │
│  └── JWT 认证 + Redis 会话                                   │
└──────┬──────────────────────────────────┬───────────────────┘
       │                                  │
       ▼                                  ▼
┌──────────────────┐           ┌──────────────────┐
│      MySQL       │           │      Redis       │
│   (geopunch)     │           │   (会话/限流)     │
└──────────────────┘           └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    React + Ant Design (管理后台)               │
│  ├── 仪表盘 / 员工管理 / 考勤规则 / 请假审批 / 统计报表          │
│  └── 部署于 Vite dev server (5173) / Nginx (生产)             │
└─────────────────────────────────────────────────────────────┘
```

## 📁 项目结构

```
GeoPunch/
├── attendance-system/     # NestJS 后端服务
│   ├── src/
│   │   ├── auth/           # 认证模块 (登录/JWT/刷新令牌)
│   │   ├── employee/       # 员工管理
│   │   ├── attendance/     # 打卡记录
│   │   ├── approval/       # 请假/补卡审批
│   │   ├── department/      # 部门管理
│   │   ├── holiday/        # 假期配置
│   │   ├── schedule/       # 排班管理
│   │   ├── statistics/    # 考勤统计
│   │   ├── storage/        # 文件存储 (MinIO)
│   │   ├── logging/        # 操作日志
│   │   ├── config/         # 系统配置
│   │   ├── prisma/         # 数据库 ORM
│   │   └── redis/          # Redis 缓存/会话
│   ├── prisma/
│   │   └── schema.prisma   # 数据模型定义
│   ├── dist/               # 编译输出
│   └── package.json
│
├── frontend/              # React 管理后台 (Vite + Ant Design)
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── layouts/        # 布局组件
│   │   ├── services/       # API 调用
│   │   ├── types/          # TypeScript 类型
│   │   └── i18n/           # 国际化
│   └── package.json
│
├── miniapp/               # Taro 跨端小程序 (编译到微信/支付宝)
│   ├── src/
│   │   ├── pages/
│   │   ├── store/          # Pinia 状态管理
│   │   └── services/      # API 调用
│   └── package.json
│
├── miniprogram/           # 原生微信小程序 (可直接导入开发者工具)
│   ├── src/
│   │   ├── pages/
│   │   ├── services/       # API
│   │   └── assets/         # 静态资源
│   └── geopunch-miniprogram.tar.gz  # 下载分发包
│
├── mysql/
│   └── schema.sql          # 数据库初始化脚本
│
├── uploads/               # 上传文件存储目录
│
├── API.md                 # API 接口文档
├── PRD.md                 # 产品需求文档
├── deploy.sh              # 一键部署脚本
└── README.md              # 本文件
```

## 👥 员工类型与考勤规则

| 类型 | 代码 | 打卡规则 |
|------|------|---------|
| 领导 | `LEADER` | 豁免考勤，不参与打卡 |
| 销售 | `SALES` | 随时随地打卡，每日上限 1 次 |
| 研发行政 | `RD_ADMIN` | 固定时段 + GPS 地点打卡 |

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端框架 | NestJS 10 | TypeScript + 模块化架构 |
| 数据库 | MySQL 8 + Prisma ORM | 关系型数据存储 |
| 缓存 | Redis | 会话存储 / Token 黑名单 / 限流 |
| 文件存储 | MinIO (S3兼容) | 打卡照片存储 |
| 前端框架 | React 18 + Ant Design 5 | 管理后台 |
| 小程序 | Taro 3 (Vue3) / 原生微信小程序 | 员工端 |
| 构建工具 | Vite | 前端开发与生产构建 |
| 部署 | Nginx | 反向代理 + 静态托管 |

## 🚀 快速启动

### 前置依赖

- Node.js ≥ 18
- MySQL ≥ 8.0
- Redis ≥ 6
- npm / yarn

### 1. 后端服务

```bash
cd attendance-system

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL、REDIS_URL 等

# 生成 Prisma Client
npx prisma generate

# 数据库迁移
npx prisma migrate dev

# 启动开发服务
npm run dev
# 访问 http://localhost:3000/api/v1
```

### 2. 前端管理后台

```bash
cd frontend

npm install

npm run dev
# 访问 http://localhost:5173
```

### 3. 微信小程序

**方式一：Taro 编译**
```bash
cd miniapp
npm install
npx taro build --type weapp --watch
```

**方式二：原生小程序（直接导入）**
1. 下载 `geopunch-miniprogram.tar.gz`
2. 解压，用微信开发者工具导入 `miniprogram/` 目录
3. 配置 `project.config.json` 中的 appid

## 🔐 接口认证

登录获取 Token：
```bash
POST /api/v1/auth/login
Body: { "employeeNumber": "001", "password": "admin123" }

Response: {
  "code": 0,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "...",
    "expiresIn": 3600,
    "employee": { "id": 1, "name": "系统管理员", "role": "ADMIN" }
  }
}
```

请求时携带：
```
Authorization: Bearer <accessToken>
```

## 📊 核心 API

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/v1/auth/login` | 登录 |
| 员工 | `/api/v1/employee` | 员工 CRUD |
| 部门 | `/api/v1/department` | 部门管理 |
| 打卡 | `/api/v1/attendance/clock-in` | 打卡 |
| 请假 | `/api/v1/approval/leave` | 请假申请/审批 |
| 补卡 | `/api/v1/approval/makeup` | 补卡申请/审批 |
| 统计 | `/api/v1/statistics/*` | 考勤报表 |

详见 [API.md](./API.md)

## 🔧 环境变量

### attendance-system/.env

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://root:@127.0.0.1:3306/geopunch
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=2h
UPLOAD_BASE_PATH=/path/to/uploads
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## 📦 部署

详见 [DEPLOY.md](./DEPLOY.md)

## 📄 许可证

MIT License
