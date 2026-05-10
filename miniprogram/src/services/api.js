// GeoPunch Mini Program - API Service
const app = getApp();

/**
 * 认证服务
 */
export const authService = {
  login: (employeeNumber, password) => {
    return app.request({
      url: '/auth/login',
      method: 'POST',
      data: { employeeNumber, password },
    });
  },
  getProfile: () => {
    return app.request({ url: '/auth/profile' });
  },
};

/**
 * 员工服务
 */
export const employeeService = {
  list: (params = {}) => {
    return app.request({
      url: '/employee',
      method: 'POST',
      data: params,
    });
  },
  get: (id) => {
    return app.request({ url: `/employee/${id}` });
  },
};

/**
 * 打卡服务
 */
export const attendanceService = {
  // 获取打卡记录
  records: (params = {}) => {
    const qs = [];
    if (params.employee_id) qs.push(`employeeId=${params.employee_id}`);
    if (params.month) qs.push(`month=${params.month}`);
    if (params.year) qs.push(`year=${params.year}`);
    const query = qs.length ? `?${qs.join('&')}` : '';
    return app.request({ url: `/attendance/records${query}` });
  },

  // 上班打卡
  clockIn: (data) => {
    return app.request({
      url: '/attendance/clock',
      method: 'POST',
      data: { type: 'CHECK_IN', ...data },
    });
  },

  // 下班打卡
  clockOut: (data) => {
    return app.request({
      url: '/attendance/clock',
      method: 'POST',
      data: { type: 'CHECK_OUT', ...data },
    });
  },

  // 今日状态
  today: () => {
    return app.request({ url: '/attendance/status/today' });
  },

  // 个人考勤统计
  stats: () => {
    return app.request({ url: '/statistics/personal' });
  },

  // 请假余额
  leaveBalance: (employeeId) => {
    return app.request({ url: `/attendance/leave-balance/${employeeId}` });
  },

  // 考勤异常列表
  abnormals: () => {
    return app.request({ url: '/attendance/abnormals' });
  },
};

/**
 * 请假服务
 */
export const leaveService = {
  // 请假列表
  list: () => {
    return app.request({ url: '/approval/leave' });
  },

  // 提交请假申请
  create: (data) => {
    return app.request({
      url: '/approval/leave',
      method: 'POST',
      data,
    });
  },

  // 取消请假
  cancel: (id) => {
    return app.request({
      url: `/approval/leave/${id}/cancel`,
      method: 'PUT',
    });
  },
};

/**
 * 补卡服务
 */
export const makeupService = {
  // 补卡列表
  list: () => {
    return app.request({ url: '/approval/makeup' });
  },

  // 提交补卡申请
  create: (data) => {
    return app.request({
      url: '/approval/makeup',
      method: 'POST',
      data,
    });
  },
};

/**
 * 审批服务（管理员）
 */
export const approvalService = {
  // 待我审批列表
  pending: () => {
    return app.request({ url: '/approval/pending' });
  },

  // 审批通过
  approve: (id, type) => {
    return app.request({
      url: `/approval/${type}/${id}/approve`,
      method: 'PUT',
    });
  },

  // 审批驳回
  reject: (id, type, comment) => {
    return app.request({
      url: `/approval/${type}/${id}/reject`,
      method: 'PUT',
      data: { comment },
    });
  },
};

/**
 * 排班服务
 */
export const scheduleService = {
  list: (params = {}) => {
    const qs = [];
    if (params.employee_id) qs.push(`employee_id=${params.employee_id}`);
    if (params.start_date) qs.push(`start_date=${params.start_date}`);
    if (params.end_date) qs.push(`end_date=${params.end_date}`);
    const query = qs.length ? `?${qs.join('&')}` : '';
    return app.request({ url: `/schedules${query}` });
  },

  applyShift: (data) => {
    return app.request({
      url: '/schedules/apply-shift',
      method: 'POST',
      data,
    });
  },
};
