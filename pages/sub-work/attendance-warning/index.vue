<template>
  <view class="attendance-warning">
    <!-- 顶部统计卡片 -->
    <view class="summary-card">
      <view class="summary-title">出勤统计与预警</view>
      <view class="summary-stats">
        <view class="summary-item">
          <text class="summary-num">{{ statsData.length }}</text>
          <text class="summary-label">学生数</text>
        </view>
        <view class="summary-item">
          <text class="summary-num summary-red">{{ warningCount }}</text>
          <text class="summary-label">预警人数</text>
        </view>
        <view class="summary-item">
          <text class="summary-num summary-orange">{{ generating ? '生成中...' : '点击生成' }}</text>
          <text class="summary-label" @click="handleGenerateWarnings">生成警告</text>
        </view>
      </view>
    </view>

    <!-- 班级选择 -->
    <view class="class-selector" v-if="classList.length > 0">
      <picker mode="selector" :range="classList" range-key="className" @change="onClassChange">
        <view class="picker-btn">
          <text class="picker-label">{{ selectedClass.className || '选择班级' }}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 学生出勤统计列表 -->
    <view class="section-header">
      <text class="section-title">学生出勤明细</text>
      <text class="section-desc">缺勤率≥33%触发预警</text>
    </view>

    <view class="student-list" v-if="statsData.length > 0">
      <view
        v-for="(item, index) in statsData"
        :key="index"
        class="student-card"
        :class="item.isWarning ? 'card-warning' : ''"
      >
        <view class="student-header">
          <view class="student-info">
            <text class="student-name">{{ item.studentName }}</text>
            <text class="student-xh">{{ item.xh }}</text>
          </view>
          <view v-if="item.isWarning" class="warning-badge">
            <text class="badge-text">预警</text>
          </view>
        </view>

        <view class="course-info" v-if="item.courseName">
          <text class="course-label">{{ item.courseName }}</text>
        </view>

        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-num">{{ item.totalLessons || 0 }}</text>
            <text class="stat-label">总课时</text>
          </view>
          <view class="stat-item">
            <text class="stat-num stat-green">{{ (item.totalLessons || 0) - (item.totalAbsent || 0) }}</text>
            <text class="stat-label">出勤</text>
          </view>
          <view class="stat-item">
            <text class="stat-num stat-orange">{{ item.absentLessons || 0 }}</text>
            <text class="stat-label">旷课</text>
          </view>
          <view class="stat-item">
            <text class="stat-num stat-yellow">{{ item.lateLessons || 0 }}</text>
            <text class="stat-label">迟到</text>
          </view>
          <view class="stat-item">
            <text class="stat-num stat-yellow">{{ item.earlyLeaveLessons || 0 }}</text>
            <text class="stat-label">早退</text>
          </view>
        </view>

        <view class="progress-bar">
          <view class="progress-info">
            <text class="progress-label">缺勤率</text>
            <text class="progress-value" :class="getProgressClass(item.absentRatio)">{{ formatRatio(item.absentRatio) }}%</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="'width:' + formatRatio(item.absentRatio) + '%'" :class="getProgressClass(item.absentRatio)"></view>
          </view>
          <view class="threshold-line" style="left: 33%">
            <text class="threshold-text">33%</text>
          </view>
        </view>

        <view class="warning-info" v-if="item.isWarning">
          <text class="warning-text">⚠ 缺勤率超过33%，已触发学业预警</text>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">暂无出勤数据</text>
    </view>

    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions" v-if="statsData.length > 0">
      <button class="action-btn btn-primary" @click="goWarningList">查看警告列表</button>
    </view>
  </view>
</template>

<script>
import { getTeacherClasses, getAttendanceStats, generateWarnings } from '@/api/work/rollcall'

export default {
  data() {
    return {
      classList: [],
      selectedClass: {},
      statsData: [],
      loading: true,
      generating: false
    }
  },
  computed: {
    warningCount() {
      return this.statsData.filter(item => item.isWarning).length
    }
  },
  onLoad() {
    this.loadClasses()
  },
  onPullDownRefresh() {
    this.loadStats().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadClasses() {
      try {
        const res = await getTeacherClasses()
        this.classList = res.data || []
        if (this.classList.length > 0) {
          this.selectedClass = this.classList[0]
          this.loadStats()
        }
      } catch (e) {
        uni.showToast({ title: '加载班级失败', icon: 'none' })
      }
    },
    async loadStats() {
      if (!this.selectedClass.bjdm) return
      this.loading = true
      try {
        const res = await getAttendanceStats({ bjdm: this.selectedClass.bjdm })
        this.statsData = res.data || []
      } catch (e) {
        uni.showToast({ title: '加载统计失败', icon: 'none' })
      }
      this.loading = false
    },
    onClassChange(e) {
      this.selectedClass = this.classList[e.detail.value]
      this.loadStats()
    },
    async handleGenerateWarnings() {
      if (!this.selectedClass.bjdm) {
        uni.showToast({ title: '请先选择班级', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认生成警告',
        content: '将根据出勤统计为缺勤率≥33%的学生生成学业警告，已存在的警告将被更新。',
        success: async (res) => {
          if (res.confirm) {
            this.generating = true
            try {
              const result = await generateWarnings(this.selectedClass.bjdm)
              uni.showToast({ title: `生成${result.data || 0}条警告`, icon: 'none' })
              this.loadStats()
            } catch (e) {
              uni.showToast({ title: '生成失败', icon: 'none' })
            }
            this.generating = false
          }
        }
      })
    },
    formatRatio(ratio) {
      if (!ratio && ratio !== 0) return '0'
      return Math.round(ratio * 100)
    },
    getProgressClass(ratio) {
      if (!ratio && ratio !== 0) return ''
      const percent = ratio * 100
      if (percent >= 50) return 'progress-red'
      if (percent >= 40) return 'progress-orange'
      if (percent >= 33) return 'progress-yellow'
      return 'progress-green'
    },
    goWarningList() {
      uni.navigateTo({
        url: '/pages/sub-work/attendance-warning/warning-list'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.attendance-warning {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 120rpx;
}

.summary-card {
  margin: 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 32rpx;
  color: #fff;
}
.summary-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
}
.summary-stats {
  display: flex;
  justify-content: space-around;
}
.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.summary-num {
  font-size: 36rpx;
  font-weight: 700;
}
.summary-red { color: #ffb3b3; }
.summary-orange { color: #ffd699; }
.summary-label {
  font-size: 22rpx;
  opacity: 0.85;
  margin-top: 8rpx;
}

.class-selector {
  padding: 0 20rpx;
  margin-bottom: 20rpx;
}
.picker-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 24rpx 28rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.picker-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}
.picker-arrow {
  font-size: 24rpx;
  color: #999;
}

.section-header {
  padding: 20rpx 32rpx 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.section-desc {
  font-size: 22rpx;
  color: #999;
}

.student-list {
  padding: 0 20rpx;
}
.student-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.card-warning {
  border-left: 6rpx solid #f44336;
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.student-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
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

.warning-badge {
  background: #f44336;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}
.badge-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 600;
}

.course-info {
  margin-bottom: 16rpx;
}
.course-label {
  font-size: 24rpx;
  color: #666;
}

.stats-grid {
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
.stat-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
}
.stat-green { color: #4caf50; }
.stat-orange { color: #ff9800; }
.stat-yellow { color: #ffc107; }
.stat-label {
  font-size: 20rpx;
  color: #666;
}

.progress-bar {
  position: relative;
  margin-top: 16rpx;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.progress-label {
  font-size: 22rpx;
  color: #666;
}
.progress-value {
  font-size: 24rpx;
  font-weight: 700;
}
.progress-green { color: #4caf50; }
.progress-yellow { color: #ffc107; }
.progress-orange { color: #ff9800; }
.progress-red { color: #f44336; }

.progress-track {
  height: 12rpx;
  background: #e0e0e0;
  border-radius: 6rpx;
  overflow: visible;
  position: relative;
}
.progress-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}
.progress-fill.progress-green { background: #4caf50; }
.progress-fill.progress-yellow { background: #ffc107; }
.progress-fill.progress-orange { background: #ff9800; }
.progress-fill.progress-red { background: #f44336; }

.threshold-line {
  position: absolute;
  top: -20rpx;
  width: 2rpx;
  height: 32rpx;
  background: #999;
}
.threshold-text {
  position: absolute;
  top: -28rpx;
  left: -20rpx;
  font-size: 18rpx;
  color: #999;
}

.warning-info {
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: #fff3e0;
  border-radius: 8rpx;
}
.warning-text {
  font-size: 22rpx;
  color: #ff9800;
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

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx;
  box-shadow: 0 -2rpx 8rpx rgba(0,0,0,0.08);
}
.action-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
</style>
