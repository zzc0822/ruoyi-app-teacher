<template>
  <view class="local-photo-picker">
    <view class="picker-head" v-if="showTitle || showTip">
      <text class="picker-title" v-if="showTitle">{{ title }}</text>
      <text class="picker-tip" v-if="showTip">{{ tip }}</text>
    </view>

    <view class="photo-grid">
      <view
        v-for="(photo, index) in normalizedPhotos"
        :key="index"
        class="photo-item"
        :style="photoItemStyle"
      >
        <image
          :src="photo.preview"
          class="photo-preview"
          mode="aspectFill"
          @click="previewPhoto(index)"
        />
        <view class="remove-btn" @click.stop="removePhoto(index)">×</view>
        <text class="photo-label" v-if="photo.label">{{ photo.label }}</text>
      </view>

      <view
        v-if="normalizedPhotos.length < maxCount"
        class="photo-item add-item"
        :class="{ disabled }"
        :style="photoItemStyle"
        @click="capturePhoto"
      >
        <text class="add-icon">+</text>
        <text class="add-text">{{ captureText }}</text>
      </view>
    </view>

    <view class="remark-field" v-if="showRemark">
      <text class="remark-label">{{ remarkLabel }}</text>
      <textarea
        class="remark-input"
        :value="remark"
        :placeholder="remarkPlaceholder"
        maxlength="200"
        @input="onRemarkInput"
      />
    </view>

    <canvas
      :canvas-id="canvasId"
      class="watermark-canvas"
      style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"
    ></canvas>
  </view>
</template>

<script>
import { getWatermarkConfig } from '@/api/work/watermark'
import { addWatermark, getLocation, prepareCapture } from '@/utils/watermark'
import { resolveImg } from '@/utils/image'

/**
 * 本地现场照片选择器。
 * 只负责拍照、定位水印、预览和删除，不执行网络上传。
 * 业务页提交时将 localPath 交给 offlineQueue，由队列在后台持久化并上传。
 */
export default {
  name: 'local-photo-picker',
  props: {
    photos: { type: Array, default: () => [] },
    sceneCode: { type: String, default: '' },
    title: { type: String, default: '现场照片' },
    tip: { type: String, default: '' },
    showTitle: { type: Boolean, default: true },
    showTip: { type: Boolean, default: true },
    minCount: { type: Number, default: 0 },
    maxCount: { type: Number, default: 5 },
    required: { type: Boolean, default: false },
    sourceType: { type: Array, default: () => ['camera'] },
    sizeType: { type: Array, default: () => ['compressed'] },
    labels: { type: Array, default: () => [] },
    photoSize: { type: Number, default: 160 },
    captureText: { type: String, default: '拍照' },
    fallbackAddress: { type: String, default: '' },
    requireLocation: { type: Boolean, default: false },
    showRemark: { type: Boolean, default: false },
    remark: { type: String, default: '' },
    remarkLabel: { type: String, default: '核实备注' },
    remarkPlaceholder: { type: String, default: '请填写核实情况（选填）' },
    disabled: { type: Boolean, default: false }
  },
  data() {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    return {
      watermarkConfig: null,
      watermarkConfigPromise: null,
      canvasId: 'localPhotoWatermark' + suffix
    }
  },
  computed: {
    normalizedPhotos() {
      return (this.photos || []).map((photo, index) => {
        const value = typeof photo === 'string' ? { localPath: photo } : (photo || {})
        const previewPath = value.localPath || value.url || value.thumbUrl || ''
        return Object.assign({}, value, {
          preview: this.resolvePreview(previewPath),
          label: value.label || this.labels[index] || ''
        })
      })
    },
    photoItemStyle() {
      return 'width:' + this.photoSize + 'rpx;height:' + this.photoSize + 'rpx;'
    }
  },
  watch: {
    sceneCode(value) {
      this.watermarkConfig = null
      this.loadConfig(value)
    }
  },
  created() {
    this.loadConfig(this.sceneCode)
  },
  methods: {
    resolvePreview(path) {
      if (!path) return ''
      const value = String(path)
      if (/^(https?:|data:|blob:|wxfile:|file:|\/tmp\/|\/var\/)/.test(value)) return value
      return resolveImg(value)
    },
    loadConfig(sceneCode) {
      if (!sceneCode) return
      this.watermarkConfigPromise = getWatermarkConfig(sceneCode)
        .then(res => {
          this.watermarkConfig = res.data || null
        })
        .catch(() => {
          this.watermarkConfig = null
        })
    },
    async capturePhoto() {
      if (this.disabled) return
      if ((this.photos || []).length >= this.maxCount) {
        return uni.showToast({ title: '最多' + this.maxCount + '张', icon: 'none' })
      }

      const captureInfo = await this.resolveCaptureInfo({ showLoading: true, showError: true })
      if (!captureInfo.ready) return

      uni.chooseImage({
        count: 1,
        sizeType: this.sizeType,
        sourceType: this.sourceType,
        success: async res => {
          const originalPath = res.tempFilePaths && res.tempFilePaths[0]
          if (!originalPath) return
          uni.showLoading({ title: '处理照片...' })
          try {
            const localPath = await addWatermark(
              originalPath,
              this.watermarkConfig,
              captureInfo.info,
              this,
              this.canvasId
            )
            const index = (this.photos || []).length
            const photo = {
              localId: 'PHOTO-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
              localPath,
              originalPath,
              url: localPath,
              thumbUrl: localPath,
              label: this.labels[index] || '',
              captureInfo: Object.assign({}, captureInfo.info || {}),
              attachment: {
                fileName: '',
                filePath: '',
                fileSize: 0,
                fileType: '',
                mediaType: 'image',
                exifData: ''
              }
            }
            this.$emit('update:photos', (this.photos || []).concat([photo]))
            if (captureInfo.info) this.$emit('capture', Object.assign({}, captureInfo.info))
          } catch (e) {
            uni.showToast({ title: '照片处理失败，请重试', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    async resolveCaptureInfo(options = {}) {
      const showLoading = options.showLoading !== false
      const showError = options.showError !== false
      if (!this.watermarkConfig && this.watermarkConfigPromise) {
        await this.watermarkConfigPromise
      }
      const config = this.watermarkConfig
      if (!config || config.enabled !== '1') {
        if (!this.requireLocation) return { ready: true, info: null }
        if (showLoading) uni.showLoading({ title: '定位中...' })
        const location = await getLocation()
        if (showLoading) uni.hideLoading()
        if (!location) {
          const message = '未获取到现场定位，请开放定位权限后重试'
          if (showError) uni.showToast({ title: message, icon: 'none', duration: 2500 })
          return { ready: false, info: null, message }
        }
        return { ready: true, info: location }
      }

      if (showLoading) uni.showLoading({ title: '定位中...' })
      const result = await prepareCapture(config, this.fallbackAddress)
      if (showLoading) uni.hideLoading()
      if (!result.ready) {
        if (showError) uni.showToast({ title: result.message, icon: 'none', duration: 2500 })
        return { ready: false, info: null, message: result.message }
      }
      return { ready: true, info: result.captureInfo }
    },
    async prefetchCaptureInfo() {
      if (!this.requireLocation) return { ready: true, info: null }
      this.$emit('location-state', { state: 'locating', message: '正在获取现场定位' })
      const result = await this.resolveCaptureInfo({ showLoading: false, showError: false })
      if (result.ready && result.info) {
        const info = Object.assign({}, result.info)
        this.$emit('capture', info)
        this.$emit('location-state', { state: 'ready', message: '现场定位已获取', info })
      } else {
        this.$emit('location-state', {
          state: 'failed',
          message: result.message || '现场定位失败，请重试'
        })
      }
      return result
    },
    removePhoto(index) {
      const next = (this.photos || []).slice()
      next.splice(index, 1)
      next.forEach((photo, photoIndex) => {
        if (photo && typeof photo === 'object' && this.labels[photoIndex] !== undefined) {
          photo.label = this.labels[photoIndex]
        }
      })
      this.$emit('update:photos', next)
    },
    previewPhoto(index) {
      const urls = this.normalizedPhotos.map(photo => photo.preview).filter(Boolean)
      if (!urls.length) return
      uni.previewImage({ current: index, urls })
    },
    onRemarkInput(event) {
      this.$emit('update:remark', event.detail.value)
    },
    ensurePhotoCount() {
      const count = (this.photos || []).length
      if (count < this.minCount) {
        uni.showToast({ title: '请至少拍摄' + this.minCount + '张现场照片', icon: 'none' })
        return false
      }
      if (count > this.maxCount) {
        uni.showToast({ title: '现场照片最多' + this.maxCount + '张', icon: 'none' })
        return false
      }
      return true
    }
  }
}
</script>

<style scoped>
.local-photo-picker {
  width: 100%;
}
.picker-head {
  margin-bottom: 18rpx;
}
.picker-title,
.picker-tip {
  display: block;
}
.picker-title {
  color: #333;
  font-size: 28rpx;
  font-weight: 600;
}
.picker-tip {
  margin-top: 10rpx;
  padding: 14rpx 16rpx;
  border-radius: 8rpx;
  background: #fff7ed;
  color: #c2410c;
  font-size: 23rpx;
  line-height: 34rpx;
}
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.photo-item {
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
}
.photo-preview {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  background: #f1f5f9;
}
.remove-btn {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 25rpx;
  line-height: 36rpx;
  text-align: center;
}
.photo-label {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: hidden;
  padding: 5rpx 6rpx;
  border-radius: 0 0 8rpx 8rpx;
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  font-size: 19rpx;
  line-height: 27rpx;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.add-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #cbd5e1;
  border-radius: 8rpx;
  background: #f8fafc;
}
.add-item.disabled {
  opacity: 0.55;
}
.add-icon {
  color: #94a3b8;
  font-size: 50rpx;
  line-height: 1;
}
.add-text {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 21rpx;
}
.remark-field {
  margin-top: 22rpx;
}
.remark-label {
  display: block;
  margin-bottom: 10rpx;
  color: #666;
  font-size: 25rpx;
}
.remark-input {
  box-sizing: border-box;
  width: 100%;
  height: 140rpx;
  padding: 16rpx 18rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
  font-size: 27rpx;
}
</style>
