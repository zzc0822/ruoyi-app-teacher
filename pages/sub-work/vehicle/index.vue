<template>
  <view class="vehicle-list-page">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: filterStatus === '' }" @click="filterStatus = ''">
        <text>全部</text>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'pending' }" @click="filterStatus = 'pending'">
        <text>待核实</text>
        <view class="badge" v-if="pendingCount > 0">{{ pendingCount }}</view>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'verified' }" @click="filterStatus = 'verified'">
        <text>已通过</text>
      </view>
      <view class="filter-item" :class="{ active: filterStatus === 'rejected' }" @click="filterStatus = 'rejected'">
        <text>已驳回</text>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="vehicle-card" v-for="item in filteredList" :key="item.id" @click="goDetail(item)">
        <view class="card-top">
          <view class="student-info">
            <text class="student-name">{{ item.studentName }}</text>
            <text class="class-name">{{ item.className }}</text>
          </view>
          <view class="status-tag" :class="'status-' + item.verifyStatus">
            <text>{{ getStatusText(item.verifyStatus) }}</text>
          </view>
        </view>
        <view class="card-body">
          <view class="info-row">
            <text class="label">车辆类型</text>
            <text class="value">{{ getVehicleTypeText(item.vehicleType) }}</text>
          </view>
          <view class="info-row" v-if="item.plateNo">
            <text class="label">车牌号</text>
            <text class="value">{{ item.plateNo }}</text>
          </view>
          <view class="info-row">
            <text class="label">登记时间</text>
            <text class="value">{{ item.createTime }}</text>
          </view>
        </view>
        <view class="card-action" v-if="item.verifyStatus === 'pending'">
          <text class="action-text">点击去现场核实 →</text>
        </view>
      </view>

      <view class="empty-tip" v-if="filteredList.length === 0 && !loading">
        <text>暂无车辆登记记录</text>
      </view>
      <view class="loading-tip" v-if="loading">
        <text>加载中...</text>
      </view>
    </scroll-view>

    <!-- 新增按钮 -->
    <view class="add-btn" @click="goAdd">
      <text class="add-btn-text">+ 新增登记</text>
    </view>
  </view>
</template>

<script>
import { listVehicle } from '@/api/affair/vehicle'

export default {
  data() {
    return {
      loading: false,
      vehicleList: [],
      filterStatus: '',
      pageNum: 1,
      pageSize: 20,
      total: 0
    }
  },
  computed: {
    filteredList() {
      if (!this.filterStatus) return this.vehicleList
      return this.vehicleList.filter(item => item.verifyStatus === this.filterStatus)
    },
    pendingCount() {
      return this.vehicleList.filter(item => item.verifyStatus === 'pending').length
    }
  },
  onShow() {
    this.loadList()
  },
  methods: {
    async loadList() {
      this.loading = true
      try {
        const res = await listVehicle({ pageNum: 1, pageSize: 100 })
        if (res.code === 200) {
          this.vehicleList = res.rows || []
          this.total = res.total || 0
        }
      } catch (e) {
        // 加载车辆列表失败
      }
      this.loading = false
    },
    loadMore() {
      // 简化：一次加载全部
    },
    getStatusText(status) {
      const map = { pending: '待核实', verified: '已通过', rejected: '已驳回' }
      return map[status] || status
    },
    getVehicleTypeText(type) {
      const map = { motorcycle: '摩托车', electric_bike: '电动车', bicycle: '自行车', car: '汽车' }
      return map[type] || type
    },
    goDetail(item) {
      if (item.verifyStatus === 'pending') {
        uni.navigateTo({ url: '/pages/sub-work/vehicle/verify?id=' + item.id })
      } else {
        uni.navigateTo({ url: '/pages/sub-work/vehicle/detail?id=' + item.id })
      }
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/sub-work/vehicle/add' })
    }
  }
}
</script>

<style scoped>
.vehicle-list-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 120rpx;
}
.filter-bar {
  display: flex;
  background: #fff;
  padding: 20rpx;
  gap: 16rpx;
  border-bottom: 1rpx solid #eee;
}
.filter-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f5f5;
  position: relative;
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
.list-scroll {
  height: calc(100vh - 200rpx);
}
.vehicle-card {
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
.status-verified {
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
}
.value {
  font-size: 24rpx;
  color: #333;
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
