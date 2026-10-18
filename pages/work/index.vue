<template>
  <view class="work-container">
    <!-- 顶部学工金句 -->
    <view class="greeting-section" @click="refreshQuote">
      <view class="quote-content">
        <view class="quote-main">
          <view class="quote-first-line-float"></view>
          <text class="quote-text">{{ workQuote.text || '用心做教育,用爱育未来' }}</text>
        </view>
        <text class="quote-author">—— {{ workQuote.author || '学工团队' }}</text>
      </view>
    </view>

    <view class="offline-banner" v-if="offlineSummary.total > 0" @click="syncOfflineQueue">
      <view class="offline-copy">
        <text class="offline-title">{{ offlineSummary.failed ? '有事项同步失败' : '有事项等待同步' }}</text>
        <text class="offline-sub">待同步 {{ offlineSummary.pending }} 条 · 失败 {{ offlineSummary.failed }} 条</text>
      </view>
      <text class="offline-action">{{ syncOfflineLoading ? '同步中...' : '立即同步' }}</text>
    </view>

    <!-- 数据汇总卡片(所有角色都显示) -->
    <view class="summary-cards-grid">
      <view class="summary-card-item">
        <text class="stats-num">{{ summaryData.attendanceRate }}</text>
        <text class="stats-label">当天到课率</text>
      </view>
      
      <view class="summary-card-item" @click="goLeaveList">
        <text class="stats-num orange">{{ summaryData.pendingLeave }}/{{ summaryData.onLeave }}</text>
        <text class="stats-label">待审批/在假</text>
      </view>
      
      <view class="summary-card-item">
        <text class="stats-num red">{{ summaryData.talkCount }}</text>
        <text class="stats-label">谈话次数</text>
      </view>
      
      <view class="summary-card-item">
        <text class="stats-num blue">{{ summaryData.activityCount }}</text>
        <text class="stats-label">活动总数</text>
      </view>
    </view>

    <!-- 今日课程与本周考勤（教师） -->
    <view class="teacher-week-section" v-if="showTeaching">
      <view class="teacher-tabs">
        <view class="teacher-tab" :class="{ active: teacherTab === 'courses' }" @click="switchTeacherTab('courses')">
          今日课程
        </view>
        <view class="teacher-tab" :class="{ active: teacherTab === 'calendar' }" @click="switchTeacherTab('calendar')">
          校历
        </view>
      </view>

      <view v-show="teacherTab === 'courses'" class="teacher-tab-panel">
        <view class="tw-head">
          <view class="tw-head-copy">
            <text class="tw-sub">{{ currentWeek ? '第 ' + currentWeek + ' 周' : '本周' }} · {{ todayCourses.length }} 节</text>
            <text v-if="todayScheduleNote" class="tw-note">{{ todayScheduleNote }}</text>
          </view>
          <text class="tw-link" @click="goSchedule">完整课表 ›</text>
        </view>

        <view v-if="todayCourses.length > 0" class="today-course-list">
          <view v-for="course in todayCourses" :key="course.key" class="today-course-item">
            <view class="tc-time">
              <text class="tc-section">{{ course.startSection }}-{{ course.endSection }}节</text>
              <text class="tc-clock">{{ course.timeText }}</text>
            </view>
            <view class="tc-main">
              <text class="tc-name">{{ course.courseName }}</text>
              <text class="tc-meta">{{ course.className }} · {{ course.classroom || '教室待定' }}</text>
            </view>
            <view class="tc-action" :class="{ 'is-done': course.hasChecked }" @click="goRollCall(course)">
              {{ course.hasChecked ? '已点名' : '点名' }}
            </view>
          </view>
        </view>
        <view v-else class="tw-empty">
          <text>{{ scheduleLoading ? '课表加载中...' : (todayCalendarRule && !todayCalendarRule.isTeachingDay ? (todayCalendarRule.holidayName ? todayCalendarRule.holidayName + ' · 停课' : '今日停课') : '今日暂无课程') }}</text>
        </view>
      </view>

      <view v-show="teacherTab === 'calendar'" class="calendar-panel">
        <view class="cal-head">
          <text class="cal-arrow" @click="changeCalendarMonth(-1)">‹</text>
          <text class="cal-month">{{ calendarMonthLabel }}</text>
          <text class="cal-arrow" @click="changeCalendarMonth(1)">›</text>
        </view>
        <view class="cal-weekdays">
          <text v-for="label in ['一', '二', '三', '四', '五', '六', '日']" :key="label">{{ label }}</text>
        </view>
        <view class="cal-grid">
          <view
            v-for="(cell, index) in calendarCells"
            :key="index"
            class="cal-cell"
            :class="{ 'is-empty': !cell.day, 'is-today': cell.isToday, 'is-holiday': cell.isHoliday }"
          >
            <template v-if="cell.day">
              <text class="cal-day">{{ cell.day }}</text>
              <text v-if="cell.isHoliday" class="cal-flag">休</text>
              <text v-else-if="cell.isMakeup" class="cal-flag makeup">调</text>
              <text v-else-if="cell.weekday === 1 && cell.weekNumber" class="cal-week-no">第{{ cell.weekNumber }}周</text>
              <text v-if="cell.holidayName" class="cal-holiday-name">{{ cell.holidayName }}</text>
            </template>
          </view>
        </view>
        <view class="cal-legend">
          <text class="cal-legend-item"><text class="cal-dot today"></text>今天</text>
          <text class="cal-legend-item"><text class="cal-dot holiday"></text>节假日</text>
        </view>
        <view v-if="calendarLoading" class="tw-empty"><text>校历加载中...</text></view>
      </view>

      <view class="week-attendance">
        <view class="wa-head">
          <text class="wa-title">本周考勤</text>
          <text class="wa-link" @click="goAttendanceSummary">学期汇总 ›</text>
        </view>
        <view class="wa-stats">
          <view class="wa-item"><text class="wa-num">{{ weekAttendance.sessions }}</text><text class="wa-label">点名</text></view>
          <view class="wa-item"><text class="wa-num green">{{ weekAttendance.present }}</text><text class="wa-label">出勤</text></view>
          <view class="wa-item"><text class="wa-num orange">{{ weekAttendance.leave }}</text><text class="wa-label">请假</text></view>
          <view class="wa-item"><text class="wa-num red">{{ weekAttendance.absent }}</text><text class="wa-label">旷课</text></view>
        </view>
      </view>
    </view>

    <!-- 我的待办 -->
    <view class="func-section" v-if="todoList.length > 0">
      <view class="section-header" @click="goTodo">
        <text class="section-title">我的待办</text>
        <view class="section-more">
          <text class="section-more-text">共 {{ todoList.length }} 条</text>
          <uni-icons type="right" size="14" color="#999"></uni-icons>
        </view>
      </view>
      <view class="todo-list">
        <view class="todo-item" v-for="item in todoList.slice(0, 5)" :key="item.id" @click="goTodo">
          <view class="todo-item-left">
            <view class="todo-type-dot" :style="{ backgroundColor: getTodoColor(item.todoType) }"></view>
            <view class="todo-item-info">
              <text class="todo-item-title">{{ item.title }}</text>
              <text class="todo-item-time">{{ formatTodoTime(item) }}</text>
            </view>
          </view>
          <text class="todo-type-label">{{ formatTodoType(item.todoType) }}</text>
        </view>
      </view>
    </view>

    <!-- 教学管理（菜单驱动：mini:teaching） -->
    <view class="func-section" v-if="showTeaching">
      <view class="section-header" @click="toggleTeachingSection">
        <text class="section-title">教学管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="teachingCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view class="func-grid" v-if="!teachingCollapsed">
        <view class="func-item" v-for="item in teachingFuncs" :key="item.key" @click="onFuncClick(item)">
          <view :class="['func-icon', 'icon-' + item.color]">
            <uni-icons :type="item.icon" size="26" color="#fff"></uni-icons>
          </view>
          <text class="func-name">{{ item.name }}</text>
        </view>
      </view>
    </view>

    <!-- 学生管理（菜单驱动：mini:student） -->
    <view class="func-section" v-if="showStudent">
      <view class="section-header" @click="toggleStudentSection">
        <text class="section-title">学生管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="studentCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view class="func-grid" v-if="!studentCollapsed">
        <view class="func-item" v-for="item in allStudentFuncs" :key="item.key" @click="onFuncClick(item)">
          <view :class="['func-icon', 'icon-' + item.color]">
            <uni-icons :type="item.icon" size="26" color="#fff"></uni-icons>
          </view>
          <text class="func-name">{{ item.name }}</text>
        </view>
      </view>
    </view>

    <!-- 班主任管理（菜单驱动：mini:headteacher） -->
    <view class="func-section ht-section" v-if="showHeadteacher">
      <view class="section-header" @click="toggleHtSection">
        <text class="section-title">班主任管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="htCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view v-if="!htCollapsed">
        <!-- 未分配班级提示 -->
        <view class="ht-no-class" v-if="htClassList.length === 0">
          <uni-icons type="info" size="20" color="#f3a044"></uni-icons>
          <text class="ht-no-class-text">暂未分配班级，快捷操作不可用</text>
        </view>
        <view class="func-grid">
          <view :class="getHtItemClass('myClass')" @click="onHtFuncClick('myClass')">
            <view class="func-icon icon-green">
              <uni-icons type="staff-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">我的班级</text>
            <text class="func-name ht-count" v-if="htClassList.length > 0">({{ htClassList.length }})</text>
          </view>
          <view :class="getHtItemClass('talk')" @click="onHtFuncClick('talk')">
            <view class="func-icon icon-orange">
              <uni-icons type="chat-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">谈心谈话</text>
          </view>
          <view :class="getHtItemClass('worklog')" @click="onHtFuncClick('worklog')">
            <view class="func-icon icon-blue">
              <uni-icons type="list" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">工作记录</text>
          </view>
          <view :class="getHtItemClass('addWorklog')" @click="onHtFuncClick('addWorklog')">
            <view class="func-icon icon-orange">
              <uni-icons type="plusempty" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">新增记录</text>
          </view>
          <view :class="getHtItemClass('certificate')" @click="onHtFuncClick('certificate')">
            <view class="func-icon icon-purple">
              <uni-icons type="paperplane" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">工作证明</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 党务管理（菜单驱动：mini:party） -->
    <view class="func-section party-section" v-if="showParty">
      <view class="section-header" @click="togglePartySection">
        <text class="section-title">党务管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="partyCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view v-if="!partyCollapsed">
        <view class="func-grid">
          <view class="func-item" @click="onPartyFuncClick('members')" v-if="isPartyFuncEnabled('member')">
            <view class="func-icon icon-red">
              <uni-icons type="staff-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">党员管理</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('committee')">
            <view class="func-icon icon-blue">
              <uni-icons type="auth-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">委员设置</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('thoughtReport')" v-if="isPartyFuncEnabled('thoughtReport')">
            <view class="func-icon icon-green">
              <uni-icons type="chat-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">思想汇报</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('fee')" v-if="isPartyFuncEnabled('fee')">
            <view class="func-icon icon-orange">
              <uni-icons type="wallet" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">党费管理</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('training')" v-if="isPartyFuncEnabled('training')">
            <view class="func-icon icon-purple">
              <uni-icons type="calendar-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">培训管理</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getUnreadCount, listTodo } from '@/api/work/todo'
import { listStuinfo } from '@/api/student/stuinfo'
import { listClassCheck } from '@/api/work/classcheck'
import { getRoleViewConfig } from '@/utils/roleViewConfig'
import { getWorkStats } from '@/api/student/workstats'
import { getRandomQuote } from '@/api/work/workquote'
import { listActivity } from '@/api/work/activity'
import { roleMixin } from '@/utils/roleSystem'
import { getMyMiniConfig } from '@/api/system/miniConfig'
import { getMyClasses } from '@/api/affair/headteacher'
import { getMySchedule, getActiveSchedule, getMonthCalendar } from '@/api/work/schedule'
import { getTeacherReport, getCheckStatus } from '@/api/work/rollcall'
import { resolveCalendarRule } from '@/utils/academicCalendar'
import { flushOfflineQueue, getOfflineSummary, retryAllOfflineItems } from '@/utils/offlineQueue'

// 全量功能定义
const ALL_FUNCS = [
  { key: 'stuinfo', name: '我的学生', icon: 'person-filled', color: 'blue', url: '/pages/sub-work/stuinfo/index' },
  { key: 'classcheck', name: '查课管理', icon: 'checkbox-filled', color: 'green', url: '/pages/sub-work/classcheck/index' },
  { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'orange', url: '/pages/sub-work/talk/index' },
  { key: 'leave', name: '请假管理', icon: 'paperplane-filled', color: 'red', url: '/pages/sub-work/leave/index' },
  { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple', url: '/pages/sub-work/todo/index' },
  { key: 'party', name: '党务管理', icon: 'star-filled', color: 'red', url: '/pages/sub-work/party/index' },
  { key: 'vehicle', name: '车辆登记', icon: 'car', color: 'cyan', url: '/pages/sub-work/vehicle/index' },
  { key: 'offcampus', name: '外宿管理', icon: 'home', color: 'purple', url: '/pages/sub-work/offcampus/index' },
  { key: 'dormcheck', name: '宿舍管理', icon: 'home', color: 'cyan', url: '/pages/sub-work/dormcheck/index' }
]

// 默认常用功能 key
const DEFAULT_COMMON = ['stuinfo', 'classcheck', 'talk', 'leave', 'todo', 'party']

const STORAGE_KEY = 'work_common_funcs'
const STATS_CACHE_KEY = 'work_stats_cache'
const STATS_CACHE_EXPIRE = 5 * 60 * 1000 // 5分钟缓存

export default {
  mixins: [roleMixin],
  data() {
    return {
      // 视图配置（从数据库加载）
      viewConfig: null,
      teacherName: '',
      unreadCount: 0,
      editingCommon: false,
      studentCollapsed: false,
      teachingCollapsed: false,
      htCollapsed: false,
      partyCollapsed: false,
      commonKeys: [],
      // 小程序配置（从后端 API 加载）
      miniConfig: {},
      // 班主任班级列表
      htClassList: [],
      // 书记角色相关
      isSecretaryRole: true,
      summaryData: {
        attendanceRate: '--',
        pendingLeave: '--',
        onLeave: '--',
        talkCount: '--',
        activityCount: '--'
      },
      todayCourses: [],
      currentWeek: 0,
      scheduleLoading: false,
      sectionTimes: [],
      todayStr: '',
      teacherTab: 'courses',
      calendarMonth: '',
      calendarCells: [],
      calendarLoading: false,
      todayCalendarRule: null,
      weekAttendance: {
        sessions: 0,
        present: 0,
        leave: 0,
        absent: 0
      },
      pendingList: [],
      todoList: [],
      // 学工金句
      workQuote: {
        text: '',
        author: ''
      },
      offlineSummary: { total: 0, pending: 0, failed: 0, items: [] },
      syncOfflineLoading: false
    }
  },
  computed: {
    // ===== 配置驱动的模块可见性（通过 PC 后台"小程序配置"页面控制） =====
    showTeaching() { return this.miniConfig.teaching && this.miniConfig.teaching.enabled },
    calendarMonthLabel() {
      if (!this.calendarMonth) return ''
      const [year, month] = this.calendarMonth.split('-')
      return `${year}年${Number(month)}月`
    },
    todayScheduleNote() {
      const rule = this.todayCalendarRule
      if (!rule) return ''
      if (!rule.isTeachingDay) {
        return rule.holidayName ? `${rule.holidayName} · 停课` : '今日停课'
      }
      if (rule.isMakeup) {
        const names = ['一', '二', '三', '四', '五', '六', '日']
        return `调课 · 按周${names[rule.effectiveWeekday - 1] || ''}课表`
      }
      return ''
    },
    showStudent() { return this.miniConfig.student && this.miniConfig.student.enabled },
    showParty() { return this.miniConfig.party && this.miniConfig.party.enabled },
    showHeadteacher() { return this.miniConfig.headteacher && this.miniConfig.headteacher.enabled },
    // 教学管理功能列表
    teachingFuncs() {
      const all = [
        { key: 'schedule', name: '我的课表', icon: 'calendar', color: 'blue', url: '/pages/sub-work/schedule/index' },
        { key: 'attendance_summary', name: '考勤汇总', icon: 'bars', color: 'orange', url: '/pages/sub-work/attendance-summary/index' }
      ]
      const funcs = (this.miniConfig.teaching && this.miniConfig.teaching.funcs) || {}
      return all.filter(f => funcs[f.key])
    },
    allStudentFuncs() {
      const funcs = (this.miniConfig.student && this.miniConfig.student.funcs) || {}
      const funcKeyMap = { stuinfo: 'stuinfo', classcheck: 'classcheck', talk: 'talk', leave: 'leave', offcampus: 'offcampus', dormcheck: 'dormcheck' }
      return ALL_FUNCS.filter(f => funcKeyMap[f.key] && funcs[funcKeyMap[f.key]])
    },
    commonList() {
      const studentFuncs = (this.miniConfig.student && this.miniConfig.student.funcs) || {}
      const funcKeyMap = { stuinfo: 'stuinfo', classcheck: 'classcheck', talk: 'talk', leave: 'leave', offcampus: 'offcampus', dormcheck: 'dormcheck' }
      return this.commonKeys
        .map(k => ALL_FUNCS.find(f => f.key === k))
        .filter(f => f && (funcKeyMap[f.key] ? studentFuncs[funcKeyMap[f.key]] : true))
    },
    availableToAdd() {
      const studentFuncs = (this.miniConfig.student && this.miniConfig.student.funcs) || {}
      const funcKeyMap = { stuinfo: 'stuinfo', classcheck: 'classcheck', talk: 'talk', leave: 'leave', offcampus: 'offcampus', dormcheck: 'dormcheck' }
      return ALL_FUNCS.filter(f => !this.commonKeys.includes(f.key) && (funcKeyMap[f.key] ? studentFuncs[funcKeyMap[f.key]] : true))
    }
  },
  async created() {
    
    // 初始化汇总数据为加载状态
    this.initSummaryData()
    
    // 加载小程序工作台配置
    this.loadMiniConfig()
    
    // 加载教师姓名
    this.loadTeacherName()
    
    // 从数据库加载角色视图配置
    this.viewConfig = await getRoleViewConfig('work_index')
    
    this.loadCommonKeys()
    
    // 检查角色并加载班主任数据
    await this.checkRole()
    if (this.isHeadteacherRole) {
      this.loadHtClasses()
    }
    
    // 初始化时随机选择一条金句
    this.refreshQuote()
    this.refreshOfflineSummary()
    uni.$on('offlineQueueChanged', this.refreshOfflineSummary)
  },
  onShow() {
    this.refreshOfflineSummary()
    flushOfflineQueue()
    this.loadUnread()
    // 始终加载汇总数据
    this.loadSummaryData()
    // 教师课表与本周考勤
    this.loadTeacherHomeData()
    this.loadWeekAttendance()
    // 加载待办事项
    this.loadTodoList()
  },
  beforeDestroy() {
    uni.$off('offlineQueueChanged', this.refreshOfflineSummary)
  },
  methods: {
    refreshOfflineSummary() {
      this.offlineSummary = getOfflineSummary()
    },
    syncOfflineQueue() {
      if (this.syncOfflineLoading) return
      this.syncOfflineLoading = true
      if (this.offlineSummary.failed > 0) {
        retryAllOfflineItems()
      }
      flushOfflineQueue().then(result => {
        this.refreshOfflineSummary()
        if (result.synced > 0) {
          uni.showToast({ title: '已同步 ' + result.synced + ' 条', icon: 'success' })
        } else if (result.failed > 0) {
          uni.showToast({ title: '仍有同步失败事项', icon: 'none' })
        }
      }).finally(() => {
        this.syncOfflineLoading = false
      })
    },
    // 检查党务子功能是否启用
    isPartyFuncEnabled(funcKey) {
      const funcs = (this.miniConfig.party && this.miniConfig.party.funcs) || {}
      return !!funcs[funcKey]
    },
    // 加载小程序工作台配置
    loadMiniConfig() {
      getMyMiniConfig().then(res => {
        this.miniConfig = res.data || {}
      }).catch(() => {
        this.miniConfig = {}
      })
    },
    // 初始化汇总数据
    initSummaryData() {
      this.summaryData = {
        attendanceRate: '--',
        pendingLeave: '--',
        onLeave: '--',
        talkCount: '--',
        activityCount: '--'
      }
    },
    // 加载教师姓名
    loadTeacherName() {
      if (!this.$store.state.user.id) {
        this.$store.dispatch('GetInfo').then(() => {
          this.fetchTeacherName()
        }).catch(() => {
          this.teacherName = ''
        })
      } else {
        this.fetchTeacherName()
      }
    },
    // 获取教师姓名
    fetchTeacherName() {
      const userId = this.$store.state.user.id
      if (!userId) {
        this.teacherName = ''
        return
      }
      
      // 使用 store 中的用户信息
      this.teacherName = this.$store.getters.name || ''
    },
    // 加载汇总数据
    loadSummaryData() {
      // 检查缓存(5分钟有效期)
      const cache = uni.getStorageSync(STATS_CACHE_KEY)
      if (cache && cache.data && (Date.now() - cache.timestamp < STATS_CACHE_EXPIRE)) {
        this.summaryData = cache.data
        // 加载缓存中的金句
        if (cache.data.workQuote) {
          this.workQuote = cache.data.workQuote
        }
        return
      }
      
      // 只需一个请求,获取所有统计数据
      this.fetchWorkStats().catch(() => {
        // 静默失败,使用默认值
      })
    },
    // 获取工作台统计(包含待审批)
    fetchWorkStats() {
      const statsPromise = getWorkStats().then(res => {
        if (res && res.data) {
          this.summaryData.attendanceRate = res.data.attendanceRate || '0%'
          this.summaryData.talkCount = res.data.talkCount || '0'
          this.summaryData.onLeave = res.data.onLeave || '0'
          this.summaryData.pendingLeave = res.data.pendingLeave || '0'
        }
      }).catch(() => {})
      
      const activityPromise = listActivity({ pageNum: 1, pageSize: 1 }).then(res => {
        this.summaryData.activityCount = res.total || 0
      }).catch(() => {})
      
      return Promise.all([statsPromise, activityPromise]).then(() => {
        // 保存缓存
        uni.setStorageSync(STATS_CACHE_KEY, {
          data: {
            attendanceRate: this.summaryData.attendanceRate,
            talkCount: this.summaryData.talkCount,
            onLeave: this.summaryData.onLeave,
            pendingLeave: this.summaryData.pendingLeave,
            activityCount: this.summaryData.activityCount
          },
          timestamp: Date.now()
        })
      })
    },
    formatDateStr(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    getCourseTimeText(course) {
      const start = Number(course.startSection)
      const end = Number(course.endSection)
      const startItem = this.sectionTimes[start - 1]
      const endItem = this.sectionTimes[end - 1]
      if (startItem && endItem && startItem.start && endItem.end) {
        return `${startItem.start}-${endItem.end}`
      }
      return `第${start}-${end}节`
    },
    async loadTeacherHomeData() {
      this.scheduleLoading = true
      const now = new Date()
      this.todayStr = this.formatDateStr(now)
      if (!this.calendarMonth) {
        this.calendarMonth = this.todayStr.slice(0, 7)
      }
      const weekday = now.getDay() === 0 ? 7 : now.getDay()
      try {
        const [scheduleRes, timesRes, calendarRes] = await Promise.all([
          getMySchedule(),
          getActiveSchedule(this.todayStr).catch(() => null),
          getMonthCalendar(this.todayStr.slice(0, 7)).catch(() => null)
        ])
        const data = (scheduleRes && scheduleRes.data) || {}
        this.currentWeek = Number(data.currentWeek || 0)
        const calendarList = (calendarRes && calendarRes.data) || []
        const todayEntry = calendarList.find(item =>
          String(item.calDate || '').substring(0, 10) === this.todayStr
        )
        const todayRule = resolveCalendarRule(todayEntry)
        this.todayCalendarRule = todayRule
        const isTeachingDay = todayRule ? todayRule.isTeachingDay : weekday <= 5
        const effectiveWeekday = todayRule && todayRule.effectiveWeekday
          ? todayRule.effectiveWeekday
          : weekday
        const scheme = timesRes && timesRes.data
        if (scheme && scheme.detailList && scheme.detailList.length) {
          this.sectionTimes = scheme.detailList
            .slice()
            .sort((a, b) => Number(a.lessonNo) - Number(b.lessonNo))
            .map(item => ({ start: item.startTime, end: item.endTime }))
        }
        const raw = isTeachingDay
          ? (data.scheduleList || []).filter(item =>
              Number(item.weekday) === effectiveWeekday &&
              Number(item.startSection) >= 1 &&
              (!this.currentWeek ||
                (Number(item.startWeek || 1) <= this.currentWeek &&
                 Number(item.endWeek || 999) >= this.currentWeek))
            )
          : []
        const groups = {}
        raw.forEach(item => {
          const key = [item.courseName, item.startSection, item.endSection, item.classroom || ''].join('|')
          if (!groups[key]) {
            groups[key] = {
              ...item,
              key,
              bjdmList: item.bjdm ? [item.bjdm] : [],
              classNameList: item.className ? [item.className] : []
            }
          } else {
            if (item.bjdm && !groups[key].bjdmList.includes(item.bjdm)) {
              groups[key].bjdmList.push(item.bjdm)
            }
            if (item.className && !groups[key].classNameList.includes(item.className)) {
              groups[key].classNameList.push(item.className)
            }
          }
        })
        const courses = Object.values(groups).map(item => ({
          ...item,
          className: item.classNameList.length > 1 ? item.classNameList.join('、') : (item.className || ''),
          timeText: this.getCourseTimeText(item),
          hasChecked: false
        })).sort((a, b) => Number(a.startSection) - Number(b.startSection))
        await Promise.all(courses.map(async course => {
          if (!course.bjdm) return
          try {
            const res = await getCheckStatus(course.bjdm, this.todayStr, Number(course.startSection))
            course.hasChecked = !!(res && res.data && res.data.id)
          } catch (e) {}
        }))
        this.todayCourses = courses
      } catch (e) {
        this.todayCourses = []
      }
      this.scheduleLoading = false
    },
    async loadWeekAttendance() {
      const now = new Date()
      const weekday = now.getDay() === 0 ? 7 : now.getDay()
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (weekday - 1))
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
      try {
        const res = await getTeacherReport({
          startDate: this.formatDateStr(monday),
          endDate: this.formatDateStr(sunday),
          pageNum: 1,
          pageSize: 1000
        })
        const rows = res.rows || []
        this.weekAttendance = {
          sessions: rows.length,
          present: rows.reduce((sum, row) => sum + Number(row.presentCount || 0), 0),
          leave: rows.reduce((sum, row) => sum + Number(row.leaveCount || 0), 0),
          absent: rows.reduce((sum, row) => sum + Number(row.absentCount || 0), 0)
        }
      } catch (e) {
        this.weekAttendance = { sessions: 0, present: 0, leave: 0, absent: 0 }
      }
    },
    goSchedule() {
      uni.navigateTo({ url: '/pages/sub-work/schedule/index' })
    },
    goAttendanceSummary() {
      uni.navigateTo({ url: '/pages/sub-work/attendance-summary/index' })
    },
    goRollCall(course) {
      const params = {
        bjdm: course.bjdm || '',
        className: course.className || '',
        courseName: course.courseName || '',
        classroom: course.classroom || '',
        checkDate: this.todayStr || this.formatDateStr(new Date()),
        startSection: course.startSection || '',
        endSection: course.endSection || '',
        weekday: course.weekday || ''
      }
      if (course.bjdmList && course.bjdmList.length > 1) {
        params.bjdmList = JSON.stringify(course.bjdmList)
        params.classNames = course.className || ''
      }
      const query = Object.keys(params)
        .map(key => key + '=' + encodeURIComponent(params[key]))
        .join('&')
      uni.navigateTo({ url: '/pages/sub-work/rollcall/index?' + query })
    },
    switchTeacherTab(tab) {
      this.teacherTab = tab
      if (tab === 'calendar' && this.calendarCells.length === 0) {
        this.loadCalendar()
      }
    },
    async loadCalendar() {
      if (!this.calendarMonth) {
        this.calendarMonth = this.formatDateStr(new Date()).slice(0, 7)
      }
      this.calendarLoading = true
      try {
        const res = await getMonthCalendar(this.calendarMonth)
        const list = res.data || []
        const map = {}
        list.forEach(item => {
          if (item.calDate) {
            map[String(item.calDate).substring(0, 10)] = item
          }
        })
        const [year, month] = this.calendarMonth.split('-').map(Number)
        const firstDay = new Date(year, month - 1, 1)
        const daysInMonth = new Date(year, month, 0).getDate()
        const firstWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay()
        const today = this.formatDateStr(new Date())
        const cells = []
        for (let i = 1; i < firstWeekday; i++) {
          cells.push({})
        }
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const info = map[dateStr] || {}
          const rule = resolveCalendarRule(info)
          const weekday = Number(info.weekday) || ((firstWeekday + day - 2) % 7 + 1)
          cells.push({
            day,
            date: dateStr,
            weekday,
            weekNumber: Number(info.weekNumber) || 0,
            isHoliday: Number(info.isHoliday) === 1,
            isMakeup: rule ? rule.isMakeup : false,
            holidayName: info.holidayName || '',
            isToday: dateStr === today
          })
        }
        this.calendarCells = cells
      } catch (e) {
        this.calendarCells = []
      }
      this.calendarLoading = false
    },
    changeCalendarMonth(offset) {
      const base = this.calendarMonth || this.formatDateStr(new Date()).slice(0, 7)
      const [year, month] = base.split('-').map(Number)
      const target = new Date(year, month - 1 + offset, 1)
      this.calendarMonth = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
      this.calendarCells = []
      this.loadCalendar()
    },
    // 随机选择一条金句（从后端获取）
    refreshQuote() {
      getRandomQuote().then(res => {
        if (res.data) {
          this.workQuote = {
            text: res.data.text || '用心做教育,用爱育未来',
            author: res.data.author || '学工团队'
          }
          
          // 更新缓存
          const cache = uni.getStorageSync(STATS_CACHE_KEY)
          if (cache && cache.data) {
            cache.data.workQuote = this.workQuote
            cache.timestamp = Date.now()
            uni.setStorageSync(STATS_CACHE_KEY, cache)
          }
        }
      }).catch(() => {
        // 如果接口失败，使用默认金句
        this.workQuote = {
          text: '用心做教育,用爱育未来',
          author: '学工团队'
        }
      })
    },
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return ''
      const date = new Date(timeStr.replace(/ /g, 'T'))
      const now = new Date()
      const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      if (diff === 0) return '今天'
      if (diff === 1) return '昨天'
      if (diff < 7) return diff + '天前'
      
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}/${day}`
    },
    // 获取紧急程度
    getUrgency(days) {
      if (!days) return 'low'
      if (days <= 1) return 'high'
      if (days <= 3) return 'medium'
      return 'low'
    },
    // 跳转到学生列表
    goStudentList() {
      uni.navigateTo({ url: '/pages/sub-work/stuinfo/index' })
    },
    // 跳转到请假列表
    goLeaveList() {
      uni.navigateTo({ url: '/pages/sub-work/leave/index' })
    },
    // 跳转到请假详情
    goLeaveDetail(item) {
      uni.navigateTo({ url: `/pages/sub-work/leave/detail?id=${item.id}` })
    },
    // 跳转到查课列表
    goClassCheckList() {
      uni.navigateTo({ url: '/pages/sub-work/classcheck/index' })
    },
    loadCommonKeys() {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved && Array.isArray(saved) && saved.length > 0) {
        this.commonKeys = saved
      } else {
        this.commonKeys = [...DEFAULT_COMMON]
      }
    },
    saveCommonKeys() {
      uni.setStorageSync(STORAGE_KEY, this.commonKeys)
    },
    loadUnread() {
      getUnreadCount().then(res => {
        this.unreadCount = res.data || 0
      }).catch(() => {})
    },
    // 加载待办事项
    loadTodoList() {
      listTodo().then(res => {
        this.todoList = res.data || []
      }).catch(() => {
        this.todoList = []
      })
    },
    // 获取待办类型颜色
    getTodoColor(type) {
      const colorMap = {
        'schedule': '#18bc37', 'meeting': '#2979ff',
        'leave': '#9c27b0', 'leave_approval': '#9c27b0',
        'talk_disciplinary': '#e43d33', 'talk_daily': '#00bcd4',
        'classcheck_talk': '#ff9800', 'classcheck_confirm': '#2979ff',
        'leave_talk': '#ff9800', 'offcampus_talk': '#ff9800',
        'vehicle_talk': '#ff9800', 'warning_talk': '#ff9800'
      }
      return colorMap[type] || '#909399'
    },
    // 格式化待办类型
    formatTodoType(val) {
      const map = {
        schedule: '日程', meeting: '会议', class_meeting: '班会',
        leave: '请假审批', leave_approval: '请假审批',
        talk: '谈话', talk_disciplinary: '违纪谈话', talk_daily: '日常谈心',
        classcheck_talk: '查课谈话', classcheck_confirm: '抽查待确认',
        leave_talk: '请假逾期谈话', offcampus_talk: '外宿谈话',
        vehicle_talk: '车辆谈话', warning_talk: '预警谈话'
      }
      return map[val] || '待办'
    },
    // 格式化待办时间
    formatTodoTime(item) {
      const timeStr = item.deadline || item.startTime || item.createTime
      if (!timeStr) return ''
      const date = new Date(timeStr.replace(/ /g, 'T'))
      const now = new Date()
      const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      if (diff === 0) return '今天'
      if (diff === 1) return '昨天'
      if (diff < 7) return diff + '天前'
      return (date.getMonth() + 1) + '/' + date.getDate()
    },
    toggleEditCommon() {
      this.editingCommon = !this.editingCommon
    },
    toggleStudentSection() {
      this.studentCollapsed = !this.studentCollapsed
    },
    toggleTeachingSection() {
      this.teachingCollapsed = !this.teachingCollapsed
    },
    toggleHtSection() {
      this.htCollapsed = !this.htCollapsed
    },
    togglePartySection() {
      this.partyCollapsed = !this.partyCollapsed
    },
    // 党务管理功能点击
    onPartyFuncClick(key) {
      const routes = {
        members: '/pages/sub-work/party/index',
        committee: '/pages/sub-work/party/index',
        thoughtReport: '/pages/sub-work/party/index',
        fee: '/pages/sub-work/party/index',
        training: '/pages/sub-work/party/index'
      }
      const url = routes[key]
      if (url) {
        uni.navigateTo({ url })
      }
    },
    // 加载班主任班级列表
    loadHtClasses() {
      getMyClasses().then(res => {
        this.htClassList = res.data || []
      }).catch(() => {
        this.htClassList = []
      })
    },
    // 获取班主任功能项样式类
    getHtItemClass(key) {
      const hasClass = this.htClassList.length > 0
      // 我的班级和我的申请始终可用
      if (key === 'myClass') return 'func-item'
      // 谈话记录要看已共享给自己的记录，不要求带班
      if (key === 'talk') return 'func-item'
      // 其他功能需要有班级才可用
      return hasClass ? 'func-item' : 'func-item func-item-disabled'
    },
    // 班主任功能区点击
    onHtFuncClick(key) {
      const hasClass = this.htClassList.length > 0
      if (key === 'myClass') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/index' })
      } else if (key === 'talk') {
        uni.navigateTo({ url: '/pages/sub-work/talk/index' })
      } else if (!hasClass) {
        uni.showToast({ title: '暂未分配班级，操作不可用', icon: 'none' })
      } else if (key === 'worklog') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/worklog-list' })
      } else if (key === 'addWorklog') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/worklog-add' })
      } else if (key === 'certificate') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/certificate' })
      }
    },
    onFuncClick(item) {
      if (this.editingCommon) return
      uni.navigateTo({ url: item.url })
    },
    goTodo() {
      uni.navigateTo({ url: '/pages/sub-work/todo/index' })
    },
    removeCommon(idx) {
      this.commonKeys.splice(idx, 1)
      this.saveCommonKeys()
    },
    addCommon(item) {
      if (!this.commonKeys.includes(item.key)) {
        this.commonKeys.push(item.key)
        this.saveCommonKeys()
      }
    },
    showAddPopup() {
      this.$refs.addPopup.open()
    },
    closeAddPopup() {
      this.$refs.addPopup.close()
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background-color: #f5f6f7;
}

.work-container {
  min-height: 100vh;
  background-color: #f5f6f7;
}

/* 顶部金句区 */
.offline-banner {
  margin: 16rpx 24rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background: #fff7e6;
  border: 1rpx solid #ffd591;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.offline-copy {
  display: flex;
  flex-direction: column;
}
.offline-title {
  font-size: 26rpx;
  color: #ad6800;
  font-weight: 600;
}
.offline-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #ad6800;
}
.offline-action {
  font-size: 24rpx;
  color: #ffffff;
  background: #d46b08;
  padding: 10rpx 20rpx;
  border-radius: 8rpx;
}

.greeting-section {
  background: linear-gradient(135deg, #2979ff 0%, #1a5cd8 50%, #0d47a1 100%);
  padding: 96rpx 40rpx 60rpx;
  position: relative;
  overflow: hidden;
  
  /* 添加背景装饰 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 400rpx;
    height: 400rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    border-radius: 50%;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -10%;
    width: 300rpx;
    height: 300rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
}

.quote-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  position: relative;
  z-index: 1;
  padding: 0 20rpx;
}

.quote-main {
  position: relative;
  width: 100%;
}

/* 使用浮动元素实现第一行75%宽度 */
.quote-first-line-float {
  float: right;
  width: 25%;
  height: 65rpx; /* 36rpx * 1.8 line-height */
}

.quote-text {
  font-size: 36rpx;
  color: #fff;
  line-height: 1.8;
  font-weight: 500;
  letter-spacing: 1rpx;
  text-align: left;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  word-break: break-all;
  display: block;
  /* 限制最多显示3行 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.quote-author {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  text-align: right;
  font-style: italic;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.15);
  align-self: flex-end;
  margin-top: 8rpx;
}

/* 汇总卡片网格 */
.summary-cards-grid {
  display: flex;
  gap: 16rpx;
  margin: -40rpx 24rpx 24rpx;
  padding: 0;
  position: relative;
  z-index: 10;
}

.teacher-week-section {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.teacher-tabs {
  display: flex;
  gap: 24rpx;
  padding: 16rpx 24rpx 0;
}

.teacher-tab {
  position: relative;
  padding: 10rpx 0 14rpx;
  color: #64748b;
  font-size: 26rpx;

  &.active {
    color: #1f2937;
    font-weight: 600;

    &::after {
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 36rpx;
      height: 4rpx;
      border-radius: 2rpx;
      background: #2979ff;
      content: '';
      transform: translateX(-50%);
    }
  }
}

.tw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 24rpx 16rpx;
}

.tw-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.tw-head-copy {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.tw-note {
  color: #f59e0b;
  font-size: 20rpx;
}

.tw-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.tw-sub {
  font-size: 22rpx;
  color: #94a3b8;
}

.tw-link {
  font-size: 24rpx;
  color: #2979ff;
}

.today-course-list {
  padding: 0 24rpx;
}

.today-course-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-top: 1rpx solid #f1f5f9;
}

.tc-time {
  flex: 0 0 110rpx;
  width: 110rpx;
  display: flex;
  flex-direction: column;
}

.tc-section {
  font-size: 24rpx;
  font-weight: 600;
  color: #2979ff;
}

.tc-clock {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #94a3b8;
}

.tc-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tc-name {
  overflow: hidden;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tc-meta {
  margin-top: 4rpx;
  overflow: hidden;
  color: #64748b;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tc-action {
  flex: 0 0 auto;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: #2979ff;
  color: #fff;
  font-size: 22rpx;

  &.is-done {
    background: #e8f5e9;
    color: #2e7d32;
  }
}

.tw-empty {
  padding: 20rpx 24rpx 8rpx;
  color: #94a3b8;
  font-size: 24rpx;
}

.calendar-panel {
  padding: 6rpx 16rpx 16rpx;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 8rpx 12rpx;
}

.cal-arrow {
  width: 56rpx;
  color: #2979ff;
  font-size: 40rpx;
  line-height: 1;
  text-align: center;
}

.cal-month {
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 600;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 2rpx;

  text {
    padding: 6rpx 0;
    color: #94a3b8;
    font-size: 20rpx;
    text-align: center;
  }
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4rpx;
}

.cal-cell {
  position: relative;
  min-height: 78rpx;
  padding: 6rpx;
  border-radius: 8rpx;
  background: #f8fafc;

  &.is-empty {
    background: transparent;
  }

  &.is-today {
    border: 1rpx solid #2979ff;
    background: #eff6ff;
  }

  &.is-holiday {
    background: #fff7ed;
  }
}

.cal-day {
  display: block;
  color: #334155;
  font-size: 22rpx;
  font-weight: 600;
}

.cal-cell.is-today .cal-day {
  color: #2563eb;
}

.cal-flag {
  position: absolute;
  top: 4rpx;
  right: 6rpx;
  color: #f59e0b;
  font-size: 16rpx;

  &.makeup {
    color: #2563eb;
  }
}

.cal-week-no {
  display: block;
  margin-top: 2rpx;
  color: #94a3b8;
  font-size: 15rpx;
}

.cal-holiday-name {
  display: block;
  margin-top: 2rpx;
  overflow: hidden;
  color: #d97706;
  font-size: 15rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 12rpx 4rpx 0;
  color: #94a3b8;
  font-size: 18rpx;
}

.cal-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.cal-dot {
  display: inline-block;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;

  &.today {
    background: #2979ff;
  }

  &.holiday {
    background: #f59e0b;
  }
}

.week-attendance {
  margin-top: 8rpx;
  padding: 18rpx 24rpx 24rpx;
  background: #f8fafc;
}

.wa-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wa-title {
  color: #334155;
  font-size: 26rpx;
  font-weight: 600;
}

.wa-link {
  color: #64748b;
  font-size: 22rpx;
}

.wa-stats {
  display: flex;
  margin-top: 16rpx;
}

.wa-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wa-num {
  color: #1f2937;
  font-size: 32rpx;
  font-weight: 700;

  &.green {
    color: #16a34a;
  }

  &.orange {
    color: #f59e0b;
  }

  &.red {
    color: #ef4444;
  }
}

.wa-label {
  margin-top: 4rpx;
  color: #94a3b8;
  font-size: 20rpx;
}

.summary-card-item {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  /* 添加顶部装饰线 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6rpx;
    background: linear-gradient(90deg, #2979ff, #5ba3ff);
  }
  
  &:active {
    transform: translateY(-4rpx);
    box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.15);
  }
}

.stats-num {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
  margin-bottom: 8rpx;
  min-width: 80rpx;
  text-align: center;
  
  &.orange { 
    color: #ff9800;
    background: linear-gradient(135deg, #ff9800, #ffb74d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  &.red { 
    color: #f44336;
    background: linear-gradient(135deg, #f44336, #ef5350);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  &.blue { 
    color: #2979ff;
    background: linear-gradient(135deg, #2979ff, #5ba3ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.stats-label {
  font-size: 24rpx;
  color: #666;
  margin-top: 4rpx;
  font-weight: 500;
  text-align: center;
}

.greeting-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
}

.greeting-sub {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}

.greeting-right {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  font-size: 20rpx;
  color: #fff;
  background: #e43d33;
  border-radius: 16rpx;
  padding: 0 8rpx;
}

/* 通用卡片区 */
.func-section {
  background: #fff;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  
  /* 添加微妙背景 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 200rpx;
    height: 200rpx;
    background: radial-gradient(circle, rgba(41, 121, 255, 0.03) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none; /* 确保伪元素不阻止点击 */
  }
}

.func-section:first-of-type {
  margin-top: 24rpx;
}

.func-section + .func-section {
  margin-top: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1; /* 确保在伪元素之上 */
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  position: relative;
  padding-left: 20rpx;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8rpx;
    height: 28rpx;
    background: linear-gradient(180deg, #2979ff, #1a5cd8);
    border-radius: 4rpx;
  }
}

.section-manage {
  font-size: 26rpx;
  color: #2979ff;
  padding: 8rpx 16rpx;
  cursor: pointer;
  user-select: none;
}

.section-manage:active {
  opacity: 0.6;
}

.collapse-arrow {
  padding: 8rpx;
  cursor: pointer;
  user-select: none;
}

.collapse-arrow:active {
  opacity: 0.6;
}

/* 九宫格 */
.func-grid {
  display: flex;
  flex-wrap: wrap;
}

.func-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
  position: relative;
}

.func-icon {
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

.func-item:active .func-icon {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.icon-blue { background: linear-gradient(135deg, #2979ff 0%, #5ba3ff 100%); }
.icon-green { background: linear-gradient(135deg, #18bc37 0%, #4cd964 100%); }
.icon-orange { background: linear-gradient(135deg, #f3a044 0%, #ffc870 100%); }
.icon-red { background: linear-gradient(135deg, #e43d33 0%, #ff6b6b 100%); }
.icon-purple { background: linear-gradient(135deg, #9c27b0 0%, #c77dff 100%); }
.icon-cyan { background: linear-gradient(135deg, #00bcd4 0%, #4dd0e1 100%); }
.icon-add { 
  background: #f5f5f5;
  border: 2rpx dashed #ccc;
}

.add-icon-text {
  font-size: 44rpx;
  color: #999;
  font-weight: 300;
  line-height: 88rpx;
}

.func-name {
  font-size: 24rpx;
  color: #333;
}

.func-badge {
  position: absolute;
  top: -4rpx;
  right: 10rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  font-size: 20rpx;
  color: #fff;
  background: #e43d33;
  border-radius: 16rpx;
  padding: 0 8rpx;
}

.func-del {
  position: absolute;
  top: -8rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  background: #e43d33;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.func-del-x {
  font-size: 28rpx;
  color: #fff;
  line-height: 36rpx;
}

.empty-tip {
  text-align: center;
  padding: 30rpx 0;
  font-size: 26rpx;
  color: #999;
}

/* 添加弹窗 */
.add-popup {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx;
  max-height: 70vh;
}

.add-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.add-popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.add-popup-grid {
  display: flex;
  flex-wrap: wrap;
}

.add-popup-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
}

.add-popup-empty {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: #999;
}

/* 我的待办区域 */
.section-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.section-more-text {
  font-size: 24rpx;
  color: #999;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 16rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  transition: background 0.2s;
}

.todo-item:active {
  background: #f0f2f5;
}

.todo-item-left {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.todo-type-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.todo-item-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.todo-item-title {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-item-time {
  font-size: 22rpx;
  color: #999;
}

.todo-type-label {
  font-size: 22rpx;
  color: #fff;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  background: #909399;
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* 班主任管理区域 */
.ht-section {
  border-left: 6rpx solid #18bc37;
}

.ht-no-class {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: #fef8ec;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.ht-no-class-text {
  font-size: 24rpx;
  color: #f3a044;
}

.func-item-disabled {
  opacity: 0.4;
}

.func-item-disabled .func-icon {
  filter: grayscale(0.6);
}

.ht-count {
  font-size: 20rpx;
  color: #999;
  margin-left: 4rpx;
}
</style>
