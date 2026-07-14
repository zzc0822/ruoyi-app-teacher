<template>
  <view class="detail-page">
    <view class="info-card">
      <view class="card-title">学生信息</view>
      <view class="info-row">
        <text class="info-label">学号</text>
        <text class="info-value">{{ detail.xh }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">姓名</text>
        <text class="info-value">{{ detail.studentName }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">班级</text>
        <text class="info-value">{{ detail.className }}</text>
      </view>
    </view>

    <view class="info-card">
      <view class="card-title">车辆信息</view>
      <view class="info-row">
        <text class="info-label">车辆类型</text>
        <text class="info-value">{{ getVehicleTypeText(detail.vehicleType) }}</text>
      </view>
      <view class="info-row" v-if="detail.plateNo">
        <text class="info-label">车牌号</text>
        <text class="info-value">{{ detail.plateNo }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">申请理由</text>
        <text class="info-value">{{ detail.applyReason }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">登记时间</text>
        <text class="info-value">{{ detail.createTime }}</text>
      </view>
    </view>

    <view class="info-card" v-if="detail.verifyStatus">
      <view class="card-title">核实结果</view>
      <view class="info-row">
        <text class="info-label">核实状态</text>
        <text class="info-value" :class="'status-text-' + detail.verifyStatus">{{ getStatusText(detail.verifyStatus) }}</text>
      </view>
      <view class="info-row" v-if="detail.verifyTime">
        <text class="info-label">核实时间</text>
        <text class="info-value">{{ detail.verifyTime }}</text>
      </view>
      <view class="info-row" v-if="detail.verifyRemark">
        <text class="info-label">核实备注</text>
        <text class="info-value">{{ detail.verifyRemark }}</text>
      </view>
      <view class="verify-photos" v-if="detail.verifyPhotos">
        <text class="form-label">现场核实照片</text>
        <view class="photo-grid">
          <image v-for="(url, idx) in parseVerifyPhotos()" :key="idx" :src="url" class="photo-img" mode="aspectFill" @click="previewImage(url)" />
        </view>
      </view>
    </view>

    <view class="info-card">
      <view class="card-title">佐证材料</view>
      <view class="photo-grid">
        <view class="photo-item" v-if="detail.vehiclePhoto">
          <image :src="detail.vehiclePhoto" class="photo-img" mode="aspectFill" @click="previewImage(detail.vehiclePhoto)" />
          <text class="photo-label">车辆照片</text>
        </view>
        <view class="photo-item" v-if="detail.drivingLicense">
          <image :src="detail.drivingLicense" class="photo-img" mode="aspectFill" @click="previewImage(detail.drivingLicense)" />
          <text class="photo-label">驾驶证</text>
        </view>
        <view class="photo-item" v-if="detail.vehicleLicense">
          <image :src="detail.vehicleLicense" class="photo-img" mode="aspectFill" @click="previewImage(detail.vehicleLicense)" />
          <text class="photo-label">行驶证</text>
        </view>
        <view class="photo-item" v-if="detail.idCardPhoto">
          <image :src="detail.idCardPhoto" class="photo-img" mode="aspectFill" @click="previewImage(detail.idCardPhoto)" />
          <text class="photo-label">身份证</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getVehicle } from '@/api/affair/vehicle'

export default {
  data() {
    return {
      detail: {}
    }
  },
  onLoad(options) {
    this.loadDetail(options.id)
  },
  methods: {
    async loadDetail(id) {
      try {
        const res = await getVehicle(id)
        if (res.data) {
          this.detail = res.data
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    getStatusText(status) {
      const map = { pending: '待核实', verified: '已通过', rejected: '已驳回' }
      return map[status] || status
    },
    getVehicleTypeText(type) {
      const map = { motorcycle: '摩托车', electric_bike: '电动车', bicycle: '自行车', car: '汽车' }
      return map[type] || type
    },
    parseVerifyPhotos() {
      if (!this.detail.verifyPhotos) return []
      try {
        return JSON.parse(this.detail.verifyPhotos)
      } catch (e) {
        return []
      }
    },
    previewImage(url) {
      uni.previewImage({ urls: [url] })
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 40rpx;
}
.info-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 12rpx;
  border-left: 6rpx solid #667eea;
}
.info-row {
  display: flex;
  margin-bottom: 12rpx;
}
.info-label {
  font-size: 26rpx;
  color: #999;
  width: 140rpx;
}
.info-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}
.status-text-verified {
  color: #4caf50;
  font-weight: 500;
}
.status-text-rejected {
  color: #f44336;
  font-weight: 500;
}
.status-text-pending {
  color: #ff9800;
  font-weight: 500;
}
.verify-photos {
  margin-top: 16rpx;
}
.form-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.photo-item {
  width: 160rpx;
  text-align: center;
}
.photo-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
}
.photo-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
</style>
