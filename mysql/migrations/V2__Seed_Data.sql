-- ============================================================
-- Flyway Migration: V2__Seed_Data.sql
-- Description: 初始化测试数据
-- ============================================================

SET NAMES utf8mb4;

-- 管理员账号 (密码: admin123 - bcrypt hash)
INSERT INTO `employee` (`employee_number`, `name`, `password_hash`, `department`, `position`, `role`, `hire_date`, `is_active`)
VALUES ('ADMIN001', '系统管理员', '$2b$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1', '行政部', '系统管理员', 'ADMIN', '2020-01-01 00:00:00', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 测试部门主管 (密码: manager123)
INSERT INTO `employee` (`employee_number`, `name`, `password_hash`, `department`, `position`, `role`, `hire_date`, `is_active`)
VALUES ('MGR001', '李四', '$2b$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q', '技术部', '技术经理', 'MANAGER', '2021-06-01 00:00:00', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 测试员工 (密码: emp123456)
INSERT INTO `employee` (`employee_number`, `name`, `password_hash`, `department`, `position`, `role`, `hire_date`, `is_active`)
VALUES 
('EMP001', '张三', '$2b$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q', '技术部', '高级工程师', 'EMPLOYEE', '2022-03-15 00:00:00', 1),
('EMP002', '王五', '$2b$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q', '销售部', '销售经理', 'EMPLOYEE', '2021-09-01 00:00:00', 1),
('EMP003', '赵六', '$2b$12$LQv.g1Lr.ykWzJJB1L3MV3OLjF5R3J5k5Q1Q1Q1Q1Q1Q1Q1Q1Q1Q', '技术部', '初级工程师', 'EMPLOYEE', '2023-01-10 00:00:00', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 考勤地点白名单
INSERT INTO `location_whitelist` (`name`, `department`, `latitude`, `longitude`, `radius_meters`, `is_active`, `managed_by`)
VALUES 
('总部办公室', '技术部', 31.2304, 121.4737, 300, 1, NULL),
('分部办公室', '销售部', 31.2400, 121.4800, 200, 1, NULL)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 系统配置
INSERT INTO `system_config` (`key`, `value`, `type`, `label`)
VALUES 
  ('ATTENDANCE_WORK_START', '09:00', 'STRING', '上班时间'),
  ('ATTENDANCE_WORK_END', '18:00', 'STRING', '下班时间'),
  ('ATTENDANCE_LATE_THRESHOLD_MINUTES', '30', 'NUMBER', '迟到阈值（分钟）'),
  ('ATTENDANCE_EARLY_LEAVE_THRESHOLD_MINUTES', '30', 'NUMBER', '早退阈值（分钟）'),
  ('ATTENDANCE_GPS_RADIUS_DEFAULT', '200', 'NUMBER', '默认打卡半径（米）'),
  ('MAKEUP_WINDOW_DAYS', '3', 'NUMBER', '补卡窗口天数'),
  ('MAX_MAKEUP_PER_MONTH', '3', 'NUMBER', '每月补卡上限'),
  ('LATE_GRACE_MINUTES', '3', 'NUMBER', '迟到宽限期（分钟）'),
  ('TOKEN_EXPIRE_HOURS', '2', 'NUMBER', 'Token过期时间（小时）'),
  ('REFRESH_TOKEN_EXPIRE_DAYS', '7', 'NUMBER', 'RefreshToken过期时间（天）'),
  ('MAX_LOGIN_ATTEMPTS', '5', 'NUMBER', '最大登录失败次数'),
  ('LOCKOUT_DURATION_MINUTES', '30', 'NUMBER', '账号锁定时长（分钟）')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
