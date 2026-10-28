<template>
  <view class="offcampus-location">
    <view v-if="loading" class="location-state">
      <text class="state-title">正在定位</text>
    </view>
    <view v-else-if="isLocated" class="location-result">
      <map
        class="location-map"
        :latitude="centerLatitude"
        :longitude="centerLongitude"
        :scale="mapScale"
        :markers="markers"
        :show-location="false"
        enable-scroll
        enable-zoom
      />
      <view class="distance-row">
        <text class="distance-main">距{{ display.schoolName }}直线 {{ distanceText }}</text>
        <text class="distance-meta">{{ precisionText }}</text>
      </view>
      <text v-if="locationMessage" class="location-tip">{{ locationMessage }}</text>
    </view>
    <view v-else class="location-state">
      <text class="state-title">{{ emptyText }}</text>
    </view>
  </view>
</template>

<script>
import { previewOffcampusLocation } from '@/api/affair/offcampus'

export default {
  name: 'OffcampusLocation',
  props: {
    address: { type: String, default: '' },
    campus: { type: String, default: '' },
    saved: { type: Object, default: null },
    autoPreview: { type: Boolean, default: true }
  },
  data() {
    return {
      loading: false,
      preview: null,
      requestSeq: 0,
      timer: null
    }
  },
  computed: {
    display() {
      return this.autoPreview ? this.preview : this.saved
    },
    isLocated() {
      const d = this.display
      return !!(d && d.mapLatitude != null && d.mapLongitude != null)
    },
    centerLatitude() {
      const d = this.display
      return (Number(d.mapLatitude) + Number(d.schoolMapLatitude || d.mapLatitude)) / 2
    },
    centerLongitude() {
      const d = this.display
      return (Number(d.mapLongitude) + Number(d.schoolMapLongitude || d.mapLongitude)) / 2
    },
    mapScale() {
      const d = this.display
      const span = Math.max(
        Math.abs(Number(d.mapLatitude) - Number(d.schoolMapLatitude || d.mapLatitude)),
        Math.abs(Number(d.mapLongitude) - Number(d.schoolMapLongitude || d.mapLongitude))
      )
      if (span > 2) return 8
      if (span > 1) return 9
      if (span > 0.4) return 10
      if (span > 0.15) return 11
      if (span > 0.05) return 12
      if (span > 0.015) return 13
      return 14
    },
    markers() {
      const d = this.display
      return [
        {
          id: 1,
          latitude: Number(d.schoolMapLatitude),
          longitude: Number(d.schoolMapLongitude),
          iconPath: '/static/icon/dz.png',
          width: 26,
          height: 26,
          callout: {
            content: d.schoolName || '学校',
            color: '#315b87',
            fontSize: 12,
            borderRadius: 6,
            padding: 5,
            display: 'ALWAYS'
          }
        },
        {
          id: 2,
          latitude: Number(d.mapLatitude),
          longitude: Number(d.mapLongitude),
          iconPath: '/static/icon/dz1.png',
          width: 30,
          height: 30,
          callout: {
            content: '外宿地点',
            color: '#8a4d19',
            fontSize: 12,
            borderRadius: 6,
            padding: 5,
            display: 'ALWAYS'
          }
        }
      ]
    },
    distanceText() {
      const km = Number(this.display && this.display.distanceKm)
      if (!Number.isFinite(km)) return '-'
      if (km < 1) return Math.round(km * 1000) + ' 米'
      return km.toFixed(km >= 10 ? 1 : 2) + ' 公里'
    },
    precisionText() {
      const precision = this.display && this.display.locationPrecision
      return precision ? precision + '级定位' : '直线距离'
    },
    locationMessage() {
      if (!this.autoPreview) return ''
      return (this.preview && this.preview.message) || ''
    },
    emptyText() {
      if (this.display && this.display.message) return this.display.message
      return '填写具体街道、小区或门牌后显示地图'
    }
  },
  watch: {
    address() {
      if (this.autoPreview) this.schedulePreview()
    },
    campus() {
      if (this.autoPreview) this.schedulePreview()
    }
  },
  mounted() {
    if (this.autoPreview) this.schedulePreview()
  },
  beforeDestroy() {
    clearTimeout(this.timer)
  },
  methods: {
    schedulePreview() {
      clearTimeout(this.timer)
        this.requestSeq += 1
      if (!this.hasSpecificAddress(this.address)) {
        this.loading = false
        this.preview = null
        return
      }
      this.timer = setTimeout(() => this.loadPreview(), 650)
    },
    async loadPreview() {
      const seq = ++this.requestSeq
      this.loading = true
      try {
        const res = await previewOffcampusLocation(this.address, this.campus)
        if (seq !== this.requestSeq) return
        const body = res || {}
        this.preview = body.code === 200 ? body.data : { message: body.msg || '定位失败，可继续提交申请' }
      } catch (e) {
        if (seq !== this.requestSeq) return
        this.preview = { message: '地图定位暂时不可用，可继续提交申请' }
      } finally {
        if (seq === this.requestSeq) this.loading = false
      }
    },
    hasSpecificAddress(address) {
      const text = String(address || '').replace(/\//g, '').trim()
      if (!text) return false
      const matched = text.match(/(?:省|自治区).*?(?:市|自治州|地区).*?(?:区|县|旗)(.+)$/)
      return (matched ? matched[1] : text).trim().length >= 2
    }
  }
}
</script>

<style scoped>
.offcampus-location { margin-top: 14rpx; border-radius: 10rpx; overflow: hidden; background: #f7f8fa; }
.location-map { width: 100%; height: 330rpx; }
.location-result { padding-bottom: 16rpx; }
.distance-row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 20rpx 8rpx; }
.distance-main { font-size: 26rpx; font-weight: 600; color: #315b87; }
.distance-meta { font-size: 22rpx; color: #7b8794; }
.location-tip { display: block; padding: 0 20rpx; font-size: 22rpx; line-height: 32rpx; color: #8d6b45; }
.location-state { min-height: 150rpx; padding: 0 24rpx; display: flex; align-items: center; justify-content: center; }
.state-title { font-size: 24rpx; color: #7b8794; text-align: center; line-height: 36rpx; }
</style>
