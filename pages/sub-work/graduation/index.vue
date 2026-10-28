<template>
  <view class="graduation-page">
    <view class="page-head">
      <view class="head-copy">
        <text class="head-eyebrow">毕业班管理</text>
        <text class="head-title">{{ graduateYear }} 届毕业生</text>
        <text class="head-meta">仅展示当前账号带班范围内的学生</text>
      </view>
      <picker
        mode="selector"
        :range="yearOptions"
        :value="yearIndex"
        @change="handleYearChange"
      >
        <view class="year-picker">
          <text>{{ graduateYear }} 届</text>
          <uni-icons type="down" size="14" color="#0f766e"></uni-icons>
        </view>
      </picker>
    </view>

    <view v-if="loading" class="page-state">
      <text>毕业班级数据加载中...</text>
    </view>

    <view v-else-if="loadError" class="page-state is-error" @click="loadAll">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>

    <template v-else>
      <view class="summary-panel">
        <view class="summary-item">
          <text class="summary-value">{{ displayCount(summary.totalStudents) }}</text>
          <text class="summary-label">预计毕业</text>
        </view>
        <view class="summary-item">
          <text class="summary-value">{{ displayCount(summary.advisorAssigned) }}</text>
          <text class="summary-label">已分配导师</text>
          <text class="summary-foot">{{ percent(summary.advisorAssigned, summary.totalStudents) }}%</text>
        </view>
        <view class="summary-item">
          <text class="summary-value">{{ displayCount(summary.topicSelected) }}</text>
          <text class="summary-label">已完成选题</text>
          <text class="summary-foot">{{ percent(summary.topicSelected, summary.totalStudents) }}%</text>
        </view>
        <view class="summary-item is-warning">
          <text class="summary-value">{{ displayCount(riskStudents.length) }}</text>
          <text class="summary-label">毕业预警</text>
          <text class="summary-foot">需跟进</text>
        </view>
      </view>

      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
          <text v-if="tab.key === 'warning' && riskStudents.length" class="tab-count">{{ riskStudents.length }}</text>
        </view>
      </view>

      <view v-if="activeTab !== 'outcome'" class="search-row">
        <view class="search-box">
          <uni-icons type="search" size="17" color="#94a3b8"></uni-icons>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="姓名、学号、班级或导师"
            confirm-type="search"
          />
          <text v-if="keyword" class="search-clear" @click="keyword = ''">清除</text>
        </view>
      </view>

      <view v-if="activeTab === 'students'" class="student-list">
        <view v-for="student in filteredStudents" :key="student.xh" class="student-card">
          <view class="student-head">
            <view class="student-identity">
              <text class="student-name">{{ student.studentName || '未命名学生' }}</text>
              <text class="student-number">{{ student.xh }}</text>
            </view>
            <text class="status-tag" :class="'status-' + (student.status || '0')">{{ statusLabel(student.status) }}</text>
          </view>
          <view class="student-meta-grid">
            <view class="student-meta-item">
              <text class="meta-label">班级</text>
              <text class="meta-value">{{ student.bjjc || student.className || '-' }}</text>
            </view>
            <view class="student-meta-item">
              <text class="meta-label">指导教师</text>
              <text class="meta-value">{{ student.advisorName || '未分配' }}</text>
            </view>
          </view>
          <view class="topic-block">
            <text class="topic-label">毕业课题</text>
            <text class="topic-title">{{ student.topicTitle || '尚未确定课题' }}</text>
            <text class="topic-sub">{{ student.topicTitle ? (student.topicResearchDirection || '未填写研究方向') : (student.studentNote || '待完成选题') }}</text>
          </view>
          <view class="card-foot">
            <view class="risk-list">
              <text v-for="risk in risksFor(student)" :key="risk.value" class="risk-tag">{{ risk.label }}</text>
              <text v-if="!risksFor(student).length" class="normal-tag">进度正常</text>
            </view>
            <text v-if="student.phone" class="phone-text" @click.stop="callStudent(student.phone)">{{ student.phone }}</text>
          </view>
        </view>
        <view v-if="!filteredStudents.length" class="empty-state">
          <text>当前届别暂无匹配的毕业生</text>
          <text class="empty-action" v-if="keyword" @click="keyword = ''">清除搜索</text>
        </view>
      </view>

      <view v-else-if="activeTab === 'progress'" class="student-list">
        <view v-for="student in filteredStudents" :key="student.xh" class="progress-card">
          <view class="progress-card-head">
            <view class="student-identity">
              <text class="student-name">{{ student.studentName }}</text>
              <text class="student-number">{{ student.xh }} · {{ student.bjjc || student.className || '-' }}</text>
            </view>
            <text class="progress-ratio">{{ completedStageCount(student.xh) }}/{{ stages.length }}</text>
          </view>
          <view class="stage-list">
            <view v-for="stage in stages" :key="stage.value" class="stage-item">
              <view class="stage-dot" :class="'stage-' + stageProgress(student.xh, stage.value)"></view>
              <text class="stage-name">{{ stage.label }}</text>
              <text class="stage-status" :class="'stage-' + stageProgress(student.xh, stage.value)">
                {{ stageStatusLabel(stageProgress(student.xh, stage.value)) }}
              </text>
            </view>
          </view>
        </view>
        <view v-if="!filteredStudents.length" class="empty-state">
          <text>当前届别暂无毕业生进度数据</text>
        </view>
      </view>

      <view v-else-if="activeTab === 'warning'" class="student-list">
        <view v-for="student in riskStudents" :key="student.xh" class="warning-card">
          <view class="student-head">
            <view class="student-identity">
              <text class="student-name">{{ student.studentName }}</text>
              <text class="student-number">{{ student.xh }} · {{ student.bjjc || student.className || '-' }}</text>
            </view>
            <text class="warning-count">{{ risksFor(student).length }} 项</text>
          </view>
          <view class="warning-tags">
            <text v-for="risk in risksFor(student)" :key="risk.value" class="risk-tag">{{ risk.label }}</text>
          </view>
          <view class="warning-detail">
            <text>导师：{{ student.advisorName || '未分配' }}</text>
            <text>选题：{{ statusLabel(student.status) }}</text>
            <text v-if="student.advisorPhone" @click.stop="callStudent(student.advisorPhone)">导师电话：{{ student.advisorPhone }}</text>
            <text v-if="!student.phone" class="is-danger">学生联系电话缺失</text>
          </view>
        </view>
        <view v-if="!riskStudents.length" class="empty-state">
          <text>当前届别暂无毕业预警</text>
        </view>
      </view>

      <view v-else class="direction-list">
        <view v-for="item in filteredDirections" :key="item.id || item.xh" class="direction-card">
          <view class="direction-head">
            <view class="student-identity">
              <text class="student-name">{{ item.studentName || studentFor(item.xh).studentName || '未命名学生' }}</text>
              <text class="student-number">{{ item.xh }} · {{ item.className || studentFor(item.xh).bjjc || '-' }}</text>
            </view>
            <text class="direction-status">{{ auditLabel(item.collegeAuditStatus) }}</text>
          </view>
          <view class="direction-main">
            <text class="direction-name">{{ item.directionName || '未登记毕业去向' }}</text>
            <text class="direction-org">{{ item.destOrg || '暂无接收单位' }}</text>
          </view>
          <view class="direction-foot">
            <text>学院审核：{{ auditLabel(item.collegeAuditStatus) }}</text>
            <text>学校上报：{{ reportLabel(item.schoolReportStatus) }}</text>
          </view>
        </view>
        <view v-if="!filteredDirections.length" class="empty-state">
          <text>当前届别暂无毕业去向记录</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import {
  getGraduationSummary,
  listGraduationStudents,
  getGraduationProgress,
  listGraduationDirections
} from '@/api/graduation'
import { getDefaultGraduationYear } from '@/utils/graduation'

export default {
  data() {
    const currentYear = new Date().getFullYear()
    return {
      graduateYear: getDefaultGraduationYear(),
      yearOptions: [currentYear - 1, currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4],
      loading: true,
      loadError: '',
      activeTab: 'students',
      keyword: '',
      summary: {},
      students: [],
      progressRows: [],
      directions: [],
      tabs: [
        { key: 'students', label: '我的毕业生' },
        { key: 'progress', label: '毕业进度' },
        { key: 'warning', label: '毕业预警' },
        { key: 'outcome', label: '去向登记' }
      ],
      stages: [
        { value: 'TASK', label: '任务书' },
        { value: 'OPENING', label: '开题' },
        { value: 'MIDTERM', label: '中期' },
        { value: 'WEEKLY', label: '周记录' },
        { value: 'DRAFT', label: '初稿' },
        { value: 'DEFENSE', label: '答辩' }
      ]
    }
  },
  computed: {
    yearIndex() {
      const index = this.yearOptions.indexOf(Number(this.graduateYear))
      return index >= 0 ? index : 0
    },
    progressMap() {
      return this.progressRows.reduce((map, item) => {
        if (!map[item.xh]) map[item.xh] = {}
        map[item.xh][item.stage] = item.status
        return map
      }, {})
    },
    filteredStudents() {
      const keyword = this.keyword.trim().toLowerCase()
      if (!keyword) return this.students
      return this.students.filter(item => [
        item.studentName,
        item.xh,
        item.className,
        item.bjjc,
        item.advisorName,
        item.topicTitle
      ].some(value => String(value || '').toLowerCase().includes(keyword)))
    },
    riskStudents() {
      return this.filteredStudents.filter(item => this.risksFor(item).length > 0)
    },
    directionMap() {
      return this.directions.reduce((map, item) => {
        map[item.xh] = item
        return map
      }, {})
    },
    filteredDirections() {
      const keyword = this.keyword.trim().toLowerCase()
      if (!keyword) return this.directions
      return this.directions.filter(item => [
        item.studentName,
        item.xh,
        item.className,
        item.directionName,
        item.destOrg
      ].some(value => String(value || '').toLowerCase().includes(keyword)))
    }
  },
  onLoad(options) {
    const requestedYear = Number(options && options.graduateYear)
    if (requestedYear) this.graduateYear = requestedYear
    this.loadAll()
  },
  onPullDownRefresh() {
    this.loadAll().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    loadAll() {
      this.loading = true
      this.loadError = ''
      const query = { graduateYear: this.graduateYear, pageNum: 1, pageSize: 2000 }
      return Promise.all([
        getGraduationSummary(this.graduateYear),
        listGraduationStudents(query),
        getGraduationProgress(this.graduateYear).catch(() => ({ data: [] })),
        listGraduationDirections({ ...query, scopeMode: 'counselor' }).catch(() => ({ rows: [] }))
      ]).then(([summaryRes, studentRes, progressRes, directionRes]) => {
        this.summary = (summaryRes && summaryRes.data) || {}
        this.students = (studentRes && studentRes.rows) || []
        this.progressRows = (progressRes && progressRes.data) || []
        this.directions = (directionRes && directionRes.rows) || []
      }).catch(() => {
        this.summary = {}
        this.students = []
        this.progressRows = []
        this.directions = []
        this.loadError = '毕业班级数据加载失败'
      }).finally(() => {
        this.loading = false
      })
    },
    handleYearChange(event) {
      const index = Number(event.detail.value)
      const nextYear = this.yearOptions[index]
      if (!nextYear || nextYear === this.graduateYear) return
      this.graduateYear = nextYear
      this.keyword = ''
      this.activeTab = 'students'
      this.loadAll()
    },
    risksFor(student) {
      if (!student) return []
      const risks = []
      if (!student.advisorName) risks.push({ value: 'NO_ADVISOR', label: '未分配导师' })
      if (String(student.status) === '1') risks.push({ value: 'NO_TOPIC', label: '未完成选题' })
      if (String(student.status) === '2') risks.push({ value: 'PENDING_TOPIC', label: '选题待确认' })
      if (!student.phone) risks.push({ value: 'NO_PHONE', label: '缺少联系电话' })
      return risks
    },
    stageProgress(xh, stage) {
      return (this.progressMap[xh] && this.progressMap[xh][stage]) || 'NOT_STARTED'
    },
    completedStageCount(xh) {
      return this.stages.filter(stage => this.stageProgress(xh, stage.value) === 'COMPLETED').length
    },
    stageStatusLabel(status) {
      return {
        NOT_STARTED: '未开始',
        DRAFT: '进行中',
        TEACHER_PENDING: '待导师',
        DIRECTOR_PENDING: '待教研室',
        COLLEGE_PENDING: '待学院',
        COMPLETED: '已完成',
        RETURNED: '已退回'
      }[status] || '未开始'
    },
    statusLabel(status) {
      return {
        '0': '待分配导师',
        '1': '未选题',
        '2': '待导师确认',
        '3': '已完成',
        '4': '已退回'
      }[status] || '待完善'
    },
    studentFor(xh) {
      return this.students.find(item => item.xh === xh) || {}
    },
    auditLabel(status) {
      return { '0': '待院审', '1': '已通过', '2': '已驳回' }[status] || '未登记'
    },
    reportLabel(status) {
      return { '0': '未上报', '1': '已上报', '2': '待重报' }[status] || '-'
    },
    displayCount(value) {
      return value === null || value === undefined || value === '' ? '--' : value
    },
    percent(value, total) {
      const denominator = Number(total || 0)
      return denominator ? (Number(value || 0) / denominator * 100).toFixed(1) : '0.0'
    },
    callStudent(phone) {
      if (!phone) return
      uni.makePhoneCall({ phoneNumber: String(phone) })
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background: #f5f7fa;
}

.graduation-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  color: #172033;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding: 8rpx 4rpx 24rpx;
}

.head-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.head-eyebrow {
  color: #0f766e;
  font-size: 21rpx;
  font-weight: 700;
}

.head-title {
  margin-top: 8rpx;
  color: #172033;
  font-size: 38rpx;
  font-weight: 700;
}

.head-meta {
  margin-top: 8rpx;
  color: #7c8799;
  font-size: 22rpx;
}

.year-picker {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  border: 1rpx solid #cbd5e1;
  border-radius: 10rpx;
  background: #ffffff;
  color: #0f766e;
  font-size: 23rpx;
  font-weight: 600;
}

.page-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 64rpx 28rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  background: #ffffff;
  color: #94a3b8;
  font-size: 24rpx;
  text-align: center;
}

.page-state.is-error,
.state-action,
.empty-action {
  color: #2563eb;
}

.summary-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1rpx solid #dbe4ea;
  border-radius: 14rpx;
  background: #ffffff;
}

.summary-item {
  min-width: 0;
  padding: 22rpx 8rpx 20rpx;
  text-align: center;
}

.summary-item + .summary-item {
  border-left: 1rpx solid #edf2f7;
}

.summary-value {
  display: block;
  color: #0f766e;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.15;
}

.summary-label,
.summary-foot {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 19rpx;
}

.summary-foot {
  margin-top: 3rpx;
  color: #94a3b8;
}

.summary-item.is-warning .summary-value {
  color: #dc2626;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 20rpx;
  padding: 6rpx;
  border-radius: 12rpx;
  background: #e9eef2;
}

.tab-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 66rpx;
  border-radius: 9rpx;
  color: #64748b;
  font-size: 22rpx;
}

.tab-item.active {
  background: #ffffff;
  color: #172033;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.08);
}

.tab-count {
  margin-left: 4rpx;
  padding: 1rpx 7rpx;
  border-radius: 8rpx;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 17rpx;
}

.search-row {
  padding: 18rpx 0 2rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 72rpx;
  padding: 0 20rpx;
  border: 1rpx solid #dbe4ea;
  border-radius: 12rpx;
  background: #ffffff;
}

.search-input {
  flex: 1;
  min-width: 0;
  color: #172033;
  font-size: 24rpx;
}

.search-clear {
  flex-shrink: 0;
  color: #2563eb;
  font-size: 21rpx;
}

.student-list,
.direction-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-top: 16rpx;
}

.student-card,
.progress-card,
.warning-card,
.direction-card {
  overflow: hidden;
  border: 1rpx solid #dbe4ea;
  border-radius: 14rpx;
  background: #ffffff;
}

.student-card,
.warning-card,
.direction-card {
  padding: 22rpx;
}

.student-head,
.progress-card-head,
.direction-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.student-identity {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.student-name {
  color: #172033;
  font-size: 28rpx;
  font-weight: 700;
}

.student-number {
  margin-top: 5rpx;
  color: #7c8799;
  font-size: 20rpx;
}

.status-tag,
.warning-count,
.direction-status {
  flex-shrink: 0;
  padding: 6rpx 12rpx;
  border-radius: 7rpx;
  background: #f1f5f9;
  color: #475569;
  font-size: 19rpx;
}

.status-tag.status-3 {
  background: #ecfdf5;
  color: #047857;
}

.status-tag.status-4,
.warning-count {
  background: #fef2f2;
  color: #b91c1c;
}

.student-meta-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12rpx;
  margin-top: 18rpx;
}

.student-meta-item {
  min-width: 0;
  padding: 13rpx 14rpx;
  border-radius: 9rpx;
  background: #f8fafc;
}

.meta-label,
.meta-value {
  display: block;
}

.meta-label {
  color: #94a3b8;
  font-size: 18rpx;
}

.meta-value {
  margin-top: 4rpx;
  overflow: hidden;
  color: #334155;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-block {
  display: flex;
  flex-direction: column;
  margin-top: 16rpx;
  padding: 16rpx;
  border-left: 4rpx solid #0f766e;
  background: #f0fdfa;
}

.topic-label {
  color: #0f766e;
  font-size: 18rpx;
}

.topic-title {
  margin-top: 5rpx;
  color: #172033;
  font-size: 23rpx;
  font-weight: 600;
  line-height: 1.5;
}

.topic-sub {
  margin-top: 4rpx;
  color: #64748b;
  font-size: 19rpx;
  line-height: 1.5;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 16rpx;
}

.risk-list,
.warning-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.risk-tag,
.normal-tag {
  padding: 5rpx 10rpx;
  border-radius: 6rpx;
  font-size: 18rpx;
}

.risk-tag {
  background: #fef2f2;
  color: #b91c1c;
}

.normal-tag {
  background: #ecfdf5;
  color: #047857;
}

.phone-text {
  flex-shrink: 0;
  color: #2563eb;
  font-size: 20rpx;
}

.progress-card-head {
  padding: 20rpx 22rpx;
}

.progress-ratio {
  flex-shrink: 0;
  color: #0f766e;
  font-size: 26rpx;
  font-weight: 700;
}

.stage-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rpx;
  border-top: 1rpx solid #edf2f7;
  background: #edf2f7;
}

.stage-item {
  display: grid;
  grid-template-columns: 14rpx minmax(0, 1fr) auto;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 18rpx;
  background: #ffffff;
}

.stage-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #cbd5e1;
}

.stage-dot.stage-COMPLETED {
  background: #059669;
}

.stage-dot.stage-RETURNED {
  background: #dc2626;
}

.stage-dot.stage-DRAFT,
.stage-dot.stage-TEACHER_PENDING,
.stage-dot.stage-DIRECTOR_PENDING,
.stage-dot.stage-COLLEGE_PENDING {
  background: #d97706;
}

.stage-name {
  color: #334155;
  font-size: 21rpx;
}

.stage-status {
  color: #94a3b8;
  font-size: 18rpx;
}

.stage-status.stage-COMPLETED {
  color: #047857;
}

.stage-status.stage-RETURNED {
  color: #b91c1c;
}

.warning-tags {
  margin-top: 16rpx;
}

.warning-detail {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #edf2f7;
  color: #64748b;
  font-size: 20rpx;
}

.warning-detail .is-danger {
  color: #b91c1c;
}

.direction-main {
  display: flex;
  flex-direction: column;
  margin-top: 18rpx;
  padding: 16rpx;
  border-radius: 9rpx;
  background: #f8fafc;
}

.direction-name {
  color: #172033;
  font-size: 24rpx;
  font-weight: 600;
}

.direction-org {
  margin-top: 5rpx;
  color: #64748b;
  font-size: 20rpx;
}

.direction-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
  margin-top: 14rpx;
  color: #7c8799;
  font-size: 19rpx;
}
</style>
