// GeoPunch Mini Program - App Entry
const API_BASE = 'http://localhost:3000/api/v1';

App({
  globalData: {
    userInfo: null,
    token: null,
    apiBase: API_BASE,
  },

  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
    }
  },

  // 封装请求方法
  request(options) {
    const { url, data, method = 'GET', header = {} } = options;
    const token = this.globalData.token;

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.apiBase}${url}`,
        data,
        method,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...header,
        },
        success: (res) => {
          if (res.data.code === 0) {
            resolve(res.data.data);
          } else if (res.statusCode === 401) {
            // token过期，跳转登录
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            wx.redirectTo({ url: '/pages/profile/profile?type=login' });
            reject(new Error('未登录或登录已过期'));
          } else {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none',
              duration: 2000,
            });
            reject(new Error(res.data.message || '请求失败'));
          }
        },
        fail: (err) => {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none',
            duration: 2000,
          });
          reject(err);
        },
      });
    });
  },
});
