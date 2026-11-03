<template>
  <view class="home-container">
    <!-- 顶部区域 -->
    <view class="header-section">
      <view class="header-info">
        <text class="header-title">{{ nickName ? nickName + '老师，您好' : '老师，您好' }}</text>
        <view class="role-line">
          <text v-if="roleLabel" class="role-badge">{{ roleLabel }}</text>
        </view>
      </view>
    </view>

    <!-- 学生查询入口 -->
    <view class="search-card" v-if="showStudentSearch" @click="goSearchStudent">
      <view class="search-input-box">
        <text class="search-icon">搜</text>
        <text class="search-placeholder">搜索学生（学号/姓名）</text>
      </view>
      <text class="search-arrow">›</text>
    </view>

    <!-- 统计概览 -->
    <view :class="['stats-section', { 'without-search': !showStudentSearch }]">
      <view
        v-for="item in statsCards"
        :key="item.key"
        :class="['stats-card', 'stats-' + item.theme]"
        @click="handleStatClick(item.action)"
      >
        <view class="stats-card-head">
          <text class="stats-label">{{ item.label }}</text>
          <view class="stats-icon"></view>
        </view>
        <text class="stats-num">{{ item.value }}</text>
      </view>
    </view>

    <view :class="['content-stack', 'role-' + roleType]">
      <!-- 课程与待办合并日程 -->
      <view class="section-card course-section-card" v-if="showCombinedSection">
        <view class="section-header">
          <view class="section-title-group">
            <text class="section-title">今日安排</text>
            <text class="section-date">{{ agendaDateLabel }}</text>
          </view>
          <view class="section-actions">
            <text class="week-back" v-if="weekOffset !== 0" @click="changeWeek(-weekOffset)">本周</text>
            <text class="section-more" @click="goMySchedule">完整课表</text>
          </view>
        </view>
        <view class="week-calendar">
          <view class="week-arrow" @click="changeWeek(-1)">
            <text class="week-arrow-glyph">‹</text>
          </view>
          <view class="week-days">
            <view
              v-for="(day, idx) in weekDays"
              :key="idx"
              :class="['week-day-item', { 'is-today': day.isToday, 'is-selected': day.isSelected, 'is-weekend': day.isWeekend }]"
              @click="selectDay(day)"
            >
              <text class="week-day-label">{{ day.label }}</text>
              <text class="week-day-num">{{ day.date }}</text>
              <view class="week-day-dot" v-if="day.hasTodo"></view>
            </view>
          </view>
          <view class="week-arrow" @click="changeWeek(1)">
            <text class="week-arrow-glyph">›</text>
          </view>
        </view>
        <view class="agenda-list" v-if="selectedDayAgenda.length > 0">
          <view
            class="agenda-item"
            v-for="entry in selectedDayAgenda"
            :key="entry.key"
            @click="handleAgendaClick(entry)"
          >
            <view class="todo-left">
              <view :class="['todo-dot', 'dot-' + (entry.urgency || 'normal'), { 'dot-course': entry.kind === 'course' }]"></view>
              <view class="todo-content">
                <view class="todo-title-row">
                  <text class="todo-text">{{ entry.title }}</text>
                  <text class="todo-type-tag" :class="entry.tagClass">{{ entry.typeLabel }}</text>
                </view>
                <text class="todo-time">{{ entry.meta }}</text>
              </view>
            </view>
            <text class="agenda-time" v-if="entry.timeLabel">{{ entry.timeLabel }}</text>
          </view>
        </view>
        <view class="todo-empty" v-else>
          <text class="todo-empty-text">当天暂无课程或待办</text>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="section-card quick-section-card" v-if="quickEntries.length > 0">
        <view class="section-header">
          <text class="section-title">{{ roleType === 'secretary' || !roleLabel ? '快捷入口' : roleLabel + '快捷入口' }}</text>
        </view>
        <view class="quick-grid">
          <view class="quick-item" v-for="item in quickEntries" :key="item.key" @click="goQuickEntry(item.key)">
            <view :class="['quick-icon', 'icon-' + item.color]">
              <text class="quick-icon-glyph">{{ getQuickIconLabel(item.key) }}</text>
            </view>
            <text class="quick-name">{{ item.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <feature-update-popup
      :visible="featureUpdateVisible"
      :items="featureUpdates"
      @close="closeFeatureUpdate"
    />
  </view>
</template>

<script>
import { getWorkDashboard } from '@/api/work/dashboard'
import { getCurrentRole, getTeacherinfoByUserId } from '@/api/work/teacherinfo'
import { getMySchedule } from '@/api/work/schedule'
import { listTodo } from '@/api/work/todo'
import { getMyMiniConfig } from '@/api/system/miniConfig'
import { getLatestFeatureTimeline } from '@/api/system/featureTimeline'
import { createRoleComputed } from '@/utils/roleSystem'
import FeatureUpdatePopup from '@/components/feature-update-popup/index.vue'

let featureUpdateLoading = false

export default {
  components: { FeatureUpdatePopup },
  data() {
    return {
      nickName: '',
      stuCount: '-',
      onLeave: '-',
      attendanceRate: '--',
      todoList: [],
      todoTotal: 0, // 待办总数（未过滤前）
      weekOffset: 0, // 周偏移（0=本周，-1=上周...）
      selectedDay: null, // 选中的日期（YYYY-MM-DD），null表示不筛选
      weekDays: [], // 周日历数据
      // 课表相关
      myScheduleList: [],
      isTeacher: false,
      selectedDayCourses: [],
      currentWeek: 1,
      miniConfig: {},
      miniConfigLoaded: false,
      currentRole: null,
      featureUpdateVisible: false,
      featureUpdates: []
    }
  },
  onShow() {
    this.loadMiniConfig()
    this.loadTeacherName()
    this.loadCurrentRole()
    this.loadDashboard()
    this.loadTodoList()
    this.buildWeekDays()
    this.loadMySchedule()
    this.loadFeatureUpdates()
    
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
      this.loadMiniConfig()
      this.loadTeacherName()
      this.loadCurrentRole()
      this.loadDashboard()
      this.loadTodoList()
      this.buildWeekDays()
      this.loadMySchedule()
    },
    loadMiniConfig() {
      getMyMiniConfig().then(res => {
        this.miniConfig = (res && res.data) || {}
        this.miniConfigLoaded = true
      }).catch(() => {
        this.miniConfig = {}
        this.miniConfigLoaded = false
      })
    },
    loadFeatureUpdates() {
      const app = getApp()
      const globalData = (app && app.globalData) || {}
      if (!globalData.featureUpdateEligible || featureUpdateLoading) {
        return
      }
      featureUpdateLoading = true
      getLatestFeatureTimeline(5).then(res => {
        featureUpdateLoading = false
        globalData.featureUpdateEligible = false
        const list = res && Array.isArray(res.data) ? res.data : []
        const items = list.filter(item => item && item.title)
        if (!items.length) {
          return
        }
        this.featureUpdates = items
        this.featureUpdateVisible = true
      }).catch(() => {
        featureUpdateLoading = false
        globalData.featureUpdateEligible = false
      })
    },
    closeFeatureUpdate() {
      this.featureUpdateVisible = false
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
          hasTodo: this.dayHasTodo(dateStr) || this.dayHasCourse(dateStr)
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
        return this.getTodoDate(t) === dateStr
      })
    },
    dayHasCourse(dateStr) {
      if (!this.isTeacher || !this.myScheduleList.length) return false
      const date = new Date(dateStr.replace(/-/g, '/'))
      const weekday = date.getDay() || 7
      const targetWeek = this.currentWeek + this.weekOffset
      return this.myScheduleList.some(course => {
        if (Number(course.weekday) !== weekday) return false
        if (!course.startWeek || !course.endWeek) return true
        return targetWeek >= Number(course.startWeek) && targetWeek <= Number(course.endWeek)
      })
    },
    getTodoDate(todo) {
      const timeStr = todo.deadline || todo.startTime || todo.createTime
      return timeStr ? timeStr.substring(0, 10) : ''
    },
    changeWeek(offset) {
      this.weekOffset += offset
      if (this.weekOffset === 0) {
        this.selectedDay = null
      } else {
        const target = new Date()
        target.setDate(target.getDate() + this.weekOffset * 7)
        this.selectedDay = this.formatDateStr(target)
      }
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
    async loadCurrentRole() {
      if (!this.$store.state.user.id) {
        try {
          await this.$store.dispatch('GetInfo')
        } catch (e) {
          return
        }
      }
      try {
        const res = await getCurrentRole()
        this.currentRole = res.data || null
      } catch (e) {
        this.currentRole = null
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
    loadDashboard() {
      getWorkDashboard().then(res => {
        const data = (res && res.data) || {}
        const todos = Array.isArray(data.recentTodos) ? data.recentTodos : []
        this.stuCount = data.studentTotal
        this.onLeave = data.onLeave
        this.attendanceRate = data.todayAttendanceRate
        this.todoTotal = data.todoTotal
        if (!this.todoList.length) {
          this.todoList = todos
        }
        this.buildWeekDays()
      }).catch(() => {
        this.stuCount = 0
        this.onLeave = 0
        this.attendanceRate = '0%'
        // 待办列表由独立请求维护，聚合统计失败不能覆盖并发加载成功的结果。
      })
    },
    loadTodoList() {
      listTodo().then(res => {
        this.todoList = res.data || []
        this.buildWeekDays()
      }).catch(() => {
        // 仪表盘中的 recentTodos 仍可作为待办兜底。
      })
    },
    goWork() {
      uni.switchTab({ url: '/pages/work/index' })
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
      } else if (['talk_disciplinary', 'talk_daily', 'talk_risk_report', 'talk_overdue', 'talk_follow_up'].includes(item.todoType)) {
        // 这几类的 businessId 就是谈话记录ID，直接进台账：谈话、上报处置、超期与到期跟进都在同一条记录上闭环
        uni.navigateTo({
          url: '/pages/sub-work/talk/add?id=' + item.businessId,
          fail: () => uni.navigateTo({ url: '/pages/sub-work/todo/index' })
        })
      } else if (item.todoType === 'talk') {
        const suffix = this.roleType === 'headteacher' ? '?viewScope=headteacher' : ''
        uni.navigateTo({ url: '/pages/sub-work/talk/index' + suffix })
      } else if (item.todoType === 'study_violation_talk') {
        uni.navigateTo({
          url: '/pages/sub-work/talk/add?studyViolationId=' + item.businessId,
          fail: () => uni.navigateTo({ url: '/pages/sub-work/todo/index' })
        })
      } else if (['classcheck_talk', 'leave_talk', 'offcampus_talk', 'vehicle_talk', 'warning_talk'].includes(item.todoType)) {
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
    handleAgendaClick(entry) {
      if (entry.kind === 'course') {
        this.goMySchedule()
        return
      }
      this.handleTodoClick(entry.todo)
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
      const suffix = this.roleType === 'headteacher' ? '?viewScope=headteacher' : ''
      uni.navigateTo({ url: '/pages/sub-work/talk/add' + suffix })
    },
    goAddLeave() {
      uni.navigateTo({ url: '/pages/sub-work/leave/index' })
    },
    goClassCheckList() {
      uni.navigateTo({ url: '/pages/sub-work/classcheck/index' })
    },
    goMySchedule() {
      uni.navigateTo({ url: '/pages/sub-work/schedule/index' })
    },
    handleStatClick(action) {
      const routes = {
        students: this.roleType === 'headteacher'
          ? '/pages/sub-work/headteacher/index'
          : '/pages/sub-work/stuinfo/index',
        leave: '/pages/sub-work/leave/index',
        todo: '/pages/sub-work/todo/index',
        attendance: '/pages/sub-work/classcheck/index',
        schedule: '/pages/sub-work/schedule/index'
      }
      if (routes[action]) {
        uni.navigateTo({ url: routes[action] })
      }
    },
    goQuickEntry(key) {
      const routes = {
        students: '/pages/sub-work/stuinfo/index',
        myClass: '/pages/sub-work/headteacher/index',
        classcheck: '/pages/sub-work/classcheck/index',
        inspection: '/pages/sub-work/inspection/index',
        talk: '/pages/sub-work/talk/index',
        leave: '/pages/sub-work/leave/index',
        todo: '/pages/sub-work/todo/index',
        schedule: '/pages/sub-work/schedule/index',
        attendance: '/pages/sub-work/attendance-summary/index',
        party: '/pages/sub-work/party/index',
        worklog: '/pages/sub-work/headteacher/worklog-list',
        addWorklog: '/pages/sub-work/headteacher/worklog-add',
        certificate: '/pages/sub-work/headteacher/certificate'
      }
      if (routes[key]) {
        let url = routes[key]
        if (key === 'talk' && this.roleType === 'headteacher') {
          url += '?viewScope=headteacher'
        }
        uni.navigateTo({ url })
      }
    },
    getQuickIconLabel(key) {
      return {
        students: '生',
        myClass: '班',
        classcheck: '课',
        inspection: '风',
        talk: '谈',
        leave: '假',
        todo: '办',
        schedule: '表',
        attendance: '勤',
        party: '党',
        worklog: '记',
        addWorklog: '录',
        certificate: '证'
      }[key] || '项'
    },
    isMiniFeatureEnabled(section, funcKey) {
      if (!this.miniConfigLoaded) return true
      const config = this.miniConfig[section]
      if (!config || !config.enabled) return false
      if (!funcKey) return true
      const funcs = config.funcs || {}
      return !!funcs[funcKey]
    },
    scheduleCount(weekday, week) {
      return this.myScheduleList.filter(course => {
        if (Number(course.weekday) !== weekday) return false
        if (course.startWeek && course.endWeek) {
          return week >= Number(course.startWeek) && week <= Number(course.endWeek)
        }
        return true
      }).length
    },
    // 获取待办类型标签
    getTodoTypeLabel(type) {
      const typeMap = {
        'talk_disciplinary': '违纪谈话',
        'talk_daily': '日常谈心',
        'talk_risk_report': '高危谈心上报',
        'talk_overdue': '谈话超期催办',
        'talk_follow_up': '谈话到期跟进',
        'classcheck_confirm': '查课确认',
        'classcheck_talk': '查课谈话',
        'study_violation_talk': '学风违纪谈话',
        'leave_talk': '请假逾期谈话',
        'offcampus_talk': '外宿谈话',
        'vehicle_talk': '车辆谈话',
        'warning_talk': '预警谈话',
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
          if (data.currentWeek) this.currentWeek = data.currentWeek
        }
        this.$nextTick(() => {
          this.buildWeekDays()
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
      const targetDate = this.selectedDay
        ? new Date(this.selectedDay.replace(/-/g, '/'))
        : new Date()
      const jsDay = targetDate.getDay()
      const weekday = jsDay === 0 ? 7 : jsDay
      const targetWeek = this.currentWeek + this.weekOffset
      if (targetWeek < 1) {
        this.selectedDayCourses = []
        return
      }
      this.selectedDayCourses = this.myScheduleList.filter(c => {
        if (Number(c.weekday) !== weekday) return false
        if (c.startWeek && c.endWeek) {
          return targetWeek >= Number(c.startWeek) && targetWeek <= Number(c.endWeek)
        }
        return true
      })
    }
  },
  computed: {
    ...createRoleComputed(),
    roleLabel() {
      return this.currentRole && this.currentRole.roleName ? this.currentRole.roleName : ''
    },
    showStudentSearch() {
      if (!['secretary', 'admin', 'counselor', 'headteacher'].includes(this.roleType)) {
        return false
      }
      return this.isMiniFeatureEnabled('student', 'stuinfo')
    },
    showScheduleSection() {
      return this.isTeacher && this.myScheduleList.length > 0
    },
    showCombinedSection() {
      return this.showScheduleSection || this.showTodoSection
    },
    showTodoSection() {
      return this.roleType !== 'headteacher' && this.roleType !== 'partyCadre'
    },
    agendaDateLabel() {
      const target = this.selectedDay || this.formatDateStr(new Date())
      const date = new Date(target.replace(/-/g, '/'))
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `第${this.currentWeek + this.weekOffset}周 · ${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
    },
    statsCards() {
      const attendance = {
        key: 'attendance',
        label: '今日到课率',
        value: this.attendanceRate,
        theme: 'green',
        icon: 'checkbox-filled',
        action: 'attendance'
      }
      if (this.roleType === 'teacher') {
        return [
          { key: 'todayCourses', label: '今日课程', value: this.todayCourseCount, theme: 'blue', icon: 'calendar-filled', action: 'schedule' },
          { key: 'weekCourses', label: '本周课程', value: this.weekCourseCount, theme: 'orange', icon: 'calendar', action: 'schedule' },
          { key: 'todo', label: '待办', value: this.todoTotal, theme: 'red', icon: 'flag-filled', action: 'todo' },
          attendance
        ]
      }
      if (this.roleType === 'headteacher') {
        return [
          { key: 'students', label: '本班学生', value: this.stuCount, theme: 'blue', icon: 'person-filled', action: 'students' },
          { key: 'todo', label: '待办', value: this.todoTotal, theme: 'orange', icon: 'flag-filled', action: 'todo' },
          { key: 'onLeave', label: '当前在假', value: this.onLeave, theme: 'red', icon: 'staff-filled', action: 'leave' },
          attendance
        ]
      }
      const studentLabel = this.roleType === 'admin'
        ? '全校学生'
        : (this.roleType === 'secretary' ? '学院学生' : '我的学生')
      return [
        { key: 'students', label: studentLabel, value: this.stuCount, theme: 'blue', icon: 'person-filled', action: 'students' },
        { key: 'todo', label: '待办', value: this.todoTotal, theme: 'orange', icon: 'flag-filled', action: 'todo' },
        { key: 'onLeave', label: '当前在假', value: this.onLeave, theme: 'red', icon: 'staff-filled', action: 'leave' },
        attendance
      ]
    },
    todayCourseCount() {
      const weekday = new Date().getDay() || 7
      return this.scheduleCount(weekday, this.currentWeek)
    },
    weekCourseCount() {
      return this.myScheduleList.filter(course => {
        if (!course.startWeek || !course.endWeek) return true
        return this.currentWeek >= Number(course.startWeek) && this.currentWeek <= Number(course.endWeek)
      }).length
    },
    quickEntries() {
      const entriesByRole = {
        secretary: [
          { key: 'students', name: '学生查询', icon: 'person-filled', color: 'blue', section: 'student', func: 'stuinfo' },
          { key: 'classcheck', name: '查课管理', icon: 'checkbox-filled', color: 'green', section: 'student', func: 'classcheck' },
          { key: 'inspection', name: '学风检查', icon: 'compose', color: 'cyan', section: 'student', func: 'inspection' },
          { key: 'leave', name: '请假审批', icon: 'paperplane-filled', color: 'red', section: 'student', func: 'leave' },
          { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'orange', section: 'student', func: 'talk' },
          { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple' }
        ],
        admin: [
          { key: 'students', name: '学生查询', icon: 'person-filled', color: 'blue', section: 'student', func: 'stuinfo' },
          { key: 'classcheck', name: '查课管理', icon: 'checkbox-filled', color: 'green', section: 'student', func: 'classcheck' },
          { key: 'inspection', name: '学风检查', icon: 'compose', color: 'cyan', section: 'student', func: 'inspection' },
          { key: 'leave', name: '请假审批', icon: 'paperplane-filled', color: 'red', section: 'student', func: 'leave' },
          { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'orange', section: 'student', func: 'talk' },
          { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple' }
        ],
        counselor: [
          { key: 'students', name: '我的学生', icon: 'person-filled', color: 'blue', section: 'student', func: 'stuinfo' },
          { key: 'classcheck', name: '查课登记', icon: 'checkbox-filled', color: 'green', section: 'student', func: 'classcheck' },
          { key: 'inspection', name: '学风检查', icon: 'compose', color: 'cyan', section: 'student', func: 'inspection' },
          { key: 'talk', name: '记录谈话', icon: 'chat-filled', color: 'orange', section: 'student', func: 'talk' },
          { key: 'leave', name: '请假审批', icon: 'paperplane-filled', color: 'red', section: 'student', func: 'leave' },
          { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple' }
        ],
        headteacher: [
          { key: 'myClass', name: '我的班级', icon: 'staff-filled', color: 'blue', section: 'headteacher' },
          { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'orange', section: 'headteacher' },
          { key: 'worklog', name: '工作记录', icon: 'list', color: 'green', section: 'headteacher' },
          { key: 'addWorklog', name: '新增记录', icon: 'plusempty', color: 'red', section: 'headteacher' },
          { key: 'certificate', name: '工作证明', icon: 'paperplane', color: 'purple', section: 'headteacher' }
        ],
        teacher: [
          { key: 'schedule', name: '我的课表', icon: 'calendar-filled', color: 'blue', section: 'teaching', func: 'schedule' },
          { key: 'attendance', name: '考勤汇总', icon: 'bars', color: 'orange', section: 'teaching', func: 'attendance_summary' },
          { key: 'classcheck', name: '查课管理', icon: 'checkbox-filled', color: 'green', section: 'student', func: 'classcheck' },
          { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'red', section: 'student', func: 'talk' },
          { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple' }
        ],
        partyCadre: [
          { key: 'party', name: '党务管理', icon: 'star-filled', color: 'red', section: 'party' },
          { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'orange', section: 'student', func: 'talk' },
          { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple' }
        ]
      }
      const entries = entriesByRole[this.roleType] || entriesByRole.teacher
      return entries.filter(item => !item.section || this.isMiniFeatureEnabled(item.section, item.func))
    },
    selectedDayTodos() {
      const date = this.selectedDay || this.formatDateStr(new Date())
      return this.todoList.filter(t => this.getTodoDate(t) === date)
    },
    selectedDayAgenda() {
      const agenda = []
      const sectionStarts = {
        1: 8 * 60,
        2: 8 * 60 + 50,
        3: 10 * 60,
        4: 10 * 60 + 50,
        5: 14 * 60,
        6: 14 * 60 + 50,
        7: 16 * 60,
        8: 16 * 60 + 50,
        9: 19 * 60,
        10: 19 * 60 + 50
      }

      if (this.showScheduleSection) {
        this.selectedDayCourses.forEach((course, index) => {
          const startSection = Number(course.startSection)
          const detail = [course.className, course.classroom].filter(Boolean).join(' · ')
          agenda.push({
            key: `course-${course.scheduleId || course.id || index}`,
            kind: 'course',
            title: course.courseName || '未命名课程',
            typeLabel: '课程',
            tagClass: 'type-course',
            meta: detail || '课程安排',
            timeLabel: course.startSection
              ? `${course.startSection}-${course.endSection || course.startSection}节`
              : '',
            sortValue: sectionStarts[startSection] || 24 * 60,
            order: index
          })
        })
      }

      if (this.showTodoSection) {
        this.selectedDayTodos.forEach((item, index) => {
          const timeSource = String(item.startTime || item.deadline || '')
          const timeMatch = timeSource.match(/[T ](\d{2}):(\d{2})/)
          agenda.push({
            key: `todo-${item.id || index}`,
            kind: 'todo',
            title: item.title || '未命名待办',
            typeLabel: item.todoType ? this.getTodoTypeLabel(item.todoType) : '待办',
            tagClass: item.todoType ? `type-${item.todoType}` : 'type-todo',
            meta: item.deadline ? `截止 ${this.formatDeadline(item.deadline)}` : '待办事项',
            timeLabel: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '',
            sortValue: timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : 24 * 60,
            order: this.selectedDayCourses.length + index,
            urgency: item.urgency,
            todo: item
          })
        })
      }

      return agenda.sort((a, b) => (a.sortValue - b.sortValue) || (a.order - b.order))
    }
  }
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: #f4f7f9;
}

.header-section {
  height: 346rpx;
  box-sizing: border-box;
  background: #155e75;
  padding: 88rpx 32rpx 84rpx;
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.header-title {
  margin-top: 10rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.35;
}

.header-kicker {
  color: rgba(255, 255, 255, 0.72);
  font-size: 23rpx;
}

.role-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.role-badge {
  padding: 6rpx 16rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 22rpx;
  line-height: 1.4;
}

.search-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -34rpx 24rpx 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 1rpx solid #e7edf2;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.05);
  position: relative;
  z-index: 1;
}

.search-input-box {
  display: flex;
  align-items: center;
  flex: 1;
}

.search-icon {
  color: #64748b;
  font-size: 24rpx;
  font-weight: 600;
}

.search-arrow {
  color: #94a3b8;
  font-size: 34rpx;
  line-height: 1;
}

.search-placeholder {
  margin-left: 12rpx;
  font-size: 28rpx;
  color: #999;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0 24rpx 20rpx;
  gap: 12rpx;
}

.stats-section.without-search {
  margin-top: -38rpx;
  position: relative;
  z-index: 1;
}

.stats-card {
  min-width: 0;
  min-height: 142rpx;
  padding: 18rpx 14rpx;
  color: #fff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.12);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stats-card:active {
  transform: translateY(2rpx);
  box-shadow: 0 6rpx 16rpx rgba(15, 23, 42, 0.1);
}

.stats-card::after {
  content: '';
  position: absolute;
  right: -46rpx;
  bottom: -58rpx;
  width: 126rpx;
  height: 126rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.stats-blue {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.stats-orange {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stats-red {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.stats-green {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stats-card-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  z-index: 1;
}

.stats-icon {
  display: none;
}

.stats-num {
  margin-top: 14rpx;
  font-size: 42rpx;
  line-height: 1.2;
  font-weight: 700;
  color: #fff;
  position: relative;
  z-index: 1;
}

.stats-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 21rpx;
  line-height: 1.4;
  white-space: nowrap;
}

.content-stack {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin: 0 24rpx 24rpx;
}

.content-stack .section-card {
  margin: 0;
}

.course-section-card {
  order: 1;
  padding: 16rpx;
}

.course-section-card .section-header {
  margin-bottom: 8rpx;
}

.quick-section-card {
  order: 2;
}

.section-card {
  background: #fff;
  border-radius: 16rpx;
  border: 1rpx solid #e7edf2;
  padding: 28rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  color: #1e293b;
  font-size: 30rpx;
  font-weight: 700;
}

.section-title-group {
  display: flex;
  align-items: baseline;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.section-date {
  margin-left: 14rpx;
  color: #94a3b8;
  font-size: 22rpx;
}

.section-more {
  font-size: 24rpx;
  color: #0f766e;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}

/* 周导航 */
.week-nav-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}
.week-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.week-label-sub {
  font-size: 24rpx;
  color: #0f766e;
  margin-left: 8rpx;
}
.week-back {
  font-size: 24rpx;
  color: #0f766e;
  margin-left: 16rpx;
}

/* 周日历 */
.week-calendar {
  display: flex;
  align-items: center;
  background: #f8f9fb;
  border-radius: 10rpx;
  padding: 8rpx 4rpx;
  margin-bottom: 8rpx;
}

.week-arrow {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.week-arrow-glyph {
  color: #64748b;
  font-size: 36rpx;
  line-height: 1;
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
  padding: 4rpx 0;
  width: 64rpx;
  border-radius: 10rpx;
  position: relative;
  transition: all 0.2s;
}

.week-day-label {
  font-size: 18rpx;
  color: #999;
  margin-bottom: 2rpx;
}

.week-day-num {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.week-day-item.is-weekend .week-day-label {
  color: #f3a044;
}

.week-day-item.is-today {
  background: #0f766e;
}

.week-day-item.is-today .week-day-label,
.week-day-item.is-today .week-day-num {
  color: #fff;
}

.week-day-item.is-selected {
  background: #ccfbf1;
}

.week-day-item.is-selected .week-day-num {
  color: #0f766e;
  font-weight: 700;
}

.week-day-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #e43d33;
  margin-top: 3rpx;
}

.week-day-item.is-today .week-day-dot {
  background: #fff;
}

.todo-empty {
  padding: 12rpx 0;
  text-align: center;
}

.todo-empty-text {
  font-size: 23rpx;
  color: #ccc;
}

.agenda-list {
  display: flex;
  flex-direction: column;
}

.agenda-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.agenda-item:last-child {
  border-bottom: none;
  padding-bottom: 2rpx;
}

.agenda-item .todo-left {
  align-items: center;
  min-width: 0;
}

.agenda-item .todo-dot {
  margin-top: 0;
}

.agenda-time {
  flex-shrink: 0;
  color: #64748b;
  font-size: 22rpx;
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

.schedule-summary {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.summary-pill {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 1.4;
}

.summary-course {
  background: #ecfdf5;
  color: #0f766e;
}

.summary-todo {
  background: #fff7ed;
  color: #c2410c;
}

.schedule-todo-block {
  margin-top: 8rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid #edf2f7;
}

.todo-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.todo-day-title {
  margin-bottom: 8rpx;
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
  background: #0f766e;
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

.course-empty {
  padding: 28rpx 0 8rpx;
  text-align: center;
  color: #94a3b8;
  font-size: 25rpx;
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
  &.dot-normal { background: #94a3b8; }
  &.dot-course { background: #0f766e; }
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.todo-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.todo-text {
  font-size: 26rpx;
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
  &.type-course {
    background: #ccfbf1;
    color: #0f766e;
  }
  &.type-todo {
    background: #f1f5f9;
    color: #64748b;
  }
  &.type-talk_disciplinary {
    background: #ffe8e8;
    color: #e43d33;
  }
  &.type-talk_daily {
    background: #e8f5ff;
    color: #2979ff;
  }
  &.type-talk_risk_report,
  &.type-talk_overdue {
    background: #ffe8e8;
    color: #e43d33;
  }
  &.type-talk_follow_up {
    background: #fff8e1;
    color: #f3a044;
  }
  &.type-classcheck_confirm,
  &.type-classcheck_talk,
  &.type-leave_talk,
  &.type-offcampus_talk,
  &.type-vehicle_talk,
  &.type-warning_talk {
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
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
  margin-left: 0;
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
  padding: 12rpx 0;
  position: relative;
  box-sizing: border-box;
}

.quick-icon {
  width: 82rpx;
  height: 82rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.quick-icon-glyph {
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1;
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
.icon-cyan { background: linear-gradient(135deg, #0891b2 0%, #22d3ee 100%); }

.quick-name {
  width: 100%;
  padding: 0 6rpx;
  box-sizing: border-box;
  font-size: 24rpx;
  color: #333;
  line-height: 1.4;
  text-align: center;
}
</style>
