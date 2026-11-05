<template>
  <view class="message-page">
    <view class="inbox-head">
      <view class="inbox-copy">
        <text class="inbox-title">消息中心</text>
        <text class="inbox-sub">{{ unread > 0 ? unread + ' 条未读消息' : '暂无未读消息' }}</text>
      </view>
      <view v-if="unread > 0" class="read-all" @click="handleReadAll">
        <uni-icons type="checkmarkempty" size="16" color="#0f766e" />
        <text>全部已读</text>
      </view>
    </view>

    <view class="filter-bar">
      <view
        class="filter-chip"
        :class="{ active: filter === 'all' }"
        @click="switchFilter('all')"
      >
        <text>全部</text>
      </view>
      <view
        class="filter-chip"
        :class="{ active: filter === 'unread' }"
        @click="switchFilter('unread')"
      >
        <text>未读</text>
        <text v-if="unread > 0" class="filter-count">{{ unread > 99 ? '99+' : unread }}</text>
      </view>
    </view>

    <view v-if="loading" class="page-state">
      <text>消息加载中...</text>
    </view>
    <view v-else-if="loadError" class="page-state" @click="reload">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>
    <view v-else-if="messages.length" class="message-list">
      <view
        v-for="item in messages"
        :key="item.id"
        class="message-card"
        :class="{ 'is-unread': !item.readTime }"
        @click="openMessage(item)"
      >
        <view class="card-top">
          <view class="card-title-wrap">
            <view v-if="!item.readTime" class="unread-dot"></view>
            <text class="card-title">{{ item.title || '消息通知' }}</text>
          </view>
          <text class="card-time">{{ formatTime(item.createTime) }}</text>
        </view>
        <text class="card-content">{{ item.content || '' }}</text>
        <view class="card-foot">
          <text class="card-category">{{ item.categoryLabel || '系统消息' }}</text>
          <view v-if="item.mobileActionPath" class="card-link">
            <text>去处理</text>
            <uni-icons type="right" size="12" color="#0f766e" />
          </view>
        </view>
      </view>
      <view class="list-foot">
        <text v-if="loadingMore">加载中...</text>
        <text v-else-if="finished">没有更多消息了</text>
      </view>
    </view>
    <view v-else class="page-state">
      <uni-icons type="chatboxes" size="40" color="#cbd5e1"></uni-icons>
      <text>{{ filter === 'unread' ? '没有未读消息' : '当前还没有消息' }}</text>
    </view>
  </view>
</template>

<script>
import {
  listMessages,
  markMessageRead,
  markAllMessagesRead
} from '@/api/work/message'

export default {
  data() {
    return {
      messages: [],
      loading: true,
      loadingMore: false,
      loadError: '',
      filter: 'all',
      unread: 0,
      total: 0,
      pageNum: 1,
      pageSize: 10,
      finished: false,
      opening: false
    }
  },
  onLoad() {
    this.reload()
  },
  onPullDownRefresh() {
    this.reload().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  onReachBottom() {
    if (this.loading || this.loadingMore || this.finished) {
      return
    }
    this.loadMore()
  },
  methods: {
    reload() {
      this.pageNum = 1
      this.finished = false
      this.loading = true
      this.loadError = ''
      return this.fetchMessages(1, true)
        .catch(() => {
          this.loadError = '消息加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    loadMore() {
      this.loadingMore = true
      const nextPage = this.pageNum
      this.fetchMessages(nextPage, false)
        .catch(() => {
          uni.showToast({ title: '加载失败，请重试', icon: 'none' })
        })
        .finally(() => {
          this.loadingMore = false
        })
    },
    fetchMessages(pageNum, reset) {
      return listMessages({
        pageNum,
        pageSize: this.pageSize,
        filter: this.filter
      }).then(res => {
        const rows = (res && res.rows) || []
        this.messages = reset ? rows : this.messages.concat(rows)
        this.total = (res && res.total) || 0
        if (res && res.extra && typeof res.extra.unread === 'number') {
          this.unread = res.extra.unread
        }
        this.pageNum = pageNum + 1
        this.finished = this.messages.length >= this.total
        return res
      })
    },
    switchFilter(value) {
      if (this.filter === value) {
        return
      }
      this.filter = value
      this.messages = []
      this.reload()
    },
    openMessage(item) {
      if (this.opening) {
        return
      }
      this.opening = true
      this.markRead(item)
      const url = item.mobileActionPath
      if (!url) {
        this.opening = false
        uni.showToast({ title: '该消息暂无办理入口', icon: 'none' })
        return
      }
      uni.navigateTo({
        url,
        complete: () => {
          this.opening = false
        },
        fail: () => {
          uni.showToast({ title: '该入口暂不可用', icon: 'none' })
        }
      })
    },
    markRead(item) {
      if (item.readTime) {
        return
      }
      item.readTime = this.nowText()
      this.unread = Math.max(0, this.unread - 1)
      markMessageRead(item.id).catch(() => {
        item.readTime = null
        this.unread += 1
      })
    },
    handleReadAll() {
      markAllMessagesRead().then(() => {
        const now = this.nowText()
        this.messages.forEach(item => {
          if (!item.readTime) {
            item.readTime = now
          }
        })
        this.unread = 0
        if (this.filter === 'unread') {
          this.messages = []
          this.total = 0
          this.finished = true
        }
        uni.showToast({ title: '已全部标为已读', icon: 'none' })
      }).catch(() => {
        uni.showToast({ title: '操作失败，请重试', icon: 'none' })
      })
    },
    nowText() {
      const now = new Date()
      const pad = value => (value < 10 ? '0' + value : '' + value)
      return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
        ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())
    },
    formatTime(value) {
      if (!value) {
        return ''
      }
      const date = new Date(String(value).replace(/-/g, '/'))
      if (isNaN(date.getTime())) {
        return value
      }
      const now = new Date()
      const pad = number => (number < 10 ? '0' + number : '' + number)
      const time = pad(date.getHours()) + ':' + pad(date.getMinutes())
      const sameDay = date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      if (sameDay) {
        return time
      }
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      if (date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()) {
        return '昨天 ' + time
      }
      if (date.getFullYear() === now.getFullYear()) {
        return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + time
      }
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    }
  }
}
</script>

<style lang="scss" scoped>
.message-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
  box-sizing: border-box;
  background: #f4f7f9;
}

.inbox-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 4rpx 20rpx;
  gap: 16rpx;
}

.inbox-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.inbox-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
}

.inbox-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #64748b;
}

.read-all {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: #ffffff;
  font-size: 24rpx;
  color: #0f766e;
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #ffffff;
  font-size: 26rpx;
  color: #475569;
  border: 1rpx solid transparent;
}

.filter-chip.active {
  background: #e6f4f1;
  border-color: #99d5c8;
  color: #0f766e;
  font-weight: 600;
}

.filter-count {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: #ef4444;
  color: #ffffff;
  font-size: 20rpx;
  line-height: 32rpx;
  text-align: center;
  box-sizing: border-box;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.message-card {
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid #e8edf3;
  box-sizing: border-box;
}

.message-card.is-unread {
  border-color: #c7e5de;
  background: #fbfefd;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
  flex: 1;
}

.unread-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #ef4444;
  flex-shrink: 0;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.card-time {
  font-size: 22rpx;
  color: #94a3b8;
  flex-shrink: 0;
  padding-top: 4rpx;
}

.card-content {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #475569;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
}

.card-category {
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #eef4f8;
  color: #526477;
  font-size: 22rpx;
}

.card-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: #0f766e;
}

.page-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  min-height: 420rpx;
  font-size: 26rpx;
  color: #94a3b8;
}

.state-action {
  color: #0f766e;
}

.list-foot {
  padding: 24rpx 0 8rpx;
  text-align: center;
  font-size: 22rpx;
  color: #94a3b8;
}
</style>
