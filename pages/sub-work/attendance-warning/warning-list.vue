<template>
  <view class="warning-list">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <picker mode="selector" :range="warningTypes" range-key="label" @change="onTypeChange">
        <view class="filter-btn">
          <text class="filter-label">{{ selectedType.label || '全部类型' }}</text>
          <text class="filter-arrow">▼</text>
        </view>
      </picker>
      <picker mode="selector" :range="warningLevels" range-key="label" @change="onLevelChange">
        <view class="filter-btn">
          <text class="filter-label">{{ selectedLevel.label || '全部级别' }}</text>
          <text class="filter-arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 警告列表 -->
    <view class="list-container" v-if="warningList.length > 0">
      <view
        v-for="(item, index) in warningList"
        :key="index"
        class="warning-card"
        :class="'level-' + item.warningLevel"
      >
        <view class="card-header">
          <view class="level-badge" :class="'badge-' + item.warningLevel">
            <text class="badge-text">{{ getLevelText(item.warningLevel) }}</text>
          </view>
          <text class="warning-type">{{ getTypeText(item.warningType) }}</text>
          <text class="warning-date">{{ formatDate(item.warningDate) }}</text>
        </view>

        <view class="student-info">
          <text class="student-name">{{ item.studentName }}</text>
          <text class="student-xh">{{ item.xh }}</text>
          <text class="class-name">{{ item.className }}</text>
        </view>

        <view class="course-info" v-if="item.courseName">
          <text class="course-label">课程：</text>
          <text class="course-name">{{ item.courseName }}</text>
        </view>

        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-label">总课时</text>
            <text class="stat-value">{{ item.totalHours || 0 }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">缺勤</text>
            <text class="stat-value stat-red">{{ item.absentHours || 0 }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">缺勤率</text>
            <text class="stat-value" :class="'level-' + item.warningLevel">{{ formatAbsentRate(item) }}%</text>
          </view>
        </view>

        <view class="warning-content" v-if="item.warningReason">
          <text class="reason-text">{{ item.warningReason }}</text>
        </view>

        <view class="card-footer">
          <view class="status-info">
            <text class="status-label">状态：</text>
            <text class="status-value" :class="item.isConfirmed ? 'confirmed' : 'pending'">
              {{ item.isConfirmed ? '已确认' : '待确认' }}
            </text>
          </view>
          <button
            v-if="!item.isConfirmed"
            class="confirm-btn"
            size="mini"
            @click="handleConfirm(item)"
          >
            确认
          </button>
          <text v-else class="confirmed-time">{{ formatDate(item.confirmedTime) }}</text>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">暂无警告记录</text>
    </view>

    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 确认弹窗 -->
    <u-modal
      v-model="showConfirmModal"
      title="确认警告"
      content="确认已通知该学生并对其采取相应措施？"
      show-cancel-button
      @confirm="submitConfirm"
      @cancel="showConfirmModal = false"
    ></u-modal>
  </view>
</template>

<script>
import { getWarningList, confirmWarning } from '@/api/work/rollcall'

export default {
  data() {
    return {
      warningList: [],
      loading: true,
      showConfirmModal: false,
      currentWarning: null,
      warningTypes: [
        { value: '', label: '全部类型' },
        { value: 'attendance', label: '出勤警告' },
        { value: 'academic', label: '学业警告' },
        { value: 'discipline', label: '纪律警告' },
        { value: 'behavior', label: '行为警告' }
      ],
      selectedType: { value: '', label: '全部类型' },
      warningLevels: [
        { value: '', label: '全部级别' },
        { value: 'yellow', label: '黄色预警' },
        { value: 'orange', label: '橙色警告' },
        { value: 'red', label: '红色警告' }
      ],
      selectedLevel: { value: '', label: '全部级别' }
    }
  },
  onLoad() {
    this.loadWarnings()
  },
  onPullDownRefresh() {
    this.loadWarnings().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadWarnings() {
      this.loading = true
      try {
        const params = {
          pageNum: 1,
          pageSize: 100
        }
        if (this.selectedType.value) {
          params.warningType = this.selectedType.value
        }
        if (this.selectedLevel.value) {
          params.warningLevel = this.selectedLevel.value
        }
        const res = await getWarningList(params)
        this.warningList = res.rows || []
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
      this.loading = false
    },
    onTypeChange(e) {
      this.selectedType = this.warningTypes[e.detail.value]
      this.loadWarnings()
    },
    onLevelChange(e) {
      this.selectedLevel = this.warningLevels[e.detail.value]
      this.loadWarnings()
    },
    handleConfirm(item) {
      this.currentWarning = item
      this.showConfirmModal = true
    },
    async submitConfirm() {
      if (!this.currentWarning) return
      try {
        await confirmWarning({
          id: this.currentWarning.id,
          confirmRemark: '已确认'
        })
        uni.showToast({ title: '确认成功', icon: 'success' })
        this.showConfirmModal = false
        this.loadWarnings()
      } catch (e) {
        uni.showToast({ title: '确认失败', icon: 'none' })
      }
    },
    getLevelText(level) {
      const map = {
        'yellow': '黄色预警',
        'orange': '橙色警告',
        'red': '红色警告'
      }
      return map[level] || level
    },
    getTypeText(type) {
      const map = {
        'attendance': '出勤警告',
        'academic': '学业警告',
        'discipline': '纪律警告',
        'behavior': '行为警告'
      }
      return map[type] || type
    },
    formatAbsentRate(item) {
      if (!item.totalHours || item.totalHours === 0) return 0
      return Math.round((item.absentHours / item.totalHours) * 100)
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
}
</script>

<style lang="scss" scoped>
.warning-list {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 40rpx;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  background: #fff;
  margin-bottom: 20rpx;
}
.filter-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #f0f2f5;
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
  flex: 1;
}
.filter-label {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}
.filter-arrow {
  font-size: 20rpx;
  color: #999;
}

.list-container {
  padding: 0 20rpx;
}

.warning-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  border-left: 6rpx solid #e0e0e0;
}
.warning-card.level-yellow {
  border-left-color: #ffc107;
}
.warning-card.level-orange {
  border-left-color: #ff9800;
}
.warning-card.level-red {
  border-left-color: #f44336;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.level-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}
.badge-yellow {
  background: #fff3e0;
}
.badge-orange {
  background: #ffe0b2;
}
.badge-red {
  background: #ffcdd2;
}
.badge-text {
  font-size: 20rpx;
  font-weight: 600;
}
.badge-yellow .badge-text {
  color: #f57c00;
}
.badge-orange .badge-text {
  color: #ef6c00;
}
.badge-red .badge-text {
  color: #c62828;
}

.warning-type {
  font-size: 24rpx;
  color: #666;
}
.warning-date {
  font-size: 22rpx;
  color: #999;
  margin-left: auto;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}
.student-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.student-xh {
  font-size: 22rpx;
  color: #999;
}
.class-name {
  font-size: 22rpx;
  color: #666;
}

.course-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.course-label {
  font-size: 24rpx;
  color: #666;
}
.course-name {
  font-size: 24rpx;
  color: #333;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  background: #f8f9fa;
  border-radius: 8rpx;
  padding: 16rpx 0;
  margin-bottom: 16rpx;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.stat-label {
  font-size: 20rpx;
  color: #666;
}
.stat-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
}
.stat-red {
  color: #f44336;
}
.stat-value.level-yellow {
  color: #ffc107;
}
.stat-value.level-orange {
  color: #ff9800;
}
.stat-value.level-red {
  color: #f44336;
}

.warning-content {
  padding: 12rpx 16rpx;
  background: #fff3e0;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}
.reason-text {
  font-size: 22rpx;
  color: #ff9800;
  line-height: 1.6;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}
.status-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.status-label {
  font-size: 22rpx;
  color: #666;
}
.status-value {
  font-size: 24rpx;
  font-weight: 600;
}
.status-value.confirmed {
  color: #4caf50;
}
.status-value.pending {
  color: #ff9800;
}

.confirm-btn {
  background: #667eea;
  color: #fff;
  font-size: 22rpx;
  padding: 8rpx 24rpx;
  border-radius: 6rpx;
}
.confirmed-time {
  font-size: 20rpx;
  color: #999;
}

.empty-state, .loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}
.empty-text, .loading-text {
  font-size: 28rpx;
  color: #999;
}
</style>
