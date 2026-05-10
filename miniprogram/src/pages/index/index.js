// pages/index/index.js
const { attendanceService, employeeService, scheduleService } = require('../../services/api');

Page({
  data: {
    userInfo: null,
    currentDate: '',
    weekday: '',
    checkinTime: '',
    checkinLabel: '点击签到',
    checkinBtnClass: 'btn-normal',
    morningTime: '',
    eveningTime: '',
    morningStatusClass: '',
    eveningStatusClass: '',
    attendanceRate: 0,
    abnormalCount: 0,
    employeeTypeText: '',
    scheduledStart: '',
    scheduledEnd: '',
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token || !userInfo) {
      wx.reLaunch({ url: '/pages/profile/profile?type=login' });
      return;
    }
    this.setData({ userInfo });
    this.loadTodayStatus();
  },

  onShow() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token || !userInfo) {
      wx.reLaunch({ url: '/pages/profile/profile?type=login' });
      return;
    }
    this.setData({ userInfo });
    this.loadTodayStatus();
    this.initDate();
  },

  // 初始化日期显示
  initDate() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    this.setData({
      currentDate: dateStr,
      weekday: weekday,
    });
  },

  // 加载今日打卡状态
  async loadTodayStatus() {
    try {
      const [data, scheduleData] = await Promise.all([
        attendanceService.today(),
        this.loadTodaySchedule(),
      ]);
      const userInfo = this.data.userInfo || wx.getStorageSync('userInfo');
      if (!userInfo) {
        console.warn('未登录，跳转登录页');
        return;
      }

      // 判断员工类型
      const typeMap = { leader: '领导', sales: '销售', rd_admin: '研发行政' };
      const employeeTypeText = typeMap[userInfo.employeeType] || '研发行政';

      const isCheckedIn = data.checkIn && data.checkIn !== true && data.checkIn !== 'true';
      this.setData({
        userInfo,
        employeeTypeText: employeeTypeText,
        checkinTime: data.checkIn && data.checkIn !== true && data.checkIn !== 'true' ? this.formatTime(data.checkIn) : this.formatTime(new Date()),
        morningTime: data.checkIn && data.checkIn !== true && data.checkIn !== 'true' ? this.formatTime(data.checkIn) : scheduleData?.startTime || '',
        checkinLabel: data.checkIn && data.checkIn !== true && data.checkIn !== 'true' ? (data.checkOut && data.checkOut !== true && data.checkOut !== 'true' ? '已打卡' : '下班打卡') : '上班打卡',
        checkinBtnClass: data.checkIn && data.checkIn !== true && data.checkIn !== 'true' && data.checkOut && data.checkOut !== true && data.checkOut !== 'true' ? 'btn-disabled' : 'btn-normal',
        eveningTime: data.checkOut && data.checkIn ? this.formatTime(data.checkOut) : scheduleData?.endTime || '',
        scheduledStart: scheduleData?.startTime || '',
        scheduledEnd: scheduleData?.endTime || '',
      });
    } catch (err) {
      console.error('获取今日状态失败:', err);
    }
  },

  // 加载今日排班信息
  async loadTodaySchedule() {
    try {
      const userInfo = this.data.userInfo || wx.getStorageSync('userInfo');
      if (!userInfo) return null;
      if (typeof scheduleService === 'undefined') {
        console.warn('scheduleService not available');
        return null;
      }
      const today = new Date().toISOString().split('T')[0];
      const schedules = await scheduleService.list({
        employee_id: userInfo.id,
        start_date: today,
        end_date: today,
      });
      if (schedules?.schedules?.[0]) {
        const schedule = schedules.schedules[0];
        return {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        };
      }
    } catch (err) {
      console.error('获取排班失败:', err);
    }
    return null;
  },

  // 格式化时间
  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  // 点击打卡按钮
  onCheckinTap() {
    const userInfo = this.data.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({ url: '/pages/profile/profile?type=login' });
      return;
    }
    const typeMap = { leader: 'leader', sales: 'sales', rd_admin: 'rd_admin' };
    const type = typeMap[userInfo.employeeType] || 'rd_admin';

    // 领导不需要打卡
    if (type === 'leader') {
      wx.showToast({ title: '领导无需打卡', icon: 'none' });
      return;
    }

    const hasMorning = !!this.data.morningTime;
    wx.navigateTo({ url: `/pages/checkin/checkin?type=${hasMorning ? 'CHECK_OUT' : 'CHECK_IN'}` });
  },

  // 跳转到记录页面
  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' });
  },

  // 跳转到请假页面
  goToLeave() {
    wx.navigateTo({ url: '/pages/leave/leave' });
  },

  // 跳转到补卡页面
  goToMakeup() {
    wx.navigateTo({ url: '/pages/makeup/makeup' });
  },
});
