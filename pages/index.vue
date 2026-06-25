<template>
  <view class="home-container">
    <!-- 顶部区域 -->
    <view class="header-section">
      <view class="header-info">
        <text class="header-title">欢迎回来，{{ nickName }}老师</text>
      </view>
    </view>

    <!-- 统计概览 -->
    <view class="stats-section">
      <view class="stats-card" @click="goWork">
        <text class="stats-num">{{ stuCount }}</text>
        <text class="stats-label">学生总数</text>
      </view>
      <view class="stats-card" @click="goWork">
        <text class="stats-num orange">{{ pendingLeave }}</text>
        <text class="stats-label">待审请假</text>
      </view>
      <view class="stats-card" @click="goWork">
        <text class="stats-num red">{{ unreadTodo }}</text>
        <text class="stats-label">未读待办</text>
      </view>
      <view class="stats-card" @click="goWork">
        <text class="stats-num blue">{{ checkCount }}</text>
        <text class="stats-label">本周查课</text>
      </view>
    </view>

    <!-- 待办提醒 -->
    <view class="section-card" v-if="todoList.length > 0">
      <view class="section-header">
        <text class="section-title">📋 我的待办</text>
        <text class="section-more" @click="goTodoList">更多 ({{ todoTotal }})</text>
      </view>
      <view class="todo-item" v-for="(item, index) in todoList" :key="index" @click="handleTodoClick(item)">
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
          <text class="quick-name">请假登记</text>
        </view>
      </view>
    </view>

    <!-- 当天课表（仅书记角色显示） -->
    <view class="section-card" v-if="false">
      <view class="section-header">
        <text class="section-title">📅 课表</text>
      </view>
      
      <!-- 日期选择器 -->
      <view class="date-selector">
        <view class="date-btn" @click="changeDate(-1)">
          <uni-icons type="left" size="16" color="#2979ff"></uni-icons>
        </view>
        <view class="date-display">
          <text class="date-text">{{ selectedDateText }}</text>
          <text class="weekday-text">{{ scheduleWeekday }}</text>
        </view>
        <view class="date-btn" @click="changeDate(1)">
          <uni-icons type="right" size="16" color="#2979ff"></uni-icons>
        </view>
      </view>

      <!-- 课表列表 -->
      <view v-if="todayScheduleList.length > 0" class="schedule-list">
        <view class="schedule-class" v-for="(classItem, index) in todayScheduleList" :key="index">
          <view class="schedule-class-header" @click="toggleClass(index)">
            <view class="header-left">
              <uni-icons :type="classItem.expanded ? 'down' : 'right'" size="16" color="#2979ff"></uni-icons>
              <text class="schedule-class-name">{{ classItem.className }}</text>
            </view>
            <text class="schedule-class-count">{{ classItem.count }}节</text>
          </view>
          <view class="schedule-items" v-if="classItem.expanded">
            <view class="schedule-item-compact" v-for="(item, idx) in classItem.schedules" :key="idx">
              <view class="item-period">
                <text class="period-text">{{ item.startSection }}-{{ item.endSection }}节</text>
              </view>
              <view class="item-content">
                <text class="item-course">{{ item.courseName }}</text>
                <text class="item-info">{{ item.teacherName }} | {{ item.classroom }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="schedule-empty">
        <text class="empty-text">当天没有课表</text>
      </view>
    </view>
  </view>
</template>

<script>
import { listTodo, getUnreadCount } from '@/api/stumanage/todo'
import { listLeave } from '@/api/stumanage/leave'
import { listStuinfo } from '@/api/stumanage/stuinfo'
import { listClassCheck } from '@/api/stumanage/classcheck'
import { getTeacherinfoByUserId } from '@/api/stumanage/teacherinfo'
import { getTodaySchedules } from '@/api/stumanage/schedule'

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
      // 课表相关
      showSchedule: false,
      todayScheduleList: [],
      scheduleWeekday: '',
      selectedDate: new Date(), // 当前选择的日期
      selectedDateText: '' // 显示的日期文本
    }
  },
  onShow() {
    this.loadTeacherName()
    this.loadStats()
    this.loadTodos()
    // this.loadTodaySchedule()
    
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
      // this.loadTodaySchedule()
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
          this.nickName = this.$store.getters.name || ''
        }
      }).catch(() => {
        this.nickName = this.$store.getters.name || ''
      })
    },
    loadStats() {
      listStuinfo({ pageNum: 1, pageSize: 1 }).then(res => {
        this.stuCount = res.total || 0
      }).catch(() => { this.stuCount = 0 })
      listLeave({ pageNum: 1, pageSize: 1, approvalStatus: 'pending' }).then(res => {
        this.pendingLeave = res.total || 0
      }).catch(() => { this.pendingLeave = 0 })
      getUnreadCount().then(res => {
        this.unreadTodo = res.data || 0
      }).catch(() => { this.unreadTodo = 0 })
      listClassCheck({ pageNum: 1, pageSize: 1 }).then(res => {
        this.checkCount = res.total || 0
      }).catch(() => { this.checkCount = 0 })
    },
    loadTodos() {
      console.log('=== 开始加载待办 ===')
      listTodo().then(res => {
        console.log('待办接口返回:', JSON.stringify(res))
        const list = res.data || []
        console.log('待办原始数据数量:', list.length)

        // 保存待办总数，用于"更多"显示
        this.todoTotal = list.length
        
        // 获取当前用户信息
        const userId = this.$store.state.user?.id || this.$store.state.user?.userId
        
        // status: 0=未完成, 1=已完成
        const filtered = list.filter(t => {
          return t.status !== '1' && t.status !== 1
        })
        
        console.log('过滤后的待办数量:', filtered.length)
        // 显示5个待办（增加到5个）
        this.todoList = filtered.slice(0, 5)
        console.log('最终显示的待办:', this.todoList.length)
      }).catch((err) => {
        console.error('加载待办失败:', err)
        // 静默失败
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
    goAddClassCheck() {
      uni.navigateTo({ url: '/pages/sub-work/classcheck/add' })
    },
    goAddTalk() {
      uni.navigateTo({ url: '/pages/sub-work/talk/add' })
    },
    goAddLeave() {
      uni.navigateTo({ url: '/pages/sub-work/leave/add' })
    },
    // 加载当天课表
    loadTodaySchedule() {
      console.log('=== 开始加载课表 ===')
      // 获取当前选择的日期
      const date = this.selectedDate
      let weekday = date.getDay()
      if (weekday === 0) weekday = 7 // 周日转为7
      
      // 更新日期显示
      this.updateDateText(date, weekday)
      
      // 获取用户角色
      const roles = this.$store.state.user?.roles || []
      console.log('当前用户角色:', roles)
      const isSecretary = roles.includes('secretary')
      console.log('是否为书记:', isSecretary)
      
      // 只有书记角色才显示课表
      if (!isSecretary) {
        console.log('不是书记角色，不显示课表')
        this.showSchedule = false
        return
      }
      
      this.showSchedule = true
      console.log('开始调用课表接口, weekday:', weekday)
      
      getTodaySchedules(weekday).then(res => {
        console.log('课表接口返回:', JSON.stringify(res))
        const list = res.data || []
        
        // 设置默认展开状态：第一个展开，其他折叠
        this.todayScheduleList = list.map((item, index) => ({
          ...item,
          expanded: index === 0 // 第一个展开，其他折叠
        }))
        
        console.log('加载课表成功，共', this.todayScheduleList.length, '个班级')
      }).catch(err => {
        console.error('加载课表失败:', err)
        this.todayScheduleList = []
      })
    },
    // 格式化节次时间
    formatPeriodTime(period) {
      // 节次时间映射（可根据实际作息时间调整）
      const timeMap = {
        1: '8:00-8:45',
        2: '8:50-9:35',
        3: '9:55-10:40',
        4: '10:45-11:30',
        5: '14:00-14:45',
        6: '14:50-15:35',
        7: '15:55-16:40',
        8: '16:45-17:30',
        9: '19:00-19:45',
        10: '19:50-20:35',
        11: '20:40-21:25'
      }
      return timeMap[period] || ''
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
    // 切换日期
    changeDate(days) {
      const newDate = new Date(this.selectedDate)
      newDate.setDate(newDate.getDate() + days)
      this.selectedDate = newDate
      this.loadTodaySchedule() // 重新加载课表
    },
    // 更新日期显示
    updateDateText(date, weekday) {
      const month = date.getMonth() + 1
      const day = date.getDate()
      this.selectedDateText = `${month}月${day}日`
      
      const weekdayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
      this.scheduleWeekday = weekdayNames[weekday]
    },
    // 切换班级展开/折叠
    toggleClass(index) {
      this.todayScheduleList[index].expanded = !this.todayScheduleList[index].expanded
      // 强制更新视图
      this.$forceUpdate()
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

.stats-section {
  display: flex;
  margin: -40rpx 24rpx 20rpx;
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

.quick-name {
  font-size: 24rpx;
  color: #333;
}

/* 课表样式 */
.date-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  margin-bottom: 20rpx;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 16rpx;
}

.date-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.date-btn:active {
  background: #f0f0f0;
}

.date-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.date-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.weekday-text {
  font-size: 24rpx;
  color: #2979ff;
}

.schedule-list {
  margin-top: 10rpx;
}

.schedule-class {
  margin-bottom: 20rpx;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.schedule-class:last-child {
  margin-bottom: 0;
}

.schedule-class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  padding: 8rpx 12rpx;
  background: #fff;
  border-radius: 8rpx;
  cursor: pointer;
}

.schedule-class-header:active {
  background: #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.schedule-class-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #2979ff;
}

.schedule-class-count {
  font-size: 22rpx;
  color: #999;
  background: #fff;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}

.schedule-items {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.schedule-item-compact {
  display: flex;
  align-items: center;
  padding: 10rpx 12rpx;
  background: #fff;
  border-radius: 8rpx;
  gap: 12rpx;
}

.item-period {
  min-width: 100rpx;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.period-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
  white-space: nowrap;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.item-course {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-info {
  font-size: 22rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-empty {
  text-align: center;
  padding: 60rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
