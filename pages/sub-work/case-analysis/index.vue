<template>
  <view class="container">
    <view v-if="isCompetition" class="competition-banner">
      <uni-icons type="flag-filled" size="17" color="#b45309"></uni-icons>
      <text>比赛作答 · {{ compName || '进行中的比赛' }}</text>
    </view>
    <!-- 案例列表 -->
    <view v-if="!selectedCase" class="case-list">
      <view class="page-title">{{ isCompetition ? '案例研讨比赛' : '案例研讨训练' }}</view>
      <view class="tab-bar">
        <view :class="getTabClass('all')" @click="tab='all'">全部案例</view>
        <view :class="getTabClass('my')" @click="tab='my'">我的提交</view>
      </view>
      <view v-if="tab==='all'" class="list">
        <view v-for="c in caseList" :key="c.caseId" class="case-card" @click="selectCase(c)">
          <view class="case-header">
            <text class="case-title">{{ c.caseTitle }}</text>
            <text :class="getDiffTagClass(c.difficulty)">{{ getDiffText(c.difficulty) }}</text>
          </view>
          <view class="case-desc">{{ c.caseContent | truncate }}</view>
          <view class="case-footer">
            <view class="tags">
              <text v-for="t in (c.caseTags||'').split(',')" :key="t" class="tag">{{ t }}</text>
            </view>
            <text class="view-count">{{ c.viewCount || 0 }}人查看</text>
          </view>
        </view>
        <view v-if="caseList.length===0" class="empty">暂无案例</view>
      </view>
      <view v-if="tab==='my'" class="list">
        <view v-for="a in myList" :key="a.analysisId" class="case-card" @click="viewAnalysis(a)">
          <view class="case-header">
            <text class="case-title">{{ a.caseTitle }}</text>
            <text class="score">{{ a.score || 0 }}分</text>
          </view>
          <view class="case-desc">提交时间：{{ a.submitTime }}</view>
        </view>
        <view v-if="myList.length===0" class="empty">暂无提交记录</view>
      </view>
    </view>
    <!-- 答题页面 -->
    <view v-else-if="!showResult" class="answer-page">
      <view class="page-title">{{ selectedCase.caseTitle }}</view>
      <view class="case-content-box">
        <text class="case-content-text">{{ selectedCase.caseContent }}</text>
      </view>
      <view class="form-section">
        <view class="section-title">一、问题本质/关键点分析（20分）</view>
        <textarea v-model="form.problemEssence" class="answer-input" placeholder="请分析案例中反映的核心问题和关键矛盾..." :maxlength="2000" />
      </view>
      <view class="form-section">
        <view class="section-title">二、解决思路（30分）</view>
        <textarea v-model="form.solutionApproach" class="answer-input" placeholder="请阐述解决问题的整体思路和理论依据..." :maxlength="3000" />
      </view>
      <view class="form-section">
        <view class="section-title">三、实施办法（30分）</view>
        <textarea v-model="form.implementation" class="answer-input" placeholder="请详细说明具体的操作步骤和实施办法..." :maxlength="3000" />
      </view>
      <view class="form-section">
        <view class="section-title">四、经验启示（20分）</view>
        <textarea v-model="form.insights" class="answer-input" placeholder="请总结此类事件的经验教训和启示..." :maxlength="2000" />
      </view>
      <view class="btn-group">
        <button class="btn btn-cancel" @click="selectedCase=null">返回</button>
        <button class="btn btn-primary" @click="submitAnswer" :disabled="submitting">{{ submitting ? '提交中...' : '提交答案' }}</button>
      </view>
    </view>
    <!-- 结果页 -->
    <view v-else class="result-page">
      <view class="page-title">提交成功</view>
      <view class="score-card">
        <view class="total-score">{{ result.score || 0 }}<text class="score-unit">/100分</text></view>
        <view class="score-detail">
          <view class="score-item"><text class="label">问题本质</text><text class="value">{{ result.scoreEssence || 0 }}/20</text></view>
          <view class="score-item"><text class="label">解决思路</text><text class="value">{{ result.scoreApproach || 0 }}/30</text></view>
          <view class="score-item"><text class="label">实施办法</text><text class="value">{{ result.scoreImplementation || 0 }}/30</text></view>
          <view class="score-item"><text class="label">经验启示</text><text class="value">{{ result.scoreInsights || 0 }}/20</text></view>
          <view class="score-item"><text class="label">作答用时</text><text class="value">{{ formatDuration(result.timeSpent) }}</text></view>
        </view>
      </view>
      <button class="btn btn-primary" @click="backToList">返回列表</button>
    </view>
  </view>
</template>
<script>
import { getCaseList, submitCaseAnalysis, getMyAnalysisList } from '@/api/counselor/caseAwareness'
export default {
  data() {
    return {
      tab: 'all', caseList: [], myList: [], selectedCase: null, showResult: false,
      form: { problemEssence: '', solutionApproach: '', implementation: '', insights: '' },
      result: {}, submitting: false, mode: 'training', compId: null, compName: '', answerStartedAt: 0
    }
  },
  computed: {
    isCompetition() {
      return this.mode === 'competition' && !!this.compId
    }
  },
  filters: {
    truncate(val) { return val && val.length > 80 ? val.substring(0, 80) + '...' : val }
  },
  onLoad(options) {
    if (options.compId) this.compId = Number(options.compId)
    if (options.compName) this.compName = decodeURIComponent(options.compName)
    this.mode = options.mode === 'competition' || this.compId ? 'competition' : 'training'
  },
  onShow() { this.loadCases(); this.loadMyList() },
  methods: {
    getTabClass(name) { return 'tab-item' + (this.tab === name ? ' active' : '') },
    getDiffTagClass(diff) { return 'diff-tag diff-' + diff },
    getDiffText(diff) { return diff === '1' ? '初级' : diff === '2' ? '中级' : '高级' },
    loadCases() { getCaseList({ caseType: 'case_discussion' }).then(r => { this.caseList = r.rows || [] }) },
    loadMyList() { getMyAnalysisList().then(r => { this.myList = r.rows || [] }) },
    selectCase(c) {
      if (this.mode === 'competition' && !this.compId) {
        return uni.showToast({ title: '请从比赛入口进入', icon: 'none' })
      }
      this.selectedCase = c
      this.answerStartedAt = Date.now()
      this.form = { problemEssence: '', solutionApproach: '', implementation: '', insights: '' }
    },
    submitAnswer() {
      if (!this.form.problemEssence || !this.form.solutionApproach) {
        return uni.showToast({ title: '请至少填写问题本质和解决思路', icon: 'none' })
      }
      if (this.mode === 'competition' && !this.compId) {
        return uni.showToast({ title: '比赛信息已失效，请重新进入', icon: 'none' })
      }
      this.submitting = true
      const timeSpent = Math.max(1, Math.round((Date.now() - this.answerStartedAt) / 1000))
      submitCaseAnalysis({
        caseId: this.selectedCase.caseId,
        compId: this.isCompetition ? this.compId : null,
        analysisType: this.isCompetition ? '1' : '0',
        timeSpent,
        ...this.form
      }).then(r => {
        this.result = r.data; this.showResult = true; this.submitting = false; this.answerStartedAt = 0; this.loadMyList()
      }).catch(() => { this.submitting = false })
    },
    viewAnalysis(a) { this.result = a; this.showResult = true },
    backToList() { this.showResult = false; this.selectedCase = null; this.answerStartedAt = 0 },
    formatDuration(seconds) {
      const value = Math.max(0, Number(seconds || 0))
      const minutes = Math.floor(value / 60)
      const remain = value % 60
      if (!minutes) return remain + '秒'
      return minutes + '分' + (remain ? remain + '秒' : '')
    }
  }
}
</script>
<style scoped>
.container { padding: 20rpx; background: #f5f5f5; min-height: 100vh; }
.competition-banner { display: flex; align-items: center; gap: 10rpx; margin-bottom: 18rpx; padding: 18rpx 22rpx; border: 1rpx solid #f5d9b5; border-radius: 12rpx; background: #fffbeb; color: #b45309; font-size: 24rpx; }
.page-title { font-size: 36rpx; font-weight: bold; margin-bottom: 20rpx; color: #333; }
.tab-bar { display: flex; background: #fff; border-radius: 12rpx; margin-bottom: 20rpx; overflow: hidden; }
.tab-item { flex: 1; text-align: center; padding: 20rpx; font-size: 28rpx; color: #666; }
.tab-item.active { background: #409EFF; color: #fff; }
.case-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.case-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.case-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; }
.diff-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.diff-1 { background: #e1f3d8; color: #67c23a; }
.diff-2 { background: #faecd8; color: #e6a23c; }
.diff-3 { background: #fde2e2; color: #f56c6c; }
.case-desc { font-size: 26rpx; color: #666; line-height: 1.5; margin-bottom: 12rpx; }
.case-footer { display: flex; justify-content: space-between; align-items: center; }
.tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.tag { font-size: 22rpx; background: #ecf5ff; color: #409EFF; padding: 4rpx 12rpx; border-radius: 6rpx; }
.view-count { font-size: 22rpx; color: #999; }
.score { font-size: 28rpx; font-weight: bold; color: #409EFF; }
.case-content-box { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.case-content-text { font-size: 28rpx; line-height: 1.8; color: #333; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; }
.answer-input { width: 100%; min-height: 200rpx; font-size: 28rpx; line-height: 1.6; padding: 16rpx; background: #f5f7fa; border-radius: 8rpx; }
.btn-group { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn { flex: 1; padding: 24rpx; border-radius: 12rpx; font-size: 30rpx; text-align: center; }
.btn-cancel { background: #f5f7fa; color: #666; }
.btn-primary { background: #409EFF; color: #fff; }
.result-page { text-align: center; }
.score-card { background: #fff; border-radius: 16rpx; padding: 40rpx; margin: 30rpx 0; }
.total-score { font-size: 80rpx; font-weight: bold; color: #409EFF; }
.score-unit { font-size: 30rpx; color: #999; }
.score-detail { display: flex; flex-wrap: wrap; margin-top: 30rpx; }
.score-item { width: 50%; padding: 16rpx; text-align: center; }
.score-item .label { display: block; font-size: 24rpx; color: #999; margin-bottom: 8rpx; }
.score-item .value { display: block; font-size: 28rpx; font-weight: bold; color: #333; }
.empty { text-align: center; padding: 60rpx; color: #999; font-size: 28rpx; }
.list { padding-bottom: 30rpx; }
</style>
