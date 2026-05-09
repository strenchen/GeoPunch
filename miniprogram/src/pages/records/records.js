// pages/records/records.js
const { attendanceService } = require('../../services/api');

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    records: [],
    isLoading: false,
  },

  onLoad() {
    // 强制登录检查
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token || !userInfo) {
      wx.reLaunch({ url: '/pages/profile/profile?type=login' });
      return;
    }

    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  // 加载打卡记录
  async loadRecords() {
    this.setData({ isLoading: true });
    try {
      const data = await attendanceService.records({
        year: this.data.year,
        month: this.data.month,
      });

      const records = (data || []).map((item) => {
        const date = new Date(item.checkTime || item.workDate);
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
        const weekday = weekdays[date.getDay()];
        const statusMap = {
          NORMAL: { text: '正常', class: 'normal' },
          LATE: { text: '迟到', class: 'late' },
          EARLY_LEAVE: { text: '早退', class: 'early' },
          ABSENT: { text: '缺勤', class: 'absent' },
        };
        const morningStatus = statusMap[item.morningStatus] || { text: '未打卡', class: 'absent' };
        const eveningStatus = statusMap[item.eveningStatus] || { text: '未打卡', class: 'absent' };

        return {
          id: item.id,
          dateStr,
          weekday,
          morningTime: item.morningTime || '',
          eveningTime: item.eveningTime || '',
          morningStatus: morningStatus.class,
          eveningStatus: eveningStatus.class,
          morningStatusText: morningStatus.text,
          eveningStatusText: eveningStatus.text,
          address: item.address || '',
          canApplyMakeup: item.morningStatus === 'ABSENT' || item.eveningStatus === 'ABSENT',
        };
      });

      this.setData({ records, isLoading: false });
    } catch (err) {
      this.setData({ isLoading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 上一个月
  prevMonth() {
    let { year, month } = this.data;
    if (month === 1) {
      year -= 1;
      month = 12;
    } else {
      month -= 1;
    }
    this.setData({ year, month });
    this.loadRecords();
  },

  // 下一个月
  nextMonth() {
    let { year, month } = this.data;
    if (month === 12) {
      year += 1;
      month = 1;
    } else {
      month += 1;
    }
    this.setData({ year, month });
    this.loadRecords();
  },

  // 跳转到补卡页面
  goToMakeup() {
    wx.navigateTo({ url: '/pages/makeup/makeup' });
  },
});
