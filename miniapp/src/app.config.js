export default defineApp({
  onLaunch() {
    // Check if user is logged in
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
    }
  },
  onShow() {
    console.log('App onShow')
  },
  onHide() {
    console.log('App onHide')
  }
})
