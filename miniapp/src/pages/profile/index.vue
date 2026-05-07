<script setup>
import { ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { authService, attendanceService } from '../../store/user'

// =====================
// State
// =====================
const loading = ref(false)
const profileLoading = ref(false)
const balanceLoading = ref(false)

const userInfo = ref({
  avatar: '',
  name: '',
  employeeId: '',
  department: '',
  role: ''
})

const balance = ref({
  annual: 0,
  sick: 0,
  personal: 0
})

// =====================
// Computed
// =====================

// =====================
// Methods
// =====================
const getEmployeeId = () => {
  const stored = wx.getStorageSync('user')
  if (stored) {
    return stored.employeeId || stored.id || ''
  }
  return ''
}

const getStoredUserInfo = () => {
  const stored = wx.getStorageSync('user')
  return stored || {}
}

const fetchProfile = async () => {
  profileLoading.value = true
  try {
    // Try to get profile from API first
    const res = await authService.getProfile()
    userInfo.value = {
      avatar: res.avatar || '',
      name: res.name || res.nickname || '',
      employeeId: res.employeeId || res.id || '',
      department: res.department || '',
      role: res.role || ''
    }
    // Cache in storage
    wx.setStorageSync('user', res)
  } catch (err) {
    console.error('fetchProfile error:', err)
    // Fallback to local storage
    const local = getStoredUserInfo()
    if (local) {
      userInfo.value = {
        avatar: local.avatar || '',
        name: local.name || local.nickname || '',
        employeeId: local.employeeId || local.id || '',
        department: local.department || '',
        role: local.role || ''
      }
    }
  } finally {
    profileLoading.value = false
  }
}

const fetchBalance = async () => {
  balanceLoading.value = true
  try {
    const employeeId = getEmployeeId()
    if (employeeId) {
      const res = await attendanceService.leaveBalance(employeeId)
      balance.value = res || { annual: 0, sick: 0, personal: 0 }
    }
  } catch (err) {
    console.error('fetchBalance error:', err)
  } finally {
    balanceLoading.value = false
  }
}

const onRefresh = async () => {
  loading.value = true
  await Promise.all([fetchProfile(), fetchBalance()])
  loading.value = false
}

const navigateTo = (url) => {
  wx.navigateTo({ url })
}

const handleLogout = () => {
  wx.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    confirmColor: '#764ba2',
    success: (res) => {
      if (res.confirm) {
        // Clear all storage
        wx.removeStorageSync('token')
        wx.removeStorageSync('user')
        // Redirect to login
        wx.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}

// =====================
// Lifecycle
// =====================
useDidShow(() => {
  onRefresh()
})
</script>

<template>
  <view class="profile-page">
    <!-- Loading Overlay -->
    <view class="loading-overlay" v-if="loading">
      <view class="loading-spinner"></view>
    </view>

    <!-- User Info Card -->
    <view class="user-card">
      <view class="user-card-inner">
        <!-- Avatar -->
        <view class="avatar-wrapper">
          <image
            v-if="userInfo.avatar"
            class="avatar-img"
            :src="userInfo.avatar"
            mode="aspectFill"
          />
          <view v-else class="avatar-placeholder">
            <text class="avatar-initials">{{ (userInfo.name || 'U').charAt(0).toUpperCase() }}</text>
          </view>
        </view>

        <!-- User Details -->
        <view class="user-details">
          <view class="user-name">
            {{ profileLoading ? '加载中...' : (userInfo.name || '未知用户') }}
          </view>
          <view class="user-meta">
            <text class="meta-item">工号: {{ userInfo.employeeId || '-' }}</text>
          </view>
          <view class="user-meta">
            <text class="meta-item">部门: {{ userInfo.department || '-' }}</text>
          </view>
          <view class="user-meta">
            <text class="meta-item">角色: {{ userInfo.role || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- Decorative wave -->
      <view class="card-wave"></view>
    </view>

    <!-- Leave Balance Card -->
    <view class="balance-card">
      <view class="section-header">
        <text class="section-title">假期余额</text>
      </view>

      <view class="balance-grid" v-if="!balanceLoading">
        <view class="balance-item">
          <view class="balance-icon annual">🩺</view>
          <view class="balance-value">{{ balance.annual || 0 }}</view>
          <view class="balance-label">年假(天)</view>
        </view>
        <view class="balance-divider"></view>
        <view class="balance-item">
          <view class="balance-icon sick">💊</view>
          <view class="balance-value">{{ balance.sick || 0 }}</view>
          <view class="balance-label">病假(天)</view>
        </view>
        <view class="balance-divider"></view>
        <view class="balance-item">
          <view class="balance-icon personal">📅</view>
          <view class="balance-value">{{ balance.personal || 0 }}</view>
          <view class="balance-label">事假(天)</view>
        </view>
      </view>

      <!-- Skeleton loading -->
      <view class="balance-grid" v-else>
        <view class="balance-item">
          <view class="skeleton skeleton-icon"></view>
          <view class="skeleton skeleton-value"></view>
          <view class="skeleton skeleton-label"></view>
        </view>
        <view class="balance-divider"></view>
        <view class="balance-item">
          <view class="skeleton skeleton-icon"></view>
          <view class="skeleton skeleton-value"></view>
          <view class="skeleton skeleton-label"></view>
        </view>
        <view class="balance-divider"></view>
        <view class="balance-item">
          <view class="skeleton skeleton-icon"></view>
          <view class="skeleton skeleton-value"></view>
          <view class="skeleton skeleton-label"></view>
        </view>
      </view>
    </view>

    <!-- Menu Card -->
    <view class="menu-card">
      <view class="section-header">
        <text class="section-title">我的记录</text>
      </view>

      <view class="menu-list">
        <view class="menu-item" @tap="navigateTo('/pages/leave/index')">
          <view class="menu-left">
            <text class="menu-icon">📋</text>
            <text class="menu-text">我的请假记录</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>

        <view class="menu-item" @tap="navigateTo('/pages/makeup/index')">
          <view class="menu-left">
            <text class="menu-icon">🕐</text>
            <text class="menu-text">我的补卡记录</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>

        <view class="menu-item no-border" @tap="navigateTo('/pages/records/index')">
          <view class="menu-left">
            <text class="menu-icon">📊</text>
            <text class="menu-text">我的考勤记录</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- Logout Button -->
    <view class="logout-section">
      <button class="logout-btn" @tap="handleLogout">
        退出登录
      </button>
    </view>

    <!-- App version -->
    <view class="version-info">
      <text>GeoPunch v1.0.0</text>
    </view>
  </view>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: env(safe-area-inset-bottom, 24rpx);
  position: relative;
}

/* Loading */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid #f0f0f0;
  border-top-color: #764ba2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* User Card */
.user-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(102, 126, 234, 0.35);
}

.user-card-inner {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.avatar-wrapper {
  flex-shrink: 0;
  margin-right: 28rpx;
}

.avatar-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
}

.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
}

.avatar-initials {
  font-size: 52rpx;
  font-weight: 700;
  color: #ffffff;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 12rpx;
  line-height: 1.2;
}

.user-meta {
  margin-bottom: 6rpx;
}

.meta-item {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.card-wave {
  position: absolute;
  bottom: -20rpx;
  right: -20rpx;
  width: 200rpx;
  height: 200rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
}

/* Balance Card */
.balance-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.section-header {
  margin-bottom: 28rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.balance-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.balance-item {
  flex: 1;
  text-align: center;
}

.balance-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.balance-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.balance-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.balance-divider {
  width: 1rpx;
  height: 80rpx;
  background: #f0f0f0;
}

/* Skeleton */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8rpx;
}

.skeleton-icon {
  width: 48rpx;
  height: 48rpx;
  margin: 0 auto 12rpx;
  border-radius: 50%;
}

.skeleton-value {
  width: 60rpx;
  height: 44rpx;
  margin: 0 auto 8rpx;
}

.skeleton-label {
  width: 80rpx;
  height: 24rpx;
  margin: 0 auto;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Menu Card */
.menu-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.menu-list {
  margin-top: 8rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item.no-border {
  border-bottom: none;
  padding-bottom: 0;
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.menu-text {
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
  font-weight: 300;
}

/* Logout */
.logout-section {
  padding: 16rpx 0;
}

.logout-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #ffffff;
  color: #ff4d4f;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.logout-btn:active {
  opacity: 0.8;
}

/* Version */
.version-info {
  text-align: center;
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #bbb;
}
</style>
