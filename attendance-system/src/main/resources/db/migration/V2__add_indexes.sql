-- V2__add_indexes.sql
-- 添加额外的复合索引优化查询性能

-- 员工表索引优化
ALTER TABLE employee ADD INDEX idx_username_status (username, status);
ALTER TABLE employee ADD INDEX idx_dept_role (department_id, role);

-- 打卡记录表复合索引
ALTER TABLE attendance_record ADD INDEX idx_emp_date_status (employee_id, work_date, status);

-- 请假申请日期范围索引
ALTER TABLE leave_request ADD INDEX idx_emp_status_dates (employee_id, status, start_date, end_date);

-- 补打卡申请索引
ALTER TABLE makeup_request ADD INDEX idx_emp_approved (employee_id, status, approved_at);
