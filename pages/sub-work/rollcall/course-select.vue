<template>
  <view class="page">
    <view class="intro">
      <text class="intro-title">选择点名课程</text>
      <text class="intro-meta">{{ introMeta }}</text>
    </view>

    <view v-if="loading" class="state-panel">
      <text>正在加载课程...</text>
    </view>

    <view v-else-if="errorText" class="state-panel">
      <text>{{ errorText }}</text>
      <text class="state-action" @click="loadCourses">重新加载</text>
    </view>

    <template v-else>
      <view class="course-section">
        <view class="section-heading">
          <text class="section-title">今日课程</text>
          <text class="section-count">{{ todayCourses.length }} 门</text>
        </view>

        <view v-if="todayCourses.length > 0" class="course-list">
          <view
            v-for="course in todayCourses"
            :key="course.key"
            class="course-row"
            @click="openCourse(course)"
          >
            <view class="section-badge">第{{ course.startSection }}-{{ course.endSection }}节</view>
            <view class="course-copy">
              <text class="course-name">{{ course.courseName }}</text>
              <text class="course-meta">{{ course.className }} · {{ course.classroom || '地点待定' }}</text>
            </view>
            <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
          </view>
        </view>

        <view v-else class="empty-today">
          <text class="empty-title">今天暂无课程</text>
        </view>
      </view>

      <view v-if="weekCourses.length > 0" class="course-section week-section">
        <view class="section-heading">
          <text class="section-title">本周其他课程</text>
          <text class="section-count">{{ weekCourses.length }} 门</text>
        </view>
        <view class="course-list">
          <view
            v-for="course in weekCourses"
            :key="course.key"
            class="course-row"
            @click="openCourse(course)"
          >
            <view class="day-badge">{{ course.dayLabel }}</view>
            <view class="course-copy">
              <text class="course-name">{{ course.courseName }}</text>
              <text class="course-meta">{{ course.className }} · 第{{ course.startSection }}-{{ course.endSection }}节</text>
            </view>
            <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
          </view>
        </view>
      </view>

      <view v-if="!loading && todayCourses.length === 0 && weekCourses.length === 0" class="state-panel no-course">
        <text>本周暂无可点名课程</text>
      </view>
    </template>
  </view>
</template>

<script>
import { getMySchedule } from '@/api/work/schedule'
import { getClassShortName } from '@/utils/common'

const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default {
  data() {
    return {
      loading: true,
      errorText: '',
      courses: [],
      adjustList: [],
      currentWeek: 0,
      todayStr: '',
      todayWeekday: 1,
      todayCourses: [],
      weekCourses: [],
      autoOpened: false
    }
  },
  computed: {
    todayLabel() {
      if (!this.todayStr) return ''
      const date = this.parseDate(this.todayStr)
      return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEK_LABELS[this.todayWeekday - 1]}`
    },
    introMeta() {
      return this.currentWeek ? `${this.todayLabel} · 第${this.currentWeek}周` : this.todayLabel
    }
  },
  onLoad() {
    const now = new Date()
    this.todayStr = this.formatDate(now)
    this.todayWeekday = now.getDay() || 7
    this.loadCourses()
  },
  onPullDownRefresh() {
    this.loadCourses().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    async loadCourses() {
      if (this.loading && this.courses.length > 0) return
      this.loading = true
      this.errorText = ''
      try {
        const res = await getMySchedule()
        const data = res.data || {}
        const list = Array.isArray(data) ? data : (data.scheduleList || [])
        this.courses = list.filter(course => Number(course.startSection) >= 1)
        this.adjustList = Array.isArray(data.adjustList) ? data.adjustList : []
        this.currentWeek = Number(data.currentWeek || 0)
        this.buildCourseLists()
      } catch (e) {
        this.courses = []
        this.todayCourses = []
        this.weekCourses = []
        this.errorText = '课程加载失败，请稍后重试'
      } finally {
        this.loading = false
      }
    },
    buildCourseLists() {
      this.todayCourses = this.buildCoursesForDate(this.todayWeekday, this.todayStr)
      const monday = this.getWeekDate(1)
      const otherCourses = []
      for (let day = 1; day <= 7; day++) {
        if (day === this.todayWeekday) continue
        const date = new Date(monday.getTime() + (day - 1) * 86400000)
        const dateStr = this.formatDate(date)
        otherCourses.push(...this.buildCoursesForDate(day, dateStr))
      }
      this.weekCourses = otherCourses

      if (this.todayCourses.length === 1 && !this.autoOpened) {
        this.autoOpened = true
        setTimeout(() => this.openCourse(this.todayCourses[0]), 250)
      }
    },
    buildCoursesForDate(weekday, dateStr) {
      const courses = this.courses
        .filter(course => Number(course.weekday) === weekday && this.isCurrentWeek(course))
        .map(course => this.applyAdjustment(course, dateStr))
        .filter(Boolean)

      const merged = []
      const used = new Set()
      courses.forEach((course, index) => {
        if (used.has(index)) return
        const group = [course]
        courses.forEach((other, otherIndex) => {
          if (otherIndex <= index || used.has(otherIndex)) return
          if (other.courseName === course.courseName &&
              Number(other.startSection) === Number(course.startSection) &&
              Number(other.endSection) === Number(course.endSection)) {
            group.push(other)
            used.add(otherIndex)
          }
        })

        const base = { ...course }
        if (group.length > 1) {
          base._combined = group
          base._bjdmList = group.map(item => item.bjdm).filter(Boolean)
          base.className = group
            .map(item => getClassShortName(item.className))
            .filter(Boolean)
            .join('、')
        } else {
          base.className = getClassShortName(base.className)
        }
        base.checkDate = dateStr
        base.dayLabel = WEEK_LABELS[weekday - 1]
        base.key = [
          base.checkDate,
          base.courseName,
          base.startSection,
          base.endSection,
          base.bjdm || (base._bjdmList || []).join(',')
        ].join('_')
        merged.push(base)
      })

      return merged.sort((a, b) => Number(a.startSection) - Number(b.startSection))
    },
    isCurrentWeek(course) {
      if (!this.currentWeek) return false
      const startWeek = Number(course.startWeek || 1)
      const endWeek = Number(course.endWeek || 999)
      return startWeek <= this.currentWeek && endWeek >= this.currentWeek
    },
    applyAdjustment(course, dateStr) {
      const scheduleId = course.scheduleId || course.id
      const adjustment = this.adjustList.find(item =>
        Number(item.originScheduleId) === Number(scheduleId) &&
        item.adjustDate === dateStr
      )
      if (!adjustment) return course
      if (adjustment.adjustType === 'cancel') return null
      return {
        ...course,
        classroom: adjustment.newClassroom || course.classroom
      }
    },
    openCourse(course) {
      const params = {
        bjdm: course.bjdm || '',
        className: course.className || '',
        courseName: course.courseName || '',
        classroom: course.classroom || '',
        checkDate: course.checkDate || this.todayStr,
        startSection: course.startSection || '',
        endSection: course.endSection || '',
        weekday: course.weekday || ''
      }
      if (course._combined && course._combined.length > 1) {
        params.bjdmList = JSON.stringify(course._bjdmList || [])
        params.classNames = course.className || ''
      }
      const query = Object.keys(params)
        .map(key => key + '=' + encodeURIComponent(params[key]))
        .join('&')
      uni.navigateTo({ url: '/pages/sub-work/rollcall/index?' + query })
    },
    getWeekDate(weekday) {
      const now = this.parseDate(this.todayStr)
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - this.todayWeekday + weekday
      )
    },
    parseDate(value) {
      return new Date(String(value).replace(/-/g, '/'))
    },
    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  background: #f4f7f9;
  color: #1e293b;
}

.intro {
  padding: 30rpx 28rpx 28rpx;
  background: #173f4a;
  color: #ffffff;
}

.intro-title,
.intro-meta {
  display: block;
}

.intro-title {
  font-size: 34rpx;
  font-weight: 700;
}

.intro-meta {
  margin-top: 10rpx;
  color: #c6dbe1;
  font-size: 22rpx;
}

.course-section {
  margin: 20rpx 24rpx 0;
  overflow: hidden;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  background: #ffffff;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 22rpx 16rpx;
}

.section-title {
  font-size: 27rpx;
  font-weight: 700;
}

.section-count {
  color: #94a3b8;
  font-size: 20rpx;
}

.course-list {
  border-top: 1rpx solid #edf2f6;
}

.course-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 104rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border-bottom: 1rpx solid #edf2f6;
}

.course-row:last-child {
  border-bottom: none;
}

.course-row:active {
  background: #f8fafc;
}

.section-badge,
.day-badge {
  flex: 0 0 104rpx;
  padding: 12rpx 8rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  background: #ecfdf5;
  color: #0f766e;
  font-size: 19rpx;
  font-weight: 600;
  text-align: center;
}

.day-badge {
  flex-basis: 76rpx;
  background: #f1f5f9;
  color: #475569;
}

.course-copy {
  min-width: 0;
  flex: 1;
}

.course-name,
.course-meta {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-name {
  font-size: 25rpx;
  font-weight: 600;
}

.course-meta {
  margin-top: 7rpx;
  color: #64748b;
  font-size: 20rpx;
}

.empty-today,
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 64rpx 28rpx;
  color: #94a3b8;
  font-size: 23rpx;
  text-align: center;
}

.empty-today {
  padding: 42rpx 28rpx;
}

.empty-title {
  color: #475569;
  font-size: 26rpx;
  font-weight: 600;
}

.state-action {
  color: #0f766e;
  font-weight: 600;
}

.week-section {
  margin-top: 16rpx;
}

.no-course {
  min-height: 220rpx;
  justify-content: center;
}
</style>
