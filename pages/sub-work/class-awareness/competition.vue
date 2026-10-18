<template>
  <view class="page">
    <view v-if="phase === 'loading'" class="state-card">
      <view class="loading-ring" />
      <text class="state-title">正在识别辅导员身份</text>
      <text class="state-copy">微信账号已绑定，正在匹配带班信息</text>
    </view>

    <view v-else-if="phase === 'error'" class="state-card">
      <view class="error-mark">!</view>
      <text class="state-title">暂时无法进入赛事</text>
      <text class="state-copy">{{ errorMessage }}</text>
    </view>

    <view v-else-if="phase === 'waiting'" class="state-card waiting-card">
      <view class="session-tag">{{ session.scopeType === 'school' ? '校级赛事' : '院级赛事' }}</view>
      <text class="session-title">{{ session.title }}</text>
      <view class="identity-card">
        <text class="identity-label">已识别辅导员</text>
        <text class="identity-name">{{ player.playerName }}</text>
        <text class="identity-college">{{ player.collegeName }}</text>
      </view>
      <text class="wait-title">{{ session.status === 'open' ? '等待主持人开始比赛' : '赛事即将开始' }}</text>
      <view class="wait-metrics">
        <view><text>{{ session.participantCount || 0 }}</text><text>已入场</text></view>
        <view><text>{{ session.studentCount }}</text><text>学生数</text></view>
        <view><text>{{ formatTime(session.timeLimit) }}</text><text>限时</text></view>
      </view>
    </view>

    <view v-else-if="phase === 'quiz'" class="quiz">
      <view class="quiz-head">
        <view>
          <text class="eyebrow">当前进度</text>
          <text class="progress-number">{{ currentIndex + 1 }}<text>/{{ questions.length }}</text></text>
        </view>
        <view class="timer" :class="{ urgent: remainTime <= 60 }">
          <text>剩余时间</text>
          <text>{{ formatTime(remainTime) }}</text>
        </view>
      </view>
      <view class="progress-track"><view :style="{ width: progress + '%' }" /></view>
      <view class="photo-wrap">
        <image v-if="currentQuestion.studentPhoto" :src="photoUrl(currentQuestion.studentPhoto)" mode="aspectFill" class="photo" />
        <view v-else class="photo-empty">暂无照片</view>
      </view>
      <view class="dots">
        <view v-for="(item, index) in questions" :key="item.questionId"
              :class="['dot', currentIndex === index ? 'current' : '', isAnswered(index) ? 'answered' : '']"
              @click="goTo(index)">{{ index + 1 }}</view>
      </view>
      <view class="form">
        <view class="field">
          <text>班级</text>
          <input v-model="answers[currentIndex].answerClass" placeholder="请输入班级名称" />
        </view>
        <view class="field">
          <text>姓名</text>
          <input v-model="answers[currentIndex].answerName" placeholder="请输入学生姓名" />
        </view>
        <view class="field">
          <text>籍贯</text>
          <input v-model="answers[currentIndex].answerHometown" placeholder="例如：浙江杭州" />
        </view>
        <view class="field">
          <text>宿舍</text>
          <input v-model="answers[currentIndex].answerDorm" placeholder="请输入宿舍号" />
        </view>
        <view class="field">
          <text>职务</text>
          <input v-model="answers[currentIndex].answerCadre" placeholder="无职务可留空" />
        </view>
      </view>
      <view class="actions">
        <button class="ghost-btn" :disabled="currentIndex === 0" @click="previous">上一位</button>
        <button v-if="currentIndex < questions.length - 1" class="primary-btn" @click="next">下一位</button>
        <button v-else class="primary-btn" :loading="submitting" @click="submit">提交答卷</button>
      </view>
    </view>

    <view v-else-if="phase === 'result'" class="result">
      <view class="result-card">
        <text class="eyebrow">答题完成</text>
        <text class="result-name">{{ result.playerName }}</text>
        <view class="score"><text>{{ result.finalScore || 0 }}</text><text>最终得分</text></view>
        <view class="result-metrics">
          <view><text>{{ result.correctCount || 0 }}/{{ result.totalQuestions }}</text><text>完全正确</text></view>
          <view><text>{{ result.accuracyRate || 0 }}%</text><text>字段正确率</text></view>
          <view><text>{{ formatTime(result.timeSpent) }}</text><text>答题用时</text></view>
        </view>
      </view>
      <view class="review-card">
        <text class="review-title">作答明细</text>
        <view v-for="(item, index) in result.answers || []" :key="item.answerId" class="review-item">
          <view class="review-head">
            <text>{{ pad(index + 1) }}</text>
            <text>{{ item.studentName }}</text>
            <text :class="item.isCorrect === '1' ? 'right' : 'wrong'">{{ item.correctFields }}/5</text>
          </view>
          <view class="review-fields">
            <text>班级</text><text>{{ item.correctClassName }}</text>
            <text>姓名</text><text>{{ item.studentName }}</text>
            <text>籍贯</text><text>{{ item.correctHometown }}</text>
            <text>宿舍</text><text>{{ item.correctDorm }}</text>
            <text>职务</text><text>{{ item.correctCadre || '无' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getCompetitionSession,
  joinAutoSession,
  getCompetitionPlayer,
  startCompetitionPlayer,
  updateCompetitionProgress,
  submitCompetitionPlayer
} from '@/api/counselor/classAwareness'
import config from '@/config'

export default {
  name: 'ClassAwarenessCompetition',
  data() {
    return {
      phase: 'loading',
      errorMessage: '',
      sessionCode: '',
      session: {},
      player: {},
      playerToken: '',
      questions: [],
      answers: [],
      currentIndex: 0,
      remainTime: 0,
      timer: null,
      pollTimer: null,
      submitting: false,
      result: {}
    }
  },
  computed: {
    currentQuestion() {
      return this.questions[this.currentIndex] || {}
    },
    progress() {
      if (!this.questions.length) return 0
      return Math.round((this.currentIndex + 1) * 100 / this.questions.length)
    }
  },
  onLoad(options) {
    const scene = options.scene ? decodeURIComponent(options.scene) : ''
    this.sessionCode = String(options.code || scene || '').trim().toUpperCase()
    this.loadPage()
  },
  onUnload() {
    this.stopTimers()
  },
  methods: {
    async loadPage() {
      if (!this.sessionCode) {
        this.fail('赛事码不存在')
        return
      }
      try {
        const sessionRes = await getCompetitionSession(this.sessionCode)
        this.session = sessionRes.data
        const savedToken = uni.getStorageSync(this.playerStorageKey())
        if (savedToken) {
          try {
            const playerRes = await getCompetitionPlayer(savedToken)
            if (Number(playerRes.data.sessionId) === Number(this.session.sessionId)) {
              this.player = playerRes.data
              this.playerToken = savedToken
              this.resumeByStatus()
              return
            }
          } catch (error) {
            uni.removeStorageSync(this.playerStorageKey())
          }
        }
        const joinRes = await joinAutoSession(this.sessionCode)
        this.player = joinRes.data
        this.playerToken = joinRes.data.playerToken
        uni.setStorageSync(this.playerStorageKey(), this.playerToken)
        this.resumeByStatus()
      } catch (error) {
        this.fail(error)
      }
    },
    resumeByStatus() {
      if (this.player.status === 'submitted') {
        this.result = this.player
        this.phase = 'result'
        return
      }
      if (this.player.status === 'answering') {
        this.beginQuiz()
        return
      }
      this.phase = 'waiting'
      this.startPoll()
    },
    startPoll() {
      this.stopPoll()
      this.pollTimer = setInterval(async () => {
        try {
          const response = await getCompetitionSession(this.sessionCode)
          this.session = response.data
          if (this.session.status === 'running') {
            this.stopPoll()
            this.beginQuiz()
          }
          if (this.session.status === 'finished') {
            this.fail('赛事已结束')
          }
        } catch (error) {
          this.fail(error)
        }
      }, 2000)
    },
    async beginQuiz() {
      if (this.phase === 'quiz') return
      try {
        const response = await startCompetitionPlayer(this.playerToken)
        this.session = response.data.session
        this.player = response.data.player
        this.questions = response.data.questions || []
        const saved = uni.getStorageSync(this.answerStorageKey())
        this.answers = this.questions.map((item, index) => saved && saved[index] ? saved[index] : {
          answerClass: '', answerName: '', answerHometown: '', answerDorm: '', answerCadre: ''
        })
        this.phase = 'quiz'
        this.startTimer()
      } catch (error) {
        this.fail(error)
      }
    },
    startTimer() {
      this.stopTimer()
      this.tickTimer()
      this.timer = setInterval(this.tickTimer, 1000)
    },
    tickTimer() {
      const startedAt = this.parseDate(this.player.startedAt)
      const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0
      this.remainTime = Math.max(0, Number(this.session.timeLimit || 0) - elapsed)
      if (this.remainTime <= 0 && this.phase === 'quiz' && !this.submitting) this.submit()
    },
    previous() {
      if (this.currentIndex <= 0) return
      this.saveAnswers()
      this.currentIndex--
      this.reportProgress()
    },
    next() {
      if (this.currentIndex >= this.questions.length - 1) return
      this.saveAnswers()
      this.currentIndex++
      this.reportProgress()
    },
    goTo(index) {
      this.saveAnswers()
      this.currentIndex = index
      this.reportProgress()
    },
    saveAnswers() {
      uni.setStorageSync(this.answerStorageKey(), this.answers)
    },
    reportProgress() {
      this.saveAnswers()
      updateCompetitionProgress(this.playerToken, {
        currentIndex: this.currentIndex,
        answeredCount: this.answers.filter((answer, index) => this.isAnswered(index)).length
      }).catch(() => {})
    },
    async submit() {
      if (this.submitting) return
      this.submitting = true
      this.stopTimer()
      const payload = {
        answers: this.answers.map((answer, index) => ({
          ...answer,
          questionId: this.questions[index].questionId,
          timeSpent: 0
        }))
      }
      try {
        const response = await submitCompetitionPlayer(this.playerToken, payload)
        this.result = response.data
        this.phase = 'result'
        uni.removeStorageSync(this.answerStorageKey())
        this.stopTimers()
      } catch (error) {
        uni.showToast({ title: error || '提交失败', icon: 'none' })
        this.startTimer()
      } finally {
        this.submitting = false
      }
    },
    isAnswered(index) {
      const answer = this.answers[index] || {}
      return !!(answer.answerClass || answer.answerName || answer.answerHometown || answer.answerDorm || answer.answerCadre)
    },
    photoUrl(path) {
      if (!path) return ''
      if (/^(https?:\/\/|data:|blob:)/i.test(path)) return path
      return config.baseUrl + path
    },
    parseDate(value) {
      return value ? new Date(String(value).replace(/-/g, '/')) : null
    },
    formatTime(seconds) {
      const value = Math.max(0, Number(seconds || 0))
      return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0')
    },
    pad(value) {
      return String(value).padStart(2, '0')
    },
    stopTimer() {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
    },
    stopPoll() {
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = null
    },
    stopTimers() {
      this.stopTimer()
      this.stopPoll()
    },
    playerStorageKey() {
      return 'class_awareness_competition_player_' + this.sessionCode
    },
    answerStorageKey() {
      return 'class_awareness_competition_answers_' + this.playerToken
    },
    fail(error) {
      this.errorMessage = typeof error === 'string' ? error : ((error && error.message) || '请检查赛事码')
      this.phase = 'error'
      this.stopTimers()
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; box-sizing: border-box; background: #f3f5f2; color: #17211e; }
.state-card { margin-top: 18vh; padding: 60rpx 36rpx; text-align: center; background: #fff; border: 1rpx solid #e1e7e2; }
.state-title { display: block; margin-top: 28rpx; font-size: 34rpx; font-weight: 600; }
.state-copy { display: block; margin-top: 14rpx; color: #84908a; font-size: 24rpx; line-height: 1.7; }
.loading-ring { width: 66rpx; height: 66rpx; margin: 0 auto; border: 4rpx solid #e0ebe5; border-top-color: #15705b; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-mark { width: 62rpx; height: 62rpx; margin: 0 auto; border: 1rpx solid #d5a24d; color: #b47b1b; font-size: 38rpx; line-height: 62rpx; }
.waiting-card { margin-top: 8vh; text-align: left; }
.session-tag { color: #15705b; font-size: 20rpx; font-weight: 600; letter-spacing: 2rpx; }
.session-title { display: block; margin-top: 12rpx; font-size: 38rpx; font-weight: 600; line-height: 1.45; }
.identity-card { margin: 34rpx 0; padding: 28rpx; border: 1rpx solid #cfe2d8; background: #f2f8f5; }
.identity-label { display: block; color: #7d8b84; font-size: 22rpx; }
.identity-name { display: block; margin-top: 8rpx; font-size: 38rpx; font-weight: 600; }
.identity-college { display: block; margin-top: 4rpx; color: #5e6d66; font-size: 24rpx; }
.wait-title { display: block; margin-top: 22rpx; font-size: 28rpx; font-weight: 500; }
.wait-metrics { display: flex; margin-top: 28rpx; border-top: 1rpx solid #e2e8e4; border-bottom: 1rpx solid #e2e8e4; }
.wait-metrics view { flex: 1; padding: 22rpx 4rpx; text-align: center; border-right: 1rpx solid #e2e8e4; }
.wait-metrics view:last-child { border-right: 0; }
.wait-metrics text { display: block; }
.wait-metrics text:first-child { font-size: 34rpx; font-weight: 600; }
.wait-metrics text:last-child { margin-top: 4rpx; color: #89958f; font-size: 20rpx; }
.quiz { padding-bottom: 32rpx; }
.quiz-head { display: flex; align-items: flex-end; justify-content: space-between; padding: 10rpx 4rpx 18rpx; }
.eyebrow { display: block; color: #15705b; font-size: 20rpx; letter-spacing: 2rpx; }
.progress-number { display: block; margin-top: 4rpx; font-size: 52rpx; }
.progress-number text { color: #96a19b; font-size: 28rpx; }
.timer { text-align: right; }
.timer text { display: block; }
.timer text:first-child { color: #8b9690; font-size: 20rpx; }
.timer text:last-child { margin-top: 4rpx; font-size: 34rpx; font-weight: 500; }
.timer.urgent text:last-child { color: #b54e42; }
.progress-track { height: 4rpx; overflow: hidden; background: #dfe6e1; }
.progress-track view { height: 100%; background: #15705b; }
.photo-wrap { height: 520rpx; margin-top: 24rpx; overflow: hidden; background: #e8ede9; }
.photo { width: 100%; height: 100%; }
.photo-empty { height: 100%; color: #8b9690; font-size: 26rpx; line-height: 520rpx; text-align: center; }
.dots { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 16rpx 0 24rpx; }
.dot { width: 56rpx; height: 48rpx; border: 1rpx solid #d9e1dc; color: #7e8a84; font-size: 20rpx; line-height: 48rpx; text-align: center; background: #fff; }
.dot.answered { color: #15705b; border-color: #9bc7b5; background: #eff7f3; }
.dot.current { color: #fff; border-color: #15705b; background: #15705b; }
.form { padding: 28rpx; background: #fff; border: 1rpx solid #e1e7e2; }
.field { margin-bottom: 24rpx; }
.field:last-child { margin-bottom: 0; }
.field text { display: block; margin-bottom: 10rpx; color: #53615b; font-size: 24rpx; font-weight: 600; }
.field input { height: 82rpx; padding: 0 22rpx; border: 1rpx solid #d5ddd7; background: #fafbf9; font-size: 28rpx; box-sizing: border-box; }
.actions { display: flex; gap: 18rpx; margin-top: 28rpx; }
.actions button { flex: 1; height: 86rpx; border-radius: 0; font-size: 28rpx; line-height: 86rpx; }
.ghost-btn { color: #425149; border: 1rpx solid #cad4cd; background: #fff; }
.primary-btn { color: #fff; border: 1rpx solid #15705b; background: #15705b; }
.result-card, .review-card { padding: 34rpx 28rpx; background: #fff; border: 1rpx solid #e1e7e2; }
.result-name { display: block; margin-top: 10rpx; font-size: 38rpx; font-weight: 600; }
.score { width: 220rpx; height: 220rpx; margin: 32rpx auto; border: 1rpx solid #a8cdbd; border-radius: 50%; text-align: center; box-shadow: inset 0 0 0 12rpx #f1f8f4; }
.score text { display: block; }
.score text:first-child { margin-top: 62rpx; color: #15705b; font-size: 62rpx; line-height: 1; }
.score text:last-child { margin-top: 12rpx; color: #7e8a84; font-size: 22rpx; }
.result-metrics { display: flex; border-top: 1rpx solid #e2e8e4; border-bottom: 1rpx solid #e2e8e4; }
.result-metrics view { flex: 1; padding: 20rpx 4rpx; text-align: center; border-right: 1rpx solid #e2e8e4; }
.result-metrics view:last-child { border-right: 0; }
.result-metrics text { display: block; }
.result-metrics text:first-child { font-size: 28rpx; font-weight: 600; }
.result-metrics text:last-child { margin-top: 4rpx; color: #89958f; font-size: 20rpx; }
.review-card { margin-top: 24rpx; }
.review-title { display: block; margin-bottom: 12rpx; font-size: 30rpx; font-weight: 600; }
.review-item { padding: 22rpx 0; border-top: 1rpx solid #e7ece8; }
.review-head { display: flex; align-items: center; gap: 18rpx; }
.review-head text:first-child { color: #9aa49f; font-size: 20rpx; }
.review-head text:nth-child(2) { flex: 1; font-size: 28rpx; font-weight: 600; }
.review-head text:last-child { font-size: 22rpx; }
.right { color: #15705b; }
.wrong { color: #b54e42; }
.review-fields { display: grid; grid-template-columns: 80rpx 1fr; gap: 8rpx 12rpx; margin-top: 16rpx; color: #596760; font-size: 22rpx; }
.review-fields text:nth-child(odd) { color: #96a09b; }
</style>
