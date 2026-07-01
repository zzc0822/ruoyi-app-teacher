<template>
  <view class="container">
    <!-- 无党员档案 -->
    <view v-if="!hasPartyRecord" class="empty-card">
      <u-icon name="info-circle" size="60" color="#909399"></u-icon>
      <text class="empty-text">暂无党员档案</text>
      <text class="empty-tip">请联系所在党支部录入档案</text>
    </view>

    <view v-else>
      <!-- 党员信息卡片 -->
      <view class="member-card">
        <view class="card-header">
          <view class="name-row">
            <text class="name">{{ member.studentName || member.xh }}</text>
            <text class="stage-tag" :class="'stage-' + member.currentStage">{{ stageLabel(member.currentStage) }}</text>
          </view>
          <view class="archive-row" v-if="member.archiveNo">
            <text class="archive-label">档案号：</text>
            <text class="archive-val">{{ member.archiveNo }}</text>
          </view>
        </view>
        <view class="card-body">
          <view class="info-row"><text class="label">学号：</text><text>{{ member.xh }}</text></view>
          <view class="info-row"><text class="label">政治面貌：</text><text class="highlight">{{ zzmmLabel(member.currentStage) }}</text></view>
          <view class="info-row"><text class="label">所属支部：</text><text>{{ member.branchName || '—' }}</text></view>
          <view class="info-row"><text class="label">递交申请：</text><text>{{ formatDate(member.applyDate) }}</text></view>
          <view class="info-row"><text class="label">当前状态：</text><text>{{ statusLabel(member.stageStatus) }}</text></view>
        </view>
      </view>

      <!-- 培养人/介绍人信息 -->
      <view class="section-card" v-if="member.introducer1 || member.introducer2">
        <text class="section-title">入党介绍人</text>
        <view class="person-row" v-if="member.introducer1">
          <u-icon name="account" size="20" color="#409EFF"></u-icon>
          <text class="person-name">{{ member.introducer1 }}</text>
          <text class="person-role">第一介绍人</text>
        </view>
        <view class="person-row" v-if="member.introducer2">
          <u-icon name="account" size="20" color="#409EFF"></u-icon>
          <text class="person-name">{{ member.introducer2 }}</text>
          <text class="person-role">第二介绍人</text>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-grid">
        <view class="menu-item" @click="goTo('/pages/sub-mine/party/orgInfo')">
          <u-icon name="home" size="40" color="#409EFF"></u-icon>
          <text class="menu-text">组织信息</text>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-mine/party/application')">
          <u-icon name="file-text" size="40" color="#E6A23C"></u-icon>
          <text class="menu-text">入党申请书</text>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-mine/party/progress')">
          <u-icon name="list" size="40" color="#67C23A"></u-icon>
          <text class="menu-text">发展进度</text>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-mine/party/thought')">
          <u-icon name="edit-pen" size="40" color="#909399"></u-icon>
          <text class="menu-text">思想汇报</text>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-mine/party/training')">
          <u-icon name="read" size="40" color="#F56C6C"></u-icon>
          <text class="menu-text">培训记录</text>
        </view>
        <view class="menu-item" @click="goTo('/pages/sub-mine/party/fee')">
          <u-icon name="red-packet" size="40" color="#ff9900"></u-icon>
          <text class="menu-text">党费记录</text>
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
      hasPartyRecord: false,
      member: {},
      branch: null
    }
  },
  onLoad() { this.loadInfo() },
  onShow() { this.loadInfo() },
  methods: {
    stageLabel(code) { return stageMap[code] || code || '—' },
    zzmmLabel(stage) {
      const map = { APPLICANT: '入党申请人', ACTIVIST: '入党积极分子', TARGET: '发展对象', PROBATIONARY: '中共预备党员', FORMAL: '中共党员' }
      return map[stage] || '群众'
    },
    statusLabel(s) { return s === '0' ? '进行中' : s === '1' ? '已完成' : '已终止' },
    formatDate(d) { return d ? d.substring(0, 10) : '—' },
    loadInfo() {
      uni.showLoading({ title: '加载中...' })
      partyApi.myInfo().then(res => {
        uni.hideLoading()
        const data = res.data || {}
        if (data.hasPartyRecord) {
          this.hasPartyRecord = true
          this.member = data.member || {}
          this.branch = data.branch || null
        } else {
          this.hasPartyRecord = false
        }
      }).catch(() => { uni.hideLoading() })
    },
    goTo(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.empty-card { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-text { margin-top: 20rpx; color: #909399; font-size: 30rpx; }
.empty-tip { margin-top: 12rpx; color: #c0c4cc; font-size: 24rpx; }

.member-card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.card-header { margin-bottom: 20rpx; }
.name-row { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 36rpx; font-weight: bold; color: #303133; }
.stage-tag { padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; color: #fff; background: #909399; }
.stage-APPLICANT { background: #909399; }
.stage-ACTIVIST { background: #409EFF; }
.stage-TARGET { background: #E6A23C; }
.stage-PROBATIONARY { background: #F56C6C; }
.stage-FORMAL { background: #67C23A; }
.archive-row { margin-top: 10rpx; }
.archive-label { font-size: 24rpx; color: #909399; }
.archive-val { font-size: 24rpx; color: #606266; }

.card-body { }
.info-row { display: flex; padding: 10rpx 0; font-size: 28rpx; }
.label { color: #909399; width: 160rpx; flex-shrink: 0; }
.highlight { color: #E6A23C; font-weight: 500; }

.section-card { background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.section-title { font-size: 30rpx; font-weight: bold; color: #303133; margin-bottom: 16rpx; display: block; }
.person-row { display: flex; align-items: center; padding: 12rpx 0; }
.person-name { margin-left: 12rpx; font-size: 28rpx; color: #303133; flex: 1; }
.person-role { font-size: 24rpx; color: #409EFF; background: #ecf5ff; padding: 4rpx 16rpx; border-radius: 12rpx; }

.menu-grid { display: flex; flex-wrap: wrap; background: #fff; border-radius: 16rpx; padding: 10rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.menu-item { width: 33.33%; display: flex; flex-direction: column; align-items: center; padding: 30rpx 0; }
.menu-text { margin-top: 12rpx; font-size: 26rpx; color: #606266; }
</style>
