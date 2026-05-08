// pages/index/index.js
const { attendanceService, employeeService } = require('../../services/api');

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
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/profile/profile?type=login' });
      return;
    }
    this.setData({ userInfo });
    this.loadTodayStatus();
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
      this.loadTodayStatus();
    } else {
      this.setData({ userInfo: null });
    }
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
      const data = await attendanceService.today();
      const userInfo = this.data.userInfo || wx.getStorageSync('userInfo');
      if (!userInfo) {
        console.warn('未登录，跳转登录页');
        return;
      }

      // 判断员工类型
      const typeMap = { leader: '领导', sales: '销售', rd_admin: '研发行政' };
      const employeeTypeText = typeMap[userInfo.employeeType] || '研发行政';

      this.setData({
        userInfo,
        employeeTypeText: employeeTypeText,
        checkinTime: data.checkedIn ? this.formatTime(data.record?.checkTime) : '',
        morningTime: data.checkedIn ? this.formatTime(data.record?.checkTime) : '',
        checkinLabel: data.checkedIn ? '已打卡' : '点击签到',
        checkinBtnClass: data.checkedIn ? 'btn-disabled' : 'btn-normal',
        eveningTime: data.checkedOut ? this.formatTime(data.record?.checkOutTime) : '',
      });
    } catch (err) {
      console.error('获取今日状态失败:', err);
    }
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
      wx.redirectTo({ url: '/pages/profile/profile?type=login' });
      return;
    }
    const typeMap = { leader: 'leader', sales: 'sales', rd_admin: 'rd_admin' };
    const type = typeMap[userInfo.employeeType] || 'rd_admin';

    // 领导不需要打卡
    if (type === 'leader') {
      wx.showToast({ title: '领导无需打卡', icon: 'none' });
      return;
    }

    wx.navigateTo({ url: '/pages/checkin/checkin' });
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
