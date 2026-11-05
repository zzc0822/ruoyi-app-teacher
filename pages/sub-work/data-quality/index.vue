<template>
  <view class="quality-page">
    <view class="page-intro">
      <view class="intro-copy">
        <text class="intro-title">待处理任务</text>
        <text class="intro-sub">数据质量看板指派给本人的任务</text>
      </view>
      <view class="refresh-btn" @click="loadTasks">
        <uni-icons type="refreshempty" size="18" color="#2563eb"></uni-icons>
      </view>
    </view>

    <view class="metric-row">
      <view class="metric-item" @click="setFilter('0')">
        <text class="metric-value">{{ counts.pending }}</text>
        <text class="metric-label">待整改</text>
      </view>
      <view class="metric-item" @click="setFilter('1')">
        <text class="metric-value metric-blue">{{ counts.doing }}</text>
        <text class="metric-label">整改中</text>
      </view>
      <view class="metric-item" @click="setFilter('2')">
        <text class="metric-value metric-orange">{{ counts.review }}</text>
        <text class="metric-label">待复核</text>
      </view>
      <view class="metric-item metric-danger" @click="setFilter('overdue')">
        <text class="metric-value">{{ counts.overdue }}</text>
        <text class="metric-label">已逾期</text>
      </view>
    </view>

    <view class="filter-bar">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-chip"
        :class="{ active: activeFilter === tab.value }"
        @click="setFilter(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <text class="filter-count">{{ tab.count }}</text>
      </view>
    </view>

    <view v-if="loading" class="page-state">
      <text>任务加载中...</text>
    </view>
    <view v-else-if="loadError" class="page-state" @click="loadTasks">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>
    <view v-else-if="visibleTasks.length" class="task-list">
      <view
        v-for="task in visibleTasks"
        :key="task.taskId"
        :id="'task-' + task.taskId"
        class="task-card"
        :class="{ 'is-overdue': task.overdue, 'is-focused': isFocusTask(task) }"
      >
        <view class="task-head">
          <text class="task-issue">{{ issueLabel(task.issueType) }}</text>
          <text class="status-tag" :class="'status-' + task.status">{{ task.statusLabel }}</text>
        </view>
        <text class="task-group">{{ task.groupLabel || '未分组' }}</text>
        <view class="task-meta">
          <text :class="['due-text', task.overdue ? 'is-danger' : '']">
            期限 {{ task.dueDate || '未设置' }}
          </text>
          <text v-if="task.overdue" class="overdue-tag">已逾期</text>
          <text v-else-if="task.ownerName" class="owner-text">{{ task.ownerName }}</text>
        </view>
        <view class="task-actions">
          <view class="task-btn" @click="openStudents(task)">
            <uni-icons type="person" size="15" color="#2563eb"></uni-icons>
            <text>学生明细</text>
          </view>
          <view class="task-btn is-primary" @click="openHandle(task)">
            <uni-icons type="compose" size="15" color="#ffffff"></uni-icons>
            <text>处理</text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="page-state">
      <text>{{ activeFilter === 'all' ? '当前没有待处理的整改任务' : '当前筛选下没有任务' }}</text>
    </view>

    <uni-popup ref="handlePopup" type="bottom" @change="onPopupChange">
      <view class="handle-sheet">
        <view class="sheet-head">
          <view class="sheet-title-wrap">
            <text class="sheet-title">{{ current ? issueLabel(current.issueType) : '整改处理' }}</text>
            <text class="sheet-sub">{{ current && current.groupLabel ? current.groupLabel : '未分组' }}</text>
          </view>
          <view class="sheet-close" @click="closeHandle">
            <uni-icons type="closeempty" size="20" color="#64748b"></uni-icons>
          </view>
        </view>

        <scroll-view scroll-y class="sheet-body">
          <view v-if="current" class="current-row">
            <text class="status-tag" :class="'status-' + current.status">{{ current.statusLabel }}</text>
            <text :class="['due-text', current.overdue ? 'is-danger' : '']">
              期限 {{ current.dueDate || '未设置' }}
            </text>
            <text v-if="current.overdue" class="overdue-tag">已逾期</text>
          </view>

          <view class="field-label">处理方式</view>
          <view class="action-options">
            <view
              v-for="option in nextStatusOptions"
              :key="option.value"
              class="action-option"
              :class="{ active: pendingStatus === option.value }"
              @click="pendingStatus = option.value"
            >
              <text>{{ option.label }}</text>
            </view>
          </view>

          <view class="field-label">
            <text>处理说明</text>
            <text class="field-hint">{{ remarkRequired ? '必填' : '选填' }}</text>
          </view>
          <textarea
            v-model="remark"
            class="remark-input"
            maxlength="200"
            :adjust-position="true"
            placeholder="整改措施、复核结论或忽略原因"
          />
          <view class="remark-count">{{ remark.length }}/200</view>
          <view v-if="remarkRequired" class="remark-tip">当前处理方式必须填写说明</view>

          <view v-if="detailLoading" class="log-state">处理记录加载中...</view>
          <view v-else-if="logs.length" class="log-block">
            <view class="field-label">处理记录</view>
            <view v-for="log in logs" :key="log.logId" class="log-item">
              <view class="log-head">
                <text class="log-action">{{ logActionLabel(log) }}</text>
                <text class="log-time">{{ log.createTime }}</text>
              </view>
              <text class="log-operator">{{ log.operatorName || '系统' }}</text>
              <text v-if="log.remark" class="log-remark">{{ log.remark }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="sheet-footer">
          <button class="sheet-btn is-plain" @click="closeHandle">取消</button>
          <button
            class="sheet-btn is-primary"
            :disabled="!pendingStatus || submitting || (remarkRequired && !remark.trim())"
            :loading="submitting"
            @click="submitStatus"
          >提交处理</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { listMyQualityTasks, getMyQualityTask, changeMyTaskStatus } from '@/api/work/qualityTask'

const ISSUE_LABELS = {
  missingClass: '学生不在有效班级名册',
  missingCollege: '学生缺少学院归属',
  gradeMissing: '学生没有成绩记录',
  bedNoAssignment: '学生主档有床位但无分配',
  bedAssignmentMismatch: '分配与学生主档床位不一致',
  aidApprovedNoGrant: '已认定但未发放',
  aidGrantNoAppr: '已发放但无认定'
}

const TRANSITIONS = {
  '0': ['1', '2', '4'],
  '1': ['2', '4'],
  '2': ['3', '1', '4']
}

const ACTION_LABELS = {
  '1': '开始整改',
  '2': '提交复核',
  '3': '复核闭环',
  '4': '忽略该组问题'
}

export default {
  data() {
    return {
      loading: true,
      loadError: '',
      tasks: [],
      activeFilter: 'all',
      current: null,
      pendingStatus: '',
      remark: '',
      submitting: false,
      detailLoading: false,
      logs: [],
      focusTaskId: null
    }
  },
  computed: {
    counts() {
      const result = { pending: 0, doing: 0, review: 0, overdue: 0 }
      this.tasks.forEach(task => {
        if (task.status === '0') result.pending++
        if (task.status === '1') result.doing++
        if (task.status === '2') result.review++
        if (task.overdue) result.overdue++
      })
      return result
    },
    filterTabs() {
      return [
        { value: 'all', label: '全部', count: this.tasks.length },
        { value: '0', label: '待整改', count: this.counts.pending },
        { value: '1', label: '整改中', count: this.counts.doing },
        { value: '2', label: '待复核', count: this.counts.review },
        { value: 'overdue', label: '已逾期', count: this.counts.overdue }
      ]
    },
    visibleTasks() {
      if (this.activeFilter === 'all') return this.tasks
      if (this.activeFilter === 'overdue') return this.tasks.filter(task => task.overdue)
      return this.tasks.filter(task => task.status === this.activeFilter)
    },
    nextStatusOptions() {
      if (!this.current) return []
      const values = TRANSITIONS[this.current.status] || []
      return values.map(value => ({ value, label: this.actionLabel(value, this.current.status) }))
    },
    remarkRequired() {
      if (!this.current || !this.pendingStatus) return false
      if (this.pendingStatus === '3' || this.pendingStatus === '4') return true
      return this.pendingStatus === '1' && this.current.status !== '0'
    }
  },
  onLoad(options) {
    if (options && options.taskId) {
      this.focusTaskId = Number(options.taskId)
    }
    this.loadTasks()
  },
  onPullDownRefresh() {
    this.loadTasks().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    issueLabel(type) {
      return ISSUE_LABELS[type] || type || '数据质量问题'
    },
    isFocusTask(task) {
      return this.focusTaskId && Number(task.taskId) === Number(this.focusTaskId)
    },
    actionLabel(value, from) {
      if (value === '1') return from === '0' ? '开始整改' : '退回整改'
      return ACTION_LABELS[value] || '状态变更'
    },
    logActionLabel(log) {
      if (!log) return '处理'
      if (log.action === 'STATUS' && log.fromStatusLabel) {
        return '状态变更：' + log.fromStatusLabel + ' → ' + log.toStatusLabel
      }
      if (log.action === 'ASSIGN') return '更新责任人与期限'
      if (log.action === 'CREATE') return '登记整改任务'
      return log.action
    },
    setFilter(value) {
      this.activeFilter = value
    },
    scrollToFocus() {
      if (!this.focusTaskId) {
        return
      }
      const exists = this.tasks.some(task => Number(task.taskId) === Number(this.focusTaskId))
      if (!exists) {
        return
      }
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query.select('#task-' + this.focusTaskId).boundingClientRect()
        query.selectViewport().scrollOffset()
        query.exec(res => {
          if (res && res[0] && res[1]) {
            uni.pageScrollTo({
              scrollTop: Math.max(0, res[0].top + res[1].scrollTop - 120),
              duration: 250
            })
          }
        })
      })
    },
    loadTasks() {
      this.loading = true
      this.loadError = ''
      return listMyQualityTasks().then(res => {
        this.tasks = res.data || []
        this.scrollToFocus()
        this.loading = false
      }).catch(error => {
        this.tasks = []
        this.loading = false
        this.loadError = typeof error === 'string' ? error : '整改任务加载失败'
      })
    },
    openStudents(task) {
      const query = [
        'taskId=' + task.taskId,
        'issueType=' + encodeURIComponent(task.issueType || ''),
        'groupLabel=' + encodeURIComponent(task.groupLabel || '')
      ].join('&')
      uni.navigateTo({ url: '/pages/sub-work/data-quality/students?' + query })
    },
    openHandle(task) {
      this.current = task
      this.pendingStatus = ''
      this.remark = ''
      this.logs = []
      this.$refs.handlePopup.open()
      this.loadDetail(task.taskId)
    },
    loadDetail(taskId) {
      this.detailLoading = true
      getMyQualityTask(taskId).then(res => {
        const detail = res.data || {}
        this.current = detail
        const logs = detail.logs || []
        this.logs = logs.slice().reverse()
      }).catch(() => {
        this.logs = []
      }).then(() => {
        this.detailLoading = false
      })
    },
    closeHandle() {
      this.$refs.handlePopup.close()
    },
    onPopupChange(e) {
      if (!e.show) {
        this.current = null
        this.pendingStatus = ''
        this.remark = ''
        this.logs = []
      }
    },
    submitStatus() {
      if (!this.current || !this.pendingStatus) return
      if (this.remarkRequired && !this.remark.trim()) {
        uni.showToast({ title: '请填写处理说明', icon: 'none' })
        return
      }
      this.submitting = true
      changeMyTaskStatus({
        taskId: this.current.taskId,
        status: this.pendingStatus,
        remark: this.remark.trim()
      }).then(() => {
        uni.showToast({ title: '处理已提交', icon: 'success' })
        this.submitting = false
        this.closeHandle()
        this.loadTasks()
      }).catch(() => {
        this.submitting = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.quality-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
  box-sizing: border-box;
  background: #f4f7f9;
}

.page-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 4rpx 24rpx;
}

.intro-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.intro-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
}

.intro-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #64748b;
}

.refresh-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-row {
  display: flex;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 22rpx 8rpx;
  box-sizing: border-box;
}

.metric-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.metric-value {
  font-size: 38rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
}

.metric-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #64748b;
}

.metric-blue {
  color: #2563eb;
}

.metric-orange {
  color: #d97706;
}

.metric-danger .metric-value {
  color: #dc2626;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin: 20rpx 0;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  border-radius: 28rpx;
  background: #ffffff;
  font-size: 24rpx;
  color: #475569;
}

.filter-chip.active {
  background: #2563eb;
  color: #ffffff;
}

.filter-count {
  font-size: 22rpx;
  opacity: 0.75;
}

.page-state {
  margin-top: 40rpx;
  padding: 60rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #64748b;
}

.state-action {
  color: #2563eb;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 22rpx;
  border-left: 6rpx solid #cbd5e1;
}

.task-card.is-overdue {
  border-left-color: #dc2626;
}

.task-card.is-focused {
  border-left-color: #0f766e;
  box-shadow: 0 0 0 2rpx #99d5c8;
}

.task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.task-issue {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.45;
  word-break: break-all;
}

.status-tag {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #475569;
  background: #f1f5f9;
}

.status-0 {
  color: #b45309;
  background: #fef3c7;
}

.status-1 {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-2 {
  color: #a21caf;
  background: #fae8ff;
}

.task-group {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #475569;
  line-height: 1.55;
  word-break: break-all;
}

.task-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.due-text {
  font-size: 23rpx;
  color: #64748b;
}

.due-text.is-danger {
  color: #dc2626;
}

.overdue-tag {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 21rpx;
  color: #dc2626;
  background: #fee2e2;
}

.owner-text {
  font-size: 23rpx;
  color: #64748b;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f1f5f9;
}

.task-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 22rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #2563eb;
  background: #eff6ff;
}

.task-btn.is-primary {
  color: #ffffff;
  background: #2563eb;
}

.handle-sheet {
  width: 100%;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 20rpx 20rpx 0 0;
  overflow: hidden;
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 28rpx 28rpx 20rpx;
  border-bottom: 1rpx solid #e2e8f0;
}

.sheet-title-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
}

.sheet-sub {
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #64748b;
}

.sheet-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  padding: 22rpx 28rpx;
  box-sizing: border-box;
}

.current-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14rpx;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 26rpx 0 12rpx;
  font-size: 25rpx;
  font-weight: 600;
  color: #334155;
}

.field-hint {
  font-size: 22rpx;
  font-weight: normal;
  color: #94a3b8;
}

.action-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.action-option {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  border: 1rpx solid #cbd5e1;
  font-size: 24rpx;
  color: #475569;
  background: #ffffff;
}

.action-option.active {
  border-color: #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
}

.remark-input {
  width: 100%;
  height: 160rpx;
  padding: 16rpx;
  box-sizing: border-box;
  border: 1rpx solid #cbd5e1;
  border-radius: 8rpx;
  font-size: 25rpx;
  color: #0f172a;
  background: #f8fafc;
}

.remark-count {
  margin-top: 6rpx;
  text-align: right;
  font-size: 21rpx;
  color: #94a3b8;
}

.remark-tip {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #b45309;
}

.log-state {
  margin-top: 24rpx;
  font-size: 23rpx;
  color: #94a3b8;
}

.log-block {
  padding-bottom: 12rpx;
}

.log-item {
  padding: 14rpx 0;
  border-top: 1rpx dashed #e2e8f0;
}

.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.log-action {
  font-size: 24rpx;
  color: #334155;
}

.log-time {
  font-size: 21rpx;
  color: #94a3b8;
}

.log-operator {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #64748b;
}

.log-remark {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #475569;
  line-height: 1.55;
  word-break: break-all;
}

.sheet-footer {
  display: flex;
  gap: 16rpx;
  padding: 18rpx 28rpx 28rpx;
  border-top: 1rpx solid #e2e8f0;
  padding-bottom: calc(28rpx + env(safe-area-inset-bottom));
}

.sheet-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  margin: 0;
  border-radius: 8rpx;
  font-size: 27rpx;
}

.sheet-btn.is-plain {
  color: #475569;
  background: #f1f5f9;
}

.sheet-btn.is-primary {
  color: #ffffff;
  background: #2563eb;
}

@media (min-width: 900px) {
  .quality-page {
    max-width: 720px;
    margin: 0 auto;
  }
}
</style>
