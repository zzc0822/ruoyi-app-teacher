<template>
  <view class="offcampus-list-page">
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
      total: 0
    }
  },
  computed: {
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
  onShow() {
    this.loadList()
  },
  methods: {
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

<style scoped>
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
</style>
