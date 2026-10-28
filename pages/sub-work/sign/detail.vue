<template>
  <view class="page-container">
    <!-- 签到信息卡片 -->
    <view class="info-card" v-if="session">
      <view class="ic-header">
        <text class="ic-title">{{ session.sessionName }}</text>
        <view class="ic-status" :class="'status-' + session.status">{{ statusMap[session.status] }}</view>
      </view>
      <view class="ic-row">
        <text class="ic-label">场景</text>
        <text class="ic-value">{{ session.scene === 'dorm' ? '晚寝确认' : '课堂签到' }}</text>
      </view>
      <view class="ic-row" v-if="session.scene !== 'dorm'">
        <text class="ic-label">班级</text>
        <text class="ic-value">{{ session.className || session.bjdmList || session.bjdm || '-' }}</text>
      </view>
      <view class="ic-row" v-else>
        <text class="ic-label">宿舍</text>
        <text class="ic-value">{{ session.dormBuilding }} {{ session.dormFloor || '' }}</text>
      </view>
      <view class="ic-row" v-if="session.courseName">
        <text class="ic-label">课程</text>
        <text class="ic-value">{{ session.courseName }}</text>
      </view>
      <view class="ic-row" v-if="session.signCode && session.status === '0'">
        <text class="ic-label">签到码</text>
        <text class="ic-code">{{ session.signCode }}</text>
      </view>
      <view class="qr-panel" v-if="session.signType === 'qr' && session.qrImage && session.status === '0'">
        <image class="qr-image" :src="session.qrImage" mode="aspectFit"></image>
        <text class="qr-tip">学生使用学生端扫一扫确认本人</text>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stat-row" v-if="summary">
      <view class="stat-item">
        <text class="stat-num">{{ summary.totalCount }}</text>
        <text class="stat-label">{{ session && session.scene === 'dorm' ? '应到床位' : '应到' }}</text>
      </view>
      <view class="stat-item green">
        <text class="stat-num">{{ summary.signedOn }}</text>
        <text class="stat-label">按时</text>
      </view>
      <view class="stat-item orange">
        <text class="stat-num">{{ summary.signedLate }}</text>
        <text class="stat-label">迟到</text>
      </view>
      <view class="stat-item red">
        <text class="stat-num">{{ summary.unsigned }}</text>
        <text class="stat-label">{{ session && session.scene === 'dorm' ? '未确认' : '未签' }}</text>
      </view>
      <view class="stat-item blue" v-if="summary.leave">
        <text class="stat-num">{{ summary.leave }}</text>
        <text class="stat-label">请假</text>
      </view>
      <view class="stat-item gray" v-if="summary.offcampus">
        <text class="stat-num">{{ summary.offcampus }}</text>
        <text class="stat-label">外宿</text>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="progress-card" v-if="summary">
      <view class="progress-header">
        <text class="progress-title">{{ isDorm ? '确认进度' : '签到进度' }}</text>
        <text class="progress-percent">{{ progressPercent }}%</text>
      </view>
      <view class="progress-track">
        <view class="progress-fill-green" :style="'width:' + greenPercent + '%'"></view>
        <view class="progress-fill-orange" :style="'width:' + orangePercent + '%; left:' + greenPercent + '%'"></view>
      </view>
      <view class="progress-legend">
        <view class="legend-item"><view class="legend-dot green"></view><text>按时</text></view>
        <view class="legend-item"><view class="legend-dot orange"></view><text>迟到</text></view>
        <view class="legend-item"><view class="legend-dot gray"></view><text>{{ isDorm ? '未确认' : '未签' }}</text></view>
      </view>
    </view>

    <!-- 学生列表 -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">{{ isDorm ? '学生晚寝确认详情' : '学生签到详情' }}</text>
        <view class="filter-tabs">
          <view class="filter-tab" :class="{active: filter === 'all'}" @click="filter = 'all'">全部</view>
          <view class="filter-tab" :class="{active: filter === 'unsigned'}" @click="filter = 'unsigned'">{{ isDorm ? '未确认' : '未签' }}</view>
          <view class="filter-tab" :class="{active: filter === 'signed'}" @click="filter = 'signed'">{{ isDorm ? '已确认' : '已签' }}</view>
        </view>
      </view>
      <view class="student-list">
        <view class="student-row" v-for="stu in filteredStudents" :key="stu.xh">
          <view class="stu-info">
            <text class="stu-name">{{ stu.studentName }}</text>
            <text class="stu-xh">
              {{ stu.xh }}
              <text v-if="stu.dormRoom"> · {{ stu.dormRoom }} 房 {{ stu.bedNo }} 床</text>
            </text>
          </view>
          <view class="stu-right">
            <view class="stu-status-tag" :class="getStuStatusClass(stu)">
              {{ getStuStatusLabel(stu) }}
            </view>
            <text class="stu-time" v-if="stu.signTime">{{ formatTime(stu.signTime) }}</text>
          </view>
        </view>
      </view>
      <view class="empty-tip" v-if="filteredStudents.length === 0">
        <text>暂无数据</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="session">
      <view class="bar-btn refresh" @click="loadProgress">
        <uni-icons type="refresh" size="18" color="#409EFF"></uni-icons>
        <text>刷新</text>
      </view>
      <view class="bar-btn finish" v-if="session.status === '0'" @click="handleFinish">
        <text>结束签到</text>
      </view>
      <view class="bar-btn confirm" v-if="session.status === '1' && session.convertStatus === '0'" @click="handleConfirm">
        <text>{{ session.scene === 'dorm' ? '确认归档' : '确认转化' }}</text>
      </view>
      <view class="bar-btn reject" v-if="session.status === '1' && session.convertStatus === '0'" @click="handleReject">
        <text>拒绝</text>
      </view>
      <view class="bar-btn converted" v-if="session.convertStatus === '1'">
        <text>{{ session.scene === 'dorm' ? '已归档' : '已转化' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getSignProgress, finishSignSession, confirmSignSession, rejectSignSession } from '@/api/work/sign'

export default {
  data() {
    return {
      sessionId: null,
      session: null,
      studentList: [],
      summary: null,
      filter: 'all',
      statusMap: { '0': '进行中', '1': '已结束', '2': '已取消' },
      refreshTimer: null,
    }
  },
  computed: {
    isDorm() {
      return this.session && this.session.scene === 'dorm'
    },
    filteredStudents() {
      if (this.filter === 'unsigned') return this.studentList.filter(s => !s.signStatus || s.signStatus === 'unsigned')
      if (this.filter === 'signed') return this.studentList.filter(s => s.signStatus === '0' || s.signStatus === '1')
      return this.studentList
    },
    progressPercent() {
      if (!this.summary || !this.summary.totalCount) return 0
      return Math.round((this.summary.signedOn + this.summary.signedLate) / this.summary.totalCount * 100)
    },
    greenPercent() {
      if (!this.summary || !this.summary.totalCount) return 0
      return Math.round(this.summary.signedOn / this.summary.totalCount * 100)
    },
    orangePercent() {
      if (!this.summary || !this.summary.totalCount) return 0
      return Math.round(this.summary.signedLate / this.summary.totalCount * 100)
    },
  },
  onLoad(options) {
    this.sessionId = options.sessionId
    this.loadProgress()
  },
  onShow() {
    if (this.session && this.session.status === '0') {
      this.startAutoRefresh()
    }
  },
  onUnload() {
    this.clearTimer()
  },
  methods: {
    async loadProgress() {
      try {
        const res = await getSignProgress(this.sessionId)
        const data = res.data
        this.session = data.session
        this.studentList = data.studentList || []
        this.summary = data.summary
        if (this.session.status === '0') {
          this.startAutoRefresh()
        } else {
          this.clearTimer()
        }
      } catch (e) {}
    },
    startAutoRefresh() {
      this.clearTimer()
      this.refreshTimer = setInterval(() => { this.loadProgress() }, 5000)
    },
    clearTimer() {
      if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null }
    },
    getStuStatusClass(stu) {
      if (stu.signStatus === '0') return 'on-time'
      if (stu.signStatus === '1') return 'late'
      if (stu.signStatus === 'leave') return 'leave'
      if (stu.signStatus === 'offcampus') return 'offcampus'
      return 'unsigned'
    },
    getStuStatusLabel(stu) {
      if (stu.signStatus === '0') return '按时'
      if (stu.signStatus === '1') return '迟到'
      if (stu.signStatus === 'leave') return '请假'
      if (stu.signStatus === 'offcampus') return '外宿'
      return this.session && this.session.scene === 'dorm' ? '未确认' : '未签'
    },
    formatTime(t) {
      if (!t) return ''
      return t.substring(11, 19) || t
    },
    handleFinish() {
      uni.showModal({
        title: '提示',
        content: this.isDorm ? '确认结束晚寝确认？结束后学生将无法继续确认。' : '确认结束签到？结束后学生将无法继续签到。',
        success: (res) => {
          if (res.confirm) {
            finishSignSession(this.sessionId).then(() => {
              uni.showToast({ title: this.isDorm ? '晚寝确认已结束' : '签到已结束', icon: 'success' })
              this.loadProgress()
            })
          }
        }
      })
    },
    handleConfirm() {
      const isDorm = this.isDorm
      uni.showModal({
        title: isDorm ? '确认归档' : '确认转化',
        content: isDorm
          ? '将学生手机确认结果归档为晚寝点名单？未确认且未请假的学生记为未归。'
          : '将签到结果转化为查课记录？未签到学生将记为旷课，迟到学生记为迟到。',
        success: (res) => {
          if (res.confirm) {
            confirmSignSession(this.sessionId).then(() => {
              uni.showToast({ title: isDorm ? '已归档为晚寝点名单' : '已转化为查课记录', icon: 'success' })
              this.loadProgress()
            })
          }
        }
      })
    },
    handleReject() {
      uni.showModal({
        title: '拒绝',
        content: this.isDorm ? '确认拒绝该晚寝确认结果？不会生成晚寝点名单。' : '确认拒绝该签到结果？不会生成查课记录。',
        success: (res) => {
          if (res.confirm) {
            rejectSignSession(this.sessionId).then(() => {
              uni.showToast({ title: '已拒绝', icon: 'success' })
              this.loadProgress()
            })
          }
        }
      })
    },
  }
}
</script>

<style scoped>
.page-container { min-height: 100vh; background: #f5f6f8; padding-bottom: 80px; padding: 12px; }

.info-card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.ic-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.ic-title { font-size: 16px; font-weight: 600; color: #333; flex: 1; }
.ic-status { font-size: 12px; padding: 2px 10px; border-radius: 10px; }
.ic-status.status-0 { background: #f0f9eb; color: #67C23A; }
.ic-status.status-1 { background: #f4f4f5; color: #909399; }
.ic-status.status-2 { background: #fef0f0; color: #F56C6C; }
.ic-row { display: flex; align-items: center; margin-bottom: 4px; }
.ic-label { font-size: 12px; color: #999; width: 50px; }
.ic-value { font-size: 13px; color: #666; }
.ic-code { font-size: 18px; font-weight: 700; color: #409EFF; letter-spacing: 4px; }
.qr-panel { margin-top: 12px; padding: 12px; background: #f7f9fc; border-radius: 8px; text-align: center; }
.qr-image { width: 220px; height: 220px; display: block; margin: 0 auto 6px; }
.qr-tip { font-size: 12px; color: #7a8494; }

.stat-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.stat-item { flex: 1 1 62px; min-width: 62px; background: #fff; border-radius: 10px; padding: 12px 0; text-align: center; }
.stat-num { font-size: 24px; font-weight: 700; color: #333; display: block; }
.stat-label { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.stat-item.green .stat-num { color: #67C23A; }
.stat-item.orange .stat-num { color: #E6A23C; }
.stat-item.red .stat-num { color: #F56C6C; }
.stat-item.blue .stat-num { color: #409EFF; }
.stat-item.gray .stat-num { color: #7a8494; }

.progress-card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.progress-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.progress-title { font-size: 14px; color: #333; font-weight: 600; }
.progress-percent { font-size: 14px; color: #409EFF; font-weight: 600; }
.progress-track { position: relative; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: visible; }
.progress-fill-green { position: absolute; left: 0; top: 0; height: 100%; background: #67C23A; border-radius: 4px 0 0 4px; transition: width 0.3s; }
.progress-fill-orange { position: absolute; top: 0; height: 100%; background: #E6A23C; border-radius: 0 4px 4px 0; transition: width 0.3s, left 0.3s; }
.progress-legend { display: flex; gap: 16px; margin-top: 8px; }
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-item text { font-size: 11px; color: #999; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot.green { background: #67C23A; }
.legend-dot.orange { background: #E6A23C; }
.legend-dot.gray { background: #ddd; }

.card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.card-title { font-size: 14px; font-weight: 600; color: #333; }
.filter-tabs { display: flex; gap: 8px; }
.filter-tab { font-size: 12px; padding: 4px 10px; border-radius: 12px; background: #f5f5f5; color: #666; }
.filter-tab.active { background: #ecf5ff; color: #409EFF; }

.student-list { }
.student-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.student-row:last-child { border-bottom: none; }
.stu-info { display: flex; flex-direction: column; }
.stu-name { font-size: 14px; color: #333; }
.stu-xh { font-size: 11px; color: #999; margin-top: 2px; }
.stu-right { display: flex; align-items: center; gap: 8px; }
.stu-status-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.stu-status-tag.on-time { background: #f0f9eb; color: #67C23A; }
.stu-status-tag.late { background: #fdf6ec; color: #E6A23C; }
.stu-status-tag.unsigned { background: #fef0f0; color: #F56C6C; }
.stu-status-tag.leave { background: #ecf5ff; color: #409EFF; }
.stu-status-tag.offcampus { background: #f4f4f5; color: #7a8494; }
.stu-time { font-size: 11px; color: #999; }

.empty-tip { text-align: center; padding: 30px 0; color: #999; font-size: 13px; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 10px; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -2px 8px rgba(0,0,0,0.06); }
.bar-btn { flex: 1; text-align: center; padding: 12px; border-radius: 10px; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 4px; }
.bar-btn text { font-size: 14px; }
.bar-btn.refresh { background: #ecf5ff; }
.bar-btn.refresh text { color: #409EFF; }
.bar-btn.finish { background: #fdf6ec; flex: 1.5; }
.bar-btn.finish text { color: #E6A23C; font-weight: 600; }
.bar-btn.confirm { background: #f0f9eb; flex: 1.5; }
.bar-btn.confirm text { color: #67C23A; font-weight: 600; }
.bar-btn.reject { background: #fef0f0; }
.bar-btn.reject text { color: #F56C6C; }
.bar-btn.converted { background: #f0f9eb; }
.bar-btn.converted text { color: #67C23A; }
</style>
