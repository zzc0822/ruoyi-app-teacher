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
        <text class="info-label">申请时间</text>
        <text class="info-value">{{ detail.applyTime || detail.createTime || '-' }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">外宿类型</text>
        <text class="info-value">{{ getHousingTypeText(detail.housingType) }}</text>
      </view>
      <view class="info-row" v-if="detail.startDate">
        <text class="info-label">外宿期限</text>
        <text class="info-value">{{ detail.startDate }} 至 {{ detail.endDate }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">外宿地址</text>
        <text class="info-value">{{ detail.address }}</text>
      </view>
      <offcampus-location :saved="detail" :auto-preview="false" />
      <view class="info-row">
        <text class="info-label">外宿理由</text>
        <text class="info-value">{{ detail.applyReason }}</text>
      </view>
    </view>

    <!-- 佐证材料：不分门别类，新旧数据合并成一组 -->
    <view class="info-card">
      <view class="card-title">佐证材料</view>
      <view class="photo-section" v-if="materialUrls.length">
        <view class="photo-grid">
          <image v-for="(url, idx) in materialUrls" :key="'m'+idx" :src="url" class="photo-thumb" mode="aspectFill" @click="previewMaterial(idx)" />
        </view>
      </view>
      <text class="empty-tip" v-else>暂无佐证材料</text>
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
          <text class="history-time">{{ item.applyTime || item.createTime }}</text>
          <text class="history-type">{{ getHousingTypeText(item.housingType) }}</text>
        </view>
      </view>
    </view>

    <!-- 出勤记录 -->
    <view class="info-card" v-if="attendanceList.length > 0">
      <view class="card-title">出勤记录</view>
      <view class="att-item" v-for="(item, idx) in attendanceList" :key="idx">
        <view class="att-row">
          <text class="att-course">{{ item.courseName }}</text>
          <text class="att-rate" :class="getAttRateClass(item)">{{ calcAbsentRate(item) }}</text>
        </view>
        <view class="att-row">
          <text class="att-detail">总{{ item.totalLessons }}节 | 缺勤{{ item.absentLessons }} | 迟到{{ item.lateLessons }} | 早退{{ item.earlyLeaveLessons }}</text>
        </view>
      </view>
    </view>

    <!-- 现场核实（与车辆核实共用取证面板） -->
    <verify-capture
      ref="capture"
      scene-code="offcampus"
      :photos.sync="verifyPhotoList"
      :remark.sync="verifyRemark"
      :fallback-address="detail.address"
      require-location
      tip="请到现场查看住宿环境实际情况，拍摄3-5张核实照片"
      @capture="onCaptureEvidence"
      @location-state="onLocationState"
    />

    <view class="location-check-card" :class="verifyLocationCheck.stateClass">
      <view class="location-check-head">
        <text class="location-check-title">现场定位校验</text>
        <text class="location-check-state">{{ verifyLocationCheck.stateText }}</text>
      </view>
      <view class="location-check-row">
        <text class="location-check-label">外宿地点</text>
        <text class="location-check-value">{{ detail.address || '-' }}</text>
      </view>
      <view class="location-check-row">
        <text class="location-check-label">现场坐标</text>
        <text class="location-check-value">{{ captureCoordinateText }}</text>
      </view>
      <view class="location-check-row" v-if="verifyLocationCheck.available">
        <text class="location-check-label">现场距离</text>
        <text class="location-check-value">{{ verifyLocationCheck.distanceText }}</text>
      </view>
      <text class="location-check-note">{{ verifyLocationCheck.message }}</text>
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
import { getOffcampus, getOffcampusHistory, getOffcampusAttendance } from '@/api/affair/offcampus'
import { mergePhotoFields } from '@/utils/image'
import { getDicts } from '@/api/system/dict/data'
import verifyCapture from '@/components/verify-capture/index.vue'
import OffcampusLocation from '@/components/offcampus-location/offcampus-location.vue'
import { enqueueRequest, flushOfflineQueue } from '@/utils/offlineQueue'

export default {
  components: { verifyCapture, OffcampusLocation },
  data() {
    return {
      id: null,
      detail: {},
      verifyPhotoList: [],
      verifyRemark: '',
      captureInfo: null,
      locationState: 'idle',
      locationMessage: '',
      historyList: [],
      attendanceList: [],
      // 字典 fd_offcampus_housing_type 拉取前的兜底选项
      housingTypeOptions: [
        { label: '自有住房', value: 'own_house' },
        { label: '租房', value: 'rent_house' },
        { label: '投靠亲属', value: 'relative' },
        { label: '其他', value: 'other' }
      ]
    }
  },
  computed: {
    /** 佐证材料：新字段 material_photos 优先，历史分类列跟在后面，按 URL 去重 */
    materialUrls() {
      const d = this.detail
      return mergePhotoFields(
        d.materialPhotos,
        d.propertyCert,
        d.relationCert,
        d.rentContract,
        d.reasonPhotos,
        d.housingPhotos,
        d.extraMaterials,
        d.transportProof
      )
    },
    captureCoordinateText() {
      if (this.locationState === 'locating') return '正在获取现场定位'
      if (!this.captureInfo) return this.locationState === 'failed' ? '定位失败，请重试' : '等待现场定位'
      const latitude = Number(this.captureInfo.latitude)
      const longitude = Number(this.captureInfo.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '未获取到坐标'
      return '北纬' + latitude.toFixed(6) + '，东经' + longitude.toFixed(6)
    },
    verifyLocationCheck() {
      const rawLatitude = this.captureInfo ? this.captureInfo.latitude : null
      const rawLongitude = this.captureInfo ? this.captureInfo.longitude : null
      const rawAddressLatitude = this.detail ? this.detail.mapLatitude : null
      const rawAddressLongitude = this.detail ? this.detail.mapLongitude : null
      const latitude = Number(rawLatitude)
      const longitude = Number(rawLongitude)
      const addressLatitude = Number(rawAddressLatitude)
      const addressLongitude = Number(rawAddressLongitude)
      if (rawAddressLatitude == null || rawAddressLongitude == null
        || !Number.isFinite(addressLatitude) || !Number.isFinite(addressLongitude)) {
        return {
          available: false,
          withinRange: false,
          stateClass: 'check-unavailable',
          stateText: '待定位',
          distanceText: '-',
          message: '外宿地址尚未解析到地图坐标，无法执行现场距离校验'
        }
      }
      if (rawLatitude == null || rawLongitude == null
        || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        const locating = this.locationState === 'locating'
        const failed = this.locationState === 'failed'
        return {
          available: false,
          withinRange: false,
          stateClass: failed ? 'check-fail' : 'check-pending',
          stateText: locating ? '定位中' : (failed ? '定位失败' : '待定位'),
          distanceText: '-',
          message: failed
            ? (this.locationMessage || '现场定位失败，请开放定位权限后重试')
            : (locating ? '正在获取现场位置' : '进入页面后会自动获取现场位置')
        }
      }
      const distance = this.distanceMeters(latitude, longitude, addressLatitude, addressLongitude)
      const accuracy = Math.min(Math.max(Number(this.captureInfo.accuracy) || 0, 0), 100)
      const effectiveDistance = Math.max(0, distance - accuracy)
      const radius = Number(this.detail.verifyRadiusMeters) || 300
      const withinRange = effectiveDistance <= radius
      return {
        available: true,
        withinRange,
        stateClass: withinRange ? 'check-pass' : 'check-fail',
        stateText: withinRange ? '范围内' : '范围外',
        distanceText: '约' + Math.round(distance) + '米（允许' + radius + '米）',
        message: withinRange
          ? '现场位置在外宿地址附近，可以提交核实通过'
          : '现场位置距外宿地址约' + Math.round(distance) + '米，超出' + radius + '米核实范围'
      }
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadDetail()
    this.loadHousingTypes()
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
            const attRes = await getOffcampusAttendance(this.detail.xh)
            if (attRes.data) {
              this.attendanceList = attRes.data || []
            }
          }
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    previewMaterial(idx) { uni.previewImage({ current: idx, urls: this.materialUrls }) },
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
      if (!type) return '-'
      const hit = this.housingTypeOptions.find(o => o.value === type)
      return hit ? hit.label : type
    },
    loadHousingTypes() {
      return getDicts('fd_offcampus_housing_type').then(res => {
        const options = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
        if (options.length) this.housingTypeOptions = options
      }).catch(() => {})
    },
    onCaptureEvidence(captureInfo) {
      this.captureInfo = captureInfo || null
      if (this.captureInfo) {
        this.locationState = 'ready'
        this.locationMessage = ''
      }
    },
    onLocationState(payload = {}) {
      this.locationState = payload.state || 'idle'
      this.locationMessage = payload.message || ''
      if (payload.info) this.captureInfo = Object.assign({}, payload.info)
      if (payload.state === 'ready' && !payload.info) this.captureInfo = null
    },
    distanceMeters(lat1, lng1, lat2, lng2) {
      const earthRadius = 6371008.8
      const radLat1 = lat1 * Math.PI / 180
      const radLat2 = lat2 * Math.PI / 180
      const deltaLat = (lat2 - lat1) * Math.PI / 180
      const deltaLng = (lng2 - lng1) * Math.PI / 180
      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
        + Math.cos(radLat1) * Math.cos(radLat2)
        * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
      return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    },
    calcAbsentRate(item) {
      const total = Number(item.totalLessons) || 0
      if (total === 0) return '无记录'
      const absent = (Number(item.absentLessons) || 0) + (Number(item.lateLessons) || 0) + (Number(item.earlyLeaveLessons) || 0)
      const rate = (absent / total * 100).toFixed(1)
      return '缺勤率 ' + rate + '%'
    },
    getAttRateClass(item) {
      const total = Number(item.totalLessons) || 0
      if (total === 0) return ''
      const absent = (Number(item.absentLessons) || 0) + (Number(item.lateLessons) || 0) + (Number(item.earlyLeaveLessons) || 0)
      const rate = absent / total
      if (rate >= 0.33) return 'att-rate-danger'
      if (rate >= 0.15) return 'att-rate-warn'
      return 'att-rate-ok'
    },
    buildVerifyPayload(status) {
      return {
        id: this.id,
        verifyStatus: status,
        verifyPhotos: JSON.stringify([]),
        verifyRemark: this.verifyRemark,
        verifyLatitude: this.captureInfo ? this.captureInfo.latitude : null,
        verifyLongitude: this.captureInfo ? this.captureInfo.longitude : null,
        verifyAccuracyMeters: this.captureInfo ? this.captureInfo.accuracy : null
      }
    },
    buildVerifyUploads() {
      return (this.verifyPhotoList || []).map(photo => {
        const localPath = photo && (photo.localPath || photo.originalPath)
        if (!localPath) return null
        return {
          localPath,
          uploadUrl: '/common/upload',
          field: 'file',
          jsonArrayPath: 'verifyPhotos',
          jsonArrayValue: 'filePath'
        }
      }).filter(Boolean)
    },
    doVerify(status) {
      if (status === 'verified' && !this.$refs.capture.ensurePhotoCount()) return
      if (status === 'verified' && !this.captureInfo) {
        return uni.showToast({ title: '请先现场拍照获取定位', icon: 'none', duration: 2200 })
      }
      if (status === 'verified' && !this.verifyLocationCheck.available) {
        return uni.showToast({ title: this.verifyLocationCheck.message, icon: 'none', duration: 2800 })
      }
      if (status === 'verified' && !this.verifyLocationCheck.withinRange) {
        return uni.showToast({ title: this.verifyLocationCheck.message, icon: 'none', duration: 3200 })
      }
      const actionText = status === 'verified' ? '通过' : '驳回'
      uni.showModal({
        title: '确认' + actionText,
        content: status === 'verified' ? '确认该外宿申请现场核实通过？通过后将自动提交书记审批。' : '确认驳回该外宿申请？',
        success: async (modalRes) => {
          if (!modalRes.confirm) return
          try {
            const result = await enqueueRequest({
              businessType: 'offcampus_verify',
              title: '外宿核实：' + (this.detail.studentName || this.detail.xh),
              request: {
                url: '/api/offcampus/verify',
                method: 'put',
                data: this.buildVerifyPayload(status)
              },
              uploads: this.buildVerifyUploads()
            })
            flushOfflineQueue()
            uni.showToast({
              title: result.duplicate ? '该核实已在后台处理' : '已提交，照片后台上传',
              icon: 'none'
            })
            setTimeout(() => uni.navigateBack(), 450)
          } catch (e) {
            const message = typeof e === 'string' ? e : ((e && e.message) || '提交失败，请重试')
            uni.showToast({ title: message, icon: 'none', duration: 3200 })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.verify-page { min-height: 100vh; background: #f5f6f8; padding-bottom: 140rpx; }
.info-card { background: #fff; margin: 20rpx; border-radius: 12rpx; padding: 24rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; padding-left: 12rpx; border-left: 6rpx solid #667eea; }
.info-row { display: flex; margin-bottom: 12rpx; }
.info-label { font-size: 26rpx; color: #999; width: 140rpx; flex-shrink: 0; }
.info-value { font-size: 26rpx; color: #333; flex: 1; }
.photo-section { margin-bottom: 16rpx; }
.empty-tip { font-size: 24rpx; color: #bbb; }
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
.action-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); gap: 20rpx; }
.action-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 12rpx; }
.reject-btn { background: #fff5f5; border: 2rpx solid #f56c6c; }
.reject-btn .action-text { color: #f56c6c; font-size: 30rpx; font-weight: 500; }
.pass-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.pass-btn .action-text { color: #fff; font-size: 30rpx; font-weight: 500; }
.att-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.att-item:last-child { border-bottom: none; }
.att-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rpx; }
.att-course { font-size: 26rpx; color: #333; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-rate { font-size: 24rpx; font-weight: 500; flex-shrink: 0; margin-left: 12rpx; }
.att-rate-ok { color: #4caf50; }
.att-rate-warn { color: #ff9800; }
.att-rate-danger { color: #f44336; }
.att-detail { font-size: 22rpx; color: #999; }
.location-check-card { background: #fff; margin: 20rpx; border-radius: 12rpx; padding: 24rpx; border-left: 6rpx solid #cbd5e1; }
.location-check-card.check-pass { border-left-color: #16a34a; }
.location-check-card.check-fail { border-left-color: #dc2626; }
.location-check-card.check-unavailable { border-left-color: #f59e0b; }
.location-check-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.location-check-title { font-size: 28rpx; font-weight: 600; color: #1f2937; }
.location-check-state { padding: 4rpx 12rpx; border-radius: 6rpx; background: #f1f5f9; color: #64748b; font-size: 22rpx; }
.check-pass .location-check-state { background: #ecfdf5; color: #15803d; }
.check-fail .location-check-state { background: #fef2f2; color: #b91c1c; }
.check-unavailable .location-check-state { background: #fffbeb; color: #b45309; }
.location-check-row { display: flex; margin-bottom: 10rpx; }
.location-check-label { width: 140rpx; flex-shrink: 0; color: #94a3b8; font-size: 24rpx; }
.location-check-value { flex: 1; min-width: 0; color: #334155; font-size: 24rpx; line-height: 34rpx; }
.location-check-note { display: block; margin-top: 8rpx; padding: 14rpx 16rpx; border-radius: 8rpx; background: #f8fafc; color: #64748b; font-size: 23rpx; line-height: 34rpx; }
.check-fail .location-check-note { background: #fff7f7; color: #b91c1c; }
</style>
