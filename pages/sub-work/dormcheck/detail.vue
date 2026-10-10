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
      <view class="stat-sub" v-if="detail.violationCount">
        <text class="sub-chip purple">违纪 {{ detail.violationCount }}（存量记录，现由「整改复核」跟踪）</text>
      </view>
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
    unmarkedOf(g) {
      return g.rows.filter(row => !row.checkStatus).length
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
.sub-chip { font-size: 22rpx; }
.sub-chip.purple { color: #9c27b0; }
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
