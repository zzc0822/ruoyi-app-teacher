<template>
  <view class="home-container">
    <!-- 顶部区域 -->
    <view class="header-section">
      <view class="header-info">
        <text class="header-title">欢迎回来，{{ nickName }}老师</text>
      </view>
    </view>

    <!-- 学生查询入口 -->
    <view class="search-card" @click="goSearchStudent">
      <view class="search-input-box">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <text class="search-placeholder">搜索学生（学号/姓名）</text>
      </view>
      <uni-icons type="arrowright" size="16" color="#ccc"></uni-icons>
    </view>

    <!-- 统计概览 -->
    <view class="stats-section">
      <view class="stats-card" @click="goStats">
        <text class="stats-num">{{ stuCount }}</text>
        <text class="stats-label">学生总数</text>
      </view>
      <view class="stats-card" @click="goStats">
        <text class="stats-num orange">{{ pendingLeave }}</text>
        <text class="stats-label">待审请假</text>
      </view>
      <view class="stats-card" @click="goStats">
        <text class="stats-num red">{{ unreadTodo }}</text>
        <text class="stats-label">未读待办</text>
      </view>
      <view class="stats-card" @click="goStats">
        <text class="stats-num blue">{{ checkCount }}</text>
        <text class="stats-label">本周查课</text>
      </view>
    </view>

    <!-- 待办提醒 -->
    <view class="section-card">
      <view class="section-header">
        <text class="section-title">📋 我的待办</text>
        <text class="section-more" @click="goTodoList" v-if="todoTotal > 0">更多 ({{ todoTotal }})</text>
      </view>
      <!-- 周日历条 -->
      <view class="week-calendar">
        <view class="week-arrow" @click="changeWeek(-1)" v-if="weekOffset < 0">
          <uni-icons type="left" size="16" color="#999"></uni-icons>
        </view>
        <view class="week-arrow week-arrow-disabled" v-else>
          <uni-icons type="left" size="16" color="#ddd"></uni-icons>
        </view>
        <view class="week-days">
          <view 
            v-for="(day, idx) in weekDays" :key="idx" 
            :class="['week-day-item', { 'is-today': day.isToday, 'is-selected': day.isSelected, 'is-weekend': day.isWeekend }]"
            @click="selectDay(day)"
          >
            <text class="week-day-label">{{ day.label }}</text>
            <text class="week-day-num">{{ day.date }}</text>
            <view class="week-day-dot" v-if="day.hasTodo"></view>
          </view>
        </view>
        <view class="week-arrow" @click="changeWeek(1)">
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>
      </view>
      <!-- 课程列表 -->
      <view v-if="selectedDayCourses.length > 0" style="margin-bottom: 20rpx;">
        <view style="font-size: 26rpx; font-weight: 500; color: #666; margin-bottom: 16rpx;">📚 我的课程（{{ selectedDayCourses.length }}）</view>
        <view v-for="(course, idx) in selectedDayCourses" :key="'c'+idx" style="display: flex; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5;">
          <view style="width: 120rpx; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12rpx; padding: 12rpx 0; margin-right: 16rpx; flex-shrink: 0;">
            <text style="font-size: 22rpx; color: #fff; display: block;">{{ course.startSection }}-{{ course.endSection }}节</text>
          </view>
          <view style="flex: 1; padding-top: 8rpx;">
            <text style="font-size: 28rpx; font-weight: 500; color: #333; display: block;">{{ course.courseName }}</text>
            <text style="font-size: 24rpx; color: #999; display: block; margin-top: 8rpx;">{{ course.className }} · {{ course.classroom || '待定' }}</text>
          </view>
        </view>
      </view>
      <!-- 待办列表 -->
      <view class="todo-item" v-for="(item, index) in displayedTodos" :key="index" @click="handleTodoClick(item)">
        <view class="todo-left">
          <view :class="['todo-dot', 'dot-' + item.urgency]" v-if="item.urgency"></view>
          <view class="todo-content">
            <view class="todo-title-row">
              <text class="todo-text">{{ item.title }}</text>
              <text class="todo-type-tag" :class="'type-' + item.todoType" v-if="item.todoType">{{ getTodoTypeLabel(item.todoType) }}</text>
            </view>
            <text class="todo-time" v-if="item.deadline">截止: {{ formatDeadline(item.deadline) }}</text>
          </view>
        </view>
      </view>
      <view class="todo-empty" v-if="displayedTodos.length === 0">
        <text class="todo-empty-text">{{ selectedDay ? '当天暂无待办' : '暂无待办事项' }}</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="section-card">
      <view class="section-header">
        <text class="section-title">快捷入口</text>
      </view>
      <view class="quick-grid">
        <view class="quick-item" @click="goMyStudents">
          <view class="quick-icon icon-blue">
            <uni-icons type="person-filled" size="26" color="#fff"></uni-icons>
          </view>
          <text class="quick-name">我的学生</text>
        </view>
        <view class="quick-item" @click="goAddClassCheck">
          <view class="quick-icon icon-green">
            <uni-icons type="plusempty" size="26" color="#fff"></uni-icons>
          </view>
          <text class="quick-name">查课登记</text>
        </view>
        <view class="quick-item" @click="goAddTalk">
          <view class="quick-icon icon-orange">
            <uni-icons type="chat-filled" size="26" color="#fff"></uni-icons>
          </view>
          <text class="quick-name">记录谈话</text>
        </view>
        <view class="quick-item" @click="goAddLeave">
          <view class="quick-icon icon-red">
            <uni-icons type="paperplane-filled" size="26" color="#fff"></uni-icons>
          </view>
          <text class="quick-name">请假审批</text>
        </view>
        <view class="quick-item" @click="goMySchedule">
          <view class="quick-icon icon-purple">
            <uni-icons type="calendar-filled" size="26" color="#fff"></uni-icons>
          </view>
          <text class="quick-name">我的课表</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listTodo } from '@/api/work/todo'
import { listLeave } from '@/api/work/leave'
import { listStuinfo } from '@/api/student/stuinfo'
import { listClassCheck } from '@/api/work/classcheck'
import { getTeacherinfoByUserId } from '@/api/work/teacherinfo'
import { getMySchedule } from '@/api/work/schedule'

export default {
  data() {
    return {
      nickName: '',
      stuCount: '-',
      pendingLeave: '-',
      unreadTodo: '-',
      checkCount: '-',
      todoList: [],
      todoTotal: 0, // 待办总数（未过滤前）
      weekOffset: 0, // 周偏移（0=本周，-1=上周...）
      selectedDay: null, // 选中的日期（YYYY-MM-DD），null表示不筛选
      weekDays: [], // 周日历数据
      // 课表相关
      myScheduleList: [],
      isTeacher: false,
      selectedDayCourses: []
    }
  },
  onShow() {
    this.loadTeacherName()
    this.loadStats()
    this.loadTodos()
    this.buildWeekDays()
    this.loadMySchedule()
    
    // 监听刷新事件
    uni.$on('refreshHomeData', this.loadAllData)
  },
  onHide() {
    // 移除事件监听
    uni.$off('refreshHomeData', this.loadAllData)
  },
  methods: {
    // 加载所有数据（用于事件刷新）
    loadAllData() {
      this.loadTeacherName()
      this.loadStats()
      this.loadTodos()
      this.buildWeekDays()
      this.loadMySchedule()
    },
    // ===== 周日历相关 =====
    buildWeekDays() {
      const now = new Date()
      const dayOfWeek = now.getDay() || 7 // 周日=7
      const monday = new Date(now)
      monday.setDate(now.getDate() - dayOfWeek + 1 + this.weekOffset * 7)
      
      const labels = ['一', '二', '三', '四', '五', '六', '日']
      const todayStr = this.formatDateStr(now)
      const days = []
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = this.formatDateStr(d)
        days.push({
          label: labels[i],
          date: d.getDate(),
          fullDate: dateStr,
          isToday: dateStr === todayStr,
          isSelected: this.selectedDay === dateStr,
          isWeekend: i >= 5,
          hasTodo: this.dayHasTodo(dateStr)
        })
      }
      this.weekDays = days
    },
    formatDateStr(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    dayHasTodo(dateStr) {
      return this.todoList.some(t => {
        if (!t.deadline) return false
        const d = t.deadline.substring(0, 10)
        return d === dateStr
      })
    },
    changeWeek(offset) {
      this.weekOffset += offset
      if (this.weekOffset > 0) this.weekOffset = 0
      this.selectedDay = null
      this.buildWeekDays()
      this.updateSelectedDayCourses()
    },
    selectDay(day) {
      if (day.isToday && !this.selectedDay) {
        // 点击今天且未选中，清除筛选
        this.selectedDay = null
      } else if (this.selectedDay === day.fullDate) {
        // 再次点击取消选中
        this.selectedDay = null
      } else {
        this.selectedDay = day.fullDate
      }
      this.buildWeekDays()
      this.updateSelectedDayCourses()
    },
    // 加载教师姓名
    loadTeacherName() {
      // 确保用户信息已加载
      if (!this.$store.state.user.id) {
        this.$store.dispatch('GetInfo').then(() => {
          this.fetchTeacherName()
        }).catch(() => {
          this.nickName = ''
        })
      } else {
        this.fetchTeacherName()
      }
    },
    // 获取教师姓名
    fetchTeacherName() {
      const userId = this.$store.state.user.id
      if (!userId) {
        this.nickName = ''
        return
      }
      
      getTeacherinfoByUserId(userId).then(res => {
        if (res.data && res.data.teacherName) {
          this.nickName = res.data.teacherName
        } else {
          // 如果没有教师姓名，尝试从 store 获取，但排除手机号
          const storeName = this.$store.getters.name || ''
          // 如果是手机号格式（11位数字），则不显示
          if (/^1[3-9]\d{9}$/.test(storeName)) {
            this.nickName = ''
          } else {
            this.nickName = storeName
          }
        }
      }).catch(() => {
        // 失败时同样排除手机号
        const storeName = this.$store.getters.name || ''
        if (/^1[3-9]\d{9}$/.test(storeName)) {
          this.nickName = ''
        } else {
          this.nickName = storeName
        }
      })
    },
    loadStats() {
      listStuinfo({ pageNum: 1, pageSize: 1 }).then(res => {
        this.stuCount = res.total || 0
      }).catch(() => { this.stuCount = 0 })
      listLeave({ pageNum: 1, pageSize: 1, approvalStatus: 'pending' }).then(res => {
        this.pendingLeave = res.total || 0
      }).catch(() => { this.pendingLeave = 0 })
      // 未读待办数量改为在 loadTodos 中从同一列表计算，保证数据一致性
      listClassCheck({ pageNum: 1, pageSize: 1 }).then(res => {
        this.checkCount = res.total || 0
      }).catch(() => { this.checkCount = 0 })
    },
    loadTodos() {
      listTodo().then(res => {
        const list = res.data || []

        // 保存待办总数，用于"更多"显示
        this.todoTotal = list.length
        
        // 从同一列表计算未读数量，避免与工作台数据不一致
        this.unreadTodo = list.filter(t => t.isRead !== '1').length
        
        // status: 0=未完成, 1=已完成
        const filtered = list.filter(t => {
          return t.status !== '1' && t.status !== 1
        })
        
        // 显示5个待办
        this.todoList = filtered.slice(0, 5)
        this.buildWeekDays()
      }).catch(() => {
        this.unreadTodo = 0
      })
    },
    goWork() {
      uni.switchTab({ url: '/pages/work/index' })
    },
    goStats() {
      uni.navigateTo({ url: '/pages/sub-work/stats/index' })
    },
    goTodoList() {
      uni.navigateTo({ url: '/pages/sub-work/todo/index' })
    },
    handleTodoClick(item) {
      // 根据待办类型跳转
      if (item.todoType === 'classcheck_confirm') {
        uni.navigateTo({
          url: '/pages/sub-work/classcheck/confirm?id=' + item.businessId,
          fail: (err) => {
            // 如果跳转失败，跳转到待办列表页
            uni.navigateTo({ url: '/pages/sub-work/todo/index' })
          }
        })
      } else if (item.todoType === 'leave' || item.todoType === 'leave_approval') {
        uni.navigateTo({
          url: '/pages/sub-work/leave/detail?id=' + item.businessId,
          fail: () => uni.navigateTo({ url: '/pages/sub-work/todo/index' })
        })
      } else if (item.todoType === 'talk_disciplinary') {
        uni.navigateTo({
          url: '/pages/sub-work/talk/add?todoId=' + item.id + '&businessId=' + item.businessId,
          fail: (err) => {
            uni.navigateTo({ url: '/pages/sub-work/todo/index' })
          }
        })
      } else if (item.todoType === 'talk' || item.todoType === 'talk_daily') {
        uni.navigateTo({ url: '/pages/sub-work/talk/index' })
      } else if (item.todoType === 'classcheck_talk') {
        uni.navigateTo({
          url: '/pages/sub-work/talk/add?todoId=' + item.id + '&businessId=' + item.businessId,
          fail: (err) => {
            uni.navigateTo({ url: '/pages/sub-work/todo/index' })
          }
        })
      } else {
        // 其他类型跳转到待办列表页
        uni.navigateTo({ url: '/pages/sub-work/todo/index' })
      }
    },
    formatDeadline(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      const now = new Date()
      const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
      if (diff < 0) return '已逾期'
      if (diff === 0) return '今天'
      if (diff === 1) return '明天'
      return diff + '天后'
    },
    // 快捷入口跳转
    goMyStudents() {
      uni.navigateTo({ url: '/pages/sub-work/stuinfo/index' })
    },
    goSearchStudent() {
      uni.navigateTo({ url: '/pages/sub-work/stuinfo/search' })
    },
    goAddClassCheck() {
      uni.navigateTo({ url: '/pages/sub-work/classcheck/add' })
    },
    goAddTalk() {
      uni.navigateTo({ url: '/pages/sub-work/talk/add' })
    },
    goAddLeave() {
      uni.navigateTo({ url: '/pages/sub-work/leave/index' })
    },
    goMySchedule() {
      uni.navigateTo({ url: '/pages/sub-work/schedule/index' })
    },
    // 获取待办类型标签
    getTodoTypeLabel(type) {
      const typeMap = {
        'talk_disciplinary': '违纪谈话',
        'talk_daily': '日常谈心',
        'classcheck_confirm': '查课确认',
        'classcheck_talk': '查课谈话',
        'leave': '请假',
        'leave_approval': '请假审批'
      }
      return typeMap[type] || type
    },
    // ===== 教师课表相关 =====
    loadMySchedule() {
      getMySchedule().then(res => {
        const data = res.data || {}
        if (Array.isArray(data)) {
          this.myScheduleList = data
          this.isTeacher = data.length > 0
        } else {
          this.myScheduleList = data.scheduleList || []
          this.isTeacher = data.isTeacher === true || this.myScheduleList.length > 0
        }
        this.$nextTick(() => {
          this.updateSelectedDayCourses()
        })
      }).catch(() => {
        this.myScheduleList = []
        this.isTeacher = false
      })
    },
    updateSelectedDayCourses() {
      if (!this.isTeacher || !this.myScheduleList.length) {
        this.selectedDayCourses = []
        return
      }
      // 未选中日期时默认用今天，选中时用选中日期
      const targetDate = this.selectedDay ? new Date(this.selectedDay) : new Date()
      const jsDay = targetDate.getDay()
      const weekday = jsDay === 0 ? 7 : jsDay
      this.selectedDayCourses = this.myScheduleList.filter(c => Number(c.weekday) === weekday)
    }
  },
  computed: {
    displayedTodos() {
      if (!this.selectedDay) return this.todoList
      return this.todoList.filter(t => {
        if (!t.deadline) return false
        return t.deadline.substring(0, 10) === this.selectedDay
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: #f5f6f7;
}

.header-section {
  background: linear-gradient(135deg, #2979ff, #1a5cd8);
  padding: 120rpx 40rpx 100rpx;
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.header-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1.4;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.search-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -40rpx 24rpx 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 1;
}

.search-input-box {
  display: flex;
  align-items: center;
  flex: 1;
}

.search-placeholder {
  margin-left: 12rpx;
  font-size: 28rpx;
  color: #999;
}

.stats-section {
  display: flex;
  margin: 0 24rpx 20rpx;
  gap: 16rpx;
}

.stats-card {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.stats-num {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  &.orange { color: #f3a044; }
  &.red { color: #e43d33; }
  &.blue { color: #2979ff; }
}

.stats-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

.section-card {
  background: #fff;
  margin: 0 24rpx 20rpx;
  border-radius: 20rpx;
  padding: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #2979ff;
}

/* 周日历 */
.week-calendar {
  display: flex;
  align-items: center;
  background: #f8f9fb;
  border-radius: 12rpx;
  padding: 16rpx 8rpx;
  margin-bottom: 20rpx;
}

.week-arrow {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.week-arrow-disabled {
  opacity: 0.4;
}

.week-days {
  flex: 1;
  display: flex;
  justify-content: space-between;
}

.week-day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 0;
  width: 72rpx;
  border-radius: 12rpx;
  position: relative;
  transition: all 0.2s;
}

.week-day-label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 4rpx;
}

.week-day-num {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.week-day-item.is-weekend .week-day-label {
  color: #f3a044;
}

.week-day-item.is-today {
  background: #2979ff;
}

.week-day-item.is-today .week-day-label,
.week-day-item.is-today .week-day-num {
  color: #fff;
}

.week-day-item.is-selected {
  background: #e8f0fe;
}

.week-day-item.is-selected .week-day-num {
  color: #2979ff;
  font-weight: bold;
}

.week-day-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #e43d33;
  margin-top: 6rpx;
}

.week-day-item.is-today .week-day-dot {
  background: #fff;
}

.todo-empty {
  padding: 30rpx 0;
  text-align: center;
}

.todo-empty-text {
  font-size: 26rpx;
  color: #ccc;
}

.day-section {
  margin-bottom: 24rpx;
}

.day-section-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #666;
  margin-bottom: 16rpx;
}

.course-item {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.course-item:last-child {
  border-bottom: none;
}

.course-time-box {
  width: 120rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  margin-right: 20rpx;
}

.course-section {
  font-size: 22rpx;
  font-weight: 500;
  color: #fff;
}

.course-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding-top: 8rpx;
}

.course-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.course-detail {
  font-size: 24rpx;
  color: #999;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-left {
  display: flex;
  align-items: flex-start;
  flex: 1;
}

.todo-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  flex-shrink: 0;
  margin-top: 8rpx;
  &.dot-high { background: #e43d33; }
  &.dot-medium { background: #f3a044; }
  &.dot-low { background: #18bc37; }
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.todo-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.todo-text {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.todo-type-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  &.type-talk_disciplinary {
    background: #ffe8e8;
    color: #e43d33;
  }
  &.type-talk_daily {
    background: #e8f5ff;
    color: #2979ff;
  }
  &.type-classcheck_confirm,
  &.type-classcheck_talk {
    background: #e8ffe8;
    color: #18bc37;
  }
  &.type-leave,
  &.type-leave_approval {
    background: #fff8e1;
    color: #f3a044;
  }
}

.todo-time {
  font-size: 24rpx;
  color: #999;
  flex-shrink: 0;
  margin-left: 30rpx;
}

.quick-grid {
  display: flex;
  flex-wrap: wrap;
}

.quick-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
  position: relative;
}

.quick-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.quick-item:active .quick-icon {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

/* 渐变色背景 */
.icon-blue { background: linear-gradient(135deg, #2979ff 0%, #5ba3ff 100%); }
.icon-green { background: linear-gradient(135deg, #18bc37 0%, #4cd964 100%); }
.icon-orange { background: linear-gradient(135deg, #f3a044 0%, #ffc870 100%); }
.icon-red { background: linear-gradient(135deg, #e43d33 0%, #ff6b6b 100%); }
.icon-purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.quick-name {
  font-size: 24rpx;
  color: #333;
}
</style>
