<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { makeupService } from '../../store/user'
import dayjs from 'dayjs'

// ======== State ========
const formData = ref({
  targetDate: '',
  clockType: 'CHECK_IN',
  reason: ''
})

const records = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const isRecordsRefreshing = ref(false)

// ======== Date Options (past 30 days) ========
const today = dayjs()
const dateRange = (() => {
  const start = today.subtract(30, 'day')
  const end = today.subtract(1, 'day')
  const list = []
  let cur = end
  while (cur.isAfter(start) || cur.isSame(start, 'day')) {
    list.push(cur.format('YYYY-MM-DD'))
    cur = cur.subtract(1, 'day')
  }
  return list
})()

const clockTypeOptions = [
  { label: '上班打卡', value: 'CHECK_IN' },
  { label: '下班打卡', value: 'CHECK_OUT' },
  { label: '上下班', value: 'BOTH' }
]

// ======== Status Map ========
const statusMap = {
  PENDING: { label: '审批中', color: '#faad14', bg: '#fffbe6' },
  APPROVED: { label: '已通过', color: '#52c41a', bg: '#f6ffed' },
  REJECTED: { label: '已驳回', color: '#ff4d4f', bg: '#fff2f0' }
}

const clockTypeLabelMap = {
  CHECK_IN: '上班补卡',
  CHECK_OUT: '下班补卡',
  BOTH: '上下班补卡'
}

// ======== Computed ========
const isFormValid = computed(() => {
  return (
    formData.value.targetDate &&
    formData.value.clockType &&
    formData.value.reason.trim().length >= 5
  )
})

// ======== Picker State ========
const datePickerVisible = ref(false)
const dateIndex = ref(-1)
const clockTypePickerVisible = ref(false)
const clockTypeIndex = ref(0)

// ======== Methods ========
function onDateChange(e) {
  const idx = e.detail.value
  dateIndex.value = idx
  formData.value.targetDate = dateRange[idx]
}

function onClockTypeChange(e) {
  const idx = e.detail.value
  clockTypeIndex.value = idx
  formData.value.clockType = clockTypeOptions[idx].value
}

async function fetchRecords() {
  if (isLoading.value) return
  isLoading.value = true
  try {
    const data = await makeupService.list()
    records.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('fetchRecords error:', err)
    wx.showToast({ title: '加载记录失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

async function onSubmit() {
  if (!isFormValid.value) {
    wx.showToast({ title: '请填写完整信息，理由至少5个字', icon: 'none' })
    return
  }

  isSubmitting.value = true
  try {
    await makeupService.create({
      targetDate: formData.value.targetDate,
      clockType: formData.value.clockType,
      reason: formData.value.reason.trim()
    })
    wx.showToast({ title: '申请提交成功', icon: 'success' })
    // Reset form
    formData.value = { targetDate: '', clockType: 'CHECK_IN', reason: '' }
    dateIndex.value = -1
    clockTypeIndex.value = 0
    // Refresh records
    await fetchRecords()
  } catch (err) {
    console.error('submit error:', err)
    wx.showToast({ title: err.message || '提交失败', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

function onRefresh() {
  isRecordsRefreshing.value = true
  fetchRecords().finally(() => {
    isRecordsRefreshing.value = false
  })
}

// ======== Lifecycle ========
useDidShow(() => {
  fetchRecords()
})

onMounted(() => {
  fetchRecords()
})
</script>

<template>
  <view class="makeup-page">
    <!-- Description Card -->
    <view class="card desc-card">
      <view class="desc-icon">💡</view>
      <view class="desc-content">
        <view class="desc-title">什么是补卡？</view>
        <view class="desc-text">
          忘记打卡时，可在此提交补卡申请。管理员审核通过后，打卡记录将自动补上。
        </view>
      </view>
    </view>

    <!-- Makeup Form -->
    <view class="card form-card">
      <view class="form-title">申请补卡</view>

      <!-- Date Picker -->
      <view class="form-item" @click="datePickerVisible = true">
        <view class="form-label">漏打卡日期</view>
        <view class="form-value" :class="{ placeholder: !formData.targetDate }">
          {{ formData.targetDate || '请选择日期（仅限过去30天）' }}
          <text class="arrow">›</text>
        </view>
      </view>

      <picker
        mode="selector"
        :range="dateRange"
        :value="dateIndex"
        @change="onDateChange"
        :hidden="true"
      >
        <!-- Ghost picker — controlled via overlay click -->
      </picker>

      <view
        v-if="datePickerVisible"
        class="picker-overlay"
        @click="datePickerVisible = false"
      >
        <view class="picker-sheet" @click.stop>
          <view class="picker-toolbar">
            <text class="picker-cancel" @click="datePickerVisible = false">取消</text>
            <text class="picker-confirm" @click="datePickerVisible = false">确定</text>
          </view>
          <picker-view
            class="native-picker"
            :value="[dateIndex >= 0 ? dateIndex : 0]"
            @change="onDateChange"
          >
            <picker-view-column>
              <view
                v-for="(date, idx) in dateRange"
                :key="date"
                class="picker-item"
              >
                {{ dayjs(date).format('YYYY-MM-DD') }}
                ({{ ['周日','周一','周二','周三','周四','周五','周六'][dayjs(date).day()] }})
              </view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>

      <!-- Clock Type Picker -->
      <view class="form-item" @click="clockTypePickerVisible = true">
        <view class="form-label">补卡类型</view>
        <view class="form-value">
          {{ clockTypeOptions.find(o => o.value === formData.clockType)?.label || '请选择' }}
          <text class="arrow">›</text>
        </view>
      </view>

      <view
        v-if="clockTypePickerVisible"
        class="picker-overlay"
        @click="clockTypePickerVisible = false"
      >
        <view class="picker-sheet" @click.stop>
          <view class="picker-toolbar">
            <text class="picker-cancel" @click="clockTypePickerVisible = false">取消</text>
            <text class="picker-confirm" @click="clockTypePickerVisible = false">确定</text>
          </view>
          <picker-view
            class="native-picker"
            :value="[clockTypeIndex]"
            @change="onClockTypeChange"
          >
            <picker-view-column>
              <view
                v-for="opt in clockTypeOptions"
                :key="opt.value"
                class="picker-item"
              >
                {{ opt.label }}
              </view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>

      <!-- Reason -->
      <view class="form-item reason-item">
        <view class="form-label">补卡原因</view>
        <textarea
          class="reason-input"
          v-model="formData.reason"
          placeholder="请详细说明漏打卡原因（至少5个字）"
          :maxlength="200"
          :show-count="true"
        />
      </view>

      <!-- Submit Button -->
      <button
        class="submit-btn"
        :class="{ disabled: !isFormValid || isSubmitting }"
        @click="onSubmit"
        :loading="isSubmitting"
      >
        {{ isSubmitting ? '提交中...' : '提交申请' }}
      </button>
    </view>

    <!-- Records List -->
    <view class="card records-card">
      <view class="records-title">我的补卡记录</view>

      <view class="records-list" v-if="records.length > 0">
        <view
          class="record-item"
          v-for="item in records"
          :key="item.id"
        >
          <view class="record-header">
            <view class="record-type">{{ clockTypeLabelMap[item.clockType] || item.clockType }}</view>
            <view
              class="record-status"
              :style="{ color: statusMap[item.status]?.color, background: statusMap[item.status]?.bg }"
            >
              {{ statusMap[item.status]?.label || item.status }}
            </view>
          </view>

          <view class="record-body">
            <view class="record-row">
              <text class="record-label">申请日期</text>
              <text class="record-value">{{ dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') }}</text>
            </view>
            <view class="record-row">
              <text class="record-label">补卡日期</text>
              <text class="record-value">{{ dayjs(item.targetDate).format('YYYY-MM-DD') }}</text>
            </view>
            <view class="record-row" v-if="item.reason">
              <text class="record-label">申请理由</text>
              <text class="record-value">{{ item.reason }}</text>
            </view>
            <view class="record-row" v-if="item.adminComment">
              <text class="record-label admin-comment-label">审批备注</text>
              <text class="record-value admin-comment-value">{{ item.adminComment }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Empty State -->
      <view class="empty-state" v-else>
        <text>暂无补卡记录</text>
      </view>
    </view>
  </view>
</template>

<script>
// Taro page config
export default {
  enablePullDownRefresh: true,
  backgroundTextStyle: 'dark'
}
</script>

<style scoped>
.makeup-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 16px;
  padding-bottom: 40px;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* Description Card */
.desc-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.desc-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}
.desc-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}
.desc-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* Form Card */
.form-title,
.records-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}
.form-item:last-of-type {
  border-bottom: none;
}

.form-label {
  font-size: 15px;
  color: #333;
  font-weight: 500;
  flex-shrink: 0;
}
.form-value {
  font-size: 15px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 60%;
  justify-content: flex-end;
  text-align: right;
}
.form-value.placeholder {
  color: #bfbfbf;
}
.arrow {
  color: #bfbfbf;
  font-size: 16px;
}

.reason-item {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.reason-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  min-height: 80px;
  background: #fafafa;
}

.submit-btn {
  width: 100%;
  margin-top: 20px;
  background: linear-gradient(135deg, #5b8af0, #4a75e8);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  padding: 14px 0;
  border: none;
  line-height: 1;
}
.submit-btn.disabled {
  background: #d9d9d9;
  color: #fff;
}
.submit-btn::after {
  border: none;
}

/* Picker Overlay */
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.picker-sheet {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}
.picker-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 20px;
  border-bottom: 1px solid #f0f0f0;
}
.picker-cancel {
  color: #999;
  font-size: 15px;
}
.picker-confirm {
  color: #5b8af0;
  font-size: 15px;
  font-weight: 600;
}
.native-picker {
  height: 200px;
}
.picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #333;
}

/* Records */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  background: #fafafa;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.record-type {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.record-status {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.record-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.record-label {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
  width: 70px;
}
.record-value {
  font-size: 13px;
  color: #555;
  flex: 1;
  word-break: break-all;
}
.admin-comment-label {
  color: #ff7875;
}
.admin-comment-value {
  color: #ff4d4f;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #bfbfbf;
  font-size: 14px;
}
</style>