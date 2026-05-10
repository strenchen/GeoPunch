// pages/profile/profile.js
const { authService, attendanceService } = require('../../services/api');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    employeeNumber: '',
    password: '',
    stats: {},
    isAdmin: false,
  },

  onLoad(options) {
    const type = options.type;
    if (type === 'login') {
      this.setData({ isLoggedIn: false });
    }
  },

  onShow() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    const employeeNumber = wx.getStorageSync('savedEmployeeNumber') || '';
    const password = wx.getStorageSync('savedPassword') || '';
    if (token && userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo,
        isAdmin: userInfo.role === 'ADMIN' || userInfo.role === 'MANAGER',
      });
      this.loadStats();
    } else {
      this.setData({ isLoggedIn: false, employeeNumber, password });
    }
  },

  // 工号输入
  onEmployeeNumberInput(e) {
    this.setData({ employeeNumber: e.detail.value });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 登录
  async doLogin() {
    const { employeeNumber, password } = this.data;

    if (!employeeNumber) {
      wx.showToast({ title: '请输入工号', icon: 'none' });
      return;
    }

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    try {
      const data = await authService.login(employeeNumber, password);
      const userInfo = {
        id: data.employee.id,
        name: data.employee.name,
        employeeNumber: data.employee.employeeNumber,
        department: data.employee.department,
        role: data.employee.role,
        employeeType: data.employee.employeeType,
      };

      wx.setStorageSync('token', data.accessToken);
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('savedEmployeeNumber', employeeNumber);
      wx.setStorageSync('savedPassword', password);

      // 更新全局状态
      const app = getApp();
      app.globalData.token = data.accessToken;
      app.globalData.userInfo = userInfo;

      this.setData({
        isLoggedIn: true,
        userInfo,
        isAdmin: userInfo.role === 'ADMIN' || userInfo.role === 'MANAGER',
      });

      wx.showToast({ title: '登录成功', icon: 'success' });
      // 跳转到首页（tabBar页面需要 reLaunch）
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 500);
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }
  },

  // 退出登录
  doLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            stats: {},
          });
        }
      },
    });
  },

  // 加载考勤统计
  async loadStats() {
    try {
      const data = await attendanceService.stats();
      this.setData({ stats: data });
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  // 跳转请假
  goToLeave() {
    wx.navigateTo({ url: '/pages/leave/leave' });
  },

  // 跳转补卡
  goToMakeup() {
    wx.navigateTo({ url: '/pages/makeup/makeup' });
  },

  // 跳转记录
  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' });
  },

  // 跳转审批
  goToApproval() {
    wx.navigateTo({ url: '/pages/approval/approval' });
  },
});
