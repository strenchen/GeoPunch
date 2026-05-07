<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { leaveService, attendanceService } from '../../store/user'

// =====================
// State
// =====================
const loading = ref(false)
const balanceLoading = ref(false)
const balance = ref({ annual: 0, sick: 0, personal: 0 })
const leaveList = ref([])
const isSubmitting = ref(false)

// Form fields
const leaveType = ref('')
const startDate = ref('')
const endDate = ref('')
const reason = ref('')

// Pickers
const typePickerVisible = ref(false)
const startPickerVisible = ref(false)
const endPickerVisible = ref(false)

// =====================
// Constants
// =====================
const LEAVE_TYPES = [
  { label: '请选择假期类型', value: '' },
  { label: '年假', value: 'ANNUAL' },
  { label: '病假', value: 'SICK' },
  { label: '事假', value: 'PERSONAL' },
  { label: '婚假', value: 'MARRIAGE' },
  { label: '产假', value: 'MATERNITY' },
  { label: '陪产假', value: 'PATERNITY' },
  { label: '丧假', value: 'FUNERAL' }
]

const STATUS_MAP = {
  PENDING: { text: '审批中', color: '#fa8c16', bg: '#fff7e6' },
  APPROVED: { text: '已通过', color: '#52c41a', bg: '#f6ffed' },
  REJECTED: { text: '已驳回', color: '#ff4d4f', bg: '#fff2f0' }
}

// =====================
// Computed
// =====================
const typeLabel = computed(() => {
  const found = LEAVE_TYPES.find(t => t.value === leaveType.value)
  return found ? found.label : ''
})

// =====================
// Methods
// =====================
const getEmployeeId = () => {
  const userInfo = wx.getStorageSync('userInfo') || {}
  return userInfo.employeeId || userInfo.id || ''
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

const fetchLeaveList = async () => {
  loading.value = true
  try {
    const res = await leaveService.list()
    leaveList.value = res || []
  } catch (err) {
    console.error('fetchLeaveList error:', err)
    wx.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const onRefresh = async () => {
  await Promise.all([fetchBalance(), fetchLeaveList()])
}

const validateForm = () => {
  if (!leaveType.value) {
    wx.showToast({ title: '请选择假期类型', icon: 'none' })
    return false
  }
  if (!startDate.value) {
    wx.showToast({ title: '请选择开始日期', icon: 'none' })
    return false
  }
  if (!endDate.value) {
    wx.showToast({ title: '请选择结束日期', icon: 'none' })
    return false
  }
  if (new Date(startDate.value) > new Date(endDate.value)) {
    wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
    return false
  }
  if (!reason.value.trim()) {
    wx.showToast({ title: '请填写请假原因', icon: 'none' })
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    await leaveService.create({
      leaveType: leaveType.value,
      startDate: startDate.value,
      endDate: endDate.value,
      reason: reason.value.trim()
    })
    wx.showToast({ title: '提交成功', icon: 'success' })
    // Reset form
    leaveType.value = ''
    startDate.value = ''
    endDate.value = ''
    reason.value = ''
    // Refresh list and balance
    await Promise.all([fetchLeaveList(), fetchBalance()])
  } catch (err) {
    wx.showToast({ title: err.message || '提交失败', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

// Picker handlers
const onTypeChange = (e) => {
  const idx = e.detail.value
  leaveType.value = LEAVE_TYPES[idx].value
}

const onStartDateChange = (e) => {
  startDate.value = e.detail.value
}

const onEndDateChange = (e) => {
  endDate.value = e.detail.value
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const getStatusStyle = (status) => {
  const s = STATUS_MAP[status] || { text: status, color: '#999', bg: '#f0f0f0' }
  return `color: ${s.color}; background: ${s.bg};`
}

const getStatusText = (status) => {
  return STATUS_MAP[status]?.text || status || '未知'
}

const getLeaveTypeLabel = (type) => {
  const found = LEAVE_TYPES.find(t => t.value === type)
  return found ? found.label : type
}

// Min date for pickers (today)
const getMinDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// =====================
// Lifecycle
// =====================
useDidShow(() => {
  onRefresh()
})
</script>

<template>
  <view class="leave-page">
    <!-- Leave Balance Card -->
    <view class="balance-card">
      <view class="balance-title">假期余额</view>
      <view class="balance-nums" v-if="!balanceLoading">
        <view class="balance-item">
          <view class="balance-value">{{ balance.annual || 0 }}</view>
          <view class="balance-label">年假(天)</view>
        </view>
        <view class="balance-item">
          <view class="balance-value">{{ balance.sick || 0 }}</view>
          <view class="balance-label">病假(天)</view>
        </view>
        <view class="balance-item">
          <view class="balance-value">{{ balance.personal || 0 }}</view>
          <view class="balance-label">事假(天)</view>
        </view>
      </view>
      <view class="balance-skeleton" v-else>
        <view class="skeleton-item"></view>
        <view class="skeleton-item"></view>
        <view class="skeleton-item"></view>
      </view>
    </view>

    <!-- Leave Request Form -->
    <view class="form-card">
      <view class="form-title">申请请假</view>

      <!-- Leave Type Picker -->
      <view class="form-item" @tap="typePickerVisible = true">
        <view class="form-label">假期类型</view>
        <view class="form-value" :class="{ placeholder: !leaveType }">
          {{ leaveType ? typeLabel : '请选择' }}
          <text class="arrow">›</text>
        </view>
      </view>

      <!-- Start Date Picker -->
      <view class="form-item" @tap="startPickerVisible = true">
        <view class="form-label">开始日期</view>
        <view class="form-value" :class="{ placeholder: !startDate }">
          {{ startDate || '请选择' }}
          <text class="arrow">›</text>
        </view>
      </view>

      <!-- End Date Picker -->
      <view class="form-item" @tap="endPickerVisible = true">
        <view class="form-label">结束日期</view>
        <view class="form-value" :class="{ placeholder: !endDate }">
          {{ endDate || '请选择' }}
          <text class="arrow">›</text>
        </view>
      </view>

      <!-- Reason Textarea -->
      <view class="form-item textarea-item">
        <view class="form-label">请假原因</view>
        <textarea
          class="reason-input"
          v-model="reason"
          placeholder="请输入请假原因..."
          :maxlength="500"
          placeholder-class="textarea-placeholder"
        />
        <view class="word-count">{{ reason.length }}/500</view>
      </view>

      <!-- Submit Button -->
      <button
        class="submit-btn"
        :class="{ disabled: isSubmitting }"
        @tap="handleSubmit"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? '提交中...' : '提交申请' }}
      </button>
    </view>

    <!-- My Leave Records -->
    <view class="records-card">
      <view class="records-title">我的请假记录</view>
      <scroll-view
        scroll-y
        class="records-list"
        :refresher-enabled="true"
        :refresher-triggered="loading"
        @refresherrefresh="onRefresh"
      >
        <view v-if="!loading && leaveList.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无请假记录</text>
        </view>
        <view
          v-for="item in leaveList"
          :key="item.id"
          class="record-item"
        >
          <view class="record-header">
            <view class="record-type">{{ getLeaveTypeLabel(item.leaveType) }}</view>
            <view class="record-status" :style="getStatusStyle(item.status)">
              {{ getStatusText(item.status) }}
            </view>
          </view>
          <view class="record-date">
            {{ formatDateDisplay(item.startDate) }} ~ {{ formatDateDisplay(item.endDate) }}
          </view>
          <view class="record-reason">{{ item.reason }}</view>
          <view class="record-time">申请时间: {{ formatDateDisplay(item.createdAt) }}</view>
        </view>
      </scroll-view>
    </view>

    <!-- Leave Type Picker -->
    <picker
      mode="selector"
      :range="LEAVE_TYPES"
      range-key="label"
      :value="LEAVE_TYPES.findIndex(t => t.value === leaveType)"
      @change="onTypeChange"
      :visible="typePickerVisible"
      @cancel="typePickerVisible = false"
    >
      <view class="picker-mask" v-if="typePickerVisible" @tap.stop="typePickerVisible = false">
        <view class="picker-content" @tap.stop>
          <view class="picker-header">
            <text @tap="typePickerVisible = false">取消</text>
            <text class="picker-title">选择假期类型</text>
            <text @tap="typePickerVisible = false">确定</text>
          </view>
          <picker-view
            class="picker-view"
            :value="[LEAVE_TYPES.findIndex(t => t.value === leaveType)]"
            @change="onTypeChange"
          >
            <picker-view-column>
              <view v-for="t in LEAVE_TYPES" :key="t.value" class="picker-item">
                {{ t.label }}
              </view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>
    </picker>

    <!-- Start Date Picker -->
    <picker
      mode="date"
      :value="startDate"
      :start="getMinDate()"
      @change="onStartDateChange"
    >
      <view class="picker-mask" v-if="startPickerVisible" @tap.stop="startPickerVisible = false">
        <view class="picker-content" @tap.stop>
          <view class="picker-header">
            <text @tap="startPickerVisible = false">取消</text>
            <text class="picker-title">选择开始日期</text>
            <text @tap="startPickerVisible = false">确定</text>
          </view>
          <picker-view
            class="picker-view"
            :value="[0]"
            @change="onStartDateChange"
          >
            <picker-view-column>
              <view class="picker-item">{{ startDate || '请选择日期' }}</view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>
    </picker>

    <!-- End Date Picker -->
    <picker
      mode="date"
      :value="endDate"
      :start="startDate || getMinDate()"
      @change="onEndDateChange"
    >
      <view class="picker-mask" v-if="endPickerVisible" @tap.stop="endPickerVisible = false">
        <view class="picker-content" @tap.stop>
          <view class="picker-header">
            <text @tap="endPickerVisible = false">取消</text>
            <text class="picker-title">选择结束日期</text>
            <text @tap="endPickerVisible = false">确定</text>
          </view>
          <picker-view
            class="picker-view"
            :value="[0]"
            @change="onEndDateChange"
          >
            <picker-view-column>
              <view class="picker-item">{{ endDate || '请选择日期' }}</view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>
    </picker>
  </view>
</template>

<style scoped>
.leave-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: env(safe-area-inset-bottom, 24rpx);
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.balance-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 28rpx;
  margin-bottom: 24rpx;
  font-weight: 500;
}

.balance-nums {
  display: flex;
  justify-content: space-between;
}

.balance-item {
  flex: 1;
  text-align: center;
}

.balance-value {
  color: #ffffff;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.2;
}

.balance-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 24rpx;
  margin-top: 8rpx;
}

.balance-skeleton {
  display: flex;
  justify-content: space-between;
}

.skeleton-item {
  flex: 1;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8rpx;
  margin: 0 8rpx;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.form-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.form-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 32rpx;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item:last-of-type {
  border-bottom: none;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  flex-shrink: 0;
}

.form-value {
  font-size: 28rpx;
  color: #666;
  text-align: right;
  flex: 1;
  margin-left: 24rpx;
}

.form-value.placeholder {
  color: #bbb;
}

.arrow {
  margin-left: 8rpx;
  color: #bbb;
}

.textarea-item {
  flex-direction: column;
  align-items: stretch;
}

.textarea-item .form-label {
  margin-bottom: 16rpx;
}

.reason-input {
  width: 100%;
  min-height: 160rpx;
  padding: 24rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  line-height: 1.5;
}

.textarea-placeholder {
  color: #bbb;
}

.word-count {
  text-align: right;
  font-size: 24rpx;
  color: #bbb;
  margin-top: 12rpx;
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 48rpx;
  margin-top: 32rpx;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.submit-btn.disabled {
  opacity: 0.6;
}

.records-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.records-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.records-list {
  max-height: 600rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #bbb;
}

.record-item {
  padding: 24rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.record-type {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.record-status {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 500;
}

.record-date {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.record-reason {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
  margin-bottom: 12rpx;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}

/* Picker overlay */
.picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.picker-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 28rpx;
  color: #666;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.picker-view {
  height: 400rpx;
}

.picker-item {
  text-align: center;
  line-height: 80rpx;
  font-size: 32rpx;
  color: #333;
}
</style>