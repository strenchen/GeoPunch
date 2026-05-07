import type { Employee, AttendanceRecord, LeaveRequest, MakeupRequest, AttendanceSummary } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

export const employeeService = {
  list: () => request<Employee[]>('/employees'),
  get: (id: number) => request<Employee>(`/employees/${id}`),
  create: (data: Omit<Employee, 'id'>) => request<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Employee>) => request<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/employees/${id}`, { method: 'DELETE' })
};

export const attendanceService = {
  records: (date?: string) => request<AttendanceRecord[]>(`/attendance/records${date ? `?date=${date}` : ''}`),
  clockIn: (employeeId: number) => request<AttendanceRecord>('/attendance/clock-in', { method: 'POST', body: JSON.stringify({ employeeId }) }),
  clockOut: (employeeId: number) => request<AttendanceRecord>('/attendance/clock-out', { method: 'POST', body: JSON.stringify({ employeeId }) })
};

export const leaveService = {
  list: () => request<LeaveRequest[]>('/leaves'),
  create: (data: Omit<LeaveRequest, 'id'>) => request<LeaveRequest>('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) => request<LeaveRequest>(`/leaves/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
};

export const makeupService = {
  list: () => request<MakeupRequest[]>('/makeups'),
  create: (data: Omit<MakeupRequest, 'id'>) => request<MakeupRequest>('/makeups', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) => request<MakeupRequest>(`/makeups/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
};

export const approvalService = {
  pending: () => request<any[]>('/approvals/pending'),
  approve: (id: number, type: string) => request<void>(`/approvals/${type}/${id}/approve`, { method: 'POST' }),
  reject: (id: number, type: string) => request<void>(`/approvals/${type}/${id}/reject`, { method: 'POST' })
};

export const reportService = {
  summary: () => request<AttendanceSummary[]>('/reports/summary'),
  export: (startDate: string, endDate: string) => `${API_BASE}/reports/export?start=${startDate}&end=${endDate}`
};