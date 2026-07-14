<template>
  <view class="schedule-page">
    <!-- 周次选择 -->
    <view class="week-selector">
      <view class="week-arrow" @click="prevWeek">‹</view>
      <text v-if="isHoliday" class="week-title holiday-title">假期中</text>
      <text v-else class="week-title">第 {{ currentWeek }} 教学周</text>
      <view class="week-arrow" @click="nextWeek">›</view>
    </view>
    <view v-if="semesterName" class="semester-info">
      <text>{{ semesterName }}{{ totalWeeks ? ' · 共' + totalWeeks + '周' : '' }}</text>
    </view>

    <!-- 表头 -->
    <view class="header-row">
      <view class="col-section header-cell">
        <text class="header-text">节次</text>
      </view>
      <view
        v-for="day in dayList"
        :key="day"
        class="col-day header-cell"
        :class="{ 'today-col': isToday(day) }"
      >
        <text class="header-text">{{ weekLabels[day - 1] }}</text>
        <text class="header-date">{{ getDayDate(day) }}</text>
      </view>
    </view>

    <!-- 课表主体 -->
    <view class="body-row">
      <!-- 左侧节次列 -->
      <view class="col-section">
        <view
          v-for="section in sectionList"
          :key="section"
          class="section-cell"
          :style="{ height: CELL_HEIGHT + 'rpx' }"
        >
          <text class="section-num">{{ section }}</text>
          <text class="section-time">{{ getSectionTime(section) }}</text>
        </view>
      </view>
      <!-- 右侧每天列 -->
      <view
        v-for="day in dayList"
        :key="day"
        class="col-day"
        :class="{ 'today-col': isToday(day) }"
      >
        <view
          v-for="item in getDayCells(day)"
          :key="item.key"
          class="day-cell"
          :style="{ height: item.height + 'rpx' }"
          @click="onCourseClick(item.course)"
        >
          <view v-if="item.course" class="course-block">
            <text class="course-name">{{ item.course.courseName }}</text>
            <text class="course-meta">{{ item.course._combined ? item.course.className : getClassShortName(item.course.className) }}</text>
            <text class="course-meta">{{ item.course.classroom || '待定' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="myScheduleList.length === 0" class="empty-state">
      <text class="empty-text">暂无课表数据</text>
    </view>

    <!-- 课程详情弹窗 -->
    <view v-if="coursePopup.visible" class="popup-mask" @click="coursePopup.visible = false">
      <view class="popup-card" @click.stop>
        <!-- 顶部渐变头 -->
        <view class="popup-header">
          <text class="popup-course-name">{{ coursePopup.courseName }}</text>
          <view class="popup-close" @click="coursePopup.visible = false">✕</view>
        </view>
        <!-- 信息区 -->
        <view class="popup-body">
          <view class="popup-info-row">
            <text class="popup-icon">📚</text>
            <text class="popup-label">班级</text>
            <text class="popup-value">{{ coursePopup.className || '-' }}</text>
          </view>
          <view class="popup-info-row">
            <text class="popup-icon">🕐</text>
            <text class="popup-label">节次</text>
            <text class="popup-value">第{{ coursePopup.startSection }}-{{ coursePopup.endSection }}节{{ coursePopup.timeRange ? '（' + coursePopup.timeRange + '）' : '' }}</text>
          </view>
          <view class="popup-info-row">
            <text class="popup-icon">📍</text>
            <text class="popup-label">教室</text>
            <text class="popup-value">{{ coursePopup.classroom || '待定' }}</text>
          </view>
          <view class="popup-info-row" v-if="coursePopup.teacherName">
            <text class="popup-icon">👤</text>
            <text class="popup-label">教师</text>
            <text class="popup-value">{{ coursePopup.teacherName }}</text>
          </view>
          <view class="popup-info-row" v-if="coursePopup.totalStudents > 0">
            <text class="popup-icon">👥</text>
            <text class="popup-label">应到</text>
            <text class="popup-value highlight-blue">{{ coursePopup.totalStudents }}人</text>
          </view>
          <view class="popup-info-row" v-if="coursePopup.totalStudents > 0">
            <text class="popup-icon">📝</text>
            <text class="popup-label">请假</text>
            <text class="popup-value highlight-orange">{{ coursePopup.leaveCount }}人{{ coursePopup.leaveNames ? '，' + coursePopup.leaveNames : '' }}</text>
          </view>
          <!-- 点名按钮 -->
          <view class="popup-actions">
            <view class="btn-rollcall" @click="goRollCall">
              <text>{{ coursePopup.hasChecked ? '📋 查看点名' : '📋 开始点名' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMySchedule, getActiveSchedule } from '@/api/work/schedule'
import { getLeaveStudents } from '@/api/work/classcheck'
import { getCheckStatus } from '@/api/work/rollcall'
import { getClassShortName } from '@/utils/common'

// 后端作息时间未配置时的兜底时间表
const FALLBACK_TIMES = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:30', end: '15:15' },
  { start: '15:25', end: '16:10' },
  { start: '16:20', end: '17:05' },
  { start: '17:15', end: '18:00' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:50', end: '21:35' },
  { start: '21:45', end: '22:30' }
]

export default {
  data() {
    return {
      CELL_HEIGHT: 100,
      weekLabels: ['一', '二', '三', '四', '五', '六', '日'],
      dayList: [1, 2, 3, 4, 5, 6, 7],
      myScheduleList: [],
      currentWeek: 1,
      realCurrentWeek: 1,
      totalWeeks: 0,
      semesterName: '',
      isHoliday: false,
      displayWeekOffset: 0,
      todayStr: '',
      maxSections: 12,
      // 后端作息时间表: [{ lessonNo, startTime, endTime }, ...]
      sectionTimes: [],
      coursePopup: {
        visible: false,
        _course: null,
        hasChecked: false,
        courseName: '',
        className: '',
        startSection: '',
        endSection: '',
        timeRange: '',
        classroom: '',
        teacherName: '',
        totalStudents: 0,
        leaveCount: 0,
        leaveNames: ''
      }
    }
  },
  computed: {
    sectionList() {
      const arr = []
      for (let i = 1; i <= this.maxSections; i++) {
        arr.push(i)
      }
      return arr
    }
  },
  onLoad() {
    const now = new Date()
    this.todayStr = this.formatDateStr(now)
    this.loadScheduleTimes()
    this.loadSchedule()
  },
  methods: {
    // 班级简称（模板中调用）
    getClassShortName(name) {
      return getClassShortName(name)
    },
    // 从后端加载作息时间
    loadScheduleTimes() {
      getActiveSchedule(this.todayStr).then(res => {
        const scheme = res.data
        if (scheme && scheme.detailList && scheme.detailList.length > 0) {
          // 按 lessonNo 排序
          const sorted = scheme.detailList.sort((a, b) => Number(a.lessonNo) - Number(b.lessonNo))
          this.sectionTimes = sorted.map(d => ({
            start: d.startTime,
            end: d.endTime
          }))
          // 如果作息时间表定义了课节数，用它
          if (this.sectionTimes.length > 0) {
            this.maxSections = this.sectionTimes.length
          }
        }
      }).catch(() => {
        // 后端未配置作息时间，使用兜底
        this.sectionTimes = []
      })
    },
    loadSchedule() {
      getMySchedule().then(res => {
        const data = res.data || {}
        let list = []
        if (Array.isArray(data)) {
          list = data
        } else {
          list = data.scheduleList || []
        }
        // 过滤掉 startSection < 1 的无效数据
        this.myScheduleList = list.filter(c => Number(c.startSection) >= 1)
        // 使用后端返回的教学周次
        const apiWeek = data.currentWeek
        if (apiWeek && apiWeek > 0) {
          this.currentWeek = apiWeek
          this.realCurrentWeek = apiWeek
          this.isHoliday = false
        } else {
          this.currentWeek = 0
          this.realCurrentWeek = 0
          this.isHoliday = true
        }
        this.displayWeekOffset = 0
        this.totalWeeks = data.totalWeeks || 0
        this.semesterName = data.semesterName || ''
        this.calculateMaxSections()
      }).catch(() => {
        this.myScheduleList = []
        this.isHoliday = true
      })
    },
    calculateMaxSections() {
      // 如果后端作息时间表有数据，以它为准
      if (this.sectionTimes.length > 0) {
        let max = this.sectionTimes.length
        this.myScheduleList.forEach(c => {
          const end = Number(c.endSection)
          if (end > max) max = end
        })
        this.maxSections = max
        return
      }
      let max = 12
      this.myScheduleList.forEach(c => {
        const end = Number(c.endSection)
        if (end > max) max = end
      })
      this.maxSections = max
    },

    // 获取第 section 节的时间信息
    getTimeForSection(section) {
      const idx = section - 1
      if (this.sectionTimes.length > 0 && this.sectionTimes[idx]) {
        return this.sectionTimes[idx]
      }
      return FALLBACK_TIMES[idx] || null
    },
    getDayCells(day) {
      let courses = this.myScheduleList
        .filter(c => Number(c.weekday) === day && Number(c.startSection) >= 1)
        .sort((a, b) => Number(a.startSection) - Number(b.startSection))
      // 合并合班课：同一课程、同一节次合并为一个块
      const merged = []
      const used = new Set()
      courses.forEach((course, idx) => {
        if (used.has(idx)) return
        const group = [course]
        courses.forEach((other, otherIdx) => {
          if (otherIdx <= idx || used.has(otherIdx)) return
          if (other.courseName === course.courseName &&
              Number(other.startSection) === Number(course.startSection) &&
              Number(other.endSection) === Number(course.endSection)) {
            group.push(other)
            used.add(otherIdx)
          }
        })
        if (group.length > 1) {
          // 合班课：合并为一个课程块
          const base = { ...course }
          base._combined = group
          base._bjdmList = group.map(c => c.bjdm).filter(b => b)
          base.className = group.map(c => getClassShortName(c.className)).filter(n => n).join('、')
          base.classCount = group.reduce((sum, c) => sum + (c.classCount || 0), 0)
          merged.push(base)
        } else {
          merged.push(course)
        }
      })
      const cells = []
      let currentSection = 1
      merged.forEach((course, idx) => {
        const start = Number(course.startSection)
        const end = Math.min(Number(course.endSection), this.maxSections)
        while (currentSection < start) {
          cells.push({ key: 'empty_' + currentSection, course: null, height: this.CELL_HEIGHT })
          currentSection++
        }
        const span = end - start + 1
        cells.push({ key: 'course_' + idx, course: course, height: span * this.CELL_HEIGHT })
        currentSection = end + 1
      })
      while (currentSection <= this.maxSections) {
        cells.push({ key: 'empty_' + currentSection, course: null, height: this.CELL_HEIGHT })
        currentSection++
      }
      return cells
    },
    getSectionTime(section) {
      const t = this.getTimeForSection(section)
      return t ? t.start : ''
    },
    getCourseTimeRange(course) {
      const startT = this.getTimeForSection(Number(course.startSection))
      const endT = this.getTimeForSection(Number(course.endSection))
      if (startT && endT) return startT.start + '-' + endT.end
      return ''
    },
    isToday(day) {
      // 只有显示当前周时才高亮今天
      if (this.displayWeekOffset !== 0) return false
      const now = new Date()
      const jsDay = now.getDay()
      const weekday = jsDay === 0 ? 7 : jsDay
      return day === weekday
    },
    getDayDate(day) {
      const now = new Date()
      const jsDay = now.getDay()
      const weekday = jsDay === 0 ? 7 : jsDay
      const dayOffset = day - weekday
      // 加上教学周偏移量（每周7天）
      const totalOffset = dayOffset + this.displayWeekOffset * 7
      const target = new Date(now.getTime() + totalOffset * 86400000)
      return (target.getMonth() + 1) + '/' + target.getDate()
    },
    formatDateStr(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return y + '-' + m + '-' + d
    },
    // 跳转到点名页面
    goRollCall() {
      const p = this.coursePopup
      const course = this.coursePopup._course
      if (!course) return
      // 计算上课日期
      const dateStr = this.getWeekdayDateStr(course.weekday)
      const params = {
        bjdm: course.bjdm || '',
        className: p.className || '',
        courseName: p.courseName || '',
        classroom: p.classroom || '',
        checkDate: dateStr,
        startSection: course.startSection || '',
        endSection: course.endSection || '',
        weekday: course.weekday || ''
      }
      // 合班课传递多个bjdm
      if (course._combined && course._combined.length > 1) {
        params.bjdmList = JSON.stringify(course._bjdmList || [])
        params.classNames = p.className || ''
      }
      const queryStr = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&')
      uni.navigateTo({ url: '/pages/sub-work/rollcall/index?' + queryStr })
    },
    onCourseClick(course) {
      if (!course) return
      const timeRange = this.getCourseTimeRange(course)
      const isCombined = course._combined && course._combined.length > 1
      
      this.coursePopup = {
        visible: true,
        _course: course,
        courseName: course.courseName || '',
        className: isCombined ? course.className : getClassShortName(course.className || ''),
        startSection: course.startSection || '',
        endSection: course.endSection || '',
        timeRange: timeRange,
        classroom: course.classroom || '',
        teacherName: course.teacherName || '',
        totalStudents: course.classCount || 0,
        leaveCount: 0,
        leaveNames: ''
      }
      
      // 异步加载请假人数
      const bjdmList = isCombined
        ? (course._bjdmList || [])
        : (course.bjdm ? [course.bjdm] : [])
      
      if (bjdmList.length > 0) {
        const dateStr = this.getWeekdayDateStr(course.weekday)
        const leavePromises = bjdmList.map(bjdm => 
          getLeaveStudents(bjdm, dateStr).catch(() => ({ data: [] }))
        )
        Promise.all(leavePromises).then(results => {
          let allLeaves = []
          results.forEach(res => {
            const leaves = res.data || []
            if (Array.isArray(leaves)) {
              allLeaves = allLeaves.concat(leaves)
            }
          })
          this.coursePopup.leaveCount = allLeaves.length
          this.coursePopup.leaveNames = allLeaves
            .map(l => l.studentName || l.xm || '')
            .filter(n => n)
            .join('、')
        })
      }
      // 检查是否已点名（需要有bjdm才能查询）
      const checkBjdm = course.bjdm || (course._bjdmList && course._bjdmList[0]) || ''
      if (checkBjdm) {
        const checkDateStr = this.getWeekdayDateStr(course.weekday)
        getCheckStatus(checkBjdm, checkDateStr, Number(course.startSection)).then(res => {
          this.coursePopup.hasChecked = !!res.data
        }).catch(() => {
          this.coursePopup.hasChecked = false
        })
      } else {
        this.coursePopup.hasChecked = false
      }
    },
    // 根据星期几计算对应的日期字符串
    getWeekdayDateStr(weekday) {
      const now = new Date()
      const jsDay = now.getDay()
      const currentWeekday = jsDay === 0 ? 7 : jsDay
      const dayOffset = weekday - currentWeekday + this.displayWeekOffset * 7
      const target = new Date(now.getTime() + dayOffset * 86400000)
      const y = target.getFullYear()
      const m = String(target.getMonth() + 1).padStart(2, '0')
      const d = String(target.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    prevWeek() {
      this.displayWeekOffset--
      if (this.isHoliday) {
        // 假期中往前切：尝试回到最后一个教学周
        if (this.totalWeeks > 0) {
          this.currentWeek = this.totalWeeks
          this.isHoliday = false
        }
        return
      }
      this.currentWeek--
      if (this.currentWeek < 1) {
        this.currentWeek = 0
        this.isHoliday = true
      }
    },
    nextWeek() {
      this.displayWeekOffset++
      if (this.isHoliday) {
        // 假期中往后切：尝试进入第1教学周
        this.currentWeek = 1
        this.isHoliday = false
        return
      }
      this.currentWeek++
      if (this.totalWeeks > 0 && this.currentWeek > this.totalWeeks) {
        this.isHoliday = true
        this.currentWeek = 0
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.schedule-page {
  min-height: 100vh;
  background: #f5f6f7;
}

.week-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  background: #fff;
  border-bottom: 1rpx solid #eee;

  .week-arrow {
    font-size: 48rpx;
    color: #2979ff;
    padding: 0 40rpx;
  }

  .week-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }

  .holiday-title {
    color: #ff9800;
  }
}

.semester-info {
  display: flex;
  justify-content: center;
  padding: 8rpx 0;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  font-size: 22rpx;
  color: #999;
}

/* 表头行 */
.header-row {
  display: flex;
  background: #fff;
}

.header-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14rpx 0;
  background: #fafafa;
  border-bottom: 2rpx solid #e0e0e0;
}

.header-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
}

.header-date {
  font-size: 18rpx;
  color: #999;
  margin-top: 2rpx;
}

/* 主体行 */
.body-row {
  display: flex;
}

/* 通用列样式 */
.col-section {
  width: 60rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
}

.col-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-left: 1rpx solid #f0f0f0;
}

.today-col {
  background: #eef4ff;
}

/* 节次单元格 */
.section-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid #f0f0f0;
  box-sizing: border-box;

  .section-num {
    font-size: 26rpx;
    font-weight: 600;
    color: #667eea;
  }

  .section-time {
    font-size: 16rpx;
    color: #aaa;
    margin-top: 2rpx;
  }
}

/* 课程单元格 */
.day-cell {
  display: flex;
  flex-direction: column;
  border-bottom: 1rpx solid #f0f0f0;
  box-sizing: border-box;
  overflow: hidden;
}

.course-block {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6rpx;
  margin: 2rpx;
  padding: 8rpx 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .course-name {
    font-size: 22rpx;
    font-weight: 700;
    color: #fff;
    line-height: 1.2;
    text-align: center;
    word-break: break-all;
    white-space: normal;
  }

  .course-meta {
    font-size: 16rpx;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 2rpx;
    line-height: 1.1;
    text-align: center;
    word-break: break-all;
    white-space: normal;
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: #ccc;
  }
}

/* 课程详情弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-card {
  width: 620rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
}

.popup-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 36rpx 32rpx 30rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  .popup-course-name {
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
    flex: 1;
    line-height: 1.3;
    word-break: break-all;
  }

  .popup-close {
    font-size: 32rpx;
    color: rgba(255, 255, 255, 0.7);
    margin-left: 16rpx;
    padding: 4rpx 8rpx;
    flex-shrink: 0;
  }
}

.popup-body {
  padding: 28rpx 32rpx 36rpx;
}

.popup-info-row {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  .popup-icon {
    font-size: 32rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
  }

  .popup-label {
    font-size: 26rpx;
    color: #999;
    width: 80rpx;
    flex-shrink: 0;
  }

  .popup-value {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
    flex: 1;
    word-break: break-all;
  }

  .highlight-blue {
    color: #2979ff;
    font-weight: 700;
  }

  .highlight-orange {
    color: #ff9800;
    font-weight: 700;
  }
}

.popup-actions {
  margin-top: 28rpx;
  display: flex;
  justify-content: center;
}

.btn-rollcall {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  padding: 18rpx 60rpx;
  border-radius: 40rpx;
  text-align: center;
}
</style>
