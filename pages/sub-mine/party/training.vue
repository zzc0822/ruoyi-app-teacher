<template>
  <view class="container">
    <view class="title">我的培训记录</view>
    <view v-if="list.length === 0" class="empty">暂无培训记录</view>
    <view v-for="item in list" :key="item.id" class="record-card">
      <view class="card-row">
        <text class="label">培训课程</text>
        <text class="value">{{ item.courseName || '—' }}</text>
      </view>
      <view class="card-row">
        <text class="label">实际学时</text>
        <text class="value">{{ item.attendHours || 0 }}</text>
      </view>
      <view class="card-row">
        <text class="label">考试成绩</text>
        <text class="value">{{ item.examScore || '—' }}</text>
      </view>
      <view class="card-row">
        <text class="label">状态</text>
        <text class="value" :class="item.passStatus === '1' ? 'pass' : item.passStatus === '2' ? 'fail' : ''">
          {{ ['未考','通过','未通过'][item.passStatus] }}
        </text>
      </view>
      <view class="card-row" v-if="item.certificateNo">
        <text class="label">证书编号</text>
        <text class="value">{{ item.certificateNo }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party'
export default {
  data() { return { list: [] } },
  onLoad() {
    partyApi.myTraining().then(res => { this.list = res.data || [] })
  }
}
</script>

<style scoped>
.container { padding: 20rpx; }
.title { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; }
.empty { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }
.record-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.label { font-size: 26rpx; color: #909399; }
.value { font-size: 26rpx; color: #303133; }
.pass { color: #67C23A; font-weight: bold; }
.fail { color: #F56C6C; font-weight: bold; }
</style>
