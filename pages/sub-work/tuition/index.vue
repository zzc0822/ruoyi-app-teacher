<template>
  <view class="tuition-page">
    <view v-if="initialLoading" class="page-state">
      <text>数据加载中...</text>
    </view>

    <view v-else-if="loadError" class="page-state" @click="reload">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-kicker">
          <text>{{ scopeTitle }}</text>
          <text class="hero-batch">{{ batchLabel }}</text>
        </view>
        <view class="hero-amount">
          <text class="hero-num">{{ wan(overview.totalAmount) }}</text>
          <text class="hero-unit">元</text>
        </view>
        <view class="hero-sub">
          <text>{{ overview.studentCount || 0 }} 人欠费</text>
          <text v-if="movementText" class="hero-move" :class="movementTone">{{ movementText }}</text>
        </view>
        <view class="hero-grid">
          <view class="hero-cell" @click="selectFilter('crisis')">
            <text class="cell-num is-danger">{{ overview.crisisCount || 0 }}</text>
            <text class="cell-label">危急</text>
          </view>
          <view class="hero-cell" @click="selectFilter('pending')">
            <text class="cell-num">{{ overview.pendingCount || 0 }}</text>
            <text class="cell-label">待跟进</text>
          </view>
          <view class="hero-cell" @click="selectFilter('firstOverdue')">
            <text class="cell-num is-warn">{{ overview.firstContactOverdueCount || 0 }}</text>
            <text class="cell-label">首联逾期</text>
          </view>
          <view class="hero-cell" @click="selectFilter('cleared')">
            <text class="cell-num is-good">{{ overview.clearedCount || 0 }}</text>
            <text class="cell-label">已缴清</text>
          </view>
        </view>
        <view class="hero-foot">
          <text>联系覆盖 {{ percent(overview.touchedCount, overview.studentCount) }}</text>
          <text>分段缴 {{ overview.segmentedCount || 0 }} 人</text>
          <text>欠费率 {{ overview.arrearsRatio === null || overview.arrearsRatio === undefined ? '待补标准' : overview.arrearsRatio + '%' }}</text>
        </view>
      </view>

      <view v-if="isCollegeView" class="view-tabs">
        <view class="view-tab" :class="{ active: viewMode === 'records' }" @click="switchView('records')">学生名单</view>
        <view class="view-tab" :class="{ active: viewMode === 'progress' }" @click="switchView('progress')">辅导员推进</view>
      </view>

      <template v-if="viewMode === 'records'">
        <view class="filter-wrap">
          <view class="search-bar">
            <uni-icons type="search" size="16" color="#94a3b8"></uni-icons>
            <input
              v-model="keyword"
              class="search-input"
              type="text"
              confirm-type="search"
              placeholder="搜索姓名 / 学号 / 班级"
              @confirm="applyFilters"
            />
            <text v-if="keyword" class="search-clear" @click="clearKeyword">清除</text>
          </view>
          <view class="filter-chips">
            <view
              v-for="item in filters"
              :key="item.value"
              class="filter-chip"
              :class="{ active: filter === item.value }"
              @click="selectFilter(item.value)"
            >{{ item.label }}</view>
          </view>
          <view v-if="activeCounselorName" class="focus-bar">
            <text>仅看 {{ activeCounselorName }}</text>
            <text class="focus-clear" @click="clearCounselor">清除</text>
          </view>
        </view>

        <view v-if="records.length" class="record-list">
          <view
            v-for="record in records"
            :key="record.id"
            class="record-card"
            hover-class="record-card--pressed"
            @click="openDetail(record)"
          >
            <view class="record-top">
              <view class="record-name-row">
                <text class="record-name">{{ record.studentName || '未命名学生' }}</text>
                <text v-if="record.paymentState === 'cleared'" class="tag tag-good">已缴清</text>
                <text v-else class="tag" :class="severityClass(record.severity)">{{ severityLabel(record.severity) }}</text>
              </view>
              <text class="record-amount">{{ money(record.arrearsAmount) }}</text>
            </view>
            <view class="record-sub">
              <text>{{ record.className || '班级待匹配' }}</text>
              <text class="dot">·</text>
              <text>{{ record.grade || '年级待匹配' }}</text>
              <text v-if="isCollegeView" class="dot">·</text>
              <text v-if="isCollegeView">{{ record.counselorName || '辅导员未分配' }}</text>
            </view>
            <view class="record-meta">
              <text>欠费率 {{ record.arrearsRatio === null || record.arrearsRatio === undefined ? '待补标准' : record.arrearsRatio + '%' }}</text>
              <text>{{ statusLabel(record.followupStatus) }}</text>
              <text v-if="record.firstContactOverdue" class="is-warn">首联逾期 {{ record.firstContactOverdueDays || 0 }} 天</text>
              <text v-else-if="record.nextFollowupDate" class="is-muted">下次 {{ shortDate(record.nextFollowupDate) }}</text>
            </view>
          </view>
        </view>

        <view v-else class="page-state is-inline">
          <text>当前筛选条件下没有欠费学生</text>
        </view>

        <view v-if="records.length" class="load-more" @click="loadMore">
          <text v-if="loadingMore">加载中...</text>
          <text v-else-if="hasMore">加载更多</text>
          <text v-else>已显示全部 {{ total }} 人</text>
        </view>
      </template>

      <view v-else class="counselor-list">
        <view
          v-for="(row, index) in counselors"
          :key="index"
          class="counselor-card"
          hover-class="record-card--pressed"
          @click="openCounselor(row)"
        >
          <view class="counselor-head">
            <view class="counselor-name-row">
              <text class="counselor-name">{{ row.counselor_name || '未分配' }}</text>
              <text class="counselor-sub">{{ row.followup_count || 0 }} 人 · {{ row.class_count || 0 }} 个班</text>
            </view>
            <text class="counselor-amount">{{ money(row.arrears_amount) }}</text>
          </view>
          <view class="counselor-track">
            <view class="counselor-track-fill" :style="{ width: percent(row.touched_count, row.followup_count) }"></view>
          </view>
          <view class="counselor-meta">
            <text>已联系 {{ row.touched_count || 0 }}/{{ row.followup_count || 0 }}（{{ percent(row.touched_count, row.followup_count) }}）</text>
            <text class="is-warn">首联逾期 {{ row.first_contact_overdue_count || 0 }}</text>
            <text>缴清 {{ row.cleared_count || 0 }}</text>
          </view>
        </view>
        <view v-if="!counselors.length" class="page-state is-inline">
          <text>本学院暂无辅导员欠费数据</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { roleMixin } from '@/utils/roleSystem'
import {
  getTuitionBatches,
  getTuitionOverview,
  listTuitionCounselors,
  listTuitionRecords
} from '@/api/work/tuition'

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'crisis', label: '危急' },
  { value: 'pending', label: '待跟进' },
  { value: 'firstOverdue', label: '首联逾期' },
  { value: 'cleared', label: '已缴清' },
  { value: 'segmented', label: '分段缴' }
]

export default {
  mixins: [roleMixin],
  data() {
    return {
      initialLoading: true,
      loadError: '',
      batchId: null,
      batchLabel: '当期欠费表',
      collegeName: '',
      overview: {},
      movement: null,
      viewMode: 'records',
      keyword: '',
      filter: 'all',
      filters: FILTERS,
      records: [],
      total: 0,
      pageNum: 1,
      pageSize: 20,
      loadingMore: false,
      hasMore: false,
      counselors: [],
      activeCounselorId: null,
      activeCounselorName: ''
    }
  },
  computed: {
    isCollegeView() {
      return this.isSecretaryRole || this.isTopSecretaryRole
    },
    scopeTitle() {
      if (this.isCollegeView) {
        return this.collegeName || '本学院欠费'
      }
      return '我的催缴'
    },
    movementText() {
      if (!this.movement || !this.movement.currentAmount) return ''
      const diff = Number(this.movement.currentAmount || 0) - Number(this.movement.previousAmount || 0)
      if (Math.abs(diff) < 1) return '较上期基本持平'
      return '较上期' + (diff < 0 ? '减少 ' : '增加 ') + this.wan(Math.abs(diff)) + ' 元'
    },
    movementTone() {
      if (!this.movement) return ''
      const diff = Number(this.movement.currentAmount || 0) - Number(this.movement.previousAmount || 0)
      return diff < -1 ? 'is-good' : (diff > 1 ? 'is-bad' : '')
    }
  },
  onLoad() {
    this.reload()
  },
  onPullDownRefresh() {
    this.reload().finally(() => uni.stopPullDownRefresh())
  },
  onReachBottom() {
    if (this.viewMode === 'records') this.loadMore()
  },
  methods: {
    reload() {
      this.initialLoading = true
      this.loadError = ''
      return this.loadBatches()
        .then(() => Promise.all([this.loadOverview(), this.loadRecords(true)]))
        .catch(error => {
          this.loadError = error && error.message ? error.message : '欠费数据加载失败'
        })
        .finally(() => {
          this.initialLoading = false
        })
    },
    loadBatches() {
      return getTuitionBatches().then(res => {
        const list = (res && res.data) || []
        if (!list.length) {
          this.batchId = null
          this.batchLabel = '尚未导入欠费表'
          return
        }
        const active = list.filter(item => String(item.status) === '0')
        const pool = active.length ? active : list
        const current = pool.slice().sort((a, b) => String(b.asOfDate).localeCompare(String(a.asOfDate)))[0]
        this.batchId = current.id
        this.batchLabel = current.batchName || current.asOfDate
      })
    },
    loadOverview() {
      return getTuitionOverview({ batchId: this.batchId }).then(res => {
        const data = (res && res.data) || {}
        this.overview = data.overview || {}
        this.movement = data.movement || null
        const colleges = data.colleges || []
        this.collegeName = colleges.length === 1 ? (colleges[0].college_name || '') : ''
      })
    },
    buildQuery(pageNum) {
      const query = {
        pageNum: pageNum,
        pageSize: this.pageSize,
        batchId: this.batchId
      }
      if (this.keyword) query.keyword = this.keyword.trim()
      if (this.activeCounselorId) query.counselorTeacherId = this.activeCounselorId
      if (this.filter === 'crisis') query.severity = 'crisis'
      if (this.filter === 'pending') query.followupStatus = 'pending'
      if (this.filter === 'firstOverdue') query.firstContactState = 'overdue'
      if (this.filter === 'cleared') query.paymentState = 'cleared'
      if (this.filter === 'segmented') query.paymentState = 'segmented'
      return query
    },
    loadRecords(reset) {
      const page = reset ? 1 : this.pageNum + 1
      this.loadingMore = !reset
      return listTuitionRecords(this.buildQuery(page)).then(res => {
        const rows = (res && res.rows) || []
        this.records = reset ? rows : this.records.concat(rows)
        this.total = Number((res && res.total) || 0)
        this.pageNum = page
        this.hasMore = this.records.length < this.total
      }).finally(() => {
        this.loadingMore = false
      })
    },
    loadCounselors() {
      return listTuitionCounselors({ batchId: this.batchId }).then(res => {
        this.counselors = (res && res.data) || []
      })
    },
    loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadRecords(false)
    },
    switchView(mode) {
      if (this.viewMode === mode) return
      this.viewMode = mode
      if (mode === 'progress' && !this.counselors.length) {
        this.loadCounselors()
      }
    },
    selectFilter(value) {
      this.filter = value
      this.applyFilters()
    },
    applyFilters() {
      this.loadRecords(true)
    },
    clearKeyword() {
      this.keyword = ''
      this.loadRecords(true)
    },
    openCounselor(row) {
      if (!row || !row.counselor_teacher_id) {
        uni.showToast({ title: '该组学生尚未分配辅导员', icon: 'none' })
        return
      }
      this.activeCounselorId = row.counselor_teacher_id
      this.activeCounselorName = row.counselor_name || '该辅导员'
      this.viewMode = 'records'
      this.filter = 'all'
      this.loadRecords(true)
    },
    clearCounselor() {
      this.activeCounselorId = null
      this.activeCounselorName = ''
      this.loadRecords(true)
    },
    openDetail(record) {
      uni.navigateTo({
        url: '/pages/sub-work/tuition/detail?id=' + record.id
      })
    },
    money(value) {
      const num = Number(value || 0)
      return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    wan(value) {
      const num = Number(value || 0)
      if (num >= 10000) return (num / 10000).toFixed(2) + ' 万'
      return num.toFixed(2)
    },
    percent(part, total) {
      const base = Number(total || 0)
      if (!base) return '0%'
      return Math.round((Number(part || 0) / base) * 100) + '%'
    },
    shortDate(value) {
      return value ? String(value).slice(5, 10) : ''
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
    }
  }
}
</script>

<style lang="scss" scoped>
.tuition-page {
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

.page-state.is-inline {
  padding: 80rpx 40rpx;
}

.state-action {
  color: #b45309;
  font-size: 24rpx;
}

.hero-card {
  padding: 30rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #123c36 0%, #1f5f54 100%);
  color: #ffffff;
  box-shadow: 0 14rpx 36rpx rgba(18, 60, 54, 0.22);
}

.hero-kicker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  color: rgba(255, 255, 255, 0.78);
  font-size: 22rpx;
}

.hero-batch {
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-amount {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 16rpx;
}

.hero-num {
  font-size: 58rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.hero-unit {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.hero-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.82);
}

.hero-move.is-good {
  color: #a7f3d0;
}

.hero-move.is-bad {
  color: #fecaca;
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 24rpx;
}

.hero-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 14rpx 4rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.1);
}

.cell-num {
  font-size: 34rpx;
  font-weight: 700;
}

.cell-num.is-danger {
  color: #fecaca;
}

.cell-num.is-warn {
  color: #fde68a;
}

.cell-num.is-good {
  color: #a7f3d0;
}

.cell-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.72);
}

.hero-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10rpx;
  margin-top: 22rpx;
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.66);
}

.view-tabs {
  display: flex;
  gap: 8rpx;
  margin-top: 22rpx;
  padding: 8rpx;
  border-radius: 14rpx;
  background: #ffffff;
}

.view-tab {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 10rpx;
  color: #64748b;
  font-size: 26rpx;
  text-align: center;
}

.view-tab.active {
  background: #eaf3f0;
  color: #1f5f54;
  font-weight: 600;
}

.filter-wrap {
  margin-top: 20rpx;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  border-radius: 14rpx;
  background: #ffffff;
}

.search-input {
  flex: 1;
  min-width: 0;
  font-size: 25rpx;
  color: #1e293b;
}

.search-clear {
  color: #b45309;
  font-size: 22rpx;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}

.filter-chip {
  padding: 10rpx 20rpx;
  border: 1rpx solid #e2e8ef;
  border-radius: 999rpx;
  background: #ffffff;
  color: #64748b;
  font-size: 22rpx;
}

.filter-chip.active {
  border-color: #1f5f54;
  background: #eaf3f0;
  color: #1f5f54;
  font-weight: 600;
}

.focus-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 14rpx 20rpx;
  border-radius: 12rpx;
  background: #fff7ed;
  color: #9a5b13;
  font-size: 23rpx;
}

.focus-clear {
  color: #b45309;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 18rpx;
}

.record-card {
  padding: 24rpx;
  border: 1rpx solid #e6ebf0;
  border-radius: 16rpx;
  background: #ffffff;
}

.record-card--pressed {
  background: #f8fafc;
}

.record-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.record-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  min-width: 0;
}

.record-name {
  max-width: 320rpx;
  overflow: hidden;
  color: #172033;
  font-size: 29rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-amount {
  flex-shrink: 0;
  color: #b04a43;
  font-size: 28rpx;
  font-weight: 700;
}

.tag {
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  font-size: 19rpx;
  background: #f1f5f9;
  color: #64748b;
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
  background: #e8f5ef;
  color: #1f7a5c;
}

.record-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 10rpx;
  color: #64748b;
  font-size: 22rpx;
}

.dot {
  color: #cbd5e1;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 18rpx;
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f1f5f9;
  color: #7c8799;
  font-size: 21rpx;
}

.is-warn {
  color: #b45309;
}

.is-muted {
  color: #94a3b8;
}

.load-more {
  padding: 28rpx 0 10rpx;
  color: #94a3b8;
  font-size: 23rpx;
  text-align: center;
}

.counselor-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 18rpx;
}

.counselor-card {
  padding: 24rpx;
  border: 1rpx solid #e6ebf0;
  border-radius: 16rpx;
  background: #ffffff;
}

.counselor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.counselor-name-row {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.counselor-name {
  color: #172033;
  font-size: 28rpx;
  font-weight: 600;
}

.counselor-sub {
  color: #7c8799;
  font-size: 21rpx;
}

.counselor-amount {
  flex-shrink: 0;
  color: #b04a43;
  font-size: 27rpx;
  font-weight: 700;
}

.counselor-track {
  height: 10rpx;
  margin-top: 18rpx;
  border-radius: 6rpx;
  background: #eef2f5;
  overflow: hidden;
}

.counselor-track-fill {
  height: 100%;
  border-radius: inherit;
  background: #2f7d6d;
}

.counselor-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8rpx;
  margin-top: 14rpx;
  color: #64748b;
  font-size: 21rpx;
}
</style>
