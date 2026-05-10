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

      const records = (data || []).reduce((days, item) => {
        const date = new Date(item.checkTime || item.workDate);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const existing = days.find(d => d.dateKey === dateKey);
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

        if (!existing) {
          const isMorning = item.type === 'CHECK_IN';
          days.push({
            dateKey,
            dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
            weekday: weekdays[date.getDay()],
            morningTime: isMorning ? timeStr : '',
            eveningTime: item.type === 'CHECK_OUT' ? timeStr : '',
            morningStatus: isMorning ? 'normal' : 'absent',
            morningStatusText: isMorning ? '正常' : '未打卡',
            eveningStatus: item.type === 'CHECK_OUT' ? 'normal' : 'absent',
            eveningStatusText: item.type === 'CHECK_OUT' ? '正常' : '未打卡',
            address: item.address || '',
            canApplyMakeup: false,
          });
        } else {
          if (item.type === 'CHECK_IN' && !existing.morningTime) {
            existing.morningTime = timeStr;
            existing.morningStatus = 'normal';
            existing.morningStatusText = '正常';
          } else if (item.type === 'CHECK_OUT') {
            existing.eveningTime = timeStr;
            existing.eveningStatus = 'normal';
            existing.eveningStatusText = '正常';
          }
        }
        return days;
      }, []);

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
