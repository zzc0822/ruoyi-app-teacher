<template>
  <view class="container">
    <!-- 进度条 -->
    <view class="progress-section">
      <view class="progress-title">发展阶段进度</view>
      <view class="steps">
        <view v-for="(item, idx) in stages" :key="idx" class="step-item" :class="{ active: idx <= currentIdx }">
          <view class="step-dot"></view>
          <view class="step-line" v-if="idx < stages.length - 1"></view>
          <view class="step-info">
            <text class="step-name">{{ item.label }}</text>
            <text class="step-desc" v-if="item.date">{{ item.date }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 前置条件 -->
    <view class="conditions-section" v-if="conditions && conditions.length > 0">
      <view class="section-title">晋升至下一阶段条件</view>
      <view v-for="(c, idx) in conditions" :key="idx" class="condition-item">
        <u-icon :name="c.met ? 'checkmark-circle-fill' : 'close-circle-fill'"
          :color="c.met ? '#67C23A' : '#F56C6C'" size="36"></u-icon>
        <text class="condition-text">{{ c.name }}：{{ c.met ? '已满足' : (c.reason || '未满足') }}</text>
      </view>
    </view>

    <!-- 统计 -->
    <view class="stats-section">
      <view class="stat-item">
        <text class="stat-num">{{ thoughtReportCount }}</text>
        <text class="stat-label">已通过思想汇报</text>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party'

const stageMap = [
  { key: 'APPLICANT', label: '入党申请人' },
  { key: 'ACTIVIST', label: '积极分子' },
  { key: 'TARGET', label: '发展对象' },
  { key: 'PROBATIONARY', label: '预备党员' },
  { key: 'FORMAL', label: '正式党员' }
]

export default {
  data() {
    return {
      stages: [],
      currentIdx: -1,
      conditions: [],
      thoughtReportCount: 0
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    loadData() {
      uni.showLoading({ title: '加载中...' })
      partyApi.progress().then(res => {
        uni.hideLoading()
        if (!res.data || !res.data.hasPartyRecord) return
        const currentStage = res.data.currentStage
        this.conditions = res.data.conditions || []
        this.thoughtReportCount = res.data.thoughtReportCount || 0
        this.currentIdx = stageMap.findIndex(s => s.key === currentStage)
        this.stages = stageMap.map((s, i) => ({
          ...s,
          date: i <= this.currentIdx ? '' : ''
        }))
      }).catch(() => { uni.hideLoading() })
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; }
.progress-section, .conditions-section, .stats-section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.progress-title, .section-title { font-size: 30rpx; font-weight: bold; color: #303133; margin-bottom: 30rpx; }
.steps { padding-left: 20rpx; }
.step-item { display: flex; position: relative; padding-bottom: 40rpx; }
.step-dot { width: 24rpx; height: 24rpx; border-radius: 50%; background: #DCDFE6; margin-right: 20rpx; flex-shrink: 0; margin-top: 6rpx; z-index: 1; }
.step-item.active .step-dot { background: #409EFF; }
.step-line { position: absolute; left: 11rpx; top: 30rpx; width: 2rpx; height: calc(100% - 10rpx); background: #DCDFE6; }
.step-item.active .step-line { background: #409EFF; }
.step-info { flex: 1; }
.step-name { font-size: 28rpx; color: #303133; }
.step-desc { font-size: 24rpx; color: #909399; margin-left: 16rpx; }
.condition-item { display: flex; align-items: center; padding: 12rpx 0; }
.condition-text { margin-left: 12rpx; font-size: 26rpx; color: #606266; }
.stats-section { display: flex; justify-content: center; }
.stat-item { text-align: center; }
.stat-num { display: block; font-size: 48rpx; font-weight: bold; color: #409EFF; }
.stat-label { font-size: 24rpx; color: #909399; }
</style>
