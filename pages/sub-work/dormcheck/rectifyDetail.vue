<template>
  <view class="rectify-detail-page">
    <!-- 问题与要求 -->
    <view class="head-card">
      <view class="head-row">
        <text class="room-name">{{ roomText }}</text>
        <text class="status-tag" :class="'st-' + statusKey">{{ statusText }}</text>
      </view>
      <view class="meta-row">
        <text class="meta-item">{{ fmtDate(detail.checkDate) }} · {{ detail.taskName || checkTypeText }}</text>
        <text class="meta-item" v-if="detail.deductScore">扣 {{ detail.deductScore }} 分</text>
      </view>
      <view class="problem-box">
        <text class="box-label">问题描述</text>
        <text class="box-text">{{ detail.problemDesc || '-' }}</text>
      </view>
      <view class="problem-box" v-if="detail.requireDesc">
        <text class="box-label">整改要求</text>
        <text class="box-text require">{{ detail.requireDesc }}</text>
      </view>
      <view class="info-grid">
        <view class="ig-cell">
          <text class="ig-label">整改时限</text>
          <text class="ig-value">{{ fmtDate(detail.deadline) }}</text>
        </view>
        <view class="ig-cell">
          <text class="ig-label">责任人</text>
          <text class="ig-value">{{ detail.ownerName || '-' }}</text>
        </view>
        <view class="ig-cell">
          <text class="ig-label">辅导员</text>
          <text class="ig-value">{{ detail.counselorName || '-' }}</text>
        </view>
        <view class="ig-cell">
          <text class="ig-label">已延期</text>
          <text class="ig-value">{{ detail.delayCount || 0 }} 次</text>
        </view>
      </view>
    </view>

    <!-- 扣分现场照片 -->
    <view class="section-card" v-if="detail.deductionList && detail.deductionList.length">
      <view class="section-title">检查现场</view>
      <view class="deduct-item" v-for="d in detail.deductionList" :key="d.deductionId">
        <view class="deduct-head">
          <text class="deduct-name">{{ d.itemName }}</text>
          <text class="deduct-score">-{{ d.deductScore }}</text>
        </view>
        <text class="deduct-desc" v-if="d.description">{{ d.description }}</text>
        <text class="deduct-stu" v-if="d.involveNames">涉及：{{ d.involveNames }}</text>
        <view class="photo-grid" v-if="photosOf(d).length">
          <image v-for="(url, idx) in photosOf(d)" :key="'d' + idx" :src="url" class="photo-thumb"
                 mode="aspectFill" @click="preview(photosOf(d), idx)" />
        </view>
      </view>
    </view>

    <!-- 学生提交的整改照片 -->
    <view class="section-card" v-if="submitPhotos.length">
      <view class="section-title">整改后照片</view>
      <view class="photo-grid">
        <image v-for="(url, idx) in submitPhotos" :key="'s' + idx" :src="url" class="photo-thumb"
               mode="aspectFill" @click="preview(submitPhotos, idx)" />
      </view>
      <view class="submit-desc" v-if="detail.submitDesc">
        <text class="box-label">整改说明</text>
        <text class="box-text">{{ detail.submitDesc }}</text>
      </view>
      <view class="submit-time" v-if="detail.submitTime">
        <text>{{ fmtDateTime(detail.submitTime) }} · {{ detail.submitBy }}</text>
      </view>
    </view>

    <!-- 过程时间线 -->
    <view class="section-card" v-if="detail.logList && detail.logList.length">
      <view class="section-title">整改过程</view>
      <view class="log-item" v-for="log in detail.logList" :key="log.logId">
        <view class="log-head">
          <text class="log-action">{{ actionText(log.action) }}</text>
          <text class="log-time">{{ fmtDateTime(log.opTime) }}</text>
        </view>
        <text class="log-content" v-if="log.content">{{ log.content }}</text>
        <text class="log-operator" v-if="log.operator">{{ log.operator }}</text>
      </view>
    </view>

    <!-- 复核操作：只有待复核/已打回状态给按钮 -->
    <view class="recheck-card" v-if="canRecheck">
      <view class="section-title">现场复核</view>
      <textarea class="recheck-input" v-model="recheckDesc" placeholder="复核意见（打回时必填，写清还要改哪里）" maxlength="500" />
      <view class="recheck-btns">
        <view class="btn-reject" @click="doRecheck(false)"><text>打回重改</text></view>
        <view class="btn-pass" @click="doRecheck(true)"><text>复核通过</text></view>
      </view>
    </view>
    <view class="done-tip" v-else-if="statusKey === 'passed' || statusKey === 'closed'">
      <text>本单已归档，无需复核</text>
    </view>
    <view class="done-tip" v-else>
      <text>学生还没提交整改，暂不能复核</text>
    </view>
  </view>
</template>

<script>
import { getRectify, recheckRectify } from '@/api/work/dormcheck'
import { resolveImg } from '@/utils/image'

export default {
  data() {
    return {
      rectifyId: null,
      detail: {},
      recheckDesc: '',
      submitting: false
    }
  },
  computed: {
    statusKey() {
      return this.detail.statusEffective || this.detail.status || ''
    },
    statusText() {
      const map = {
        pending: '待整改',
        submitted: '待复核',
        rejected: '复核打回',
        overdue: '已逾期',
        passed: '整改通过',
        closed: '已关闭'
      }
      return map[this.statusKey] || this.statusKey || '-'
    },
    canRecheck() {
      return ['submitted', 'rejected', 'overdue'].indexOf(this.statusKey) > -1
    },
    roomText() {
      const building = this.detail.buildingName || this.detail.apartmentName || ''
      return building ? building + ' ' + (this.detail.roomNo || '') : (this.detail.roomNo || '未知宿舍')
    },
    checkTypeText() {
      const map = { periodic: '定期检查', spot: '辅导员抽查', self: '自查' }
      return map[this.detail.checkType] || this.detail.checkType || ''
    },
    submitPhotos() {
      return (this.detail.attachmentList || [])
        .map(a => resolveImg(a.filePath))
        .filter(u => u)
    },
    actionTextMap() {
      return {
        create: '下达整改',
        submit: '提交整改',
        recheck_pass: '复核通过',
        recheck_reject: '复核打回',
        delay: '延长时限',
        close: '关闭',
        photo: '补充照片'
      }
    }
  },
  onLoad(options) {
    if (options && options.rectifyId) {
      this.rectifyId = options.rectifyId
      this.loadDetail()
    }
  },
  methods: {
    loadDetail() {
      getRectify(this.rectifyId).then(res => {
        if (res.code === 200) this.detail = res.data || {}
      }).catch(() => {})
    },
    photosOf(node) {
      if (node.attachmentList && node.attachmentList.length) {
        return node.attachmentList.map(a => resolveImg(a.filePath)).filter(u => u)
      }
      if (node.attachmentUrls && node.attachmentUrls.length) {
        return node.attachmentUrls.map(resolveImg).filter(u => u)
      }
      return []
    },
    preview(urls, idx) {
      uni.previewImage({ current: urls[idx], urls })
    },
    actionText(action) {
      return this.actionTextMap[action] || action || '操作'
    },
    fmtDate(value) { return value ? String(value).substring(0, 10) : '-' },
    fmtDateTime(value) { return value ? String(value).substring(0, 16) : '-' },
    doRecheck(pass) {
      if (!pass && !this.recheckDesc) {
        uni.showToast({ title: '打回要写清还改哪里', icon: 'none' })
        return
      }
      if (this.submitting) return
      this.submitting = true
      recheckRectify({
        rectifyId: Number(this.rectifyId),
        pass: pass,
        desc: this.recheckDesc
      }).then(res => {
        this.submitting = false
        if (res.code === 200) {
          uni.showToast({ title: res.msg || '已复核', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 700)
        } else {
          uni.showToast({ title: res.msg || '复核失败', icon: 'none' })
        }
      }).catch(() => {
        this.submitting = false
        uni.showToast({ title: '复核失败', icon: 'none' })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.rectify-detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 20rpx 20rpx 40rpx;
}
.head-card, .section-card, .recheck-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.head-row { display: flex; align-items: center; }
.room-name { font-size: 32rpx; font-weight: 600; color: #333; }
.status-tag {
  margin-left: auto;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: #f5f5f5;
  color: #666;
}
.st-pending { background: #fff3e0; color: #ff9800; }
.st-submitted { background: #e3f2fd; color: #2196f3; }
.st-rejected, .st-overdue { background: #ffebee; color: #f44336; }
.st-passed { background: #e8f5e9; color: #4caf50; }
.st-closed { background: #f0f0f0; color: #999; }
.meta-row { margin-top: 8rpx; }
.meta-item { font-size: 22rpx; color: #999; margin-right: 16rpx; }
.problem-box { margin-top: 16rpx; }
.box-label { display: block; font-size: 22rpx; color: #999; margin-bottom: 6rpx; }
.box-text { font-size: 26rpx; color: #333; }
.box-text.require { color: #667eea; }
.info-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #f0f0f0;
}
.ig-cell { width: 25%; }
.ig-label { display: block; font-size: 22rpx; color: #999; }
.ig-value { display: block; font-size: 26rpx; color: #333; margin-top: 4rpx; }
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 14rpx;
}
.deduct-item {
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f7f7f7;
}
.deduct-item:last-child { border-bottom: none; }
.deduct-head { display: flex; align-items: baseline; }
.deduct-name { font-size: 26rpx; color: #333; }
.deduct-score { margin-left: auto; font-size: 26rpx; color: #f44336; font-weight: 500; }
.deduct-desc { display: block; font-size: 24rpx; color: #666; margin-top: 6rpx; }
.deduct-stu { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.photo-grid { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.photo-thumb {
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  background: #f2f3f5;
}
.submit-desc { margin-top: 16rpx; }
.submit-time { font-size: 22rpx; color: #999; margin-top: 10rpx; }
.log-item {
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f7f7f7;
}
.log-item:last-child { border-bottom: none; }
.log-head { display: flex; align-items: baseline; }
.log-action { font-size: 26rpx; color: #333; font-weight: 500; }
.log-time { margin-left: auto; font-size: 22rpx; color: #bbb; }
.log-content { display: block; font-size: 24rpx; color: #666; margin-top: 6rpx; }
.log-operator { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.recheck-input {
  width: 100%;
  height: 140rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  padding: 16rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
}
.recheck-btns { display: flex; gap: 16rpx; margin-top: 18rpx; }
.btn-reject, .btn-pass {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  font-size: 28rpx;
}
.btn-reject { border: 1rpx solid #f44336; color: #f44336; }
.btn-pass {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
.done-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}
</style>
