<template>
  <view class="page-container">
    <!-- 学年选择 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">班主任工作证明</text>
      </view>
      <view class="year-picker">
        <text class="year-label">选择学年：</text>
        <picker mode="selector" :range="yearOptions" :value="yearIndex" @change="onYearChange">
          <view class="year-value">{{ yearOptions[yearIndex] }} 学年</view>
        </picker>
      </view>
    </view>

    <!-- 证书状态 -->
    <view class="section" v-if="certStatus !== null">
      <!-- 未检查 -->
      <view v-if="certStatus === 'checking'" class="status-card">
        <text class="status-text">正在检查资格...</text>
      </view>

      <!-- 已生成（已锁定） -->
      <view v-else-if="certStatus === 'generated'" class="status-card success">
        <view class="status-icon">
          <uni-icons type="checkmarkempty" size="40" color="#18bc37"></uni-icons>
        </view>
        <text class="status-title">证明已生成</text>
        <text class="status-desc">生成时间：{{ certificate.generateTime }}</text>
        <text class="status-locked">该证明已锁定，不可修改</text>
        <view class="btn-group">
          <button class="btn-primary" @click="downloadPdf">下载PDF</button>
        </view>
      </view>

      <!-- 满足条件，可生成 -->
      <view v-else-if="certStatus === 'eligible'" class="status-card">
        <view class="status-icon">
          <uni-icons type="info" size="40" color="#2979ff"></uni-icons>
        </view>
        <text class="status-title">可以生成工作证明</text>
        <text class="status-desc">您在 {{ currentYear }} 学年有班主任任职记录，可以生成工作证明。</text>
        <view class="warn-box">
          <uni-icons type="warning" size="16" color="#f3a044"></uni-icons>
          <text class="warn-text">证明一旦生成将不可修改，请确认信息无误后再生成。</text>
        </view>
        <view class="btn-group">
          <button class="btn-primary" @click="doGenerate" :loading="generating">生成证明</button>
        </view>
      </view>

      <!-- 不满足条件 -->
      <view v-else-if="certStatus === 'ineligible'" class="status-card">
        <view class="status-icon">
          <uni-icons type="closeempty" size="40" color="#e43d33"></uni-icons>
        </view>
        <text class="status-title">暂不满足生成条件</text>
        <text class="status-desc">在 {{ currentYear }} 学年内没有班主任任职记录。</text>
      </view>
    </view>

    <!-- 已生成的证明列表 -->
    <view class="section" v-if="certList.length > 0">
      <view class="section-header">
        <text class="section-title">我的证明</text>
        <text class="section-count">共{{ certList.length }}份</text>
      </view>
      <view class="cert-item" v-for="(item, idx) in certList" :key="idx">
        <view class="cert-info">
          <text class="cert-year">{{ item.certYear }} 学年</text>
          <text class="cert-time">生成于 {{ item.generateTime }}</text>
          <text class="cert-college" v-if="item.collegeName">{{ item.collegeName }}</text>
        </view>
        <view class="cert-actions">
          <text class="cert-locked">已锁定</text>
          <button class="btn-small" @click="downloadCertPdf(item)">下载</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMyCertificates, checkCertificate, generateCertificate } from '@/api/affair/headteacher'
import config from '@/config'

export default {
  data() {
    const currentYear = this.getCurrentCertYear()
    return {
      yearOptions: this.generateYearOptions(),
      yearIndex: 0,
      currentYear: currentYear,
      certStatus: null, // null, 'checking', 'generated', 'eligible', 'ineligible'
      certificate: null,
      certList: [],
      generating: false
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
      const currentYear = new Date().getFullYear()
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
        if (data.generated) {
          this.certStatus = 'generated'
          this.certificate = data.certificate
        } else if (data.eligible) {
          this.certStatus = 'eligible'
        } else {
          this.certStatus = 'ineligible'
        }
      }).catch(() => {
        this.certStatus = 'ineligible'
      })
    },
    doGenerate() {
      uni.showModal({
        title: '确认生成',
        content: '证明一旦生成后不可修改，确定要生成 ' + this.currentYear + ' 学年的班主任工作证明吗？',
        success: (res) => {
          if (res.confirm) {
            this.generating = true
            generateCertificate(this.currentYear).then(res => {
              this.generating = false
              uni.showToast({ title: '生成成功', icon: 'success' })
              this.certificate = res.data
              this.certStatus = 'generated'
              this.loadCertList()
            }).catch(err => {
              this.generating = false
              uni.showToast({ title: err.message || '生成失败', icon: 'none' })
            })
          }
        }
      })
    },
    downloadPdf() {
      if (this.certificate && this.certificate.pdfPath) {
        this.doDownload(this.certificate.pdfPath)
      }
    },
    downloadCertPdf(item) {
      if (item.pdfPath) {
        this.doDownload(item.pdfPath)
      }
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
</style>
