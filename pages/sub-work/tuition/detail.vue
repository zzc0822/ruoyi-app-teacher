<template>
  <view class="detail-page">
    <view v-if="loading" class="page-state">
      <text>数据加载中...</text>
    </view>

    <view v-else-if="loadError" class="page-state" @click="loadDetail">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>

    <template v-else-if="record">
      <view class="student-card">
        <view class="student-head">
          <view class="student-name-row">
            <text class="student-name">{{ record.studentName || '未命名学生' }}</text>
            <text v-if="record.followupStatus === 'cleared'" class="tag tag-good">已缴清</text>
            <text v-else class="tag" :class="severityClass(record.severity)">{{ severityLabel(record.severity) }}</text>
          </view>
          <text class="student-xh">{{ record.xh }}</text>
        </view>
        <view class="student-amount">{{ money(record.arrearsAmount) }}</view>
        <view class="student-amount-label">本期欠费</view>
        <view class="student-grid">
          <view class="student-cell">
            <text class="cell-value">{{ record.arrearsRatio === null || record.arrearsRatio === undefined ? '--' : record.arrearsRatio + '%' }}</text>
            <text class="cell-name">欠费率</text>
          </view>
          <view class="student-cell">
            <text class="cell-value">{{ record.followupCount || 0 }}</text>
            <text class="cell-name">跟进次数</text>
          </view>
          <view class="student-cell">
            <text class="cell-value">{{ money(record.paidAmount) }}</text>
            <text class="cell-name">已登记实缴</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-title">学生信息</view>
        <view class="info-row"><text class="info-label">班级</text><text class="info-value">{{ record.className || '待匹配' }}</text></view>
        <view class="info-row"><text class="info-label">年级</text><text class="info-value">{{ record.grade || '待匹配' }}</text></view>
        <view class="info-row"><text class="info-label">专业</text><text class="info-value">{{ record.majorName || '待匹配' }}</text></view>
        <view class="info-row"><text class="info-label">学院</text><text class="info-value">{{ record.collegeName || '待匹配' }}</text></view>
        <view class="info-row"><text class="info-label">辅导员</text><text class="info-value">{{ record.counselorName || '未分配' }}</text></view>
        <view class="info-row">
          <text class="info-label">联系电话</text>
          <view class="info-value phone-row">
            <text>{{ record.phone || '未登记' }}</text>
            <text v-if="record.phone" class="phone-action" @click="callPhone">呼叫</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-title">缴费与跟进</view>
        <view class="info-row"><text class="info-label">跟进状态</text><text class="info-value">{{ statusLabel(record.followupStatus) }}</text></view>
        <view class="info-row"><text class="info-label">承诺金额</text><text class="info-value">{{ money(record.promiseAmount) }}</text></view>
        <view class="info-row"><text class="info-label">承诺日期</text><text class="info-value">{{ record.promiseDate || '未承诺' }}</text></view>
        <view class="info-row"><text class="info-label">下次跟进</text><text class="info-value">{{ record.nextFollowupDate || '未安排' }}</text></view>
        <view v-if="record.clearedTime" class="info-row"><text class="info-label">缴清时间</text><text class="info-value">{{ record.clearedTime }}</text></view>
        <view v-if="record.firstContactOverdue" class="alert-row">
          <uni-icons type="info" size="14" color="#b45309"></uni-icons>
          <text>首次联系已逾期 {{ record.firstContactOverdueDays || 0 }} 天，请优先联系。</text>
        </view>
        <view v-else-if="record.firstContactDeadline" class="info-row"><text class="info-label">首联截止</text><text class="info-value">{{ record.firstContactDeadline }}</text></view>
      </view>

      <view v-if="deferralPlans.length" class="card">
        <view class="card-title">缓交计划</view>
        <view v-for="plan in deferralPlans" :key="plan.id" class="plan-block">
          <view class="plan-head">
            <text class="plan-amount">{{ money(plan.totalAmount) }} 元</text>
            <text class="plan-status" :class="'plan-' + plan.status">{{ planStatusLabel(plan.status) }}</text>
          </view>
          <text v-if="plan.reason" class="plan-reason">{{ plan.reason }}</text>
          <view v-for="item in (plan.installments || [])" :key="item.id" class="installment-row">
            <text>第{{ item.seqNo }}期 · {{ shortDate(item.dueDate) }}</text>
            <text>{{ money(item.amount) }} 元</text>
            <text class="installment-status" :class="'installment-' + item.status">{{ installmentLabel(item.status) }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-title">
          <text>催缴记录</text>
          <text class="card-count">{{ timeline.length }} 条</text>
        </view>
        <view v-if="timeline.length" class="timeline">
          <view v-for="(event, index) in timeline" :key="index" class="timeline-item">
            <view class="timeline-dot" :class="'event-' + event.type"></view>
            <view class="timeline-body">
              <view class="timeline-head">
                <text class="timeline-title">{{ event.title }}</text>
                <text class="timeline-time">{{ shortTime(event.time) }}</text>
              </view>
              <text v-if="event.content" class="timeline-content">{{ event.content }}</text>
              <view class="timeline-foot">
                <text v-if="event.operatorName">{{ event.operatorName }}</text>
                <text v-if="event.amount">{{ money(event.amount) }} 元</text>
                <text v-if="event.attachments && event.attachments.length">佐证 {{ event.attachments.length }} 份</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-tip">暂无跟进记录，请在电脑端“我的催缴”登记联系结果。</view>
      </view>

      <view class="foot-tip">移动端仅用于查看，登记跟进、缓交审批请在电脑端办理。</view>
    </template>
  </view>
</template>

<script>
import { getTuitionRecord, getTuitionTimeline } from '@/api/work/tuition'

export default {
  data() {
    return {
      loading: true,
      loadError: '',
      recordId: null,
      record: null,
      followups: [],
      deferralPlans: [],
      timeline: []
    }
  },
  onLoad(options) {
    this.recordId = options && options.id
    this.loadDetail()
  },
  onPullDownRefresh() {
    this.loadDetail().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    loadDetail() {
      if (!this.recordId) {
        this.loading = false
        this.loadError = '缺少欠费记录参数'
        return Promise.resolve()
      }
      this.loading = true
      this.loadError = ''
      return Promise.all([
        getTuitionRecord(this.recordId),
        getTuitionTimeline(this.recordId)
      ]).then(([detailRes, timelineRes]) => {
        const data = (detailRes && detailRes.data) || {}
        this.record = data.record || null
        this.followups = data.followups || []
        this.deferralPlans = data.deferralPlans || []
        this.timeline = (timelineRes && timelineRes.data) || data.timeline || []
      }).catch(error => {
        this.loadError = error && error.message ? error.message : '欠费详情加载失败'
      }).finally(() => {
        this.loading = false
      })
    },
    callPhone() {
      if (!this.record || !this.record.phone) return
      uni.makePhoneCall({ phoneNumber: String(this.record.phone) })
    },
    money(value) {
      return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    shortDate(value) {
      return value ? String(value).slice(0, 10) : '--'
    },
    shortTime(value) {
      return value ? String(value).slice(0, 16) : ''
    },
    severityLabel(severity) {
      return {
        crisis: '危急',
        severe: '严重',
        high: '较高',
        normal: '一般',
        unknown: '待补标准'
      }[severity] || '待评估'
    },
    severityClass(severity) {
      return 'tag-' + (severity || 'unknown')
    },
    statusLabel(status) {
      return {
        pending: '待跟进',
        contacted: '已联系',
        promised: '已承诺',
        partial: '部分缴费',
        cleared: '已缴清',
        noanswer: '无法联系',
        refused: '拒绝缴费'
      }[status] || '待跟进'
    },
    planStatusLabel(status) {
      return {
        draft: '草稿',
        pending: '待学院审批',
        approved: '执行中',
        rejected: '已驳回',
        cancelled: '已撤销',
        completed: '已完成'
      }[status] || '待审批'
    },
    installmentLabel(status) {
      return {
        pending: '待缴',
        todo: '到点',
        paid: '已缴',
        overdue: '逾期',
        waived: '已关闭'
      }[status] || '待缴'
    }
  }
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 60rpx;
  background: #f4f6f8;
}

.page-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 120rpx 40rpx;
  color: #7c8799;
  font-size: 26rpx;
}

.state-action {
  color: #b45309;
  font-size: 24rpx;
}

.student-card {
  padding: 30rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #123c36 0%, #1f5f54 100%);
  color: #ffffff;
  box-shadow: 0 14rpx 36rpx rgba(18, 60, 54, 0.22);
}

.student-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.student-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  min-width: 0;
}

.student-name {
  font-size: 34rpx;
  font-weight: 700;
}

.student-xh {
  color: rgba(255, 255, 255, 0.62);
  font-size: 21rpx;
}

.student-amount {
  margin-top: 18rpx;
  font-size: 52rpx;
  font-weight: 700;
}

.student-amount-label {
  color: rgba(255, 255, 255, 0.68);
  font-size: 21rpx;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 22rpx;
}

.student-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 14rpx 4rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.1);
}

.cell-value {
  font-size: 27rpx;
  font-weight: 600;
}

.cell-name {
  color: rgba(255, 255, 255, 0.68);
  font-size: 19rpx;
}

.card {
  margin-top: 20rpx;
  padding: 24rpx;
  border: 1rpx solid #e6ebf0;
  border-radius: 16rpx;
  background: #ffffff;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
  color: #172033;
  font-size: 27rpx;
  font-weight: 600;
}

.card-count {
  color: #94a3b8;
  font-size: 21rpx;
  font-weight: 400;
}

.info-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f7fa;
  font-size: 24rpx;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  flex-shrink: 0;
  color: #7c8799;
}

.info-value {
  text-align: right;
  color: #1e293b;
}

.phone-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.phone-action {
  padding: 2rpx 12rpx;
  border: 1rpx solid #c7ddd6;
  border-radius: 6rpx;
  color: #1f5f54;
  font-size: 20rpx;
}

.alert-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 10rpx;
  background: #fff7ed;
  color: #9a5b13;
  font-size: 22rpx;
}

.tag {
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-size: 19rpx;
}

.tag-crisis {
  background: #fbecea;
  color: #a93d36;
}

.tag-severe {
  background: #fff1df;
  color: #a9651a;
}

.tag-high {
  background: #fbf6df;
  color: #857017;
}

.tag-normal {
  background: #eef6f3;
  color: #2f6b5d;
}

.tag-unknown {
  background: #f1f5f9;
  color: #64748b;
}

.tag-good {
  background: #a7f3d0;
  color: #085041;
}

.plan-block {
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f5f7fa;
}

.plan-block:last-child {
  border-bottom: none;
}

.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plan-amount {
  color: #172033;
  font-size: 26rpx;
  font-weight: 600;
}

.plan-status {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 19rpx;
}

.plan-approved {
  background: #eef6f3;
  color: #2f6b5d;
}

.plan-pending {
  background: #fff7ed;
  color: #9a5b13;
}

.plan-reason {
  display: block;
  margin-top: 8rpx;
  color: #7c8799;
  font-size: 22rpx;
  line-height: 1.5;
}

.installment-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  margin-top: 10rpx;
  padding: 10rpx 14rpx;
  border-radius: 8rpx;
  background: #f8fafc;
  color: #475569;
  font-size: 21rpx;
}

.installment-status {
  flex-shrink: 0;
  color: #64748b;
}

.installment-overdue {
  color: #b04a43;
}

.installment-paid {
  color: #1f7a5c;
}

.timeline {
  position: relative;
  margin-top: 10rpx;
  padding-left: 20rpx;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 16rpx;
  padding-bottom: 26rpx;
  border-left: 1rpx solid #e2e8f0;
  padding-left: 22rpx;
}

.timeline-item:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -9rpx;
  top: 6rpx;
  width: 16rpx;
  height: 16rpx;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
  background: #94a3b8;
  box-shadow: 0 0 0 1rpx #e2e8f0;
}

.timeline-dot.event-followup {
  background: #2f7d6d;
}

.timeline-dot.event-deferral,
.timeline-dot.event-installment {
  background: #b45309;
}

.timeline-dot.event-cleared {
  background: #1f7a5c;
}

.timeline-body {
  flex: 1;
  min-width: 0;
}

.timeline-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14rpx;
}

.timeline-title {
  color: #1e293b;
  font-size: 24rpx;
  font-weight: 600;
}

.timeline-time {
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 19rpx;
}

.timeline-content {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 22rpx;
  line-height: 1.55;
}

.timeline-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 6rpx;
  color: #94a3b8;
  font-size: 19rpx;
}

.empty-tip {
  padding: 24rpx 0 8rpx;
  color: #94a3b8;
  font-size: 22rpx;
  text-align: center;
}

.foot-tip {
  margin-top: 24rpx;
  color: #94a3b8;
  font-size: 20rpx;
  text-align: center;
}
</style>
