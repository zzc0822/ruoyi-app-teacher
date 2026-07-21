<template>
  <view class="container">
    <view v-if="!record" class="loading">加载中...</view>
    <view v-else>
      <view class="title">答题详情</view>
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">模式</text>
          <text class="info-value">{{ record.mode === 'competition' ? '竞赛' : '训练' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">正确率</text>
          <text class="info-value highlight">{{ record.accuracyRate || 0 }}%</text>
        </view>
        <view class="info-row">
          <text class="info-label">正确人数</text>
          <text class="info-value">{{ record.correctCount || 0 }}/{{ record.totalStudents }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">用时</text>
          <text class="info-value">{{ formatTime(record.timeSpent) }}</text>
        </view>
        <view v-if="record.mode === 'competition'" class="info-row">
          <text class="info-label">最终得分</text>
          <text class="info-value highlight">{{ record.finalScore }}</text>
        </view>
      </view>

      <view class="detail-list">
        <view class="detail-title">答题明细</view>
        <view v-for="(d, idx) in details" :key="idx" class="detail-item">
          <view class="detail-header">
            <image v-if="d.studentPhoto" :src="getPhotoUrl(d.studentPhoto)" mode="aspectFill" class="mini-photo" />
            <view v-else class="mini-photo no-photo-sm">无</view>
            <view class="detail-info">
              <text class="stu-name">{{ d.studentName }}</text>
              <text :class="['detail-status', d.isCorrect === '1' ? 'correct' : 'wrong']">
                {{ d.isCorrect === '1' ? '✓' : '✗' }} {{ d.correctFields }}/5
              </text>
            </view>
          </view>
          <view class="compare-fields">
            <view class="cf-row">
              <text class="cf-label">班级</text>
              <text :class="['cf-ans', eq(d.correctClassName, d.answerClass) ? 'right' : 'wrong']">{{ d.answerClass || '未答' }}</text>
              <text v-if="!eq(d.correctClassName, d.answerClass)" class="cf-correct">→ {{ d.correctClassName }}</text>
            </view>
            <view class="cf-row">
              <text class="cf-label">姓名</text>
              <text :class="['cf-ans', eq(d.studentName, d.answerName) ? 'right' : 'wrong']">{{ d.answerName || '未答' }}</text>
              <text v-if="!eq(d.studentName, d.answerName)" class="cf-correct">→ {{ d.studentName }}</text>
            </view>
            <view class="cf-row">
              <text class="cf-label">籍贯</text>
              <text :class="['cf-ans', eq(d.correctHometown, d.answerHometown) ? 'right' : 'wrong']">{{ d.answerHometown || '未答' }}</text>
              <text v-if="!eq(d.correctHometown, d.answerHometown)" class="cf-correct">→ {{ d.correctHometown }}</text>
            </view>
            <view class="cf-row">
              <text class="cf-label">宿舍</text>
              <text :class="['cf-ans', eq(d.correctDorm, d.answerDorm) ? 'right' : 'wrong']">{{ d.answerDorm || '未答' }}</text>
              <text v-if="!eq(d.correctDorm, d.answerDorm)" class="cf-correct">→ {{ d.correctDorm }}</text>
            </view>
            <view class="cf-row">
              <text class="cf-label">干部</text>
              <text :class="['cf-ans', eq(d.correctCadre, d.answerCadre) ? 'right' : 'wrong']">{{ d.answerCadre || '未答' }}</text>
              <text v-if="!eq(d.correctCadre, d.answerCadre)" class="cf-correct">→ {{ d.correctCadre || '无' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getDetail } from '@/api/counselor/classAwareness'
import config from '@/config'
export default {
  name: 'ClassAwarenessDetail',
  data() { return { record: null, details: [] } },
  onLoad(options) {
    if (options.awarenessId) this.loadDetail(options.awarenessId)
  },
  methods: {
    async loadDetail(id) {
      try {
        const res = await getDetail(id)
        if (res.code === 200) {
          this.record = res.data
          this.details = res.data.details || []
        }
      } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
    },
    getPhotoUrl(path) {
      if (!path) return ''
      if (path.startsWith('http')) return path
      return config.baseUrl + path
    },
    formatTime(s) {
      if (!s) return '00:00'
      const m = Math.floor(s / 60), sec = s % 60
      return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec)
    },
    eq(a, b) { return (a || '').trim() === (b || '').trim() }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f5f5; min-height: 100vh; }
.loading { text-align: center; padding: 60rpx; color: #999; }
.title { font-size: 36rpx; font-weight: bold; text-align: center; margin: 20rpx 0 30rpx; }
.info-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 30rpx; }
.info-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.info-row:last-child { border-bottom: none; }
.info-label { color: #666; font-size: 28rpx; }
.info-value { font-weight: bold; font-size: 28rpx; }
.highlight { color: #409eff; }
.detail-list { margin-bottom: 40rpx; }
.detail-title { font-size: 30rpx; font-weight: bold; margin-bottom: 20rpx; }
.detail-item { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.detail-header { display: flex; align-items: center; margin-bottom: 16rpx; }
.mini-photo { width: 80rpx; height: 80rpx; border-radius: 8rpx; margin-right: 16rpx; background: #eee; }
.no-photo-sm { display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 22rpx; }
.detail-info { flex: 1; display: flex; justify-content: space-between; align-items: center; }
.stu-name { font-weight: bold; font-size: 28rpx; }
.detail-status { font-size: 24rpx; }
.correct { color: #67c23a; }
.wrong { color: #e6302e; }
.compare-fields { padding-left: 96rpx; }
.cf-row { display: flex; align-items: center; padding: 4rpx 0; font-size: 24rpx; }
.cf-label { width: 80rpx; color: #999; }
.cf-ans { margin-right: 12rpx; }
.cf-ans.right { color: #67c23a; }
.cf-ans.wrong { color: #e6302e; text-decoration: line-through; }
.cf-correct { color: #67c23a; }
</style>
