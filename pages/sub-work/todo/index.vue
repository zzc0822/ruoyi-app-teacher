<template>
  <view class="page-container">
    <!-- 未读待办提示 -->
    <view class="unread-bar" v-if="unreadCount > 0">
      <text class="unread-text">您有 {{ unreadCount }} 条未读待办</text>
    </view>

    <!-- 视图切换和月份选择 -->
    <view class="header-bar">
      <view class="view-switch">
        <view :class="['switch-btn', viewMode === 'calendar' ? 'switch-active' : '']" @click="viewMode = 'calendar'">
          <text>📅</text>
          <text>日历</text>
        </view>
        <view :class="['switch-btn', viewMode === 'list' ? 'switch-active' : '']" @click="viewMode = 'list'">
          <text>📋</text>
          <text>清单</text>
        </view>
      </view>
      <view class="month-picker" v-if="viewMode === 'calendar'">
        <text class="arrow" @click="prevMonth">‹</text>
        <text class="month-text">{{ currentYearMonth }}</text>
        <text class="arrow" @click="nextMonth">›</text>
      </view>
    </view>

    <!-- ===== 日历视图 ===== -->
    <view v-show="viewMode === 'calendar'" class="calendar-section">
      <view class="week-header">
        <text v-for="day in weekLabels" :key="day" class="week-day">{{ day }}</text>
      </view>
      <view class="days-grid">
        <view
          v-for="date in calendarDays"
          :key="date.fullDate"
          class="day-cell"
          :class="{ 'other-month': !date.isCurrentMonth, 'today': date.isToday, 'selected': date.fullDate === selectedDate }"
          @click="selectDate(date.fullDate)"
        >
          <text class="day-number">{{ date.day }}</text>
          <view class="day-dots">
            <view
              v-for="(todo, idx) in date.todos.slice(0, 2)"
              :key="'t'+idx"
              class="day-dot"
              :style="{ backgroundColor: getTodoDotColor(todo) }"
            ></view>
            <view
              v-for="(course, idx) in date.courses.slice(0, 1)"
              :key="'c'+idx"
              class="day-dot"
              :style="{ backgroundColor: getCourseDotColor() }"
            ></view>
          </view>
        </view>
      </view>

      <!-- 选中日期的待办列表 -->
      <view class="selected-date-todos">
        <view class="selected-date-header">
          <text class="selected-date-title">{{ formatSelectedDate }}</text>
          <text class="selected-date-count">{{ selectedDateTodos.length }} 条</text>
        </view>
        <scroll-view scroll-y class="date-todo-scroll">
          <view
            v-for="todo in selectedDateTodos"
            :key="todo.id"
            class="date-todo-item"
            :class="{ completed: todo.status === '1' }"
            @click="handleTodo(todo)"
          >
            <view class="todo-dot" :style="{ backgroundColor: getTodoDotColor(todo) }"></view>
            <view class="todo-info">
              <text class="todo-title">{{ todo.title }}</text>
              <text class="todo-time">{{ formatEventTime(todo) }}</text>
            </view>
            <text class="todo-type-tag" :class="'tag-' + (todo.todoType || 'default')">{{ formatTodoType(todo.todoType) }}</text>
          </view>
          <view v-if="selectedDateTodos.length === 0" class="empty-date">
            <text>当天暂无待办和课程</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ===== 列表视图 ===== -->
    <view v-show="viewMode === 'list'" class="list-section">
      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-input-wrap">
          <text class="search-icon">🔍</text>
          <input class="search-input" v-model="searchKeyword" placeholder="搜索标题或描述" @input="onSearchInput" @confirm="handleSearch" />
          <text v-if="searchKeyword" class="search-clear" @click="clearSearch">×</text>
        </view>
        <view class="filter-btn" @click="showFilterPopup">
          <text>🔽</text>
          <text>筛选</text>
        </view>
      </view>

      <!-- 筛选条件显示 -->
      <view class="filter-tags" v-if="hasFilter">
        <view class="filter-tag" v-if="filterForm.status" @click="showFilterPopup">
          <text>状态：{{ formatStatus(filterForm.status) }}</text>
          <text class="tag-close" @click.stop="clearFilter('status')">×</text>
        </view>
        <view class="filter-tag" v-if="filterForm.type" @click="showFilterPopup">
          <text>类型：{{ formatTodoType(filterForm.type) }}</text>
          <text class="tag-close" @click.stop="clearFilter('type')">×</text>
        </view>
        <view class="filter-tag" v-if="filterForm.dateRange" @click="showFilterPopup">
          <text>时间：{{ filterForm.dateRange === 'custom' ? filterForm.startDate + '~' + filterForm.endDate : getDateRangeLabel(filterForm.dateRange) }}</text>
          <text class="tag-close" @click.stop="clearFilter('dateRange')">×</text>
        </view>
        <view class="filter-tag filter-clear-all" @click="clearAllFilters">
          <text>清空筛选</text>
        </view>
      </view>

      <!-- 排序切换 -->
      <view class="sort-bar">
        <view :class="['sort-btn', sortBy === 'time' ? 'sort-active' : '']" @click="sortBy = 'time'">
          <text>按时间</text>
        </view>
        <view :class="['sort-btn', sortBy === 'urgency' ? 'sort-active' : '']" @click="sortBy = 'urgency'">
          <text>按紧急程度</text>
        </view>
      </view>

      <!-- 待办列表 -->
      <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
        <view class="list-item" v-for="(item, index) in filteredList" :key="index" @click="handleTodo(item)">
          <view :class="['item-urgency-bar', 'bar-' + (item.urgency || 'normal')]"></view>
          <view class="item-content">
            <view class="item-header">
              <view class="item-title-row">
                <view class="urgency-dot" :class="'urgency-' + (item.urgency || 'normal')" v-if="item.urgency"></view>
                <text :class="['item-title', item.status === '1' ? 'completed' : '']">{{ item.title }}</text>
              </view>
              <view class="item-unread" v-if="item.isRead !== '1'"></view>
            </view>
            <view class="item-body" v-if="item.description">
              <text class="item-desc">{{ item.description }}</text>
            </view>
            <view class="item-footer">
              <view class="item-type-wrap">
                <text :class="['item-type', 'type-' + (item.todoType || 'default')]">{{ formatTodoType(item.todoType) }}</text>
                <text :class="['item-urgency-label', 'label-' + (item.urgency || 'normal')]" v-if="item.urgency">{{ formatUrgency(item.urgency) }}</text>
              </view>
              <text class="item-deadline" v-if="item.deadline">截止：{{ formatDeadline(item.deadline) }}</text>
            </view>
          </view>
        </view>
        <view class="empty-tip" v-if="!loading && filteredList.length === 0">
          <text>暂无待办事项</text>
        </view>
        <uni-load-more :status="loadStatus" v-else></uni-load-more>
      </scroll-view>
    </view>

    <!-- 筛选弹窗 -->
    <view class="filter-popup" v-if="showFilter" @click="hideFilterPopup">
      <view class="filter-content" @click.stop>
        <view class="filter-header">
          <text class="filter-title">筛选条件</text>
          <text class="filter-close" @click="hideFilterPopup">×</text>
        </view>
        <scroll-view scroll-y class="filter-body">
          <view class="filter-section">
            <text class="filter-label">时间段</text>
            <view class="filter-options">
              <view 
                :class="['filter-option', filterForm.dateRange === option.value ? 'option-active' : '']" 
                v-for="option in dateRangeOptions" :key="option.value"
                @click="selectDateRange(option.value)"
              ><text>{{ option.label }}</text></view>
            </view>
            <view class="custom-date-wrap" v-if="filterForm.dateRange === 'custom'">
              <view class="date-picker-row">
                <view class="date-picker-item">
                  <text class="date-label">开始日期</text>
                  <picker mode="date" :value="filterForm.startDate" @change="onStartDateChange">
                    <view class="picker-display">
                      <text v-if="filterForm.startDate">{{ filterForm.startDate }}</text>
                      <text v-else class="placeholder">请选择</text>
                    </view>
                  </picker>
                </view>
                <view class="date-picker-item">
                  <text class="date-label">结束日期</text>
                  <picker mode="date" :value="filterForm.endDate" :start="filterForm.startDate" @change="onEndDateChange">
                    <view class="picker-display">
                      <text v-if="filterForm.endDate">{{ filterForm.endDate }}</text>
                      <text v-else class="placeholder">请选择</text>
                    </view>
                  </picker>
                </view>
              </view>
            </view>
          </view>
          <view class="filter-section">
            <text class="filter-label">状态</text>
            <view class="filter-options">
              <view :class="['filter-option', filterForm.status === option.value ? 'option-active' : '']"
                v-for="option in statusOptions" :key="option.value"
                @click="filterForm.status = option.value"
              ><text>{{ option.label }}</text></view>
            </view>
          </view>
          <view class="filter-section">
            <text class="filter-label">类型</text>
            <view class="filter-options">
              <view :class="['filter-option', filterForm.type === option.value ? 'option-active' : '']"
                v-for="option in typeOptions" :key="option.value"
                @click="filterForm.type = option.value"
              ><text>{{ option.label }}</text></view>
            </view>
          </view>
        </scroll-view>
        <view class="filter-footer">
          <view class="filter-reset-btn" @click="resetFilter"><text>重置</text></view>
          <view class="filter-confirm-btn" @click="applyFilter"><text>确定</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listTodo, getUnreadCount, markRead } from '@/api/work/todo'
import { getMySchedule } from '@/api/work/schedule'

export default {
  data() {
    return {
      list: [],
      loadStatus: 'more',
      unreadCount: 0,
      loading: false,
      sortBy: 'time',
      searchKeyword: '',
      _searchTimer: null,
      showFilter: false,
      filterForm: { dateRange: '', status: '', type: '', startDate: '', endDate: '' },
      viewMode: 'calendar',
      currentDate: new Date(),
      selectedDate: this.formatDateStr(new Date()),
      todayStr: this.formatDateStr(new Date()),
      weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
      dateRangeOptions: [
        { label: '今天', value: 'today' },
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' },
        { label: '自定义', value: 'custom' },
        { label: '全部', value: '' }
      ],
      statusOptions: [
        { label: '全部', value: '' },
        { label: '未完成', value: '0' },
        { label: '已完成', value: '1' }
      ],
      typeOptions: [
        { label: '全部', value: '' },
        { label: '日程', value: 'schedule' },
        { label: '会议议程', value: 'meeting' },
        { label: '班会议程', value: 'class_meeting' },
        { label: '请假审批', value: 'leave' },
        { label: '违纪谈话', value: 'talk_disciplinary' },
        { label: '日常谈心', value: 'talk_daily' },
        { label: '查课谈话', value: 'classcheck_talk' },
        { label: '抽查待确认', value: 'classcheck_confirm' },
        { label: '请假逾期谈话', value: 'leave_talk' },
        { label: '外宿谈话', value: 'offcampus_talk' },
        { label: '车辆谈话', value: 'vehicle_talk' },
        { label: '预警谈话', value: 'warning_talk' }
      ],
      // 课表相关
      myScheduleList: [],
      isTeacher: false,
      displayList: []
    }
  },
  computed: {
    hasFilter() {
      return this.filterForm.dateRange || this.filterForm.status || this.filterForm.type
    },
    currentYearMonth() {
      const y = this.currentDate.getFullYear()
      const m = this.currentDate.getMonth() + 1
      return `${y}年${m}月`
    },
    formatSelectedDate() {
      const date = new Date(this.selectedDate.replace(/-/g, '/'))
      return `${date.getMonth() + 1}月${date.getDate()}日 周${this.weekLabels[date.getDay()]}`
    },
    calendarDays() {
      return this.buildMonthDays()
    },
    selectedDateTodos() {
      return this.list.filter(item => {
        return this.getTodoDate(item) === this.selectedDate
      }).sort((a, b) => {
        const t1 = a.startTime || a.deadline || ''
        const t2 = b.startTime || b.deadline || ''
        return t1.localeCompare(t2)
      })
    },
    filteredList() {
      let arr = [...this.list]
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase()
        arr = arr.filter(item => {
          const title = (item.title || '').toLowerCase()
          const desc = (item.description || '').toLowerCase()
          return title.includes(keyword) || desc.includes(keyword)
        })
      }
      if (this.filterForm.status) {
        arr = arr.filter(item => item.status === this.filterForm.status)
      }
      if (this.filterForm.type) {
        arr = arr.filter(item => item.todoType === this.filterForm.type)
      }
      if (this.filterForm.dateRange) {
        const now = new Date()
        arr = arr.filter(item => {
          const dateStr = item.deadline || item.startTime || item.createTime
          if (!dateStr) return false
          const itemDate = new Date(dateStr.replace(/-/g, '/'))
          if (this.filterForm.dateRange === 'today') {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            return itemDate >= todayStart && itemDate < new Date(todayStart.getTime() + 86400000)
          } else if (this.filterForm.dateRange === 'week') {
            const dayOfWeek = now.getDay() || 7
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1)
            return itemDate >= weekStart && itemDate < new Date(weekStart.getTime() + 7 * 86400000)
          } else if (this.filterForm.dateRange === 'month') {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            return itemDate >= monthStart && itemDate < new Date(now.getFullYear(), now.getMonth() + 1, 1)
          } else if (this.filterForm.dateRange === 'custom') {
            if (!this.filterForm.startDate || !this.filterForm.endDate) return false
            const start = new Date(this.filterForm.startDate.replace(/-/g, '/'))
            const end = new Date(this.filterForm.endDate.replace(/-/g, '/'))
            end.setHours(23, 59, 59, 999)
            return itemDate >= start && itemDate <= end
          }
          return true
        })
      }
      if (this.sortBy === 'urgency') {
        const urgencyOrder = { overdue: 0, today: 1, tomorrow: 2, normal: 3 }
        arr.sort((a, b) => {
          const ua = urgencyOrder[a.urgency] != null ? urgencyOrder[a.urgency] : 9
          const ub = urgencyOrder[b.urgency] != null ? urgencyOrder[b.urgency] : 9
          if (ua !== ub) return ua - ub
          return new Date(b.createTime) - new Date(a.createTime)
        })
      } else {
        arr.sort((a, b) => {
          const t1 = new Date(a.deadline || a.startTime || a.createTime)
          const t2 = new Date(b.deadline || b.startTime || b.createTime)
          return t1 - t2
        })
      }
      return arr
    }
  },
  onShow() {
    this.getList()
    this.getUnread()
    this.loadMySchedule()
  },
  methods: {
    getList() {
      this.loading = true
      this.loadStatus = 'loading'
      listTodo().then(res => {
        this.list = res.data || []
        this.syncCoursesToList()
        this.loadStatus = 'noMore'
        this.loading = false
      }).catch(() => {
        this.loadStatus = 'more'
        this.loading = false
      })
    },
    getUnread() {
      getUnreadCount().then(res => {
        this.unreadCount = res.data || 0
      }).catch(() => {})
    },
    formatDateStr(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    buildMonthDays() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const start = new Date(firstDay.getTime() - firstDay.getDay() * 86400000)
      const days = []
      for (let i = 0; i < 42; i++) {
        const date = new Date(start.getTime() + i * 86400000)
        const fullDate = this.formatDateStr(date)
        days.push({
          fullDate,
          day: date.getDate(),
          isCurrentMonth: date.getMonth() === month,
          isToday: fullDate === this.todayStr,
          todos: this.getTodosByDate(fullDate),
          courses: this.getCoursesByDate(fullDate)
        })
      }
      return days
    },
    getTodosByDate(dateStr) {
      const todos = this.list.filter(item => this.getTodoDate(item) === dateStr)
      return todos
    },
    // 获取某天的课程
    getCoursesByDate(dateStr) {
      if (!this.isTeacher || !this.myScheduleList.length) return []
      const d = new Date(dateStr.replace(/-/g, '/'))
      const jsDay = d.getDay()
      const weekday = jsDay === 0 ? 7 : jsDay
      return this.myScheduleList.filter(c => Number(c.weekday) === weekday)
    },
    getTodoDate(todo) {
      const timeStr = todo.deadline || todo.startTime || todo.createTime
      if (!timeStr) return ''
      return timeStr.substring(0, 10)
    },
    getTodoDotColor(todo) {
      const colorMap = {
        'talk_disciplinary': '#e43d33', 'talk_daily': '#00bcd4',
        'classcheck_talk': '#ff9800', 'classcheck_confirm': '#2979ff',
        'leave_talk': '#ff9800', 'offcampus_talk': '#ff9800',
        'vehicle_talk': '#ff9800', 'warning_talk': '#ff9800',
        'leave': '#9c27b0', 'leave_approval': '#9c27b0',
        'schedule': '#18bc37', 'meeting': '#2979ff'
      }
      return colorMap[todo.todoType] || '#909399'
    },
    prevMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1)
    },
    nextMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1)
    },
    selectDate(date) {
      this.selectedDate = date
      this.syncCoursesToList()
    },
    syncCoursesToList() {
      // 移除旧的课程项
      this.list = this.list.filter(item => !item._isCourse)
      // 添加当前选中日期对应的课程项
      if (this.isTeacher && this.myScheduleList.length) {
        const d = new Date(this.selectedDate.replace(/-/g, '/'))
        const jsDay = d.getDay()
        const weekday = jsDay === 0 ? 7 : jsDay
        const courses = this.myScheduleList.filter(c => Number(c.weekday) === weekday)
        courses.forEach(c => {
          this.list.unshift({
            id: 'course_' + c.scheduleId,
            title: '📚 ' + c.courseName,
            todoType: 'schedule',
            status: '0',
            allDay: '1',
            startTime: this.selectedDate + ' 08:00:00',
            _courseInfo: c.startSection + '-' + c.endSection + '节 · ' + c.className + ' · ' + (c.classroom || '待定'),
            scheduleId: c.scheduleId,
            _isCourse: true
          })
        })
      }
    },
    // 加载课表
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
        this.syncCoursesToList()
      }).catch(() => {
        this.myScheduleList = []
        this.isTeacher = false
      })
    },
    // 获取课程圆点颜色
    getCourseDotColor() {
      return '#667eea'
    },
    formatEventTime(todo) {
      if (todo.allDay === '1') return todo._courseInfo || '全天'
      const start = todo.startTime ? todo.startTime.substring(11, 16) : ''
      if (start) return start
      if (todo.deadline) return '截止 ' + todo.deadline.substring(11, 16)
      return ''
    },
    handleTodo(item) {
      // 课程项不处理待办操作
      if (item._isCourse || item.todoType === 'schedule') {
        uni.showToast({ title: '点击查看课表详情', icon: 'none' })
        return
      }
      if (item.isRead !== '1') {
        markRead(item.id).then(() => {
          item.isRead = '1'
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }).catch(() => {})
      }
      if (item.todoType === 'classcheck_confirm') {
        uni.navigateTo({ url: '/pages/sub-work/classcheck/confirm?id=' + item.businessId })
      } else if (item.todoType === 'leave' || item.todoType === 'leave_approval') {
        uni.navigateTo({ url: '/pages/sub-work/leave/detail?id=' + item.businessId })
      } else if (item.todoType === 'talk_disciplinary') {
        uni.navigateTo({ url: '/pages/sub-work/talk/add?id=' + item.businessId })
      } else if (item.todoType === 'talk' || item.todoType === 'talk_daily') {
        uni.navigateTo({ url: '/pages/sub-work/talk/index' })
      } else if (['classcheck_talk', 'leave_talk', 'offcampus_talk', 'vehicle_talk', 'warning_talk'].includes(item.todoType)) {
        uni.navigateTo({ url: '/pages/sub-work/talk/add?todoId=' + item.id + '&businessId=' + item.businessId })
      }
    },
    formatTodoType(val) {
      const map = {
        schedule: '日程', meeting: '会议议程', class_meeting: '班会议程',
        leave: '请假审批', leave_approval: '请假审批',
        talk: '谈话提醒', talk_disciplinary: '违纪谈话', talk_daily: '日常谈心',
        classcheck_talk: '查课谈话', classcheck_confirm: '抽查待确认',
        leave_talk: '请假逾期谈话', offcampus_talk: '外宿谈话',
        vehicle_talk: '车辆谈话', warning_talk: '预警谈话',
        check: '查课提醒', overdue: '逾期提醒'
      }
      return map[val] || val || '待办'
    },
    formatUrgency(val) {
      const map = { overdue: '已逾期', today: '今日截止', tomorrow: '明日截止', normal: '常规' }
      return map[val] || '常规'
    },
    formatStatus(val) {
      const map = { '0': '未完成', '1': '已完成' }
      return map[val] || val
    },
    formatDeadline(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    },
    getDateRangeLabel(val) {
      const map = { today: '今天', week: '本周', month: '本月' }
      return map[val] || val
    },
    onSearchInput() {
      clearTimeout(this._searchTimer)
      this._searchTimer = setTimeout(() => { this.handleSearch() }, 300)
    },
    handleSearch() {},
    clearSearch() { this.searchKeyword = '' },
    showFilterPopup() { this.showFilter = true },
    hideFilterPopup() { this.showFilter = false },
    applyFilter() { this.hideFilterPopup() },
    resetFilter() {
      this.filterForm = { dateRange: '', status: '', type: '', startDate: '', endDate: '' }
    },
    clearFilter(field) {
      this.filterForm[field] = ''
      if (field === 'dateRange') {
        this.filterForm.startDate = ''
        this.filterForm.endDate = ''
      }
    },
    clearAllFilters() { this.resetFilter() },
    selectDateRange(value) {
      this.filterForm.dateRange = value
      if (value !== 'custom') {
        this.filterForm.startDate = ''
        this.filterForm.endDate = ''
      }
    },
    onStartDateChange(e) { this.filterForm.startDate = e.detail.value },
    onEndDateChange(e) { this.filterForm.endDate = e.detail.value },
    loadMore() {}
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6f7;
}
.unread-bar { background: #fef3e2; padding: 16rpx 30rpx; }
.unread-text { font-size: 26rpx; color: #f3a044; font-weight: bold; }

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
}
.view-switch { display: flex; background: #f0f2f5; border-radius: 32rpx; padding: 4rpx; }
.switch-btn { display: flex; align-items: center; gap: 6rpx; padding: 12rpx 28rpx; border-radius: 28rpx; font-size: 26rpx; color: #666; }
.switch-active { background: #2979ff; color: #fff; }
.month-picker { display: flex; align-items: center; gap: 20rpx; font-size: 30rpx; font-weight: bold; color: #333; }
.arrow { font-size: 40rpx; color: #666; padding: 0 10rpx; }

.calendar-section { flex: 1; display: flex; flex-direction: column; background: #fff; margin: 0 20rpx 20rpx; border-radius: 16rpx; overflow: hidden; }
.week-header { display: grid; grid-template-columns: repeat(7, 1fr); padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.week-day { text-align: center; font-size: 26rpx; color: #999; }
.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4rpx; padding: 10rpx; }
.day-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12rpx; position: relative; }
.day-cell.other-month { color: #ccc; }
.day-cell.today { background: #e3f2fd; }
.day-cell.selected { background: #2979ff; color: #fff; }
.day-number { font-size: 28rpx; font-weight: bold; }
.day-dots { display: flex; gap: 6rpx; margin-top: 8rpx; min-height: 12rpx; }
.day-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }

.selected-date-todos { flex: 1; border-top: 1rpx solid #f0f0f0; padding: 20rpx; display: flex; flex-direction: column; }
.selected-date-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.selected-date-title { font-size: 30rpx; font-weight: bold; color: #333; }
.selected-date-count { font-size: 24rpx; color: #999; }
.date-todo-scroll { flex: 1; height: 300rpx; }
.date-todo-item { display: flex; align-items: center; padding: 20rpx; background: #f9f9f9; border-radius: 12rpx; margin-bottom: 12rpx; }
.date-todo-item.completed .todo-title { text-decoration: line-through; color: #999; }
.todo-dot { width: 12rpx; height: 12rpx; border-radius: 50%; margin-right: 16rpx; flex-shrink: 0; }
.todo-info { flex: 1; }
.todo-title { font-size: 28rpx; color: #333; margin-bottom: 6rpx; }
.todo-time { font-size: 22rpx; color: #999; }
.todo-type-tag {
  font-size: 20rpx; color: #fff; padding: 4rpx 12rpx; border-radius: 8rpx; flex-shrink: 0;
  &.tag-talk_disciplinary { background: #e43d33; }
  &.tag-talk_daily { background: #00bcd4; }
  &.tag-classcheck_talk, &.tag-leave_talk, &.tag-offcampus_talk, &.tag-vehicle_talk, &.tag-warning_talk { background: #ff9800; }
  &.tag-classcheck_confirm { background: #2979ff; }
  &.tag-leave, &.tag-leave_approval { background: #9c27b0; }
  &.tag-schedule { background: #18bc37; }
  &.tag-meeting { background: #2979ff; }
  &.tag-default { background: #909399; }
}
.empty-date { text-align: center; padding: 60rpx 0; color: #999; font-size: 26rpx; }

.list-section { flex: 1; display: flex; flex-direction: column; }
.search-bar { display: flex; padding: 16rpx 30rpx; gap: 16rpx; background: #fff; }
.search-input-wrap { flex: 1; display: flex; align-items: center; background: #f5f5f5; border-radius: 30rpx; padding: 0 24rpx; }
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 26rpx; height: 60rpx; }
.search-clear { font-size: 36rpx; color: #999; padding: 0 8rpx; }
.filter-btn { display: flex; align-items: center; gap: 8rpx; padding: 0 24rpx; background: #2979ff; color: #fff; border-radius: 30rpx; font-size: 26rpx; }

.filter-tags { display: flex; flex-wrap: wrap; padding: 12rpx 30rpx; gap: 12rpx; background: #fff; }
.filter-tag { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 16rpx; background: #e3f2fd; color: #2979ff; border-radius: 20rpx; font-size: 22rpx; }
.tag-close { font-size: 28rpx; font-weight: bold; margin-left: 4rpx; }
.filter-clear-all { background: #ffebee; color: #e43d33; }

.sort-bar { display: flex; padding: 16rpx 30rpx; gap: 16rpx; }
.sort-btn { padding: 10rpx 28rpx; border-radius: 30rpx; font-size: 24rpx; color: #666; background: #fff; }
.sort-active { background: #2979ff; color: #fff; }

.list-scroll { flex: 1; padding: 0 30rpx 20rpx; }
.list-item { display: flex; background: #fff; border-radius: 16rpx; margin-bottom: 20rpx; overflow: hidden; }
.item-urgency-bar { width: 8rpx; flex-shrink: 0; &.bar-overdue { background: #e43d33; } &.bar-today { background: #f3a044; } &.bar-tomorrow { background: #2979ff; } &.bar-normal { background: #18bc37; } }
.item-content { flex: 1; padding: 24rpx 24rpx 20rpx; }
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.item-title-row { display: flex; align-items: center; flex: 1; overflow: hidden; }
.urgency-dot { width: 14rpx; height: 14rpx; border-radius: 50%; margin-right: 10rpx; flex-shrink: 0; &.urgency-overdue { background: #e43d33; } &.urgency-today { background: #f3a044; } &.urgency-tomorrow { background: #2979ff; } &.urgency-normal { background: #18bc37; } }
.item-title { font-size: 28rpx; font-weight: bold; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-title.completed { text-decoration: line-through; color: #999; }
.item-unread { width: 14rpx; height: 14rpx; border-radius: 50%; background: #e43d33; flex-shrink: 0; margin-left: 10rpx; }
.item-body { margin-bottom: 10rpx; }
.item-desc { font-size: 24rpx; color: #666; line-height: 1.5; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.item-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 10rpx; border-top: 1rpx solid #f5f5f5; }
.item-type-wrap { display: flex; align-items: center; gap: 8rpx; }
.item-type { font-size: 20rpx; color: #fff; padding: 2rpx 14rpx; border-radius: 6rpx; &.type-schedule { background: #2979ff; } &.type-leave, &.type-leave_approval { background: #9c27b0; } &.type-talk { background: #18bc37; } &.type-talk_disciplinary { background: #e43d33; } &.type-talk_daily { background: #00bcd4; } &.type-classcheck_talk, &.type-leave_talk, &.type-offcampus_talk, &.type-vehicle_talk, &.type-warning_talk { background: #ff9800; } &.type-classcheck_confirm { background: #2979ff; } &.type-meeting { background: #2979ff; } &.type-default { background: #999; } }
.item-urgency-label { font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 6rpx; &.label-overdue { color: #e43d33; background: #ffebee; } &.label-today { color: #f3a044; background: #fff8e1; } &.label-tomorrow { color: #2979ff; background: #e3f2fd; } &.label-normal { color: #18bc37; background: #e8f8ea; } }
.item-deadline { font-size: 22rpx; color: #999; }
.empty-tip { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }

.filter-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; display: flex; align-items: flex-end; }
.filter-content { width: 100%; max-height: 80vh; background: #fff; border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column; }
.filter-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f5f5f5; }
.filter-title { font-size: 32rpx; font-weight: bold; color: #333; }
.filter-close { font-size: 48rpx; color: #999; line-height: 1; }
.filter-body { flex: 1; padding: 30rpx; max-height: 60vh; }
.filter-section { margin-bottom: 40rpx; }
.filter-label { display: block; font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }
.filter-options { display: flex; flex-wrap: wrap; gap: 16rpx; }
.filter-option { padding: 16rpx 32rpx; background: #f5f5f5; border-radius: 30rpx; font-size: 26rpx; color: #666; }
.option-active { background: #2979ff; color: #fff; }
.custom-date-wrap { margin-top: 20rpx; padding: 20rpx; background: #f9f9f9; border-radius: 12rpx; }
.date-picker-row { display: flex; gap: 20rpx; }
.date-picker-item { flex: 1; }
.date-label { display: block; font-size: 24rpx; color: #666; margin-bottom: 12rpx; }
.picker-display { padding: 16rpx 20rpx; background: #fff; border-radius: 8rpx; font-size: 26rpx; color: #333; border: 1rpx solid #e0e0e0; }
.placeholder { color: #999; }
.filter-footer { display: flex; gap: 20rpx; padding: 30rpx; border-top: 1rpx solid #f5f5f5; }
.filter-reset-btn { flex: 1; padding: 20rpx 0; background: #f5f5f5; border-radius: 30rpx; text-align: center; font-size: 28rpx; color: #666; }
.filter-confirm-btn { flex: 1; padding: 20rpx 0; background: #2979ff; border-radius: 30rpx; text-align: center; font-size: 28rpx; color: #fff; }
</style>
