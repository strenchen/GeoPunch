<template>
  <view class="page">
    <!-- Loading Overlay -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-spinner"></view>
    </view>

    <!-- Header -->
    <view class="header">
      <view class="greeting">
        <text class="greeting-text">你好，{{ userInfo.name || '员工' }}</text>
        <text class="date-text">{{ currentDate }}</text>
      </view>
      <view class="avatar">
        <text class="avatar-text">{{ (userInfo.name || 'U').charAt(0) }}</text>
      </view>
    </view>

    <!-- Clock Status Card -->
    <view class="card status-card">
      <view class="card-header">
        <text class="card-title">今日打卡</text>
        <text class="status-badge" :class="statusBadgeClass">{{ statusLabel }}</text>
      </view>

      <view class="clock-times">
        <view class="clock-item">
          <text class="clock-icon">🌅</text>
          <view class="clock-info">
            <text class="clock-label">上班打卡</text>
            <text class="clock-time">{{ todayStatus.clockInTime || '--:--' }}</text>
          </view>
          <text v-if="todayStatus.clockInStatus === 'LATE'" class="status-tag late">迟到</text>
        </view>

        <view class="clock-divider"></view>

        <view class="clock-item">
          <text class="clock-icon">🌙</text>
          <view class="clock-info">
            <text class="clock-label">下班打卡</text>
            <text class="clock-time">{{ todayStatus.clockOutTime || '--:--' }}</text>
          </view>
          <text v-if="todayStatus.clockOutStatus === 'EARLY'" class="status-tag early">早退</text>
        </view>
      </view>

      <!-- Location info -->
      <view v-if="locationInfo" class="location-info">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ locationInfo }}</text>
      </view>
    </view>

    <!-- Clock Button -->
    <view class="card clock-btn-card">
      <button
        class="clock-btn"
        :class="clockBtnClass"
        :disabled="clockActionDisabled"
        @click="handleClockAction"
      >
        <text class="clock-btn-icon">{{ clockBtnIcon }}</text>
        <text class="clock-btn-text">{{ clockBtnText }}</text>
      </button>
      <text class="clock-hint">{{ clockHint }}</text>
    </view>

    <!-- Quick Stats Card -->
    <view class="card stats-card">
      <text class="card-title">本月考勤概览</text>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-value">{{ stats.attendanceRate ?? '--' }}%</text>
          <text class="stat-label">出勤率</text>
        </view>
        <view class="stat-item">
          <text class="stat-value stat-warn">{{ stats.lateCount ?? 0 }}</text>
          <text class="stat-label">迟到次数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value stat-error">{{ stats.absentCount ?? 0 }}</text>
          <text class="stat-label">缺勤次数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.normalCount ?? 0 }}</text>
          <text class="stat-label">正常打卡</text>
        </view>
      </view>
    </view>

    <!-- Quick Actions -->
    <view class="card actions-card">
      <text class="card-title">快捷操作</text>
      <view class="actions-grid">
        <view class="action-item" @click="navigateTo('/pages/leave-apply/index')">
          <text class="action-icon">📋</text>
          <text class="action-text">请假申请</text>
        </view>
        <view class="action-item" @click="navigateTo('/pages/makeup-apply/index')">
          <text class="action-icon">🔄</text>
          <text class="action-text">补卡申请</text>
        </view>
        <view class="action-item" @click="navigateTo('/pages/records/index')">
          <text class="action-icon">📊</text>
          <text class="action-text">我的记录</text>
        </view>
        <view class="action-item" @click="navigateTo('/pages/profile/index')">
          <text class="action-icon">👤</text>
          <text class="action-text">个人中心</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from '@tarojs/taro'
import { attendanceService } from '../../../store/user.js'
import dayjs from 'dayjs'

const router = useRouter()

// User & date state
const userInfo = ref(wx.getStorageSync('user') || {})
const currentDate = ref(dayjs().format('YYYY年MM月DD日 dddd'))

// Loading state
const loading = ref(true)

// Today's attendance status
const todayStatus = ref({
  clockInTime: null,
  clockOutTime: null,
  clockInStatus: null,  // NORMAL, LATE
  clockOutStatus: null, // NORMAL, EARLY
  hasClockIn: false,
  hasClockOut: false
})

// Stats
const stats = ref({
  attendanceRate: null,
  lateCount: 0,
  absentCount: 0,
  normalCount: 0
})

// Location
const locationInfo = ref('')
const currentLocation = ref(null)

// Clock action loading
const clockLoading = ref(false)

// Derived: clock button state
const clockActionDisabled = computed(() => {
  return clockLoading.value || loading.value
})

const clockBtnText = computed(() => {
  if (loading.value) return '加载中...'
  if (!todayStatus.value.hasClockIn) return '上班打卡'
  if (!todayStatus.value.hasClockOut) return '下班打卡'
  return '今日已打卡'
})

const clockBtnIcon = computed(() => {
  if (loading.value) return ''
  if (!todayStatus.value.hasClockIn) return '🌅'
  if (!todayStatus.value.hasClockOut) return '🌙'
  return '✅'
})

const clockBtnClass = computed(() => {
  if (!todayStatus.value.hasClockIn) return 'btn-clock-in'
  if (!todayStatus.value.hasClockOut) return 'btn-clock-out'
  return 'btn-disabled'
})

const clockHint = computed(() => {
  if (!todayStatus.value.hasClockIn) return '点击上方按钮进行上班打卡'
  if (!todayStatus.value.hasClockOut) return '点击上方按钮进行下班打卡'
  return '今日考勤已完成 🎉'
})

// Status label
const statusLabel = computed(() => {
  if (loading.value) return '加载中'
  if (!todayStatus.value.hasClockIn && !todayStatus.value.hasClockOut) return '未打卡'
  if (todayStatus.value.hasClockIn && todayStatus.value.hasClockOut) {
    if (todayStatus.value.clockInStatus === 'LATE' || todayStatus.value.clockOutStatus === 'EARLY') {
      return '有异常'
    }
    return '已打卡'
  }
  if (todayStatus.value.hasClockIn) return '已上班'
  return '已下班'
})

const statusBadgeClass = computed(() => {
  const label = statusLabel.value
  if (label === '已打卡' || label === '正常') return 'badge-success'
  if (label === '未打卡') return 'badge-default'
  if (label === '迟到' || label === '早退' || label === '有异常') return 'badge-warn'
  if (label === '已上班' || label === '已下班') return 'badge-info'
  return 'badge-default'
})

// Lifecycle: check login + load data
onMounted(() => {
  checkLoginAndLoad()
})

// Also refresh when page shows (Taro useDidShow alternative for composition API)
import { useDidShow } from '@tarojs/taro'
useDidShow(() => {
  // Only refresh on show if already loaded once
  if (!loading.value) {
    loadTodayStatus()
  }
})

function checkLoginAndLoad() {
  const token = wx.getStorageSync('token')
  const user = wx.getStorageSync('user')
  if (!token || !user) {
    wx.redirectTo({ url: '/pages/login/index' })
    return
  }
  userInfo.value = user
  Promise.all([loadTodayStatus(), loadStats()])
    .finally(() => {
      loading.value = false
    })
}

async function loadTodayStatus() {
  try {
    const data = await attendanceService.today()
    todayStatus.value = {
      clockInTime: data.clockInTime ? dayjs(data.clockInTime).format('HH:mm') : null,
      clockOutTime: data.clockOutTime ? dayjs(data.clockOutTime).format('HH:mm') : null,
      clockInStatus: data.clockInStatus || null,
      clockOutStatus: data.clockOutStatus || null,
      hasClockIn: !!data.clockInTime,
      hasClockOut: !!data.clockOutTime
    }
  } catch (e) {
    console.error('Failed to load today status:', e)
  }
}

async function loadStats() {
  try {
    const data = await attendanceService.stats()
    stats.value = {
      attendanceRate: data.attendanceRate ?? null,
      lateCount: data.lateCount ?? 0,
      absentCount: data.absentCount ?? 0,
      normalCount: data.normalCount ?? 0
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

async function getLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        currentLocation.value = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        // Try reverse geocode using Tencent/bmap
        locationInfo.value = `${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`
        resolve(res)
      },
      fail: (err) => {
        console.warn('Location failed:', err)
        // Proceed without location
        resolve(null)
      }
    })
  })
}

async function handleClockAction() {
  if (clockActionDisabled.value) return

  // Confirm action
  const action = !todayStatus.value.hasClockIn ? '上班打卡' : '下班打卡'
  wx.showModal({
    title: '确认打卡',
    content: `确定要${action}吗？`,
    confirmText: '确定',
    confirmColor: '#07c160',
    success: async (res) => {
      if (!res.confirm) return

        clockLoading.value = true
      wx.showLoading({ title: '打卡中...', mask: true })

      try {
        // Get location first
        await getLocation()

        const payload = {}
        if (currentLocation.value) {
          payload.latitude = currentLocation.value.latitude
          payload.longitude = currentLocation.value.longitude
        }

        if (!todayStatus.value.hasClockIn) {
          await attendanceService.clockIn(payload)
          wx.showToast({ title: '上班打卡成功', icon: 'success' })
        } else {
          await attendanceService.clockOut(payload)
          wx.showToast({ title: '下班打卡成功', icon: 'success' })
        }

        // Refresh data
        await Promise.all([loadTodayStatus(), loadStats()])
      } catch (e) {
        wx.showToast({ title: e.message || '打卡失败', icon: 'none' })
      } finally {
        clockLoading.value = false
        wx.hideLoading()
      }
    }
  })
}

function navigateTo(url) {
  wx.navigateTo({ url })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 16px;
  box-sizing: border-box;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.greeting {
  display: flex;
  flex-direction: column;
}

.greeting-text {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.date-text {
  font-size: 13px;
  color: #8e8e93;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #07c160, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

/* Card */
.card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  display: block;
  margin-bottom: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.card-header .card-title {
  margin-bottom: 0;
}

/* Status Badge */
.status-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.badge-success {
  background: #e8f8ee;
  color: #07c160;
}

.badge-default {
  background: #f0f0f0;
  color: #8e8e93;
}

.badge-warn {
  background: #fff3e0;
  color: #f5a623;
}

.badge-info {
  background: #e8f4ff;
  color: #007aff;
}

/* Clock Times */
.clock-times {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 0;
}

.clock-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.clock-icon {
  font-size: 24px;
}

.clock-info {
  display: flex;
  flex-direction: column;
}

.clock-label {
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 2px;
}

.clock-time {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.clock-divider {
  width: 1px;
  height: 40px;
  background: #e5e5ea;
  margin: 0 8px;
}

.status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.status-tag.late {
  background: #fff3e0;
  color: #f5a623;
}

.status-tag.early {
  background: #fff3e0;
  color: #f5a623;
}

/* Location */
.location-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.location-icon {
  font-size: 14px;
}

.location-text {
  font-size: 12px;
  color: #8e8e93;
}

/* Clock Button Card */
.clock-btn-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 18px;
}

.clock-btn {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.3s;
  font-size: 0;
}

.clock-btn-icon {
  font-size: 40px;
  line-height: 1;
  display: block;
}

.clock-btn-text {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;
}

.btn-clock-in {
  background: linear-gradient(135deg, #07c160, #10b981);
  box-shadow: 0 8px 24px rgba(7, 193, 96, 0.35);
}

.btn-clock-out {
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  box-shadow: 0 8px 24px rgba(238, 90, 90, 0.35);
}

.btn-disabled {
  background: linear-gradient(135deg, #c7c7cc, #aeaeb2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.clock-btn:not(.btn-disabled):active {
  transform: scale(0.96);
  opacity: 0.9;
}

.clock-hint {
  margin-top: 14px;
  font-size: 13px;
  color: #8e8e93;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  background: #f9f9fb;
  border-radius: 12px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.stat-warn {
  color: #f5a623;
}

.stat-error {
  color: #ff6b6b;
}

.stat-label {
  font-size: 11px;
  color: #8e8e93;
  text-align: center;
}

/* Quick Actions */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #f9f9fb;
  border-radius: 12px;
  transition: all 0.2s;
}

.action-item:active {
  background: #f0f0f5;
  transform: scale(0.97);
}

.action-icon {
  font-size: 26px;
}

.action-text {
  font-size: 12px;
  color: #1a1a2e;
  text-align: center;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e5ea;
  border-top-color: #07c160;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
