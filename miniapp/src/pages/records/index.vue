<template>
  <view class="records-page">
    <!-- Stats Summary Card -->
    <view class="stats-card">
      <view class="stats-header">
        <text class="stats-title">本月考勤概览</text>
        <text class="stats-month">{{ currentYear }}年{{ currentMonth + 1 }}月</text>
      </view>
      <view class="stats-grid">
        <view class="stat-item stat-rate">
          <view class="stat-value">{{ stats.attendanceRate ?? '--' }}<text class="stat-unit">%</text></view>
          <view class="stat-label">出勤率</view>
        </view>
        <view class="stat-item">
          <view class="stat-value stat-late">{{ stats.lateCount ?? 0 }}</view>
          <view class="stat-label">迟到</view>
        </view>
        <view class="stat-item">
          <view class="stat-value stat-early">{{ stats.earlyLeaveCount ?? 0 }}</view>
          <view class="stat-label">早退</view>
        </view>
        <view class="stat-item">
          <view class="stat-value stat-absent">{{ stats.absentCount ?? 0 }}</view>
          <view class="stat-label">缺勤</view>
        </view>
      </view>
    </view>

    <!-- Month Selector -->
    <view class="month-selector">
      <view class="month-nav" @click="prevMonth">
        <text class="nav-arrow">‹</text>
      </view>
      <picker mode="date" fields="month" :value="pickerValue" @change="onMonthChange">
        <view class="month-display">
          <text class="month-text">{{ currentYear }}年{{ String(currentMonth + 1).padStart(2, '0') }}月</text>
          <text class="picker-icon">▼</text>
        </view>
      </picker>
      <view class="month-nav" @click="nextMonth">
        <text class="nav-arrow">›</text>
      </view>
    </view>

    <!-- Loading State -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- Empty State -->
    <view v-else-if="records.length === 0" class="empty-state">
      <view class="empty-icon">📅</view>
      <text class="empty-title">暂无考勤记录</text>
      <text class="empty-subtitle">本月还没有打卡记录</text>
    </view>

    <!-- Records List -->
    <scroll-view
      v-else
      class="records-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view
        v-for="record in records"
        :key="record.id"
        class="record-item"
      >
        <!-- Calendar Badge -->
        <view class="calendar-badge">
          <text class="badge-day">{{ formatDay(record.date) }}</text>
          <text class="badge-weekday">{{ formatWeekday(record.date) }}</text>
        </view>

        <!-- Record Details -->
        <view class="record-content">
          <view class="record-main">
            <view class="record-time">
              <view class="time-row">
                <text class="time-label">上班</text>
                <text class="time-value" :class="{ 'time-missing': !record.checkInTime }">
                  {{ record.checkInTime || '未打卡' }}
                </text>
              </view>
              <view class="time-row">
                <text class="time-label">下班</text>
                <text class="time-value" :class="{ 'time-missing': !record.checkOutTime }">
                  {{ record.checkOutTime || '未打卡' }}
                </text>
              </view>
            </view>
            <view class="status-tag" :class="'status-' + getStatusClass(record.status)">
              {{ getStatusText(record.status) }}
            </view>
          </view>
          <view v-if="record.address" class="record-location">
            <text class="location-icon">📍</text>
            <text class="location-text">{{ record.address }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { attendanceService } from '../../../store/user'

// ============ State ============
const records = ref([])
const stats = ref({
  attendanceRate: null,
  lateCount: 0,
  earlyLeaveCount: 0,
  absentCount: 0
})
const loading = ref(false)
const refreshing = ref(false)

// Current selected month (0-indexed)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())

// Picker value format: 'YYYY-MM'
const pickerValue = computed(() => `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`)

// ============ Helpers ============
function getMonthStart(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function getMonthEnd(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function formatDay(dateStr) {
  if (!dateStr) return '--'
  return dateStr.split('-')[2]
}

function formatWeekday(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `周${weekdays[date.getDay()]}`
}

function getStatusClass(status) {
  const map = {
    'NORMAL': 'normal',
    'LATE': 'late',
    'EARLY_LEAVE': 'early',
    'ABSENT': 'absent'
  }
  return map[status] || 'normal'
}

function getStatusText(status) {
  const map = {
    'NORMAL': '正常',
    'LATE': '迟到',
    'EARLY_LEAVE': '早退',
    'ABSENT': '缺勤'
  }
  return map[status] || '正常'
}

// ============ Data Fetching ============
async function fetchStats() {
  try {
    const data = await attendanceService.stats()
    stats.value = {
      attendanceRate: data.attendanceRate ?? data.rate ?? null,
      lateCount: data.lateCount ?? 0,
      earlyLeaveCount: data.earlyLeaveCount ?? 0,
      absentCount: data.absentCount ?? 0
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  }
}

async function fetchRecords() {
  loading.value = true
  try {
    const data = await attendanceService.records({
      startDate: getMonthStart(currentYear.value, currentMonth.value),
      endDate: getMonthEnd(currentYear.value, currentMonth.value)
    })
    records.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Failed to fetch records:', err)
    wx.showToast({ title: '加载失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadData() {
  await Promise.all([fetchStats(), fetchRecords()])
}

async function onRefresh() {
  refreshing.value = true
  await loadData()
  refreshing.value = false
}

// ============ Month Navigation ============
function prevMonth() {
  if (currentMonth.value === 0) {
    currentYear.value -= 1
    currentMonth.value = 11
  } else {
    currentMonth.value -= 1
  }
  fetchRecords()
}

function nextMonth() {
  const now = new Date()
  const isCurrentMonth = currentYear.value === now.getFullYear() && currentMonth.value === now.getMonth()
  if (isCurrentMonth) return
  if (currentMonth.value === 11) {
    currentYear.value += 1
    currentMonth.value = 0
  } else {
    currentMonth.value += 1
  }
  fetchRecords()
}

function onMonthChange(e) {
  const val = e.detail.value // 'YYYY-MM'
  const [year, month] = val.split('-')
  currentYear.value = parseInt(year)
  currentMonth.value = parseInt(month) - 1
  fetchRecords()
}

// ============ Lifecycle ============
useDidShow(() => {
  loadData()
})
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  background: #f0f2f7;
  padding: 24rpx;
  box-sizing: border-box;
}

/* Stats Card */
.stats-card {
  background: linear-gradient(135deg, #2d5f9e, #4a90d9);
  border-radius: 24rpx;
  padding: 32rpx 32rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(45, 95, 158, 0.25);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.stats-title {
  font-size: 28rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.stats-month {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.65);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16rpx;
}

.stat-item {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 20rpx 16rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-rate {
  background: rgba(255, 255, 255, 0.25);
}

.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.stat-unit {
  font-size: 24rpx;
  font-weight: 500;
  margin-left: 2rpx;
}

.stat-late {
  color: #ffd06e;
}

.stat-early {
  color: #ffb86c;
}

.stat-absent {
  color: #ff8a8a;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* Month Selector */
.month-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.month-nav {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fb;
  border-radius: 50%;
}

.nav-arrow {
  font-size: 36rpx;
  color: #4a90d9;
  font-weight: 600;
  line-height: 1;
}

.month-display {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.month-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a2a4a;
}

.picker-icon {
  font-size: 20rpx;
  color: #8896a9;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 20rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid #e4e8f0;
  border-top-color: #4a90d9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 26rpx;
  color: #8896a9;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  gap: 16rpx;
}

.empty-icon {
  font-size: 96rpx;
  margin-bottom: 16rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #34455b;
}

.empty-subtitle {
  font-size: 26rpx;
  color: #8896a9;
}

/* Records List */
.records-list {
  height: calc(100vh - 340rpx);
}

.record-item {
  display: flex;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  gap: 24rpx;
}

/* Calendar Badge */
.calendar-badge {
  width: 80rpx;
  min-height: 100rpx;
  background: linear-gradient(135deg, #2d5f9e, #4a90d9);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 8rpx;
  gap: 4rpx;
  flex-shrink: 0;
}

.badge-day {
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.badge-weekday {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.75);
}

/* Record Content */
.record-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12rpx;
}

.record-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.record-time {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.time-label {
  font-size: 24rpx;
  color: #8896a9;
  min-width: 56rpx;
}

.time-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a2a4a;
}

.time-missing {
  color: #b0bbc9;
  font-style: italic;
}

/* Status Tags */
.status-tag {
  font-size: 22rpx;
  font-weight: 600;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.status-normal {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-late {
  background: #fff3e0;
  color: #e65100;
}

.status-early {
  background: #fff8e1;
  color: #f57f17;
}

.status-absent {
  background: #ffebee;
  color: #c62828;
}

/* Location */
.record-location {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.location-icon {
  font-size: 22rpx;
}

.location-text {
  font-size: 22rpx;
  color: #8896a9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 380rpx;
}
</style>