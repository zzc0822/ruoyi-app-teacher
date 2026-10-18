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
      tip="请到现场查看住宿环境实际情况，拍摄3-5张核实照片"
    />

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
import { getOffcampus, verifyOffcampus, getOffcampusHistory, getOffcampusAttendance } from '@/api/affair/offcampus'
import { mergePhotoFields } from '@/utils/image'
import { getDicts } from '@/api/system/dict/data'
import verifyCapture from '@/components/verify-capture/index.vue'
import { enqueueRequest, isNetworkFailure } from '@/utils/offlineQueue'

export default {
  components: { verifyCapture },
  data() {
    return {
      id: null,
      detail: {},
      verifyPhotoList: [],
      verifyRemark: '',
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
    doVerify(status) {
      if (status === 'verified' && !this.$refs.capture.ensurePhotoCount()) return
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
            if (isNetworkFailure(e)) {
              const result = await enqueueRequest({
                businessType: 'offcampus_verify',
                title: '外宿核实：' + (this.detail.studentName || this.detail.xh),
                request: {
                  url: '/api/offcampus/verify',
                  method: 'put',
                  data: {
                    id: this.id,
                    verifyStatus: status,
                    verifyPhotos: JSON.stringify(this.verifyPhotoList),
                    verifyRemark: this.verifyRemark
                  }
                }
              })
              uni.showToast({
                title: result.duplicate ? '已在待同步队列' : '网络较弱，已加入待同步',
                icon: 'none'
              })
              setTimeout(() => uni.navigateBack(), 1200)
            } else {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
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
</style>
