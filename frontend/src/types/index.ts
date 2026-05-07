// === 员工类型（考勤规则）===
export type EmployeeType = 'leader' | 'sales' | 'rd_admin';

// === 系统角色（权限）===
export type SystemRole = 'super_admin' | 'dept_admin' | 'employee';

// === 员工账号状态 ===
export type EmployeeStatus = 'active' | 'inactive' | 'left';

// === 打卡状态 ===
export type CheckStatus = 'normal' | 'late' | 'early' | 'absent';

// === 审批状态 ===
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// === 请假类型 ===
export type LeaveType = '事假' | '病假' | '年假' | '其他';

// === 请假余额 ===
export interface LeaveBalance {
  employeeId: number;
  annual: number;    // 年假剩余
  sick: number;       // 病假剩余
  personal: number;   // 事假剩余
}

// === 员工 ===
export interface Employee {
  id?: number;
  employee_id: string;      // 工号
  name: string;             // 姓名
  email?: string;
  phone?: string;
  department_id: number;     // 部门ID
  department_name?: string; // 部门名称（展示用）
  employee_type: EmployeeType;
  role: SystemRole;
  position?: string;
  status: EmployeeStatus;
  created_at?: string;
  updated_at?: string;
}

// === 打卡记录 ===
export interface AttendanceRecord {
  id?: number;
  employee_id: number;
  employee_name?: string;
  work_date: string;
  check_time?: string;
  check_type?: 'in_morning' | 'in_evening';
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  photo_url?: string;
  status: CheckStatus;
  remark?: string;
  created_at?: string;
}

// === 请假申请 ===
export interface LeaveRequest {
  id?: number;
  employee_id: number;
  employee_name?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  status: ApprovalStatus;
  approver_id?: number;
  approver_name?: string;
  approved_at?: string;
  approver_remark?: string;
  created_at?: string;
}

// === 补卡申请 ===
export interface MakeupRequest {
  id?: number;
  employee_id: number;
  employee_name?: string;
  target_date: string;
  check_time: string;
  reason: string;
  proof_photos?: string[];
  status: ApprovalStatus;
  approver_id?: number;
  approver_name?: string;
  approved_at?: string;
  approver_remark?: string;
  created_at?: string;
}

// === 审批项（合并 leave + makeup）===
export interface ApprovalItem {
  id: number;
  type: 'leave' | 'makeup';
  employee_id: number;
  employee_name: string;
  content: string;
  detail: LeaveRequest | MakeupRequest;
  create_time: string;
}

// === 考勤统计 ===
export interface AttendanceSummary {
  employee_id: number;
  employee_name: string;
  department_name: string;
  year_month: string;
  total_work_days: number;
  normal_days: number;
  late_days: number;
  early_leave_days: number;
  absent_days: number;
  leave_days: number;
}

// === 排班 ===
export interface Schedule {
  id?: number;
  employee_id: number;
  employee_name?: string;
  schedule_date: string;
  shift_type: 'morning' | 'afternoon' | 'full_day' | 'off';
  check_in_start?: string;
  check_in_end?: string;
  check_out_start?: string;
  check_out_end?: string;
  created_at?: string;
}

// === 部门 ===
export interface Department {
  id: number;
  name: string;
  parent_id?: number;
  manager_id?: number;
  level: number;
  children?: Department[];
}

// === 系统设置 ===
export interface SystemConfig {
  is_default: boolean;
  check_in_start: string;
  check_in_end: string;
  check_out_start: string;
  check_out_end: string;
  location_lat: number;
  location_lng: number;
  location_radius: number;
  late_grace_minutes: number;
  max_makeup_per_month: number;
  makeup_window_days: number;
}

// === 节假日 ===
export interface Holiday {
  id?: number;
  date: string;
  name: string;
  is_workday: boolean; // true=上班，false=放假
}
