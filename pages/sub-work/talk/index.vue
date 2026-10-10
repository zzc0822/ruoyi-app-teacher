<template>
  <view class="page-container">
    <!-- 顶部统计 + 新增按钮 -->
    <view class="top-row">
      <view class="stats-card">
        <view class="stats-date">
          <text class="stats-date-text">谈心谈话</text>
        </view>
        <view class="stats-row">
          <view class="stats-item">
            <text class="stats-num">{{ stats.total || 0 }}</text>
            <text class="stats-label">全部</text>
          </view>
          <view class="stats-item">
            <text class="stats-num blue">{{ stats.pending || 0 }}</text>
            <text class="stats-label">待谈话</text>
          </view>
          <view class="stats-item">
            <text class="stats-num orange">{{ stats.ongoing || 0 }}</text>
            <text class="stats-label">进行中</text>
          </view>
          <view class="stats-item">
            <text class="stats-num green">{{ stats.completed || 0 }}</text>
            <text class="stats-label">已完成</text>
          </view>
        </view>
      </view>
      <view class="add-btn-col" @click="goAdd">
        <uni-icons type="plusempty" size="28" color="#fff"></uni-icons>
        <text class="add-btn-label">新增</text>
      </view>
    </view>

    <!-- 待谈话提醒（已隐藏） -->
    <!-- <view class="pending-section" v-if="pendingList.length > 0">
      <view class="pending-bar" @click="showPending = !showPending">
        <view class="pending-left">
          <view class="pending-dot"></view>
          <text class="pending-text">待谈话 {{ pendingList.length }} 条</text>
        </view>
        <uni-icons :type="showPending ? 'up' : 'down'" size="14" color="#e43d33"></uni-icons>
      </view>
      <view class="pending-list" v-if="showPending">
        <view class="pending-item" v-for="(item, index) in pendingList" :key="index" @click="goDetail(item)">
          <view class="pi-left">
            <text class="pi-name">{{ item.studentNames || '未知学生' }}</text>
            <text class="pi-type">{{ formatTalkCategory(item.talkCategory) }}</text>
          </view>
          <view class="pi-right">
            <text :class="['pi-urgency', 'urg-' + (item.urgency || 'normal')]">{{ formatUrgency(item.urgency) }}</text>
            <text class="pi-deadline" v-if="item.deadline">{{ formatDeadline(item.deadline) }}</text>
          </view>
        </view>
      </view>
    </view> -->

    <!-- 统计概览 -->
    <view class="stats-overview" v-if="showStatsOverview">
      <view class="overview-header" @click="showStatsOverview = false">
        <text class="overview-title">{{ isSecretaryRole ? '按辅导员分组统计' : '我的统计' }}</text>
        <text class="overview-toggle">收起 ↑</text>
      </view>
      <!-- 书记视图：按辅导员分组 -->
      <view v-if="isSecretaryRole" class="counselor-stats-list">
        <view class="counselor-stat-item" v-for="(item, idx) in counselorStats" :key="idx">
          <view class="counselor-stat-header">
            <view class="counselor-rank" :class="'rank-' + (idx < 3 ? idx + 1 : 'n')">{{ idx + 1 }}</view>
            <text class="counselor-stat-name">{{ item.counselorName || '未知' }}</text>
            <view class="counselor-stat-badges">
              <text class="stat-badge blue">{{ item.total || 0 }}条</text>
              <text class="stat-badge orange" v-if="item.pending">{{ item.pending }}待谈</text>
              <text class="stat-badge green" v-if="item.completed">{{ item.completed }}完成</text>
            </view>
          </view>
          <view class="counselor-stat-bar">
            <view class="bar-fill bar-done" :style="'width:' + getCounselorPercent(item) + '%'"></view>
          </view>
        </view>
        <view class="empty-tip" v-if="counselorStats.length === 0">
          <text>暂无数据</text>
        </view>
      </view>
      <!-- 辅导员视图：个人统计 -->
      <view v-else class="personal-stats">
        <view class="personal-stats-row">
          <view class="personal-stat-item">
            <text class="ps-num">{{ personalStats.total || 0 }}</text>
            <text class="ps-label">总记录</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num blue">{{ personalStats.pending || 0 }}</text>
            <text class="ps-label">待谈话</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num orange">{{ personalStats.ongoing || 0 }}</text>
            <text class="ps-label">进行中</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num green">{{ personalStats.completed || 0 }}</text>
            <text class="ps-label">已完成</text>
          </view>
        </view>
        <view class="completion-bar" v-if="(personalStats.total || 0) > 0">
          <view class="completion-fill" :style="'width:' + completionRate + '%'"></view>
          <text class="completion-text">完成率 {{ completionRate }}%</text>
        </view>
      </view>
    </view>
    <view class="stats-overview-mini" v-if="!showStatsOverview" @click="showStatsOverview = true">
      <text class="mini-title">{{ isSecretaryRole ? '辅导员统计' : '我的统计' }}</text>
      <text class="mini-toggle">展开 ↓</text>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view :class="['filter-btn', filterStatus === '' ? 'filter-active' : '']" @click="setFilter('')">
        <text>全部</text>
      </view>
      <view :class="['filter-btn', filterStatus === 'pending' ? 'filter-active' : '']" @click="setFilter('pending')">
        <text>待谈话</text>
      </view>
      <view :class="['filter-btn', filterStatus === 'ongoing' ? 'filter-active' : '']" @click="setFilter('ongoing')">
        <text>进行中</text>
      </view>
      <view :class="['filter-btn', filterStatus === 'completed' ? 'filter-active' : '']" @click="setFilter('completed')">
        <text>已完成</text>
      </view>
    </view>

    <!-- 谈话记录列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="list-item" v-for="(item, index) in list" :key="index" @click="goDetail(item)">
        <!-- 左侧色条 -->
        <view :class="['item-bar', 'bar-' + (item.talkCategory || 'daily')]"></view>
        <view class="item-content">
          <view class="item-header">
            <text class="item-name">{{ item.studentNames || item.talkName || '未知' }}</text>
            <text :class="['item-status', item.talkStatus === 'completed' ? 'st-done' : item.talkStatus === 'ongoing' ? 'st-ongoing' : 'st-pending']">
              {{ formatStatus(item.talkStatus) }}
            </text>
          </view>
          <view class="item-meta">
            <text :class="['item-category', 'cat-' + (item.talkCategory || 'daily')]">{{ formatTalkCategory(item.talkCategory) }}</text>
            <text :class="['item-role', 'role-' + (item.recorderRole || 'counselor')]">{{ (item.recorderRole === 'headteacher' ? '班主任' : '辅导员') }}{{ item.writable === false ? '·' + (item.talkName || '') : '' }}</text>
            <text class="item-info">{{ item.studentCount || 0 }}人</text>
            <text class="item-info" v-if="item.talkTime">{{ formatTime(item.talkTime) }}</text>
            <text class="item-info" v-if="item.shareCount > 0">共享{{ item.shareCount }}人</text>
          </view>
          <view class="item-detail" v-if="item.talkPlace">
            <text class="item-place">📍 {{ item.talkPlace }}</text>
          </view>
          <view class="item-detail" v-if="item.talkType">
            <text class="item-types">📋 {{ formatTalkTypes(item.talkType) }}</text>
          </view>
          <view class="item-bottom">
            <text class="item-deadline" v-if="item.deadline && item.talkStatus !== 'completed'">
              截止：{{ formatDeadline(item.deadline) }}
            </text>
            <text class="item-attach" v-if="item.attachmentCount > 0">📎 {{ item.attachmentCount }}</text>
            <text class="item-attach" v-if="item.shareCount > 0">👥 共享{{ item.shareCount }}</text>
            <text class="item-recorder" v-if="item.writable === false">由 {{ item.talkName || '他人' }} 记录</text>
          </view>
          <!-- 附件缩略图 -->
          <view class="item-attach-list" v-if="item.attachmentList && item.attachmentList.length > 0" @click.stop>
            <view class="attach-thumb-wrap" v-for="(att, ai) in item.attachmentList.filter(a => a.mediaType === 'image').slice(0, 3)" :key="ai" @click="previewPhoto(item.attachmentList, ai)">
              <image :src="baseUrl + '/profile' + att.filePath" mode="aspectFill" class="attach-thumb"></image>
            </view>
            <view class="attach-file-tag" v-if="item.attachmentList.some(a => a.mediaType !== 'image')">
              <text>{{ item.attachmentList.filter(a => a.mediaType !== 'image').length }}个文件</text>
            </view>
          </view>
        </view>
      </view>
      <uni-load-more :status="loadStatus" @clickLoadMore="loadMore"></uni-load-more>
    </scroll-view>
  </view>
</template>

<script>
import { listTalk, getPendingTalks } from '@/api/work/talk'
import { getModuleOverview, getModuleStatsByCounselor } from '@/api/student/moduleStats'
import { isSecretary } from '@/utils/role'
import config from '@/config'

export default {
  data() {
    return {
      baseUrl: config.baseUrl,
      queryParam: { pageNum: 1, pageSize: 20 },
      list: [],
      total: 0,
      loadStatus: 'more',
      pendingList: [],
      showPending: true,
      filterStatus: '',
      stats: { total: 0, pending: 0, ongoing: 0, completed: 0 },
      isSecretaryRole: false,
      showStatsOverview: true,
      counselorStats: [],
      personalStats: { total: 0, pending: 0, ongoing: 0, completed: 0 }
    }
  },
  computed: {
    completionRate() {
      const total = this.personalStats.total || 0
      const completed = this.personalStats.completed || 0
      return total > 0 ? Math.round((completed / total) * 100) : 0
    }
  },
  onLoad() {
    this.checkRole()
    this.getList()
    this.getPending()
  },
  onShow() {
    if (this.list.length > 0 || this._loaded) {
      this.queryParam.pageNum = 1
      this.getList()
      this.getPending()
    }
    this._loaded = true
    
    // 监听刷新事件
    uni.$on('refreshTalkList', this.refreshList)
  },
  onHide() {
    // 移除事件监听
    uni.$off('refreshTalkList', this.refreshList)
  },
  methods: {
    checkRole() {
      let roles = []
      try { roles = uni.getStorageSync('user_roles') || [] } catch (e) {}
      if (!Array.isArray(roles) || roles.length === 0) {
        const store = this.$store
        if (store && store.state && store.state.user && store.state.user.roles) {
          roles = store.state.user.roles
        }
      }
      this.isSecretaryRole = isSecretary(roles)
      this.loadOverviewStats()
    },
    loadOverviewStats() {
      if (this.isSecretaryRole) {
        getModuleStatsByCounselor('talk').then(res => {
          const data = res.data || []
          this.counselorStats = data.sort((a, b) => (b.total || 0) - (a.total || 0))
        }).catch(() => {})
      } else {
        getModuleOverview().then(res => {
          if (res.data && res.data.talk) {
            this.personalStats = res.data.talk
          }
        }).catch(() => {})
      }
    },
    getCounselorPercent(item) {
      const total = item.total || 0
      const completed = item.completed || 0
      return total > 0 ? Math.round((completed / total) * 100) : 0
    },
    // 刷新列表（用于事件触发）
    refreshList() {
      this.queryParam.pageNum = 1
      this.getList()
      this.getPending()
    },
    getList() {
      this.loadStatus = 'loading'
      const params = { ...this.queryParam }
      if (this.filterStatus) {
        params.talkStatus = this.filterStatus
      }
      listTalk(params).then(res => {
        const rows = res.rows || []
        if (this.queryParam.pageNum === 1) {
          this.list = rows
        } else {
          this.list = [...this.list, ...rows]
        }
        this.total = res.total || 0
        this.loadStatus = this.list.length >= this.total ? 'noMore' : 'more'
        // 获取统计数据（从后端）
        this.loadStats()
      }).catch(() => { this.loadStatus = 'more' })
    },
    loadStats() {
      if (this.personalStats && this.personalStats.total) {
        this.stats = {
          total: this.personalStats.total || 0,
          pending: this.personalStats.pending || 0,
          ongoing: this.personalStats.ongoing || 0,
          completed: this.personalStats.completed || 0
        }
      }
    },
    getPending() {
      getPendingTalks().then(res => {
        this.pendingList = res.data || []
        this.stats.pending = this.pendingList.length
      }).catch(() => {})
    },
    loadMore() {
      if (this.list.length < this.total) {
        this.queryParam.pageNum++
        this.getList()
      }
    },
    setFilter(status) {
      this.filterStatus = status
      this.queryParam.pageNum = 1
      this.getList()
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/sub-work/talk/add' })
    },
    goDetail(item) {
      uni.navigateTo({ url: '/pages/sub-work/talk/add?id=' + item.id })
    },
    formatTalkCategory(val) {
      const map = { daily: '日常谈心', disciplinary: '违纪谈话' }
      return map[val] || val || '日常谈心'
    },
    formatStatus(val) {
      const map = { pending: '待谈话', ongoing: '进行中', completed: '已完成' }
      return map[val] || '待谈话'
    },
    formatUrgency(val) {
      const map = { overdue: '已逾期', today: '今日截止', tomorrow: '明日截止', normal: '常规' }
      return map[val] || ''
    },
    formatTalkTypes(val) {
      if (!val) return ''
      const map = { ideological: '思想动态', psychological: '心理健康', academic: '学业指导', career: '就业指导', life: '生活关怀', discipline: '纪律教育', other: '其他' }
      return val.split(',').map(v => map[v] || v).join('、')
    },
    formatTime(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    },
    formatDeadline(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    },
    previewPhoto(attachmentList, index) {
      const imageList = attachmentList.filter(a => a.mediaType === 'image')
      const urls = imageList.map(a => this.baseUrl + '/profile' + a.filePath)
      const currentUrl = imageList[index] ? (this.baseUrl + '/profile' + imageList[index].filePath) : urls[0]
      uni.previewImage({
        current: currentUrl,
        urls: urls
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f7;
}

/* ===== 顶部统计+新增 ===== */
.top-row {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  padding: 20rpx 20rpx 0;
}

.stats-card {
  flex: 0 0 75%;
  background: linear-gradient(135deg, #f3a044, #e07e1c);
  border-radius: 20rpx;
  padding: 24rpx;
}

.stats-date {
  text-align: center;
  margin-bottom: 16rpx;
}

.stats-date-text {
  font-size: 26rpx;
  color: rgba(255,255,255,0.9);
  font-weight: 500;
}

.stats-row {
  display: flex;
  justify-content: space-around;
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  &.blue { color: #a0cfff; }
  &.orange { color: #fbbd3c; }
  &.green { color: #a5d6a7; }
}

.stats-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  margin-top: 6rpx;
}

.add-btn-col {
  flex: 1;
  background: linear-gradient(135deg, #18bc37, #0fad2e);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.add-btn-label {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

/* ===== 待谈话 ===== */
.pending-section {
  margin: 20rpx 20rpx 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.pending-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fef0f0;
}

.pending-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pending-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #e43d33;
}

.pending-text {
  font-size: 28rpx;
  color: #e43d33;
  font-weight: bold;
}

.pending-list {
  padding: 0 24rpx;
}

.pending-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.pending-item:last-child {
  border-bottom: none;
}

.pi-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pi-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.pi-type {
  font-size: 22rpx;
  color: #999;
}

.pi-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.pi-urgency {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  &.urg-overdue { color: #e43d33; background: #ffebee; }
  &.urg-today { color: #f3a044; background: #fef3e2; }
  &.urg-tomorrow { color: #2979ff; background: #e8f0ff; }
  &.urg-normal { color: #18bc37; background: #e8f8ea; }
}

.pi-deadline {
  font-size: 20rpx;
  color: #999;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 20rpx 10rpx;
}

.filter-btn {
  padding: 8rpx 24rpx;
  border-radius: 30rpx;
  background: #fff;
  font-size: 24rpx;
  color: #666;
}

.filter-active {
  background: #f3a044;
  color: #fff;
}

/* ===== 列表 ===== */
.list-scroll {
  flex: 1;
  padding: 0 20rpx 20rpx;
}

.list-item {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  display: flex;
  overflow: hidden;
}

.item-bar {
  width: 8rpx;
  flex-shrink: 0;
  &.bar-daily { background: #00bcd4; }
  &.bar-disciplinary { background: #e43d33; }
}

.item-content {
  flex: 1;
  padding: 24rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.item-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.item-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  &.st-done { color: #18bc37; background: #e8f8ea; }
  &.st-ongoing { color: #2979ff; background: #e8f0ff; }
  &.st-pending { color: #f3a044; background: #fef3e2; }
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 10rpx;
}

.item-category {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  &.cat-daily { color: #00bcd4; background: #e0f7fa; }
  &.cat-disciplinary { color: #e43d33; background: #ffebee; }
}

.item-role {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  &.role-counselor { color: #2979ff; background: #e8f0ff; }
  &.role-headteacher { color: #f3a044; background: #fef3e2; }
}

.item-info {
  font-size: 24rpx;
  color: #999;
}

.item-detail {
  margin-bottom: 8rpx;
}

.item-place {
  font-size: 24rpx;
  color: #666;
}

.item-types {
  font-size: 24rpx;
  color: #666;
}

.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
}

.item-deadline {
  font-size: 22rpx;
  color: #e43d33;
}

.item-attach {
  font-size: 22rpx;
  color: #999;
}

.item-recorder {
  font-size: 22rpx;
  color: #bbb;
  margin-left: auto;
}

.item-attach-list {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
  flex-wrap: wrap;
  align-items: center;
}

.attach-thumb-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.attach-thumb {
  width: 120rpx;
  height: 120rpx;
}

.attach-file-tag {
  padding: 6rpx 16rpx;
  background: #f5f6f7;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #666;
}

/* ===== 统计概览 ===== */
.stats-overview {
  margin: 16rpx 20rpx 0;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.overview-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.overview-toggle {
  font-size: 24rpx;
  color: #999;
}

.stats-overview-mini {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16rpx 20rpx 0;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.mini-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.mini-toggle {
  font-size: 24rpx;
  color: #2979ff;
}

/* 书记视图：辅导员列表 */
.counselor-stats-list {
  max-height: 500rpx;
  overflow-y: auto;
}

.counselor-stat-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.counselor-stat-item:last-child {
  border-bottom: none;
}

.counselor-stat-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.counselor-rank {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: bold;
  color: #999;
  background: #f0f0f0;
  flex-shrink: 0;
}

.counselor-rank.rank-1 { background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; }
.counselor-rank.rank-2 { background: linear-gradient(135deg, #c0c0c0, #e8e8e8); color: #333; }
.counselor-rank.rank-3 { background: linear-gradient(135deg, #cd7f32, #e8a862); color: #fff; }

.counselor-stat-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.counselor-stat-badges {
  display: flex;
  gap: 8rpx;
}

.stat-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
  color: #666;
}

.stat-badge.blue { background: #e8f0ff; color: #2979ff; }
.stat-badge.orange { background: #fef3e2; color: #f3a044; }
.stat-badge.green { background: #e8f8ea; color: #18bc37; }
.stat-badge.red { background: #fef0f0; color: #e43d33; }

.counselor-stat-bar {
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.bar-fill.bar-done {
  background: linear-gradient(90deg, #18bc37, #4caf50);
}

/* 辅导员视图：个人统计 */
.personal-stats {
  padding: 8rpx 0;
}

.personal-stats-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16rpx;
}

.personal-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ps-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #f3a044;
  &.blue { color: #2979ff; }
  &.green { color: #18bc37; }
  &.orange { color: #f3a044; }
}

.ps-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.completion-bar {
  position: relative;
  height: 32rpx;
  background: #f0f0f0;
  border-radius: 16rpx;
  overflow: hidden;
}

.completion-fill {
  height: 100%;
  background: linear-gradient(90deg, #f3a044, #ffca28);
  border-radius: 16rpx;
  transition: width 0.3s ease;
}

.completion-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 500;
  color: #333;
}

.empty-tip {
  text-align: center;
  padding: 24rpx 0;
  color: #999;
  font-size: 24rpx;
}
</style>
