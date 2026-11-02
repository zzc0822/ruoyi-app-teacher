<template>
  <view class="records-page">
    <view v-if="loading" class="page-state">
      <text>数据加载中...</text>
    </view>

    <view v-else-if="loadError" class="page-state" @click="loadRecords">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>

    <template v-else>
      <view class="records-head">
        <view class="records-head-copy">
          <text class="records-title">{{ pageTitle }}</text>
          <text class="records-meta">{{ headMeta }}</text>
        </view>
        <text v-if="count !== null && count !== undefined" class="records-count">{{ displayCount(count) }} 条</text>
      </view>

      <view v-if="note" class="records-note">
        <uni-icons type="info" size="14" color="#b45309"></uni-icons>
        <text>{{ note }}</text>
      </view>

      <view v-if="records.length" class="record-list">
        <view
          v-for="(record, index) in records"
          :key="record.recordType + '-' + record.recordId + '-' + index"
          class="record-card"
          :class="{ 'is-clickable': canOpen(record) }"
          @click="openRecord(record)"
        >
          <view class="record-main">
            <view class="record-title-row">
              <text class="record-title">{{ record.title || '未命名记录' }}</text>
              <text
                v-if="record.statusText"
                class="record-status"
                :class="'tone-' + (record.statusTone || 'normal')"
              >{{ record.statusText }}</text>
            </view>
            <text v-if="record.subtitle" class="record-sub">{{ record.subtitle }}</text>
            <view class="record-foot">
              <text v-if="record.timeText">{{ record.timeText }}</text>
              <text v-if="record.extra" class="record-extra">{{ record.extra }}</text>
            </view>
          </view>
          <uni-icons v-if="canOpen(record)" type="right" size="16" color="#94a3b8"></uni-icons>
        </view>
      </view>

      <view v-else class="page-state">
        <text>当前统计项暂无记录</text>
      </view>

      <view v-if="records.length >= 100" class="records-tip">
        <text>仅展示最近 100 条记录</text>
      </view>
    </template>
  </view>
</template>

<script>
import { getCounselorWorkRecords } from '@/api/work/counselorProgress'

export default {
  data() {
    return {
      loading: true,
      loadError: '',
      teacherId: null,
      metric: '',
      title: '',
      metricLabel: '',
      counselorName: '',
      count: null,
      note: '',
      records: []
    }
  },
  computed: {
    pageTitle() {
      return this.title || this.metricLabel || '工作记录'
    },
    headMeta() {
      const parts = []
      if (this.counselorName) parts.push(this.counselorName)
      if (this.metricLabel && this.metricLabel !== this.pageTitle) parts.push(this.metricLabel)
      return parts.length ? parts.join(' · ') : '本周工作记录'
    }
  },
  onLoad(options) {
    this.teacherId = options && options.teacherId
    this.metric = (options && options.metric) || ''
    this.title = options && options.title ? decodeURIComponent(options.title) : ''
    this.loadRecords()
  },
  onPullDownRefresh() {
    this.loadRecords().finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    displayCount(value) {
      return value === null || value === undefined || value === '' ? '--' : value
    },
    loadRecords() {
      if (!this.teacherId || !this.metric) {
        this.loading = false
        this.loadError = '缺少辅导员或统计项参数'
        return Promise.resolve()
      }
      this.loading = true
      this.loadError = ''
      return getCounselorWorkRecords({ teacherId: this.teacherId, metric: this.metric }).then(res => {
        const data = (res && res.data) || {}
        this.records = data.records || []
        this.count = data.count
        this.metricLabel = data.metricLabel || ''
        this.counselorName = data.counselorName || ''
        this.note = data.note || ''
      }).catch(() => {
        this.records = []
        this.loadError = '工作记录加载失败'
      }).finally(() => {
        this.loading = false
      })
    },
    canOpen(record) {
      if (!record || !record.recordId) return false
      if (record.recordType === 'check') return record.statusText === '待确认'
      return ['talk', 'leave', 'rectify', 'night'].includes(record.recordType)
    },
    openRecord(record) {
      if (!this.canOpen(record)) return
      let url = ''
      switch (record.recordType) {
        case 'talk':
          url = '/pages/sub-work/talk/add?id=' + record.recordId
          break
        case 'leave':
          url = '/pages/sub-work/leave/detail?id=' + record.recordId
          break
        case 'rectify':
          url = '/pages/sub-work/dormcheck/rectifyDetail?rectifyId=' + record.recordId
          break
        case 'night':
          url = '/pages/sub-work/dormcheck/detail?id=' + record.recordId
          break
        case 'check':
          url = '/pages/sub-work/classcheck/confirm?id=' + record.recordId
          break
        default:
          return
      }
      uni.navigateTo({ url })
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background: #f5f6f7;
}

.records-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}

.page-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  margin-top: 24rpx;
  padding: 64rpx 28rpx;
  border: 1rpx solid #e7edf2;
  border-radius: 16rpx;
  background: #fff;
  color: #94a3b8;
  font-size: 24rpx;
  text-align: center;
}

.state-action {
  color: #2563eb;
}

.records-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 26rpx 24rpx;
  border: 1rpx solid #e7edf2;
  border-radius: 16rpx 16rpx 0 0;
  background: #fff;
}

.records-head-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.records-title {
  color: #0f172a;
  font-size: 32rpx;
  font-weight: 700;
}

.records-meta {
  margin-top: 7rpx;
  color: #64748b;
  font-size: 22rpx;
  line-height: 1.5;
}

.records-count {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 8rpx;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 21rpx;
  font-weight: 600;
}

.records-note {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding: 14rpx 16rpx;
  border-radius: 10rpx;
  background: #fffbeb;
  color: #b45309;
  font-size: 21rpx;
  line-height: 1.5;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 18rpx;
}

.record-card {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 22rpx;
  border: 1rpx solid #e7edf2;
  border-radius: 14rpx;
  background: #fff;
  box-shadow: 0 5rpx 16rpx rgba(15, 23, 42, 0.04);
}

.record-card.is-clickable:active {
  background: #f8fbff;
  border-color: #bfdbfe;
}

.record-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.record-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.record-title {
  flex: 1;
  min-width: 0;
  color: #1e293b;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-all;
}

.record-status {
  flex-shrink: 0;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  font-size: 18rpx;
  font-weight: 600;
}

.record-status.tone-normal {
  background: #ecfdf5;
  color: #047857;
}

.record-status.tone-warning {
  background: #fff7ed;
  color: #c2410c;
}

.record-status.tone-danger {
  background: #fef2f2;
  color: #dc2626;
}

.record-sub {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 22rpx;
  line-height: 1.5;
  word-break: break-all;
}

.record-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 16rpx;
  margin-top: 12rpx;
  color: #94a3b8;
  font-size: 20rpx;
}

.record-extra {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.records-tip {
  padding: 24rpx 0 8rpx;
  color: #94a3b8;
  font-size: 20rpx;
  text-align: center;
}
</style>
