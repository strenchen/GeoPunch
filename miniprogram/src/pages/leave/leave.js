// pages/leave/leave.js
const { leaveService, attendanceService } = require('../../services/api');

Page({
  data: {
    activeTab: 'list',
    leaveBalance: {},
    leaveList: [],
    leaveTypes: ['年假', '病假', '事假', '其他'],
    leaveTypeIndex: 0,
    leaveTypeValues: ['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID'],
    startDate: '',
    endDate: '',
    reason: '',
    isSubmitting: false,
    canSubmit: false,
  },

  onLoad() {
    // 强制登录检查
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token || !userInfo) {
      wx.reLaunch({ url: '/pages/profile/profile?type=login' });
      return;
    }

    this.loadLeaveBalance();
    this.loadLeaveList();
  },

  onShow() {
    this.loadLeaveList();
  },

  // 加载请假余额
  async loadLeaveBalance() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const balance = await attendanceService.leaveBalance(userInfo.id);
      this.setData({ leaveBalance: balance });
    } catch (err) {
      console.error('加载请假余额失败:', err);
    }
  },

  // 加载请假列表
  async loadLeaveList() {
    try {
      const data = await leaveService.list();
      const requests = data.requests || data || [];
      const statusMap = {
        PENDING: { text: '待审批', class: 'pending' },
        APPROVED: { text: '已通过', class: 'approved' },
        REJECTED: { text: '已驳回', class: 'rejected' },
      };
      const typeMap = {
        ANNUAL: '年假',
        SICK: '病假',
        PERSONAL: '事假',
        MARRIAGE: '婚假',
        MATERNITY: '产假',
        PATERNITY: '陪产假',
        BEREAVEMENT: '丧假',
        UNPAID: '其他',
      };

      const list = requests.map((item) => {
        const status = statusMap[item.status] || { text: item.status, class: 'pending' };
        return {
          id: item.id,
          type: item.type,
          typeText: typeMap[item.type] || item.type,
          startDate: this.formatDate(item.startDate),
          endDate: this.formatDate(item.endDate),
          duration: item.durationDays || 1,
          reason: item.reason || '',
          status: status.class,
          statusText: status.text,
          approverComment: item.approverComment || '',
        };
      });

      this.setData({ leaveList: list });
    } catch (err) {
      console.error('加载请假列表失败:', err);
    }
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // Tab切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 请假类型选择
  onLeaveTypeChange(e) {
    this.setData({ leaveTypeIndex: e.detail.value });
    this.setData({
      canSubmit: !!this.data.startDate && !!this.data.endDate && !!this.data.reason
    });
  },

  // 开始日期选择
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
    this.setData({
      canSubmit: !!this.data.startDate && !!this.data.endDate && !!this.data.reason
    });
  },

  // 结束日期选择
  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
    this.setData({
      canSubmit: !!this.data.startDate && !!this.data.endDate && !!this.data.reason
    });
  },

  // 原因输入
  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
    this.setData({
      canSubmit: !!this.data.startDate && !!this.data.endDate && !!this.data.reason
    });
  },

  // 提交请假
  async submitLeave() {
    const { leaveTypeValues, leaveTypeIndex, startDate, endDate, reason } = this.data;

    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    if (!reason) {
      wx.showToast({ title: '请输入原因', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      await leaveService.create({
        type: leaveTypeValues[leaveTypeIndex],
        startDate,
        endDate,
        reason,
      });

      wx.showToast({ title: '提交成功', icon: 'success' });
      this.setData({
        activeTab: 'list',
        startDate: '',
        endDate: '',
        reason: '',
        isSubmitting: false,
      });
      this.loadLeaveList();
      this.loadLeaveBalance();
    } catch (err) {
      this.setData({ isSubmitting: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  // 撤销请假
  async cancelLeave(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认撤销',
      content: '确定要撤销该请假申请吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await leaveService.cancel(id);
            wx.showToast({ title: '已撤销', icon: 'success' });
            this.loadLeaveList();
          } catch (err) {
            wx.showToast({ title: err.message || '撤销失败', icon: 'none' });
          }
        }
      },
    });
  },
});
