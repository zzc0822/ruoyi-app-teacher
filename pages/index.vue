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

    <!-- 待办快览 -->
    <view class="section-card" v-if="todoList.length > 0">
      <view class="section-header">
        <text class="section-title">待办提醒</text>
        <text class="section-more" @click="goWork">更多</text>
      </view>
      <view class="todo-item" v-for="(item, index) in todoList" :key="index" @click="goWork">
        <view class="todo-left">
          <view :class="['todo-dot', 'dot-' + item.urgency]" v-if="item.urgency"></view>
          <text class="todo-text">{{ item.title }}</text>
        </view>
        <text class="todo-time" v-if="item.deadline">{{ formatDeadline(item.deadline) }}</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="section-card">
      <view class="section-header">
        <text class="section-title">快捷入口</text>
      </view>
      <view class="quick-grid">
        <view class="quick-item" @click="goWork">
          <uni-icons type="person-filled" size="24" color="#2979ff"></uni-icons>
          <text class="quick-name">我的学生</text>
        </view>
        <view class="quick-item" @click="goWork">
          <uni-icons type="checkbox-filled" size="24" color="#18bc37"></uni-icons>
          <text class="quick-name">查课记录</text>
        </view>
        <view class="quick-item" @click="goWork">
          <uni-icons type="chat-filled" size="24" color="#f3a044"></uni-icons>
          <text class="quick-name">谈话记录</text>
        </view>
        <view class="quick-item" @click="goWork">
          <uni-icons type="paperplane" size="24" color="#e43d33"></uni-icons>
          <text class="quick-name">请假管理</text>
        </view>
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

export default {
  data() {
    return {
      nickName: '',
      stuCount: '-',
      pendingLeave: '-',
      unreadTodo: '-',
      checkCount: '-',
      todoList: []
    }
  },
  onShow() {
    this.loadTeacherName()
    this.loadStats()
    this.loadTodos()
  },
  methods: {
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
        if (res.data && res.data.xm) {
          this.nickName = res.data.xm
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
      listTodo().then(res => {
        const list = res.data || []
        this.todoList = list.filter(t => t.status !== 'completed').slice(0, 3)
      }).catch(() => {})
    },
    goWork() {
      uni.switchTab({ url: '/pages/work/index' })
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
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.todo-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  flex-shrink: 0;
  &.dot-high { background: #e43d33; }
  &.dot-medium { background: #f3a044; }
  &.dot-low { background: #18bc37; }
}

.todo-text {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-time {
  font-size: 24rpx;
  color: #999;
  flex-shrink: 0;
  margin-left: 16rpx;
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
}

.quick-name {
  font-size: 24rpx;
  color: #333;
  margin-top: 8rpx;
}
</style>
