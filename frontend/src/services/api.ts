import type {
  Employee, AttendanceRecord, LeaveRequest, MakeupRequest,
  AttendanceSummary, ApprovalItem, Department, Schedule,
  SystemConfig, Holiday, LeaveBalance
} from '../types';

const API_BASE = '/api/v1';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...headers, ...options?.headers }
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  const json: ApiResponse<T> = await response.json();
  return json.data;
}

// ============ 认证服务 ============
export const authService = {
  login: (data: { employeeNumber: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; expiresIn: number; employee: Employee }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request<Employee>('/auth/profile'),
  refreshToken: () => request<{ token: string }>('/auth/refresh', { method: 'POST' }),
};

interface PaginatedResponse<T> {
  employees: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============ 员工服务 ============
export const employeeService = {
  list: (params?: { department_id?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.department_id) searchParams.set('department_id', String(params.department_id));
    if (params?.status) searchParams.set('isActive', params.status === 'active' ? 'true' : 'false');
    if (params?.search) searchParams.set('keyword', params.search);
    const qs = searchParams.toString();
    return request<PaginatedResponse<Employee>>(`/employee${qs ? '?' + qs : ''}`, { method: 'GET' });
  },
  get: (id: number) => request<Employee>(`/employee/${id}`),
  create: (data: Omit<Employee, 'id'>) => request<Employee>('/employee', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Employee>) => request<Employee>(`/employee/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/employee/${id}`, { method: 'DELETE' })
};

// ============ 部门服务 ============
export const departmentService = {
  list: () => request<Department[]>('/departments'),
  get: (id: number) => request<Department>(`/departments/${id}`),
  create: (data: { name: string }) => request<Department>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string }) => request<Department>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/departments/${id}`, { method: 'DELETE' })
};

// ============ 打卡服务 ============
export const attendanceService = {
  records: (params?: { employee_id?: number; start_date?: string; end_date?: string; month?: number; year?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.employee_id) searchParams.set('employeeId', String(params.employee_id));
    if (params?.month) searchParams.set('month', String(params.month));
    if (params?.year) searchParams.set('year', String(params.year));
    const qs = searchParams.toString();
    return request<AttendanceRecord[]>(`/attendance/records${qs ? '?' + qs : ''}`, { method: 'GET' });
  },
  clockIn: (data: { latitude?: number; longitude?: number; address?: string }) =>
    request<AttendanceRecord>('/attendance/clock', { method: 'POST', body: JSON.stringify({ type: 'CHECK_IN', ...data }) }),
  clockOut: (data: { latitude?: number; longitude?: number; address?: string }) =>
    request<AttendanceRecord>('/attendance/clock', { method: 'POST', body: JSON.stringify({ type: 'CHECK_OUT', ...data }) }),
  today: () => request<{ date: string; checkIn: string | null; checkOut: string | null; isComplete: boolean }>('/attendance/status/today'),
  // 个人统计 - 转换后端响应格式
  stats: () => request<{ year: number; month: number; totalWorkingDays: number; employees: any[] }>('/statistics/personal').then(r => {
    const emp = r.employees?.[0];
    return {
      employee_id: emp?.employee?.id,
      employee_name: emp?.employee?.name,
      department_name: emp?.employee?.department,
      year_month: `${r.year}-${String(r.month).padStart(2, '0')}`,
      total_work_days: r.totalWorkingDays,
      normal_days: emp?.normalDays || 0,
      late_days: emp?.lateDays || 0,
      early_leave_days: emp?.earlyLeaveDays || 0,
      absent_days: emp?.absentDays || 0,
      leave_days: 0,
    };
  }),
  abnormals: () => request<AttendanceRecord[]>('/attendance/abnormals'),
  leaveBalance: (employeeId: number) =>
    request<LeaveBalance>(`/attendance/leave-balance/${employeeId}`),
};

// ============ 请假服务 ============
interface LeaveListResponse {
  requests: any[];
  total: number;
  page: number;
  pageSize: number;
}

export const leaveService = {
  list: () => request<LeaveListResponse>('/approval/leave').then(r => r.requests),
  create: (data: Omit<LeaveRequest, 'id'>) => request<LeaveRequest>('/approval/leave', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: number) => request<void>(`/approval/leave/${id}/cancel`, { method: 'PUT' }),
};

// ============ 补卡服务 ============
interface MakeupListResponse {
  requests: any[];
  total: number;
  page: number;
  pageSize: number;
}

export const makeupService = {
  list: () => request<MakeupListResponse>('/approval/makeup').then(r => r.requests),
  create: (data: Omit<MakeupRequest, 'id'>) => request<MakeupRequest>('/approval/makeup', { method: 'POST', body: JSON.stringify(data) }),
};

// ============ 审批服务 ============
interface PendingApiResponse {
  leaveRequests: any[];
  makeupRequests: any[];
  total: number;
  page: number;
  pageSize: number;
}

export const approvalService = {
  list: () => request<PendingApiResponse>('/approval/pending').then(r => {
    const items: ApprovalItem[] = [
      ...r.leaveRequests.map(req => ({
        id: req.id,
        type: 'leave' as const,
        employee_id: req.employeeId,
        employee_name: req.employee?.name || '',
        content: `${req.type} - ${req.reason}`,
        detail: { ...req },
        create_time: req.createdAt,
      })),
      ...r.makeupRequests.map(req => ({
        id: req.id,
        type: 'makeup' as const,
        employee_id: req.employeeId,
        employee_name: req.employee?.name || '',
        content: `${req.type} - ${req.reason}`,
        detail: { ...req },
        create_time: req.createdAt,
      })),
    ];
    return items;
  }),
  approve: (id: number, type: 'leave' | 'makeup') =>
    request<void>(`/approval/${type}/${id}/approve`, { method: 'PUT' }),
  reject: (id: number, type: 'leave' | 'makeup') =>
    request<void>(`/approval/${type}/${id}/reject`, { method: 'PUT' }),
};

// ============ 排班服务 ============
interface ScheduleListResponse {
  schedules: any[];
  total: number;
  page: number;
  pageSize: number;
}

export const scheduleService = {
  list: (params?: { employee_id?: number; start_date?: string; end_date?: string }) =>
    request<ScheduleListResponse>(`/schedules?${params ? new URLSearchParams(params as Record<string,string>).toString() : ''}`, { method: 'GET' }).then(r => r.schedules),
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
  monthly: (params: { year: number; month: number; department?: string }) => {
    const searchParams = new URLSearchParams({ year: String(params.year), month: String(params.month) });
    if (params.department) searchParams.set('department', params.department);
    const qs = searchParams.toString();
    return request<any>(`/statistics/monthly${qs ? '?' + qs : ''}`, { method: 'GET' }).then(r => {
      // 后端返回 { year, month, totalWorkingDays, employees: [...], departmentSummary: [...] }
      // 转换为前端期望的 AttendanceSummary[] 格式
      return (r.employees || []).map((emp: any) => ({
        employee_id: emp.employee?.id,
        employee_name: emp.employee?.name,
        department_name: emp.employee?.department,
        year_month: `${r.year}-${String(r.month).padStart(2,'0')}`,
        total_work_days: r.totalWorkingDays,
        normal_days: emp.normalDays,
        late_days: emp.lateDays,
        early_leave_days: emp.earlyLeaveDays,
        absent_days: emp.absentDays,
        leave_days: emp.leaveDays,
        worked_days: emp.workedDays,
      }));
    });
  },
};

// ============ 系统配置服务 ============
export const configService = {
  get: () => request<SystemConfig[]>('/config'),
  update: (key: string, value: string, label?: string) =>
    request<SystemConfig>(`/config/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value, label }) }),
  holidays: () => request<Holiday[]>('/config/attendance/config'),
  createHoliday: (data: Omit<Holiday, 'id'>) => request<Holiday>('/config/attendance/config', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (_id: number) => request<void>(`/config/attendance/config`, { method: 'DELETE' }),
};

// ============ 日志服务 ============
export const logService = {
  operations: () => request<any>('/logs/operations'),
  security: () => request<any>('/logs/security'),
};
