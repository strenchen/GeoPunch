// pages/checkin/checkin.js
const { attendanceService } = require('../../services/api');

Page({
  data: {
    latitude: 0,
    longitude: 0,
    address: '',
    distance: null,
    inRange: false,
    radius: 500, // 默认500米范围
    enablePhoto: false,
    isChecking: false,
    result: null,
    markers: [],
    checkinType: 'CHECK_IN', // CHECK_IN or CHECK_OUT
  },

  onLoad(options) {
    // 强制登录检查
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token || !userInfo) {
      wx.reLaunch({ url: '/pages/profile/profile?type=login' });
      return;
    }

    // 判断是上班打卡还是下班打卡
    const type = options.type || 'CHECK_IN';
    this.setData({ checkinType: type });

    // 获取位置
    this.getLocation();
  },

  // 获取GPS位置
  getLocation() {
    wx.showLoading({ title: '正在获取位置...' });

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        this.setData({
          latitude,
          longitude,
          markers: [
            {
              id: 1,
              latitude,
              longitude,
              width: 30,
              height: 30,
              iconPath: '/assets/my-location.png',
            },
            {
              id: 2,
              latitude: 31.2304, // TODO: 应从后端获取公司位置配置
              longitude: 121.4737,
              width: 30,
              height: 30,
              iconPath: '/assets/company-location.png',
            },
          ],
        });

        // 逆地址解析（简化处理，实际应调用腾讯/高德地图API）
        this.calculateDistance(latitude, longitude);
        wx.hideLoading();
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '获取位置失败，请开启GPS',
          icon: 'none',
          duration: 2000,
        });
        // 设置默认位置用于测试
        this.setData({
          latitude: 31.2304,
          longitude: 121.4737,
          address: '上海市浦东新区（默认位置）',
          inRange: true,
        });
      },
    });
  },

  // 计算距离
  calculateDistance(lat, lng) {
    // 公司位置（TODO: 应从后端配置获取）
    const companyLat = 31.2304;
    const companyLng = 121.4737;
    const radius = this.data.radius;

    // 使用小程序内置的距离计算
    const distance = this.getDistance(lat, lng, companyLat, companyLng);
    const inRange = distance <= radius;

    this.setData({
      distance: Math.round(distance),
      inRange,
      address: distance <= radius ? '公司打卡范围内' : '不在打卡范围内',
    });
  },

  // 计算两点间距离（单位：米）
  getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 地球半径，单位米
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  // 拍照开关
  onPhotoSwitch(e) {
    this.setData({ enablePhoto: e.detail.value });
  },

  // 确认打卡
  async onConfirmCheckin() {
    if (!this.data.inRange) {
      wx.showToast({ title: '不在打卡范围内', icon: 'none' });
      return;
    }

    this.setData({ isChecking: true });

    try {
      const data = {
        latitude: this.data.latitude,
        longitude: this.data.longitude,
        address: this.data.address,
      };

      let result;
      if (this.data.checkinType === 'CHECK_IN') {
        result = await attendanceService.clockIn(data);
      } else {
        result = await attendanceService.clockOut(data);
      }

      const statusText = result.status === 'NORMAL' ? '打卡成功' :
                         result.status === 'LATE' ? '迟到' :
                         result.status === 'EARLY_LEAVE' ? '早退' : '打卡成功';

      this.setData({
        result: {
          status: result.status,
          message: statusText,
        },
        isChecking: false,
      });

      wx.showToast({
        title: statusText,
        icon: 'success',
        duration: 1500,
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      this.setData({ isChecking: false });
      wx.showToast({
        title: err.message || '打卡失败',
        icon: 'none',
      });
    }
  },
});
