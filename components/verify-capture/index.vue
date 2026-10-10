<template>
  <view class="verify-card">
    <view class="card-title">{{ title }}</view>
    <view class="tip-text">{{ tip }}</view>

    <view class="form-item">
      <text class="form-label">
        现场照片（{{ minCount }}-{{ maxCount }}张）
        <text class="required" v-if="required">*</text>
      </text>
      <view class="photo-upload-grid">
        <view class="upload-item" v-for="(url, idx) in displayList" :key="idx">
          <image :src="url" class="upload-preview" mode="aspectFill" @click="previewPhoto(idx)" />
          <view class="remove-btn" @click="removePhoto(idx)">×</view>
        </view>
        <view class="upload-item add-item" v-if="displayList.length < maxCount" @click="capturePhoto">
          <text class="add-icon">+</text>
          <text class="add-text">拍照</text>
        </view>
      </view>
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

    <!-- 水印Canvas（离屏，组件作用域） -->
    <canvas canvas-id="watermarkCanvas" style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"></canvas>
  </view>
</template>

<script>
import { getWatermarkConfig } from '@/api/work/watermark'
import { prepareCapture, addWatermark } from '@/utils/watermark'
import { uploadFile, stripBaseUrl } from '@/utils/upload'
import { resolveImg } from '@/utils/image'

/**
 * 现场核实取证面板：只允许现场拍照，逐张确认定位水印后上传，入库存相对路径
 * 车辆核实/外宿核实等所有现场核验场景共用，保证取证口径一致
 */
export default {
  name: 'verify-capture',
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
    // 逆地理编码无结果时的地址兜底（如外宿地址）
    fallbackAddress: { type: String, default: '' }
  },
  data() {
    return {
      watermarkConfig: null,
      watermarkConfigPromise: null,
      captureInfo: null
    }
  },
  computed: {
    displayList() {
      return (this.photos || []).map(resolveImg)
    }
  },
  watch: {
    sceneCode(val) {
      this.watermarkConfig = null
      this.loadConfig(val)
    }
  },
  created() {
    this.loadConfig(this.sceneCode)
  },
  methods: {
    loadConfig(sceneCode) {
      if (!sceneCode) return
      this.watermarkConfigPromise = getWatermarkConfig(sceneCode)
        .then(res => { this.watermarkConfig = res.data })
        .catch(() => {})
    },
    async capturePhoto() {
      if ((this.photos || []).length >= this.maxCount) {
        return uni.showToast({ title: '最多' + this.maxCount + '张', icon: 'none' })
      }
      // 逐张确认证信息，水印时间对应各自拍摄时刻；未确认则阻断
      if (!(await this.ensureCaptureReady())) return
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera'],
        success: async (res) => {
          uni.showLoading({ title: '添加水印...' })
          let uploaded
          try {
            const watermarked = await addWatermark(res.tempFilePaths[0], this.watermarkConfig, this.captureInfo, this)
            uploaded = stripBaseUrl(await uploadFile(watermarked))
          } catch (e) {
            uni.hideLoading()
            return uni.showToast({ title: '上传失败', icon: 'none' })
          }
          uni.hideLoading()
          this.$emit('update:photos', (this.photos || []).concat([uploaded]))
        }
      })
    },
    // 拍照前确认水印时间与地址：定位失败或地址无法确定时不允许拍照，杜绝无水印照片
    async ensureCaptureReady() {
      if (!this.watermarkConfig && this.watermarkConfigPromise) {
        await this.watermarkConfigPromise
      }
      const config = this.watermarkConfig
      if (!config || config.enabled !== '1') return true
      uni.showLoading({ title: '定位中...' })
      const result = await prepareCapture(config, this.fallbackAddress)
      uni.hideLoading()
      if (!result.ready) {
        uni.showToast({ title: result.message, icon: 'none', duration: 2500 })
        return false
      }
      this.captureInfo = result.captureInfo
      return true
    },
    removePhoto(idx) {
      const next = (this.photos || []).slice()
      next.splice(idx, 1)
      this.$emit('update:photos', next)
    },
    previewPhoto(idx) {
      uni.previewImage({ current: idx, urls: this.displayList })
    },
    onRemarkInput(e) {
      this.$emit('update:remark', e.detail.value)
    },
    /** 提交前由页面调用：照片数量不达标时提示并返回 false */
    ensurePhotoCount() {
      const count = (this.photos || []).length
      if (count < this.minCount) {
        uni.showToast({ title: '请至少拍摄' + this.minCount + '张现场核实照片', icon: 'none' })
        return false
      }
      if (count > this.maxCount) {
        uni.showToast({ title: '核实照片最多' + this.maxCount + '张', icon: 'none' })
        return false
      }
      return true
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
</style>
