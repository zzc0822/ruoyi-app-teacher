<template>
  <view class="verify-page">
    <!-- 申请信息展示 -->
    <view class="info-card">
      <view class="card-title">申请信息</view>
      <view class="info-row">
        <text class="info-label">学生</text>
        <text class="info-value">{{ detail.studentName }}（{{ detail.xh }}）</text>
      </view>
      <view class="info-row">
        <text class="info-label">班级</text>
        <text class="info-value">{{ detail.className }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">学年</text>
        <text class="info-value">{{ detail.academicYear }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">外宿类型</text>
        <text class="info-value">{{ getHousingTypeText(detail.housingType) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">外宿地址</text>
        <text class="info-value">{{ detail.address }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">外宿理由</text>
        <text class="info-value">{{ detail.applyReason }}</text>
      </view>
    </view>

    <!-- 佐证材料展示 -->
    <view class="info-card">
      <view class="card-title">佐证材料</view>
      <view class="photo-section" v-if="detail.propertyCert">
        <text class="section-label">房产证</text>
        <image :src="detail.propertyCert" class="photo-single" mode="aspectFill" @click="previewImage(detail.propertyCert)" />
      </view>
      <view class="photo-section" v-if="detail.relationCert">
        <text class="section-label">关系证明</text>
        <image :src="detail.relationCert" class="photo-single" mode="aspectFill" @click="previewImage(detail.relationCert)" />
      </view>
      <view class="photo-section" v-if="detail.rentContract">
        <text class="section-label">租房合同</text>
        <image :src="detail.rentContract" class="photo-single" mode="aspectFill" @click="previewImage(detail.rentContract)" />
      </view>
      <view class="photo-section" v-if="parsePhotos(detail.reasonPhotos).length">
        <text class="section-label">外宿理由佐证</text>
        <view class="photo-grid">
          <image v-for="(url, idx) in parsePhotos(detail.reasonPhotos)" :key="idx" :src="url" class="photo-thumb" mode="aspectFill" @click="previewImage(url)" />
        </view>
      </view>
      <view class="photo-section" v-if="parsePhotos(detail.housingPhotos).length">
        <text class="section-label">住宿环境照片</text>
        <view class="photo-grid">
          <image v-for="(url, idx) in parsePhotos(detail.housingPhotos)" :key="idx" :src="url" class="photo-thumb" mode="aspectFill" @click="previewImage(url)" />
        </view>
      </view>
    </view>

    <!-- 历史申请记录 -->
    <view class="info-card" v-if="historyList.length > 0">
      <view class="card-title">历史申请记录</view>
      <view class="history-item" v-for="item in historyList" :key="item.id">
        <view class="history-row">
          <text class="history-year">{{ item.academicYear }}</text>
          <text class="history-status" :class="'status-text-' + getStatusClass(item)">{{ getStatusText(item.status, item.verifyStatus) }}</text>
        </view>
        <view class="history-row">
          <text class="history-time">{{ item.createTime }}</text>
          <text class="history-type">{{ getHousingTypeText(item.housingType) }}</text>
        </view>
      </view>
    </view>

    <!-- 现场核实 -->
    <view class="verify-card">
      <view class="card-title">现场核实</view>
      <view class="tip-text">请到现场查看住宿环境实际情况，拍摄3-5张核实照片</view>

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
import { getOffcampus, verifyOffcampus, getOffcampusHistory } from '@/api/affair/offcampus'
import { uploadFile } from '@/utils/upload'

export default {
  data() {
    return {
      id: null,
      detail: {},
      verifyPhotoList: [],
      verifyRemark: '',
      historyList: []
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadDetail()
  },
  methods: {
    async loadDetail() {
      try {
        const res = await getOffcampus(this.id)
        if (res.data) {
          this.detail = res.data
          // 加载历史申请
          if (this.detail.xh) {
            const histRes = await getOffcampusHistory(this.detail.xh)
            if (histRes.data) {
              this.historyList = (histRes.data || []).filter(h => h.id !== this.detail.id)
            }
          }
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    chooseVerifyPhoto() {
      if (this.verifyPhotoList.length >= 5) return uni.showToast({ title: '最多5张', icon: 'none' })
      uni.chooseImage({
        count: 1, sizeType: ['compressed'], sourceType: ['camera'],
        success: (res) => {
          uploadFile(res.tempFilePaths[0]).then(url => {
            this.verifyPhotoList.push(url)
          }).catch(() => { uni.showToast({ title: '上传失败', icon: 'none' }) })
        }
      })
    },
    removePhoto(idx) { this.verifyPhotoList.splice(idx, 1) },
    previewImage(url) { uni.previewImage({ urls: [url] }) },
    parsePhotos(str) {
      if (!str) return []
      try { return JSON.parse(str) } catch (e) { return [] }
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
      if (status === 'counselor_approved') return '辅导员已通过'
      if (status === 'secretary_approved') return '书记已通过'
      return status
    },
    getHousingTypeText(type) {
      const map = { own_house: '自有住房', rent_house: '租房' }
      return map[type] || type
    },
    async doVerify(status) {
      if (status === 'verified' && this.verifyPhotoList.length < 3) {
        return uni.showToast({ title: '请至少拍摄3张现场核实照片', icon: 'none' })
      }
      const actionText = status === 'verified' ? '通过' : '驳回'
      uni.showModal({
        title: '确认' + actionText,
        content: status === 'verified' ? '确认该外宿申请现场核实通过？通过后将自动提交书记审批。' : '确认驳回该外宿申请？',
        success: async (modalRes) => {
          if (!modalRes.confirm) return
          try {
            const data = {
              id: this.id,
              verifyStatus: status,
              verifyPhotos: JSON.stringify(this.verifyPhotoList),
              verifyRemark: this.verifyRemark
            }
            const res = await verifyOffcampus(data)
            if (res.code === 200) {
              uni.showToast({ title: '核实' + actionText + '成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 1500)
            }
          } catch (e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.verify-page { min-height: 100vh; background: #f5f6f8; padding-bottom: 140rpx; }
.info-card, .verify-card { background: #fff; margin: 20rpx; border-radius: 12rpx; padding: 24rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; padding-left: 12rpx; border-left: 6rpx solid #667eea; }
.info-row { display: flex; margin-bottom: 12rpx; }
.info-label { font-size: 26rpx; color: #999; width: 140rpx; flex-shrink: 0; }
.info-value { font-size: 26rpx; color: #333; flex: 1; }
.photo-section { margin-bottom: 16rpx; }
.section-label { font-size: 24rpx; color: #666; margin-bottom: 8rpx; display: block; }
.photo-single { width: 300rpx; height: 200rpx; border-radius: 8rpx; }
.photo-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.photo-thumb { width: 160rpx; height: 160rpx; border-radius: 8rpx; }
.history-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.history-row { display: flex; justify-content: space-between; margin-bottom: 4rpx; }
.history-year { font-size: 26rpx; color: #333; font-weight: 500; }
.history-status { font-size: 24rpx; }
.history-time { font-size: 22rpx; color: #999; }
.history-type { font-size: 22rpx; color: #666; }
.status-text-rejected { color: #f44336; }
.status-text-approved { color: #4caf50; }
.status-text-pending { color: #ff9800; }
.status-text-processing { color: #2196f3; }
.tip-text { font-size: 24rpx; color: #ff9800; background: #fff3e0; padding: 16rpx; border-radius: 8rpx; margin-bottom: 20rpx; }
.form-item { margin-bottom: 20rpx; }
.form-label { font-size: 26rpx; color: #666; margin-bottom: 12rpx; display: block; }
.required { color: #f56c6c; }
.photo-upload-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.upload-item { width: 160rpx; height: 160rpx; position: relative; }
.upload-preview { width: 100%; height: 100%; border-radius: 8rpx; }
.remove-btn { position: absolute; top: -10rpx; right: -10rpx; width: 36rpx; height: 36rpx; background: #f56c6c; color: #fff; border-radius: 50%; text-align: center; line-height: 36rpx; font-size: 24rpx; }
.add-item { background: #f5f5f5; border: 2rpx dashed #ddd; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8rpx; }
.add-icon { font-size: 48rpx; color: #999; }
.add-text { font-size: 22rpx; color: #999; }
.form-textarea { background: #f5f5f5; padding: 16rpx 20rpx; border-radius: 8rpx; font-size: 28rpx; width: 100%; height: 140rpx; }
.action-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); gap: 20rpx; }
.action-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 12rpx; }
.reject-btn { background: #fff5f5; border: 2rpx solid #f56c6c; }
.reject-btn .action-text { color: #f56c6c; font-size: 30rpx; font-weight: 500; }
.pass-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.pass-btn .action-text { color: #fff; font-size: 30rpx; font-weight: 500; }
</style>
