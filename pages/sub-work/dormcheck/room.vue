<template>
  <view class="room-page">
    <view class="room-head">
      <view class="rh-main">
        <text class="rh-no">{{ roomNo || detail.roomNo || '宿舍' }}</text>
        <text class="rh-loc">{{ buildingName }}{{ floorNo ? ' · ' + floorNo + 'F' : '' }}</text>
      </view>
      <view class="rh-score" v-if="lastRecord">
        <text class="rh-score-num" :class="scoreClass(lastRecord.finalScore)">{{ lastRecord.finalScore }}</text>
        <text class="rh-score-label">最近得分</text>
      </view>
      <view class="rh-score" v-else>
        <text class="rh-score-none">未检查</text>
        <text class="rh-score-label">暂无记录</text>
      </view>
    </view>

    <view class="stat-row">
      <view class="stat-item">
        <text class="stat-num">{{ students.length }}</text>
        <text class="stat-label">在住学生</text>
      </view>
      <view class="stat-item">
        <text class="stat-num danger">{{ openIssues.length }}</text>
        <text class="stat-label">未闭环异常</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ records.length }}</text>
        <text class="stat-label">检查记录</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">在住学生</text>
        <text class="section-tip">混合宿舍视野外床位已脱敏</text>
      </view>
      <view class="student-list" v-if="students.length">
        <view class="student-item" v-for="s in students" :key="s.assignId">
          <view class="stu-bed">{{ s.bedNo || '—' }}</view>
          <view class="stu-main">
            <view class="stu-name-row">
              <text class="stu-name">{{ s.studentName || '外院在住' }}</text>
              <text class="stu-head" v-if="s.dormHead">宿舍长</text>
              <text class="stu-masked" v-if="s.masked">视野外</text>
            </view>
            <text class="stu-class">{{ s.classShort || s.className || (s.masked ? '本院合住' : '—') }}</text>
          </view>
          <text class="stu-xh" v-if="s.xh && !s.masked">{{ s.xh }}</text>
        </view>
      </view>
      <view class="empty-box" v-else>
        <text>视野内暂无在住学生</text>
      </view>
    </view>

    <view class="section" v-if="openIssues.length">
      <view class="section-head">
        <text class="section-title">未闭环异常</text>
        <text class="section-tip">{{ openIssues.length }} 条</text>
      </view>
      <view class="issue-item" v-for="it in openIssues" :key="it.issueId" @click="goIssue(it)">
        <view class="ii-top">
          <text class="ii-title">{{ it.title }}</text>
          <text class="ii-sev" :class="'sev-' + it.severity">{{ severityLabel(it.severity) }}</text>
        </view>
        <view class="ii-meta">
          <text>{{ typeLabel(it.issueType) }}</text>
          <text>{{ fmtDate(it.reportTime) }}</text>
          <text>{{ statusText(it.status) }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">检查记录</text>
        <text class="section-tip">点击看扣分明细</text>
      </view>
      <view class="record-list" v-if="records.length">
        <view class="record-item" v-for="r in records" :key="r.recordId" @click="openRecord(r)">
          <view class="ri-score">
            <text :class="scoreClass(r.finalScore)">{{ r.finalScore }}</text>
            <text class="ri-level">{{ levelLabel(r.level) }}</text>
          </view>
          <view class="ri-main">
            <text class="ri-date">{{ fmtDate(r.checkDate) }} · {{ taskTypeText(r.checkType) }}</text>
            <text class="ri-desc">{{ r.checkerName || '—' }}<text v-if="r.deductScore"> · 扣 {{ r.deductScore }} 分</text><text v-if="r.rectifyStatus && r.rectifyStatus !== 'none'"> · {{ rectifyText(r.rectifyStatus) }}</text></text>
          </view>
          <uni-icons type="right" size="14" color="#cbd5e1" />
        </view>
      </view>
      <view class="empty-box" v-else>
        <text>还没有检查记录</text>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bar-btn ghost" @click="goIssueAdd">
        <uni-icons type="plusempty" size="16" color="#d97706" />
        <text>登记异常</text>
      </view>
      <view class="bar-btn main" @click="goCheck">
        <uni-icons type="compose" size="16" color="#ffffff" />
        <text>现场巡查评分</text>
      </view>
    </view>

    <view class="mask" v-if="recordOpen" @click="recordOpen = false">
      <view class="record-panel" @click.stop="noop">
        <view class="rp-head">
          <text class="rp-title">检查单 · {{ fmtDate(selectedRecord.checkDate) }}</text>
          <text class="rp-close" @click="recordOpen = false">关闭</text>
        </view>
        <view class="rp-score-row">
          <text class="rp-score" :class="scoreClass(selectedRecord.finalScore)">{{ selectedRecord.finalScore }}</text>
          <text class="rp-level">{{ levelLabel(selectedRecord.level) }}</text>
          <text class="rp-base">基础 100 · 扣 {{ selectedRecord.deductScore || 0 }}</text>
        </view>
        <scroll-view scroll-y class="rp-body">
          <view class="rp-item" v-for="d in (selectedRecord.deductionList || [])" :key="d.deductionId">
            <view class="rp-item-top">
              <text class="rp-item-name">{{ d.itemName }}</text>
              <text class="rp-item-score">-{{ d.deductScore }}</text>
            </view>
            <text class="rp-item-desc" v-if="d.description">{{ d.description }}</text>
            <text class="rp-item-desc" v-if="d.involveNames">涉及：{{ d.involveNames }}</text>
            <view class="rp-photos" v-if="d.attachmentList && d.attachmentList.length">
              <image v-for="(p, pi) in photoUrls(d.attachmentList)" :key="pi" :src="p" mode="aspectFill"
                     class="rp-photo" @click="preview(d.attachmentList, pi)" />
            </view>
          </view>
          <view class="rp-empty" v-if="!selectedRecord.deductionList || !selectedRecord.deductionList.length">
            <text>本间为满分，无扣分项</text>
          </view>
          <view class="rp-contraband" v-if="selectedRecord.contrabandList && selectedRecord.contrabandList.length">
            <text class="rp-sub-title">违禁品</text>
            <view class="rp-item" v-for="c in selectedRecord.contrabandList" :key="c.contrabandId">
              <view class="rp-item-top">
                <text class="rp-item-name">{{ c.itemName }} {{ c.spec || '' }}</text>
                <text class="rp-item-score">×{{ c.quantity || 1 }}</text>
              </view>
              <text class="rp-item-desc" v-if="c.handleDesc">{{ c.handleDesc }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { getRoomStudents, listCheckRecords, listDormIssues, getCheckRecord } from '@/api/work/dormcheck'
import { resolveImg } from '@/utils/image'

export default {
  data() {
    return {
      roomId: null,
      roomNo: '',
      buildingName: '',
      floorNo: '',
      students: [],
      records: [],
      issues: [],
      recordOpen: false,
      selectedRecord: {}
    }
  },
  computed: {
    lastRecord() {
      return this.records.length ? this.records[0] : null
    },
    openIssues() {
      return this.issues.filter(it => it.status === 'open' || it.status === 'processing')
    }
  },
  onLoad(options) {
    this.roomId = options && options.roomId ? Number(options.roomId) : null
    this.roomNo = options && options.roomNo ? decodeURIComponent(options.roomNo) : ''
    this.buildingName = options && options.buildingName ? decodeURIComponent(options.buildingName) : ''
    this.floorNo = options && options.floorNo ? decodeURIComponent(options.floorNo) : ''
    if (this.roomId) this.loadAll()
  },
  methods: {
    noop() {},
    loadAll() {
      Promise.all([
        getRoomStudents(this.roomId),
        listCheckRecords({ roomId: this.roomId, pageNum: 1, pageSize: 20 }),
        listDormIssues({ roomId: this.roomId, pageNum: 1, pageSize: 20 })
      ]).then(([studentsRes, recordsRes, issuesRes]) => {
        this.students = studentsRes.code === 200 ? (studentsRes.data || []) : []
        this.records = recordsRes.code === 200 ? (recordsRes.rows || []) : []
        this.issues = issuesRes.code === 200 ? (issuesRes.rows || []) : []
        if (!this.buildingName && this.records.length && this.records[0].buildingName) {
          this.buildingName = this.records[0].buildingName
        }
        if (!this.roomNo && this.records.length && this.records[0].roomNo) {
          this.roomNo = this.records[0].roomNo
        }
      }).catch(() => {})
    },
    openRecord(row) {
      getCheckRecord(row.recordId).then(res => {
        if (res.code === 200) {
          this.selectedRecord = res.data || {}
          this.recordOpen = true
        }
      }).catch(() => {})
    },
    photoUrls(list) {
      return (list || []).map(a => resolveImg(a.filePath)).filter(u => !!u)
    },
    preview(list, idx) {
      const urls = this.photoUrls(list)
      uni.previewImage({ current: urls[idx], urls })
    },
    scoreClass(score) {
      const n = Number(score)
      if (n >= 95) return 'is-excellent'
      if (n >= 85) return 'is-good'
      if (n >= 60) return 'is-pass'
      return 'is-fail'
    },
    levelLabel(value) {
      return { excellent: '优秀', good: '良好', pass: '合格', fail: '不合格' }[value] || value || '—'
    },
    taskTypeText(value) {
      return { periodic: '定期检查', spot: '辅导员抽查', self: '自查' }[value] || value || '现场检查'
    },
    rectifyText(value) {
      return { pending: '待整改', submitted: '待复核', rejected: '已打回', overdue: '已逾期', passed: '已通过', closed: '已关闭' }[value] || value
    },
    severityLabel(value) {
      return { low: '一般', medium: '关注', high: '紧急' }[value] || '一般'
    },
    typeLabel(value) {
      return { facility: '设施故障', safety: '安全隐患', discipline: '违纪苗头', conflict: '宿舍矛盾', hygiene: '卫生问题', psych: '心理关注', other: '其他' }[value] || value || '其他'
    },
    statusText(value) {
      return { open: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' }[value] || value
    },
    fmtDate(value) {
      return value ? String(value).substring(0, 10) : '—'
    },
    goCheck() {
      uni.navigateTo({
        url: '/pages/sub-work/dormcheck/checkRecord?roomId=' + this.roomId +
          '&roomNo=' + encodeURIComponent(this.roomNo) +
          '&buildingName=' + encodeURIComponent(this.buildingName)
      })
    },
    goIssue(it) {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/issueDetail?issueId=' + it.issueId })
    },
    goIssueAdd() {
      uni.navigateTo({
        url: '/pages/sub-work/dormcheck/issue?action=add&roomId=' + this.roomId +
          '&roomNo=' + encodeURIComponent(this.roomNo) +
          '&buildingName=' + encodeURIComponent(this.buildingName)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.room-page {
  min-height: 100vh;
  background: #f4f6fa;
  padding: 24rpx 24rpx 160rpx;
}
.room-head {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
}
.rh-main { flex: 1; min-width: 0; }
.rh-no { display: block; font-size: 44rpx; font-weight: 700; color: #1e293b; line-height: 54rpx; }
.rh-loc { display: block; margin-top: 2rpx; font-size: 22rpx; color: #94a3b8; }
.rh-score { text-align: right; flex: none; margin-left: 16rpx; }
.rh-score-num { display: block; font-size: 44rpx; font-weight: 700; line-height: 50rpx; }
.rh-score-num.is-excellent { color: #059669; }
.rh-score-num.is-good { color: #2563eb; }
.rh-score-num.is-pass { color: #d97706; }
.rh-score-num.is-fail { color: #dc2626; }
.rh-score-none { display: block; font-size: 24rpx; color: #94a3b8; line-height: 50rpx; }
.rh-score-label { display: block; font-size: 19rpx; color: #94a3b8; }
.stat-row {
  display: flex;
  margin-top: 14rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  overflow: hidden;
}
.stat-item { flex: 1; padding: 16rpx 0; text-align: center; }
.stat-item + .stat-item { border-left: 1rpx solid #f1f5f9; }
.stat-num { display: block; font-size: 32rpx; font-weight: 700; color: #334155; line-height: 40rpx; }
.stat-num.danger { color: #dc2626; }
.stat-label { display: block; font-size: 19rpx; color: #94a3b8; }
.section {
  margin-top: 16rpx;
  padding: 20rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
}
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12rpx; }
.section-title { font-size: 27rpx; font-weight: 600; color: #1e293b; }
.section-tip { font-size: 19rpx; color: #94a3b8; }
.student-list { display: flex; flex-direction: column; }
.student-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 0;
  border-top: 1rpx solid #f1f5f9;
}
.student-item:first-child { border-top: 0; }
.stu-bed {
  width: 52rpx;
  height: 52rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 10rpx;
  background: #f1f5f9;
  color: #475569;
  font-size: 22rpx;
  font-weight: 600;
  flex: none;
}
.stu-main { flex: 1; min-width: 0; }
.stu-name-row { display: flex; align-items: center; gap: 8rpx; }
.stu-name { font-size: 25rpx; font-weight: 600; color: #1e293b; }
.stu-head { padding: 1rpx 7rpx; border-radius: 7rpx; background: #dbeafe; color: #2563eb; font-size: 17rpx; }
.stu-masked { padding: 1rpx 7rpx; border-radius: 7rpx; background: #fef3c7; color: #b45309; font-size: 17rpx; }
.stu-class { display: block; margin-top: 2rpx; font-size: 20rpx; color: #94a3b8; }
.stu-xh { font-size: 19rpx; color: #cbd5e1; flex: none; }
.empty-box { padding: 30rpx 0; text-align: center; font-size: 22rpx; color: #94a3b8; }
.issue-item { padding: 14rpx 0; border-top: 1rpx solid #f1f5f9; }
.issue-item:first-of-type { border-top: 0; }
.ii-top { display: flex; align-items: center; gap: 8rpx; }
.ii-title { flex: 1; min-width: 0; font-size: 24rpx; font-weight: 600; color: #1e293b; }
.ii-sev { flex: none; padding: 2rpx 8rpx; border-radius: 8rpx; font-size: 18rpx; }
.sev-low { background: #f1f5f9; color: #64748b; }
.sev-medium { background: #fef3c7; color: #b45309; }
.sev-high { background: #fee2e2; color: #b91c1c; }
.ii-meta { display: flex; gap: 14rpx; margin-top: 5rpx; font-size: 19rpx; color: #94a3b8; }
.record-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 0;
  border-top: 1rpx solid #f1f5f9;
}
.record-item:first-child { border-top: 0; }
.ri-score { width: 78rpx; text-align: center; flex: none; }
.ri-score text:first-child { display: block; font-size: 28rpx; font-weight: 700; line-height: 34rpx; }
.is-excellent { color: #059669; }
.is-good { color: #2563eb; }
.is-pass { color: #d97706; }
.is-fail { color: #dc2626; }
.ri-level { display: block; font-size: 17rpx; color: #94a3b8; }
.ri-main { flex: 1; min-width: 0; }
.ri-date { display: block; font-size: 23rpx; color: #334155; }
.ri-desc { display: block; margin-top: 2rpx; font-size: 19rpx; color: #94a3b8; }
.bottom-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 30rpx;
  display: flex;
  gap: 12rpx;
}
.bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  height: 84rpx;
  border-radius: 42rpx;
  font-size: 26rpx;
}
.bar-btn.ghost { flex: 1; background: #fff; border: 1rpx solid #e2e8f0; color: #475569; }
.bar-btn.main { flex: 1.5; background: #2563eb; color: #fff; box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.28); }
.mask {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(15, 23, 42, 0.46);
  display: flex;
  align-items: flex-end;
}
.record-panel {
  width: 100%;
  max-height: 78vh;
  padding: 24rpx 24rpx 40rpx;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}
.rp-head { display: flex; align-items: center; justify-content: space-between; }
.rp-title { font-size: 28rpx; font-weight: 600; color: #1e293b; }
.rp-close { font-size: 22rpx; color: #2563eb; }
.rp-score-row { display: flex; align-items: baseline; gap: 12rpx; margin: 14rpx 0 10rpx; }
.rp-score { font-size: 48rpx; font-weight: 700; }
.rp-level { font-size: 24rpx; color: #64748b; }
.rp-base { font-size: 20rpx; color: #94a3b8; }
.rp-body { flex: 1; min-height: 0; }
.rp-item { padding: 14rpx 0; border-top: 1rpx solid #f1f5f9; }
.rp-item-top { display: flex; align-items: center; justify-content: space-between; }
.rp-item-name { font-size: 24rpx; font-weight: 600; color: #1e293b; }
.rp-item-score { font-size: 24rpx; font-weight: 700; color: #dc2626; }
.rp-item-desc { display: block; margin-top: 4rpx; font-size: 21rpx; color: #64748b; }
.rp-photos { display: flex; gap: 8rpx; margin-top: 8rpx; }
.rp-photo { width: 100rpx; height: 100rpx; border-radius: 8rpx; }
.rp-empty { padding: 40rpx 0; text-align: center; font-size: 22rpx; color: #94a3b8; }
.rp-sub-title { display: block; margin-top: 14rpx; font-size: 24rpx; font-weight: 600; color: #1e293b; }
</style>
