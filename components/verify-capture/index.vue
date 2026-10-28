<template>
  <view class="verify-card">
    <view class="card-title">{{ title }}</view>
    <view class="tip-text">{{ tip }}</view>

    <view class="form-item">
      <text class="form-label">
        现场照片（{{ minCount }}-{{ maxCount }}张）
        <text class="required" v-if="required">*</text>
      </text>
      <local-photo-picker
        ref="picker"
        :scene-code="sceneCode"
        :photos="photos"
        :min-count="minCount"
        :max-count="maxCount"
        :required="required"
        :fallback-address="fallbackAddress"
        :require-location="requireLocation"
        :show-title="false"
        :show-tip="false"
        @update:photos="onPhotosChange"
        @capture="onCapture"
        @location-state="onLocationState"
      />
    </view>

    <view class="form-item">
      <text class="form-label">{{ remarkLabel }}</text>
      <textarea
        class="form-textarea"
        :value="remark"
        @input="onRemarkInput"
        :placeholder="remarkPlaceholder"
        maxlength="200"
      />
    </view>

  </view>
</template>

<script>
import LocalPhotoPicker from '@/components/local-photo-picker/index.vue'

/**
 * 现场核实取证面板：复用本地拍照组件，网络上传由业务页交给后台队列。
 */
export default {
  name: 'verify-capture',
  components: { LocalPhotoPicker },
  props: {
    // 水印场景编码，决定后端水印配置（是否显示时间/坐标/地址）
    sceneCode: { type: String, required: true },
    // 相对路径数组，通过 .sync 回传，页面可直接 JSON.stringify 入库
    photos: { type: Array, default: () => [] },
    remark: { type: String, default: '' },
    title: { type: String, default: '现场核实' },
    tip: { type: String, default: '请到现场核实实际情况，拍摄照片取证（照片带定位与时间水印）' },
    minCount: { type: Number, default: 3 },
    maxCount: { type: Number, default: 5 },
    required: { type: Boolean, default: true },
    remarkLabel: { type: String, default: '核实备注' },
    remarkPlaceholder: { type: String, default: '请填写核实情况（选填）' },
    // 兼容旧调用；逆地理编码失败时优先作为地址兜底
    fallbackAddress: { type: String, default: '' },
    // 即使水印配置关闭，也要求取得现场定位（外宿现场核实用）
    requireLocation: { type: Boolean, default: false }
  },
  mounted() {
    if (this.requireLocation) {
      this.$nextTick(() => this.prepareCaptureInfo())
    }
  },
  methods: {
    onPhotosChange(photos) {
      this.$emit('update:photos', photos)
    },
    onCapture(captureInfo) {
      this.$emit('capture', captureInfo)
    },
    onLocationState(state) {
      this.$emit('location-state', state)
    },
    onRemarkInput(e) {
      this.$emit('update:remark', e.detail.value)
    },
    ensurePhotoCount() {
      return this.$refs.picker.ensurePhotoCount()
    },
    prepareCaptureInfo() {
      return this.$refs.picker.prefetchCaptureInfo()
    }
  }
}
</script>

<style scoped>
.verify-card {
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
.form-textarea {
  background: #f5f5f5;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  width: 100%;
  height: 140rpx;
}
</style>
