# GeoPunch 小程序

微信考勤小程序，基于原生小程序框架开发。

## 项目结构

```
miniprogram/
├── project.config.json     # 项目配置文件
├── sitemap.json           # 小程序 sitemap 配置
└── src/
    ├── app.js             # 应用入口
    ├── app.json           # 应用配置（页面路由、tabBar等）
    ├── app.wxss           # 全局样式
    ├── assets/            # 静态资源（图标等）
    ├── pages/             # 页面
    │   ├── index/         # 首页（打卡入口）
    │   ├── checkin/       # 打卡页面（GPS定位）
    │   ├── records/       # 打卡记录查询
    │   ├── leave/         # 请假申请
    │   ├── makeup/        # 补卡申请
    │   ├── profile/       # 个人中心（登录/信息）
    │   └── approval/      # 审批管理（管理员）
    ├── services/          # API 服务层
    │   └── api.js         # 后端接口封装
    ├── store/             # 状态管理
    └── utils/             # 工具函数
```

## 页面说明

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | /pages/index/index | 打卡入口、今日状态、统计摘要 |
| 打卡 | /pages/checkin/checkin | GPS定位、范围校验、打卡确认 |
| 记录 | /pages/records/records | 月度打卡记录查询 |
| 请假 | /pages/leave/leave | 请假申请/查询/余额展示 |
| 补卡 | /pages/makeup/makeup | 补卡申请（限3日内） |
| 我的 | /pages/profile/profile | 登录、个人信息、考勤概览 |
| 审批 | /pages/approval/approval | 请假/补卡审批（管理员） |

## 功能特性

- ✅ 微信授权登录
- ✅ GPS定位打卡（范围校验）
- ✅ 拍照打卡（可选）
- ✅ 请假申请与余额查询
- ✅ 补卡申请（限近3日）
- ✅ 月度打卡记录查询
- ✅ 审批管理（管理员）
- ✅ 中英文国际化

## API 配置

API 地址在 `src/app.js` 中配置：
```javascript
const API_BASE = 'http://localhost:3000/api/v1';
```

正式环境需替换为实际服务器地址。

## 开发说明

1. 导入到微信开发者工具
2. 修改 `src/app.js` 中的 API_BASE 为实际后端地址
3. 使用微信开发者工具进行调试

## 权限说明

| 页面 | 普通员工 | 部门管理员 | 超级管理员 |
|------|---------|-----------|-----------|
| 首页 | ✅ | ✅ | ✅ |
| 打卡 | ✅ | ✅ | ✅ |
| 记录 | ✅ | ✅ | ✅ |
| 请假 | ✅ | ✅ | ✅ |
| 补卡 | ✅(研发行政) | ✅ | ✅ |
| 审批 | ❌ | ✅ | ✅ |

## 员工类型说明

| 类型 | 值 | 打卡方式 |
|------|-----|---------|
| 领导 | leader | 无需打卡 |
| 销售 | sales | GPS外部打卡 |
| 研发行政 | rd_admin | 固定地点打卡 |
