<template>
  <view class="page-container">
    <!-- 未读待办提示 -->
    <view class="unread-bar" v-if="unreadCount > 0">
      <text class="unread-text">您有 {{ unreadCount }} 条未读待办</text>
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
      <view class="list-item" v-for="(item, index) in sortedList" :key="index" @click="handleTodo(item)">
        <!-- 紧急程度左侧色条 -->
        <view :class="['item-urgency-bar', 'bar-' + (item.urgency || 'normal')]"></view>
        <view class="item-content">
          <view class="item-header">
            <view class="item-title-row">
              <view :class="['urgency-dot', 'urgency-' + (item.urgency || 'normal')]" v-if="item.urgency"></view>
              <text class="item-title">{{ item.title }}</text>
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
      <view class="empty-tip" v-if="!loading && list.length === 0">
        <text>暂无待办事项</text>
      </view>
      <uni-load-more :status="loadStatus" v-else></uni-load-more>
    </scroll-view>
  </view>
</template>

<script>
import { listTodo, getUnreadCount, markRead } from '@/api/stumanage/todo'

export default {
  data() {
    return {
      list: [],
      loadStatus: 'more',
      unreadCount: 0,
      loading: false,
      sortBy: 'time'
    }
  },
  computed: {
    sortedList() {
      const arr = [...this.list]
      if (this.sortBy === 'urgency') {
        const urgencyOrder = { overdue: 0, today: 1, tomorrow: 2, normal: 3 }
        arr.sort((a, b) => {
          const ua = urgencyOrder[a.urgency] != null ? urgencyOrder[a.urgency] : 9
          const ub = urgencyOrder[b.urgency] != null ? urgencyOrder[b.urgency] : 9
          if (ua !== ub) return ua - ub
          return new Date(b.createTime) - new Date(a.createTime)
        })
      } else {
        // 按时间倒序
        arr.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      }
      return arr
    }
  },
  onShow() {
    this.getList()
    this.getUnread()
  },
  methods: {
    getList() {
      this.loading = true
      this.loadStatus = 'loading'
      listTodo().then(res => {
        this.list = res.data || []
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
    handleTodo(item) {
      if (item.isRead !== '1') {
        markRead(item.id).then(() => {
          item.isRead = '1'
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }).catch(() => {})
      }
    },
    formatTodoType(val) {
      const map = {
        schedule: '日程',
        leave: '请假审批',
        talk: '谈话提醒',
        talk_disciplinary: '违纪谈话',
        talk_daily: '日常谈心',
        classcheck_talk: '查课谈话',
        check: '查课提醒',
        overdue: '逾期提醒'
      }
      return map[val] || val || '待办'
    },
    formatUrgency(val) {
      const map = {
        overdue: '已逾期',
        today: '今日截止',
        tomorrow: '明日截止',
        normal: '常规'
      }
      return map[val] || '常规'
    },
    formatDeadline(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      const m = d.getMonth() + 1
      const day = d.getDate()
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return m + '/' + day + ' ' + h + ':' + min
    }
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

.unread-bar {
  background: #fef3e2;
  padding: 16rpx 30rpx;
}

.unread-text {
  font-size: 26rpx;
  color: #f3a044;
  font-weight: bold;
}

/* ===== 排序切换 ===== */
.sort-bar {
  display: flex;
  padding: 16rpx 30rpx;
  gap: 16rpx;
}

.sort-btn {
  padding: 10rpx 28rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #666;
  background: #fff;
}

.sort-active {
  background: #2979ff;
  color: #fff;
}

.list-scroll {
  flex: 1;
  padding: 0 30rpx 20rpx;
}

.list-item {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

/* 紧急程度左侧色条 */
.item-urgency-bar {
  width: 8rpx;
  flex-shrink: 0;
  &.bar-overdue { background: #e43d33; }
  &.bar-today { background: #f3a044; }
  &.bar-tomorrow { background: #2979ff; }
  &.bar-normal { background: #18bc37; }
}

.item-content {
  flex: 1;
  padding: 24rpx 24rpx 20rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.item-title-row {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.urgency-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-right: 10rpx;
  flex-shrink: 0;
  &.urgency-overdue { background: #e43d33; }
  &.urgency-today { background: #f3a044; }
  &.urgency-tomorrow { background: #2979ff; }
  &.urgency-normal { background: #18bc37; }
}

.item-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-unread {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #e43d33;
  flex-shrink: 0;
  margin-left: 10rpx;
}

.item-body {
  margin-bottom: 10rpx;
}

.item-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10rpx;
  border-top: 1rpx solid #f5f5f5;
}

.item-type-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

/* 业务类型颜色标签 */
.item-type {
  font-size: 20rpx;
  color: #fff;
  padding: 2rpx 14rpx;
  border-radius: 6rpx;
  &.type-schedule { background: #2979ff; }
  &.type-leave { background: #9c27b0; }
  &.type-talk { background: #18bc37; }
  &.type-talk_disciplinary { background: #e43d33; }
  &.type-talk_daily { background: #00bcd4; }
  &.type-classcheck_talk { background: #ff9800; }
  &.type-check { background: #2979ff; }
  &.type-overdue { background: #e43d33; }
  &.type-default { background: #999; }
}

/* 紧急程度文字标签 */
.item-urgency-label {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  &.label-overdue { color: #e43d33; background: #ffebee; }
  &.label-today { color: #f3a044; background: #fff8e1; }
  &.label-tomorrow { color: #2979ff; background: #e3f2fd; }
  &.label-normal { color: #18bc37; background: #e8f8ea; }
}

.item-deadline {
  font-size: 22rpx;
  color: #999;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>
