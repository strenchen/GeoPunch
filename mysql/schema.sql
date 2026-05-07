-- =====================================================
-- GeoPunch 考勤系统 - 数据库Schema
-- 版本: v1.0
-- 创建时间: 2026-05-07
-- =====================================================

CREATE DATABASE IF NOT EXISTS geopunch DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE geopunch;

-- ----------------------------
-- 1. 部门表
-- ----------------------------
CREATE TABLE department (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    name VARCHAR(64) NOT NULL COMMENT '部门名称',
    parent_id BIGINT DEFAULT NULL COMMENT '上级部门ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

-- ----------------------------
-- 2. 角色表
-- ----------------------------
CREATE TABLE role (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    name VARCHAR(32) NOT NULL COMMENT '角色名称',
    description VARCHAR(128) DEFAULT NULL COMMENT '描述',
    permissions JSON COMMENT '权限列表',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 预置角色数据
INSERT INTO role (name, description, permissions) VALUES
('超级管理员', '拥有全部权限', '["*"]'),
('部门管理员', '管理本部门', '["employee:read","employee:write","department:*","attendance:*","leave:*","approval:*"]'),
('普通员工', '基础权限', '["checkin:*","leave:read","leave:write","profile:read","profile:write"]');

-- ----------------------------
-- 3. 员工表
-- ----------------------------
CREATE TABLE employee (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    employee_id VARCHAR(32) NOT NULL UNIQUE COMMENT '员工唯一标识',
    name VARCHAR(64) NOT NULL COMMENT '姓名',
    department_id BIGINT NOT NULL COMMENT '部门ID',
    employee_type ENUM('领导', '销售线', '研发行政') NOT NULL DEFAULT '研发行政' COMMENT '员工类型',
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    wechat_openid VARCHAR(128) DEFAULT NULL COMMENT '微信OpenID',
    role_id BIGINT NOT NULL DEFAULT 3 COMMENT '角色ID',
    password_hash VARCHAR(256) DEFAULT NULL COMMENT '密码哈希',
    status ENUM('正常', '禁用', '离职') NOT NULL DEFAULT '正常' COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_department (department_id),
    INDEX idx_employee_type (employee_type),
    INDEX idx_status (status),
    FOREIGN KEY (department_id) REFERENCES department(id),
    FOREIGN KEY (role_id) REFERENCES role(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工表';

-- ----------------------------
-- 4. 考勤规则表
-- ----------------------------
CREATE TABLE attendance_rule (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    rule_type ENUM('领导豁免', '销售', '研发行政') NOT NULL COMMENT '规则类型',
    department_id BIGINT DEFAULT NULL COMMENT '适用部门，NULL表示全公司',
    config JSON NOT NULL COMMENT '规则配置JSON',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_rule_type (rule_type),
    INDEX idx_department (department_id),
    FOREIGN KEY (department_id) REFERENCES department(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考勤规则表';

-- 示例规则配置
-- 研发行政: {"checkin_times":[{"start":"07:00","end":"09:00"},{"start":"17:00","end":"23:59"}], "location":{"lat":31.2304,"lng":121.4737,"radius":500}}
-- 销售: {"daily_limit":1,"photo_enabled":true,"gps_visible":false}

-- ----------------------------
-- 5. 打卡记录表
-- ----------------------------
CREATE TABLE check_in_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    employee_id BIGINT NOT NULL COMMENT '员工ID',
    check_in_time DATETIME NOT NULL COMMENT '打卡时间',
    check_in_type ENUM('GPS', '地点验证') NOT NULL COMMENT '打卡方式',
    latitude DECIMAL(10, 8) DEFAULT NULL COMMENT '纬度',
    longitude DECIMAL(11, 8) DEFAULT NULL COMMENT '经度',
    location_name VARCHAR(256) DEFAULT NULL COMMENT '地点描述',
    photo_url VARCHAR(512) DEFAULT NULL COMMENT '拍照图片URL',
    status ENUM('正常', '迟到', '早退', '缺勤', '旷工') NOT NULL DEFAULT '正常' COMMENT '打卡状态',
    is_supplement TINYINT NOT NULL DEFAULT 0 COMMENT '是否补卡: 0-否, 1-是',
    supplement_reason VARCHAR(256) DEFAULT NULL COMMENT '补卡原因',
    approved_by BIGINT DEFAULT NULL COMMENT '审批人ID',
    approved_at DATETIME DEFAULT NULL COMMENT '审批时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_employee (employee_id),
    INDEX idx_check_in_time (check_in_time),
    INDEX idx_status (status),
    INDEX idx_date (employee_id, check_in_time),
    FOREIGN KEY (employee_id) REFERENCES employee(id),
    FOREIGN KEY (approved_by) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡记录表';

-- ----------------------------
-- 6. 请假记录表
-- ----------------------------
CREATE TABLE leave_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    employee_id BIGINT NOT NULL COMMENT '员工ID',
    leave_type ENUM('事假', '病假', '年假', '其他') NOT NULL COMMENT '请假类型',
    start_date DATE NOT NULL COMMENT '开始日期',
    end_date DATE NOT NULL COMMENT '结束日期',
    duration DECIMAL(4, 1) NOT NULL COMMENT '时长（天）',
    reason VARCHAR(512) DEFAULT NULL COMMENT '请假原因',
    status ENUM('待审批', '已通过', '已驳回') NOT NULL DEFAULT '待审批' COMMENT '审批状态',
    approver_id BIGINT DEFAULT NULL COMMENT '审批人ID',
    approver_comment VARCHAR(256) DEFAULT NULL COMMENT '审批意见',
    approved_at DATETIME DEFAULT NULL COMMENT '审批时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_employee (employee_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    FOREIGN KEY (employee_id) REFERENCES employee(id),
    FOREIGN KEY (approver_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='请假记录表';

-- ----------------------------
-- 7. 补卡规则配置表（系统级）
-- ----------------------------
CREATE TABLE supplement_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    days_limit INT NOT NULL DEFAULT 3 COMMENT '可补近几日内',
    monthly_limit INT NOT NULL DEFAULT 3 COMMENT '每月补卡次数上限',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='补卡规则配置表';

INSERT INTO supplement_config (days_limit, monthly_limit) VALUES (3, 3);

-- ----------------------------
-- 8. 审批记录表（统一审批流水）
-- ----------------------------
CREATE TABLE approval_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    approval_type ENUM('补卡', '请假') NOT NULL COMMENT '审批类型',
    target_id BIGINT NOT NULL COMMENT '关联记录ID',
    employee_id BIGINT NOT NULL COMMENT '申请人ID',
    approver_id BIGINT NOT NULL COMMENT '审批人ID',
    status ENUM('待审批', '已通过', '已驳回') NOT NULL DEFAULT '待审批' COMMENT '审批状态',
    comment VARCHAR(256) DEFAULT NULL COMMENT '审批意见',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_approval_type (approval_type),
    INDEX idx_employee (employee_id),
    INDEX idx_approver (approver_id),
    INDEX idx_status (status),
    FOREIGN KEY (employee_id) REFERENCES employee(id),
    FOREIGN KEY (approver_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批记录表';

-- ----------------------------
-- 9. 操作日志表
-- ----------------------------
CREATE TABLE operation_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    operator_id BIGINT NOT NULL COMMENT '操作人ID',
    operation_type VARCHAR(32) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(32) DEFAULT NULL COMMENT '操作对象类型',
    target_id BIGINT DEFAULT NULL COMMENT '操作对象ID',
    detail JSON DEFAULT NULL COMMENT '操作详情',
    ip_address VARCHAR(64) DEFAULT NULL COMMENT 'IP地址',
    user_agent VARCHAR(256) DEFAULT NULL COMMENT 'UserAgent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_operator (operator_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- ----------------------------
-- 10. 系统参数配置表
-- ----------------------------
CREATE TABLE system_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    config_key VARCHAR(64) NOT NULL UNIQUE COMMENT '配置键',
    config_value VARCHAR(256) NOT NULL COMMENT '配置值',
    description VARCHAR(128) DEFAULT NULL COMMENT '描述',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数配置表';

INSERT INTO system_config (config_key, config_value, description) VALUES
('checkin_reminder_time', '08:30', '每日打卡提醒时间'),
('password_max_failures', '5', '密码连续失败锁定次数'),
('password_lock_duration', '3600', '密码锁定时长（秒）'),
('backup_interval_hours', '24', '自动备份间隔（小时）');

-- ----------------------------
-- 11. 消息通知表
-- ----------------------------
CREATE TABLE notification (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    employee_id BIGINT NOT NULL COMMENT '接收人ID',
    title VARCHAR(128) NOT NULL COMMENT '通知标题',
    content TEXT NOT NULL COMMENT '通知内容',
    type ENUM('打卡提醒', '异常提醒', '审批结果', '系统通知') NOT NULL COMMENT '通知类型',
    is_read TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读: 0-否, 1-是',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_employee (employee_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息通知表';
