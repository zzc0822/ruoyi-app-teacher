<template>
  <view class="attendance-summary">
    <!-- 顶部汇总卡片 -->
    <view class="summary-card">
      <view class="summary-title">本学期考勤汇总</view>
      <view class="summary-stats">
        <view class="summary-item">
          <text class="summary-num">{{ summary.totalClasses }}</text>
          <text class="summary-label">班级数</text>
        </view>
        <view class="summary-item">
          <text class="summary-num">{{ summary.totalChecks }}</text>
          <text class="summary-label">点名次数</text>
        </view>
        <view class="summary-item">
          <text class="summary-num summary-green">{{ summary.totalPresent }}</text>
          <text class="summary-label">出勤人次</text>
        </view>
        <view class="summary-item">
          <text class="summary-num summary-red">{{ summary.totalAbsent }}</text>
          <text class="summary-label">缺勤人次</text>
        </view>
      </view>
    </view>

    <!-- 班级列表 -->
    <view class="section-header">
      <text class="section-title">各班级考勤明细</text>
    </view>

    <view class="class-list" v-if="classList.length > 0">
      <view
        v-for="(cls, index) in classList"
        :key="index"
        class="class-card"
        @click="goClassDetail(cls)"
      >
        <view class="class-header">
          <view class="class-info">
            <text class="class-name">{{ cls.className || '未知班级' }}</text>
            <text class="course-name">{{ cls.courseName || '' }}</text>
          </view>
          <view class="class-arrow">›</view>
        </view>
        <view class="class-stats">
          <view class="stat-chip">
            <text class="stat-num">{{ cls.checkCount || 0 }}</text>
            <text class="stat-label">点名</text>
          </view>
          <view class="stat-chip stat-green">
            <text class="stat-num">{{ cls.presentCount || 0 }}</text>
            <text class="stat-label">出勤</text>
          </view>
          <view class="stat-chip stat-orange">
            <text class="stat-num">{{ cls.leaveCount || 0 }}</text>
            <text class="stat-label">请假</text>
          </view>
          <view class="stat-chip stat-red">
            <text class="stat-num">{{ cls.absentCount || 0 }}</text>
            <text class="stat-label">缺勤</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">暂无考勤数据</text>
    </view>

    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script>
import { getTeacherClasses, getTeacherReport } from '@/api/work/rollcall'

export default {
  data() {
    return {
      classList: [],
      summary: {
        totalClasses: 0,
        totalChecks: 0,
        totalPresent: 0,
        totalAbsent: 0
      },
      loading: true
    }
  },
  onLoad() {
    this.loadData()
  },
  onPullDownRefresh() {
    this.loadData().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const classesRes = await getTeacherClasses()
        const classes = classesRes.data || []
        
        if (classes.length === 0) {
          this.classList = []
          this.loading = false
          return
        }

        const reportRes = await getTeacherReport({ pageNum: 1, pageSize: 1000 })
        const rows = reportRes.rows || []

        const classMap = {}
        classes.forEach(cls => {
          classMap[cls.bjdm] = {
            bjdm: cls.bjdm,
            className: cls.className,
            courseName: cls.courseName,
            checkCount: 0,
            presentCount: 0,
            leaveCount: 0,
            absentCount: 0
          }
        })

        rows.forEach(row => {
          const bjdm = row.bjdm
          if (classMap[bjdm]) {
            classMap[bjdm].checkCount++
            classMap[bjdm].presentCount += (row.presentCount || 0)
            classMap[bjdm].leaveCount += (row.leaveCount || 0)
            classMap[bjdm].absentCount += (row.absentCount || 0)
          }
        })

        this.classList = Object.values(classMap)
        
        this.summary.totalClasses = this.classList.length
        this.summary.totalChecks = this.classList.reduce((sum, c) => sum + (c.checkCount || 0), 0)
        this.summary.totalPresent = this.classList.reduce((sum, c) => sum + (c.presentCount || 0), 0)
        this.summary.totalAbsent = this.classList.reduce((sum, c) => sum + (c.absentCount || 0), 0)
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
      this.loading = false
    },
    goClassDetail(cls) {
      uni.navigateTo({
        url: `/pages/sub-work/attendance-summary/detail?bjdm=${cls.bjdm}&className=${encodeURIComponent(cls.className || '')}&courseName=${encodeURIComponent(cls.courseName || '')}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.attendance-summary {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 40rpx;
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
  font-size: 40rpx;
  font-weight: 700;
}
.summary-green { color: #a8e6cf; }
.summary-red { color: #ffb3b3; }
.summary-label {
  font-size: 22rpx;
  opacity: 0.85;
  margin-top: 8rpx;
}

.section-header {
  padding: 20rpx 32rpx 12rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.class-list {
  padding: 0 20rpx;
}
.class-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.class-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.class-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.course-name {
  font-size: 24rpx;
  color: #888;
}
.class-arrow {
  font-size: 32rpx;
  color: #999;
  font-weight: 300;
}

.class-stats {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}
.stat-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #f0f2f5;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}
.stat-chip.stat-green { background: #e8f5e9; }
.stat-chip.stat-orange { background: #fff3e0; }
.stat-chip.stat-red { background: #ffebee; }
.stat-num {
  font-weight: 600;
  font-size: 24rpx;
}
.stat-green .stat-num { color: #4caf50; }
.stat-orange .stat-num { color: #ff9800; }
.stat-red .stat-num { color: #f44336; }
.stat-label {
  color: #666;
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
