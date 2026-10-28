<template>
  <view class="rollcall-detail-page">
    <view class="head-card">
      <view class="head-row">
        <text class="head-date">{{ fmtDate(detail.checkDate) }}</text>
        <text class="head-time">{{ fmtTime(detail.checkTime) }}</text>
        <text class="status-tag" :class="'status-' + detail.status">{{ detail.status === 'submitted' ? '已提交' : '草稿' }}</text>
      </view>
      <view class="head-scope">
        <text class="scope-text">{{ scopeText }}</text>
        <text class="scope-text">点名教师：{{ detail.teacherName || '-' }}</text>
      </view>
      <view class="stat-row">
        <view class="stat-item"><text class="stat-num">{{ totalOf }}</text><text class="stat-label">应查</text></view>
        <view class="stat-item"><text class="stat-num green">{{ detail.presentCount || 0 }}</text><text class="stat-label">在寝</text></view>
        <view class="stat-item"><text class="stat-num red">{{ detail.absentCount || 0 }}</text><text class="stat-label">未归</text></view>
        <view class="stat-item"><text class="stat-num orange">{{ detail.lateCount || 0 }}</text><text class="stat-label">晚归</text></view>
        <view class="stat-item"><text class="stat-num blue">{{ detail.leaveCount || 0 }}</text><text class="stat-label">请假</text></view>
        <view class="stat-item"><text class="stat-num gray">{{ detail.offcampusCount || 0 }}</text><text class="stat-label">外宿</text></view>
      </view>
      <view class="stat-sub" v-if="detail.violationCount || detail.houseworkCount">
        <text class="sub-chip purple" v-if="detail.violationCount">违纪 {{ detail.violationCount }}（存量记录，现由「整改复核」跟踪）</text>
        <text class="sub-chip teal" v-if="detail.houseworkCount">内务问题 {{ detail.houseworkCount }}（现场轻标记，不计分）</text>
      </view>
    </view>

    <view class="evidence-card" v-if="detail.attendanceMode">
      <view class="evidence-head">
        <text class="evidence-title">夜间考勤凭证</text>
        <text class="verify-pill" :class="detail.verifyStatus || 'not_required'">{{ verifyStatusText(detail.verifyStatus) }}</text>
      </view>
      <view class="evidence-row">
        <text class="evidence-label">考勤方式</text>
        <text class="evidence-value">{{ attendanceModeText(detail.attendanceMode) }}</text>
      </view>
      <view class="evidence-row" v-if="detail.checkLatitude != null">
        <text class="evidence-label">现场定位</text>
        <text class="evidence-value">
          {{ detail.locationVerified === '1' ? '楼栋范围校验通过' : '未通过' }}
          <text v-if="detail.checkDistance != null"> · 距楼栋 {{ detail.checkDistance }}m</text>
        </text>
      </view>
      <view class="evidence-row" v-if="detail.checkAddress">
        <text class="evidence-label">定位地址</text>
        <text class="evidence-value">{{ detail.checkAddress }}</text>
      </view>
      <view class="evidence-row" v-if="detail.gestureLabel">
        <text class="evidence-label">指定手势</text>
        <text class="evidence-value">{{ detail.gestureLabel }}</text>
      </view>
      <view class="gesture-photo-wrap" v-if="detail.gesturePhoto">
        <image class="gesture-photo" :src="fullUrl(detail.gesturePhoto)" mode="aspectFill" @click="previewGesture" />
      </view>
      <view class="evidence-message" v-if="detail.verifyMessage">{{ detail.verifyMessage }}</view>
    </view>

    <view class="room-group" v-for="g in roomGroups" :key="g.roomNo">
      <view class="group-head">
        <text class="group-room">{{ g.roomNo }}</text>
        <text class="group-count">{{ g.rows.length }} 床</text>
        <text class="group-unmarked" v-if="unmarkedOf(g)">未点 {{ unmarkedOf(g) }}</text>
      </view>
      <view class="stu-row" v-for="row in g.rows" :key="row.id">
        <view class="stu-line1">
          <text class="stu-name">{{ row.studentName }}</text>
          <text class="stu-bed" v-if="row.bedNo">{{ row.bedNo }}号床</text>
          <text class="stu-xh">{{ row.xh || '占位床（无学号）' }}</text>
        </view>
        <view class="stu-line2">
          <text class="status-pill" :class="row.checkStatus || 'unmarked'">{{ statusText(row.checkStatus) }}</text>
          <text class="return-tag" v-if="row.returnTime">归寝 {{ fmtHHmm(row.returnTime) }}</text>
          <text class="violation-tag" v-if="row.violationType">原记违纪·{{ row.violationType }}</text>
          <text class="row-op" v-if="canReturnLate(row)" @click="openReturnLate(row)">补归</text>
        </view>
        <view class="hw-line" v-if="hasHousework(row)">
          <text class="hw-tag" :class="'hw-' + (row.houseworkLevel || 'none')">{{ houseworkText(row.houseworkLevel) }}</text>
          <text class="hw-text" v-if="houseworkItemText(row)">{{ houseworkItemText(row) }}</text>
          <text class="hw-text" v-if="row.remark">{{ row.remark }}</text>
        </view>
        <view class="hw-photos" v-if="houseworkPhotos(row).length">
          <image class="hw-thumb" v-for="(ph, pi) in houseworkPhotos(row)" :key="pi" :src="ph" mode="aspectFill" @click="previewHousework(row, pi)" />
        </view>
      </view>
    </view>

    <view class="empty-tip" v-if="roomGroups.length === 0 && !loading">
      <text>本次点名没有明细</text>
    </view>

    <view class="remark-card" v-if="detail.remark">
      <text class="remark-label">备注</text>
      <text class="remark-text">{{ detail.remark }}</text>
    </view>

    <view class="locked-tip" v-if="detail.status === 'submitted'">
      <text>点名单已提交，内容不可修改；学生随后回寝的，点床上「补归」登记归寝时间</text>
    </view>

    <!-- 补归弹层 -->
    <view class="mask" v-if="lateOpen" @click="closeLate">
      <view class="late-panel" @click.stop="noop">
        <view class="panel-title">补归登记</view>
        <view class="panel-sub">{{ lateRow.roomNo }} {{ lateRow.bedNo ? lateRow.bedNo + '号床' : '' }} · {{ lateRow.studentName }}</view>
        <picker mode="time" :value="lateTime" @change="onLateTime">
          <view class="panel-picker">
            <text>归寝时间 {{ lateTime }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <view class="panel-tip">
          <text>补归会把「未归」改标「晚归」并记下实际归寝时间，只限本人登记的昨天或当天点名单</text>
        </view>
        <view class="panel-btns">
          <view class="btn-ghost" @click="closeLate"><text>取消</text></view>
          <view class="btn-main" @click="confirmReturnLate"><text>确认补归</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getNightCheck, returnLateNightCheck } from '@/api/work/dormcheck'
import config from '@/config'

function pad(n) { return String(n).padStart(2, '0') }
function ymd(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}
function nowHHmm() {
  const d = new Date()
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export default {
  data() {
    return {
      loading: false,
      detail: { detailList: [] },
      lateOpen: false,
      lateRow: {},
      lateTime: nowHHmm(),
      submitting: false
    }
  },
  computed: {
    totalOf() {
      if (this.detail.expectedCount) return this.detail.expectedCount
      return (this.detail.presentCount || 0) + (this.detail.absentCount || 0) + (this.detail.lateCount || 0) +
        (this.detail.leaveCount || 0) + (this.detail.offcampusCount || 0) + (this.detail.violationCount || 0)
    },
    scopeText() {
      const building = this.detail.buildingName || '未记录楼栋'
      const floor = this.detail.floor
      const rooms = this.detail.roomCount || 0
      return building + (floor || floor === 0 ? ' ' + floor + '层' : '') + ' · ' + rooms + ' 间'
    },
    roomGroups() {
      const map = {}
      const order = []
      ;(this.detail.detailList || []).forEach(row => {
        const key = row.roomNo || '-'
        if (!map[key]) {
          map[key] = []
          order.push(key)
        }
        map[key].push(row)
      })
      return order.sort().map(key => ({ roomNo: key, rows: map[key] }))
    }
  },
  onLoad(options) {
    if (options && options.id) this.loadDetail(options.id)
  },
  methods: {
    noop() {},
    loadDetail(id) {
      this.loading = true
      getNightCheck(id).then(res => {
        this.loading = false
        if (res.code === 200) this.detail = res.data || { detailList: [] }
      }).catch(() => { this.loading = false })
    },
    statusText(value) {
      if (!value) return '未点'
      const map = { present: '在寝', absent: '未归', late: '晚归', leave: '请假', offcampus: '外宿', violation: '违纪' }
      return map[value] || value
    },
    attendanceModeText(value) {
      const map = {
        onsite: '现场逐床点名',
        phone: '学生手机确认',
        location: '楼栋定位点名',
        gesture: '指定手势照片',
        location_gesture: '楼栋定位 + 指定手势照片'
      }
      return map[value] || value || '-'
    },
    verifyStatusText(value) {
      const map = { not_required: '无需核验', pending: '待核验', verified: '已核验', failed: '核验失败' }
      return map[value] || '待核验'
    },
    fullUrl(path) {
      if (!path) return ''
      if (path.indexOf('http') === 0) return path
      return config.baseUrl + (path.indexOf('/profile') === 0 ? path : '/profile' + path)
    },
    previewGesture() {
      if (!this.detail.gesturePhoto) return
      uni.previewImage({ current: 0, urls: [this.fullUrl(this.detail.gesturePhoto)] })
    },
    unmarkedOf(g) {
      return g.rows.filter(row => !row.checkStatus).length
    },
    /** 内务是现场轻标记：只留痕不计分，回显时等级/问题项/备注任一有值即显示 */
    hasHousework(row) {
      return !!(row.houseworkLevel || row.houseworkItems || row.remark)
    },
    houseworkText(value) {
      if (!value) return '已标内务'
      const map = { tidy: '内务整洁', normal: '内务一般', messy: '内务凌乱' }
      return map[value] || value
    },
    houseworkItemText(row) {
      if (!row.houseworkItems) return ''
      return row.houseworkItems.split(',').filter(x => x).join('、')
    },
    houseworkPhotos(row) {
      if (!row.houseworkPhotos) return []
      return row.houseworkPhotos.split(',').filter(x => x).map(x => this.houseworkFullUrl(x))
    },
    /** 相对路径 → 可显示地址；已是绝对地址（历史数据）原样返回。模板只能调组件方法，故不做成模块级函数 */
    houseworkFullUrl(path) {
      if (path.indexOf('http') === 0) return path
      return config.baseUrl + (path.indexOf('/profile') === 0 ? path : '/profile' + path)
    },
    previewHousework(row, idx) {
      uni.previewImage({ current: idx, urls: this.houseworkPhotos(row) })
    },
    /** 与后端补归窗口一致：已提交 + 未归 + 昨天或当天 */
    canReturnLate(row) {
      if (this.detail.status !== 'submitted' || row.checkStatus !== 'absent') return false
      const day = (this.detail.checkDate || '').substring(0, 10)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      return day === ymd(today) || day === ymd(yesterday)
    },
    openReturnLate(row) {
      this.lateRow = row
      this.lateTime = nowHHmm()
      this.lateOpen = true
    },
    closeLate() {
      this.lateOpen = false
    },
    onLateTime(e) {
      this.lateTime = e.detail.value
    },
    confirmReturnLate() {
      if (this.submitting) return
      this.submitting = true
      returnLateNightCheck({
        checkId: this.detail.id,
        id: this.lateRow.id,
        returnTime: this.lateTime + ':00'
      }).then(res => {
        this.submitting = false
        if (res.code === 200) {
          this.lateOpen = false
          uni.showToast({ title: '已补归', icon: 'success' })
          this.loadDetail(this.detail.id)
        } else {
          uni.showToast({ title: res.msg || '补归失败', icon: 'none' })
        }
      }).catch(() => {
        this.submitting = false
        uni.showToast({ title: '补归失败', icon: 'none' })
      })
    },
    fmtDate(value) { return value ? String(value).substring(0, 10) : '-' },
    fmtTime(value) {
      if (!value) return ''
      const s = String(value)
      if (s.indexOf(':') === -1) return s
      return s.length > 10 ? s.substring(11, 16) : s.substring(0, 5)
    },
    fmtHHmm(value) {
      const s = String(value || '')
      const at = s.indexOf(':')
      return at > -1 ? s.substring(at - 2, at + 3) : s
    }
  }
}
</script>

<style lang="scss" scoped>
.rollcall-detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 20rpx 20rpx 40rpx;
}
.head-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.evidence-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 22rpx;
  margin-bottom: 20rpx;
}
.evidence-head { display: flex; align-items: center; margin-bottom: 14rpx; }
.evidence-title { font-size: 28rpx; font-weight: 600; color: #333; }
.verify-pill {
  margin-left: auto;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  background: #f4f4f5;
  color: #909399;
}
.verify-pill.verified { background: #e8f5e9; color: #4caf50; }
.verify-pill.pending { background: #fdf6ec; color: #e6a23c; }
.verify-pill.failed { background: #ffebee; color: #f44336; }
.evidence-row { display: flex; gap: 16rpx; padding: 8rpx 0; font-size: 23rpx; line-height: 34rpx; }
.evidence-label { flex: 0 0 120rpx; color: #999; }
.evidence-value { flex: 1; color: #444; }
.gesture-photo-wrap { margin-top: 10rpx; }
.gesture-photo { width: 180rpx; height: 180rpx; border-radius: 10rpx; background: #eee; }
.evidence-message {
  margin-top: 12rpx;
  padding: 12rpx 14rpx;
  border-radius: 8rpx;
  background: #f7f8fa;
  font-size: 21rpx;
  line-height: 32rpx;
  color: #777;
}
.head-row { display: flex; align-items: center; gap: 12rpx; }
.head-date { font-size: 32rpx; font-weight: 600; color: #333; }
.head-time { font-size: 24rpx; color: #999; }
.status-tag {
  margin-left: auto;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}
.status-draft { background: #fff3e0; color: #ff9800; }
.status-submitted { background: #e8f5e9; color: #4caf50; }
.head-scope { margin-top: 10rpx; }
.scope-text { display: block; font-size: 24rpx; color: #666; }
.stat-row {
  display: flex;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 30rpx; font-weight: bold; color: #333; }
.stat-num.green { color: #4caf50; }
.stat-num.red { color: #f44336; }
.stat-num.orange { color: #ff9800; }
.stat-num.blue { color: #1976d2; }
.stat-num.gray { color: #607d8b; }
.stat-label { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.stat-sub { margin-top: 14rpx; }
.sub-chip { display: block; font-size: 22rpx; line-height: 34rpx; }
.sub-chip.purple { color: #9c27b0; }
.sub-chip.teal { color: #00897b; }
.room-group {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}
.group-head { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 10rpx; }
.group-room { font-size: 30rpx; font-weight: 600; color: #333; }
.group-count { font-size: 22rpx; color: #999; }
.group-unmarked { font-size: 20rpx; color: #e6a23c; background: #fdf6ec; padding: 2rpx 10rpx; border-radius: 14rpx; }
.stu-row {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f7f7f7;
}
.stu-row:last-child { border-bottom: none; }
.stu-line1 { display: flex; align-items: baseline; gap: 12rpx; }
.stu-name { font-size: 28rpx; color: #333; }
.stu-bed { font-size: 22rpx; color: #ff9800; }
.stu-xh { font-size: 22rpx; color: #bbb; }
.stu-line2 { display: flex; align-items: center; gap: 10rpx; margin-top: 8rpx; }
.status-pill {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #e8f5e9;
  color: #4caf50;
}
.status-pill.absent { background: #ffebee; color: #f44336; }
.status-pill.late { background: #fff3e0; color: #ff9800; }
.status-pill.leave { background: #e3f2fd; color: #1976d2; }
.status-pill.offcampus { background: #eceff1; color: #607d8b; }
.status-pill.violation { background: #f3e5f5; color: #9c27b0; }
.status-pill.unmarked { background: #f7f8fa; color: #bbb; }
.return-tag { font-size: 22rpx; color: #ff9800; }
.violation-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #f7f8fa;
  color: #666;
}
.hw-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10rpx; margin-top: 8rpx; }
.hw-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #f7f8fa;
  color: #999;
}
.hw-tag.hw-tidy { background: #e0f2f1; color: #00897b; }
.hw-tag.hw-normal { background: #fff8e1; color: #f9a825; }
.hw-tag.hw-messy { background: #ffebee; color: #e53935; }
.hw-text { font-size: 22rpx; color: #666; line-height: 34rpx; }
.hw-photos { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 10rpx; }
.hw-thumb { width: 96rpx; height: 96rpx; border-radius: 8rpx; background: #f7f8fa; }
.row-op {
  margin-left: auto;
  font-size: 22rpx;
  color: #667eea;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
  background: #eef0ff;
}
.empty-tip { text-align: center; padding: 60rpx 0; color: #999; font-size: 28rpx; }
.remark-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}
.remark-label { display: block; font-size: 24rpx; color: #999; margin-bottom: 6rpx; }
.remark-text { font-size: 26rpx; color: #333; }
.locked-tip {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #fff;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 34rpx;
}
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  z-index: 99;
}
.late-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
}
.panel-title { font-size: 30rpx; font-weight: 600; color: #333; }
.panel-sub { font-size: 24rpx; color: #666; margin-top: 8rpx; }
.panel-picker {
  height: 76rpx;
  line-height: 76rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #333;
  display: flex;
  justify-content: space-between;
  margin-top: 20rpx;
}
.picker-arrow { color: #bbb; font-size: 20rpx; }
.panel-tip { font-size: 22rpx; color: #999; line-height: 34rpx; margin-top: 14rpx; }
.panel-btns { display: flex; gap: 16rpx; margin-top: 24rpx; }
.btn-ghost, .btn-main {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  font-size: 28rpx;
}
.btn-ghost { border: 1rpx solid #667eea; color: #667eea; }
.btn-main {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
</style>
