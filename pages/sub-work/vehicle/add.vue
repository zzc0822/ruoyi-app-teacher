<template>
  <view class="vehicle-add-page">
    <view class="form-card">
      <view class="card-title">学生信息</view>
      <view class="form-item">
        <text class="form-label">学号 <text class="required">*</text></text>
        <input class="form-input" v-model="form.xh" placeholder="请输入学号" @blur="onXhBlur" />
      </view>
      <view class="form-item">
        <text class="form-label">学生姓名</text>
        <input class="form-input" v-model="form.studentName" placeholder="自动填充" disabled />
      </view>
      <view class="form-item">
        <text class="form-label">班级</text>
        <input class="form-input" v-model="form.className" placeholder="自动填充" disabled />
      </view>
    </view>

    <view class="form-card">
      <view class="card-title">车辆信息</view>
      <view class="form-item">
        <text class="form-label">车辆类型 <text class="required">*</text></text>
        <picker :range="vehicleTypeOptions" range-key="label" @change="onVehicleTypeChange">
          <view class="form-picker">
            <text :class="{ placeholder: !form.vehicleType }">{{ form.vehicleType ? getVehicleTypeText(form.vehicleType) : '请选择车辆类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item" v-if="form.vehicleType === 'motorcycle' || form.vehicleType === 'car'">
        <text class="form-label">车牌号</text>
        <input class="form-input" v-model="form.plateNo" placeholder="请输入车牌号" />
      </view>
      <view class="form-item">
        <text class="form-label">申请理由 <text class="required">*</text></text>
        <textarea class="form-textarea" v-model="form.applyReason" placeholder="请输入申请理由" maxlength="200" />
      </view>
    </view>

    <view class="form-card">
      <view class="card-title">佐证材料</view>
      <view class="form-item">
        <text class="form-label">车辆照片 <text class="required">*</text></text>
        <view class="upload-area" @click="chooseImage('vehiclePhoto')">
          <image v-if="form.vehiclePhoto" :src="form.vehiclePhoto" class="preview-img" mode="aspectFill" />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">+</text>
            <text class="upload-text">拍照上传</text>
          </view>
        </view>
      </view>
      <view class="form-item" v-if="form.vehicleType === 'motorcycle' || form.vehicleType === 'car'">
        <text class="form-label">驾驶证</text>
        <view class="upload-area" @click="chooseImage('drivingLicense')">
          <image v-if="form.drivingLicense" :src="form.drivingLicense" class="preview-img" mode="aspectFill" />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">+</text>
            <text class="upload-text">拍照上传</text>
          </view>
        </view>
      </view>
      <view class="form-item" v-if="form.vehicleType === 'motorcycle' || form.vehicleType === 'car'">
        <text class="form-label">行驶证</text>
        <view class="upload-area" @click="chooseImage('vehicleLicense')">
          <image v-if="form.vehicleLicense" :src="form.vehicleLicense" class="preview-img" mode="aspectFill" />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">+</text>
            <text class="upload-text">拍照上传</text>
          </view>
        </view>
      </view>
      <view class="form-item">
        <text class="form-label">身份证</text>
        <view class="upload-area" @click="chooseImage('idCardPhoto')">
          <image v-if="form.idCardPhoto" :src="form.idCardPhoto" class="preview-img" mode="aspectFill" />
          <view v-else class="upload-placeholder">
            <text class="upload-icon">+</text>
            <text class="upload-text">拍照上传</text>
          </view>
        </view>
      </view>
    </view>

    <view class="submit-btn" @click="submit">
      <text class="submit-text">提交登记</text>
    </view>
  </view>
</template>

<script>
import { addVehicle } from '@/api/affair/vehicle'
import { getStuinfoByXh } from '@/api/student/stuinfo'
import { uploadFile } from '@/utils/upload'

export default {
  data() {
    return {
      form: {
        xh: '',
        studentName: '',
        bjdm: '',
        className: '',
        xydm: '',
        vehicleType: '',
        plateNo: '',
        vehiclePhoto: '',
        drivingLicense: '',
        vehicleLicense: '',
        idCardPhoto: '',
        applyReason: ''
      },
      vehicleTypeOptions: [
        { label: '电动车', value: 'electric_bike' },
        { label: '摩托车', value: 'motorcycle' },
        { label: '自行车', value: 'bicycle' },
        { label: '汽车', value: 'car' }
      ]
    }
  },
  methods: {
    async onXhBlur() {
      if (!this.form.xh) return
      try {
        const res = await getStuinfoByXh(this.form.xh)
        if (res.data) {
          this.form.studentName = res.data.studentName || ''
          this.form.bjdm = res.data.bjdm || ''
          this.form.className = res.data.className || ''
          this.form.xydm = res.data.xydm || ''
        }
      } catch (e) {
        uni.showToast({ title: '未找到该学生', icon: 'none' })
      }
    },
    onVehicleTypeChange(e) {
      this.form.vehicleType = this.vehicleTypeOptions[e.detail.value].value
    },
    chooseImage(field) {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: (res) => {
          const tempPath = res.tempFilePaths[0]
          uploadFile(tempPath).then(url => {
            this.form[field] = url
          }).catch(() => {
            uni.showToast({ title: '上传失败', icon: 'none' })
          })
        }
      })
    },
    async submit() {
      if (!this.form.xh) return uni.showToast({ title: '请输入学号', icon: 'none' })
      if (!this.form.vehicleType) return uni.showToast({ title: '请选择车辆类型', icon: 'none' })
      if (!this.form.vehiclePhoto) return uni.showToast({ title: '请上传车辆照片', icon: 'none' })
      if (!this.form.applyReason) return uni.showToast({ title: '请输入申请理由', icon: 'none' })

      try {
        const res = await addVehicle(this.form)
        if (res.code === 200) {
          uni.showToast({ title: '登记成功，待现场核实', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1500)
        }
      } catch (e) {
        uni.showToast({ title: '提交失败', icon: 'none' })
      }
    },
    getVehicleTypeText(type) {
      const map = { motorcycle: '摩托车', electric_bike: '电动车', bicycle: '自行车', car: '汽车' }
      return map[type] || type
    }
  }
}
</script>

<style scoped>
.vehicle-add-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 120rpx;
}
.form-card {
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
.form-item {
  margin-bottom: 24rpx;
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
.form-input {
  background: #f5f5f5;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}
.form-textarea {
  background: #f5f5f5;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  width: 100%;
  height: 160rpx;
}
.form-picker {
  background: #f5f5f5;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  justify-content: space-between;
}
.placeholder {
  color: #999;
}
.picker-arrow {
  font-size: 20rpx;
  color: #999;
}
.upload-area {
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  overflow: hidden;
}
.upload-placeholder {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #ddd;
}
.upload-icon {
  font-size: 48rpx;
  color: #999;
}
.upload-text {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.preview-img {
  width: 100%;
  height: 100%;
}
.submit-btn {
  position: fixed;
  bottom: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20rpx 80rpx;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.4);
}
.submit-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}
</style>
