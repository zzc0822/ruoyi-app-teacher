<template>
  <view class="verify-page">
    <!-- 登记信息展示 -->
    <view class="info-card">
      <view class="card-title">登记信息</view>
      <view class="info-row">
        <text class="info-label">学生</text>
        <text class="info-value">{{ detail.studentName }}（{{ detail.xh }}）</text>
      </view>
      <view class="info-row">
        <text class="info-label">班级</text>
        <text class="info-value">{{ detail.className }}</text>
      </view>
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
    </view>

    <!-- 佐证材料展示 -->
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

    <!-- 现场核实 -->
    <view class="verify-card">
      <view class="card-title">现场核实</view>
      <view class="tip-text">请到现场核实车辆实际情况，拍摄3-5张核实照片</view>

      <view class="form-item">
        <text class="form-label">现场照片（3-5张）<text class="required">*</text></text>
        <view class="photo-upload-grid">
          <view class="upload-item" v-for="(photo, idx) in verifyPhotoList" :key="idx">
            <image :src="photo" class="upload-preview" mode="aspectFill" />
            <view class="remove-btn" @click="removePhoto(idx)">×</view>
          </view>
          <view class="upload-item add-item" v-if="verifyPhotoList.length < 5" @click="chooseVerifyPhoto">
            <text class="add-icon">+</text>
            <text class="add-text">拍照</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">核实备注</text>
        <textarea class="form-textarea" v-model="verifyRemark" placeholder="请填写核实情况（选填）" maxlength="200" />
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-bar">
      <view class="action-btn reject-btn" @click="doVerify('rejected')">
        <text class="action-text">驳回</text>
      </view>
      <view class="action-btn pass-btn" @click="doVerify('verified')">
        <text class="action-text">通过</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getVehicle, verifyVehicle } from '@/api/affair/vehicle'
import { uploadFile } from '@/utils/upload'

export default {
  data() {
    return {
      id: null,
      detail: {},
      verifyPhotoList: [],
      verifyRemark: ''
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadDetail()
  },
  methods: {
    async loadDetail() {
      try {
        const res = await getVehicle(this.id)
        if (res.data) {
          this.detail = res.data
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    chooseVerifyPhoto() {
      if (this.verifyPhotoList.length >= 5) {
        return uni.showToast({ title: '最多5张', icon: 'none' })
      }
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera'],
        success: (res) => {
          const tempPath = res.tempFilePaths[0]
          uploadFile(tempPath).then(url => {
            this.verifyPhotoList.push(url)
          }).catch(() => {
            uni.showToast({ title: '上传失败', icon: 'none' })
          })
        }
      })
    },
    removePhoto(idx) {
      this.verifyPhotoList.splice(idx, 1)
    },
    previewImage(url) {
      uni.previewImage({ urls: [url] })
    },
    async doVerify(status) {
      if (status === 'verified' && this.verifyPhotoList.length < 3) {
        return uni.showToast({ title: '请至少拍摄3张现场核实照片', icon: 'none' })
      }
      if (status === 'verified' && this.verifyPhotoList.length > 5) {
        return uni.showToast({ title: '核实照片最多5张', icon: 'none' })
      }

      const actionText = status === 'verified' ? '通过' : '驳回'
      uni.showModal({
        title: '确认' + actionText,
        content: status === 'verified' ? '确认该车辆现场核实通过？' : '确认驳回该车辆登记？',
        success: async (modalRes) => {
          if (!modalRes.confirm) return
          try {
            const data = {
              id: this.id,
              verifyStatus: status,
              verifyPhotos: JSON.stringify(this.verifyPhotoList),
              verifyRemark: this.verifyRemark
            }
            const res = await verifyVehicle(data)
            if (res.code === 200) {
              uni.showToast({ title: '核实' + actionText + '成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 1500)
            }
          } catch (e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },
    getVehicleTypeText(type) {
      const map = { motorcycle: '摩托车', electric_bike: '电动车', bicycle: '自行车', car: '汽车' }
      return map[type] || type
    }
  }
}
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 140rpx;
}
.info-card, .verify-card {
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
.tip-text {
  font-size: 24rpx;
  color: #ff9800;
  background: #fff3e0;
  padding: 16rpx;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}
.form-item {
  margin-bottom: 20rpx;
}
.form-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}
.required {
  color: #f56c6c;
}
.photo-upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.upload-item {
  width: 160rpx;
  height: 160rpx;
  position: relative;
}
.upload-preview {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}
.remove-btn {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  background: #f56c6c;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 36rpx;
  font-size: 24rpx;
}
.add-item {
  background: #f5f5f5;
  border: 2rpx dashed #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
}
.add-icon {
  font-size: 48rpx;
  color: #999;
}
.add-text {
  font-size: 22rpx;
  color: #999;
}
.form-textarea {
  background: #f5f5f5;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  width: 100%;
  height: 140rpx;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
  gap: 20rpx;
}
.action-btn {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
}
.reject-btn {
  background: #fff5f5;
  border: 2rpx solid #f56c6c;
}
.reject-btn .action-text {
  color: #f56c6c;
  font-size: 30rpx;
  font-weight: 500;
}
.pass-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.pass-btn .action-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}
</style>
