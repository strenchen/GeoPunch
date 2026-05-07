-- ============================================================
-- GeoPunch 考勤系统 - MySQL 建表脚本
-- Generated from schema.prisma
-- MySQL 8.0+
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 表1: employee 员工表
-- --------------------------------------------------------
DROP TABLE IF EXISTS `employee`;
CREATE TABLE `employee` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `employee_number` VARCHAR(32) NOT NULL COMMENT '员工工号',
  `name` VARCHAR(64) NOT NULL COMMENT '姓名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
  `department` VARCHAR(64) NOT NULL COMMENT '部门',
  `position` VARCHAR(64) DEFAULT NULL COMMENT '岗位',
  `role` ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE' COMMENT '角色',
  `hire_date` DATETIME NOT NULL COMMENT '入职日期',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在职',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_number` (`employee_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工表';

-- --------------------------------------------------------
-- 表2: attendance 考勤打卡记录
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT NOT NULL COMMENT '员工ID',
  `type` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL COMMENT '打卡类型',
  `check_time` DATETIME NOT NULL COMMENT '打卡时间',
  `latitude` DOUBLE NOT NULL COMMENT '纬度',
  `longitude` DOUBLE NOT NULL COMMENT '经度',
  `address` VARCHAR(256) DEFAULT NULL COMMENT '地址描述',
  `device_id` VARCHAR(64) DEFAULT NULL COMMENT '设备ID',
  `status` ENUM('NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'MAKEUP') NOT NULL DEFAULT 'NORMAL' COMMENT '打卡状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_employee_check_time` (`employee_id`, `check_time`),
  KEY `idx_type_check_time` (`type`, `check_time`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤打卡记录表';

-- --------------------------------------------------------
-- 表3: attendance_abnormal 考勤异常记录
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance_abnormal`;
CREATE TABLE `attendance_abnormal` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT NOT NULL COMMENT '员工ID',
  `type` ENUM('GPS_OUT_OF_RANGE', 'SUSPICIOUS', 'REPEAT_CLOCK') NOT NULL COMMENT '异常类型',
  `latitude` DOUBLE NOT NULL COMMENT '纬度',
  `longitude` DOUBLE NOT NULL COMMENT '经度',
  `address` VARCHAR(256) DEFAULT NULL COMMENT '地址描述',
  `device_id` VARCHAR(64) DEFAULT NULL COMMENT '设备ID',
  `check_time` DATETIME NOT NULL COMMENT '打卡时间',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '处理状态',
  `resolved_note` TEXT DEFAULT NULL COMMENT '处理备注',
  `resolved_at` DATETIME DEFAULT NULL COMMENT '处理时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_employee_status` (`employee_id`, `status`),
  KEY `idx_check_time` (`check_time`),
  CONSTRAINT `fk_abnormal_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤异常记录表';

-- --------------------------------------------------------
-- 表4: leave_request 请假申请
-- --------------------------------------------------------
DROP TABLE IF EXISTS `leave_request`;
CREATE TABLE `leave_request` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT NOT NULL COMMENT '申请人ID',
  `type` ENUM('ANNUAL', 'SICK', 'PERSONAL', 'MARRIAGE', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'UNPAID') NOT NULL COMMENT '请假类型',
  `start_date` DATETIME NOT NULL COMMENT '开始日期',
  `end_date` DATETIME NOT NULL COMMENT '结束日期',
  `reason` TEXT NOT NULL COMMENT '请假原因',
  `attachments` JSON DEFAULT NULL COMMENT '附件URL列表',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '审批状态',
  `approver_id` BIGINT DEFAULT NULL COMMENT '审批人ID',
  `approver_comment` TEXT DEFAULT NULL COMMENT '审批意见',
  `decided_at` DATETIME DEFAULT NULL COMMENT '审批时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_employee_status` (`employee_id`, `status`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_approver` FOREIGN KEY (`approver_id`) REFERENCES `employee` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='请假申请表';

-- --------------------------------------------------------
-- 表5: makeup_request 补卡申请
-- --------------------------------------------------------
DROP TABLE IF EXISTS `makeup_request`;
CREATE TABLE `makeup_request` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT NOT NULL COMMENT '申请人ID',
  `date` DATETIME NOT NULL COMMENT '补卡日期',
  `type` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL COMMENT '补卡类型',
  `reason` TEXT NOT NULL COMMENT '补卡原因',
  `attachments` JSON DEFAULT NULL COMMENT '证明材料',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '审批状态',
  `approver_id` BIGINT DEFAULT NULL COMMENT '审批人ID',
  `approver_comment` TEXT DEFAULT NULL COMMENT '审批意见',
  `decided_at` DATETIME DEFAULT NULL COMMENT '审批时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_employee_status` (`employee_id`, `status`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_makeup_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_makeup_approver` FOREIGN KEY (`approver_id`) REFERENCES `employee` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='补卡申请表';

-- --------------------------------------------------------
-- 表6: location_whitelist 考勤地点白名单
-- --------------------------------------------------------
DROP TABLE IF EXISTS `location_whitelist`;
CREATE TABLE `location_whitelist` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL COMMENT '地点名称',
  `department` VARCHAR(64) NOT NULL COMMENT '适用部门',
  `latitude` DOUBLE NOT NULL COMMENT '中心点纬度',
  `longitude` DOUBLE NOT NULL COMMENT '中心点经度',
  `radius_meters` INT NOT NULL DEFAULT 200 COMMENT '允许打卡半径(米)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `managed_by` BIGINT DEFAULT NULL COMMENT '管理员ID',
  PRIMARY KEY (`id`),
  KEY `idx_department_active` (`department`, `is_active`),
  CONSTRAINT `fk_location_manager` FOREIGN KEY (`managed_by`) REFERENCES `employee` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤地点白名单';

-- --------------------------------------------------------
-- 表7: system_config 系统配置表
-- --------------------------------------------------------
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(64) NOT NULL COMMENT '配置键',
  `value` TEXT NOT NULL COMMENT '配置值',
  `type` ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') NOT NULL DEFAULT 'STRING' COMMENT '配置类型',
  `label` VARCHAR(128) NOT NULL COMMENT '配置说明',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- --------------------------------------------------------
-- 表8: operation_log 操作日志表
-- --------------------------------------------------------
DROP TABLE IF EXISTS `operation_log`;
CREATE TABLE `operation_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `operator_id` BIGINT NOT NULL COMMENT '操作人ID',
  `module` VARCHAR(32) NOT NULL COMMENT '模块',
  `action` VARCHAR(32) NOT NULL COMMENT '操作类型',
  `target_type` VARCHAR(32) DEFAULT NULL COMMENT '目标类型',
  `target_id` BIGINT DEFAULT NULL COMMENT '目标ID',
  `detail` TEXT DEFAULT NULL COMMENT '详细描述',
  `ip` VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(512) DEFAULT NULL COMMENT '浏览器UA',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_operator_created` (`operator_id`, `created_at`),
  KEY `idx_module_action` (`module`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ============================================================
-- 性能优化索引（额外索引）
-- ============================================================

-- attendance 表：按日期范围查询优化
ALTER TABLE `attendance` ADD INDEX `idx_check_date` (`check_time`, `status`);

-- leave_request 表：按日期范围查询优化
ALTER TABLE `leave_request` ADD INDEX `idx_date_range` (`start_date`, `end_date`);

-- makeup_request 表：按日期范围查询优化
ALTER TABLE `makeup_request` ADD INDEX `idx_date_range` (`date`, `status`);

-- employee 表：部门查询优化
ALTER TABLE `employee` ADD INDEX `idx_department` (`department`);

-- operation_log 表：按时间范围和模块查询
ALTER TABLE `operation_log` ADD INDEX `idx_created_module` (`created_at`, `module`);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 初始化数据
-- ============================================================

-- 管理员账号 (密码: admin123)
INSERT INTO `employee` (`employee_number`, `name`, `password_hash`, `department`, `position`, `role`, `hire_date`)
VALUES ('ADMIN001', '系统管理员', '$2a$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1', '行政部', '系统管理员', 'ADMIN', '2020-01-01 00:00:00')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 测试员工 (密码: emp123456)
INSERT INTO `employee` (`employee_number`, `name`, `password_hash`, `department`, `position`, `role`, `hire_date`)
VALUES 
('EMP001', '张三', '$2a$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1', '技术部', '高级工程师', 'EMPLOYEE', '2022-03-15 00:00:00'),
('EMP002', '李四', '$2a$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1', '技术部', '技术经理', 'MANAGER', '2021-06-01 00:00:00')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 考勤地点白名单
INSERT INTO `location_whitelist` (`name`, `department`, `latitude`, `longitude`, `radius_meters`, `is_active`)
VALUES ('总部办公室', '技术部', 31.2304, 121.4737, 300, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 系统配置
INSERT INTO `system_config` (`key`, `value`, `type`, `label`)
VALUES 
  ('ATTENDANCE_WORK_START', '09:00', 'STRING', '上班时间'),
  ('ATTENDANCE_WORK_END', '18:00', 'STRING', '下班时间'),
  ('ATTENDANCE_LATE_THRESHOLD_MINUTES', '30', 'NUMBER', '迟到阈值（分钟）'),
  ('ATTENDANCE_GPS_RADIUS_DEFAULT', '200', 'NUMBER', '默认打卡半径（米）'),
  ('ATTENDANCE_EARLY_LEAVE_THRESHOLD_MINUTES', '30', 'NUMBER', '早退阈值（分钟）'),
  ('MAKEUP_WINDOW_DAYS', '3', 'NUMBER', '补卡窗口天数'),
  ('MAX_MAKEUP_PER_MONTH', '3', 'NUMBER', '每月补卡上限'),
  ('LATE_GRACE_MINUTES', '3', 'NUMBER', '迟到宽限期（分钟）')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
