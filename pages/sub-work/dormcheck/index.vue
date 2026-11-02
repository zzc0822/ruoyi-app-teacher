<template>
  <view class="dorm-wb">
    <view class="wb-top">
      <view class="wb-title-row">
        <view>
          <text class="wb-title">宿舍工作台</text>
          <text class="wb-scope">{{ scopeText }}</text>
        </view>
        <view class="wb-refresh" @click="refresh">
          <uni-icons type="refreshempty" size="16" color="#64748b" />
        </view>
      </view>
      <view class="wb-stats">
        <view class="wb-stat">
          <text class="ws-num">{{ overview.overview.total || 0 }}</text>
          <text class="ws-label">在住学生</text>
        </view>
        <view class="wb-stat">
          <text class="ws-num">{{ overview.overview.rooms || 0 }}</text>
          <text class="ws-label">宿舍房间</text>
        </view>
        <view class="wb-stat">
          <text class="ws-num">{{ roomSummary.checked || 0 }}<text class="ws-sub">/{{ roomSummary.total || 0 }}</text></text>
          <text class="ws-label">今日已查</text>
        </view>
        <view class="wb-stat">
          <text class="ws-num warn">{{ openIssueCount }}</text>
          <text class="ws-label">未闭环异常</text>
        </view>
      </view>
    </view>

    <view class="wb-todo">
      <view class="todo-item" @click="goRectify">
        <text class="todo-num" :class="{ alert: pendingSuggestion > 0 }">{{ pendingSuggestion }}</text>
        <text class="todo-label">建议待确认</text>
      </view>
      <view class="todo-item" @click="goRectify">
        <text class="todo-num" :class="{ alert: pendingRecheck > 0 }">{{ pendingRecheck }}</text>
        <text class="todo-label">待现场复核</text>
      </view>
      <view class="todo-item" @click="switchTab('issues')">
        <text class="todo-num" :class="{ alert: openIssueCount > 0 }">{{ openIssueCount }}</text>
        <text class="todo-label">异常待处理</text>
      </view>
      <view class="todo-item" @click="goRectify">
        <text class="todo-num">{{ rectifyOpenCount }}</text>
        <text class="todo-label">整改未闭环</text>
      </view>
    </view>

    <view class="wb-quick">
      <view class="quick-item" @click="startPatrol">
        <view class="qi-icon is-blue"><uni-icons type="search" size="18" color="#2563eb" /></view>
        <text class="qi-name">现场巡查</text>
        <text class="qi-desc">逐间评分</text>
      </view>
      <view class="quick-item" @click="goIssueAdd()">
        <view class="qi-icon is-orange"><uni-icons type="warning" size="18" color="#d97706" /></view>
        <text class="qi-name">登记异常</text>
        <text class="qi-desc">报修/安全/矛盾</text>
      </view>
      <view class="quick-item" @click="goNight">
        <view class="qi-icon is-indigo"><uni-icons type="moon" size="18" color="#4f46e5" /></view>
        <text class="qi-name">夜间考勤</text>
        <text class="qi-desc">人在不在</text>
      </view>
      <view class="quick-item" @click="goRectify">
        <view class="qi-icon is-green"><uni-icons type="checkmarkempty" size="18" color="#059669" /></view>
        <text class="qi-name">整改复核</text>
        <text class="qi-desc">内务与安全</text>
      </view>
    </view>

    <view class="wb-tabs">
      <view class="wb-tab" :class="{ active: tab === 'rooms' }" @click="switchTab('rooms')">
        <text>我的宿舍</text>
      </view>
      <view class="wb-tab" :class="{ active: tab === 'patrol' }" @click="switchTab('patrol')">
        <text>今日巡查</text>
      </view>
      <view class="wb-tab" :class="{ active: tab === 'issues' }" @click="switchTab('issues')">
        <text>异常待办</text>
        <view class="tab-badge" v-if="openIssueCount > 0">{{ openIssueCount }}</view>
      </view>
    </view>

    <view class="wb-filter" v-if="tab !== 'issues'">
      <scroll-view scroll-x class="building-scroll">
        <view class="building-row">
          <text class="b-chip" :class="{ active: !buildingId }" @click="pickBuilding(null)">全部楼栋</text>
          <text class="b-chip" v-for="b in buildings" :key="b.id" :class="{ active: buildingId === Number(b.id) }"
                @click="pickBuilding(Number(b.id))">{{ b.label }}</text>
        </view>
      </scroll-view>
      <scroll-view scroll-x class="state-scroll" v-if="tab === 'patrol'">
        <view class="state-row">
          <text class="s-chip" v-for="s in stateOptions" :key="s.value" :class="{ active: roomState === s.value }"
                @click="roomState = s.value">{{ s.label }} {{ stateCount(s.value) }}</text>
        </view>
      </scroll-view>
      <view class="wb-search" v-if="tab === 'rooms'">
        <uni-icons type="search" size="14" color="#94a3b8" />
        <input v-model="keyword" class="search-input" placeholder="房号 / 宿舍长 / 学生" @confirm="loadRooms" />
      </view>
    </view>

    <scroll-view scroll-y class="wb-list" @scrolltolower="noop">
      <block v-if="tab !== 'issues'">
        <view class="room-card" v-for="room in filteredRooms" :key="room.roomId" @click="goRoom(room)">
          <view class="rc-top">
            <view class="rc-room">
              <text class="rc-no">{{ room.roomNo }}</text>
              <text class="rc-loc">{{ room.buildingName }}{{ room.floorNo ? ' · ' + room.floorNo + 'F' : '' }}</text>
            </view>
            <view class="rc-score" v-if="room.lastScore != null">
              <text class="score-num" :class="scoreClass(room.lastScore)">{{ room.lastScore }}</text>
              <text class="score-label">最近得分</text>
            </view>
            <view class="rc-score" v-else>
              <text class="score-none">未检查</text>
              <text class="score-label">暂无记录</text>
            </view>
          </view>
          <view class="rc-meta">
            <text class="meta-chip">在住 {{ room.occupantCount || 0 }}/{{ room.bedCount || 0 }}</text>
            <text class="meta-chip" v-if="room.dormHeadName">舍长 {{ room.dormHeadName }}</text>
            <text class="meta-chip" :class="'st-' + todayState(room).key">{{ todayState(room).text }}</text>
            <text class="meta-chip danger" v-if="room.openIssueCount > 0">异常 {{ room.openIssueCount }}</text>
          </view>
          <view class="rc-issue" v-if="room.openIssueCount > 0">
            <text class="issue-sev" :class="'sev-' + room.latestIssueSeverity">{{ severityLabel(room.latestIssueSeverity) }}</text>
            <text class="issue-title">{{ room.latestIssueTitle }}</text>
          </view>
          <view class="rc-actions">
            <view class="rc-btn ghost" @click.stop="goCheck(room)">
              <uni-icons type="compose" size="13" color="#2563eb" />
              <text>巡查评分</text>
            </view>
            <view class="rc-btn ghost" @click.stop="goIssueAdd(room)">
              <uni-icons type="plusempty" size="13" color="#d97706" />
              <text>登记异常</text>
            </view>
            <view class="rc-btn primary" @click.stop="goRoom(room)">
              <text>看详情</text>
            </view>
          </view>
        </view>
        <view class="empty-tip" v-if="!loading && filteredRooms.length === 0">
          <text>{{ tab === 'patrol' ? '当前筛选下没有待巡查宿舍' : '你带的班级暂无在住宿舍' }}</text>
        </view>
      </block>

      <block v-else>
        <view class="issue-card" v-for="it in issues" :key="it.issueId" @click="goIssueDetail(it)">
          <view class="ic-top">
            <view class="ic-room">
              <text class="ic-no">{{ it.roomNo }}</text>
              <text class="ic-loc">{{ it.buildingName }}{{ it.floorNo ? ' · ' + it.floorNo + 'F' : '' }}</text>
            </view>
            <text class="ic-status" :class="'st-' + it.status">{{ statusText(it.status) }}</text>
          </view>
          <view class="ic-title">{{ it.title }}</view>
          <view class="ic-meta">
            <text class="issue-sev" :class="'sev-' + it.severity">{{ severityLabel(it.severity) }}</text>
            <text class="meta-text">{{ typeLabel(it.issueType) }}</text>
            <text class="meta-text" v-if="it.relatedName">关联 {{ it.relatedName }}</text>
            <text class="meta-text">{{ fmtDate(it.reportTime) }}</text>
          </view>
          <view class="ic-footer">
            <text class="ic-handler" v-if="it.handlerName">处理人 {{ it.handlerName }}</text>
            <text class="ic-handler" v-else>登记人 {{ it.reporterName || '—' }}</text>
            <text class="ic-op">查看跟进 →</text>
          </view>
        </view>
        <view class="empty-tip" v-if="!loading && issues.length === 0">
          <text>当前没有未闭环异常</text>
        </view>
      </block>
      <view class="loading-tip" v-if="loading"><text>加载中...</text></view>
      <view class="list-bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import {
  getDormWorkbenchOverview,
  listDormWorkbenchRooms,
  listDormBuildings,
  listDormIssues,
  ensureDailyCheckTask
} from '@/api/work/dormcheck'

export default {
  data() {
    return {
      loading: false,
      overview: { overview: {}, issues: {}, scope: {}, rectify: [], roomSummary: {}, todayTask: null },
      rooms: [],
      issues: [],
      buildings: [],
      tab: 'rooms',
      buildingId: null,
      roomState: '',
      keyword: '',
      stateOptions: [
        { value: '', label: '全部' },
        { value: 'untouched', label: '未检查' },
        { value: 'checked', label: '已检查' },
        { value: 'problem', label: '有问题' },
        { value: 'rectify', label: '待整改' },
        { value: 'issue', label: '有异常' }
      ]
    }
  },
  computed: {
    scopeText() {
      const s = this.overview.scope || {}
      if (s.admin) return '全校宿舍'
      if (s.bjdmList && s.bjdmList.length) return '所带班级 · ' + s.bjdmList.length + ' 个班'
      if (s.xydm) return '本学院宿舍'
      return '未配置宿舍视野'
    },
    roomSummary() {
      return this.overview.roomSummary || {}
    },
    todayTask() {
      return this.overview.todayTask || null
    },
    rectifyMap() {
      const map = {}
      ;(this.overview.rectify || []).forEach(row => {
        const code = row.statusCode || row.status_code
        if (code) map[code] = Number(row.num || 0)
      })
      return map
    },
    pendingSuggestion() {
      return this.rectifyMap.suggested || 0
    },
    pendingRecheck() {
      return this.rectifyMap.submitted || 0
    },
    rectifyOpenCount() {
      return (this.rectifyMap.pending || 0) + (this.rectifyMap.submitted || 0) +
        (this.rectifyMap.rejected || 0) + (this.rectifyMap.overdue || 0) + (this.rectifyMap.suggested || 0)
    },
    openIssueCount() {
      const i = this.overview.issues || {}
      return Number(i.openCount || 0) + Number(i.processingCount || 0)
    },
    filteredRooms() {
      const keyword = String(this.keyword || '').trim().toLowerCase()
      return this.rooms.filter(room => {
        if (this.buildingId && Number(room.buildingId) !== Number(this.buildingId)) return false
        if (keyword) {
          const text = [room.roomNo, room.roomCode, room.dormHeadName, room.buildingName].join(' ').toLowerCase()
          if (text.indexOf(keyword) === -1) return false
        }
        if (this.tab !== 'patrol' || !this.roomState) return true
        if (this.roomState === 'untouched') return !room.todayRecordId
        if (this.roomState === 'checked') return !!room.todayRecordId
        if (this.roomState === 'problem') return room.todayProblemFlag === '1'
        if (this.roomState === 'rectify') {
          return ['pending', 'submitted', 'rejected', 'overdue'].indexOf(room.todayRectifyStatus) > -1
        }
        if (this.roomState === 'issue') return Number(room.openIssueCount || 0) > 0
        return true
      })
    }
  },
  onShow() {
    this.loadAll()
    this.loadBuildings()
  },
  onPullDownRefresh() {
    this.refresh()
  },
  methods: {
    refresh() {
      this.loadAll()
      this.loadBuildings()
      uni.stopPullDownRefresh()
    },
    loadAll() {
      this.loading = true
      return Promise.all([
        getDormWorkbenchOverview({}),
        listDormWorkbenchRooms({ buildingId: this.buildingId || undefined }),
        listDormIssues({ pageNum: 1, pageSize: 50, openFlag: '1' })
      ]).then(([overviewRes, roomsRes, issuesRes]) => {
        if (overviewRes.code === 200) {
          this.overview = overviewRes.data || { overview: {}, issues: {}, rectify: [] }
        }
        this.rooms = roomsRes.code === 200 ? (roomsRes.data || []) : []
        this.issues = issuesRes.code === 200 ? (issuesRes.rows || []) : []
        this.loading = false
      }).catch(() => { this.loading = false })
    },
    loadOverview() {
      getDormWorkbenchOverview({}).then(res => {
        if (res.code === 200) this.overview = res.data || this.overview
      }).catch(() => {})
    },
    loadRooms() {
      listDormWorkbenchRooms({ buildingId: this.buildingId || undefined }).then(res => {
        if (res.code === 200) this.rooms = res.data || []
      }).catch(() => {})
    },
    loadBuildings() {
      listDormBuildings({}).then(res => {
        this.buildings = res.code === 200 ? (res.data || []) : []
      }).catch(() => {})
    },
    pickBuilding(id) {
      this.buildingId = id
      this.loadRooms()
    },
    switchTab(tab) {
      this.tab = tab
      if (tab === 'issues') {
        listDormIssues({ pageNum: 1, pageSize: 50, openFlag: '1' }).then(res => {
          if (res.code === 200) this.issues = res.rows || []
        }).catch(() => {})
      }
    },
    stateCount(value) {
      if (!value) return this.rooms.length
      return this.rooms.filter(room => {
        if (value === 'untouched') return !room.todayRecordId
        if (value === 'checked') return !!room.todayRecordId
        if (value === 'problem') return room.todayProblemFlag === '1'
        if (value === 'rectify') return ['pending', 'submitted', 'rejected', 'overdue'].indexOf(room.todayRectifyStatus) > -1
        if (value === 'issue') return Number(room.openIssueCount || 0) > 0
        return true
      }).length
    },
    todayState(room) {
      if (room.todayRecordId) {
        if (room.todayProblemFlag === '1') return { key: 'problem', text: '今日有问题' }
        return { key: 'done', text: '今日已查' }
      }
      return { key: 'todo', text: '今日未查' }
    },
    scoreClass(score) {
      const n = Number(score)
      if (n >= 95) return 'is-excellent'
      if (n >= 85) return 'is-good'
      if (n >= 60) return 'is-pass'
      return 'is-fail'
    },
    severityLabel(value) {
      return { low: '一般', medium: '关注', high: '紧急' }[value] || '一般'
    },
    typeLabel(value) {
      return {
        facility: '设施故障',
        safety: '安全隐患',
        discipline: '违纪苗头',
        conflict: '宿舍矛盾',
        hygiene: '卫生问题',
        psych: '心理关注',
        other: '其他'
      }[value] || value || '其他'
    },
    statusText(value) {
      return { open: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' }[value] || value || '待处理'
    },
    fmtDate(value) {
      return value ? String(value).substring(0, 10) : '—'
    },
    startPatrol() {
      uni.showLoading({ title: '准备巡查' })
      ensureDailyCheckTask().then(res => {
        if (res.code !== 200) {
          const error = new Error(res.msg || '无法开始巡查')
          error.isBusiness = true
          throw error
        }
        this.tab = 'patrol'
        return this.loadAll()
      }).then(() => {
        uni.hideLoading()
        if (!this.rooms.length) {
          uni.showToast({ title: '暂无可巡查宿舍', icon: 'none' })
          return
        }
        const next = this.rooms.find(room => !room.todayRecordId)
        if (next) {
          this.goCheck(next)
        } else {
          uni.showToast({ title: '今日巡查已完成', icon: 'none' })
        }
      }).catch(error => {
        uni.hideLoading()
        uni.showToast({
          title: error && error.isBusiness ? error.message : '无法开始巡查',
          icon: 'none'
        })
      })
    },
    goRoom(room) {
      uni.navigateTo({
        url: '/pages/sub-work/dormcheck/room?roomId=' + room.roomId +
          '&buildingName=' + encodeURIComponent(room.buildingName || '') +
          '&roomNo=' + encodeURIComponent(room.roomNo || '') +
          '&floorNo=' + (room.floorNo == null ? '' : room.floorNo)
      })
    },
    goCheck(room) {
      uni.navigateTo({
        url: '/pages/sub-work/dormcheck/checkRecord?roomId=' + room.roomId +
          '&roomNo=' + encodeURIComponent(room.roomNo || '') +
          '&buildingName=' + encodeURIComponent(room.buildingName || '')
      })
    },
    goIssueAdd(room) {
      let url = '/pages/sub-work/dormcheck/issue?action=add'
      if (room) {
        url += '&roomId=' + room.roomId +
          '&roomNo=' + encodeURIComponent(room.roomNo || '') +
          '&buildingName=' + encodeURIComponent(room.buildingName || '')
      }
      uni.navigateTo({ url })
    },
    goIssueDetail(issue) {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/issueDetail?issueId=' + issue.issueId })
    },
    goNight() {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/night' })
    },
    goRectify() {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/rectify' })
    },
    noop() {}
  }
}
</script>

<style lang="scss" scoped>
.dorm-wb {
  min-height: 100vh;
  background: #f4f6fa;
  display: flex;
  flex-direction: column;
}
.wb-top {
  padding: 24rpx 24rpx 18rpx;
  background: linear-gradient(180deg, #eef3fb 0%, #f4f6fa 100%);
}
.wb-title-row { display: flex; align-items: flex-start; justify-content: space-between; }
.wb-title { display: block; font-size: 38rpx; font-weight: 700; color: #1e293b; line-height: 50rpx; }
.wb-scope { display: block; margin-top: 2rpx; font-size: 22rpx; color: #64748b; }
.wb-refresh { padding: 8rpx; }
.wb-stats { display: flex; gap: 10rpx; margin-top: 20rpx; }
.wb-stat {
  flex: 1;
  min-width: 0;
  padding: 16rpx 12rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
}
.ws-num { display: block; font-size: 36rpx; font-weight: 700; color: #1e293b; line-height: 44rpx; }
.ws-num.warn { color: #d97706; }
.ws-sub { font-size: 22rpx; font-weight: 400; color: #94a3b8; }
.ws-label { display: block; margin-top: 2rpx; font-size: 20rpx; color: #94a3b8; }
.wb-todo {
  display: flex;
  margin: 0 24rpx 16rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  overflow: hidden;
}
.todo-item { flex: 1; padding: 14rpx 4rpx; text-align: center; }
.todo-item + .todo-item { border-left: 1rpx solid #f1f5f9; }
.todo-num { display: block; font-size: 28rpx; font-weight: 700; color: #334155; line-height: 36rpx; }
.todo-num.alert { color: #dc2626; }
.todo-label { display: block; font-size: 19rpx; color: #94a3b8; }
.wb-quick {
  display: flex;
  gap: 10rpx;
  margin: 0 24rpx 16rpx;
}
.quick-item {
  flex: 1;
  min-width: 0;
  padding: 16rpx 8rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  text-align: center;
}
.qi-icon {
  width: 52rpx;
  height: 52rpx;
  margin: 0 auto 6rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qi-icon.is-blue { background: #dbeafe; }
.qi-icon.is-orange { background: #fef3c7; }
.qi-icon.is-indigo { background: #e0e7ff; }
.qi-icon.is-green { background: #d1fae5; }
.qi-name { display: block; font-size: 22rpx; font-weight: 600; color: #334155; }
.qi-desc { display: block; font-size: 18rpx; color: #94a3b8; margin-top: 2rpx; }
.wb-tabs {
  display: flex;
  margin: 0 24rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-bottom: 0;
  border-radius: 12rpx 12rpx 0 0;
}
.wb-tab {
  position: relative;
  flex: 1;
  padding: 18rpx 0 16rpx;
  text-align: center;
  font-size: 24rpx;
  color: #64748b;
}
.wb-tab.active { color: #2563eb; font-weight: 600; }
.wb-tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 44rpx;
  height: 4rpx;
  margin-left: -22rpx;
  border-radius: 2rpx;
  background: #2563eb;
}
.tab-badge {
  position: absolute;
  top: 8rpx;
  right: 24rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  line-height: 28rpx;
  border-radius: 14rpx;
  background: #ef4444;
  color: #fff;
  font-size: 18rpx;
}
.wb-filter {
  padding: 12rpx 24rpx;
  background: #fff;
  border-left: 1rpx solid #e2e8f0;
  border-right: 1rpx solid #e2e8f0;
}
.building-scroll, .state-scroll { white-space: nowrap; }
.building-row, .state-row { display: flex; gap: 10rpx; }
.b-chip, .s-chip {
  flex-shrink: 0;
  padding: 8rpx 18rpx;
  border-radius: 18rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 21rpx;
}
.b-chip.active, .s-chip.active { background: #2563eb; color: #fff; }
.state-scroll { margin-top: 10rpx; }
.wb-search {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 10rpx;
  padding: 10rpx 16rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 10rpx;
}
.search-input { flex: 1; font-size: 22rpx; color: #334155; }
.wb-list {
  flex: 1;
  height: calc(100vh - 680rpx);
  padding: 12rpx 24rpx 0;
  background: #fff;
  border-left: 1rpx solid #e2e8f0;
  border-right: 1rpx solid #e2e8f0;
}
.room-card, .issue-card {
  margin-bottom: 12rpx;
  padding: 18rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  background: #fff;
}
.rc-top, .ic-top { display: flex; align-items: flex-start; justify-content: space-between; }
.rc-room, .ic-room { min-width: 0; }
.rc-no, .ic-no { display: block; font-size: 30rpx; font-weight: 700; color: #1e293b; line-height: 38rpx; }
.rc-loc, .ic-loc { display: block; margin-top: 2rpx; font-size: 20rpx; color: #94a3b8; }
.rc-score { text-align: right; flex: none; margin-left: 12rpx; }
.score-num { display: block; font-size: 32rpx; font-weight: 700; line-height: 38rpx; }
.score-num.is-excellent { color: #059669; }
.score-num.is-good { color: #2563eb; }
.score-num.is-pass { color: #d97706; }
.score-num.is-fail { color: #dc2626; }
.score-none { display: block; font-size: 22rpx; color: #94a3b8; line-height: 38rpx; }
.score-label { display: block; font-size: 18rpx; color: #94a3b8; }
.rc-meta { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.meta-chip {
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 20rpx;
}
.meta-chip.danger { background: #fef2f2; color: #dc2626; }
.meta-chip.st-done { background: #ecfdf5; color: #059669; }
.meta-chip.st-problem { background: #fff7ed; color: #d97706; }
.meta-chip.st-todo { background: #f8fafc; color: #94a3b8; }
.rc-issue {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 10rpx;
  padding: 8rpx 12rpx;
  background: #fffbf5;
  border: 1rpx solid #fde8c8;
  border-radius: 8rpx;
}
.issue-sev {
  flex: none;
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
  font-size: 18rpx;
}
.sev-low { background: #f1f5f9; color: #64748b; }
.sev-medium { background: #fef3c7; color: #b45309; }
.sev-high { background: #fee2e2; color: #b91c1c; }
.issue-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 21rpx; color: #92400e; }
.rc-actions { display: flex; gap: 8rpx; margin-top: 14rpx; }
.rc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 10rpx 0;
  border-radius: 8rpx;
  font-size: 21rpx;
  text-align: center;
}
.rc-btn.ghost { flex: 1; background: #f8fafc; border: 1rpx solid #e2e8f0; color: #475569; }
.rc-btn.primary { flex: 1; background: #2563eb; color: #fff; }
.ic-status { flex: none; padding: 4rpx 12rpx; border-radius: 10rpx; font-size: 19rpx; }
.ic-status.st-open { background: #fef2f2; color: #dc2626; }
.ic-status.st-processing { background: #fff7ed; color: #d97706; }
.ic-status.st-resolved { background: #ecfdf5; color: #059669; }
.ic-status.st-closed { background: #f1f5f9; color: #64748b; }
.ic-title { margin-top: 10rpx; font-size: 26rpx; font-weight: 600; color: #1e293b; line-height: 34rpx; }
.ic-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.meta-text { font-size: 20rpx; color: #64748b; }
.ic-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #f1f5f9;
}
.ic-handler { font-size: 20rpx; color: #94a3b8; }
.ic-op { font-size: 21rpx; color: #2563eb; }
.empty-tip, .loading-tip { padding: 60rpx 0; text-align: center; font-size: 24rpx; color: #94a3b8; }
.list-bottom-space { height: 30rpx; }
</style>
