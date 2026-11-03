<template>
  <view class="page-container">
    <!-- 学年选择 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">班主任工作证明</text>
        <text class="section-desc">学院审核通过后生成</text>
      </view>
      <view class="year-picker">
        <text class="year-label">选择学年：</text>
        <picker mode="selector" :range="yearOptions" :value="yearIndex" @change="onYearChange">
          <view class="year-value">{{ yearOptions[yearIndex] }} 学年</view>
        </picker>
      </view>
    </view>

    <!-- 申请状态 -->
    <view class="section" v-if="certStatus !== null">
      <view v-if="certStatus === 'checking'" class="status-card">
        <text class="status-text">正在核对任职记录...</text>
      </view>

      <view v-else-if="certStatus === 'approved'" class="status-card success">
        <view class="status-icon">
          <uni-icons type="checkmarkempty" size="40" color="#18bc37"></uni-icons>
        </view>
        <text class="status-title">证明已出具</text>
        <text class="status-desc">学院审核通过：{{ currentApply.reviewTime || currentApply.updateTime }}</text>
        <view class="btn-group">
          <button class="btn-primary" @click="downloadCurrentPdf">下载正式PDF</button>
        </view>
      </view>

      <view v-else-if="certStatus === 'pending'" class="status-card">
        <view class="status-icon">
          <uni-icons type="calendar" size="40" color="#f3a044"></uni-icons>
        </view>
        <text class="status-title">学院审核中</text>
        <text class="status-desc">提交时间：{{ currentApply.createTime }}</text>
        <view class="btn-group" v-if="currentApply.draftPdfPath">
          <button class="btn-secondary" @click="downloadDraft(currentApply)">查看审批草稿</button>
        </view>
      </view>

      <view v-else-if="certStatus === 'rejected'" class="status-card danger">
        <view class="status-icon">
          <uni-icons type="closeempty" size="40" color="#e43d33"></uni-icons>
        </view>
        <text class="status-title">申请已驳回</text>
        <text class="status-desc">{{ currentApply.reviewRemark || '学院驳回了本次申请' }}</text>
        <view class="btn-group">
          <button class="btn-primary" @click="openApply" :loading="applying">重新申请</button>
        </view>
      </view>

      <view v-else-if="certStatus === 'eligible'" class="status-card">
        <view class="status-icon">
          <uni-icons type="info" size="40" color="#2979ff"></uni-icons>
        </view>
        <text class="status-title">可申请工作证明</text>
        <text class="status-desc">系统已核定您在 {{ currentYear }} 学年有 {{ assignmentCount }} 段班主任任职记录。</text>
        <view class="warn-box">
          <uni-icons type="warning" size="16" color="#f3a044"></uni-icons>
          <text class="warn-text">提交后将送学院审核，审核通过前暂不能出具正式证明。</text>
        </view>
        <view class="btn-group">
          <button class="btn-primary" @click="openApply" :loading="applying">申请工作证明</button>
        </view>
      </view>

      <view v-else-if="certStatus === 'ineligible'" class="status-card">
        <view class="status-icon">
          <uni-icons type="closeempty" size="40" color="#e43d33"></uni-icons>
        </view>
        <text class="status-title">暂不能申请</text>
        <text class="status-desc">{{ checkReason || '在 ' + currentYear + ' 学年内没有班主任任职记录。' }}</text>
      </view>
    </view>

    <!-- 我的申请 -->
    <view class="section" v-if="certList.length > 0">
      <view class="section-header">
        <text class="section-title">我的申请</text>
        <text class="section-count">共{{ certList.length }}份</text>
      </view>
      <view class="cert-item" v-for="item in certList" :key="item.id" @click="showDetail(item)">
        <view class="cert-info">
          <text class="cert-year">{{ item.certYear }} 学年 · {{ statusText(item.status) }}</text>
          <text class="cert-time">提交于 {{ shortTime(item.createTime) }}</text>
          <text class="cert-college" v-if="item.collegeName">{{ item.collegeName }}</text>
        </view>
        <view class="cert-actions">
          <button class="btn-small" @click.stop="downloadItem(item)">
            {{ item.certificatePdfPath ? '正式' : item.draftPdfPath ? '草稿' : '详情' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 申请理由 -->
    <view v-if="applyVisible" class="apply-mask">
      <view class="apply-panel">
        <text class="apply-title">申请班主任工作证明</text>
        <textarea class="apply-textarea" v-model="applyReason" maxlength="500"
                  placeholder="因工作需要，申请开具班主任工作证明。" />
        <view class="apply-btns">
          <button class="btn-plain" @click="applyVisible = false">取消</button>
          <button class="btn-primary small" @click="submitApply" :loading="applying">提交申请</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMyCertificates, checkCertificate, applyCertificate } from '@/api/affair/headteacher'
import config from '@/config'

export default {
  data() {
    const currentYear = this.getCurrentCertYear()
    const yearOptions = this.generateYearOptions()
    return {
      yearOptions,
      yearIndex: Math.max(0, yearOptions.indexOf(currentYear)),
      currentYear: currentYear,
      certStatus: null,
      currentApply: null,
      checkReason: '',
      content: null,
      certList: [],
      applying: false,
      applyVisible: false,
      applyReason: '因工作需要，申请开具班主任工作证明。'
    }
  },
  computed: {
    assignmentCount() {
      return this.content && this.content.assignments ? this.content.assignments.length : 0
    }
  },
  onShow() {
    this.loadCertList()
    this.checkCert()
  },
  methods: {
    getCurrentCertYear() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      // 9月及之后属于下一学年
      if (month >= 9) {
        return year + '-' + (year + 1)
      } else {
        return (year - 1) + '-' + year
      }
    },
    generateYearOptions() {
      const options = []
      const now = new Date()
      const currentYear = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1
      for (let y = currentYear; y >= currentYear - 5; y--) {
        options.push(y + '-' + (y + 1))
      }
      return options
    },
    onYearChange(e) {
      this.yearIndex = e.detail.value
      this.currentYear = this.yearOptions[this.yearIndex]
      this.checkCert()
    },
    loadCertList() {
      getMyCertificates().then(res => {
        this.certList = res.data || []
      }).catch(() => {})
    },
    checkCert() {
      this.certStatus = 'checking'
      checkCertificate(this.currentYear).then(res => {
        const data = res.data
        this.currentApply = data.application || null
        this.content = data.content || null
        this.checkReason = data.reason || ''
        this.certStatus = this.resolveStatus(data)
      }).catch(() => {
        this.certStatus = 'ineligible'
      })
    },
    resolveStatus(data) {
      if (data.certificate && data.certificate.pdfPath) return 'approved'
      if (data.application && data.application.status === '0') return 'pending'
      if (data.application && data.application.status === '1' && data.application.certificatePdfPath) return 'approved'
      if (data.application && data.application.status === '2') return 'rejected'
      if (data.eligible) return 'eligible'
      return 'ineligible'
    },
    openApply() {
      this.applyReason = '因工作需要，申请开具班主任工作证明。'
      this.applyVisible = true
    },
    submitApply() {
      this.applying = true
      applyCertificate(this.currentYear, { applyReason: this.applyReason }).then(() => {
        uni.showToast({ title: '已提交审核', icon: 'success' })
        this.applyVisible = false
        this.checkCert()
        this.loadCertList()
      }).catch(err => {
        uni.showToast({ title: err.message || '提交失败', icon: 'none' })
      }).finally(() => {
        this.applying = false
      })
    },
    downloadCurrentPdf() {
      if (this.currentApply && this.currentApply.certificatePdfPath) {
        this.doDownload(this.currentApply.certificatePdfPath)
      }
    },
    downloadDraft(item) {
      if (item && item.draftPdfPath) {
        this.doDownload(item.draftPdfPath)
      }
    },
    downloadItem(item) {
      if (item && item.certificatePdfPath) {
        this.doDownload(item.certificatePdfPath)
      } else if (item && item.draftPdfPath) {
        this.doDownload(item.draftPdfPath)
      }
    },
    showDetail(item) {
      const reviewLine = item.status === '2' && item.reviewRemark
        ? '\n审核意见：' + item.reviewRemark
        : item.status === '0'
          ? '\n请等待学院审核。'
          : ''
      uni.showModal({
        title: item.certYear + '学年证明',
        content: (item.applyReason || '申请工作证明') + reviewLine,
        showCancel: false
      })
    },
    statusText(status) {
      return { '0': '学院审核中', '1': '已通过', '2': '已驳回', '3': '已撤回' }[status] || '已提交'
    },
    shortTime(value) {
      return value ? String(value).substring(0, 10).replace('T', ' ') : ''
    },
    doDownload(pdfPath) {
      const url = config.baseUrl + pdfPath
      // #ifdef MP-WEIXIN
      uni.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.openDocument({
              filePath: res.tempFilePath,
              fileType: 'pdf',
              showMenu: true,
              success: () => {},
              fail: () => {
                uni.showToast({ title: '打开文件失败', icon: 'none' })
              }
            })
          } else {
            uni.showToast({ title: '下载失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '下载失败', icon: 'none' })
        }
      })
      // #endif
      // #ifdef H5
      window.open(url, '_blank')
      // #endif
      // #ifdef APP-PLUS
      uni.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.openDocument({
              filePath: res.tempFilePath,
              fileType: 'pdf',
              showMenu: true
            })
          }
        }
      })
      // #endif
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 20rpx;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-desc {
  font-size: 22rpx;
  color: #8a94a6;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.section-count {
  font-size: 24rpx;
  color: #999;
}

.year-picker {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}

.year-label {
  font-size: 28rpx;
  color: #666;
}

.year-value {
  font-size: 28rpx;
  color: #2979ff;
  font-weight: 500;
  padding: 8rpx 20rpx;
  background: #f0f7ff;
  border-radius: 8rpx;
}

.status-card {
  text-align: center;
  padding: 30rpx 0;

  &.success {
    background: #f8fff8;
    border-radius: 12rpx;
  }

  &.danger {
    background: #fff8f7;
    border-radius: 12rpx;
  }
}

.status-icon {
  margin-bottom: 16rpx;
}

.status-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.status-desc {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.status-locked {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 20rpx;
}

.warn-box {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  background: #fef3e2;
  border-radius: 8rpx;
  padding: 16rpx;
  margin: 20rpx 0;
}

.warn-text {
  font-size: 24rpx;
  color: #f3a044;
  flex: 1;
}

.btn-group {
  margin-top: 20rpx;
}

.btn-primary {
  background: #2979ff;
  color: #fff;
  font-size: 28rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
}

.btn-secondary {
  background: #eef4ff;
  color: #2979ff;
  font-size: 28rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
}

.btn-primary.small {
  height: 72rpx;
  line-height: 72rpx;
}

.cert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.cert-info {
  flex: 1;
}

.cert-year {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
}

.cert-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

.cert-college {
  font-size: 22rpx;
  color: #666;
  margin-top: 4rpx;
  display: block;
}

.cert-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.cert-locked {
  font-size: 22rpx;
  color: #999;
  background: #f5f5f5;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}

.btn-small {
  font-size: 24rpx;
  color: #2979ff;
  background: #f0f7ff;
  border-radius: 8rpx;
  padding: 8rpx 24rpx;
  line-height: 1.5;
  margin: 0;
  border: none;
}

.apply-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(0, 0, 0, .45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.apply-panel {
  width: 100%;
  background: #fff;
  border-radius: 18rpx;
  padding: 32rpx;
}

.apply-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.apply-textarea {
  width: 100%;
  min-height: 180rpx;
  padding: 20rpx;
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  color: #333;
}

.apply-btns {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 24rpx;
}

.btn-plain {
  background: #f3f4f6;
  color: #4b5563;
  font-size: 26rpx;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
}
</style>
