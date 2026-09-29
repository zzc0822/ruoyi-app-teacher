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
        <text class="banner-sub" v-if="detail.approvalLevel === 'secretary'">超过3天，需上级审批</text>
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

      <!-- 审批信息 -->
      <view class="info-section" v-if="detail.approvalStatus !== 'pending'">
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
import { getLeave, approvalLeave, returnLeave } from '@/api/work/leave'
import config from '@/config'

export default {
  data() {
    return {
      id: null,
      detail: null,
      baseUrl: config.baseUrl
    }
  },
  computed: {
    statusIcon() {
      if (!this.detail || !this.detail.approvalStatus) return '❓'
      const map = { pending: '⏳', approved: '✓', rejected: '✕', forward: '↑' }
      return map[this.detail.approvalStatus] || '❓'
    },
    canReturn() {
      return this.detail && this.detail.approvalStatus === 'approved' && this.detail.returnStatus !== 'returned'
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadDetail()
  },
  methods: {
    loadDetail() {
      getLeave(this.id).then(res => {
        this.detail = res.data || res
      }).catch(() => {
        uni.showToast({ title: '加载失败', icon: 'none' })
      })
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
      const map = { pending: '待审批', approved: '已批准', rejected: '已拒绝', forward: '转上级审批' }
      return map[val] || val || '未知'
    },
    formatLeaveType(val) {
      const map = { sick: '病假', personal: '事假', other: '其他' }
      return map[val] || val || '未知'
    },
    formatReturnStatus(val) {
      const map = { not_returned: '未销假', returned: '已销假', overdue: '逾期未归' }
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
      const map = { not_returned: '未销假', returned: '已销假', overdue: '逾期未归' }
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
