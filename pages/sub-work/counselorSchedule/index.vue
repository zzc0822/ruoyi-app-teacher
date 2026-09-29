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

    <!-- 班级选择器 -->
    <view class="class-selector-card">
      <view class="selector-header">
        <text class="selector-title">班级选择</text>
        <view class="selection-mode">
          <text :class="['mode-btn', selectMode === 'single' ? 'active' : '']" @click="selectMode = 'single'">单选</text>
          <text :class="['mode-btn', selectMode === 'multi' ? 'active' : '']" @click="selectMode = 'multi'">多选</text>
        </view>
      </view>
      
      <!-- 单选模式 -->
      <view v-if="selectMode === 'single'" class="single-select">
        <picker mode="selector" :range="classList" range-key="className" @change="onClassChange">
          <view class="picker-style">
            <text class="picker-text">{{ selectedClass ? selectedClass.className : '请选择班级' }}</text>
            <uni-icons type="bottom" size="12" color="#999"></uni-icons>
          </view>
        </picker>
      </view>

      <!-- 多选模式 -->
      <view v-if="selectMode === 'multi'" class="multi-select">
        <scroll-view scroll-y class="class-scroll-list">
          <view 
            v-for="(cls, idx) in classList" 
            :key="idx"
            class="class-item"
            :class="{ selected: selectedClasses.includes(cls.bjdm) }"
            @click="toggleClassSelection(cls.bjdm)"
          >
            <uni-icons :type="selectedClasses.includes(cls.bjdm) ? 'checkbox-filled' : 'circle"' :size="20" color="#2979ff"></uni-icons>
            <text class="class-name">{{ cls.className || cls.bjname }}</text>
            <text class="class-count">{{ cls.bcrs || 0 }}人</text>
          </view>
        </scroll-view>
      </view>
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
          <view 
            v-if="item.course" 
            class="course-block"
            :class="getCourseBlockClass(item.course, day)"
            :style="{ background: getCourseGradient(item.course) }"
          >
            <text v-if="getCourseAdjustStatus(item.course, day) === 'cancel'" class="course-cancel-tag">停课</text>
            <template v-else>
              <text class="course-name">{{ item.course.courseName }}</text>
              <text class="course-meta">{{ item.course._combined ? item.course.className : getClassShortName(item.course.className) }}</text>
              <text class="course-meta">{{ getCourseClassroom(item.course, day) || '待定' }}</text>
              <text v-if="getCourseAdjustStatus(item.course, day) === 'adjusted'" class="course-adjust-tag">调</text>
            </template>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="displayScheduleList.length === 0 && !loading" class="empty-state">
      <text class="empty-text">暂无课表数据</text>
      <text class="empty-tip" v-if="selectMode === 'single' && !selectedClass">请先选择班级</text>
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
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getCounselorSchedule, getClassSchedule, getAdjustList } from '@/api/work/counselorSchedule'
import { getMyClasses } from '@/api/work/classcheck'
import { getActiveSchedule } from '@/api/work/schedule'
import { getClassShortName } from '@/utils/common'
import config from '@/config'

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
      baseUrl: config.baseUrl,
      CELL_HEIGHT: 100,
      weekLabels: ['一', '二', '三', '四', '五', '六', '日'],
      dayList: [1, 2, 3, 4, 5, 6, 7],
      classList: [], // 所有带班列表
      selectedClass: null, // 选中的单个班级
      selectedClasses: [], // 多选模式下的选中班级 bjdm 数组
      selectMode: 'multi', // 'single' | 'multi'
      myScheduleList: [],
      displayScheduleList: [], // 显示的课表数据
      adjustList: [],
      currentWeek: 1,
      realCurrentWeek: 1,
      totalWeeks: 0,
      semesterName: '',
      isHoliday: false,
      displayWeekOffset: 0,
      todayStr: '',
      maxSections: 12,
      sectionTimes: [],
      coursePopup: {
        visible: false,
        _course: null,
        courseName: '',
        className: '',
        startSection: '',
        endSection: '',
        timeRange: '',
        classroom: '',
        teacherName: ''
      },
      loading: false,
      // 班级颜色映射 (用于区分不同班级的课程)
      classColors: {},
      // 预设的颜色序列
      presetColors: [
        '#2979ff', // 蓝色
        '#18bc37', // 绿色
        '#f3a044', // 橙色
        '#9c27b0', // 紫色
        '#00bcd4', // 青色
        '#e43d33', // 红色
        '#ff9800', // 深橙
        '#795548', // 棕色
        '#607d8b', // 灰色
        '#8bc34a', // 浅绿
        '#009688', // 海绿
        '#ffc107'  // 黄色
      ]
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
    this.loadClasses()
  },
  methods: {
    // 计算字符串哈希值
    hashCode(str) {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash)
    },

    // 调整颜色亮度（用于渐变）
    adjustColorBrightness(color, percent) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      
      const adjustedR = Math.min(255, Math.max(0, r + (percent / 100 * 255)))
      const adjustedG = Math.min(255, Math.max(0, g + (percent / 100 * 255)))
      const adjustedB = Math.min(255, Math.max(0, b + (percent / 100 * 255)))
      
      return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`
    },

    // 获取班级对应的颜色
    getClassColor(bjdm) {
      if (!this.classColors[bjdm]) {
        // 根据 bjdm 的哈希值分配固定颜色
        const hash = this.hashCode(bjdm)
        this.classColors[bjdm] = this.presetColors[hash % this.presetColors.length]
      }
      return this.classColors[bjdm]
    },
    getClassShortName(name) {
      return getClassShortName(name)
    },
    
    loadScheduleTimes() {
      getActiveSchedule(this.todayStr).then(res => {
        const scheme = res.data
        if (scheme && scheme.detailList && scheme.detailList.length > 0) {
          const sorted = scheme.detailList.sort((a, b) => Number(a.lessonNo) - Number(b.lessonNo))
          this.sectionTimes = sorted.map(d => ({
            start: d.startTime,
            end: d.endTime
          }))
          if (this.sectionTimes.length > 0) {
            this.maxSections = this.sectionTimes.length
          }
        }
      }).catch(() => {
        this.sectionTimes = []
      })
    },

    loadClasses() {
      this.loading = true
      Promise.all([
        getCounselorSchedule(),
        getMyClasses()
      ]).then(results => {
        const scheduleRes = results[0]
        const classesRes = results[1]
        
        // 处理班级列表
        this.classList = (classesRes.data || []).map(cls => ({
          bjdm: cls.bjdm,
          className: cls.bjjc || cls.bjname,
          bcrs: cls.bcrs || 0
        }))
        
        // 默认选中所有班级（多选模式）或第一个班级（单选模式）
        if (this.selectMode === 'multi') {
          this.selectedClasses = this.classList.map(cls => cls.bjdm)
        } else {
          this.selectedClass = this.classList[0]
        }
        
        this.loadSchedule()
      }).catch(() => {
        this.classList = []
        this.loading = false
      })
    },

    loadSchedule() {
      this.loading = true
      
      getActiveSchedule(this.todayStr).then(weekRes => {
        // 获取周次和学期信息
        const today = new Date()
        const y = today.getFullYear()
        const m = String(today.getMonth() + 1).padStart(2, '0')
        const d = String(today.getDate()).padStart(2, '0')
        const dateStr = `${y}-${m}-${d}`
        
        return getClassSchedule(null, dateStr)
      }).then(scheduleRes => {
        const data = scheduleRes.data || []
        
        // 筛选出选中班级的课程
        let filteredList = []
        const bjdmSet = this.selectMode === 'single' 
          ? new Set([this.selectedClass?.bjdm])
          : new Set(this.selectedClasses)
        
        data.forEach(item => {
          if (bjdmSet.has(item.bjdm)) {
            filteredList.push(item)
          }
        })
        
        this.displayScheduleList = filteredList.filter(c => Number(c.startSection) >= 1)
        this.myScheduleList = filteredList
        
        this.calculateMaxSections()
        this.loading = false
      }).catch(() => {
        this.displayScheduleList = []
        this.loading = false
      })
    },

    calculateMaxSections() {
      if (this.sectionTimes.length > 0) {
        let max = this.sectionTimes.length
        this.displayScheduleList.forEach(c => {
          const end = Number(c.endSection)
          if (end > max) max = end
        })
        this.maxSections = max
        return
      }
      let max = 12
      this.displayScheduleList.forEach(c => {
        const end = Number(c.endSection)
        if (end > max) max = end
      })
      this.maxSections = max
    },

    onClassChange(e) {
      const index = e.detail.value
      this.selectedClass = this.classList[index]
      this.loadSchedule()
    },

    toggleClassSelection(bjdm) {
      const index = this.selectedClasses.indexOf(bjdm)
      if (index > -1) {
        this.selectedClasses.splice(index, 1)
      } else {
        this.selectedClasses.push(bjdm)
      }
      this.loadSchedule()
    },

    getTimeForSection(section) {
      const idx = section - 1
      if (this.sectionTimes.length > 0 && this.sectionTimes[idx]) {
        return this.sectionTimes[idx]
      }
      return FALLBACK_TIMES[idx] || null
    },

    getDayCells(day) {
      let courses = this.displayScheduleList
        .filter(c => Number(c.weekday) === day && Number(c.startSection) >= 1)
        .sort((a, b) => Number(a.startSection) - Number(b.startSection))
      
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
          const base = { ...course }
          base._combined = group
          base._bjdmList = group.map(c => c.bjdm).filter(b => b)
          base.className = group.map(c => getClassShortName(c.className)).filter(n => n).join('、')
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

    getCourseAdjustStatus(course, day) {
      if (!this.adjustList || this.adjustList.length === 0) return 'normal'
      const dateStr = this.getDayDateStr(day)
      const scheduleId = course.scheduleId || course.id
      const adj = this.adjustList.find(a => {
        return Number(a.originScheduleId) === Number(scheduleId) && a.adjustDate === dateStr
      })
      if (!adj) return 'normal'
      return adj.adjustType === 'cancel' ? 'cancel' : 'adjusted'
    },

    getCourseBlockClass(course, day) {
      const status = this.getCourseAdjustStatus(course, day)
      if (status === 'cancel') return 'course-block-cancel'
      if (status === 'adjusted') return 'course-block-adjusted'
      return ''
    },

    getCourseClassroom(course, day) {
      if (!this.adjustList || this.adjustList.length === 0) return course.classroom
      const dateStr = this.getDayDateStr(day)
      const scheduleId = course.scheduleId || course.id
      const adj = this.adjustList.find(a => {
        return Number(a.originScheduleId) === Number(scheduleId) && a.adjustDate === dateStr
      })
      if (adj && adj.newClassroom) return adj.newClassroom
      return course.classroom
    },

    // 根据班级获取课程块的颜色渐变
    getCourseGradient(course) {
      if (course._combined) {
        // 合班课：使用第一个班级的颜色
        const firstBjdm = course._bjdmList && course._bjdmList[0]
        if (firstBjdm) {
          const color = this.getClassColor(firstBjdm)
          return `linear-gradient(135deg, ${color} 0%, ${this.adjustColorBrightness(color, -20)} 100%)`
        }
      } else if (course.bjdm) {
        const color = this.getClassColor(course.bjdm)
        return `linear-gradient(135deg, ${color} 0%, ${this.adjustColorBrightness(color, -20)} 100%)`
      }
      return ''
    },

    getDayDateStr(day) {
      return this.formatDateStr(this.getDayDate(day))
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
        teacherName: course.teacherName || ''
      }
    },

    prevWeek() {
      this.displayWeekOffset--
      if (this.isHoliday) {
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

/* ===== 周次选择器 ===== */
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

/* ===== 班级选择器卡片 ===== */
.class-selector-card {
  background: #fff;
  margin: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.selector-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.selection-mode {
  display: flex;
  gap: 12rpx;
}

.mode-btn {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  color: #666;
  
  &.active {
    color: #fff;
    background: #2979ff;
    font-weight: 500;
  }
}

/* 单选模式 */
.single-select {
  .picker-style {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 20rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
  }

  .picker-text {
    font-size: 28rpx;
    color: #333;
  }
}

/* 多选模式 */
.multi-select {
  .class-scroll-list {
    max-height: 300rpx;
    overflow-y: auto;
  }

  .class-item {
    display: flex;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    
    &.selected {
      background: #e8f0fe;
      border-radius: 8rpx;
      padding: 14rpx;
    }

    .class-name {
      font-size: 26rpx;
      color: #333;
      flex: 1;
      margin-left: 12rpx;
    }

    .class-count {
      font-size: 22rpx;
      color: #999;
    }
  }
}

/* ===== 课表布局 ===== */
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

.body-row {
  display: flex;
}

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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: #ccc;
  }

  .empty-tip {
    font-size: 24rpx;
    color: #999;
    margin-top: 16rpx;
  }
}

/* ===== 课程详情弹窗 ===== */
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
}

.course-block-adjusted {
  border: 2rpx dashed #ff9800 !important;
  background: rgba(255, 152, 0, 0.08) !important;
  position: relative;
}

.course-block-cancel {
  opacity: 0.5;
  background: #f0f0f0 !important;
  border: 2rpx dashed #ccc !important;
}

.course-adjust-tag {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  font-size: 20rpx;
  color: #ff9800;
  font-weight: bold;
  background: rgba(255, 152, 0, 0.15);
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}

.course-cancel-tag {
  font-size: 24rpx;
  color: #999;
  font-weight: bold;
}
</style>
