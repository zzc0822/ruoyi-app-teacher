<template>
  <view class="rectify-page">
    <view class="line-bar">
      <view class="line-item" @click="goNight">
        <text class="line-name">夜间考勤</text>
        <text class="line-desc">人在不在</text>
      </view>
      <view class="line-item active">
        <text class="line-name">整改复核</text>
        <text class="line-desc">内务与安全扣分</text>
      </view>
    </view>

    <scroll-view scroll-x class="status-scroll">
      <view class="chip-row">
        <text class="chip" :class="{ active: filterStatus === '' }" @click="pickStatus('')">全部 {{ totalCount }}</text>
        <text class="chip" :class="{ active: filterStatus === s.value }"
              v-for="s in statusOptions" :key="s.value" @click="pickStatus(s.value)">{{ s.label }} {{ countOf(s.value) }}</text>
      </view>
    </scroll-view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="rectify-card" v-for="item in rectifyList" :key="item.rectifyId" @click="goDetail(item)">
        <view class="card-top">
          <view class="room-info">
            <text class="room-name">{{ roomText(item) }}</text>
            <text class="task-name">{{ item.taskName || item.checkType || '现场下达' }}</text>
          </view>
          <view class="status-tag" :class="'st-' + statusKey(item)"><text>{{ statusText(statusKey(item)) }}</text></view>
        </view>
        <view class="card-body">
          <view class="problem-text">{{ item.problemDesc }}</view>
          <view class="require-text" v-if="item.requireDesc">要求：{{ item.requireDesc }}</view>
          <view class="info-row">
            <text class="label">扣分</text>
            <text class="value">{{ item.deductScore || 0 }} 分</text>
          </view>
          <view class="info-row">
            <text class="label">整改时限</text>
            <text class="value">{{ fmtDate(item.deadline) }}<text class="left-days" v-if="showLeftDays(item)">{{ leftText(item) }}</text></text>
          </view>
          <view class="info-row">
            <text class="label">责任人</text>
            <text class="value">{{ item.ownerName || item.counselorName || '-' }}</text>
          </view>
        </view>
        <view class="card-action" v-if="statusKey(item) === 'suggested' || statusKey(item) === 'submitted'">
          <text class="action-text">{{ statusKey(item) === 'suggested' ? '待确认整改建议 →' : '点击现场复核 →' }}</text>
        </view>
      </view>

      <view class="empty-tip" v-if="rectifyList.length === 0 && !loading">
        <text>暂无整改单</text>
      </view>
      <view class="loading-tip" v-if="loading"><text>加载中...</text></view>
    </scroll-view>
  </view>
</template>

<script>
import { listRectify, countRectifyStatus } from '@/api/work/dormcheck'

export default {
  data() {
    return {
      loading: false,
      rectifyList: [],
      filterStatus: '',
      counts: {},
      totalCount: 0,
      statusOptions: [
        { value: 'suggested', label: '待确认建议' },
        { value: 'pending', label: '待整改' },
        { value: 'submitted', label: '待复核' },
        { value: 'rejected', label: '已打回' },
        { value: 'overdue', label: '已逾期' },
        { value: 'passed', label: '已通过' },
        { value: 'closed', label: '已关闭' }
      ]
    }
  },
  onShow() {
    this.loadList()
    this.loadCounts()
  },
  methods: {
    pickStatus(value) {
      this.filterStatus = value
      this.loadList()
    },
    async loadList() {
      this.loading = true
      try {
        const res = await listRectify({
          pageNum: 1,
          pageSize: 50,
          status: this.filterStatus || undefined
        })
        if (res.code === 200) this.rectifyList = res.rows || []
      } catch (e) {
        // 加载整改单失败
      }
      this.loading = false
    },
    loadCounts() {
      countRectifyStatus({}).then(res => {
        const map = {}
        let all = 0
        ;(res.data || []).forEach(row => {
          const code = row.statusCode || row.status_code
          const num = Number(row.num || 0)
          if (code) {
            map[code] = num
            all += num
          }
        })
        this.counts = map
        this.totalCount = all
      }).catch(() => {})
    },
    countOf(status) {
      return this.counts[status] || 0
    },
    statusKey(item) {
      return item.statusEffective || item.status_effective || item.status
    },
    statusText(value) {
      const hit = this.statusOptions.find(s => s.value === value)
      return hit ? hit.label : (value || '未知')
    },
    roomText(item) {
      const building = item.buildingName || item.apartmentName || ''
      return building ? building + ' ' + (item.roomNo || '') : (item.roomNo || '未知宿舍')
    },
    fmtDate(value) { return value ? String(value).substring(0, 10) : '-' },
    showLeftDays(item) {
      return item.leftDays !== null && item.leftDays !== undefined &&
        ['pending', 'submitted', 'rejected'].indexOf(this.statusKey(item)) > -1
    },
    leftText(item) {
      const n = Number(item.leftDays)
      if (isNaN(n)) return ''
      if (n < 0) return '（逾期 ' + Math.abs(n) + ' 天）'
      if (n === 0) return '（今天到期）'
      return '（还剩 ' + n + ' 天）'
    },
    loadMore() {},
    goDetail(item) {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/rectifyDetail?rectifyId=' + item.rectifyId })
    },
    goNight() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.rectify-page {
  min-height: 100vh;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
}
.line-bar {
  display: flex;
  background: #fff;
  padding: 20rpx;
  gap: 16rpx;
}
.line-item {
  flex: 1;
  padding: 18rpx 20rpx;
  border-radius: 12rpx;
  background: #f7f8fa;
}
.line-item.active { background: #eef0ff; border: 1rpx solid #667eea; }
.line-name { display: block; font-size: 28rpx; font-weight: 600; color: #333; }
.line-desc { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.status-scroll { background: #fff; padding: 0 20rpx 20rpx; }
.chip-row { display: flex; gap: 12rpx; white-space: nowrap; }
.chip {
  padding: 12rpx 22rpx;
  border-radius: 22rpx;
  font-size: 24rpx;
  color: #666;
  background: #f5f5f5;
  flex-shrink: 0;
}
.chip.active { background: #667eea; color: #fff; }
.list-scroll { flex: 1; height: calc(100vh - 220rpx); }
.rectify-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}
.room-info { display: flex; flex-direction: column; }
.room-name { font-size: 30rpx; font-weight: 600; color: #333; }
.task-name { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.status-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: #f5f5f5;
  color: #666;
}
.st-pending { background: #fff3e0; color: #ff9800; }
.st-suggested { background: #fef3c7; color: #b45309; }
.st-submitted { background: #e3f2fd; color: #2196f3; }
.st-rejected { background: #ffebee; color: #f44336; }
.st-overdue { background: #ffebee; color: #f44336; }
.st-passed { background: #e8f5e9; color: #4caf50; }
.st-closed { background: #f0f0f0; color: #999; }
.card-body { border-top: 1rpx solid #f0f0f0; padding-top: 14rpx; }
.problem-text { font-size: 26rpx; color: #333; margin-bottom: 8rpx; }
.require-text { font-size: 24rpx; color: #667eea; margin-bottom: 10rpx; }
.info-row { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.label { font-size: 24rpx; color: #999; }
.value { font-size: 24rpx; color: #333; }
.left-days { font-size: 22rpx; color: #ff9800; margin-left: 6rpx; }
.card-action {
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}
.action-text { font-size: 26rpx; color: #667eea; font-weight: 500; }
.empty-tip, .loading-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>
