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

    <!-- 出勤统计与预警入口 -->
    <view class="action-section">
      <button class="action-btn" @click="goAttendanceWarning">
        <text class="action-icon">📊</text>
        <text class="action-text">出勤统计与预警</text>
      </button>
    </view>

    <!-- 按周考勤 -->
    <view class="section-header">
      <text class="section-title">按周考勤</text>
      <text class="section-desc">每周点名与请假/旷课人数</text>
    </view>
    <view class="week-stats-list" v-if="weeklyStats.length > 0">
      <view v-for="week in weeklyStats" :key="week.weekStart" class="week-stat-row">
        <view class="week-stat-label">
          <text class="week-stat-no">{{ week.weekNo > 0 ? '第' + week.weekNo + '周' : '当周' }}</text>
          <text class="week-stat-date">{{ week.weekStart }}</text>
        </view>
        <view class="week-stat-nums">
          <text class="wsn blue">{{ week.sessions }} 次点名</text>
          <text class="wsn green">{{ week.present }} 出勤</text>
          <text class="wsn orange">{{ week.leave }} 请假</text>
          <text class="wsn red">{{ week.absent }} 旷课</text>
        </view>
      </view>
    </view>
    <view v-else-if="!loading" class="week-stats-empty">
      <text>暂无周考勤数据</text>
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
import { getMySchedule } from '@/api/work/schedule'

export default {
  data() {
    return {
      classList: [],
      weeklyStats: [],
      currentWeek: 0,
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
    formatDateStr(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    buildWeeklyStats(rows) {
      const now = new Date()
      const weekday = now.getDay() === 0 ? 7 : now.getDay()
      const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (weekday - 1))
      const semesterStart = this.currentWeek > 0
        ? new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - (this.currentWeek - 1) * 7)
        : null
      const bucket = {}
      rows.forEach(row => {
        if (!row.checkDate) return
        const text = String(row.checkDate).substring(0, 10)
        const parts = text.split('-').map(Number)
        if (parts.length < 3 || !parts[0]) return
        const date = new Date(parts[0], parts[1] - 1, parts[2])
        const jsDay = date.getDay() === 0 ? 7 : date.getDay()
        const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (jsDay - 1))
        const key = this.formatDateStr(monday)
        if (!bucket[key]) {
          bucket[key] = {
            weekStart: key,
            weekNo: semesterStart ? Math.floor((monday - semesterStart) / 604800000) + 1 : 0,
            sessions: 0,
            present: 0,
            leave: 0,
            absent: 0
          }
        }
        bucket[key].sessions++
        bucket[key].present += Number(row.presentCount || 0)
        bucket[key].leave += Number(row.leaveCount || 0)
        bucket[key].absent += Number(row.absentCount || 0)
      })
      this.weeklyStats = Object.values(bucket).sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    },
    async loadData() {
      this.loading = true
      try {
        const [classesRes, reportRes, scheduleRes] = await Promise.all([
          getTeacherClasses(),
          getTeacherReport({ pageNum: 1, pageSize: 1000 }),
          getMySchedule().catch(() => null)
        ])
        const classes = classesRes.data || []
        const rows = reportRes.rows || []
        const scheduleData = (scheduleRes && scheduleRes.data) || {}
        this.currentWeek = Number(scheduleData.currentWeek || 0)
        this.buildWeeklyStats(rows)

        if (classes.length === 0) {
          this.classList = []
          this.loading = false
          return
        }

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
    },
    goAttendanceWarning() {
      uni.navigateTo({
        url: '/pages/sub-work/attendance-warning/index'
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

.action-section {
  padding: 20rpx;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
}
.action-icon {
  font-size: 32rpx;
}
.action-text {
  font-size: 28rpx;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 20rpx 32rpx 12rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.section-desc {
  font-size: 20rpx;
  color: #94a3b8;
}

.week-stats-list {
  padding: 0 20rpx;
}
.week-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 12rpx;
  padding: 18rpx 22rpx;
  border-radius: 12rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.week-stat-label {
  display: flex;
  flex-direction: column;
}
.week-stat-no {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
}
.week-stat-date {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #94a3b8;
}
.week-stat-nums {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10rpx;
}
.wsn {
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: #f8fafc;
  color: #64748b;
  font-size: 20rpx;

  &.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  &.green {
    background: #f0fdf4;
    color: #16a34a;
  }

  &.orange {
    background: #fffbeb;
    color: #d97706;
  }

  &.red {
    background: #fef2f2;
    color: #dc2626;
  }
}
.week-stats-empty {
  padding: 12rpx 32rpx 20rpx;
  color: #94a3b8;
  font-size: 22rpx;
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
