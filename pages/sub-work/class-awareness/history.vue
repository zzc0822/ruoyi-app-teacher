<template>
  <view class="container">
    <view class="title">班情熟知记录</view>
    <view v-if="loading" class="loading">加载中...</view>
    <view v-if="!loading && records.length === 0" class="empty">暂无记录</view>
    <view v-for="item in records" :key="item.awarenessId" class="record-card" @click="viewDetail(item)">
      <view class="record-header">
        <text class="mode-tag" :class="item.mode">{{ item.mode === 'competition' ? '竞赛' : '训练' }}</text>
        <text class="record-time">{{ item.createTime }}</text>
      </view>
      <view class="record-body">
        <view class="record-item">
          <text class="item-label">正确率</text>
          <text class="item-value">{{ item.accuracyRate || 0 }}%</text>
        </view>
        <view class="record-item">
          <text class="item-label">正确人数</text>
          <text class="item-value">{{ item.correctCount || 0 }}/{{ item.totalStudents }}</text>
        </view>
        <view v-if="item.mode === 'competition'" class="record-item">
          <text class="item-label">得分</text>
          <text class="item-value highlight">{{ item.finalScore || '-' }}</text>
        </view>
        <view v-if="item.rankNum" class="record-item">
          <text class="item-label">排名</text>
          <text class="item-value">第{{ item.rankNum }}名</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listRecords } from '@/api/counselor/classAwareness'
export default {
  name: 'ClassAwarenessHistory',
  data() {
    return { records: [], loading: true, pageNum: 1, total: 0 }
  },
  onLoad() { this.loadRecords() },
  onReachBottom() {
    if (this.records.length < this.total) {
      this.pageNum++
      this.loadRecords()
    }
  },
  methods: {
    async loadRecords() {
      this.loading = true
      try {
        const res = await listRecords({ pageNum: this.pageNum, pageSize: 20 })
        if (res.code === 200) {
          if (this.pageNum === 1) this.records = res.rows
          else this.records = this.records.concat(res.rows)
          this.total = res.total
        }
      } catch (e) { console.error(e) }
      this.loading = false
    },
    viewDetail(item) {
      uni.navigateTo({ url: '/pages/sub-work/class-awareness/detail?awarenessId=' + item.awarenessId })
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f5f5; min-height: 100vh; }
.title { font-size: 36rpx; font-weight: bold; text-align: center; margin: 20rpx 0 30rpx; }
.loading, .empty { text-align: center; padding: 60rpx; color: #999; font-size: 28rpx; }
.record-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.mode-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; color: #fff; }
.mode-tag.training { background: #909399; }
.mode-tag.competition { background: #e6a23c; }
.record-time { font-size: 24rpx; color: #999; }
.record-body { display: flex; flex-wrap: wrap; gap: 20rpx; }
.record-item { flex: 1; min-width: 120rpx; }
.item-label { font-size: 24rpx; color: #999; display: block; }
.item-value { font-size: 28rpx; font-weight: bold; }
.highlight { color: #409eff; }
</style>
