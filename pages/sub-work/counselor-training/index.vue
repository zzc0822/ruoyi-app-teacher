<template>
  <view class="page">
    <view class="hero-band">
      <view class="hero-copy">
        <text class="hero-eyebrow">COUNSELOR PRACTICE</text>
        <text class="hero-title">辅导员训练平台</text>
        <text class="hero-sub">{{ canTrain ? '训练、比赛和个人成绩都在这里' : scopeName + '辅导员训练与比赛数据' }}</text>
      </view>
      <view class="hero-mark">
        <uni-icons type="star-filled" size="28" color="#ffffff"></uni-icons>
      </view>
    </view>

    <view v-if="loading" class="state-block">
      <view class="loading-ring"></view>
      <text>正在加载训练数据</text>
    </view>

    <view v-else-if="error" class="state-block error-state" @click="loadOverview">
      <uni-icons type="warning" size="24" color="#b45309"></uni-icons>
      <text>{{ error }}</text>
      <text class="retry-text">点击重试</text>
    </view>

    <template v-else>
      <view class="metric-band" v-if="canTrain && currentPerson">
        <view class="metric-item">
          <text class="metric-value">{{ formatDuration(currentPerson.trainingTimeSpent) }}</text>
          <text class="metric-label">训练用时</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ formatScore(currentPerson.trainingScore) }}</text>
          <text class="metric-label">训练均分</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ formatDuration(currentPerson.competitionTimeSpent) }}</text>
          <text class="metric-label">比赛用时</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ formatScore(currentPerson.competitionScore) }}</text>
          <text class="metric-label">比赛均分</text>
        </view>
      </view>

      <view class="train-zone" v-if="canTrain">
        <view class="section-heading">
          <view>
            <text class="section-kicker">TRAINING</text>
            <text class="section-title">选择训练项目</text>
          </view>
          <text class="section-note">记录自动保存</text>
        </view>
        <view class="training-grid">
          <view class="training-item" @click="openTraining('class_awareness')">
            <view class="training-icon icon-green">
              <uni-icons type="person-filled" size="24" color="#ffffff"></uni-icons>
            </view>
            <view class="training-copy">
              <text class="training-name">班情熟知</text>
              <text class="training-desc">学生信息随机抽测</text>
            </view>
            <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
          </view>
          <view class="training-item" @click="openTraining('case_analysis')">
            <view class="training-icon icon-blue">
              <uni-icons type="compose" size="24" color="#ffffff"></uni-icons>
            </view>
            <view class="training-copy">
              <text class="training-name">案例研讨</text>
              <text class="training-desc">结构化案例作答</text>
            </view>
            <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
          </view>
          <view class="training-item" @click="openTraining('talk')">
            <view class="training-icon icon-orange">
              <uni-icons type="chat-filled" size="24" color="#ffffff"></uni-icons>
            </view>
            <view class="training-copy">
              <text class="training-name">谈心谈话</text>
              <text class="training-desc">情景模拟与复盘</text>
            </view>
            <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
          </view>
        </view>
      </view>

      <view class="competition-zone" v-if="canTrain">
        <view class="section-heading">
          <view>
            <text class="section-kicker">COMPETITION</text>
            <text class="section-title">参加比赛</text>
          </view>
        </view>

        <view class="join-code-row">
          <input
            v-model="joinCode"
            class="code-input"
            maxlength="12"
            placeholder="输入赛事码"
            confirm-type="go"
            @confirm="enterCodeCompetition"
          />
          <button class="code-button" :disabled="!joinCode" @click="enterCodeCompetition">进入</button>
        </view>

        <view v-if="competitions.length" class="competition-list">
          <view
            v-for="competition in competitions"
            :key="competition.compId"
            class="competition-item"
            @click="openCompetition(competition)"
          >
            <view class="competition-main">
              <text class="competition-name">{{ competition.compName }}</text>
              <text class="competition-meta">{{ projectNames(competition) }} · 截至 {{ shortTime(competition.endTime) }}</text>
            </view>
            <view class="competition-action">
              <text>进入</text>
              <uni-icons type="right" size="15" color="#0f766e"></uni-icons>
            </view>
          </view>
        </view>
        <view v-else class="competition-empty">当前没有进行中的比赛</view>
      </view>

      <view class="people-section">
        <view class="section-heading">
          <view>
            <text class="section-kicker">{{ canTrain ? 'MY RECORDS' : 'COLLEGE OVERVIEW' }}</text>
            <text class="section-title">
              {{ canTrain ? '我的训练与比赛' : (viewMode === 'school' ? '全校辅导员' : '本学院辅导员') }}
            </text>
          </view>
          <text class="section-note">{{ rows.length }} 人</text>
        </view>

        <view v-if="!rows.length" class="empty-block">
          <uni-icons type="info" size="22" color="#94a3b8"></uni-icons>
          <text>暂无可查看的训练记录</text>
        </view>

        <view v-for="person in rows" :key="person.teacherId" class="person-card">
          <view class="person-head" @click="togglePerson(person)">
            <view class="avatar">{{ nameInitial(person.teacherName) }}</view>
            <view class="person-copy">
              <view class="person-name-row">
                <text class="person-name">{{ person.teacherName }}</text>
                <text class="person-gh" v-if="person.teacherGh">{{ person.teacherGh }}</text>
              </view>
              <text class="person-college">{{ person.collegeName || scopeName }}</text>
            </view>
            <uni-icons :type="expandedTeacherId === person.teacherId ? 'up' : 'down'" size="17" color="#94a3b8"></uni-icons>
          </view>

          <view class="person-stats">
            <view class="person-stat">
              <text class="person-stat-label">训练</text>
              <text class="person-stat-main">{{ person.trainingCount || 0 }} 次</text>
              <text class="person-stat-sub">{{ formatDuration(person.trainingTimeSpent) }} · {{ formatScoreWithUnit(person.trainingScore) }}</text>
            </view>
            <view class="person-stat">
              <text class="person-stat-label">比赛</text>
              <text class="person-stat-main">{{ person.competitionCount || 0 }} 次</text>
              <text class="person-stat-sub">{{ formatDuration(person.competitionTimeSpent) }} · {{ formatScoreWithUnit(person.competitionScore) }}</text>
            </view>
          </view>

          <view v-if="expandedTeacherId === person.teacherId" class="record-panel">
            <view class="record-tabs">
              <view
                :class="['record-tab', recordTab === 'training' ? 'active' : '']"
                @click="switchRecordTab(person, 'training')"
              >训练记录</view>
              <view
                :class="['record-tab', recordTab === 'competition' ? 'active' : '']"
                @click="switchRecordTab(person, 'competition')"
              >比赛记录</view>
            </view>

            <view v-if="recordsLoading" class="record-state">正在加载明细...</view>
            <view v-else-if="!(activeRecords[recordTab] || []).length" class="record-state">
              暂无{{ recordTab === 'training' ? '训练' : '比赛' }}记录
            </view>
            <view v-else class="record-list">
              <view v-for="record in activeRecords[recordTab]" :key="record.recordKey" class="record-item">
                <view class="record-line">
                  <text class="record-project">{{ record.projectName }}</text>
                  <text class="record-score">{{ formatScoreWithUnit(record.score) }}</text>
                </view>
                <text class="record-title">{{ record.compName || record.title }}</text>
                <view class="record-meta-row">
                  <text>{{ formatDuration(record.timeSpent) }}</text>
                  <text>{{ shortTime(record.submitTime) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="summary-note" v-if="!canTrain">
        <uni-icons type="info" size="15" color="#64748b"></uni-icons>
        <text>汇总口径：训练与比赛均按已提交记录统计，分数取已评分记录的平均值。</text>
      </view>
    </template>
  </view>
</template>

<script>
import {
  getTrainingOverview,
  getTrainingRecords,
  getAvailableCompetitions
} from '@/api/counselor/training'

const PROJECT_NAMES = {
  class_awareness: '班情熟知',
  case_analysis: '案例分析',
  talk: '谈心谈话'
}

const PROJECT_ROUTES = {
  class_awareness: '/pages/sub-work/class-awareness/index',
  case_analysis: '/pages/sub-work/case-analysis/index',
  talk: '/pages/sub-work/talk-sim/index'
}

export default {
  name: 'CounselorTraining',
  data() {
    return {
      loading: true,
      error: '',
      viewMode: '',
      scopeName: '',
      canTrain: false,
      rows: [],
      competitions: [],
      joinCode: '',
      expandedTeacherId: null,
      recordTab: 'training',
      recordsLoading: false,
      recordsByTeacher: {}
    }
  },
  computed: {
    currentPerson() {
      return this.rows.length ? this.rows[0] : null
    },
    activeRecords() {
      return this.recordsByTeacher[this.expandedTeacherId] || {}
    }
  },
  onLoad() {
    this.loadOverview()
  },
  methods: {
    async loadOverview() {
      this.loading = true
      this.error = ''
      try {
        const response = await getTrainingOverview()
        const data = response.data || {}
        this.viewMode = data.viewMode || ''
        this.scopeName = data.scopeName || '本学院'
        this.canTrain = !!data.canTrain
        this.rows = data.rows || []
        if (this.canTrain) {
          await this.loadCompetitions()
        }
      } catch (error) {
        this.error = error || '训练数据加载失败'
      } finally {
        this.loading = false
      }
    },
    async loadCompetitions() {
      try {
        const response = await getAvailableCompetitions()
        this.competitions = response.data || []
      } catch (error) {
        this.competitions = []
      }
    },
    openTraining(project) {
      const route = PROJECT_ROUTES[project]
      if (route) {
        uni.navigateTo({ url: route })
      }
    },
    openCompetition(competition) {
      const projects = String(competition.projectCodes || competition.compType || '')
        .split(',')
        .map(item => item.trim())
        .filter(item => PROJECT_ROUTES[item])
      if (!projects.length) {
        uni.showToast({ title: '本场竞赛暂无可参与项目', icon: 'none' })
        return
      }
      if (projects.length === 1) {
        this.navigateCompetitionProject(competition, projects[0])
        return
      }
      uni.showActionSheet({
        itemList: projects.map(item => PROJECT_NAMES[item]),
        success: result => this.navigateCompetitionProject(competition, projects[result.tapIndex])
      })
    },
    navigateCompetitionProject(competition, project) {
      const route = PROJECT_ROUTES[project]
      const compName = encodeURIComponent(competition.compName || '')
      uni.navigateTo({
        url: route + '?compId=' + encodeURIComponent(competition.compId) +
          '&mode=competition&compName=' + compName
      })
    },
    enterCodeCompetition() {
      const code = String(this.joinCode || '').trim().toUpperCase()
      if (!code) return
      uni.navigateTo({
        url: '/pages/sub-work/class-awareness/competition?code=' + encodeURIComponent(code)
      })
    },
    async togglePerson(person) {
      if (this.expandedTeacherId === person.teacherId) {
        this.expandedTeacherId = null
        return
      }
      this.expandedTeacherId = person.teacherId
      this.recordTab = 'training'
      if (!this.recordsByTeacher[person.teacherId]) {
        await this.loadPersonRecords(person.teacherId)
      }
    },
    async switchRecordTab(person, tab) {
      this.recordTab = tab
      const records = this.recordsByTeacher[person.teacherId] || {}
      if (!records[tab]) {
        await this.loadPersonRecords(person.teacherId)
      }
    },
    async loadPersonRecords(teacherId) {
      this.recordsLoading = true
      try {
        const [trainingResponse, competitionResponse] = await Promise.all([
          getTrainingRecords(teacherId, 'training'),
          getTrainingRecords(teacherId, 'competition')
        ])
        this.$set(this.recordsByTeacher, teacherId, {
          training: trainingResponse.data || [],
          competition: competitionResponse.data || []
        })
      } catch (error) {
        uni.showToast({ title: error || '记录加载失败', icon: 'none' })
      } finally {
        this.recordsLoading = false
      }
    },
    projectNames(competition) {
      return String(competition.projectCodes || competition.compType || '')
        .split(',')
        .map(item => PROJECT_NAMES[item.trim()])
        .filter(Boolean)
        .join('、')
    },
    formatDuration(seconds) {
      const total = Math.max(0, Number(seconds || 0))
      if (!total) return '0分钟'
      if (total < 60) return total + '秒'
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      if (hours) return hours + '小时' + (minutes ? minutes + '分' : '')
      return Math.max(1, minutes) + '分钟'
    },
    formatScore(score) {
      if (score === null || score === undefined || score === '') return '--'
      const value = Number(score)
      if (!Number.isFinite(value)) return '--'
      return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
    },
    formatScoreWithUnit(score) {
      const value = this.formatScore(score)
      return value === '--' ? '待评分' : value + '分'
    },
    shortTime(value) {
      if (!value) return '长期有效'
      return String(value).replace('T', ' ').slice(0, 16)
    },
    nameInitial(name) {
      const value = String(name || '').trim()
      return value ? value.slice(-1) : '辅'
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: #f4f7f6;
  color: #1e293b;
}

.hero-band {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 250rpx;
  padding: 44rpx 36rpx 48rpx;
  overflow: hidden;
  background: #115e59;
  box-sizing: border-box;
}

.hero-band::after {
  content: '';
  position: absolute;
  right: -110rpx;
  bottom: -150rpx;
  width: 340rpx;
  height: 340rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.hero-eyebrow {
  color: #99f6e4;
  font-size: 19rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.hero-title {
  margin-top: 12rpx;
  color: #ffffff;
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.hero-sub {
  margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.72);
  font-size: 23rpx;
}

.hero-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 86rpx;
  height: 86rpx;
  flex-shrink: 0;
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.1);
}

.metric-band {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: -20rpx 24rpx 0;
  position: relative;
  z-index: 2;
  border: 1rpx solid #dce7e3;
  border-radius: 14rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 26rpx rgba(15, 81, 72, 0.08);
}

.metric-item {
  min-width: 0;
  padding: 24rpx 8rpx;
  text-align: center;
  border-right: 1rpx solid #edf2f0;
}

.metric-item:last-child {
  border-right: 0;
}

.metric-value {
  display: block;
  overflow: hidden;
  color: #0f766e;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-label {
  display: block;
  margin-top: 7rpx;
  color: #64748b;
  font-size: 19rpx;
}

.train-zone,
.competition-zone,
.people-section {
  margin: 28rpx 24rpx 0;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18rpx;
  padding: 0 4rpx;
}

.section-kicker {
  display: block;
  margin-bottom: 4rpx;
  color: #0f766e;
  font-size: 17rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.section-title {
  display: block;
  color: #0f172a;
  font-size: 31rpx;
  font-weight: 700;
}

.section-note {
  color: #94a3b8;
  font-size: 20rpx;
}

.training-grid,
.competition-list,
.person-card {
  border: 1rpx solid #e1e9e6;
  border-radius: 14rpx;
  background: #ffffff;
}

.training-item {
  display: flex;
  align-items: center;
  min-height: 112rpx;
  padding: 18rpx 22rpx;
  border-bottom: 1rpx solid #edf2f0;
  box-sizing: border-box;
}

.training-item:last-child {
  border-bottom: 0;
}

.training-item:active,
.competition-item:active,
.person-head:active {
  background: #f8fafc;
}

.training-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
}

.icon-green {
  background: #0f766e;
}

.icon-blue {
  background: #2563eb;
}

.icon-orange {
  background: #c2410c;
}

.training-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-left: 20rpx;
}

.training-name {
  color: #0f172a;
  font-size: 27rpx;
  font-weight: 650;
}

.training-desc {
  margin-top: 5rpx;
  color: #7c8b98;
  font-size: 21rpx;
}

.join-code-row {
  display: flex;
  gap: 14rpx;
  padding: 18rpx;
  border: 1rpx solid #e1e9e6;
  border-radius: 14rpx;
  background: #ffffff;
}

.code-input {
  flex: 1;
  min-width: 0;
  height: 76rpx;
  padding: 0 22rpx;
  border: 1rpx solid #dbe5e1;
  border-radius: 10rpx;
  background: #f8faf9;
  color: #0f172a;
  font-size: 27rpx;
  letter-spacing: 2rpx;
}

.code-button {
  width: 124rpx;
  height: 76rpx;
  margin: 0;
  padding: 0;
  border-radius: 10rpx;
  background: #0f766e;
  color: #ffffff;
  font-size: 24rpx;
  line-height: 76rpx;
}

.code-button[disabled] {
  background: #cbd5e1;
  color: #ffffff;
}

.competition-list {
  margin-top: 16rpx;
  overflow: hidden;
}

.competition-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx;
  border-bottom: 1rpx solid #edf2f0;
}

.competition-item:last-child {
  border-bottom: 0;
}

.competition-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.competition-name {
  overflow: hidden;
  color: #0f172a;
  font-size: 26rpx;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.competition-meta {
  margin-top: 7rpx;
  color: #7c8b98;
  font-size: 20rpx;
}

.competition-action {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: #0f766e;
  font-size: 22rpx;
  font-weight: 600;
}

.competition-empty,
.empty-block,
.record-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 34rpx 20rpx;
  color: #94a3b8;
  font-size: 22rpx;
}

.competition-empty {
  margin-top: 16rpx;
  border: 1rpx dashed #d7e1dd;
  border-radius: 14rpx;
}

.person-card {
  margin-bottom: 16rpx;
  overflow: hidden;
}

.person-head {
  display: flex;
  align-items: center;
  padding: 22rpx;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  background: #e7f5f1;
  color: #0f766e;
  font-size: 28rpx;
  font-weight: 700;
}

.person-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-left: 18rpx;
}

.person-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.person-name {
  overflow: hidden;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-gh {
  flex-shrink: 0;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 18rpx;
}

.person-college {
  margin-top: 5rpx;
  overflow: hidden;
  color: #7c8b98;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1rpx solid #edf2f0;
  background: #f8faf9;
}

.person-stat {
  padding: 18rpx 22rpx;
  border-right: 1rpx solid #e7eeeb;
}

.person-stat:last-child {
  border-right: 0;
}

.person-stat-label {
  display: inline-block;
  margin-right: 10rpx;
  padding: 2rpx 8rpx;
  border-radius: 5rpx;
  background: #e2f1ec;
  color: #0f766e;
  font-size: 17rpx;
}

.person-stat-main {
  color: #0f172a;
  font-size: 23rpx;
  font-weight: 650;
}

.person-stat-sub {
  display: block;
  margin-top: 7rpx;
  color: #64748b;
  font-size: 20rpx;
}

.record-panel {
  padding: 0 22rpx 18rpx;
  border-top: 1rpx solid #edf2f0;
}

.record-tabs {
  display: flex;
  gap: 28rpx;
  padding: 18rpx 0 14rpx;
}

.record-tab {
  position: relative;
  padding-bottom: 10rpx;
  color: #64748b;
  font-size: 22rpx;
  font-weight: 600;
}

.record-tab.active {
  color: #0f766e;
}

.record-tab.active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3rpx;
  border-radius: 2rpx;
  background: #0f766e;
}

.record-list {
  border-top: 1rpx solid #edf2f0;
}

.record-item {
  padding: 18rpx 0;
  border-bottom: 1rpx solid #edf2f0;
}

.record-item:last-child {
  border-bottom: 0;
}

.record-line,
.record-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-project {
  color: #334155;
  font-size: 21rpx;
  font-weight: 650;
}

.record-score {
  color: #0f766e;
  font-size: 23rpx;
  font-weight: 700;
}

.record-title {
  display: block;
  margin-top: 7rpx;
  overflow: hidden;
  color: #0f172a;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta-row {
  margin-top: 7rpx;
  color: #94a3b8;
  font-size: 19rpx;
}

.summary-note {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin: 24rpx 28rpx 0;
  color: #64748b;
  font-size: 20rpx;
  line-height: 1.6;
}

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  margin: 32rpx 24rpx;
  padding: 80rpx 24rpx;
  border: 1rpx solid #e1e9e6;
  border-radius: 14rpx;
  background: #ffffff;
  color: #94a3b8;
  font-size: 23rpx;
}

.error-state {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.retry-text {
  color: #0f766e;
  font-weight: 600;
}

.loading-ring {
  width: 38rpx;
  height: 38rpx;
  border: 4rpx solid #dce7e3;
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 360px) {
  .metric-value {
    font-size: 24rpx;
  }

  .metric-label {
    font-size: 17rpx;
  }
}
</style>
