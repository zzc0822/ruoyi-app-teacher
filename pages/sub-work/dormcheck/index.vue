<template>
  <view class="dormcheck-page">
    <!-- 两条业务线入口：口径不同，分开登记 -->
    <view class="line-bar">
      <view class="line-item active">
        <text class="line-name">夜间考勤</text>
        <text class="line-desc">人在不在</text>
      </view>
      <view class="line-item" @click="goRectify">
        <text class="line-name">整改复核</text>
        <text class="line-desc">内务与安全扣分</text>
        <view class="line-badge" v-if="pendingRecheck > 0">{{ pendingRecheck }}</view>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: filterStatus === '' }" @click="pickStatus('')">
        <text>全部</text>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'draft' }" @click="pickStatus('draft')">
        <text>草稿</text>
        <view class="badge" v-if="draftCount > 0">{{ draftCount }}</view>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'submitted' }" @click="pickStatus('submitted')">
        <text>已提交</text>
      </view>
    </view>

    <!-- 日期筛选 -->
    <view class="year-bar">
      <view class="year-item" v-for="d in dateOptions" :key="d.value"
            :class="{ active: datePreset === d.value }" @click="pickDate(d.value)">
        <text>{{ d.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="check-card" v-for="item in checkList" :key="item.id" @click="goDetail(item)">
        <view class="card-top">
          <view class="date-info">
            <text class="date-main">{{ fmtDate(item.checkDate) }}</text>
            <text class="date-time">{{ fmtTime(item.checkTime) }}</text>
          </view>
          <view class="status-tag" :class="'status-' + item.status">
            <text>{{ item.status === 'submitted' ? '已提交' : '草稿' }}</text>
          </view>
        </view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">宿舍范围</text>
            <text class="value">{{ scopeText(item) }}</text>
          </view>
          <view class="info-row">
            <text class="label">点名房间</text>
            <text class="value">{{ item.roomCount || 0 }} 间 · 应查 {{ totalOf(item) }} 床</text>
          </view>
          <view class="count-row">
            <text class="count-chip green">在寝 {{ item.presentCount || 0 }}</text>
            <text class="count-chip red" v-if="item.absentCount">未归 {{ item.absentCount }}</text>
            <text class="count-chip orange" v-if="item.lateCount">晚归 {{ item.lateCount }}</text>
            <text class="count-chip blue" v-if="item.leaveCount">请假 {{ item.leaveCount }}</text>
            <text class="count-chip gray" v-if="item.offcampusCount">外宿 {{ item.offcampusCount }}</text>
            <text class="count-chip purple" v-if="item.violationCount">违纪 {{ item.violationCount }}</text>
          </view>
          <view class="info-row" v-if="item.attendanceMode">
            <text class="label">考勤凭证</text>
            <text class="value">{{ attendanceModeText(item.attendanceMode) }}</text>
            <text class="verify-mini" :class="item.verifyStatus || 'not_required'">{{ verifyStatusText(item.verifyStatus) }}</text>
          </view>
          <view class="info-row" v-if="item.teacherName">
            <text class="label">点名教师</text>
            <text class="value">{{ item.teacherName }}</text>
          </view>
        </view>
        <view class="card-action" v-if="item.status === 'draft'">
          <text class="action-text">点击继续点名 →</text>
        </view>
        <view class="card-action" v-else-if="canReturnLate(item)">
          <text class="action-text">点击查看明细 · 未归可补归 →</text>
        </view>
      </view>

      <view class="empty-tip" v-if="checkList.length === 0 && !loading">
        <text>暂无夜间考勤记录</text>
      </view>
      <view class="loading-tip" v-if="loading">
        <text>加载中...</text>
      </view>
    </scroll-view>

    <view class="bottom-actions">
      <view class="phone-btn" @click="goPhoneSign">
        <text>学生手机确认</text>
      </view>
      <view class="add-btn" @click="goAdd">
        <text class="add-btn-text">发起现场考勤</text>
      </view>
    </view>
  </view>
</template>

<script>
import { listNightCheck, listRectify } from '@/api/work/dormcheck'

function pad(n) { return String(n).padStart(2, '0') }
function ymd(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

export default {
  data() {
    return {
      loading: false,
      checkList: [],
      filterStatus: '',
      datePreset: 'week',
      dateOptions: [
        { value: 'today', label: '今天' },
        { value: 'week', label: '近 7 天' },
        { value: 'month', label: '近 30 天' },
        { value: '', label: '全部' }
      ],
      pendingRecheck: 0,
      pageNum: 1,
      pageSize: 20,
      total: 0
    }
  },
  computed: {
    draftCount() {
      return this.checkList.filter(item => item.status === 'draft').length
    }
  },
  onShow() {
    this.loadList()
    this.loadRecheckCount()
  },
  methods: {
    pickStatus(value) {
      this.filterStatus = value
      this.loadList()
    },
    pickDate(value) {
      this.datePreset = value
      this.loadList()
    },
    rangeParams() {
      if (!this.datePreset) return {}
      const end = new Date()
      const start = new Date()
      if (this.datePreset === 'week') start.setDate(end.getDate() - 6)
      else if (this.datePreset === 'month') start.setDate(end.getDate() - 29)
      return { beginDate: ymd(start), endDate: ymd(end) }
    },
    async loadList() {
      this.loading = true
      try {
        const query = {
          pageNum: 1,
          pageSize: 100,
          status: this.filterStatus || undefined
        }
        Object.assign(query, this.rangeParams())
        const res = await listNightCheck(query)
        if (res.code === 200) {
          this.checkList = res.rows || []
          this.total = res.total || 0
        }
      } catch (e) {
        // 加载晚寝记录失败
      }
      this.loading = false
    },
    loadRecheckCount() {
      listRectify({ pageNum: 1, pageSize: 1, status: 'submitted' }).then(res => {
        this.pendingRecheck = res.total || 0
      }).catch(() => {})
    },
    loadMore() {
      this.pageNum++
    },
    fmtDate(value) {
      return value ? String(value).substring(0, 10) : '-'
    },
    fmtTime(value) {
      if (!value) return ''
      const s = String(value)
      if (s.indexOf(':') === -1) return s
      // 接口回的是 HH:mm:ss，小程序只显示到分
      return s.length > 10 ? s.substring(11, 16) : s.substring(0, 5)
    },
    totalOf(item) {
      if (item.expectedCount) return item.expectedCount
      return (item.presentCount || 0) + (item.absentCount || 0) + (item.lateCount || 0) +
        (item.leaveCount || 0) + (item.offcampusCount || 0) + (item.violationCount || 0)
    },
    attendanceModeText(value) {
      const map = {
        onsite: '现场逐床',
        phone: '学生手机确认',
        location: '楼栋定位',
        gesture: '手势照片',
        location_gesture: '定位 + 手势'
      }
      return map[value] || value
    },
    verifyStatusText(value) {
      const map = { not_required: '无需核验', pending: '待核验', verified: '已核验', failed: '核验失败' }
      return map[value] || '待核验'
    },
    scopeText(item) {
      const building = item.buildingName || '未记楼栋'
      if (!item.floor && item.floor !== 0) return building
      return building + ' ' + item.floor + '层'
    },
    /** 补归窗口与后端一致：只允许昨天和当天的已提交点名单 */
    canReturnLate(item) {
      if (item.status !== 'submitted') return false
      const day = (item.checkDate || '').substring(0, 10)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      return day === ymd(today) || day === ymd(yesterday)
    },
    goDetail(item) {
      const url = item.status === 'draft'
        ? '/pages/sub-work/dormcheck/night?id=' + item.id
        : '/pages/sub-work/dormcheck/detail?id=' + item.id
      uni.navigateTo({ url })
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/night' })
    },
    goPhoneSign() {
      uni.navigateTo({ url: '/pages/sub-work/sign/dorm-create' })
    },
    goRectify() {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/rectify' })
    }
  }
}
</script>

<style lang="scss" scoped>
.dormcheck-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 120rpx;
}
.line-bar {
  display: flex;
  background: #fff;
  padding: 20rpx;
  gap: 16rpx;
}
.line-item {
  flex: 1;
  padding: 18rpx 20rpx;
  border-radius: 12rpx;
  background: #f7f8fa;
  position: relative;
}
.line-item.active { background: #eef0ff; border: 1rpx solid #667eea; }
.line-name { display: block; font-size: 28rpx; font-weight: 600; color: #333; }
.line-desc { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.line-badge {
  position: absolute;
  top: 12rpx;
  right: 16rpx;
  background: #f56c6c;
  color: #fff;
  font-size: 20rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  border-radius: 16rpx;
  text-align: center;
  padding: 0 6rpx;
}
.filter-bar {
  display: flex;
  background: #fff;
  padding: 0 20rpx 20rpx;
  gap: 12rpx;
}
.filter-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #666;
  background: #f5f5f5;
  position: relative;
}
.filter-item.active { background: #667eea; color: #fff; }
.badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: #f56c6c;
  color: #fff;
  font-size: 20rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  border-radius: 16rpx;
  text-align: center;
  padding: 0 6rpx;
}
.year-bar {
  display: flex;
  background: #fff;
  padding: 0 20rpx 16rpx;
  gap: 12rpx;
  overflow-x: auto;
}
.year-item {
  padding: 10rpx 22rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
  background: #f5f5f5;
  white-space: nowrap;
}
.year-item.active { background: #667eea; color: #fff; }
.list-scroll { height: calc(100vh - 320rpx); }
.check-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.date-main { font-size: 30rpx; font-weight: 600; color: #333; }
.date-time { font-size: 24rpx; color: #999; margin-left: 12rpx; }
.status-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}
.status-draft { background: #fff3e0; color: #ff9800; }
.status-submitted { background: #e8f5e9; color: #4caf50; }
.card-body { border-top: 1rpx solid #f0f0f0; padding-top: 16rpx; }
.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.label { font-size: 24rpx; color: #999; flex-shrink: 0; }
.value { font-size: 24rpx; color: #333; text-align: right; }
.verify-mini {
  margin-left: auto;
  font-size: 19rpx;
  padding: 2rpx 10rpx;
  border-radius: 12rpx;
  background: #f4f4f5;
  color: #909399;
}
.verify-mini.verified { background: #e8f5e9; color: #4caf50; }
.verify-mini.pending { background: #fdf6ec; color: #e6a23c; }
.verify-mini.failed { background: #ffebee; color: #f44336; }
.count-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 8rpx 0; }
.count-chip {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #f7f8fa;
  color: #666;
}
.count-chip.green { color: #4caf50; background: #e8f5e9; }
.count-chip.red { color: #f44336; background: #ffebee; }
.count-chip.orange { color: #ff9800; background: #fff3e0; }
.count-chip.blue { color: #1976d2; background: #e3f2fd; }
.count-chip.gray { color: #607d8b; background: #eceff1; }
.count-chip.purple { color: #9c27b0; background: #f3e5f5; }
.card-action {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}
.action-text { font-size: 26rpx; color: #667eea; font-weight: 500; }
.empty-tip, .loading-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
.bottom-actions {
  position: fixed;
  bottom: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16rpx;
  white-space: nowrap;
}
.phone-btn {
  background: #fff;
  border: 2rpx solid #9aaeea;
  color: #536cbf;
  padding: 20rpx 34rpx;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.16);
  font-size: 28rpx;
}
.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20rpx 38rpx;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.4);
}
.add-btn-text { color: #fff; font-size: 30rpx; font-weight: 500; }
</style>
