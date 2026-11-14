<template>
  <view class="psych-page">
    <view v-if="initialLoading" class="page-state">
      <text>心理工作台加载中...</text>
    </view>

    <view v-else-if="loadError" class="page-state" @click="reload">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-kicker">
          <text>{{ overview.viewLabel || '心理健康工作台' }}</text>
          <text class="hero-chip">{{ privacyTag }}</text>
        </view>
        <view class="hero-scope">
          <text>{{ overview.ownerName || '当前账号' }}</text>
          <text class="dot">·</text>
          <text>{{ overview.scopeLabel || '正在解析数据范围' }}</text>
        </view>
        <view class="hero-grid">
          <view v-for="card in statCards" :key="card.key" class="hero-cell">
            <text class="cell-num" :class="card.tone">{{ card.value }}</text>
            <text class="cell-label">{{ card.label }}</text>
          </view>
        </view>
        <view class="hero-foot">
          <text>已测评 {{ n(stats.assessmentCompleted) }}/{{ n(stats.assessmentTotal) }}</text>
          <text>已访谈 {{ n(stats.surveyInterviewCompleted) }}/{{ n(stats.surveyTotal) }}</text>
          <text>追踪中 {{ n(stats.surveyFollowing) }}</text>
        </view>
      </view>

      <view class="privacy-note">
        <uni-icons type="locked" size="15" color="#64748b"></uni-icons>
        <text>{{ overview.privacyHint || '姓名默认脱敏，电话和身份证号仅展示脱敏值；查看明文需二次校验并写入访问留痕。' }}</text>
      </view>

      <view v-if="overview.message" class="empty-banner">
        <text>{{ overview.message }}</text>
      </view>

      <view v-if="showTabs" class="view-tabs">
        <view class="view-tab" :class="{ active: viewMode === 'tasks' }" @click="switchView('tasks')">优先处理</view>
        <view class="view-tab" :class="{ active: viewMode === 'progress' }" @click="switchView('progress')">
          {{ isCollegeView || isCenterView ? '辅导员进度' : '我的进度' }}
        </view>
      </view>

      <template v-if="viewMode === 'tasks'">
        <view v-if="tasks.length" class="task-list">
          <view v-for="task in tasks" :key="task.taskType + '-' + task.taskId" class="task-card">
            <view class="task-top">
              <view class="task-name-row">
                <text class="priority-dot" :class="priorityClass(task.priority)"></text>
                <text class="task-name">{{ task.studentName || '未命名学生' }}</text>
                <text class="task-tag" :class="priorityClass(task.priority)">{{ task.statusLabel || task.priorityLabel }}</text>
              </view>
              <text class="task-source">{{ task.sourceLabel }}</text>
            </view>
            <text class="task-summary">{{ task.title }}</text>
            <view class="task-sub">
              <text v-if="task.className">{{ task.className }}</text>
              <text v-if="task.summary" class="dot">·</text>
              <text v-if="task.summary">{{ task.summary }}</text>
            </view>
            <view class="task-identity">
              <text>电话 {{ task.contactPhone || '未登记' }}</text>
              <text>身份证 {{ task.idCard || '未登记' }}</text>
            </view>
            <view class="task-foot">
              <text class="task-deadline" :class="{ 'is-overdue': task.overdue }">
                {{ task.deadline ? (task.overdue ? '已逾期 ' : '截止 ') + shortDate(task.deadline) : '无截止时间' }}
              </text>
              <view v-if="task.xh" class="reveal-btn" @click.stop="openReveal(task)">
                <uni-icons type="eye" size="14" color="#0f766e"></uni-icons>
                <text>查看明文</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="page-state is-inline">
          <text>当前没有需要优先处理的心理事项</text>
        </view>
      </template>

      <template v-else>
        <view v-if="counselors.length" class="counselor-list">
          <view v-for="(row, index) in counselors" :key="row.teacherId || index" class="counselor-card">
            <view class="counselor-head">
              <view class="counselor-copy">
                <text class="counselor-name">{{ row.counselorName || '未分配' }}</text>
                <text class="counselor-sub">{{ row.collegeName || '学院待匹配' }} · {{ n(row.classCount) }} 个班 · {{ n(row.studentCount) }} 名学生</text>
              </view>
              <text class="counselor-rate">{{ rateText(row.assessmentRate) }}</text>
            </view>
            <view class="counselor-track">
              <view class="counselor-fill" :style="{ width: rateWidth(row.assessmentRate) }"></view>
            </view>
            <view class="counselor-meta">
              <text>测评 {{ n(row.assessmentCompleted) }}/{{ n(row.assessmentTotal) }}</text>
              <text class="is-warn">待测评 {{ n(row.assessmentPending) }}</text>
              <text>待访谈 {{ n(row.surveyOpen) }}</text>
              <text :class="{ 'is-danger': n(row.surveyFollowUpDue) > 0 }">追踪逾期 {{ n(row.surveyFollowUpDue) }}</text>
              <text :class="{ 'is-danger': n(row.surveyOverdue) > 0 }">访谈逾期 {{ n(row.surveyOverdue) }}</text>
            </view>
            <view v-if="row.lastFollowUpDate" class="counselor-foot">
              <text>最近追踪 {{ shortDate(row.lastFollowUpDate) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="page-state is-inline">
          <text>{{ isCollegeView || isCenterView ? '当前视野暂无辅导员心理工作数据' : '当前账号未绑定带班信息' }}</text>
        </view>
      </template>
    </template>

    <view v-if="revealVisible" class="modal-mask" @click="closeReveal">
      <view class="modal-card" @click.stop>
        <view class="modal-head">
          <view class="modal-title-wrap">
            <text class="modal-title">敏感信息二次校验</text>
            <text class="modal-sub">{{ revealTask.studentName }} · {{ revealTask.className || '班级待匹配' }}</text>
          </view>
          <view class="modal-close" @click="closeReveal">
            <uni-icons type="closeempty" size="20" color="#94a3b8"></uni-icons>
          </view>
        </view>

        <template v-if="!revealedIdentity">
          <view class="modal-field">
            <text class="field-label">访问事由</text>
            <textarea
              v-model="revealForm.reason"
              class="field-textarea"
              maxlength="200"
              placeholder="填写本次查看明文的原因，例如：辅导员联系学生家长"
            />
          </view>
          <view class="modal-field">
            <text class="field-label">当前账号登录密码</text>
            <input
              v-model="revealForm.password"
              class="field-input"
              type="password"
              password
              placeholder="再次输入登录密码"
            />
          </view>
          <view class="modal-note">
            <uni-icons type="info" size="14" color="#94a3b8"></uni-icons>
            <text>明文仅按人按次展示，本次查看会写入心理访问留痕。</text>
          </view>
          <view class="modal-submit" :class="{ disabled: revealSubmitting }" @click="submitReveal">
            <text>{{ revealSubmitting ? '校验中...' : '校验并查看' }}</text>
          </view>
        </template>

        <template v-else>
          <view class="identity-card">
            <view class="identity-main">
              <text class="identity-name">{{ revealedIdentity.studentName }}</text>
              <text class="identity-class">{{ revealedIdentity.collegeName }} · {{ revealedIdentity.className }}</text>
            </view>
            <view class="identity-row">
              <text class="identity-label">学号</text>
              <text class="identity-value">{{ revealedIdentity.xh }}</text>
            </view>
            <view class="identity-row">
              <text class="identity-label">电话</text>
              <text class="identity-value">{{ revealedIdentity.phone || '未登记' }}</text>
            </view>
            <view class="identity-row">
              <text class="identity-label">身份证号</text>
              <text class="identity-value">{{ revealedIdentity.idCard || '未登记' }}</text>
            </view>
          </view>
          <view class="modal-note is-recorded">
            <uni-icons type="checkmarkempty" size="14" color="#0f766e"></uni-icons>
            <text>本次明文查看已写入访问留痕，请按最小必要使用。</text>
          </view>
          <view class="modal-submit" @click="closeReveal">
            <text>关闭</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script>
import { roleMixin } from '@/utils/roleSystem'
import { getPsychWorkbench, revealPsychIdentity } from '@/api/work/psych'

export default {
  mixins: [roleMixin],
  data() {
    return {
      initialLoading: true,
      loadError: '',
      overview: {},
      stats: {},
      tasks: [],
      counselors: [],
      viewMode: 'tasks',
      revealVisible: false,
      revealTask: {},
      revealForm: { reason: '', password: '' },
      revealSubmitting: false,
      revealedIdentity: null
    }
  },
  computed: {
    isCenterView() {
      return this.overview.viewType === 'CENTER' || this.overview.viewType === 'SCHOOL'
    },
    isCollegeView() {
      return this.overview.viewType === 'COLLEGE'
    },
    showTabs() {
      return this.counselors.length > 0
    },
    privacyTag() {
      if (this.overview.privacyMode === 'AGGREGATE_ONLY') return '仅聚合'
      if (this.overview.privacyMode === 'MASKED') return '已脱敏'
      return '本人带班'
    },
    statCards() {
      const s = this.stats || {}
      return [
        { key: 'rate', label: '测评完成率', value: this.rateText(s.assessmentRate), tone: 'is-good' },
        { key: 'pending', label: '待测评', value: this.n(s.assessmentPending), tone: 'is-warn' },
        { key: 'survey', label: '待访谈/跟进', value: this.n(s.surveyOpen), tone: 'is-warn' },
        { key: 'follow', label: '追踪逾期', value: this.n(s.surveyFollowUpDue), tone: 'is-danger' },
        { key: 'crisis', label: '开放危机', value: this.n(s.crisisOpen), tone: 'is-danger' },
        { key: 'consult', label: '咨询待办', value: this.n(s.consultPending || s.consultOpen), tone: '' }
      ]
    }
  },
  onLoad() {
    this.reload()
  },
  onPullDownRefresh() {
    this.reload().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    reload() {
      this.initialLoading = !this.overview.viewType
      this.loadError = ''
      return getPsychWorkbench().then(res => {
        const data = (res && res.data) || {}
        this.overview = data
        this.stats = data.stats || {}
        this.tasks = data.tasks || []
        this.counselors = data.counselors || []
        if (!this.tasks.length && this.counselors.length) {
          this.viewMode = 'progress'
        }
      }).catch(error => {
        this.loadError = typeof error === 'string' ? error : ((error && error.message) || '心理工作台加载失败')
      }).finally(() => {
        this.initialLoading = false
      })
    },
    switchView(mode) {
      this.viewMode = mode
    },
    openReveal(task) {
      this.revealTask = task || {}
      this.revealForm = { reason: '', password: '' }
      this.revealedIdentity = null
      this.revealVisible = true
    },
    closeReveal() {
      if (this.revealSubmitting) return
      this.revealVisible = false
      this.revealedIdentity = null
    },
    submitReveal() {
      if (this.revealSubmitting) return
      const reason = (this.revealForm.reason || '').trim()
      const password = this.revealForm.password || ''
      if (!reason) {
        uni.showToast({ title: '请填写访问事由', icon: 'none' })
        return
      }
      if (!password) {
        uni.showToast({ title: '请输入当前账号登录密码', icon: 'none' })
        return
      }
      this.revealSubmitting = true
      revealPsychIdentity({
        xh: this.revealTask.xh,
        password: password,
        reason: reason
      }).then(res => {
        this.revealedIdentity = (res && res.data) || null
        this.revealForm.password = ''
      }).catch(error => {
        const message = typeof error === 'string' ? error : '二次校验失败'
        uni.showToast({ title: message, icon: 'none', duration: 2600 })
      }).finally(() => {
        this.revealSubmitting = false
      })
    },
    n(value) {
      return Number(value || 0)
    },
    rateText(value) {
      if (value === null || value === undefined || value === '') return '0%'
      return Number(value).toFixed(1).replace('.0', '') + '%'
    },
    rateWidth(value) {
      const rate = Math.max(0, Math.min(100, Number(value || 0)))
      return rate + '%'
    },
    shortDate(value) {
      if (!value) return ''
      return String(value).slice(0, 10).slice(5)
    },
    priorityClass(priority) {
      if (priority === 'crisis' || priority === 'danger') return 'is-danger'
      if (priority === 'high' || priority === 'warn') return 'is-warn'
      return 'is-normal'
    }
  }
}
</script>

<style lang="scss" scoped>
.psych-page {
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
  color: #0f766e;
  font-size: 24rpx;
}

.hero-card {
  padding: 30rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #12324a 0%, #1b5e6b 100%);
  color: #ffffff;
  box-shadow: 0 14rpx 36rpx rgba(18, 50, 74, 0.22);
}

.hero-kicker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.88);
}

.hero-chip {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.82);
}

.hero-scope {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 24rpx;
}

.hero-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 4rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.1);
}

.cell-num {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
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
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.14);
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.76);
}

.privacy-note {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 18rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: #eef2f6;
  font-size: 22rpx;
  line-height: 1.6;
  color: #64748b;
}

.empty-banner {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: #fff7ed;
  font-size: 22rpx;
  line-height: 1.6;
  color: #b45309;
}

.view-tabs {
  display: flex;
  gap: 8rpx;
  margin: 22rpx 0 18rpx;
  padding: 6rpx;
  border-radius: 14rpx;
  background: #e9eef2;
}

.view-tab {
  flex: 1;
  padding: 14rpx 0;
  border-radius: 10rpx;
  text-align: center;
  font-size: 24rpx;
  color: #64748b;
}

.view-tab.active {
  background: #ffffff;
  color: #12324a;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(18, 50, 74, 0.08);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-card {
  padding: 22rpx 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.05);
}

.task-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.task-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.priority-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
}

.priority-dot.is-danger {
  background: #dc2626;
}

.priority-dot.is-warn {
  background: #d97706;
}

.task-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-tag {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #eef2f7;
  font-size: 19rpx;
  color: #475569;
  flex-shrink: 0;
}

.task-tag.is-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.task-tag.is-warn {
  background: #fef3c7;
  color: #92400e;
}

.task-source {
  font-size: 21rpx;
  color: #94a3b8;
  flex-shrink: 0;
}

.task-summary {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #334155;
}

.task-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #94a3b8;
}

.dot {
  color: #cbd5e1;
}

.task-identity {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
  margin-top: 12rpx;
  font-size: 21rpx;
  color: #64748b;
}

.task-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f1f5f9;
}

.task-deadline {
  font-size: 21rpx;
  color: #94a3b8;
}

.task-deadline.is-overdue {
  color: #dc2626;
}

.reveal-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: #ecfdf5;
  font-size: 21rpx;
  color: #0f766e;
}

.counselor-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.counselor-card {
  padding: 22rpx 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.05);
}

.counselor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.counselor-copy {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.counselor-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.counselor-sub {
  font-size: 21rpx;
  color: #94a3b8;
}

.counselor-rate {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f766e;
  flex-shrink: 0;
}

.counselor-track {
  height: 10rpx;
  margin-top: 16rpx;
  border-radius: 999rpx;
  background: #edf2f5;
  overflow: hidden;
}

.counselor-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #0f766e;
}

.counselor-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 14rpx;
  font-size: 21rpx;
  color: #64748b;
}

.counselor-meta .is-warn {
  color: #b45309;
}

.counselor-meta .is-danger {
  color: #b91c1c;
}

.counselor-foot {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #94a3b8;
}

.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 900;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
}

.modal-card {
  width: 100%;
  max-height: 86vh;
  padding: 28rpx 28rpx 40rpx;
  border-radius: 24rpx 24rpx 0 0;
  background: #ffffff;
  overflow-y: auto;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.modal-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.modal-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.modal-sub {
  font-size: 22rpx;
  color: #64748b;
}

.modal-close {
  padding: 4rpx;
}

.modal-field {
  margin-top: 24rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 23rpx;
  color: #334155;
}

.field-textarea {
  width: 100%;
  height: 150rpx;
  padding: 16rpx 18rpx;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ea;
  border-radius: 10rpx;
  background: #f8fafc;
  font-size: 24rpx;
  line-height: 1.5;
  color: #0f172a;
}

.field-input {
  width: 100%;
  height: 84rpx;
  padding: 0 18rpx;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ea;
  border-radius: 10rpx;
  background: #f8fafc;
  font-size: 24rpx;
  color: #0f172a;
}

.modal-note {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 18rpx;
  font-size: 21rpx;
  line-height: 1.6;
  color: #94a3b8;
}

.modal-note.is-recorded {
  color: #0f766e;
}

.modal-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin-top: 26rpx;
  border-radius: 12rpx;
  background: #12324a;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
}

.modal-submit.disabled {
  opacity: 0.6;
}

.identity-card {
  margin-top: 24rpx;
  padding: 22rpx;
  border-radius: 14rpx;
  background: #f4f8f9;
}

.identity-main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #e2e8ee;
}

.identity-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}

.identity-class {
  font-size: 22rpx;
  color: #64748b;
}

.identity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
}

.identity-label {
  color: #94a3b8;
  flex-shrink: 0;
}

.identity-value {
  color: #0f172a;
  word-break: break-all;
  text-align: right;
}
</style>
