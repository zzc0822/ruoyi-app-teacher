<template>
  <view class="offcampus-list-page">
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
              <text class="stat-badge orange" v-if="item.pendingVerify">{{ item.pendingVerify }}待核实</text>
              <text class="stat-badge green" v-if="item.secretaryApproved">{{ item.secretaryApproved }}通过</text>
              <text class="stat-badge red" v-if="item.rejected">{{ item.rejected }}驳回</text>
            </view>
          </view>
          <view class="counselor-stat-bar">
            <view class="bar-fill bar-done" :style="'width:' + getApprovePercent(item) + '%'"></view>
          </view>
        </view>
        <view class="empty-tip" v-if="counselorStats.length === 0"><text>暂无数据</text></view>
      </view>
      <!-- 辅导员视图：个人统计 -->
      <view v-else class="personal-stats">
        <view class="personal-stats-row">
          <view class="personal-stat-item">
            <text class="ps-num">{{ personalStats.total || 0 }}</text>
            <text class="ps-label">总申请</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num orange">{{ personalStats.pendingVerify || 0 }}</text>
            <text class="ps-label">待核实</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num green">{{ personalStats.secretaryApproved || 0 }}</text>
            <text class="ps-label">已通过</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num red">{{ personalStats.rejected || 0 }}</text>
            <text class="ps-label">已驳回</text>
          </view>
        </view>
        <view class="completion-bar" v-if="(personalStats.total || 0) > 0">
          <view class="completion-fill" :style="'width:' + approveRate + '%'"></view>
          <text class="completion-text">通过率 {{ approveRate }}%</text>
        </view>
      </view>
    </view>
    <view class="stats-overview-mini" v-if="!showStatsOverview" @click="showStatsOverview = true">
      <text class="mini-title">{{ isSecretaryRole ? '辅导员统计' : '我的统计' }}</text>
      <text class="mini-toggle">展开 ↓</text>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: filterStatus === '' }" @click="filterStatus = ''">
        <text>全部</text>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'pending_verify' }" @click="filterStatus = 'pending_verify'">
        <text>待核实</text>
        <view class="badge" v-if="pendingVerifyCount > 0">{{ pendingVerifyCount }}</view>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'counselor_approved' }" @click="filterStatus = 'counselor_approved'">
        <text>待审批</text>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'student_affairs_approved' }" @click="filterStatus = 'student_affairs_approved'">
        <text>已通过</text>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'rejected' }" @click="filterStatus = 'rejected'">
        <text>已驳回</text>
      </view>
    </view>

    <!-- 学年筛选 -->
    <view class="year-bar">
      <view class="year-item" :class="{ active: filterYear === '' }" @click="filterYear = ''">
        <text>全部学年</text>
      </view>
      <view class="year-item" :class="{ active: filterYear === year }" v-for="year in yearOptions" :key="year" @click="filterYear = year">
        <text>{{ year }}</text>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="offcampus-card" v-for="item in filteredList" :key="item.id" @click="goDetail(item)">
        <view class="card-top">
          <view class="student-info">
            <text class="student-name">{{ item.studentName }}</text>
            <text class="class-name">{{ item.className }}</text>
          </view>
          <view class="status-tag" :class="'status-' + getStatusClass(item)">
            <text>{{ getStatusText(item.status, item.verifyStatus) }}</text>
          </view>
        </view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">外宿类型</text>
            <text class="value">{{ getHousingTypeText(item.housingType) }}</text>
          </view>
          <view class="info-row">
            <text class="label">学年</text>
            <text class="value">{{ item.academicYear }}</text>
          </view>
          <view class="info-row">
            <text class="label">外宿地址</text>
            <text class="value text-ellipsis">{{ item.address }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请时间</text>
            <text class="value">{{ item.createTime }}</text>
          </view>
        </view>
        <view class="card-action" v-if="item.verifyStatus === 'pending' || canApprove(item)">
          <text class="action-text">{{ item.verifyStatus === 'pending' ? '点击去现场核实 →' : '点击审批 →' }}</text>
        </view>
      </view>

      <view class="empty-tip" v-if="filteredList.length === 0 && !loading">
        <text>暂无外宿申请记录</text>
      </view>
      <view class="loading-tip" v-if="loading">
        <text>加载中...</text>
      </view>
    </scroll-view>

    <!-- 新增按钮 -->
    <view class="add-btn" @click="goAdd">
      <text class="add-btn-text">+ 新增申请</text>
    </view>
  </view>
</template>

<script>
import { listOffcampus } from '@/api/affair/offcampus'
import { getModuleOverview, getModuleStatsByCounselor } from '@/api/student/moduleStats'
import { isSecretary } from '@/utils/role'

export default {
  data() {
    return {
      loading: false,
      applyList: [],
      filterStatus: '',
      filterYear: '',
      yearOptions: [],
      pageNum: 1,
      pageSize: 20,
      total: 0,
      isSecretaryRole: false,
      showStatsOverview: true,
      counselorStats: [],
      personalStats: { total: 0, pendingVerify: 0, secretaryApproved: 0, rejected: 0 }
    }
  },
  computed: {
    approveRate() {
      const total = this.personalStats.total || 0
      const approved = this.personalStats.secretaryApproved || 0
      return total > 0 ? Math.round((approved / total) * 100) : 0
    },
    filteredList() {
      let list = this.applyList
      if (this.filterStatus) {
        list = list.filter(item => item.status === this.filterStatus)
      }
      if (this.filterYear) {
        list = list.filter(item => item.academicYear === this.filterYear)
      }
      return list
    },
    pendingVerifyCount() {
      return this.applyList.filter(item => item.verifyStatus === 'pending').length
    }
  },
  onLoad() {
    this.checkRole()
  },
  onShow() {
    this.loadList()
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
        getModuleStatsByCounselor('offcampus').then(res => {
          const data = res.data || []
          this.counselorStats = data.sort((a, b) => (b.total || 0) - (a.total || 0))
        }).catch(() => {})
      } else {
        getModuleOverview().then(res => {
          if (res.data && res.data.offcampus) {
            this.personalStats = res.data.offcampus
          }
        }).catch(() => {})
      }
    },
    getApprovePercent(item) {
      const total = item.total || 0
      const approved = item.secretaryApproved || 0
      return total > 0 ? Math.round((approved / total) * 100) : 0
    },
    async loadList() {
      this.loading = true
      try {
        const res = await listOffcampus({ pageNum: 1, pageSize: 100 })
        if (res.code === 200) {
          this.applyList = res.rows || []
          this.total = res.total || 0
          // 提取学年选项
          const years = new Set()
          this.applyList.forEach(item => {
            if (item.academicYear) years.add(item.academicYear)
          })
          this.yearOptions = Array.from(years).sort().reverse()
        }
      } catch (e) {
        // 加载外宿列表失败
      }
      this.loading = false
    },
    loadMore() {
      // 简化：一次加载全部
    },
    getStatusClass(item) {
      if (item.status === 'rejected') return 'rejected'
      if (item.status === 'student_affairs_approved') return 'approved'
      if (item.verifyStatus === 'pending') return 'pending'
      return 'processing'
    },
    getStatusText(status, verifyStatus) {
      if (status === 'rejected') return '已驳回'
      if (status === 'student_affairs_approved') return '已通过'
      if (verifyStatus === 'pending') return '待核实'
      if (status === 'counselor_approved') return '待书记审批'
      if (status === 'secretary_approved') return '待学生处审批'
      return status
    },
    getHousingTypeText(type) {
      const map = { own_house: '自有住房', rent_house: '租房' }
      return map[type] || type
    },
    canApprove(item) {
      return item.verifyStatus === 'verified' &&
             (item.status === 'counselor_approved' || item.status === 'secretary_approved')
    },
    goDetail(item) {
      if (item.verifyStatus === 'pending') {
        uni.navigateTo({ url: '/pages/sub-work/offcampus/verify?id=' + item.id })
      } else {
        uni.navigateTo({ url: '/pages/sub-work/offcampus/detail?id=' + item.id })
      }
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/sub-work/offcampus/add' })
    }
  }
}
</script>

<style lang="scss" scoped>
.offcampus-list-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 120rpx;
}
.filter-bar {
  display: flex;
  background: #fff;
  padding: 20rpx;
  gap: 12rpx;
  border-bottom: 1rpx solid #eee;
  flex-wrap: wrap;
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
  min-width: 100rpx;
}
.filter-item.active {
  background: #667eea;
  color: #fff;
}
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
  padding: 12rpx 20rpx;
  gap: 12rpx;
  overflow-x: auto;
  border-bottom: 1rpx solid #eee;
}
.year-item {
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
  background: #f5f5f5;
  white-space: nowrap;
}
.year-item.active {
  background: #667eea;
  color: #fff;
}
.list-scroll {
  height: calc(100vh - 240rpx);
}
.offcampus-card {
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
.student-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.student-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.class-name {
  font-size: 24rpx;
  color: #999;
}
.status-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}
.status-pending {
  background: #fff3e0;
  color: #ff9800;
}
.status-processing {
  background: #e3f2fd;
  color: #2196f3;
}
.status-approved {
  background: #e8f5e9;
  color: #4caf50;
}
.status-rejected {
  background: #ffebee;
  color: #f44336;
}
.card-body {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.label {
  font-size: 24rpx;
  color: #999;
  flex-shrink: 0;
}
.value {
  font-size: 24rpx;
  color: #333;
  text-align: right;
}
.text-ellipsis {
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-action {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
  text-align: center;
}
.action-text {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 500;
}
.empty-tip, .loading-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
.add-btn {
  position: fixed;
  bottom: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.4);
}
.add-btn-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
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
  color: #667eea;
}

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
  font-size: 22rpx;
  font-weight: bold;
  color: #999;
  background: #f5f5f5;
  &.rank-1 { background: #ffd700; color: #fff; }
  &.rank-2 { background: #c0c0c0; color: #fff; }
  &.rank-3 { background: #cd7f32; color: #fff; }
}

.counselor-stat-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.counselor-stat-badges {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.stat-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  &.blue { color: #667eea; background: #eef0ff; }
  &.orange { color: #ff9800; background: #fff3e0; }
  &.green { color: #4caf50; background: #e8f5e9; }
  &.red { color: #f44336; background: #ffebee; }
}

.counselor-stat-bar {
  height: 12rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
  &.bar-done { background: linear-gradient(90deg, #667eea, #764ba2); }
}

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
  color: #333;
  &.orange { color: #ff9800; }
  &.green { color: #4caf50; }
  &.red { color: #f44336; }
}

.ps-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.completion-bar {
  position: relative;
  height: 32rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  overflow: hidden;
}

.completion-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 16rpx;
  transition: width 0.3s;
}

.completion-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  font-size: 20rpx;
  color: #fff;
}
</style>
