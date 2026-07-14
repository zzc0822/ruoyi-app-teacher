<template>
  <view class="container">
    <view v-if="!branch" class="empty-card">
      <u-icon name="info-circle" size="60" color="#909399"></u-icon>
      <text class="empty-text">暂无组织信息</text>
    </view>

    <view v-else>
      <!-- 支部信息卡片 -->
      <view class="info-card">
        <view class="card-icon">
          <u-icon name="home" size="50" color="#409EFF"></u-icon>
        </view>
        <view class="card-content">
          <text class="org-name">{{ branch.branchName }}</text>
          <text class="org-code" v-if="branch.branchCode">编码：{{ branch.branchCode }}</text>
        </view>
      </view>

      <!-- 详细信息 -->
      <view class="detail-card">
        <text class="section-title">基本信息</text>
        <view class="detail-row">
          <text class="detail-label">组织类型</text>
          <text class="detail-val">{{ orgTypeLabel(branch.orgType) }}</text>
        </view>
        <view class="detail-row" v-if="parentBranch">
          <text class="detail-label">上级组织</text>
          <text class="detail-val">{{ parentBranch.branchName }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">党员人数</text>
          <text class="detail-val highlight">{{ branch.memberCount || 0 }} 人</text>
        </view>
        <view class="detail-row" v-if="branch.secretary">
          <text class="detail-label">支部书记</text>
          <text class="detail-val">{{ branch.secretary }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">状态</text>
          <text class="detail-val">{{ branch.status === '0' ? '正常' : '异常' }}</text>
        </view>
      </view>

      <!-- 上级组织信息 -->
      <view class="detail-card" v-if="parentBranch">
        <text class="section-title">上级组织</text>
        <view class="detail-row">
          <text class="detail-label">组织名称</text>
          <text class="detail-val">{{ parentBranch.branchName }}</text>
        </view>
        <view class="detail-row" v-if="parentBranch.secretary">
          <text class="detail-label">负责人</text>
          <text class="detail-val">{{ parentBranch.secretary }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">组织类型</text>
          <text class="detail-val">{{ orgTypeLabel(parentBranch.orgType) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party/party'

export default {
  data() {
    return {
      branch: null,
      parentBranch: null
    }
  },
  onLoad() { this.loadData() },
  methods: {
    orgTypeLabel(t) {
      return { '1': '党委', '2': '党总支', '3': '党支部' }[t] || '—'
    },
    loadData() {
      uni.showLoading({ title: '加载中...' })
      partyApi.myBranch().then(res => {
        uni.hideLoading()
        const data = res.data || {}
        this.branch = data.branch || null
        this.parentBranch = data.parentBranch || null
      }).catch(() => { uni.hideLoading() })
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.empty-card { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-text { margin-top: 20rpx; color: #909399; font-size: 28rpx; }

.info-card { display: flex; align-items: center; background: linear-gradient(135deg, #409EFF, #66b1ff); border-radius: 16rpx; padding: 30rpx; margin-bottom: 24rpx; color: #fff; }
.card-icon { margin-right: 20rpx; }
.card-content { flex: 1; }
.org-name { font-size: 34rpx; font-weight: bold; display: block; }
.org-code { font-size: 24rpx; opacity: 0.8; margin-top: 6rpx; display: block; }

.detail-card { background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.section-title { font-size: 30rpx; font-weight: bold; color: #303133; margin-bottom: 20rpx; display: block; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-size: 28rpx; color: #909399; }
.detail-val { font-size: 28rpx; color: #303133; }
.highlight { color: #409EFF; font-weight: 500; }
</style>
