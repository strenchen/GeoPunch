// pages/approval/approval.js
const { approvalService } = require('../../services/api');

Page({
  data: {
    activeTab: 'leave',
    leaveList: [],
    makeupList: [],
    leavePendingCount: 0,
    makeupPendingCount: 0,
  },

  onLoad() {
    // 强制登录检查
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token || !userInfo) {
      wx.reLaunch({ url: '/pages/profile/profile?type=login' });
      return;
    }

    // 角色检查：仅 ADMIN/MANAGER 可访问
    if (userInfo.role !== 'ADMIN' && userInfo.role !== 'MANAGER') {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      wx.reLaunch({ url: '/pages/index/index' });
      return;
    }

    this.loadPendingApprovals();
  },

  onShow() {
    this.loadPendingApprovals();
  },

  // 加载待审批列表
  async loadPendingApprovals() {
    try {
      const data = await approvalService.pending();

      const leaveList = (data.leaveRequests || []).map((item) => {
        const date = new Date(item.createdAt);
        return {
          id: item.id,
          employeeId: item.employeeId,
          employeeName: item.employee?.name || '员工',
          type: item.type,
          typeText: this.getLeaveTypeText(item.type),
          startDate: this.formatDate(item.startDate),
          endDate: this.formatDate(item.endDate),
          duration: item.durationDays || 1,
          reason: item.reason || '',
          submitTime: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`,
        };
      });

      const makeupList = (data.makeupRequests || []).map((item) => {
        const date = new Date(item.createdAt);
        const itemDate = new Date(item.date);
        return {
          id: item.id,
          employeeId: item.employeeId,
          employeeName: item.employee?.name || '员工',
          type: item.type,
          typeText: item.type === 'CHECK_IN' ? '上班打卡' : '下班打卡',
          dateStr: `${itemDate.getMonth() + 1}月${itemDate.getDate()}日`,
          reason: item.reason || '',
          submitTime: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`,
        };
      });

      this.setData({
        leaveList,
        makeupList,
        leavePendingCount: leaveList.length,
        makeupPendingCount: makeupList.length,
      });
    } catch (err) {
      console.error('加载待审批列表失败:', err);
    }
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // 获取请假类型文本
  getLeaveTypeText(type) {
    const map = {
      ANNUAL: '年假',
      SICK: '病假',
      PERSONAL: '事假',
      MARRIAGE: '婚假',
      MATERNITY: '产假',
      PATERNITY: '陪产假',
      BEREAVEMENT: '丧假',
      UNPAID: '其他',
    };
    return map[type] || type;
  },

  // Tab切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 审批请假 - 通过
  async approveLeave(e) {
    const id = e.currentTarget.dataset.id;
    await this.handleApprove(id, 'leave');
  },

  // 审批请假 - 驳回
  async rejectLeave(e) {
    const id = e.currentTarget.dataset.id;
    await this.handleReject(id, 'leave');
  },

  // 审批补卡 - 通过
  async approveMakeup(e) {
    const id = e.currentTarget.dataset.id;
    await this.handleApprove(id, 'makeup');
  },

  // 审批补卡 - 驳回
  async rejectMakeup(e) {
    const id = e.currentTarget.dataset.id;
    await this.handleReject(id, 'makeup');
  },

  // 处理通过
  async handleApprove(id, type) {
    try {
      await approvalService.approve(id, type);
      wx.showToast({ title: '已批准', icon: 'success' });
      this.loadPendingApprovals();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  // 处理驳回
  async handleReject(id, type) {
    wx.showModal({
      title: '驳回申请',
      content: '请输入驳回原因（选填）',
      editable: true,
      placeholderText: '选填，可不输入',
      success: async (res) => {
        if (res.confirm) {
          try {
            await approvalService.reject(id, type, res.content || '');
            wx.showToast({ title: '已驳回', icon: 'success' });
            this.loadPendingApprovals();
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      },
    });
  },
});
