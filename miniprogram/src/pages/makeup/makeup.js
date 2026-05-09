// pages/makeup/makeup.js
const { makeupService } = require('../../services/api');

Page({
  data: {
    types: ['上班打卡', '下班打卡'],
    typeValues: ['CHECK_IN', 'CHECK_OUT'],
    typeIndex: 0,
    targetDate: '',
    checkTime: '',
    reason: '',
    usedCount: 0,
    maxCount: 3,
    maxDate: '',
    historyList: [],
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

    // 计算最大日期（3天内）
    const today = new Date();
    const maxDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    this.setData({
      maxDate: this.formatDate(maxDate),
    });
    this.loadHistory();
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 加载补卡历史
  async loadHistory() {
    try {
      const data = await makeupService.list();
      const requests = data.requests || data || [];
      const statusMap = {
        PENDING: { text: '待审批', class: 'pending' },
        APPROVED: { text: '已通过', class: 'approved' },
        REJECTED: { text: '已驳回', class: 'rejected' },
      };
      const typeMap = {
        CHECK_IN: '上班打卡',
        CHECK_OUT: '下班打卡',
      };

      const list = requests.map((item) => {
        const date = new Date(item.date);
        const status = statusMap[item.status] || { text: item.status, class: 'pending' };
        return {
          id: item.id,
          dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
          type: item.type,
          typeText: typeMap[item.type] || item.type,
          reason: item.reason || '',
          status: status.class,
          statusText: status.text,
        };
      });

      // 计算本月已使用次数
      const now = new Date();
      const monthRequests = requests.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === now.getMonth() &&
               itemDate.getFullYear() === now.getFullYear() &&
               item.status !== 'REJECTED';
      });

      this.setData({
        historyList: list,
        usedCount: monthRequests.length,
      });
    } catch (err) {
      console.error('加载补卡历史失败:', err);
    }
  },

  // 补卡类型选择
  onTypeChange(e) {
    this.setData({ typeIndex: e.detail.value });
    this.setData({
      canSubmit: !!this.data.targetDate && !!this.data.checkTime && !!this.data.reason
    });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ targetDate: e.detail.value });
    this.setData({
      canSubmit: !!this.data.targetDate && !!this.data.checkTime && !!this.data.reason
    });
  },

  // 时间输入
  onTimeInput(e) {
    this.setData({ checkTime: e.detail.value });
    this.setData({
      canSubmit: !!this.data.targetDate && !!this.data.checkTime && !!this.data.reason
    });
  },

  // 原因输入
  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
    this.setData({
      canSubmit: !!this.data.targetDate && !!this.data.checkTime && !!this.data.reason
    });
  },

  // 提交补卡
  async submitMakeup() {
    const { targetDate, checkTime, reason, typeValues, typeIndex, usedCount, maxCount } = this.data;

    if (!targetDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    if (!checkTime) {
      wx.showToast({ title: '请输入时间', icon: 'none' });
      return;
    }

    if (!reason) {
      wx.showToast({ title: '请输入原因', icon: 'none' });
      return;
    }

    if (usedCount >= maxCount) {
      wx.showToast({ title: '本月补卡次数已用完', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      await makeupService.create({
        date: targetDate,
        type: typeValues[typeIndex],
        checkTime: `${targetDate} ${checkTime}`,
        reason,
      });

      wx.showToast({ title: '提交成功', icon: 'success' });
      this.setData({
        targetDate: '',
        checkTime: '',
        reason: '',
        isSubmitting: false,
      });
      this.loadHistory();
    } catch (err) {
      this.setData({ isSubmitting: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },
});
