<template>
  <view class="detail-page">
    <!-- 基本信息 -->
    <view class="info-card">
      <view class="card-title">基本信息</view>
      <view class="info-row">
        <text class="info-label">申请单号</text>
        <text class="info-value">{{ detail.applyNo }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">学号</text>
        <text class="info-value">{{ detail.xh }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">姓名</text>
        <text class="info-value">{{ detail.studentName }}</text>
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
        <text class="info-label">当前状态</text>
        <text class="info-value" :class="'status-text-' + getStatusClass()">{{ getStatusText(detail.status, detail.verifyStatus) }}</text>
      </view>
    </view>

    <!-- 外宿信息 -->
    <view class="info-card">
      <view class="card-title">外宿信息</view>
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
      <view class="info-row" v-if="detail.transportType">
        <text class="info-label">交通工具</text>
        <text class="info-value">{{ getTransportText(detail.transportType) }}</text>
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

    <!-- 现场核实结果 -->
    <view class="info-card" v-if="detail.verifyStatus">
      <view class="card-title">现场核实结果</view>
      <view class="info-row">
        <text class="info-label">核实状态</text>
        <text class="info-value" :class="'status-text-' + (detail.verifyStatus === 'verified' ? 'approved' : 'rejected')">{{ detail.verifyStatus === 'verified' ? '已通过' : '已驳回' }}</text>
      </view>
      <view class="info-row" v-if="detail.verifyTime">
        <text class="info-label">核实时间</text>
        <text class="info-value">{{ detail.verifyTime }}</text>
      </view>
      <view class="info-row" v-if="detail.verifyRemark">
        <text class="info-label">核实备注</text>
        <text class="info-value">{{ detail.verifyRemark }}</text>
      </view>
      <view class="photo-section" v-if="verifyUrls.length">
        <text class="section-label">现场核实照片</text>
        <view class="photo-grid">
          <image v-for="(url, idx) in verifyUrls" :key="'v'+idx" :src="url" class="photo-thumb" mode="aspectFill" @click="previewVerify(idx)" />
        </view>
      </view>
    </view>

    <!-- 审批记录 -->
    <view class="info-card" v-if="detail.approvalList && detail.approvalList.length > 0">
      <view class="card-title">审批记录</view>
      <view class="approval-item" v-for="(item, idx) in detail.approvalList" :key="idx">
        <view class="approval-dot" :class="item.action === 'approved' ? 'dot-green' : 'dot-red'"></view>
        <view class="approval-content">
          <view class="approval-top">
            <text class="approval-level">{{ getLevelText(item.approvalLevel) }}</text>
            <text class="approval-action" :class="item.action === 'approved' ? 'text-green' : 'text-red'">{{ item.action === 'approved' ? '通过' : '驳回' }}</text>
          </view>
          <text class="approval-name">{{ item.approverName }} · {{ item.createTime }}</text>
          <text class="approval-opinion" v-if="item.opinion">{{ item.opinion }}</text>
        </view>
      </view>
    </view>

    <!-- 历史申请记录 -->
    <view class="info-card" v-if="historyList.length > 0">
      <view class="card-title">历史申请记录</view>
      <view class="history-item" v-for="item in historyList" :key="item.id" @click="goHistoryDetail(item)">
        <view class="history-row">
          <text class="history-year">{{ item.academicYear }}</text>
          <text class="history-status" :class="'status-text-' + getHistoryStatusClass(item)">{{ getStatusText(item.status, item.verifyStatus) }}</text>
        </view>
        <view class="history-row">
          <text class="history-time">{{ item.applyTime || item.createTime }}</text>
          <text class="history-type">{{ getHousingTypeText(item.housingType) }}</text>
        </view>
      </view>
    </view>

    <!-- 审批操作栏（书记/学生处可见） -->
    <view class="action-bar" v-if="canApprove()">
      <view class="approve-form">
        <textarea class="form-textarea" v-model="approvalOpinion" placeholder="请输入审批意见" maxlength="200" />
        <view class="approve-btns">
          <view class="action-btn reject-btn" @click="doApprove('rejected')">
            <text class="action-text">驳回</text>
          </view>
          <view class="action-btn pass-btn" @click="doApprove('approved')">
            <text class="action-text">通过</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getOffcampus, approveOffcampus, getOffcampusHistory } from '@/api/affair/offcampus'
import { getDicts } from '@/api/system/dict/data'
import { mergePhotoFields } from '@/utils/image'
import OffcampusLocation from '@/components/offcampus-location/offcampus-location.vue'

export default {
  components: { OffcampusLocation },
  data() {
    return {
      detail: {},
      historyList: [],
      approvalOpinion: '',
      // 字典拉取前的兜底选项，onLoad 里会被字典结果整体替换
      housingTypeOptions: [
        { label: '自有住房', value: 'own_house' },
        { label: '租房', value: 'rent_house' },
        { label: '投靠亲属', value: 'relative' },
        { label: '其他', value: 'other' }
      ],
      transportOptions: [
        { label: '火车', value: 'train' },
        { label: '飞机', value: 'plane' },
        { label: '汽车', value: 'bus' },
        { label: '步行', value: 'walk' },
        { label: '地铁', value: 'metro' },
        { label: '电动车', value: 'electric_bike' },
        { label: '摩托车', value: 'motorcycle' },
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
    verifyUrls() {
      return mergePhotoFields(this.detail.verifyPhotos)
    }
  },
  onLoad(options) {
    this.loadHousingTypes()
    this.loadTransportTypes()
    this.loadDetail(options.id)
  },
  methods: {
    async loadDetail(id) {
      try {
        const res = await getOffcampus(id)
        if (res.data) {
          this.detail = res.data
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
    canApprove() {
      if (this.detail.verifyStatus !== 'verified') return false
      const roles = this.$store.getters.roles || []
      if (roles.includes('admin')) return true
      if (this.detail.status === 'counselor_approved') return roles.includes('secretary')
      if (this.detail.status === 'secretary_approved') return roles.includes('student_affairs')
      return false
    },
    getStatusClass() {
      if (this.detail.status === 'rejected') return 'rejected'
      if (this.detail.status === 'student_affairs_approved') return 'approved'
      if (this.detail.verifyStatus === 'pending') return 'pending'
      return 'processing'
    },
    getHistoryStatusClass(item) {
      if (item.status === 'rejected') return 'rejected'
      if (item.status === 'student_affairs_approved') return 'approved'
      if (item.verifyStatus === 'pending') return 'pending'
      return 'processing'
    },
    getStatusText(status, verifyStatus) {
      if (status === 'rejected') return '已驳回'
      if (status === 'student_affairs_approved') return '已通过'
      if (verifyStatus === 'pending') return '待核实'
      if (status === 'counselor_approved') return '待书记审批'
      if (status === 'secretary_approved') return '待学生处审批'
      return status
    },
    getHousingTypeText(type) {
      if (!type) return '-'
      const hit = this.housingTypeOptions.find(o => o.value === type)
      return hit ? hit.label : type
    },
    getTransportText(type) {
      if (!type) return '-'
      const hit = this.transportOptions.find(o => o.value === type)
      if (hit) return hit.label
      return type === 'car' ? '汽车' : type
    },
    loadHousingTypes() {
      return getDicts('fd_offcampus_housing_type').then(res => {
        const options = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
        if (options.length) this.housingTypeOptions = options
      }).catch(() => {})
    },
    loadTransportTypes() {
      return getDicts('transport_type').then(res => {
        const options = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
        if (options.length) this.transportOptions = options
      }).catch(() => {})
    },
    getLevelText(level) {
      const map = { counselor: '辅导员', secretary: '书记', student_affairs: '学生处' }
      return map[level] || level
    },
    previewMaterial(idx) { uni.previewImage({ current: idx, urls: this.materialUrls }) },
    previewVerify(idx) { uni.previewImage({ current: idx, urls: this.verifyUrls }) },
    goHistoryDetail(item) {
      uni.navigateTo({ url: '/pages/sub-work/offcampus/detail?id=' + item.id })
    },
    async doApprove(action) {
      const actionText = action === 'approved' ? '通过' : '驳回'
      uni.showModal({
        title: '确认' + actionText,
        content: '确认' + actionText + '该外宿申请？',
        success: async (modalRes) => {
          if (!modalRes.confirm) return
          try {
            const data = { id: this.detail.id, status: action }
            // 根据当前状态决定传哪个意见字段
            if (this.detail.status === 'counselor_approved') {
              data.secretaryOpinion = this.approvalOpinion
            } else if (this.detail.status === 'secretary_approved') {
              data.studentAffairsOpinion = this.approvalOpinion
            }
            const res = await approveOffcampus(data)
            if (res.code === 200) {
              uni.showToast({ title: '审批' + actionText + '成功', icon: 'success' })
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
.detail-page { min-height: 100vh; background: #f5f6f8; padding-bottom: 40rpx; }
.info-card { background: #fff; margin: 20rpx; border-radius: 12rpx; padding: 24rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; padding-left: 12rpx; border-left: 6rpx solid #667eea; }
.info-row { display: flex; margin-bottom: 12rpx; }
.info-label { font-size: 26rpx; color: #999; width: 140rpx; flex-shrink: 0; }
.info-value { font-size: 26rpx; color: #333; flex: 1; }
.status-text-rejected { color: #f44336; font-weight: 500; }
.status-text-approved { color: #4caf50; font-weight: 500; }
.status-text-pending { color: #ff9800; font-weight: 500; }
.status-text-processing { color: #2196f3; font-weight: 500; }
.photo-section { margin-bottom: 16rpx; }
.section-label { font-size: 24rpx; color: #666; margin-bottom: 8rpx; display: block; }
.photo-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.photo-thumb { width: 160rpx; height: 160rpx; border-radius: 8rpx; }
.empty-tip { font-size: 24rpx; color: #bbb; }
.approval-item { display: flex; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.approval-item:last-child { border-bottom: none; }
.approval-dot { width: 16rpx; height: 16rpx; border-radius: 50%; margin-top: 8rpx; flex-shrink: 0; }
.dot-green { background: #4caf50; }
.dot-red { background: #f44336; }
.approval-content { flex: 1; }
.approval-top { display: flex; justify-content: space-between; margin-bottom: 6rpx; }
.approval-level { font-size: 26rpx; color: #333; font-weight: 500; }
.approval-action { font-size: 24rpx; font-weight: 500; }
.text-green { color: #4caf50; }
.text-red { color: #f44336; }
.approval-name { font-size: 22rpx; color: #999; display: block; margin-bottom: 4rpx; }
.approval-opinion { font-size: 24rpx; color: #666; display: block; }
.history-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.history-row { display: flex; justify-content: space-between; margin-bottom: 4rpx; }
.history-year { font-size: 26rpx; color: #333; font-weight: 500; }
.history-status { font-size: 24rpx; }
.history-time { font-size: 22rpx; color: #999; }
.history-type { font-size: 22rpx; color: #666; }
.action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); }
.approve-form { width: 100%; }
.form-textarea { background: #f5f5f5; padding: 16rpx 20rpx; border-radius: 8rpx; font-size: 28rpx; width: 100%; height: 120rpx; margin-bottom: 16rpx; box-sizing: border-box; }
.approve-btns { display: flex; gap: 20rpx; }
.action-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 12rpx; }
.reject-btn { background: #fff5f5; border: 2rpx solid #f56c6c; }
.reject-btn .action-text { color: #f56c6c; font-size: 30rpx; font-weight: 500; }
.pass-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.pass-btn .action-text { color: #fff; font-size: 30rpx; font-weight: 500; }
</style>
