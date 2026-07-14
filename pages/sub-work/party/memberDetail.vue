<template>
  <view class="container" v-if="member">
    <!-- 基本信息卡片 -->
    <view class="info-card">
      <view class="card-header">
        <text class="name">{{ member.studentName || member.xh }}</text>
        <text class="stage-tag" :class="'stage-' + member.currentStage">{{ stageLabel(member.currentStage) }}</text>
      </view>
      <view class="info-grid">
        <view class="info-item"><text class="label">学号</text><text class="val">{{ member.xh }}</text></view>
        <view class="info-item"><text class="label">档案号</text><text class="val">{{ member.archiveNo || '—' }}</text></view>
        <view class="info-item"><text class="label">所属支部</text><text class="val">{{ member.branchName || '—' }}</text></view>
        <view class="info-item"><text class="label">申请日期</text><text class="val">{{ formatDate(member.applyDate) }}</text></view>
      </view>
    </view>

    <!-- 发展阶段时间线 -->
    <view class="section-card">
      <text class="section-title">发展阶段</text>
      <view class="timeline">
        <view class="timeline-item" v-for="(item, idx) in timelineData" :key="idx" :class="{ active: item.reached }">
          <view class="dot"></view>
          <view class="tl-content">
            <text class="tl-label">{{ item.label }}</text>
            <text class="tl-date">{{ item.date ? formatDate(item.date) : (item.reached ? '请补充' : '未到达') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 入党介绍人 -->
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

    <!-- 思想汇报 -->
    <view class="section-card">
      <text class="section-title">思想汇报 ({{ thoughtReports.length }})</text>
      <view v-if="thoughtReports.length === 0" class="no-data">暂无记录</view>
      <view v-for="item in thoughtReports" :key="item.reportId" class="report-item">
        <text class="report-title">{{ item.title }}</text>
        <view class="report-meta">
          <text class="meta">{{ item.reportType }} · {{ formatDate(item.reportDate) }}</text>
          <text class="status-tag" :class="'status-' + item.reviewStatus">
            {{ ['待审','通过','需改','退回'][item.reviewStatus] }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party/party'

const stageMap = { APPLICANT: '入党申请人', ACTIVIST: '积极分子', TARGET: '发展对象', PROBATIONARY: '预备党员', FORMAL: '正式党员' }

export default {
  data() {
    return {
      member: null,
      thoughtReports: [],
      timelineData: []
    }
  },
  onLoad(options) {
    this.loadDetail(options.id)
  },
  methods: {
    stageLabel(code) { return stageMap[code] || code },
    formatDate(d) { return d ? d.substring(0, 10) : '' },
    loadDetail(memberId) {
      uni.showLoading({ title: '加载中...' })
      partyApi.memberDetail(memberId).then(res => {
        uni.hideLoading()
        const data = res.data || {}
        // 后端直接返回 PartyMember 对象，也可能包装在 { member, thoughtReports } 中
        if (data.member) {
          this.member = data.member
          this.thoughtReports = data.thoughtReports || []
        } else if (data.currentStage) {
          this.member = data
          this.thoughtReports = []
        } else {
          this.member = null
          this.thoughtReports = []
        }
        const m = this.member || {}
        const stageOrder = ['APPLICANT', 'ACTIVIST', 'TARGET', 'PROBATIONARY', 'FORMAL']
        const currentIdx = stageOrder.indexOf(m.currentStage)
        this.timelineData = [
          { label: '递交申请', date: m.applyDate, reached: currentIdx >= 0 },
          { label: '确定为积极分子', date: m.activistDate, reached: currentIdx >= 1 },
          { label: '确定为发展对象', date: m.targetDate, reached: currentIdx >= 2 },
          { label: '接收为预备党员', date: m.probationDate, reached: currentIdx >= 3 },
          { label: '转为正式党员', date: m.formalDate, reached: currentIdx >= 4 }
        ]
      }).catch(() => { uni.hideLoading() })
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.info-card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.name { font-size: 36rpx; font-weight: bold; color: #303133; }
.stage-tag { padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; color: #fff; }
.stage-APPLICANT { background: #909399; }
.stage-ACTIVIST { background: #409EFF; }
.stage-TARGET { background: #E6A23C; }
.stage-PROBATIONARY { background: #F56C6C; }
.stage-FORMAL { background: #67C23A; }

.info-grid { display: flex; flex-wrap: wrap; }
.info-item { width: 50%; padding: 10rpx 0; }
.label { font-size: 24rpx; color: #909399; display: block; }
.val { font-size: 28rpx; color: #303133; }

.section-card { background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.section-title { font-size: 30rpx; font-weight: bold; color: #303133; margin-bottom: 20rpx; display: block; }
.no-data { text-align: center; color: #c0c4cc; font-size: 26rpx; padding: 20rpx 0; }

.timeline { padding-left: 10rpx; }
.timeline-item { display: flex; padding: 16rpx 0; position: relative; }
.timeline-item::before { content: ''; position: absolute; left: 8rpx; top: 40rpx; bottom: -16rpx; width: 2rpx; background: #e4e7ed; }
.timeline-item:last-child::before { display: none; }
.dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: #e4e7ed; margin-right: 20rpx; margin-top: 6rpx; flex-shrink: 0; z-index: 1; }
.timeline-item.active .dot { background: #409EFF; }
.tl-content { flex: 1; }
.tl-label { font-size: 28rpx; color: #303133; display: block; }
.tl-date { font-size: 24rpx; color: #909399; margin-top: 4rpx; display: block; }

.person-row { display: flex; align-items: center; padding: 12rpx 0; }
.person-name { margin-left: 12rpx; font-size: 28rpx; color: #303133; flex: 1; }
.person-role { font-size: 24rpx; color: #409EFF; background: #ecf5ff; padding: 4rpx 16rpx; border-radius: 12rpx; }

.report-item { padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.report-item:last-child { border-bottom: none; }
.report-title { font-size: 28rpx; color: #303133; display: block; margin-bottom: 8rpx; }
.report-meta { display: flex; justify-content: space-between; align-items: center; }
.meta { font-size: 24rpx; color: #909399; }
.status-tag { padding: 2rpx 12rpx; border-radius: 10rpx; font-size: 22rpx; color: #fff; }
.status-0 { background: #E6A23C; }
.status-1 { background: #67C23A; }
.status-2 { background: #F56C6C; }
.status-3 { background: #909399; }
</style>
