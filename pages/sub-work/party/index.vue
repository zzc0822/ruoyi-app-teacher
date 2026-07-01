<template>
  <view class="container">
    <!-- 支部概览卡片 -->
    <view class="overview-card" v-if="branch">
      <view class="overview-header">
        <text class="overview-title">{{ branch.branchName }}</text>
        <text class="overview-type">{{ orgTypeLabel(branch.orgType) }}</text>
      </view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-num">{{ totalMembers }}</text>
          <text class="stat-label">总人数</text>
        </view>
        <view class="stat-item">
          <text class="stat-num blue">{{ stageCounts.FORMAL || 0 }}</text>
          <text class="stat-label">正式党员</text>
        </view>
        <view class="stat-item">
          <text class="stat-num orange">{{ stageCounts.PROBATIONARY || 0 }}</text>
          <text class="stat-label">预备党员</text>
        </view>
        <view class="stat-item">
          <text class="stat-num green">{{ (stageCounts.ACTIVIST || 0) + (stageCounts.TARGET || 0) + (stageCounts.APPLICANT || 0) }}</text>
          <text class="stat-label">发展中</text>
        </view>
      </view>
    </view>

    <view v-else class="empty-card">
      <u-icon name="info-circle" size="60" color="#909399"></u-icon>
      <text class="empty-text">您未担任任何支部书记</text>
      <text class="empty-tip">请联系系统管理员配置</text>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section" v-if="branch">
      <text class="section-title">党务管理</text>
      <view class="menu-list">
        <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=')">
          <view class="menu-left">
            <u-icon name="account" size="22" color="#409EFF"></u-icon>
            <text class="menu-name">全部党员</text>
          </view>
          <view class="menu-right">
            <text class="menu-count">{{ totalMembers }}人</text>
            <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
          </view>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=FORMAL')">
          <view class="menu-left">
            <u-icon name="checkmark-circle" size="22" color="#67C23A"></u-icon>
            <text class="menu-name">正式党员</text>
          </view>
          <view class="menu-right">
            <text class="menu-count">{{ stageCounts.FORMAL || 0 }}人</text>
            <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
          </view>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=PROBATIONARY')">
          <view class="menu-left">
            <u-icon name="warning" size="22" color="#F56C6C"></u-icon>
            <text class="menu-name">预备党员</text>
          </view>
          <view class="menu-right">
            <text class="menu-count">{{ stageCounts.PROBATIONARY || 0 }}人</text>
            <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
          </view>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=ACTIVIST')">
          <view class="menu-left">
            <u-icon name="list" size="22" color="#E6A23C"></u-icon>
            <text class="menu-name">积极分子</text>
          </view>
          <view class="menu-right">
            <text class="menu-count">{{ stageCounts.ACTIVIST || 0 }}人</text>
            <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party'

const stageMap = { APPLICANT: '入党申请人', ACTIVIST: '积极分子', TARGET: '发展对象', PROBATIONARY: '预备党员', FORMAL: '正式党员' }

export default {
  data() {
    return {
      branch: null,
      totalMembers: 0,
      stageCounts: {}
    }
  },
  onShow() { this.loadData() },
  methods: {
    orgTypeLabel(t) { return { '1': '党委', '2': '党总支', '3': '党支部' }[t] || '—' },
    loadData() {
      uni.showLoading({ title: '加载中...' })
      partyApi.branchStats().then(res => {
        uni.hideLoading()
        const data = res.data || {}
        this.branch = data.branch || null
        this.totalMembers = data.totalMembers || 0
        // 统计各阶段人数
        const stats = data.stageStats || []
        stats.forEach(s => { this.stageCounts[s.stage] = s.count })
      }).catch(() => { uni.hideLoading() })
    },
    goTo(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.empty-card { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-text { margin-top: 20rpx; color: #909399; font-size: 28rpx; }
.empty-tip { margin-top: 12rpx; color: #c0c4cc; font-size: 24rpx; }

.overview-card { background: linear-gradient(135deg, #c62828, #e53935); border-radius: 16rpx; padding: 30rpx; margin-bottom: 24rpx; color: #fff; box-shadow: 0 4rpx 16rpx rgba(198,40,40,0.3); }
.overview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.overview-title { font-size: 34rpx; font-weight: bold; }
.overview-type { font-size: 24rpx; background: rgba(255,255,255,0.2); padding: 4rpx 16rpx; border-radius: 12rpx; }

.stats-grid { display: flex; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 40rpx; font-weight: bold; color: #fff; }
.stat-num.blue { color: #bbdefb; }
.stat-num.orange { color: #ffe0b2; }
.stat-num.green { color: #c8e6c9; }
.stat-label { font-size: 22rpx; opacity: 0.8; margin-top: 6rpx; }

.menu-section { margin-top: 10rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #303133; margin-bottom: 16rpx; display: block; padding-left: 10rpx; }
.menu-list { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 30rpx; border-bottom: 1rpx solid #f5f5f5; }
.menu-item:last-child { border-bottom: none; }
.menu-left { display: flex; align-items: center; }
.menu-name { margin-left: 16rpx; font-size: 28rpx; color: #303133; }
.menu-right { display: flex; align-items: center; }
.menu-count { margin-right: 10rpx; font-size: 26rpx; color: #909399; }
</style>
