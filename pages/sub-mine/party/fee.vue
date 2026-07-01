<template>
  <view class="container">
    <view class="title">我的党费记录</view>
    <view v-if="list.length === 0" class="empty">暂无党费记录</view>
    <view v-for="item in list" :key="item.feeId" class="fee-card">
      <view class="card-row">
        <text class="period">{{ item.feeYear }}年{{ item.feeMonth }}月</text>
        <text class="amount">¥{{ item.amount }}</text>
      </view>
      <view class="card-row">
        <text class="meta">{{ { CASH: '现金', TRANSFER: '转账', ONLINE: '线上' }[item.payMethod] || '—' }}</text>
        <text class="status" :class="item.payStatus === '1' ? 'paid' : item.payStatus === '2' ? 'exempt' : 'unpaid'">
          {{ ['未缴','已缴','减免'][item.payStatus] }}
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party'
export default {
  data() { return { list: [] } },
  onLoad() {
    partyApi.myFees().then(res => { this.list = res.data || [] })
  }
}
</script>

<style scoped>
.container { padding: 20rpx; }
.title { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; }
.empty { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }
.fee-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-row { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 0; }
.period { font-size: 28rpx; color: #303133; }
.amount { font-size: 32rpx; font-weight: bold; color: #F56C6C; }
.meta { font-size: 24rpx; color: #909399; }
.status { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 16rpx; color: #fff; }
.unpaid { background: #F56C6C; }
.paid { background: #67C23A; }
.exempt { background: #E6A23C; }
</style>
