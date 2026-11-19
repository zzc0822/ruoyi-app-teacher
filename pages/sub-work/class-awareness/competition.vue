<template>
  <view class="page" :class="{ 'page-quiz': phase === 'quiz' }">
    <view v-if="phase === 'loading'" class="state-card">
      <view class="loading-ring" />
      <text class="state-title">正在识别辅导员身份</text>
      <text class="state-copy">微信账号已绑定，正在匹配带班信息</text>
    </view>

    <view v-else-if="phase === 'error'" class="state-card">
      <view class="error-mark">!</view>
      <text class="state-title">暂时无法进入学院测试</text>
      <text class="state-copy">{{ errorMessage }}</text>
    </view>

    <view v-else-if="phase === 'waiting'" class="state-card waiting-card">
      <view class="session-tag">{{ session.scopeType === 'school' ? '学校测试' : '学院测试' }}</view>
      <text class="session-title">{{ session.title }}</text>
      <view class="identity-card">
        <text class="identity-label">已识别辅导员</text>
        <text class="identity-name">{{ player.playerName }}</text>
        <text class="identity-college">{{ player.collegeName }}</text>
      </view>
      <text class="wait-title">{{ session.status === 'open' ? '等待组织者开始测试' : '测试即将开始' }}</text>
      <view class="wait-metrics">
        <view><text>{{ session.participantCount || 0 }}</text><text>已入场</text></view>
        <view><text>{{ session.studentCount }}</text><text>学生数</text></view>
        <view><text>{{ session.timeLimit > 0 ? formatTime(session.timeLimit) : '不限时' }}</text><text>限时</text></view>
      </view>
    </view>

    <view v-else-if="phase === 'quiz'" class="quiz">
      <view class="quiz-top">
        <view class="quiz-progress">
          <text class="quiz-label">识别学生</text>
          <view class="quiz-count"><text class="quiz-current">{{ currentIndex + 1 }}</text><text class="quiz-total">/ {{ questions.length }}</text></view>
        </view>
        <view class="timer" :class="{ urgent: timeLimited && remainTime <= 60 }">
          <text class="timer-label">{{ timeLimited ? '剩余时间' : '已用时间' }}</text>
          <text class="timer-value">{{ formatTime(timeLimited ? remainTime : elapsed) }}</text>
        </view>
      </view>
      <view class="progress-track"><view class="progress-fill" :style="{ width: progress + '%' }" /></view>
      <view class="photo-card">
        <image v-if="currentQuestion.studentPhoto" :src="photoUrl(currentQuestion.studentPhoto)" mode="aspectFill" class="photo" />
        <view v-else class="photo-empty">暂无照片</view>
        <view class="photo-index">{{ pad(currentIndex + 1) }} / {{ pad(questions.length) }}</view>
      </view>
      <view class="form">
        <view class="field">
          <text class="field-label">班级</text>
          <input v-model="answers[currentIndex].answerClass" placeholder="请输入班级名称" />
        </view>
        <view class="field">
          <text class="field-label">姓名</text>
          <input v-model="answers[currentIndex].answerName" placeholder="请输入学生姓名" />
        </view>
        <view class="field">
          <text class="field-label">籍贯</text>
          <input v-model="answers[currentIndex].answerHometown" placeholder="例如：浙江杭州" />
        </view>
        <view class="field">
          <text class="field-label">宿舍</text>
          <input v-model="answers[currentIndex].answerDorm" placeholder="请输入宿舍号" />
        </view>
        <view class="field">
          <text class="field-label">职务</text>
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
      elapsed: 0,
      timer: null,
      pollTimer: null,
      submitting: false,
      result: {}
    }
  },
  computed: {
    timeLimited() { return Number((this.session && this.session.timeLimit) || 0) > 0 },
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
        this.fail('测试码不存在')
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
        const joined = joinRes && joinRes.data
        if (!joined || !joined.playerToken) {
          this.fail('身份识别失败，请重新扫码或从辅导员训练平台进入')
          return
        }
        this.player = joined
        this.playerToken = joined.playerToken
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
            this.fail('测试已结束')
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
        // 中途退出重进：定位到服务端的进度，计时仍按 startedAt 连续计算，不重新开始。
        this.currentIndex = Math.min(Number(this.player.currentIndex || 0), Math.max(this.questions.length - 1, 0))
        this.phase = 'quiz'
        this.startTimer()
        this.reportProgress()
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
      this.elapsed = elapsed
      this.remainTime = Math.max(0, Number(this.session.timeLimit || 0) - elapsed)
      if (this.timeLimited && this.remainTime <= 0 && this.phase === 'quiz' && !this.submitting) this.submit()
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
      this.errorMessage = typeof error === 'string' ? error : ((error && error.message) || '请检查测试码')
      this.phase = 'error'
      this.stopTimers()
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
  background: #f4f6f4;
  color: #16231d;
}
/* 答题阶段锁定为整屏，避免答题时出现整页滚动/回弹条 */
.page-quiz {
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-top: calc(20rpx + env(safe-area-inset-top));
}

/* 通用状态卡片 */
.state-card {
  margin-top: 16vh;
  padding: 64rpx 40rpx;
  text-align: center;
  background: #fff;
  border: 1rpx solid #e2e9e4;
  border-radius: 20rpx;
  box-shadow: 0 14rpx 40rpx rgba(21, 60, 46, 0.06);
}
.state-title { display: block; margin-top: 28rpx; font-size: 34rpx; font-weight: 600; }
.state-copy { display: block; margin-top: 14rpx; color: #84908a; font-size: 24rpx; line-height: 1.7; }
.loading-ring { width: 68rpx; height: 68rpx; margin: 0 auto; border: 5rpx solid #e2efe9; border-top-color: #15705b; border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-mark { width: 64rpx; height: 64rpx; margin: 0 auto; border: 1rpx solid #d5a24d; border-radius: 50%; color: #b47b1b; font-size: 38rpx; line-height: 62rpx; }

/* 等待入场 */
.waiting-card { margin-top: 8vh; text-align: left; }
.session-tag { display: inline-block; padding: 6rpx 16rpx; border-radius: 8rpx; color: #0f7660; background: #e6f5ee; font-size: 20rpx; font-weight: 600; letter-spacing: 2rpx; }
.session-title { display: block; margin-top: 16rpx; font-size: 38rpx; font-weight: 600; line-height: 1.45; }
.identity-card { margin: 34rpx 0; padding: 30rpx; border: 1rpx solid #cfe2d8; border-radius: 16rpx; background: #f2f8f5; }
.identity-label { display: block; color: #7d8b84; font-size: 22rpx; }
.identity-name { display: block; margin-top: 8rpx; font-size: 40rpx; font-weight: 600; }
.identity-college { display: block; margin-top: 6rpx; color: #5e6d66; font-size: 24rpx; }
.wait-title { display: block; margin-top: 22rpx; font-size: 28rpx; font-weight: 500; }
.wait-metrics { display: flex; margin-top: 28rpx; border-top: 1rpx solid #e2e8e4; border-bottom: 1rpx solid #e2e8e4; }
.wait-metrics view { flex: 1; padding: 22rpx 4rpx; text-align: center; border-right: 1rpx solid #e2e8e4; }
.wait-metrics view:last-child { border-right: 0; }
.wait-metrics text { display: block; }
.wait-metrics text:first-child { font-size: 34rpx; font-weight: 600; }
.wait-metrics text:last-child { margin-top: 4rpx; color: #89958f; font-size: 20rpx; }

/* 答题：整屏分区布局 */
.quiz {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.quiz-top { display: flex; align-items: center; justify-content: space-between; padding: 4rpx 6rpx 16rpx; }
.quiz-progress { display: flex; flex-direction: column; }
.quiz-label { display: block; color: #0f7660; font-size: 22rpx; font-weight: 600; letter-spacing: 2rpx; }
.quiz-count { display: flex; align-items: baseline; margin-top: 2rpx; }
.quiz-current { font-size: 54rpx; font-weight: 700; line-height: 1; }
.quiz-total { margin-left: 8rpx; color: #9aa5a0; font-size: 28rpx; }
.timer { padding: 10rpx 20rpx; border: 1rpx solid #d9e7df; border-radius: 12rpx; background: #fff; text-align: right; }
.timer-label { display: block; color: #8b9690; font-size: 20rpx; }
.timer-value { display: block; margin-top: 2rpx; font-size: 34rpx; font-weight: 600; font-variant-numeric: tabular-nums; }
.timer.urgent { border-color: #e7c2bc; background: #fdf3f1; }
.timer.urgent .timer-value { color: #b54e42; }
.progress-track { height: 6rpx; margin: 0 6rpx; overflow: hidden; border-radius: 6rpx; background: #dfe8e2; }
.progress-fill { height: 100%; border-radius: 6rpx; background: linear-gradient(90deg, #1f8a6e, #57c49b); transition: width 0.3s; }
.photo-card { position: relative; flex: 1; min-height: 0; margin-top: 20rpx; overflow: hidden; border-radius: 16rpx; background: #e7ece8; }
.photo { width: 100%; height: 100%; }
.photo-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #8b9690; font-size: 26rpx; }
.photo-index { position: absolute; right: 16rpx; bottom: 16rpx; padding: 6rpx 16rpx; border-radius: 20rpx; color: #fff; background: rgba(12, 35, 26, 0.62); font-size: 22rpx; font-variant-numeric: tabular-nums; }
.form {
  flex-shrink: 0;
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border: 1rpx solid #e2e9e4;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(21, 60, 46, 0.04);
}
.field { display: flex; align-items: center; margin-bottom: 14rpx; }
.field:last-child { margin-bottom: 0; }
.field-label { width: 100rpx; flex-shrink: 0; color: #4b5a53; font-size: 26rpx; font-weight: 600; }
.field input { flex: 1; height: 68rpx; padding: 0 20rpx; border: 1rpx solid #dfe7e1; border-radius: 10rpx; background: #fafcfb; font-size: 28rpx; box-sizing: border-box; }
.actions { display: flex; flex-shrink: 0; gap: 18rpx; margin-top: 20rpx; }
.actions button { flex: 1; height: 84rpx; border-radius: 12rpx; font-size: 28rpx; line-height: 84rpx; }
.ghost-btn { color: #425149; border: 1rpx solid #cad4cd; background: #fff; }
.primary-btn { color: #fff; border: 1rpx solid #15705b; background: #15705b; }

/* 结果 */
.result-card, .review-card { padding: 34rpx 30rpx; background: #fff; border: 1rpx solid #e2e9e4; border-radius: 16rpx; }
.eyebrow { color: #0f7660; font-size: 22rpx; font-weight: 600; letter-spacing: 2rpx; }
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
