# GeoPunch 考勤系统 - API接口文档

## 版本
v1.0 | 2026-05-07

---

## 认证
- **方式**: JWT Bearer Token
- **请求头**: `Authorization: Bearer <token>`
- **登录接口**: `POST /api/auth/login`

---

## 一、员工管理模块 `/api/employee`

### 1.1 员工列表
```
GET /api/employee
```
**Query参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| department_id | number | 否 | 部门ID |
| employee_type | string | 否 | 员工类型：领导/销售线/研发行政 |
| status | string | 否 | 状态：正常/禁用/离职 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页条数，默认20 |
| keyword | string | 否 | 模糊搜索（姓名/工号/手机）|

**响应:**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "employee_id": "E001",
        "name": "张三",
        "department_id": 1,
        "department_name": "研发部",
        "employee_type": "研发行政",
        "phone": "13800138000",
        "role_id": 3,
        "role_name": "普通员工",
        "status": "正常",
        "created_at": "2026-01-01T08:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 1.2 员工详情
```
GET /api/employee/:id
```

### 1.3 新增员工
```
POST /api/employee
```
**Body:**
```json
{
  "employee_id": "E002",
  "name": "李四",
  "department_id": 1,
  "employee_type": "销售线",
  "phone": "13800138001",
  "role_id": 3
}
```

### 1.4 编辑员工
```
PUT /api/employee/:id
```

### 1.5 禁用/启用员工
```
PATCH /api/employee/:id/status
```
**Body:**
```json
{
  "status": "禁用"
}
```

### 1.6 离职标记
```
PATCH /api/employee/:id/leave
```

### 1.7 批量导入
```
POST /api/employee/import
```
**Content-Type:** multipart/form-data
**Body:** file (Excel文件)

### 1.8 导出员工
```
GET /api/employee/export
```
**Query:** 同列表筛选条件

---

## 二、考勤规则模块 `/api/attendance/rule`

### 2.1 获取考勤规则
```
GET /api/attendance/rule
```
**Query:** department_id（可选）

### 2.2 配置考勤规则
```
POST /api/attendance/rule
```
**Body (研发行政):**
```json
{
  "rule_type": "研发行政",
  "department_id": 1,
  "config": {
    "checkin_times": [
      {"start": "07:00", "end": "09:00"},
      {"start": "17:00", "end": "23:59"}
    ],
    "location": {
      "lat": 31.2304,
      "lng": 121.4737,
      "radius": 500,
      "name": "公司总部"
    }
  }
}
```

**Body (销售线):**
```json
{
  "rule_type": "销售线",
  "config": {
    "daily_limit": 1,
    "photo_enabled": true,
    "gps_visible": false
  }
}
```

**Body (领导豁免):**
```json
{
  "rule_type": "领导豁免",
  "config": {
    "scope": {"department_ids": [1, 2]}
  }
}
```

### 2.3 更新规则
```
PUT /api/attendance/rule/:id
```

---

## 三、打卡模块 `/api/attendance/checkin`

### 3.1 员工打卡
```
POST /api/attendance/checkin
```
**Body:**
```json
{
  "latitude": 31.2304,
  "longitude": 121.4737,
  "location_name": "公司总部",
  "photo_base64": "base64..."
}
```
**响应:**
```json
{
  "code": 0,
  "data": {
    "record_id": 1,
    "status": "正常",
    "check_in_time": "2026-05-07T08:30:00Z",
    "message": "打卡成功"
  }
}
```

**状态说明:**
- `正常`: 正常打卡
- `迟到`: 超出上午打卡时段
- `早退`: 未到下午时段提前打卡
- `缺勤`: 未打卡
- `超出范围`: 不在允许打卡范围内

### 3.2 打卡记录查询
```
GET /api/attendance/checkin
```
**Query:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| employee_id | number | 否 | 员工ID |
| start_date | string | 否 | 开始日期 YYYY-MM-DD |
| end_date | string | 否 | 结束日期 YYYY-MM-DD |
| status | string | 否 | 打卡状态 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

### 3.3 打卡记录详情
```
GET /api/attendance/checkin/:id
```

### 3.4 补卡申请
```
POST /api/attendance/supplement
```
**Body:**
```json
{
  "supplement_date": "2026-05-06",
  "reason": "因公外出忘记打卡"
}
```

### 3.5 补卡记录查询（员工）
```
GET /api/attendance/supplement/my
```

---

## 四、请假模块 `/api/leave`

### 4.1 请假申请
```
POST /api/leave
```
**Body:**
```json
{
  "leave_type": "事假",
  "start_date": "2026-05-10",
  "end_date": "2026-05-12",
  "duration": 3,
  "reason": "家中有事"
}
```

### 4.2 我的请假记录
```
GET /api/leave/my
```
**Query:** start_date, end_date, status, page, pageSize

### 4.3 请假详情
```
GET /api/leave/:id
```

### 4.4 请假撤销
```
DELETE /api/leave/:id
```
> 仅待审批状态可撤销

---

## 五、审批模块 `/api/approval`

### 5.1 待审批列表
```
GET /api/approval/pending
```
**Query:**
| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 审批类型：补卡/请假 |
| page | number | 页码 |
| pageSize | number | 每页条数 |

### 5.2 审批操作
```
POST /api/approval/:type/:id
```
**Body:**
```json
{
  "action": "通过",
  "comment": "同意"
}
```

### 5.3 审批记录查询
```
GET /api/approval/record
```
**Query:** type, status, start_date, end_date, page, pageSize

---

## 六、统计模块 `/api/statistics`

### 6.1 个人考勤统计
```
GET /api/statistics/personal/:employee_id
```
**Query:** month (YYYY-MM)

**响应:**
```json
{
  "code": 0,
  "data": {
    "employee_id": 1,
    "employee_name": "张三",
    "month": "2026-05",
    "attendance_rate": 95.5,
    "normal_count": 20,
    "late_count": 2,
    "early_leave_count": 1,
    "absent_count": 0,
    "absenteeism_count": 0,
    "late_minutes": 45,
    "early_minutes": 20
  }
}
```

### 6.2 部门考勤统计
```
GET /api/statistics/department/:department_id
```
**Query:** month

### 6.3 全局统计
```
GET /api/statistics/overall
```
**Query:** month, employee_type

### 6.4 考勤记录导出
```
GET /api/statistics/export
```
**Query:** start_date, end_date, department_id, employee_id, type (excel)

---

## 七、系统配置 `/api/config`

### 7.1 获取配置
```
GET /api/config
```

### 7.2 更新配置
```
PUT /api/config
```
**Body:**
```json
{
  "checkin_reminder_time": "08:30",
  "password_max_failures": 5,
  "password_lock_duration": 3600,
  "backup_interval_hours": 24
}
```

### 7.3 补卡规则配置
```
GET /api/config/supplement
PUT /api/config/supplement
```

---

## 八、消息通知 `/api/notification`

### 8.1 我的通知
```
GET /api/notification
```
**Query:** is_read, page, pageSize

### 8.2 标记已读
```
PATCH /api/notification/:id/read
```

### 8.3 全部标记已读
```
POST /api/notification/read-all
```

---

## 九、日志模块 `/api/log`

### 9.1 操作日志查询
```
GET /api/log
```
**Query:**
| 参数 | 类型 | 说明 |
|------|------|------|
| operator_id | number | 操作人ID |
| operation_type | string | 操作类型 |
| start_date | string | 开始日期 |
| end_date | string | 结束日期 |
| page | number | 页码 |
| pageSize | number | 每页条数 |

### 9.2 导出日志
```
GET /api/log/export
```

---

## 十、部门管理 `/api/department`

### 10.1 部门列表
```
GET /api/department
```

### 10.2 新增部门
```
POST /api/department
```

### 10.3 编辑部门
```
PUT /api/department/:id
```

### 10.4 删除部门
```
DELETE /api/department/:id
```

---

## 错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 未登录 |
| 1003 | 无权限 |
| 1004 | 资源不存在 |
| 2001 | 员工不存在 |
| 2002 | 员工已禁用 |
| 3001 | 不在打卡范围内 |
| 3002 | 未到打卡时间 |
| 3003 | 今日已打卡 |
| 3004 | 补卡次数已用完 |
| 3005 | 超出补卡期限 |
| 4001 | 请假不存在 |
| 4002 | 请假状态不可操作 |
| 5001 | 审批不存在 |
| 5002 | 无审批权限 |
