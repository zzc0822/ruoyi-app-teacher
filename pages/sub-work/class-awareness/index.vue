<template>
  <view class="container">
    <!-- 未开始状态 -->
    <view v-if="!started" class="start-section">
      <view class="title">班情熟知</view>
      <view class="desc">从您所带班级中随机抽取{{ studentCount }}名学生，根据照片识别学生的班级、姓名、籍贯、宿舍和干部职务。</view>
      <view class="mode-section">
        <view class="mode-label">答题模式</view>
        <view class="mode-btns">
          <view :class="['mode-btn', mode==='training'?'active':'']" @click="selectMode('training')">训练模式</view>
          <view :class="['mode-btn', mode==='competition'?'active':'']" @click="selectMode('competition')">竞赛模式</view>
        </view>
        <view class="mode-tip" v-if="mode==='training'">训练模式只显示正确率，不计分</view>
        <view class="mode-tip" v-if="mode==='competition'">竞赛模式根据时间系数×难度系数计算得分并排名</view>
        <view v-if="mode==='competition'" class="competition-picker-block">
          <view class="picker-label">选择比赛</view>
          <picker
            mode="selector"
            :range="competitionOptions"
            range-key="compName"
            :value="selectedCompetitionIndex"
            :disabled="!competitionOptions.length"
            @change="handleCompetitionChange"
          >
            <view :class="['competition-picker', selectedCompetition ? 'has-value' : '']">
              <text>{{ competitionPickerText }}</text>
              <uni-icons type="down" size="15" color="#64748b"></uni-icons>
            </view>
          </picker>
          <view v-if="!compLoading && !competitionOptions.length" class="picker-empty">
            当前没有可参加的班情熟知比赛
          </view>
        </view>
      </view>
      <view class="config-info">
        <text>答题人数：{{ studentCount }}人</text>
        <text>限时：{{ timeLimit }}秒</text>
        <text>难度系数：{{ difficultyCoeff }}</text>
      </view>
      <button class="start-btn" @click="handleStart" :loading="loading">开始答题</button>
      <!-- 历史记录入口 -->
      <view class="history-link" @click="goHistory">查看历史记录</view>
    </view>

    <!-- 答题中 -->
    <view v-else-if="started && !finished" class="quiz-section">
      <view class="quiz-header">
        <text class="quiz-progress">{{ currentIndex + 1 }}/{{ details.length }}</text>
        <text class="quiz-timer" :class="{'timer-warn': remainTime < 60}">剩余 {{ formatTime(remainTime) }}</text>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: ((currentIndex + 1) / details.length * 100) + '%' }"></view>
      </view>

      <!-- 学生照片 -->
      <view class="photo-section">
        <image v-if="currentDetail.studentPhoto" :src="getPhotoUrl(currentDetail.studentPhoto)" mode="aspectFill" class="student-photo" />
        <view v-else class="no-photo">暂无照片</view>
      </view>

      <!-- 答题表单 -->
      <view class="answer-section">
        <view class="answer-item">
          <text class="label">班级</text>
          <input class="input" v-model="currentAnswer.answerClass" placeholder="请输入班级名称" />
        </view>
        <view class="answer-item">
          <text class="label">姓名</text>
          <input class="input" v-model="currentAnswer.answerName" placeholder="请输入学生姓名" />
        </view>
        <view class="answer-item">
          <text class="label">籍贯</text>
          <input class="input" v-model="currentAnswer.answerHometown" placeholder="请输入籍贯(如:浙江杭州)" />
        </view>
        <view class="answer-item">
          <text class="label">宿舍</text>
          <input class="input" v-model="currentAnswer.answerDorm" placeholder="请输入宿舍号" />
        </view>
        <view class="answer-item">
          <text class="label">干部职务</text>
          <input class="input" v-model="currentAnswer.answerCadre" placeholder="如班长/团支书/无则留空" />
        </view>
      </view>

      <!-- 导航按钮 -->
      <view class="nav-btns">
        <button class="nav-btn prev" @click="prevStudent" :disabled="currentIndex <= 0">上一位</button>
        <button v-if="currentIndex < details.length - 1" class="nav-btn next" @click="nextStudent">下一位</button>
        <button v-else class="nav-btn submit" @click="handleSubmit" :loading="submitting">提交答案</button>
      </view>

      <!-- 题目导航 -->
      <view class="question-nav">
        <view v-for="(d, idx) in details" :key="idx"
          :class="['q-dot', idx === currentIndex ? 'current' : '', answers[idx] && answers[idx].answerName ? 'answered' : '']"
          @click="goTo(idx)">{{ idx + 1 }}</view>
      </view>
    </view>

    <!-- 结果页 -->
    <view v-else class="result-section">
      <view class="result-title">答题完成</view>
      <view class="result-card">
        <view class="result-row">
          <text class="result-label">正确率</text>
          <text class="result-value highlight">{{ result.accuracyRate }}%</text>
        </view>
        <view class="result-row">
          <text class="result-label">完全正确</text>
          <text class="result-value">{{ result.correctCount }}/{{ result.totalStudents }}人</text>
        </view>
        <view class="result-row">
          <text class="result-label">用时</text>
          <text class="result-value">{{ formatTime(result.timeSpent) }}</text>
        </view>
        <view v-if="mode === 'competition'" class="result-row">
          <text class="result-label">时间系数</text>
          <text class="result-value">{{ result.timeCoeff }}</text>
        </view>
        <view v-if="mode === 'competition'" class="result-row">
          <text class="result-label">难度系数</text>
          <text class="result-value">{{ result.difficultyCoeff }}</text>
        </view>
        <view v-if="mode === 'competition'" class="result-row">
          <text class="result-label">最终得分</text>
          <text class="result-value highlight">{{ result.finalScore }}</text>
        </view>
      </view>

      <!-- 答题明细 -->
      <view class="detail-section">
        <view class="detail-title">答题明细</view>
        <view v-for="(d, idx) in resultDetails" :key="idx" class="detail-item">
          <view class="detail-header">
            <text class="detail-name">{{ d.studentName }}</text>
            <text :class="['detail-status', d.isCorrect === '1' ? 'correct' : 'wrong']">
              {{ d.isCorrect === '1' ? '✓ 正确' : '✗ 答错' }} ({{ d.correctFields }}/5)
            </text>
          </view>
          <view class="detail-fields">
            <view class="field-row">
              <text class="field-label">班级:</text>
              <text :class="['field-val', eq(d.correctClassName, d.answerClass) ? 'right' : 'wrong']">{{ d.answerClass || '未答' }}</text>
              <text v-if="!eq(d.correctClassName, d.answerClass)" class="correct-ans">正确: {{ d.correctClassName }}</text>
            </view>
            <view class="field-row">
              <text class="field-label">姓名:</text>
              <text :class="['field-val', eq(d.correctClassName, d.answerClass) ? 'right' : 'wrong']">{{ d.answerName || '未答' }}</text>
              <text v-if="!eq(d.studentName, d.answerName)" class="correct-ans">正确: {{ d.studentName }}</text>
            </view>
            <view class="field-row">
              <text class="field-label">籍贯:</text>
              <text :class="['field-val', eq(d.correctHometown, d.answerHometown) ? 'right' : 'wrong']">{{ d.answerHometown || '未答' }}</text>
              <text v-if="!eq(d.correctHometown, d.answerHometown)" class="correct-ans">正确: {{ d.correctHometown }}</text>
            </view>
            <view class="field-row">
              <text class="field-label">宿舍:</text>
              <text :class="['field-val', eq(d.correctDorm, d.answerDorm) ? 'right' : 'wrong']">{{ d.answerDorm || '未答' }}</text>
              <text v-if="!eq(d.correctDorm, d.answerDorm)" class="correct-ans">正确: {{ d.correctDorm }}</text>
            </view>
            <view class="field-row">
              <text class="field-label">干部:</text>
              <text :class="['field-val', eq(d.correctCadre, d.answerCadre) ? 'right' : 'wrong']">{{ d.answerCadre || '未答' }}</text>
              <text v-if="!eq(d.correctCadre, d.answerCadre)" class="correct-ans">正确: {{ d.correctCadre || '无' }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="result-btns">
        <button v-if="mode==='training'" class="retry-btn" @click="retry">再来一次</button>
        <button class="back-btn" @click="goBack">{{ mode==='competition' ? '返回训练平台' : '返回首页' }}</button>
      </view>
    </view>
  </view>
</template>

<script>
import { startQuiz, submitQuiz, getDetail, getConfig } from '@/api/counselor/classAwareness'
import { getAvailableCompetitions } from '@/api/counselor/training'
import config from '@/config'

export default {
  name: 'ClassAwareness',
  data() {
    return {
      mode: 'training',
      compId: null,
      compName: '',
      competitionOptions: [],
      selectedCompetition: null,
      compLoading: false,
      studentCount: 20,
      timeLimit: 600,
      difficultyCoeff: 1.0,
      started: false,
      finished: false,
      loading: false,
      submitting: false,
      awarenessId: null,
      details: [],
      answers: [],
      currentIndex: 0,
      currentAnswer: {},
      result: {},
      resultDetails: [],
      remainTime: 600,
      timer: null,
      startTime: null
    }
  },
  computed: {
    selectedCompetitionIndex() {
      const index = this.competitionOptions.findIndex(item => String(item.compId) === String(this.compId))
      return index < 0 ? 0 : index
    },
    competitionPickerText() {
      if (this.selectedCompetition) return this.selectedCompetition.compName
      if (this.compLoading) return '正在加载比赛...'
      return '请选择进行中的比赛'
    }
  },
  onLoad(options) {
    if (options.compId) this.compId = options.compId
    if (options.compName) this.compName = decodeURIComponent(options.compName)
    this.mode = options.mode === 'competition' || options.compId ? 'competition' : 'training'
    this.loadConfig()
    this.loadCompetitions()
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    async loadConfig() {
      try {
        const res = await getConfig()
        if (res.code === 200 && res.data) {
          this.timeLimit = Number(res.data.timeLimit || this.timeLimit)
          this.studentCount = Number(res.data.studentCount || this.studentCount)
          this.difficultyCoeff = Number(res.data.difficultyCoeff || this.difficultyCoeff)
          this.remainTime = this.timeLimit
        }
      } catch (e) {
        // Keep the platform defaults when the rule configuration is unavailable.
      }
    },

    async loadCompetitions() {
      this.compLoading = true
      try {
        const res = await getAvailableCompetitions()
        const rows = Array.isArray(res.data) ? res.data : []
        this.competitionOptions = rows.filter(item =>
          String(item.projectCodes || item.compType || '')
            .split(',')
            .map(code => code.trim())
            .includes('class_awareness')
        )
        this.selectedCompetition = this.competitionOptions.find(item =>
          String(item.compId) === String(this.compId)
        ) || null
        if (this.selectedCompetition) {
          this.compId = this.selectedCompetition.compId
          this.compName = this.selectedCompetition.compName
        }
      } catch (e) {
        this.competitionOptions = []
        this.selectedCompetition = null
      }
      this.compLoading = false
    },

    selectMode(nextMode) {
      this.mode = nextMode
      if (nextMode === 'training') {
        this.compId = null
        this.compName = ''
        this.selectedCompetition = null
      } else if (!this.competitionOptions.length) {
        this.loadCompetitions()
      }
    },

    handleCompetitionChange(event) {
      const selected = this.competitionOptions[Number(event.detail.value)]
      if (!selected) return
      this.selectedCompetition = selected
      this.compId = selected.compId
      this.compName = selected.compName
    },

    async handleStart() {
      if (this.mode === 'competition' && !this.compId) {
        uni.showToast({ title: '请先选择比赛', icon: 'none' })
        return
      }
      this.loading = true
      try {
        const res = await startQuiz({
          compId: this.mode === 'competition' ? this.compId : undefined,
          mode: this.mode
        })
        if (res.code === 200) {
          this.awarenessId = res.data.awarenessId
          this.details = res.data.details || []
          this.studentCount = this.details.length
          this.answers = this.details.map(() => ({ answerClass: '', answerName: '', answerHometown: '', answerDorm: '', answerCadre: '' }))
          this.currentIndex = 0
          this.currentAnswer = { ...this.answers[0] }
          this.started = true
          this.startTime = Date.now()
          this.remainTime = Number(this.timeLimit || 600)
          this.startTimer()
        } else {
          uni.showToast({ title: res.msg || '开始失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e || '请求失败', icon: 'none' })
      }
      this.loading = false
    },

    startTimer() {
      this.timer = setInterval(() => {
        this.remainTime--
        if (this.remainTime <= 0) {
          clearInterval(this.timer)
          this.handleSubmit()
        }
      }, 1000)
    },

    prevStudent() {
      this.saveCurrentAnswer()
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.currentAnswer = { ...this.answers[this.currentIndex] }
      }
    },

    nextStudent() {
      this.saveCurrentAnswer()
      if (this.currentIndex < this.details.length - 1) {
        this.currentIndex++
        this.currentAnswer = { ...this.answers[this.currentIndex] }
      }
    },

    goTo(idx) {
      this.saveCurrentAnswer()
      this.currentIndex = idx
      this.currentAnswer = { ...this.answers[idx] }
    },

    saveCurrentAnswer() {
      this.$set(this.answers, this.currentIndex, { ...this.currentAnswer })
    },

    async handleSubmit() {
      if (this.timer) clearInterval(this.timer)
      this.saveCurrentAnswer()
      this.submitting = true
      const timeSpent = Math.round((Date.now() - this.startTime) / 1000)
      const submitDetails = this.answers.map((a, idx) => ({
        detailId: this.details[idx].detailId,
        answerClass: a.answerClass,
        answerName: a.answerName,
        answerHometown: a.answerHometown,
        answerDorm: a.answerDorm,
        answerCadre: a.answerCadre,
        timeSpent: Math.round(timeSpent / this.details.length)
      }))
      try {
        const res = await submitQuiz({ awarenessId: this.awarenessId, timeSpent, details: submitDetails })
        if (res.code === 200) {
          this.result = res.data
          // 获取详情含正确答案
          const detailRes = await getDetail(this.awarenessId)
          if (detailRes.code === 200) {
            this.resultDetails = detailRes.data.details || []
          }
          this.finished = true
        } else {
          uni.showToast({ title: res.msg || '提交失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: e || '提交失败', icon: 'none' })
      }
      this.submitting = false
    },

    retry() {
      this.started = false
      this.finished = false
      this.details = []
      this.answers = []
      this.result = {}
      this.resultDetails = []
    },

    goBack() {
      uni.navigateBack()
    },

    goHistory() {
      uni.navigateTo({ url: '/pages/sub-work/class-awareness/history' })
    },

    getPhotoUrl(path) {
      if (!path) return ''
      if (path.startsWith('http')) return path
      return config.baseUrl + path
    },

    formatTime(seconds) {
      if (!seconds) return '00:00'
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
    },

    eq(a, b) {
      return (a || '').trim() === (b || '').trim()
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f5f5; min-height: 100vh; }
.title { font-size: 40rpx; font-weight: bold; text-align: center; margin: 30rpx 0 10rpx; }
.desc { font-size: 28rpx; color: #666; text-align: center; margin-bottom: 40rpx; padding: 0 30rpx; }
.mode-section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 30rpx; }
.mode-label { font-size: 30rpx; font-weight: bold; margin-bottom: 20rpx; }
.mode-btns { display: flex; gap: 20rpx; }
.mode-btn { flex: 1; text-align: center; padding: 20rpx; border-radius: 12rpx; background: #f0f0f0; font-size: 28rpx; }
.mode-btn.active { background: #409eff; color: #fff; }
.mode-tip { font-size: 24rpx; color: #999; margin-top: 15rpx; }
.competition-picker-block { margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #eef2f7; }
.picker-label { margin-bottom: 12rpx; color: #475569; font-size: 24rpx; font-weight: 600; }
.competition-picker { display: flex; align-items: center; justify-content: space-between; min-height: 76rpx; padding: 0 22rpx; border: 1rpx solid #dbe5e1; border-radius: 12rpx; background: #f8fafc; color: #94a3b8; font-size: 26rpx; box-sizing: border-box; }
.competition-picker.has-value { border-color: #9bd3c8; background: #f0fdfa; color: #0f766e; }
.picker-empty { margin-top: 12rpx; color: #b45309; font-size: 22rpx; }
.config-info { display: flex; justify-content: space-around; background: #fff; border-radius: 16rpx; padding: 25rpx; margin-bottom: 40rpx; font-size: 26rpx; color: #666; }
.start-btn { background: #409eff; color: #fff; border-radius: 50rpx; font-size: 32rpx; height: 88rpx; line-height: 88rpx; }
.history-link { text-align: center; color: #409eff; font-size: 28rpx; margin-top: 30rpx; }

.quiz-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 10rpx; }
.quiz-progress { font-size: 30rpx; font-weight: bold; }
.quiz-timer { font-size: 30rpx; color: #333; }
.timer-warn { color: #e6302e; font-weight: bold; }
.progress-bar { height: 8rpx; background: #e0e0e0; border-radius: 4rpx; margin-bottom: 30rpx; }
.progress-fill { height: 100%; background: #409eff; border-radius: 4rpx; transition: width 0.3s; }

.photo-section { display: flex; justify-content: center; margin-bottom: 30rpx; }
.student-photo { width: 360rpx; height: 480rpx; border-radius: 16rpx; background: #eee; }
.no-photo { width: 360rpx; height: 480rpx; border-radius: 16rpx; background: #ddd; display: flex; align-items: center; justify-content: center; color: #999; font-size: 30rpx; }

.answer-section { background: #fff; border-radius: 16rpx; padding: 20rpx 30rpx; margin-bottom: 30rpx; }
.answer-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.answer-item:last-child { border-bottom: none; }
.label { width: 140rpx; font-size: 28rpx; color: #333; flex-shrink: 0; }
.input { flex: 1; font-size: 28rpx; height: 60rpx; }

.nav-btns { display: flex; gap: 20rpx; margin-bottom: 30rpx; }
.nav-btn { flex: 1; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; font-size: 28rpx; text-align: center; }
.prev { background: #f0f0f0; color: #666; }
.next { background: #409eff; color: #fff; }
.submit { background: #67c23a; color: #fff; }

.question-nav { display: flex; flex-wrap: wrap; gap: 12rpx; justify-content: center; padding: 20rpx; }
.q-dot { width: 56rpx; height: 56rpx; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #666; }
.q-dot.current { background: #409eff; color: #fff; }
.q-dot.answered { background: #67c23a; color: #fff; }

.result-section { padding: 20rpx; }
.result-title { font-size: 36rpx; font-weight: bold; text-align: center; margin: 30rpx 0; }
.result-card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 30rpx; }
.result-row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.result-row:last-child { border-bottom: none; }
.result-label { font-size: 28rpx; color: #666; }
.result-value { font-size: 28rpx; font-weight: bold; }
.highlight { color: #409eff; font-size: 32rpx; }

.detail-section { margin-bottom: 30rpx; }
.detail-title { font-size: 30rpx; font-weight: bold; margin-bottom: 20rpx; }
.detail-item { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.detail-header { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.detail-name { font-weight: bold; font-size: 28rpx; }
.detail-status { font-size: 24rpx; }
.correct { color: #67c23a; }
.wrong { color: #e6302e; }
.field-row { display: flex; align-items: center; padding: 6rpx 0; font-size: 24rpx; }
.field-label { width: 100rpx; color: #999; }
.field-val { margin-right: 16rpx; }
.field-val.right { color: #67c23a; }
.field-val.wrong { color: #e6302e; }
.correct-ans { color: #67c23a; font-size: 22rpx; }

.result-btns { display: flex; gap: 20rpx; margin-top: 30rpx; padding-bottom: 60rpx; }
.retry-btn { flex: 1; background: #409eff; color: #fff; border-radius: 40rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.back-btn { flex: 1; background: #f0f0f0; color: #666; border-radius: 40rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
</style>
