<template>
  <view class="page-container">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: filterType === '' }" @click="setFilter('')">全部</view>
      <view class="filter-item" :class="{ active: filterType === 'meeting' }" @click="setFilter('meeting')">班会</view>
      <view class="filter-item" :class="{ active: filterType === 'talk' }" @click="setFilter('talk')">谈话</view>
      <view class="filter-item" :class="{ active: filterType === 'dorm' }" @click="setFilter('dorm')">巡查</view>
      <view class="filter-item" :class="{ active: filterType === 'other' }" @click="setFilter('other')">其他</view>
    </view>

    <!-- 工作记录列表 -->
    <view class="worklog-card" v-for="(item, idx) in filteredList" :key="idx" @click="goEdit(item)">
      <view class="wl-top">
        <view class="wl-type-tag" :class="item.workType">{{ typeText(item.workType) }}</view>
        <text class="wl-date">{{ formatDate(item.workDate) }}</text>
      </view>
      <view class="wl-class" v-if="item.className">{{ item.className }}</view>
      <view class="wl-content">{{ item.workContent || '' }}</view>
      <view class="wl-bottom">
        <text class="wl-location" v-if="item.workLocation">📍 {{ item.workLocation }}</text>
        <text class="wl-count" v-if="item.participantCount">参与{{ item.participantCount }}人</text>
      </view>
    </view>

    <view class="empty" v-if="filteredList.length === 0">
      <text>暂无工作记录</text>
    </view>

    <!-- 新增按钮 -->
    <view class="fab-btn" @click="goAdd">
      <uni-icons type="plusempty" size="24" color="#fff"></uni-icons>
    </view>
  </view>
</template>

<script>
import { listWorklog, deleteWorklog } from '@/api/affair/headteacher'

export default {
  data() {
    return {
      list: [],
      filterType: '',
      pageNum: 1,
      pageSize: 20,
      total: 0,
      loading: false
    }
  },
  computed: {
    filteredList() {
      if (!this.filterType) return this.list
      return this.list.filter(item => item.workType === this.filterType)
    }
  },
  onShow() {
    this.refresh()
  },
  onReachBottom() {
    this.loadMore()
  },
  methods: {
    refresh() {
      this.pageNum = 1
      this.list = []
      this.loadList()
    },
    loadList() {
      if (this.loading) return
      this.loading = true
      listWorklog({
        pageNum: this.pageNum,
        pageSize: this.pageSize
      }).then(res => {
        const rows = res.rows || []
        if (this.pageNum === 1) {
          this.list = rows
        } else {
          this.list = this.list.concat(rows)
        }
        this.total = res.total || 0
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    loadMore() {
      if (this.list.length >= this.total) return
      this.pageNum++
      this.loadList()
    },
    setFilter(type) {
      this.filterType = type
    },
    typeText(type) {
      const map = { meeting: '班会', talk: '谈话', dorm: '宿舍巡查', other: '其他' }
      return map[type] || type
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return dateStr.substring(0, 10)
    },
    goAdd() {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/worklog-add'
      })
    },
    goEdit(item) {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/worklog-add?id=' + item.id
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.filter-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.filter-item {
  padding: 8rpx 20rpx;
  background: #fff;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
  flex-shrink: 0;

  &.active {
    background: #2979ff;
    color: #fff;
  }
}

.worklog-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;

  &:active {
    background: #f9f9f9;
  }
}

.wl-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.wl-type-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  color: #fff;

  &.meeting { background: #18bc37; }
  &.talk { background: #f3a044; }
  &.dorm { background: #2979ff; }
  &.other { background: #999; }
}

.wl-date {
  font-size: 24rpx;
  color: #999;
}

.wl-class {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.wl-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.wl-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wl-location {
  font-size: 22rpx;
  color: #999;
}

.wl-count {
  font-size: 22rpx;
  color: #999;
}

.empty {
  text-align: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 60rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #2979ff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(41, 121, 255, 0.4);

  &:active {
    transform: scale(0.95);
  }
}
</style>
