<template>
  <view class="container">
    <!-- 案例列表 -->
    <view v-if="!selectedCase" class="case-list">
      <view class="page-title">谈心谈话训练</view>
      <view class="tab-bar">
        <view :class="getTabClass('all')" @click="tab='all'">全部案例</view>
        <view :class="getTabClass('my')" @click="tab='my'">我的记录</view>
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
          </view>
        </view>
        <view v-if="caseList.length===0" class="empty">暂无案例</view>
      </view>
      <view v-if="tab==='my'" class="list">
        <view v-for="r in myList" :key="r.recordId" class="case-card" @click="viewRecord(r)">
          <view class="case-header">
            <text class="case-title">{{ r.studentName || '谈话记录' }}</text>
            <text class="score">{{ r.score || 0 }}分</text>
          </view>
          <view class="case-desc">提交时间：{{ r.submitTime }}</view>
        </view>
        <view v-if="myList.length===0" class="empty">暂无记录</view>
      </view>
    </view>
    <!-- 答题页面 -->
    <view v-else-if="!showResult" class="answer-page">
      <view class="page-title">{{ selectedCase.caseTitle }}</view>
      <!-- 学生背景 -->
      <view class="bg-box">
        <view class="bg-title">学生背景资料</view>
        <text class="bg-content">{{ selectedCase.studentBackground || '暂无详细背景' }}</text>
      </view>
      <!-- 谈话情景 -->
      <view class="scenario-box">
        <view class="scenario-title">谈话情景</view>
        <text class="scenario-content">{{ selectedCase.caseContent }}</text>
      </view>
      <!-- 谈话记录表单 -->
      <view class="form-section">
        <view class="section-title">一、谈话目标</view>
        <textarea v-model="form.talkGoal" class="answer-input" placeholder="请明确本次谈话要达到的目标..." :maxlength="500" />
      </view>
      <view class="form-section">
        <view class="section-title">二、谈话过程记录</view>
        <textarea v-model="form.talkProcess" class="answer-input talk-process" placeholder="请记录谈话的关键对话内容（可采用对话形式）..." :maxlength="5000" />
      </view>
      <view class="form-section">
        <view class="section-title">三、存在问题分析</view>
        <textarea v-model="form.problemAnalysis" class="answer-input" placeholder="请分析学生存在的问题及原因..." :maxlength="2000" />
      </view>
      <view class="form-section">
        <view class="section-title">四、改进措施</view>
        <textarea v-model="form.improvementMeasures" class="answer-input" placeholder="请提出后续改进和跟进措施..." :maxlength="2000" />
      </view>
      <view class="form-section">
        <view class="section-title">五、谈话总结（2分钟总结）</view>
        <textarea v-model="form.talkSummary" class="answer-input" placeholder="请总结本次谈话的核心要点和反思..." :maxlength="3000" />
      </view>
      <view class="btn-group">
        <button class="btn btn-cancel" @click="selectedCase=null">返回</button>
        <button class="btn btn-primary" @click="submitRecord" :disabled="submitting">{{ submitting ? '提交中...' : '提交记录' }}</button>
      </view>
    </view>
    <!-- 结果页 -->
    <view v-else class="result-page">
      <view class="page-title">提交成功</view>
      <view class="score-card">
        <view class="total-score">{{ result.score || 0 }}<text class="score-unit">/100分</text></view>
        <view class="score-detail">
          <view class="score-item"><text class="label">把握思想动态</text><text class="value">{{ result.scoreUnderstanding || 0 }}/20</text></view>
          <view class="score-item"><text class="label">抓住核心问题</text><text class="value">{{ result.scoreProblem || 0 }}/30</text></view>
          <view class="score-item"><text class="label">教育引导效果</text><text class="value">{{ result.scoreEffect || 0 }}/30</text></view>
          <view class="score-item"><text class="label">沟通技巧</text><text class="value">{{ result.scoreCommunication || 0 }}/20</text></view>
        </view>
      </view>
      <button class="btn btn-primary" @click="backToList">返回列表</button>
    </view>
  </view>
</template>
<script>
import { getCaseList, submitTalkRecord, getMyTalkList } from '@/api/counselor/caseAwareness'
export default {
  data() {
    return {
      tab: 'all', caseList: [], myList: [], selectedCase: null, showResult: false,
      form: { talkGoal: '', talkProcess: '', problemAnalysis: '', improvementMeasures: '', talkSummary: '' },
      result: {}, submitting: false
    }
  },
  filters: {
    truncate(val) { return val && val.length > 60 ? val.substring(0, 60) + '...' : val }
  },
  onShow() { this.loadCases(); this.loadMyList() },
  methods: {
    getTabClass(name) { return 'tab-item' + (this.tab === name ? ' active' : '') },
    getDiffTagClass(diff) { return 'diff-tag diff-' + diff },
    getDiffText(diff) { return diff === '1' ? '初级' : diff === '2' ? '中级' : '高级' },
    loadCases() { getCaseList({ caseType: 'talk_simulation' }).then(r => { this.caseList = r.rows || [] }) },
    loadMyList() { getMyTalkList().then(r => { this.myList = r.rows || [] }) },
    selectCase(c) { this.selectedCase = c; this.form = { talkGoal: '', talkProcess: '', problemAnalysis: '', improvementMeasures: '', talkSummary: '' } },
    submitRecord() {
      if (!this.form.talkGoal || !this.form.talkProcess) {
        return uni.showToast({ title: '请至少填写谈话目标和过程记录', icon: 'none' })
      }
      this.submitting = true
      submitTalkRecord({ caseId: this.selectedCase.caseId, ...this.form }).then(r => {
        this.result = r.data; this.showResult = true; this.submitting = false; this.loadMyList()
      }).catch(() => { this.submitting = false })
    },
    viewRecord(r) { this.result = r; this.showResult = true },
    backToList() { this.showResult = false; this.selectedCase = null }
  }
}
</script>
<style scoped>
.container { padding: 20rpx; background: #f5f5f5; min-height: 100vh; }
.page-title { font-size: 36rpx; font-weight: bold; margin-bottom: 20rpx; color: #333; }
.tab-bar { display: flex; background: #fff; border-radius: 12rpx; margin-bottom: 20rpx; overflow: hidden; }
.tab-item { flex: 1; text-align: center; padding: 20rpx; font-size: 28rpx; color: #666; }
.tab-item.active { background: #67c23a; color: #fff; }
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
.tag { font-size: 22rpx; background: #f0f9eb; color: #67c23a; padding: 4rpx 12rpx; border-radius: 6rpx; }
.score { font-size: 28rpx; font-weight: bold; color: #67c23a; }
.bg-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; color: #fff; }
.bg-title { font-size: 28rpx; font-weight: bold; margin-bottom: 12rpx; }
.bg-content { font-size: 26rpx; line-height: 1.8; }
.scenario-box { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; border-left: 6rpx solid #67c23a; }
.scenario-title { font-size: 28rpx; font-weight: bold; margin-bottom: 12rpx; color: #67c23a; }
.scenario-content { font-size: 26rpx; line-height: 1.8; color: #333; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; }
.answer-input { width: 100%; min-height: 180rpx; font-size: 28rpx; line-height: 1.6; padding: 16rpx; background: #f5f7fa; border-radius: 8rpx; }
.talk-process { min-height: 300rpx; }
.btn-group { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn { flex: 1; padding: 24rpx; border-radius: 12rpx; font-size: 30rpx; text-align: center; }
.btn-cancel { background: #f5f7fa; color: #666; }
.btn-primary { background: #67c23a; color: #fff; }
.result-page { text-align: center; }
.score-card { background: #fff; border-radius: 16rpx; padding: 40rpx; margin: 30rpx 0; }
.total-score { font-size: 80rpx; font-weight: bold; color: #67c23a; }
.score-unit { font-size: 30rpx; color: #999; }
.score-detail { display: flex; flex-wrap: wrap; margin-top: 30rpx; }
.score-item { width: 50%; padding: 16rpx; text-align: center; }
.score-item .label { display: block; font-size: 24rpx; color: #999; margin-bottom: 8rpx; }
.score-item .value { display: block; font-size: 28rpx; font-weight: bold; color: #333; }
.empty { text-align: center; padding: 60rpx; color: #999; font-size: 28rpx; }
.list { padding-bottom: 30rpx; }
</style>
