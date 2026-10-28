<template>
  <view class="page-container">
    <!-- 加载中 -->
    <view class="loading-wrap" v-if="!detail">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <view class="detail-card" v-if="detail">
      <!-- 审批状态横幅 -->
      <view :class="['status-banner', 'banner-' + detail.approvalStatus]">
        <view class="banner-icon">{{ statusIcon }}</view>
        <text class="banner-text">{{ formatStatus(detail.approvalStatus) }}</text>
        <text class="banner-sub" v-if="detail.approvalStatus === 'supplement'">查课登记请假，等待辅导员补充</text>
        <text class="banner-sub" v-else-if="detail.approvalLevel === 'secretary'">超过3天，需上级审批</text>
        <text class="banner-sub" v-else-if="detail.approvalLevel === 'counselor'">3天以内，辅导员审批</text>
      </view>

      <!-- 学生信息 -->
      <view class="info-section">
        <view class="section-title">
          <text class="title-icon">👤</text>
          <text class="title-text">学生信息</text>
        </view>
        <view class="info-grid">
          <view class="info-cell">
            <text class="info-label">姓名</text>
            <text class="info-value">{{ detail.studentName }}</text>
          </view>
          <view class="info-cell">
            <text class="info-label">学号</text>
            <text class="info-value">{{ detail.xh }}</text>
          </view>
          <view class="info-cell">
            <text class="info-label">班级</text>
            <text class="info-value">{{ detail.bjjc || detail.bjmc || '-' }}</text>
          </view>
          <view class="info-cell">
            <text class="info-label">辅导员</text>
            <text class="info-value">{{ detail.counselorName || '-' }}</text>
          </view>
          <view class="info-cell" v-if="detail.contactPhone">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ detail.contactPhone }}</text>
          </view>
        </view>
      </view>

      <!-- 请假信息 -->
      <view class="info-section">
        <view class="section-title">
          <text class="title-icon">📋</text>
          <text class="title-text">请假信息</text>
        </view>
        <view class="info-grid">
          <view class="info-cell">
            <text class="info-label">类型</text>
            <text class="info-value">{{ formatLeaveTypeSafe(detail.leaveType) }}</text>
          </view>
          <view class="info-cell">
            <text class="info-label">天数</text>
            <text class="info-value highlight">{{ detail.leaveDays }}天</text>
          </view>
          <view class="info-cell" v-if="detail.destination">
            <text class="info-label">目的地</text>
            <text class="info-value">{{ detail.destination }}</text>
          </view>
          <view class="info-cell" v-if="detail.transportType">
            <text class="info-label">交通方式</text>
            <text class="info-value">{{ formatTransport(detail.transportType) }}{{ detail.transportInfo ? ' (' + detail.transportInfo + ')' : '' }}</text>
          </view>
        </view>
        <!-- 时间轴 -->
        <view class="timeline">
          <view class="timeline-node">
            <view class="node-dot start"></view>
            <view class="node-content">
              <text class="node-label">离校时间</text>
              <text class="node-time">{{ formatDateTime(detail.startTime) }}</text>
            </view>
          </view>
          <view class="timeline-line"></view>
          <view class="timeline-node">
            <view class="node-dot end"></view>
            <view class="node-content">
              <text class="node-label">返校时间</text>
              <text class="node-time">{{ formatDateTime(detail.endTime) }}</text>
            </view>
          </view>
        </view>
        <view class="reason-box" v-if="detail.leaveReason">
          <text class="reason-label">请假事由</text>
          <text class="reason-text">{{ detail.leaveReason }}</text>
        </view>
      </view>

      <!-- 查课请假待补充 -->
      <view class="info-section" v-if="detail.approvalStatus === 'supplement'">
        <view class="section-title">
          <text class="title-icon">✍</text>
          <text class="title-text">信息补充</text>
        </view>
        <view class="supplement-owner-tip" v-if="!canSupplement">
          <text>该记录由负责辅导员补充</text>
        </view>
        <view class="supplement-form" v-else>
          <view class="form-row">
            <text class="form-label">请假类型</text>
            <picker
              mode="selector"
              :range="leaveTypeOptions"
              range-key="label"
              :value="leaveTypeIndex"
              @change="onLeaveTypeChange"
            >
              <view class="form-picker">
                <text :class="{ 'form-placeholder': !supplementForm.leaveType }">{{ leaveTypeLabel }}</text>
                <text class="form-arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="form-row">
            <text class="form-label">请假事由</text>
            <textarea
              v-model="supplementForm.leaveReason"
              class="form-textarea"
              maxlength="200"
              placeholder="请填写具体请假事由"
            />
          </view>
          <view class="form-row">
            <text class="form-label">离校时间</text>
            <view class="datetime-row">
              <picker mode="date" :value="supplementForm.startDate" @change="onStartDateChange">
                <view class="form-picker compact">{{ supplementForm.startDate || '选择日期' }}</view>
              </picker>
              <picker mode="time" :value="supplementForm.startClock" @change="onStartClockChange">
                <view class="form-picker compact">{{ supplementForm.startClock || '选择时间' }}</view>
              </picker>
            </view>
          </view>
          <view class="form-row">
            <text class="form-label">预计返校</text>
            <view class="datetime-row">
              <picker mode="date" :value="supplementForm.endDate" @change="onEndDateChange">
                <view class="form-picker compact">{{ supplementForm.endDate || '选择日期' }}</view>
              </picker>
              <picker mode="time" :value="supplementForm.endClock" @change="onEndClockChange">
                <view class="form-picker compact">{{ supplementForm.endClock || '选择时间' }}</view>
              </picker>
            </view>
          </view>
          <view class="form-row">
            <text class="form-label">请假天数</text>
            <input
              v-model="supplementForm.leaveDays"
              class="form-input"
              type="digit"
              placeholder="请输入请假天数"
            />
          </view>
          <view class="form-row">
            <text class="form-label">家长电话</text>
            <input
              v-model="supplementForm.parentPhone"
              class="form-input"
              type="number"
              maxlength="11"
              placeholder="请填写可核实的家长电话"
            />
          </view>
          <view class="contact-confirm">
            <view class="contact-confirm-copy">
              <text class="contact-confirm-title">已联系家长核实</text>
              <text class="contact-confirm-sub">提交后将进入请假审批</text>
            </view>
            <switch
              :checked="supplementForm.parentContacted === '1'"
              color="#2563eb"
              @change="onParentContactedChange"
            />
          </view>
          <button
            class="supplement-submit"
            :loading="supplementSaving"
            :disabled="supplementSaving"
            @click="submitSupplement"
          >
            提交审批
          </button>
        </view>
      </view>

      <!-- 审批信息 -->
      <view class="info-section" v-if="detail.approvalStatus !== 'pending' && detail.approvalStatus !== 'supplement'">
        <view class="section-title">
          <text class="title-icon">✅</text>
          <text class="title-text">审批信息</text>
        </view>
        <view class="info-grid">
          <view class="info-cell">
            <text class="info-label">审批人</text>
            <text class="info-value">{{ detail.approverName || '-' }}</text>
          </view>
          <view class="info-cell">
            <text class="info-label">审批时间</text>
            <text class="info-value">{{ formatDateTime(detail.approvalTime) }}</text>
          </view>
        </view>
        <view class="reason-box" v-if="detail.approvalRemark">
          <text class="reason-label">审批意见</text>
          <text class="reason-text">{{ detail.approvalRemark }}</text>
        </view>
      </view>

      <!-- 销假信息 -->
      <view class="info-section" v-if="detail.approvalStatus === 'approved'">
        <view class="section-title">
          <text class="title-icon">🔄</text>
          <text class="title-text">销假信息</text>
        </view>
        <view class="info-grid">
          <view class="info-cell">
            <text class="info-label">销假状态</text>
            <text :class="['info-value', 'return-' + (detail.returnStatus || 'not_returned')]">{{ formatReturnStatusSafe(detail.returnStatus) }}</text>
          </view>
          <view class="info-cell" v-if="detail.actualReturnTime">
            <text class="info-label">实际返校</text>
            <text class="info-value">{{ formatDateTime(detail.actualReturnTime) }}</text>
          </view>
        </view>
        <view class="reason-box" v-if="detail.returnRemark">
          <text class="reason-label">销假备注</text>
          <text class="reason-text">{{ detail.returnRemark }}</text>
        </view>
      </view>

      <!-- 请假佐证材料 -->
      <view class="info-section" v-if="detail.leaveAttachmentList && detail.leaveAttachmentList.length > 0">
        <view class="section-title">
          <text class="title-icon">📸</text>
          <text class="title-text">请假佐证材料</text>
          <text class="attach-count">{{ detail.leaveAttachmentList.length }}张</text>
        </view>
        <view class="attach-grid">
          <view class="attach-thumb-wrap" v-for="(att, ai) in detail.leaveAttachmentList" :key="ai" @click="previewPhoto('leave', ai)">
            <image :src="getAttachSrc(att)" mode="aspectFill" class="attach-thumb"></image>
          </view>
        </view>
      </view>

      <!-- 销假佐证材料 -->
      <view class="info-section" v-if="detail.returnAttachmentList && detail.returnAttachmentList.length > 0">
        <view class="section-title">
          <text class="title-icon">📸</text>
          <text class="title-text">销假佐证材料</text>
          <text class="attach-count">{{ detail.returnAttachmentList.length }}张</text>
        </view>
        <view class="attach-grid">
          <view class="attach-thumb-wrap" v-for="(att, ai) in detail.returnAttachmentList" :key="ai" @click="previewPhoto('return', ai)">
            <image :src="getAttachSrc(att)" mode="aspectFill" class="attach-thumb"></image>
          </view>
        </view>
      </view>
    </view>

    <!-- 审批操作栏（仅≤3天待审批状态显示） -->
    <view class="approval-bar" v-if="detail && detail.approvalStatus === 'pending' && detail.approvalLevel === 'counselor'">
      <view class="approval-btn reject" @click="doApproval('rejected')">✕ 拒绝</view>
      <view class="approval-btn approve" @click="doApproval('approved')">✓ 批准</view>
      <view class="approval-btn close" @click="goBack">关闭</view>
    </view>
    <!-- 非操作状态显示返回按钮（已批准未销假时附带销假入口） -->
    <view class="back-bar" v-if="detail && (detail.approvalStatus !== 'pending' || detail.approvalLevel !== 'counselor')">
      <view class="bar-row">
        <view class="return-btn" v-if="canReturn" @click="doReturnLeave">✓ 销假</view>
        <view class="back-btn" @click="goBack">返回</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getLeave, approvalLeave, returnLeave, updateSupplementLeave } from '@/api/work/leave'
import { getTeacherinfoByUserId } from '@/api/work/teacherinfo'
import { isAdmin } from '@/utils/role'
import config from '@/config'

export default {
  data() {
    return {
      id: null,
      detail: null,
      baseUrl: config.baseUrl,
      currentTeacherId: null,
      isAdminUser: false,
      supplementSaving: false,
      leaveTypeOptions: [
        { value: 'sick', label: '病假' },
        { value: 'personal', label: '事假' },
        { value: 'public', label: '公假' },
        { value: 'other', label: '其他' }
      ],
      supplementForm: {
        leaveType: '',
        leaveReason: '',
        startDate: '',
        startClock: '',
        endDate: '',
        endClock: '',
        leaveDays: '',
        parentPhone: '',
        parentContacted: '0'
      }
    }
  },
  computed: {
    statusIcon() {
      if (!this.detail || !this.detail.approvalStatus) return '❓'
      const map = { supplement: '待补', pending: '⏳', approved: '✓', rejected: '✕', forward: '↑' }
      return map[this.detail.approvalStatus] || '❓'
    },
    canReturn() {
      return this.detail && this.detail.approvalStatus === 'approved'
        && this.detail.returnStatus !== 'returned' && this.detail.returnStatus !== 'late_returned'
    },
    canSupplement() {
      if (!this.detail || this.detail.approvalStatus !== 'supplement') return false
      if (this.isAdminUser) return true
      return this.currentTeacherId != null
        && this.detail.counselorId != null
        && String(this.currentTeacherId) === String(this.detail.counselorId)
    },
    leaveTypeIndex() {
      const index = this.leaveTypeOptions.findIndex(item => item.value === this.supplementForm.leaveType)
      return index < 0 ? 0 : index
    },
    leaveTypeLabel() {
      const item = this.leaveTypeOptions.find(option => option.value === this.supplementForm.leaveType)
      return item ? item.label : '请选择'
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadCurrentIdentity()
    this.loadDetail()
  },
  methods: {
    loadCurrentIdentity() {
      let roles = []
      try { roles = uni.getStorageSync('user_roles') || [] } catch (e) {}
      this.isAdminUser = isAdmin(roles)
      getTeacherinfoByUserId().then(res => {
        this.currentTeacherId = res.data && res.data.teacherId
      }).catch(() => {})
    },
    loadDetail() {
      getLeave(this.id).then(res => {
        this.detail = res.data || res
        this.initSupplementForm()
      }).catch(() => {
        uni.showToast({ title: '加载失败', icon: 'none' })
      })
    },
    initSupplementForm() {
      if (!this.detail || this.detail.approvalStatus !== 'supplement') return
      const start = this.splitDateTime(this.detail.startTime)
      const end = this.splitDateTime(this.detail.endTime)
      const reason = this.detail.leaveReason || ''
      this.supplementForm = {
        leaveType: this.detail.leaveType === 'other' && reason.indexOf('查课登记请假') >= 0
          ? '' : (this.detail.leaveType || ''),
        leaveReason: reason.indexOf('查课登记请假') >= 0 ? '' : reason,
        startDate: start.date,
        startClock: start.clock === '00:00' ? '08:00' : start.clock,
        endDate: end.date,
        endClock: end.clock,
        leaveDays: this.detail.leaveDays || '',
        parentPhone: this.detail.parentPhone || '',
        parentContacted: this.detail.parentContacted || '0'
      }
      this.calculateSupplementDays()
    },
    splitDateTime(value) {
      if (!value) return { date: '', clock: '' }
      const normalized = String(value).replace(' ', 'T')
      const date = new Date(normalized)
      if (isNaN(date.getTime())) {
        return { date: String(value).slice(0, 10), clock: String(value).slice(11, 16) }
      }
      return {
        date: this.formatDatePart(date),
        clock: String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
      }
    },
    formatDatePart(date) {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
        + '-' + String(date.getDate()).padStart(2, '0')
    },
    onLeaveTypeChange(e) {
      const item = this.leaveTypeOptions[Number(e.detail.value)]
      if (item) this.supplementForm.leaveType = item.value
    },
    onStartDateChange(e) {
      this.supplementForm.startDate = e.detail.value
      this.calculateSupplementDays()
    },
    onStartClockChange(e) {
      this.supplementForm.startClock = e.detail.value
      this.calculateSupplementDays()
    },
    onEndDateChange(e) {
      this.supplementForm.endDate = e.detail.value
      this.calculateSupplementDays()
    },
    onEndClockChange(e) {
      this.supplementForm.endClock = e.detail.value
      this.calculateSupplementDays()
    },
    onParentContactedChange(e) {
      this.supplementForm.parentContacted = e.detail.value ? '1' : '0'
    },
    calculateSupplementDays() {
      const start = this.combineDateTime(this.supplementForm.startDate, this.supplementForm.startClock)
      const end = this.combineDateTime(this.supplementForm.endDate, this.supplementForm.endClock)
      if (!start || !end || end <= start) return
      const hours = (end.getTime() - start.getTime()) / 3600000
      const days = Math.max(0.5, Math.ceil((hours / 24) * 2) / 2)
      this.supplementForm.leaveDays = String(days)
    },
    combineDateTime(date, clock) {
      if (!date || !clock) return null
      const value = new Date(date + 'T' + clock + ':00')
      return isNaN(value.getTime()) ? null : value
    },
    async submitSupplement() {
      if (!this.canSupplement || this.supplementSaving) return
      const form = this.supplementForm
      if (!form.leaveType) {
        return uni.showToast({ title: '请选择请假类型', icon: 'none' })
      }
      if (!form.leaveReason.trim()) {
        return uni.showToast({ title: '请填写请假事由', icon: 'none' })
      }
      const start = this.combineDateTime(form.startDate, form.startClock)
      const end = this.combineDateTime(form.endDate, form.endClock)
      if (!start || !end || end <= start) {
        return uni.showToast({ title: '请填写正确的离校和返校时间', icon: 'none' })
      }
      if (!form.leaveDays || Number(form.leaveDays) <= 0) {
        return uni.showToast({ title: '请假天数必须大于0', icon: 'none' })
      }
      if (form.parentContacted !== '1') {
        return uni.showToast({ title: '请先联系家长核实', icon: 'none' })
      }
      if (!/^1[3-9]\d{9}$/.test(String(form.parentPhone || '').trim())) {
        return uni.showToast({ title: '请填写正确的家长电话', icon: 'none' })
      }
      this.supplementSaving = true
      try {
        await updateSupplementLeave(this.id, {
          leaveType: form.leaveType,
          leaveReason: form.leaveReason.trim(),
          startTime: this.formatDateTimeValue(start),
          endTime: this.formatDateTimeValue(end),
          leaveDays: Number(form.leaveDays),
          parentPhone: String(form.parentPhone).trim(),
          parentContacted: '1'
        })
        uni.showToast({ title: '已提交审批', icon: 'success' })
        this.loadDetail()
      } catch (error) {
        uni.showToast({
          title: (error && (error.msg || error.message)) || '提交失败',
          icon: 'none',
          duration: 2500
        })
      } finally {
        this.supplementSaving = false
      }
    },
    formatDateTimeValue(date) {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
        + '-' + String(date.getDate()).padStart(2, '0')
        + ' ' + String(date.getHours()).padStart(2, '0')
        + ':' + String(date.getMinutes()).padStart(2, '0') + ':00'
    },
    doApproval(status) {
      const statusText = { approved: '批准', rejected: '拒绝', forward: '转上级审批' }
      uni.showModal({
        title: `确认${statusText[status]}`,
        content: `${statusText[status]} ${this.detail.studentName} 的请假申请？`,
        editable: status === 'rejected',
        placeholderText: status === 'rejected' ? '请输入拒绝理由' : '',
        success: (res) => {
          if (res.confirm) {
            approvalLeave({
              id: this.detail.id,
              approvalStatus: status,
              approvalRemark: res.content || `小程序${statusText[status]}`
            }).then(() => {
              uni.showToast({ title: `${statusText[status]}成功`, icon: 'success' })
              this.loadDetail()
            }).catch(() => {
              uni.showToast({ title: '操作失败', icon: 'none' })
            })
          }
        }
      })
    },
    doReturnLeave() {
      uni.showModal({
        title: '确认销假',
        content: '确认为 ' + this.detail.studentName + ' 办理销假？',
        editable: true,
        placeholderText: '销假备注（选填）',
        success: (res) => {
          if (res.confirm) {
            returnLeave({
              id: this.detail.id,
              returnRemark: res.content || '小程序销假'
            }).then(() => {
              uni.showToast({ title: '销假成功', icon: 'success' })
              this.loadDetail()
            }).catch(() => {
              uni.showToast({ title: '销假失败', icon: 'none' })
            })
          }
        }
      })
    },
    formatStatus(val) {
      const map = { supplement: '待补充', pending: '待审批', approved: '已批准', rejected: '已拒绝', forward: '转上级审批' }
      return map[val] || val || '未知'
    },
    formatLeaveType(val) {
      const map = { sick: '病假', personal: '事假', other: '其他' }
      return map[val] || val || '未知'
    },
    formatReturnStatus(val) {
      const map = { not_returned: '未销假', returned: '已销假', overdue: '逾期未归', late_returned: '逾期销假' }
      return map[val] || val || ''
    },
    formatTransport(val) {
      const map = { train: '火车', plane: '飞机', bus: '汽车', other: '其他' }
      return map[val] || val || ''
    },
    formatDateTime(val) {
      if (!val) return '-'
      const d = new Date(val.replace(/ /g, 'T'))
      if (isNaN(d.getTime())) return val
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day} ${h}:${min}`
    },
    formatLeaveTypeSafe(val) {
      const map = { sick: '病假', personal: '事假', other: '其他' }
      return map[val] || val || '-'
    },
    formatReturnStatusSafe(val) {
      const map = { not_returned: '未销假', returned: '已销假', overdue: '逾期未归', late_returned: '逾期销假' }
      return map[val] || val || '-'
    },
    goBack() {
      uni.navigateBack()
    },
    previewPhoto(type, idx) {
      const list = type === 'return' ? (this.detail.returnAttachmentList || []) : (this.detail.leaveAttachmentList || [])
      // 预览优先使用base64
      const urls = list.map(a => {
        if (a.thumbnailBase64 && a.thumbnailBase64.startsWith('data:')) return a.thumbnailBase64
        return this.baseUrl + '/profile' + a.filePath
      })
      uni.previewImage({ current: urls[idx] || urls[0], urls })
    },
    // 获取附件图片源：优先使用base64缩略图
    getAttachSrc(att) {
      if (att.thumbnailBase64 && att.thumbnailBase64.startsWith('data:')) return att.thumbnailBase64
      const path = att.filePath || ''
      if (!path) return ''
      if (path.startsWith('http://') || path.startsWith('https://')) return path
      if (path.startsWith('/profile')) return this.baseUrl + path
      return this.baseUrl + '/profile' + path
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding-bottom: 140rpx;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.detail-card {
  margin: 20rpx 24rpx;
}

/* 状态横幅 */
.status-banner {
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  margin-bottom: 20rpx;
  &.banner-supplement { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
  &.banner-pending { background: linear-gradient(135deg, #f3a044, #e07e1c); }
  &.banner-approved { background: linear-gradient(135deg, #18bc37, #0fad2e); }
  &.banner-rejected { background: linear-gradient(135deg, #e43d33, #c62828); }
  &.banner-forward { background: linear-gradient(135deg, #2979ff, #1a5cd8); }
}

.banner-text {
  font-size: 34rpx;
  font-weight: bold;
  color: #fff;
}

/* 信息区块 */
.info-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.title-icon {
  font-size: 32rpx;
}

.title-text {
  flex: 1;
}

.attach-count {
  font-size: 22rpx;
  color: #999;
  font-weight: normal;
}

.banner-icon {
  font-size: 56rpx;
  margin-bottom: 8rpx;
}

.banner-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 8rpx;
  display: block;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-cell {
  width: 50%;
  margin-bottom: 16rpx;
}

.info-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  &.highlight { color: #e43d33; font-weight: bold; }
  &.return-not_returned { color: #999; }
  &.return-returned { color: #18bc37; }
  &.return-overdue { color: #e43d33; font-weight: bold; }
  &.return-late_returned { color: #e43d33; font-weight: bold; }
}

/* 时间轴 */
.timeline {
  display: flex;
  align-items: center;
  padding: 24rpx 16rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.timeline-node {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  flex: 1;
}

.node-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-top: 8rpx;
  flex-shrink: 0;
  &.start { background: #e43d33; }
  &.end { background: #18bc37; }
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.node-label {
  font-size: 22rpx;
  color: #999;
}

.node-time {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.timeline-line {
  width: 60rpx;
  height: 2rpx;
  background: linear-gradient(90deg, #e43d33, #18bc37);
  margin: 0 16rpx;
}

/* 事由/审批意见 */
.reason-box {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}

.reason-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.reason-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}

/* 查课请假补充 */
.supplement-owner-tip {
  padding: 20rpx;
  border-radius: 10rpx;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 24rpx;
  text-align: center;
}

.supplement-form {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.form-label {
  color: #64748b;
  font-size: 22rpx;
}

.form-picker,
.form-input,
.form-textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1rpx solid #dbe3ec;
  border-radius: 8rpx;
  background: #f8fafc;
  color: #1e293b;
  font-size: 26rpx;
}

.form-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72rpx;
  padding: 0 20rpx;
}

.form-picker.compact {
  justify-content: center;
}

.form-placeholder {
  color: #94a3b8;
}

.form-arrow {
  color: #94a3b8;
  font-size: 34rpx;
}

.form-input {
  height: 72rpx;
  padding: 0 20rpx;
}

.form-textarea {
  min-height: 140rpx;
  padding: 18rpx 20rpx;
  line-height: 1.5;
}

.datetime-row {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.85fr);
  gap: 12rpx;
}

.contact-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid #dbeafe;
  border-radius: 8rpx;
  background: #f8fbff;
}

.contact-confirm-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5rpx;
}

.contact-confirm-title {
  color: #1e293b;
  font-size: 25rpx;
  font-weight: 600;
}

.contact-confirm-sub {
  color: #64748b;
  font-size: 21rpx;
}

.supplement-submit {
  margin-top: 2rpx;
  border-radius: 8rpx;
  background: #2563eb;
  color: #fff;
  font-size: 27rpx;
  font-weight: 600;
}

/* 附件缩略图 */
.attach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.attach-thumb-wrap {
  width: 160rpx;
  height: 160rpx;
}

.attach-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
}

/* 审批操作栏 */
.approval-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 40rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.approval-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  &.approve { background: #18bc37; color: #fff; }
  &.reject { background: #e43d33; color: #fff; }
  &.forward { background: #2979ff; color: #fff; }
  &.close { background: #f5f6f7; color: #666; }
}

/* 返回按钮栏 */
.back-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 40rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.bar-row { display: flex; gap: 16rpx; }

.return-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
  background: #18bc37;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

.back-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
  background: #f5f6f7;
  color: #666;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
