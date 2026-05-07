-- V1__init_schema.sql
-- 员工考勤系统数据库初始化

-- 部门表
CREATE TABLE department (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(200),
    manager_id BIGINT,
    parent_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id),
    INDEX idx_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 员工表
CREATE TABLE employee (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    real_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    employee_type VARCHAR(20) NOT NULL COMMENT 'FULL_TIME, PART_TIME, CONTRACTOR',
    role VARCHAR(20) NOT NULL COMMENT 'ADMIN, MANAGER, EMPLOYEE',
    department_id BIGINT,
    work_location VARCHAR(200),
    company_lat DECIMAL(10, 7) COMMENT '公司纬度',
    company_lng DECIMAL(10, 7) COMMENT '公司经度',
    hire_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE, RESIGNED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_department (department_id),
    INDEX idx_role (role),
    INDEX idx_status (status),
    FOREIGN KEY (department_id) REFERENCES department(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 打卡记录表
CREATE TABLE attendance_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    check_in_lat DECIMAL(10, 7),
    check_in_lng DECIMAL(10, 7),
    check_in_address VARCHAR(500),
    check_out_lat DECIMAL(10, 7),
    check_out_lng DECIMAL(10, 7),
    check_out_address VARCHAR(500),
    device_id VARCHAR(100) COMMENT '设备ID',
    client_version VARCHAR(50) COMMENT '客户端版本',
    status VARCHAR(20) NOT NULL COMMENT 'NORMAL, LATE, EARLY_LEAVE, ABSENT, OVERTIME',
    remarks VARCHAR(500),
    anti_cheat_score DECIMAL(3, 2) COMMENT '0.00-1.00, 越高越可信',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_date (employee_id, work_date),
    INDEX idx_work_date (work_date),
    INDEX idx_status (status),
    UNIQUE KEY uk_employee_date (employee_id, work_date),
    FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 请假申请表
CREATE TABLE leave_request (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    leave_type VARCHAR(30) NOT NULL COMMENT 'ANNUAL, SICK, PERSONAL, MATERNITY, PATERNITY, UNPAID',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DOUBLE NOT NULL COMMENT '请假天数',
    reason VARCHAR(500) NOT NULL,
    attachment VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED, CANCELLED',
    approver_id BIGINT,
    approved_at DATETIME,
    approval_comment VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_leave (employee_id, created_at),
    INDEX idx_status (status),
    INDEX idx_leave_type (leave_type),
    INDEX idx_dates (start_date, end_date),
    FOREIGN KEY (employee_id) REFERENCES employee(id),
    FOREIGN KEY (approver_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 补打卡申请表
CREATE TABLE makeup_request (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    makeup_date DATE NOT NULL COMMENT '补打卡日期',
    original_date DATE NOT NULL COMMENT '原本应该打卡的日期',
    check_in_time DATETIME NOT NULL,
    check_out_time DATETIME,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED, CANCELLED',
    approver_id BIGINT,
    approved_at DATETIME,
    approval_comment VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_makeup (employee_id, created_at),
    INDEX idx_status (status),
    INDEX idx_makeup_date (makeup_date),
    FOREIGN KEY (employee_id) REFERENCES employee(id),
    FOREIGN KEY (approver_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 月度考勤汇总表
CREATE TABLE attendance_summary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    total_work_days INT DEFAULT 0 COMMENT '应出勤天数',
    actual_work_days INT DEFAULT 0 COMMENT '实际出勤天数',
    late_days INT DEFAULT 0 COMMENT '迟到次数',
    early_leave_days INT DEFAULT 0 COMMENT '早退次数',
    absent_days INT DEFAULT 0 COMMENT '旷工天数',
    overtime_hours DECIMAL(5, 2) DEFAULT 0 COMMENT '加班小时数',
    leave_days DECIMAL(5, 2) DEFAULT 0 COMMENT '请假天数',
    normal_days INT DEFAULT 0 COMMENT '正常天数',
    calculated_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_month (employee_id, year, month),
    INDEX idx_year_month (year, month),
    UNIQUE KEY uk_employee_year_month (employee_id, year, month),
    FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh Token表
CREATE TABLE refresh_token (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expiry_date DATETIME NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employee_token (employee_id),
    INDEX idx_token (token(255)),
    INDEX idx_expiry (expiry_date),
    FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化管理员账号 (密码: admin123)
INSERT INTO employee (username, password, real_name, phone, email, employee_type, role, status)
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH', '系统管理员', '13800138000', 'admin@attendance.com', 'FULL_TIME', 'ADMIN', 'ACTIVE');

-- 初始化测试部门
INSERT INTO department (name, description, status) VALUES ('技术部', '技术研发部门', 'ACTIVE');
