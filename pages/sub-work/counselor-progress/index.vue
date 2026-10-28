<template>
  <view class="progress-page">
    <view v-if="loading" class="page-state">
      <text>数据加载中...</text>
    </view>

    <view v-else-if="loadError" class="page-state" @click="loadProgress">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>

    <template v-else-if="board">
      <view class="summary-card">
        <view class="summary-head">
          <view class="summary-copy">
            <text class="summary-title">{{ pageTitle }}</text>
            <text class="summary-meta">{{ pageMeta }}</text>
          </view>
          <text class="summary-week">第{{ displayCount(board.weekNo) }}周</text>
        </view>

        <view v-if="viewMode === 'college'" class="summary-grid">
          <view class="summary-item">
            <text class="summary-value">{{ displayCount(board.counselorCount) }}</text>
            <text class="summary-label">辅导员</text>
          </view>
          <view class="summary-item is-warning">
            <text class="summary-value">{{ displayCount(board.backlogCount) }}</text>
            <text class="summary-label">有积压</text>
          </view>
          <view class="summary-item is-muted">
            <text class="summary-value">{{ displayCount(board.laggingCount) }}</text>
            <text class="summary-label">无产出</text>
          </view>
          <view class="summary-item is-danger">
            <text class="summary-value">{{ displayCount(board.pendingTotal) }}</text>
            <text class="summary-label">待处理</text>
          </view>
        </view>

        <view v-else-if="minePerson" class="summary-grid">
          <view class="summary-item">
            <text class="summary-value">{{ displayCount(minePerson.weekOutput) }}</text>
            <text class="summary-label">本周产出</text>
          </view>
          <view class="summary-item is-warning">
            <text class="summary-value">{{ displayCount(minePerson.pendingTotal) }}</text>
            <text class="summary-label">待处理</text>
          </view>
          <view class="summary-item is-danger">
            <text class="summary-value">{{ displayCount(minePerson.overdueTotal) }}</text>
            <text class="summary-label">逾期/积压</text>
          </view>
          <view class="summary-item is-muted">
            <text class="summary-value">{{ displayCount(minePerson.studentCount) }}</text>
            <text class="summary-label">带班学生</text>
          </view>
        </view>
      </view>

      <view v-if="counselors.length" class="person-section">
        <view class="section-head">
          <text class="section-title">{{ viewMode === 'mine' ? '本周工作明细' : '辅导员明细' }}</text>
          <text v-if="viewMode === 'college'" class="section-count">{{ counselors.length }} 人</text>
        </view>

        <view class="person-list">
          <view
            v-for="person in counselors"
            :key="person.teacherId"
            class="person-card"
            :class="{ 'is-expanded': isExpanded(person), 'is-mine': viewMode === 'mine' }"
            @click="togglePerson(person)"
          >
            <view class="person-summary">
              <view class="person-identity">
                <view class="person-name-row">
                  <text class="person-name">{{ person.counselorName || '未命名辅导员' }}</text>
                  <text class="person-status" :class="'status-' + (person.status || 'normal')">
                    {{ person.statusLabel || '暂无状态' }}
                  </text>
                </view>
                <text class="person-sub">
                  带班 {{ displayCount(person.classCount) }} 个 · 学生 {{ displayCount(person.studentCount) }} 人 · 本周产出 {{ displayCount(person.weekOutput) }}
                </text>
              </view>
              <view class="person-numbers">
                <view class="person-number">
                  <text class="person-number-value">{{ displayCount(person.pendingTotal) }}</text>
                  <text class="person-number-label">待处理</text>
                </view>
                <view class="person-number">
                  <text class="person-number-value is-danger">{{ displayCount(person.overdueTotal) }}</text>
                  <text class="person-number-label">逾期/积压</text>
                </view>
                <uni-icons
                  v-if="viewMode === 'college'"
                  class="person-arrow"
                  :type="isExpanded(person) ? 'up' : 'down'"
                  size="16"
                  color="#94a3b8"
                ></uni-icons>
              </view>
            </view>

            <view v-if="isExpanded(person)" class="person-detail">
              <view v-if="person.statusReason" class="person-reason">{{ person.statusReason }}</view>

              <view class="detail-block">
                <text class="detail-block-title">本周工作</text>
                <view class="detail-grid">
                  <view class="detail-item">
                    <text class="detail-value">{{ displayCount(person.weekCheckCount) }}</text>
                    <text class="detail-label">查课次数</text>
                  </view>
                  <view class="detail-item">
                    <text class="detail-value">{{ formatRate(person.classCoverRate) }}</text>
                    <text class="detail-label">班级覆盖</text>
                  </view>
                  <view class="detail-item">
                    <text class="detail-value">{{ displayCount(person.talkWeekDone) }}</text>
                    <text class="detail-label">完成谈心</text>
                  </view>
                  <view class="detail-item">
                    <text class="detail-value">{{ displayCount(person.nightWeekCount) }}</text>
                    <text class="detail-label">夜查次数</text>
                  </view>
                </view>
              </view>

              <view class="detail-block">
                <text class="detail-block-title">待处理</text>
                <view class="detail-grid">
                  <view class="detail-item">
                    <text class="detail-value">{{ displayCount(person.talkPending) }}</text>
                    <text class="detail-label">谈心谈话</text>
                  </view>
                  <view class="detail-item">
                    <text class="detail-value">{{ displayCount(person.leavePending) }}</text>
                    <text class="detail-label">请假审批</text>
                  </view>
                  <view class="detail-item">
                    <text class="detail-value">{{ displayCount(person.rectifyOpen) }}</text>
                    <text class="detail-label">宿舍整改</text>
                  </view>
                  <view class="detail-item">
                    <text class="detail-value">{{ displayCount(person.todoPending) }}</text>
                    <text class="detail-label">待办事项</text>
                  </view>
                </view>
              </view>

              <view class="detail-badges">
                <text class="detail-badge">谈心超期 {{ displayCount(person.talkOverdue) }}</text>
                <text class="detail-badge">请假积压 {{ displayCount(person.leaveBacklog) }}</text>
                <text class="detail-badge">整改逾期 {{ displayCount(person.rectifyOverdue) }}</text>
                <text class="detail-badge">待办逾期 {{ displayCount(person.todoOverdue) }}</text>
              </view>

              <view class="detail-dates">
                <text>最近查课：{{ person.lastCheckDate || '暂无记录' }}</text>
                <text>最近夜查：{{ person.lastNightCheckDate || '暂无记录' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="page-state">
        <text>{{ viewMode === 'mine' ? '当前账号未绑定辅导员带班信息' : '本学院暂无辅导员带班数据' }}</text>
      </view>
    </template>
  </view>
</template>

<script>
import { getCounselorWorkProgress } from '@/api/work/counselorProgress'

export default {
  data() {
    return {
      loading: true,
      loadError: '',
      progressData: null,
      expandedTeacherId: null
    }
  },
  computed: {
    board() {
      return this.progressData && this.progressData.board
    },
    viewMode() {
      return (this.progressData && this.progressData.viewMode) || 'none'
    },
    counselors() {
      return (this.board && this.board.counselors) || []
    },
    minePerson() {
      return this.counselors.length ? this.counselors[0] : null
    },
    pageTitle() {
      return this.viewMode === 'mine' ? '我的本周工作' : '辅导员工作明细'
    },
    pageMeta() {
      if (!this.board) return ''
      if (this.viewMode === 'mine') {
        return this.minePerson
          ? `${this.minePerson.counselorName || '本人'} · 本周工作完成情况`
          : '本周工作完成情况'
      }
      return `${this.board.collegeName || '本学院'} · 本周工作进展`
    }
  },
  onLoad() {
    this.loadProgress()
  },
  onPullDownRefresh() {
    this.loadProgress().finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    loadProgress() {
      this.loading = true
      this.loadError = ''
      return getCounselorWorkProgress().then(res => {
        this.progressData = (res && res.data) || null
        if (this.viewMode === 'mine' && this.minePerson) {
          this.expandedTeacherId = this.minePerson.teacherId
        } else if (this.expandedTeacherId) {
          const exists = this.counselors.some(person => person.teacherId === this.expandedTeacherId)
          if (!exists) this.expandedTeacherId = null
        }
      }).catch(() => {
        this.progressData = null
        this.loadError = '辅导员工作明细加载失败'
      }).finally(() => {
        this.loading = false
      })
    },
    isExpanded(person) {
      return !!person && this.expandedTeacherId === person.teacherId
    },
    togglePerson(person) {
      if (!person || this.viewMode === 'mine') return
      this.expandedTeacherId = this.isExpanded(person) ? null : person.teacherId
    },
    displayCount(value) {
      return value === null || value === undefined || value === '' ? '--' : value
    },
    formatRate(value) {
      return value === null || value === undefined ? '--' : `${Number(value).toFixed(1)}%`
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background: #f5f6f7;
}

.progress-page {
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

.summary-card {
  overflow: hidden;
  border: 1rpx solid #e7edf2;
  border-radius: 16rpx;
  background: #fff;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 26rpx 24rpx;
}

.summary-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.summary-title {
  color: #0f172a;
  font-size: 32rpx;
  font-weight: 700;
}

.summary-meta {
  margin-top: 7rpx;
  color: #64748b;
  font-size: 22rpx;
  line-height: 1.5;
}

.summary-week {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 8rpx;
  background: #ecfdf5;
  color: #047857;
  font-size: 21rpx;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  padding: 18rpx 20rpx 20rpx;
  border-top: 1rpx solid #edf2f7;
  background: #f8fafc;
}

.summary-item {
  min-width: 0;
  padding: 14rpx 6rpx;
  border-radius: 10rpx;
  background: #fff;
  text-align: center;
}

.summary-value {
  display: block;
  color: #0f172a;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.2;
}

.summary-label {
  display: block;
  margin-top: 4rpx;
  color: #64748b;
  font-size: 19rpx;
  white-space: nowrap;
}

.summary-item.is-warning .summary-value {
  color: #d97706;
}

.summary-item.is-muted .summary-value {
  color: #64748b;
}

.summary-item.is-danger .summary-value {
  color: #dc2626;
}

.person-section {
  margin-top: 24rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx 16rpx;
}

.section-title {
  color: #1e293b;
  font-size: 28rpx;
  font-weight: 700;
}

.section-count {
  color: #64748b;
  font-size: 22rpx;
}

.person-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.person-card {
  overflow: hidden;
  border: 1rpx solid #e7edf2;
  border-radius: 14rpx;
  background: #fff;
  box-shadow: 0 5rpx 16rpx rgba(15, 23, 42, 0.04);
}

.person-card.is-expanded {
  border-color: #bae6fd;
}

.person-summary {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 22rpx;
}

.person-identity {
  min-width: 0;
}

.person-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.person-name {
  color: #1e293b;
  font-size: 28rpx;
  font-weight: 700;
}

.person-status {
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  background: #ecfdf5;
  color: #047857;
  font-size: 18rpx;
  font-weight: 600;
}

.person-status.status-backlog {
  background: #fef2f2;
  color: #dc2626;
}

.person-status.status-lagging {
  background: #fff7ed;
  color: #c2410c;
}

.person-sub {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 21rpx;
  line-height: 1.5;
}

.person-numbers {
  display: flex;
  align-items: center;
  gap: 38rpx;
}

.person-number {
  display: flex;
  flex-direction: column;
  min-width: 90rpx;
}

.person-number-value {
  color: #1e293b;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.2;
}

.person-number-value.is-danger {
  color: #dc2626;
}

.person-number-label {
  margin-top: 2rpx;
  color: #94a3b8;
  font-size: 19rpx;
}

.person-arrow {
  margin-left: auto;
}

.person-detail {
  padding: 22rpx;
  border-top: 1rpx solid #edf2f7;
  background: #fbfdff;
}

.person-reason {
  margin-bottom: 18rpx;
  padding: 12rpx 14rpx;
  border-radius: 8rpx;
  background: #fff7ed;
  color: #b45309;
  font-size: 21rpx;
  line-height: 1.5;
}

.detail-block + .detail-block {
  margin-top: 20rpx;
}

.detail-block-title {
  display: block;
  margin-bottom: 12rpx;
  color: #475569;
  font-size: 22rpx;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10rpx;
}

.detail-item {
  min-width: 0;
  padding: 12rpx 6rpx;
  border: 1rpx solid #edf2f7;
  border-radius: 8rpx;
  background: #fff;
  text-align: center;
}

.detail-value {
  display: block;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.2;
}

.detail-label {
  display: block;
  margin-top: 4rpx;
  color: #94a3b8;
  font-size: 18rpx;
  white-space: nowrap;
}

.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 18rpx;
}

.detail-badge {
  padding: 6rpx 10rpx;
  border-radius: 6rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 19rpx;
}

.detail-dates {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-top: 16rpx;
  color: #94a3b8;
  font-size: 19rpx;
}
</style>
