export interface Employee {
  id?: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: 'active' | 'inactive';
}

export interface AttendanceRecord {
  id?: number;
  employeeId: number;
  employeeName?: string;
  clockInTime?: string;
  clockOutTime?: string;
  clockInStatus?: 'normal' | 'late';
  clockOutStatus?: 'normal' | 'leaveEarly';
  date: string;
}

export interface LeaveRequest {
  id?: number;
  employeeId: number;
  employeeName?: string;
  leaveType: 'annual' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  reason: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface MakeupRequest {
  id?: number;
  employeeId: number;
  employeeName?: string;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  reason: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ApprovalItem {
  id: number;
  type: 'leave' | 'makeup';
  employeeId: number;
  employeeName: string;
  content: string;
  createTime: string;
}

export interface AttendanceSummary {
  employeeId: number;
  employeeName: string;
  department: string;
  normalDays: number;
  lateDays: number;
  leaveEarlyDays: number;
  absentDays: number;
}