<template>
  <view class="page-container">
    <view class="summary-band">
      <view class="summary-head">
        <view>
          <text class="summary-title">学风检查</text>
          <text class="summary-sub">执勤登记与谈话跟进</text>
        </view>
        <view v-if="canRegister" class="register-btn" @click="goAdd">
          <uni-icons type="plusempty" size="18" color="#ffffff"></uni-icons>
          <text>登记检查</text>
        </view>
      </view>
      <view class="summary-grid">
        <view class="summary-item">
          <text class="summary-num">{{ summary.todayChecks || 0 }}</text>
          <text class="summary-label">今日检查</text>
        </view>
        <view class="summary-item is-warning">
          <text class="summary-num">{{ summary.todayViolations || 0 }}</text>
          <text class="summary-label">今日违纪</text>
        </view>
        <view class="summary-item is-danger">
          <text class="summary-num">{{ summary.pendingTalks || 0 }}</text>
          <text class="summary-label">待谈话</text>
        </view>
        <view class="summary-item is-success">
          <text class="summary-num">{{ summary.completedTalks || 0 }}</text>
          <text class="summary-label">已闭环</text>
        </view>
      </view>
      <view v-if="Number(summary.unassignedTalks) > 0" class="unassigned-tip" @click="setStatus('unassigned')">
        <uni-icons type="info" size="15" color="#b45309"></uni-icons>
        <text>{{ summary.unassignedTalks }} 条记录待补辅导员，点击查看</text>
      </view>
    </view>

    <view class="toolbar">
      <view class="search-box">
        <uni-icons type="search" size="17" color="#94a3b8"></uni-icons>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="学号、姓名或执勤点"
          confirm-type="search"
          @confirm="handleSearch"
          @blur="handleSearch"
        />
        <uni-icons
          v-if="keyword"
          type="clear"
          size="17"
          color="#94a3b8"
          @click="clearSearch"
        ></uni-icons>
      </view>
    </view>

    <scroll-view class="status-scroll" scroll-x :show-scrollbar="false">
      <view class="status-row">
        <view
          v-for="item in statusOptions"
          :key="item.value"
          :class="['status-chip', status === item.value ? 'status-active' : '']"
          @click="setStatus(item.value)"
        >
          <text>{{ item.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading && list.length === 0" class="state-panel">
      <uni-load-more status="loading"></uni-load-more>
    </view>
    <view v-else-if="loadError" class="state-panel state-error" @click="loadData(true)">
      <uni-icons type="info" size="24" color="#dc2626"></uni-icons>
      <text>{{ loadError }}</text>
      <text class="retry-text">点击重试</text>
    </view>
    <view v-else-if="list.length === 0" class="state-panel">
      <view class="empty-icon">
        <uni-icons type="checkbox-filled" size="32" color="#94a3b8"></uni-icons>
      </view>
      <text class="empty-title">当前范围内暂无学风违纪记录</text>
      <text class="empty-sub">{{ canRegister ? '可登记一次正常检查，或补充违纪学生' : '筛选条件变化后会自动更新' }}</text>
    </view>

    <view v-else class="record-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="record-item"
        @click="openDetail(item)"
      >
        <view class="record-head">
          <view class="student-main">
            <text class="student-name">{{ item.studentName || item.xh }}</text>
            <text class="student-meta">{{ item.xh }} · {{ item.className || item.bjdm || '未匹配班级' }}</text>
          </view>
          <text :class="['talk-badge', 'talk-' + (item.talkStatus || 'pending')]">
            {{ talkStatusLabel(item.talkStatus) }}
          </text>
        </view>

        <view class="violation-line">
          <text :class="['severity-dot', 'severity-' + (item.severity || 'normal')]"></text>
          <text class="violation-type">{{ violationLabel(item.violationType) }}</text>
          <text class="severity-label">{{ severityLabel(item.severity) }}</text>
        </view>
        <text v-if="item.violationDetail" class="violation-detail">{{ item.violationDetail }}</text>

        <view class="record-meta">
          <view class="meta-line">
            <uni-icons type="location" size="14" color="#64748b"></uni-icons>
            <text>{{ item.pointName || '执勤点未记录' }}</text>
          </view>
          <view class="meta-line">
            <uni-icons type="calendar" size="14" color="#64748b"></uni-icons>
            <text>{{ formatDateTime(item.checkTime) }}</text>
          </view>
        </view>

        <view class="record-foot">
          <view class="counselor-info">
            <text class="foot-label">辅导员</text>
            <text :class="['foot-value', item.counselorName ? '' : 'is-warning']">
              {{ item.counselorName || '待匹配' }}
            </text>
          </view>
          <text class="deadline-text">{{ deadlineText(item) }}</text>
        </view>
      </view>
      <uni-load-more :status="loadStatus" @clickLoadMore="loadMore"></uni-load-more>
    </view>

    <view v-if="detailVisible" class="detail-mask" @click="closeDetail">
      <view class="detail-sheet" @click.stop>
        <view class="detail-head">
          <view>
            <text class="detail-title">违纪详情</text>
            <text class="detail-no">{{ detail.checkNo || '' }}</text>
          </view>
          <view class="detail-close" @click="closeDetail">
            <uni-icons type="closeempty" size="22" color="#64748b"></uni-icons>
          </view>
        </view>
        <scroll-view scroll-y class="detail-scroll">
          <view class="detail-student">
            <text class="detail-student-name">{{ detail.studentName }}（{{ detail.xh }}）</text>
            <text class="detail-student-class">{{ detail.collegeName || detail.xydm }} · {{ detail.className || detail.bjdm }}</text>
          </view>
          <view class="detail-grid">
            <view class="detail-cell">
              <text class="detail-label">违纪类型</text>
              <text class="detail-value">{{ violationLabel(detail.violationType) }}</text>
            </view>
            <view class="detail-cell">
              <text class="detail-label">严重程度</text>
              <text class="detail-value">{{ severityLabel(detail.severity) }}</text>
            </view>
            <view class="detail-cell">
              <text class="detail-label">执勤点</text>
              <text class="detail-value">{{ detail.pointName || '-' }}</text>
            </view>
            <view class="detail-cell">
              <text class="detail-label">检查时间</text>
              <text class="detail-value">{{ formatDateTime(detail.checkTime) }}</text>
            </view>
            <view class="detail-cell">
              <text class="detail-label">检查人</text>
              <text class="detail-value">{{ detail.inspectorName || '-' }}</text>
            </view>
            <view class="detail-cell">
              <text class="detail-label">归属辅导员</text>
              <text class="detail-value">{{ detail.counselorName || '未匹配' }}</text>
            </view>
          </view>
          <view class="detail-section">
            <text class="detail-label">违纪事实</text>
            <text class="detail-copy">{{ detail.violationDetail || '未填写详细情况' }}</text>
          </view>
          <view class="detail-section">
            <text class="detail-label">检查说明</text>
            <text class="detail-copy">{{ detail.checkSummary || '未填写' }}</text>
          </view>
          <view class="flow-panel">
            <view class="flow-row">
              <text class="detail-label">谈话状态</text>
              <text :class="['talk-badge', 'talk-' + (detail.talkStatus || 'pending')]">
                {{ talkStatusLabel(detail.talkStatus) }}
              </text>
            </view>
            <view class="flow-row">
              <text class="detail-label">谈话截止</text>
              <text class="flow-value">{{ formatDateTime(detail.talkDeadline) || '尚未派单' }}</text>
            </view>
            <view class="flow-row">
              <text class="detail-label">学生通知</text>
              <text class="flow-value">{{ studentNotifyLabel(detail.studentNotifyStatus) }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="detail-actions">
          <button class="secondary-btn" @click="closeDetail">关闭</button>
          <button
            v-if="canTalk"
            class="primary-btn"
            @click="goTalk"
          >去谈话</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  listStudyInspectionViolations,
  getStudyInspectionViolation,
  getStudyInspectionSummary
} from '@/api/work/studyInspection'

const VIOLATION_LABELS = {
  late: '迟到',
  truant: '旷课',
  sleeping: '课堂睡觉',
  phone: '课堂使用手机',
  smoking: '公共场所吸烟',
  dress: '仪容仪表不规范',
  other: '其他违纪'
}

export default {
  data() {
    return {
      keyword: '',
      status: '',
      statusOptions: [
        { label: '全部', value: '' },
        { label: '待谈话', value: 'pending' },
        { label: '已逾期', value: 'overdue' },
        { label: '已闭环', value: 'completed' },
        { label: '待补辅导员', value: 'unassigned' }
      ],
      query: {
        pageNum: 1,
        pageSize: 15
      },
      list: [],
      total: 0,
      summary: {},
      loading: false,
      loadStatus: 'more',
      loadError: '',
      detailVisible: false,
      detail: null,
      userRoles: []
    }
  },
  computed: {
    canRegister() {
      return this.hasRoleKey('admin')
        || this.hasRoleKey('school_admin')
        || this.hasRoleKey('student_affairs')
        || this.hasRoleKey('counselor')
    },
    canTalk() {
      return this.hasRoleKey('counselor')
        && this.detail
        && this.detail.talkStatus !== 'completed'
        && !!this.detail.counselorUserId
    }
  },
  onLoad() {
    this.userRoles = this.readRoles()
    this.loadData(true)
  },
  onShow() {
    if (this._loaded) {
      this.loadData(true)
    }
    this._loaded = true
  },
  onPullDownRefresh() {
    this.loadData(true).finally(() => uni.stopPullDownRefresh())
  },
  onReachBottom() {
    this.loadMore()
  },
  methods: {
    readRoles() {
      let roles = []
      try {
        roles = uni.getStorageSync('user_roles') || []
      } catch (e) {}
      if (!Array.isArray(roles) || roles.length === 0) {
        roles = (this.$store && this.$store.state.user.roles) || []
      }
      return Array.isArray(roles) ? roles : []
    },
    hasRoleKey(roleKey) {
      const expected = String(roleKey || '').toLowerCase()
      return this.userRoles.some(role => {
        if (typeof role === 'string') {
          const value = role.toLowerCase()
          return value === expected || (expected === 'admin'
            && ['管理员', '超级管理员', '学校管理员'].includes(role))
        }
        const key = String(role.roleKey || '').toLowerCase()
        const name = String(role.roleName || '').toLowerCase()
        return key === expected || (expected === 'admin'
          && ['管理员', '超级管理员', '学校管理员'].includes(name))
      })
    },
    buildQuery() {
      const params = {
        pageNum: this.query.pageNum,
        pageSize: this.query.pageSize
      }
      if (this.keyword.trim()) params.keyword = this.keyword.trim()
      if (this.status) params.talkStatus = this.status
      return params
    },
    async loadData(reset = false) {
      if (this.loading && !reset) return
      if (reset) {
        this.query.pageNum = 1
        this.list = []
        this.loadStatus = 'more'
      }
      this.loading = true
      this.loadError = ''
      try {
        const params = this.buildQuery()
        const [listRes, summaryRes] = await Promise.all([
          listStudyInspectionViolations(params),
          getStudyInspectionSummary({
            keyword: params.keyword,
            talkStatus: params.talkStatus
          })
        ])
        const rows = listRes.rows || []
        this.list = reset ? rows : this.list.concat(rows)
        this.total = Number(listRes.total || 0)
        this.summary = summaryRes.data || {}
        this.loadStatus = this.list.length >= this.total ? 'noMore' : 'more'
      } catch (e) {
        this.loadStatus = this.list.length ? 'more' : 'noMore'
        if (!this.list.length) {
          this.loadError = '学风检查数据加载失败'
        }
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.loadData(true)
    },
    clearSearch() {
      this.keyword = ''
      this.loadData(true)
    },
    setStatus(value) {
      this.status = value
      this.loadData(true)
    },
    loadMore() {
      if (this.loading || this.list.length >= this.total) return
      this.query.pageNum += 1
      this.loadData(false)
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/sub-work/inspection/add' })
    },
    async openDetail(item) {
      this.detail = item
      this.detailVisible = true
      try {
        const res = await getStudyInspectionViolation(item.id)
        this.detail = res.data || item
      } catch (e) {}
    },
    closeDetail() {
      this.detailVisible = false
    },
    goTalk() {
      if (!this.detail || !this.detail.id) return
      this.detailVisible = false
      uni.navigateTo({
        url: '/pages/sub-work/talk/add?studyViolationId=' + this.detail.id
      })
    },
    violationLabel(value) {
      return VIOLATION_LABELS[value] || value || '其他违纪'
    },
    severityLabel(value) {
      return { minor: '一般', normal: '较重', serious: '严重' }[value] || '较重'
    },
    talkStatusLabel(value) {
      return {
        pending: '待谈话',
        overdue: '已逾期',
        completed: '已闭环',
        unassigned: '待补辅导员'
      }[value] || '待谈话'
    },
    studentNotifyLabel(value) {
      return {
        notified: '已通知',
        pending: '待通知',
        unbound: '学生未绑定账号'
      }[value] || '待通知'
    },
    deadlineText(item) {
      if (item.talkStatus === 'completed') {
        return item.completeTime ? '完成于 ' + this.formatDateTime(item.completeTime) : '已完成闭环'
      }
      if (!item.talkDeadline) return '尚未派单'
      return '截止 ' + this.formatDateTime(item.talkDeadline)
    },
    formatDateTime(value) {
      if (!value) return ''
      const text = String(value).replace(/-/g, '/')
      const date = new Date(text)
      if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return month + '-' + day + ' ' + hour + ':' + minute
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background: #f4f6f8;
}

.page-container {
  min-height: 100vh;
  padding-bottom: 40rpx;
  background: #f4f6f8;
}

.summary-band {
  padding: 30rpx 28rpx 26rpx;
  background: #0f3d3e;
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.summary-title,
.summary-sub {
  display: block;
}

.summary-title {
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 700;
}

.summary-sub {
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.68);
  font-size: 23rpx;
}

.register-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  border-radius: 10rpx;
  color: #ffffff;
  font-size: 25rpx;
  background: rgba(255, 255, 255, 0.1);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
}

.summary-item {
  min-width: 0;
  padding: 18rpx 10rpx;
  border-radius: 8rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
}

.summary-num,
.summary-label {
  display: block;
}

.summary-num {
  color: #ffffff;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.1;
}

.summary-label {
  margin-top: 7rpx;
  color: rgba(255, 255, 255, 0.7);
  font-size: 21rpx;
}

.summary-item.is-warning .summary-num {
  color: #fbbf24;
}

.summary-item.is-danger .summary-num {
  color: #fda4af;
}

.summary-item.is-success .summary-num {
  color: #86efac;
}

.unassigned-tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 14rpx 16rpx;
  border-radius: 8rpx;
  color: #92400e;
  font-size: 23rpx;
  background: #fef3c7;
}

.toolbar {
  padding: 22rpx 24rpx 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 76rpx;
  padding: 0 20rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 10rpx;
  background: #ffffff;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  color: #0f172a;
  font-size: 26rpx;
}

.status-scroll {
  width: 100%;
  margin-top: 18rpx;
  white-space: nowrap;
}

.status-row {
  display: inline-flex;
  gap: 12rpx;
  padding: 0 24rpx 16rpx;
}

.status-chip {
  padding: 12rpx 20rpx;
  border: 1rpx solid #dbe3ea;
  border-radius: 24rpx;
  color: #475569;
  font-size: 24rpx;
  background: #ffffff;
}

.status-chip.status-active {
  border-color: #0f766e;
  color: #0f766e;
  font-weight: 600;
  background: #e6fffb;
}

.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  min-height: 360rpx;
  margin: 12rpx 24rpx;
  padding: 40rpx 24rpx;
  border: 1rpx dashed #d8e0e8;
  border-radius: 10rpx;
  color: #64748b;
  text-align: center;
  background: #ffffff;
}

.state-error {
  color: #b91c1c;
}

.retry-text {
  color: #0f766e;
  font-size: 24rpx;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: #f1f5f9;
}

.empty-title {
  color: #334155;
  font-size: 27rpx;
  font-weight: 600;
}

.empty-sub {
  color: #94a3b8;
  font-size: 23rpx;
}

.record-list {
  padding: 0 24rpx;
}

.record-item {
  margin-bottom: 16rpx;
  padding: 22rpx;
  border: 1rpx solid #e6ebef;
  border-radius: 10rpx;
  background: #ffffff;
}

.record-head,
.record-foot,
.record-meta,
.violation-line,
.flow-row {
  display: flex;
  align-items: center;
}

.record-head,
.record-foot {
  justify-content: space-between;
}

.student-main {
  min-width: 0;
}

.student-name,
.student-meta {
  display: block;
}

.student-name {
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
}

.student-meta {
  margin-top: 5rpx;
  color: #64748b;
  font-size: 22rpx;
}

.talk-badge {
  flex-shrink: 0;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  color: #b45309;
  font-size: 21rpx;
  white-space: nowrap;
  background: #fffbeb;
}

.talk-overdue {
  color: #b91c1c;
  background: #fef2f2;
}

.talk-completed {
  color: #15803d;
  background: #f0fdf4;
}

.talk-unassigned {
  color: #6d28d9;
  background: #f5f3ff;
}

.violation-line {
  gap: 10rpx;
  margin-top: 20rpx;
}

.severity-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #f59e0b;
}

.severity-minor {
  background: #0ea5e9;
}

.severity-serious {
  background: #dc2626;
}

.violation-type {
  color: #1e293b;
  font-size: 26rpx;
  font-weight: 600;
}

.severity-label {
  color: #94a3b8;
  font-size: 21rpx;
}

.violation-detail {
  display: block;
  margin-top: 10rpx;
  color: #475569;
  font-size: 24rpx;
  line-height: 1.55;
}

.record-meta {
  flex-wrap: wrap;
  gap: 18rpx;
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #eef2f5;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 7rpx;
  color: #64748b;
  font-size: 22rpx;
}

.record-foot {
  gap: 18rpx;
  margin-top: 16rpx;
}

.counselor-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

.foot-label {
  color: #94a3b8;
  font-size: 21rpx;
}

.foot-value {
  overflow: hidden;
  color: #334155;
  font-size: 23rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.foot-value.is-warning {
  color: #b45309;
}

.deadline-text {
  flex-shrink: 0;
  color: #64748b;
  font-size: 21rpx;
}

.detail-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  background: rgba(15, 23, 42, 0.52);
}

.detail-sheet {
  width: 100%;
  max-height: 88vh;
  overflow: hidden;
  border-radius: 18rpx 18rpx 0 0;
  background: #ffffff;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 26rpx;
  border-bottom: 1rpx solid #eef2f5;
}

.detail-title,
.detail-no {
  display: block;
}

.detail-title {
  color: #0f172a;
  font-size: 31rpx;
  font-weight: 700;
}

.detail-no {
  margin-top: 4rpx;
  color: #94a3b8;
  font-size: 20rpx;
}

.detail-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62rpx;
  height: 62rpx;
  border-radius: 50%;
  background: #f1f5f9;
}

.detail-scroll {
  box-sizing: border-box;
  max-height: 63vh;
  padding: 22rpx 26rpx;
}

.detail-student {
  padding: 18rpx;
  border-left: 6rpx solid #0f766e;
  background: #f0fdfa;
}

.detail-student-name,
.detail-student-class {
  display: block;
}

.detail-student-name {
  color: #0f172a;
  font-size: 29rpx;
  font-weight: 700;
}

.detail-student-class {
  margin-top: 7rpx;
  color: #64748b;
  font-size: 22rpx;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 20rpx;
  border-top: 1rpx solid #eef2f5;
  border-left: 1rpx solid #eef2f5;
}

.detail-cell {
  min-width: 0;
  padding: 16rpx;
  border-right: 1rpx solid #eef2f5;
  border-bottom: 1rpx solid #eef2f5;
}

.detail-label,
.detail-value {
  display: block;
}

.detail-label {
  color: #94a3b8;
  font-size: 21rpx;
}

.detail-value {
  margin-top: 6rpx;
  overflow: hidden;
  color: #1e293b;
  font-size: 24rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-section {
  margin-top: 20rpx;
}

.detail-copy {
  display: block;
  margin-top: 8rpx;
  color: #334155;
  font-size: 24rpx;
  line-height: 1.65;
}

.flow-panel {
  margin-top: 22rpx;
  padding: 16rpx 18rpx;
  background: #f8fafc;
}

.flow-row {
  justify-content: space-between;
  gap: 18rpx;
  min-height: 58rpx;
}

.flow-value {
  color: #334155;
  font-size: 23rpx;
  text-align: right;
}

.detail-actions {
  display: flex;
  gap: 14rpx;
  padding: 18rpx 26rpx calc(18rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #eef2f5;
}

.detail-actions button {
  flex: 1;
  height: 76rpx;
  margin: 0;
  border-radius: 8rpx;
  line-height: 76rpx;
}

.secondary-btn {
  color: #475569;
  background: #f1f5f9;
}

.primary-btn {
  color: #ffffff;
  background: #0f766e;
}
</style>
