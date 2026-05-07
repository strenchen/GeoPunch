<template>
  <view class="login-page">
    <view class="login-card">
      <!-- Logo / Title -->
      <view class="login-header">
        <view class="logo-wrapper">
          <text class="logo-text">GP</text>
        </view>
        <text class="app-title">GeoPunch</text>
        <text class="app-subtitle">考勤打卡系统</text>
      </view>

      <!-- Form -->
      <view class="login-form">
        <view class="form-item">
          <view class="form-label">工号</view>
          <input
            class="form-input"
            type="text"
            v-model="employeeNumber"
            placeholder="请输入工号"
            placeholder-class="input-placeholder"
            maxlength="20"
          />
        </view>

        <view class="form-item">
          <view class="form-label">密码</view>
          <input
            class="form-input"
            type="password"
            v-model="password"
            placeholder="请输入密码"
            placeholder-class="input-placeholder"
            maxlength="32"
          />
        </view>

        <button
          class="login-btn"
          :class="{ loading: logging }"
          :disabled="logging"
          @click="handleLogin"
        >
          <text v-if="!logging">登 录</text>
          <text v-else>登录中...</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { authService } from '../../../store/user'

const employeeNumber = ref('')
const password = ref('')
const logging = ref(false)

async function handleLogin() {
  if (!employeeNumber.value.trim()) {
    wx.showToast({ title: '请输入工号', icon: 'none' })
    return
  }
  if (!password.value) {
    wx.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  if (logging.value) return

  logging.value = true
  try {
    const data = await authService.login({
      employeeNumber: employeeNumber.value.trim(),
      password: password.value
    })

    // data already unwrapped by request() → { accessToken, employee: {...} }
    const { accessToken, employee } = data

    // Persist token and user info
    wx.setStorageSync('token', accessToken)
    wx.setStorageSync('user', employee)

    // Navigate to index page (clear login from stack)
    wx.reLaunch({ url: '/pages/index/index' })
  } catch (err) {
    const msg = err.message || '登录失败，请稍后重试'
    wx.showToast({ title: msg, icon: 'none', duration: 2500 })
  } finally {
    logging.value = false
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a2a4a 0%, #2d5f9e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 64rpx 48rpx 56rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 56rpx;
}

.logo-wrapper {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #2d5f9e, #4a90d9);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(45, 95, 158, 0.35);
}

.logo-text {
  font-size: 44rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.app-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #1a2a4a;
  margin-bottom: 8rpx;
}

.app-subtitle {
  font-size: 26rpx;
  color: #8896a9;
  letter-spacing: 4rpx;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #34455b;
  padding-left: 4rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  background: #f5f7fb;
  border: 2rpx solid #e4e8f0;
  border-radius: 16rpx;
  padding: 0 28rpx;
  font-size: 30rpx;
  color: #1a2a4a;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #4a90d9;
  background: #f0f6ff;
}

.input-placeholder {
  color: #b0bbc9;
}

.login-btn {
  width: 100%;
  height: 92rpx;
  background: linear-gradient(135deg, #2d5f9e, #4a90d9);
  border-radius: 46rpx;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16rpx;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(45, 95, 158, 0.35);
}

.login-btn:active:not(.loading) {
  opacity: 0.85;
  transform: scale(0.98);
}

.login-btn.loading {
  background: linear-gradient(135deg, #7aabe8, #a8c8f0);
  box-shadow: none;
}
</style>