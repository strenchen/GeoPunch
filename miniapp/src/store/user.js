// API Base URL - relative path for mini-app requests
const API_BASE = '/api/v1'

// Request wrapper with auth
async function request(url, options = {}) {
  const token = wx.getStorageSync('token') || ''
  const header = {
    'Content-Type': 'application/json',
    ...options.header
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await wx.request({
      url: `${API_BASE}${url}`,
      ...options,
      header
    })

    if (res.statusCode === 200) {
      const data = res.data
      if (data.code === 0) {
        return data.data
      } else {
        throw new Error(data.message || 'Request failed')
      }
    } else if (res.statusCode === 401) {
      wx.removeStorageSync('token')
      wx.removeStorageSync('user')
      // Use reLaunch to prevent user from going back via navbar
      // Pass current page as redirect target
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const redirectUrl = currentPage ? `/${currentPage.route}` : '/pages/index/index'
      wx.reLaunch({ url: `/pages/login/index?redirect=${encodeURIComponent(redirectUrl)}` })
      throw new Error('Unauthorized')
    } else {
      throw new Error(`HTTP ${res.statusCode}`)
    }
  } catch (err) {
    console.error('API Error:', err)
    throw err
  }
}

// ============ API Services ============
export const authService = {
  login: (data) => request('/auth/login', { method: 'POST', data }),
  getProfile: () => request('/auth/profile'),
  wxLogin: (code) => request('/auth/wx-login', { method: 'POST', data: { code } })
}

export const attendanceService = {
  clockIn: (data) => request('/attendance/clock', { method: 'POST', data: { type: 'CHECK_IN', ...data } }),
  clockOut: (data) => request('/attendance/clock', { method: 'POST', data: { type: 'CHECK_OUT', ...data } }),
  today: () => request('/attendance/status/today'),
  records: (params) => request('/attendance/records', { data: params }),
  stats: () => request('/statistics/personal'),
  leaveBalance: (employeeId) => request(`/attendance/leave-balance/${employeeId}`)
}

export const leaveService = {
  list: () => request('/approval/leave'),
  create: (data) => request('/approval/leave', { method: 'POST', data }),
  cancel: (id) => request(`/approval/leave/${id}/cancel`, { method: 'PUT' })
}

export const makeupService = {
  list: () => request('/approval/makeup'),
  create: (data) => request('/approval/makeup', { method: 'POST', data })
}

export default {
  authService,
  attendanceService,
  leaveService,
  makeupService
}
