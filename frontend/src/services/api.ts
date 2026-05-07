import type {
  Employee, AttendanceRecord, LeaveRequest, MakeupRequest,
  AttendanceSummary, ApprovalItem, Department, Schedule,
  SystemConfig, Holiday, LeaveBalance
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...headers, ...options?.headers }
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

// ============ 员工服务 ============
export const employeeService = {
  list: (params?: { department_id?: number; status?: string; search?: string }) =>
    request<Employee[]>('/employees', { method: 'POST', body: JSON.stringify(params || {}) }),
  get: (id: number) => request<Employee>(`/employees/${id}`),
  create: (data: Omit<Employee, 'id'>) => request<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Employee>) => request<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/employees/${id}`, { method: 'DELETE' })
};

// ============ 部门服务 ============
export const departmentService = {
  list: () => request<Department[]>('/employees/departments'),
  get: (id: number) => request<Department>(`/departments/${id}`),
  create: (data: Omit<Department, 'id'>) => request<Department>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Department>) => request<Department>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/departments/${id}`, { method: 'DELETE' })
};

// ============ 打卡服务 ============
export const attendanceService = {
  records: (params?: { employee_id?: number; start_date?: string; end_date?: string }) =>
    request<AttendanceRecord[]>('/attendance/records', { method: 'POST', body: JSON.stringify(params || {}) }),
  clockIn: (data: { latitude?: number; longitude?: number; address?: string }) =>
    request<AttendanceRecord>('/attendance/clock', { method: 'POST', body: JSON.stringify({ type: 'CHECK_IN', ...data }) }),
  clockOut: (data: { latitude?: number; longitude?: number; address?: string }) =>
    request<AttendanceRecord>('/attendance/clock', { method: 'POST', body: JSON.stringify({ type: 'CHECK_OUT', ...data }) }),
  today: () => request<{ checkedIn: boolean; checkedOut: boolean; record?: AttendanceRecord }>('/attendance/status/today'),
  stats: () => request<AttendanceSummary>('/statistics/personal'),
  abnormals: () => request<AttendanceRecord[]>('/attendance/abnormals'),
  leaveBalance: (employeeId: number) =>
    request<LeaveBalance>(`/attendance/leave-balance/${employeeId}`),
};

// ============ 请假服务 ============
export const leaveService = {
  list: () => request<LeaveRequest[]>('/approval/leave'),
  create: (data: Omit<LeaveRequest, 'id'>) => request<LeaveRequest>('/approval/leave', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: number) => request<void>(`/approval/leave/${id}/cancel`, { method: 'PUT' }),
};

// ============ 补卡服务 ============
export const makeupService = {
  list: () => request<MakeupRequest[]>('/approval/makeup'),
  create: (data: Omit<MakeupRequest, 'id'>) => request<MakeupRequest>('/approval/makeup', { method: 'POST', body: JSON.stringify(data) }),
};

// ============ 审批服务 ============
export const approvalService = {
  list: () => request<ApprovalItem[]>('/approval/pending'),
  approve: (id: number, type: 'leave' | 'makeup') =>
    request<void>(`/approval/${type}/${id}/approve`, { method: 'PUT' }),
  reject: (id: number, type: 'leave' | 'makeup') =>
    request<void>(`/approval/${type}/${id}/reject`, { method: 'PUT' }),
};

// ============ 排班服务 ============
export const scheduleService = {
  list: (params?: { employee_id?: number; start_date?: string; end_date?: string }) =>
    request<Schedule[]>(`/schedules?${params ? new URLSearchParams(params as Record<string,string>).toString() : ''}`, { method: 'GET' }),
  create: (data: Partial<Schedule>) => request<Schedule>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (_id: number, data: Partial<Schedule>) => request<Schedule>(`/schedules`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (_id: number) => request<void>(`/schedules`, { method: 'DELETE' }),
  applyShift: (data: { employee_id: number; original_date: string; target_date: string; reason?: string }) =>
    request<Schedule>('/schedules/apply-shift', { method: 'POST', body: JSON.stringify(data) }),
};

// ============ 统计服务 ============
export const statisticsService = {
  personal: () => request<AttendanceSummary>('/statistics/personal'),
  department: (id: number) => request<AttendanceSummary>(`/statistics/department/${id}`),
  company: () => request<AttendanceSummary>('/statistics/company'),
  monthly: (_params: { year: number; month: number; department?: string }) =>
    request<AttendanceSummary>('/statistics/monthly', { method: 'GET' }),
};

// ============ 系统配置服务 ============
export const configService = {
  get: () => request<SystemConfig[]>('/config'),
  update: (data: Partial<SystemConfig>) => request<SystemConfig>('/config', { method: 'PUT', body: JSON.stringify(data) }),
  holidays: () => request<Holiday[]>('/config/attendance/config'),
  createHoliday: (data: Omit<Holiday, 'id'>) => request<Holiday>('/config/attendance/config', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (_id: number) => request<void>(`/config/attendance/config`, { method: 'DELETE' }),
};

// ============ 日志服务 ============
export const logService = {
  operations: () => request<any>('/logs/operations'),
  security: () => request<any>('/logs/security'),
};
