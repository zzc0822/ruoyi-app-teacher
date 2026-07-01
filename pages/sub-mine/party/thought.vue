<template>
  <view class="container">
    <view class="header">
      <text class="title">思想汇报</text>
      <u-button type="primary" size="small" @click="goAdd">提交汇报</u-button>
    </view>
    <view v-if="list.length === 0" class="empty">暂无思想汇报记录</view>
    <view v-for="item in list" :key="item.reportId" class="report-card">
      <view class="card-top">
        <text class="report-title">{{ item.title }}</text>
        <text class="status-tag" :class="'status-' + item.reviewStatus">
          {{ ['待审','已通过','需修改','已退回'][item.reviewStatus] }}
        </text>
      </view>
      <view class="card-bottom">
        <text class="meta">{{ item.reportType }} · {{ item.reportDate }}</text>
        <text class="quarter" v-if="item.quarter">{{ item.quarter }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party'
export default {
  data() { return { list: [] } },
  onShow() { this.loadData() },
  methods: {
    loadData() {
      partyApi.myThoughtReports().then(res => { this.list = res.data || [] })
    },
    goAdd() { uni.navigateTo({ url: '/pages/sub-mine/party/thoughtAdd' }) }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.title { font-size: 32rpx; font-weight: bold; }
.empty { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }
.report-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.report-title { font-size: 28rpx; color: #303133; flex: 1; }
.status-tag { padding: 4rpx 16rpx; border-radius: 16rpx; font-size: 22rpx; color: #fff; }
.status-0 { background: #E6A23C; }
.status-1 { background: #67C23A; }
.status-2 { background: #F56C6C; }
.status-3 { background: #909399; }
.card-bottom { display: flex; justify-content: space-between; }
.meta { font-size: 24rpx; color: #909399; }
.quarter { font-size: 24rpx; color: #409EFF; }
</style>
