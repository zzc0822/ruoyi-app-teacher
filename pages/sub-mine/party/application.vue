<template>
  <view class="container">
    <!-- 已提交申请书 -->
    <view v-if="hasApplication && !editing" class="app-card">
      <view class="card-header">
        <text class="title">入党申请书</text>
        <text class="status-tag">已提交</text>
      </view>
      <view class="card-body">
        <text class="content-text">{{ content }}</text>
      </view>
      <view class="card-images" v-if="images && images.length > 0">
        <text class="img-label">附件图片：</text>
        <view class="img-grid">
          <image v-for="(img, idx) in images" :key="idx" :src="img" mode="aspectFill" class="img-item" @click="previewImage(idx)"></image>
        </view>
      </view>
      <view class="card-footer">
        <text class="meta">提交时间：{{ applyDate || '—' }}</text>
        <text class="meta">当前阶段：{{ stageLabel(currentStage) }}</text>
      </view>
      <u-button type="primary" plain size="small" @click="editing = true" style="margin-top: 20rpx;">修改申请书</u-button>
    </view>

    <!-- 未提交或编辑模式 -->
    <view v-else>
      <view class="form-card">
        <text class="form-title">{{ hasApplication ? '修改入党申请书' : '提交入党申请书' }}</text>
        <view class="form-item">
          <text class="form-label">申请书内容</text>
          <textarea v-model="form.content" placeholder="请输入入党申请书内容..." class="form-textarea" maxlength="5000" />
        </view>
        <view class="form-item">
          <text class="form-label">附件图片（可选）</text>
          <view class="upload-area">
            <view class="img-grid" v-if="form.imageList.length > 0">
              <view v-for="(img, idx) in form.imageList" :key="idx" class="img-wrap">
                <image :src="img.url || img" mode="aspectFill" class="upload-img"></image>
                <view class="img-del" @click="removeImage(idx)">×</view>
              </view>
            </view>
            <view class="upload-btn" @click="chooseImage" v-if="form.imageList.length < 5">
              <u-icon name="plus" size="40" color="#c0c4cc"></u-icon>
              <text class="upload-text">上传图片</text>
            </view>
          </view>
        </view>
      </view>
      <u-button type="primary" @click="submit" :loading="loading" style="margin-top: 30rpx;">提交申请书</u-button>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party'
import config from '@/config'

const stageMap = { APPLICANT: '入党申请人', ACTIVIST: '积极分子', TARGET: '发展对象', PROBATIONARY: '预备党员', FORMAL: '正式党员' }

export default {
  data() {
    return {
      hasApplication: false,
      editing: false,
      content: '',
      images: [],
      applyDate: '',
      currentStage: '',
      loading: false,
      form: { content: '', imageList: [] }
    }
  },
  onLoad() { this.loadData() },
  methods: {
    stageLabel(code) { return stageMap[code] || code || '—' },
    loadData() {
      uni.showLoading({ title: '加载中...' })
      partyApi.myApplication().then(res => {
        uni.hideLoading()
        const data = res.data || {}
        this.hasApplication = data.hasApplication || false
        this.content = data.content || ''
        this.images = data.images ? data.images.split(',').filter(Boolean) : []
        this.applyDate = data.applyDate ? data.applyDate.substring(0, 10) : ''
        this.currentStage = data.currentStage || ''
      }).catch(() => { uni.hideLoading() })
    },
    chooseImage() {
      uni.chooseImage({
        count: 5 - this.form.imageList.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          res.tempFilePaths.forEach(path => {
            this.uploadOneImage(path)
          })
        }
      })
    },
    uploadOneImage(filePath) {
      uni.showLoading({ title: '上传中...' })
      uni.uploadFile({
        url: config.baseURL + '/party/upload/image',
        filePath: filePath,
        name: 'file',
        header: { 'Authorization': 'Bearer ' + uni.getStorageSync('token') },
        success: (res) => {
          uni.hideLoading()
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            this.form.imageList.push({ url: data.url, path: data.fileName })
          }
        },
        fail: () => { uni.hideLoading() }
      })
    },
    removeImage(idx) {
      this.form.imageList.splice(idx, 1)
    },
    previewImage(idx) {
      uni.previewImage({ urls: this.images, current: idx })
    },
    submit() {
      if (!this.form.content && !this.editing) {
        return uni.showToast({ title: '请输入申请书内容', icon: 'none' })
      }
      this.loading = true
      const imagePaths = this.form.imageList.map(img => img.path || img).join(',')
      partyApi.submitApplication({
        applicationContent: this.form.content || this.content,
        applicationImages: imagePaths
      }).then(() => {
        this.loading = false
        uni.showToast({ title: '提交成功', icon: 'success' })
        this.editing = false
        this.loadData()
      }).catch(() => { this.loading = false })
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.app-card { background: #fff; border-radius: 16rpx; padding: 30rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.title { font-size: 32rpx; font-weight: bold; color: #303133; }
.status-tag { background: #67C23A; color: #fff; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 24rpx; }
.card-body { margin-bottom: 20rpx; }
.content-text { font-size: 28rpx; color: #606266; line-height: 1.8; white-space: pre-wrap; }
.card-images { margin-bottom: 16rpx; }
.img-label { font-size: 26rpx; color: #909399; margin-bottom: 10rpx; display: block; }
.img-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.img-item { width: 160rpx; height: 160rpx; border-radius: 8rpx; }
.card-footer { padding-top: 16rpx; border-top: 1rpx solid #f0f0f0; }
.meta { font-size: 24rpx; color: #909399; display: block; margin-top: 6rpx; }

.form-card { background: #fff; border-radius: 16rpx; padding: 30rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.form-title { font-size: 32rpx; font-weight: bold; color: #303133; margin-bottom: 24rpx; display: block; }
.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #303133; margin-bottom: 12rpx; display: block; }
.form-textarea { width: 100%; min-height: 400rpx; background: #f5f7fa; border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; box-sizing: border-box; line-height: 1.8; }
.upload-area { }
.upload-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 160rpx; height: 160rpx; background: #f5f7fa; border-radius: 8rpx; border: 2rpx dashed #dcdfe6; }
.upload-text { font-size: 22rpx; color: #c0c4cc; margin-top: 8rpx; }
.img-wrap { position: relative; }
.upload-img { width: 160rpx; height: 160rpx; border-radius: 8rpx; }
.img-del { position: absolute; top: -10rpx; right: -10rpx; width: 36rpx; height: 36rpx; background: #F56C6C; color: #fff; border-radius: 50%; text-align: center; line-height: 36rpx; font-size: 24rpx; }
</style>
