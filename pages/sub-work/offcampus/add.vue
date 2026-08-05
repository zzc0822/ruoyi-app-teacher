<template>
  <view class="offcampus-add-page">
    <!-- 学生信息 -->
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
      <view class="form-item">
        <text class="form-label">学年</text>
        <input class="form-input" v-model="form.academicYear" disabled />
      </view>
    </view>

    <!-- 外宿信息 -->
    <view class="form-card">
      <view class="card-title">外宿信息</view>
      <view class="form-item">
        <text class="form-label">外宿类型 <text class="required">*</text></text>
        <picker :range="housingTypeOptions" range-key="label" @change="onHousingTypeChange">
          <view class="form-picker">
            <text :class="{ placeholder: !form.housingType }">{{ form.housingType ? getHousingTypeText(form.housingType) : '请选择外宿类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">外宿地址 <text class="required">*</text></text>
        <input class="form-input" v-model="form.address" placeholder="请输入外宿地址" />
      </view>
      <view class="form-item">
        <text class="form-label">外宿理由 <text class="required">*</text></text>
        <textarea class="form-textarea" v-model="form.applyReason" placeholder="请输入外宿理由" maxlength="500" />
      </view>
    </view>

    <!-- 佐证材料 -->
    <view class="form-card">
      <view class="card-title">佐证材料</view>
      <!-- 自有住房 -->
      <view v-if="form.housingType === 'own_house'">
        <view class="form-item">
          <text class="form-label">房产证照片 <text class="required">*</text></text>
          <view class="upload-area" @click="chooseImage('propertyCert')">
            <image v-if="form.propertyCert" :src="form.propertyCert" class="preview-img" mode="aspectFill" />
            <view v-else class="upload-placeholder"><text class="upload-icon">+</text><text class="upload-text">拍照上传</text></view>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">关系证明（户口本）<text class="required">*</text></text>
          <view class="upload-area" @click="chooseImage('relationCert')">
            <image v-if="form.relationCert" :src="form.relationCert" class="preview-img" mode="aspectFill" />
            <view v-else class="upload-placeholder"><text class="upload-icon">+</text><text class="upload-text">拍照上传</text></view>
          </view>
        </view>
      </view>
      <!-- 租房 -->
      <view v-if="form.housingType === 'rent_house'">
        <view class="form-item">
          <text class="form-label">租房合同照片 <text class="required">*</text></text>
          <view class="upload-area" @click="chooseImage('rentContract')">
            <image v-if="form.rentContract" :src="form.rentContract" class="preview-img" mode="aspectFill" />
            <view v-else class="upload-placeholder"><text class="upload-icon">+</text><text class="upload-text">拍照上传</text></view>
          </view>
        </view>
      </view>
      <!-- 通用材料 -->
      <view class="form-item" v-if="form.housingType">
        <text class="form-label">外宿理由佐证（3-5张）<text class="required">*</text></text>
        <view class="photo-upload-grid">
          <view class="upload-item" v-for="(photo, idx) in reasonPhotoList" :key="idx">
            <image :src="photo" class="upload-preview" mode="aspectFill" />
            <view class="remove-btn" @click="removePhoto('reason', idx)">×</view>
          </view>
          <view class="upload-item add-item" v-if="reasonPhotoList.length < 5" @click="chooseMultiImage('reason')">
            <text class="add-icon">+</text><text class="add-text">拍照</text>
          </view>
        </view>
      </view>
      <view class="form-item" v-if="form.housingType">
        <text class="form-label">住宿环境照片（3-5张）<text class="required">*</text></text>
        <view class="photo-upload-grid">
          <view class="upload-item" v-for="(photo, idx) in housingPhotoList" :key="idx">
            <image :src="photo" class="upload-preview" mode="aspectFill" />
            <view class="remove-btn" @click="removePhoto('housing', idx)">×</view>
          </view>
          <view class="upload-item add-item" v-if="housingPhotoList.length < 5" @click="chooseMultiImage('housing')">
            <text class="add-icon">+</text><text class="add-text">拍照</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 交通信息 -->
    <view class="form-card" v-if="form.housingType">
      <view class="card-title">交通信息</view>
      <view class="form-item">
        <text class="form-label">往返学校交通工具 <text class="required">*</text></text>
        <picker :range="transportOptions" range-key="label" @change="onTransportChange">
          <view class="form-picker">
            <text :class="{ placeholder: !form.transportType }">{{ form.transportType ? getTransportText(form.transportType) : '请选择交通工具' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item" v-if="form.transportType === 'motorcycle' || form.transportType === 'car'">
        <text class="form-label">关联车辆登记</text>
        <picker :range="vehicleOptions" range-key="label" @change="onVehicleChange">
          <view class="form-picker">
            <text :class="{ placeholder: !form.vehicleId }">{{ form.vehicleId ? selectedVehicleLabel : '请选择已登记车辆（可选）' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">交通证明照片</text>
        <view class="upload-area" @click="chooseImage('transportProof')">
          <image v-if="form.transportProof" :src="form.transportProof" class="preview-img" mode="aspectFill" />
          <view v-else class="upload-placeholder"><text class="upload-icon">+</text><text class="upload-text">拍照上传</text></view>
        </view>
      </view>
    </view>

    <view class="submit-btn" @click="submit">
      <text class="submit-text">提交申请</text>
    </view>
    <!-- 水印Canvas（离屏） -->
    <canvas canvas-id="watermarkCanvas" style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"></canvas>
  </view>
</template>

<script>
import { addOffcampus } from '@/api/affair/offcampus'
import { listVehicle } from '@/api/affair/vehicle'
import { uploadFile } from '@/utils/upload'
import studentPicker from '@/components/student-picker/index.vue'
import { getWatermarkConfig } from '@/api/work/watermark'
import { getLocation, addWatermark } from '@/utils/watermark'

export default {
  components: { studentPicker },
  computed: {
    selectedVehicleLabel() {
      const v = this.vehicleOptions.find(v => v.value === this.form.vehicleId)
      return v ? v.label : ''
    }
  },
  data() {
    return {
      form: {
        xh: '', studentName: '', bjdm: '', className: '', xydm: '',
        academicYear: '', housingType: '', applyReason: '', address: '',
        propertyCert: '', relationCert: '', rentContract: '',
        transportType: '', transportProof: '', vehicleId: null
      },
      reasonPhotoList: [],
      housingPhotoList: [],
      housingTypeOptions: [
        { label: '自有住房', value: 'own_house' },
        { label: '租房', value: 'rent_house' }
      ],
      transportOptions: [
        { label: '步行', value: 'walk' },
        { label: '公交车', value: 'bus' },
        { label: '地铁', value: 'metro' },
        { label: '电动车', value: 'electric_bike' },
        { label: '摩托车', value: 'motorcycle' },
        { label: '汽车', value: 'car' },
        { label: '其他', value: 'other' }
      ],
      vehicleOptions: [],
      watermarkConfig: null
    }
  },
  onLoad() {
    this.calcAcademicYear()
    getWatermarkConfig('offcampus').then(res => {
      this.watermarkConfig = res.data
    }).catch(() => {})
  },
  methods: {
    calcAcademicYear() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      if (month >= 9) {
        this.form.academicYear = year + '-' + (year + 1)
      } else {
        this.form.academicYear = (year - 1) + '-' + year
      }
    },
    async onStudentSelect(stu) {
      if (!stu) return
      this.form.xh = stu.xh || ''
      this.form.studentName = stu.studentName || ''
      this.form.bjdm = stu.bjdm || ''
      this.form.className = stu.className || stu.bjjc || ''
      this.form.xydm = stu.xydm || ''
      // 加载该学生的车辆登记列表
      this.loadStudentVehicles()
    },
    onStudentClear() {
      this.form.xh = ''
      this.form.studentName = ''
      this.form.bjdm = ''
      this.form.className = ''
      this.form.xydm = ''
      this.vehicleOptions = []
    },
    async loadStudentVehicles() {
      try {
        const res = await listVehicle({ xh: this.form.xh, verifyStatus: 'verified', pageNum: 1, pageSize: 50 })
        if (res.code === 200 && res.rows) {
          this.vehicleOptions = res.rows
            .filter(v => v.vehicleType === 'motorcycle' || v.vehicleType === 'car')
            .map(v => ({ label: v.plateNo + ' (' + v.vehicleType + ')', value: v.id }))
        }
      } catch (e) {
        // 加载车辆列表失败
      }
    },
    onHousingTypeChange(e) {
      this.form.housingType = this.housingTypeOptions[e.detail.value].value
    },
    onTransportChange(e) {
      this.form.transportType = this.transportOptions[e.detail.value].value
    },
    onVehicleChange(e) {
      this.form.vehicleId = this.vehicleOptions[e.detail.value].value
    },
    chooseImage(field) {
      uni.showActionSheet({
        itemList: ['拍照上传', '从相册选择'],
        success: (action) => {
          if (action.index === 0) {
            // 拍照 → 加水印
            const locPromise = getLocation()
            uni.chooseImage({
              count: 1, sizeType: ['compressed'], sourceType: ['camera'],
              success: async (res) => {
                let path = res.tempFilePaths[0]
                if (this.watermarkConfig && this.watermarkConfig.enabled === '1') {
                  const location = await locPromise
                  path = await addWatermark(path, this.watermarkConfig, location)
                }
                uploadFile(path).then(url => {
                  this.form[field] = url
                }).catch(() => { uni.showToast({ title: '上传失败', icon: 'none' }) })
              }
            })
          } else {
            // 相册 → 不加水印
            uni.chooseImage({
              count: 1, sizeType: ['compressed'], sourceType: ['album'],
              success: (res) => {
                uploadFile(res.tempFilePaths[0]).then(url => {
                  this.form[field] = url
                }).catch(() => { uni.showToast({ title: '上传失败', icon: 'none' }) })
              }
            })
          }
        }
      })
    },
    chooseMultiImage(type) {
      const list = type === 'reason' ? this.reasonPhotoList : this.housingPhotoList
      if (list.length >= 5) return uni.showToast({ title: '最多5张', icon: 'none' })
      uni.showActionSheet({
        itemList: ['拍照上传', '从相册选择'],
        success: (action) => {
          if (action.index === 0) {
            const locPromise = getLocation()
            uni.chooseImage({
              count: 1, sizeType: ['compressed'], sourceType: ['camera'],
              success: async (res) => {
                let path = res.tempFilePaths[0]
                if (this.watermarkConfig && this.watermarkConfig.enabled === '1') {
                  const location = await locPromise
                  path = await addWatermark(path, this.watermarkConfig, location)
                }
                uploadFile(path).then(url => {
                  list.push(url)
                }).catch(() => { uni.showToast({ title: '上传失败', icon: 'none' }) })
              }
            })
          } else {
            uni.chooseImage({
              count: 1, sizeType: ['compressed'], sourceType: ['album'],
              success: (res) => {
                uploadFile(res.tempFilePaths[0]).then(url => {
                  list.push(url)
                }).catch(() => { uni.showToast({ title: '上传失败', icon: 'none' }) })
              }
            })
          }
        }
      })
    },
    removePhoto(type, idx) {
      if (type === 'reason') this.reasonPhotoList.splice(idx, 1)
      else this.housingPhotoList.splice(idx, 1)
    },
    getHousingTypeText(type) {
      const map = { own_house: '自有住房', rent_house: '租房' }
      return map[type] || type
    },
    getTransportText(type) {
      const map = { walk: '步行', bus: '公交车', metro: '地铁', electric_bike: '电动车', motorcycle: '摩托车', car: '汽车', other: '其他' }
      return map[type] || type
    },
    async submit() {
      if (!this.form.xh) return uni.showToast({ title: '请选择学生', icon: 'none' })
      if (!this.form.housingType) return uni.showToast({ title: '请选择外宿类型', icon: 'none' })
      if (!this.form.address) return uni.showToast({ title: '请输入外宿地址', icon: 'none' })
      if (!this.form.applyReason) return uni.showToast({ title: '请输入外宿理由', icon: 'none' })
      if (this.form.housingType === 'own_house' && !this.form.propertyCert) return uni.showToast({ title: '请上传房产证照片', icon: 'none' })
      if (this.form.housingType === 'own_house' && !this.form.relationCert) return uni.showToast({ title: '请上传关系证明', icon: 'none' })
      if (this.form.housingType === 'rent_house' && !this.form.rentContract) return uni.showToast({ title: '请上传租房合同', icon: 'none' })
      if (this.reasonPhotoList.length < 3) return uni.showToast({ title: '外宿理由佐证至少3张', icon: 'none' })
      if (this.housingPhotoList.length < 3) return uni.showToast({ title: '住宿环境照片至少3张', icon: 'none' })
      if (!this.form.transportType) return uni.showToast({ title: '请选择交通工具', icon: 'none' })

      const data = {
        ...this.form,
        reasonPhotos: JSON.stringify(this.reasonPhotoList),
        housingPhotos: JSON.stringify(this.housingPhotoList)
      }

      try {
        const res = await addOffcampus(data)
        if (res.code === 200) {
          uni.showToast({ title: '提交成功，待现场核实', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1500)
        }
      } catch (e) {
        uni.showToast({ title: '提交失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.offcampus-add-page { min-height: 100vh; background: #f5f6f8; padding-bottom: 120rpx; }
.form-card { background: #fff; margin: 20rpx; border-radius: 12rpx; padding: 24rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; padding-left: 12rpx; border-left: 6rpx solid #667eea; }
.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #666; margin-bottom: 12rpx; display: block; }
.required { color: #f56c6c; }
.form-input { background: #f5f5f5; padding: 20rpx 24rpx; border-radius: 8rpx; font-size: 28rpx; min-height: 72rpx; line-height: 72rpx; box-sizing: border-box; }
.form-textarea { background: #f5f5f5; padding: 20rpx 24rpx; border-radius: 8rpx; font-size: 28rpx; width: 100%; min-height: 180rpx; box-sizing: border-box; }
.form-picker { background: #f5f5f5; padding: 20rpx 24rpx; border-radius: 8rpx; font-size: 28rpx; min-height: 72rpx; line-height: 72rpx; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
.placeholder { color: #999; }
.picker-arrow { font-size: 20rpx; color: #999; }
.upload-area { width: 200rpx; height: 200rpx; border-radius: 8rpx; overflow: hidden; }
.upload-placeholder { width: 100%; height: 100%; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2rpx dashed #ddd; }
.upload-icon { font-size: 48rpx; color: #999; }
.upload-text { font-size: 22rpx; color: #999; margin-top: 8rpx; }
.preview-img { width: 100%; height: 100%; }
.photo-upload-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.upload-item { width: 160rpx; height: 160rpx; position: relative; }
.upload-preview { width: 100%; height: 100%; border-radius: 8rpx; }
.remove-btn { position: absolute; top: -10rpx; right: -10rpx; width: 36rpx; height: 36rpx; background: #f56c6c; color: #fff; border-radius: 50%; text-align: center; line-height: 36rpx; font-size: 24rpx; }
.add-item { background: #f5f5f5; border: 2rpx dashed #ddd; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8rpx; }
.add-icon { font-size: 48rpx; color: #999; }
.add-text { font-size: 22rpx; color: #999; }
.submit-btn { position: fixed; bottom: 40rpx; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20rpx 80rpx; border-radius: 40rpx; box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.4); }
.submit-text { color: #fff; font-size: 30rpx; font-weight: 500; }
</style>
