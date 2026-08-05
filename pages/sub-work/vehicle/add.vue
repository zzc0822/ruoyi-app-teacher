<template>
  <view class="vehicle-add-page">
    <view class="form-card">
      <view class="card-title">学生信息</view>
      <view class="form-item">
        <text class="form-label">选择学生 <text class="required">*</text></text>
        <student-picker ref="stuPicker" placeholder="输入姓名或学号搜索" @select="onStudentSelect" @clear="onStudentClear"></student-picker>
      </view>
      <view class="form-item">
        <text class="form-label">学号</text>
        <input class="form-input" v-model="form.xh" placeholder="自动填充" disabled />
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
        <view class="plate-input-trigger" @click="showPlateKeyboard = true">
          <text v-if="form.plateNo" class="plate-value">{{ form.plateNo }}</text>
          <text v-else class="plate-placeholder">点击输入车牌号</text>
          <text class="picker-arrow">▶</text>
        </view>
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

    <!-- 车牌键盘弹窗 -->
    <view class="plate-keyboard-mask" v-if="showPlateKeyboard" @click="showPlateKeyboard = false">
      <view class="plate-keyboard-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">输入车牌号</text>
          <text class="popup-close" @click="showPlateKeyboard = false">✕</text>
        </view>
        <plate-keyboard :value="form.plateNo" @change="onPlateChange"></plate-keyboard>
      </view>
    </view>

    <view class="submit-btn" @click="submit">
      <text class="submit-text">提交登记</text>
    </view>
    <!-- 水印Canvas（离屏） -->
    <canvas canvas-id="watermarkCanvas" style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"></canvas>
  </view>
</template>

<script>
import { addVehicle } from '@/api/affair/vehicle'
import { uploadFile } from '@/utils/upload'
import studentPicker from '@/components/student-picker/index.vue'
import plateKeyboard from '@/components/plate-keyboard/index.vue'
import { getWatermarkConfig } from '@/api/work/watermark'
import { getLocation, addWatermark } from '@/utils/watermark'

export default {
  components: { studentPicker, plateKeyboard },
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
      showPlateKeyboard: false,
      watermarkConfig: null,
      vehicleTypeOptions: [
        { label: '电动车', value: 'electric_bike' },
        { label: '摩托车', value: 'motorcycle' },
        { label: '自行车', value: 'bicycle' },
        { label: '汽车', value: 'car' }
      ]
    }
  },
  onLoad() {
    getWatermarkConfig('vehicle').then(res => {
      this.watermarkConfig = res.data
    }).catch(() => {})
  },
  methods: {
    onPlateChange(plate) {
      this.form.plateNo = plate
    },
    onStudentSelect(stu) {
      if (!stu) return
      this.form.xh = stu.xh || ''
      this.form.studentName = stu.studentName || ''
      this.form.bjdm = stu.bjdm || ''
      this.form.className = stu.className || stu.bjjc || ''
      this.form.xydm = stu.xydm || ''
    },
    onStudentClear() {
      this.form.xh = ''
      this.form.studentName = ''
      this.form.bjdm = ''
      this.form.className = ''
      this.form.xydm = ''
    },
    onVehicleTypeChange(e) {
      this.form.vehicleType = this.vehicleTypeOptions[e.detail.value].value
    },
    chooseImage(field) {
      uni.showActionSheet({
        itemList: ['拍照上传', '从相册选择'],
        success: (action) => {
          if (action.index === 0) {
            // 拍照 → 加水印
            const locPromise = getLocation()
            uni.chooseImage({
              count: 1,
              sizeType: ['compressed'],
              sourceType: ['camera'],
              success: async (res) => {
                let tempPath = res.tempFilePaths[0]
                if (this.watermarkConfig && this.watermarkConfig.enabled === '1') {
                  const location = await locPromise
                  tempPath = await addWatermark(tempPath, this.watermarkConfig, location)
                }
                uploadFile(tempPath).then(url => {
                  this.form[field] = url
                }).catch(() => {
                  uni.showToast({ title: '上传失败', icon: 'none' })
                })
              }
            })
          } else {
            // 相册 → 不加水印
            uni.chooseImage({
              count: 1,
              sizeType: ['compressed'],
              sourceType: ['album'],
              success: (res) => {
                uploadFile(res.tempFilePaths[0]).then(url => {
                  this.form[field] = url
                }).catch(() => {
                  uni.showToast({ title: '上传失败', icon: 'none' })
                })
              }
            })
          }
        }
      })
    },
    async submit() {
      if (!this.form.xh) return uni.showToast({ title: '请选择学生', icon: 'none' })
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
  padding: 20rpx 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  min-height: 72rpx;
  line-height: 72rpx;
  box-sizing: border-box;
}
.form-textarea {
  background: #f5f5f5;
  padding: 20rpx 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  width: 100%;
  min-height: 180rpx;
  box-sizing: border-box;
}
.form-picker {
  background: #f5f5f5;
  padding: 20rpx 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  min-height: 72rpx;
  line-height: 72rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}
.plate-input-trigger {
  background: #f5f5f5;
  padding: 20rpx 24rpx;
  border-radius: 8rpx;
  min-height: 72rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}
.plate-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  letter-spacing: 2rpx;
}
.plate-placeholder {
  font-size: 28rpx;
  color: #999;
}
/* 车牌键盘弹窗 */
.plate-keyboard-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.plate-keyboard-popup {
  width: 100%;
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
  background: #f5f6f8;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}
.popup-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.popup-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
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
