<template>
  <view class="issue-detail-page">
    <view class="head-card">
      <view class="head-top">
        <view class="head-room">
          <text class="room-no">{{ detail.roomNo || '—' }}</text>
          <text class="room-loc">{{ detail.buildingName }}{{ detail.floorNo ? ' · ' + detail.floorNo + 'F' : '' }}</text>
        </view>
        <text class="status-tag" :class="'st-' + detail.status">{{ statusText(detail.status) }}</text>
      </view>
      <text class="issue-title">{{ detail.title || '—' }}</text>
      <view class="meta-row">
        <text class="sev-tag" :class="'sev-' + detail.severity">{{ severityLabel(detail.severity) }}</text>
        <text class="meta-text">{{ typeLabel(detail.issueType) }}</text>
        <text class="meta-text" v-if="detail.relatedName">关联 {{ detail.relatedName }}</text>
        <text class="meta-text">{{ fmtDate(detail.reportTime) }}</text>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">现场描述</view>
      <text class="desc-text">{{ detail.description || '未填写' }}</text>
      <view class="photo-grid" v-if="detailPhotos.length">
        <image v-for="(p, pi) in detailPhotos" :key="pi" :src="p" mode="aspectFill" class="photo-thumb"
               @click="preview(detailPhotos, pi)" />
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">登记与处理</view>
      <view class="info-row">
        <text class="info-label">登记人</text>
        <text class="info-value">{{ detail.reporterName || '—' }} · {{ fmtDateTime(detail.reportTime) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">处理人</text>
        <text class="info-value">{{ detail.handlerName || '尚未处理' }}<text v-if="detail.handleTime"> · {{ fmtDateTime(detail.handleTime) }}</text></text>
      </view>
      <view class="handle-desc" v-if="detail.handleDesc">
        <text class="handle-label">处理结果</text>
        <text class="handle-text">{{ detail.handleDesc }}</text>
      </view>
    </view>

    <view class="section-card" v-if="canHandle">
      <view class="section-title">跟进处理</view>
      <view class="status-row">
        <text class="status-opt" v-for="s in statusOptions" :key="s.value" :class="{ active: form.status === s.value }"
              @click="form.status = s.value">{{ s.label }}</text>
      </view>
      <textarea v-model="form.handleDesc" class="handle-input" maxlength="1000"
                placeholder="写清联系了谁、什么时候处理、结果如何；标记已解决时必填" />
      <view class="photo-row">
        <view class="photo-thumb" v-for="(p, pi) in form.photos" :key="pi">
          <image :src="resolveImg(p)" mode="aspectFill" class="photo-img" @click="preview(form.photos, pi)" />
          <text class="photo-del" @click="removePhoto(pi)">×</text>
        </view>
        <view class="photo-add" @click="choosePhoto" v-if="form.photos.length < 6">
          <uni-icons type="camera" size="20" color="#94a3b8" />
          <text class="photo-add-text">补充照片</text>
        </view>
      </view>
      <view class="save-btn" :class="{ saving }" @click="save">{{ saving ? '保存中...' : '保存处理结果' }}</view>
    </view>
  </view>
</template>

<script>
import { getDormIssue, updateDormIssue } from '@/api/work/dormcheck'
import { uploadFileTo } from '@/utils/upload'
import { resolveImg } from '@/utils/image'

export default {
  data() {
    return {
      issueId: null,
      detail: {},
      form: {
        status: 'processing',
        handleDesc: '',
        photos: []
      },
      saving: false,
      statusOptions: [
        { value: 'processing', label: '处理中' },
        { value: 'resolved', label: '已解决' },
        { value: 'closed', label: '已关闭' }
      ]
    }
  },
  computed: {
    detailPhotos() {
      return (this.detail.attachmentList || []).map(a => resolveImg(a.filePath)).filter(u => !!u)
    },
    canHandle() {
      return this.detail.status !== 'closed'
    }
  },
  onLoad(options) {
    this.issueId = options && options.issueId ? Number(options.issueId) : null
    if (this.issueId) this.loadDetail()
  },
  methods: {
    loadDetail() {
      getDormIssue(this.issueId).then(res => {
        if (res.code === 200) {
          this.detail = res.data || {}
          this.form.status = this.detail.status === 'open' ? 'processing' : this.detail.status
          this.form.handleDesc = this.detail.handleDesc || ''
          this.form.photos = (this.detail.attachmentList || []).map(a => a.filePath).filter(p => !!p)
        }
      }).catch(() => {})
    },
    statusText(value) {
      return { open: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' }[value] || value || '待处理'
    },
    severityLabel(value) {
      return { low: '一般', medium: '关注', high: '紧急' }[value] || '一般'
    },
    typeLabel(value) {
      return { facility: '设施故障', safety: '安全隐患', discipline: '违纪苗头', conflict: '宿舍矛盾', hygiene: '卫生问题', psych: '心理关注', other: '其他' }[value] || value || '其他'
    },
    fmtDate(value) {
      return value ? String(value).substring(0, 10) : '—'
    },
    fmtDateTime(value) {
      return value ? String(value).substring(0, 16) : '—'
    },
    choosePhoto() {
      const remain = 6 - this.form.photos.length
      if (remain <= 0) return
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: res => {
          const files = res.tempFilePaths || []
          if (!files.length) return
          uni.showLoading({ title: '上传中' })
          Promise.all(files.map(path => uploadFileTo('/api/teacher/dorm/issue/upload/image', path, null, { timeout: 30000 })))
            .then(list => {
              list.forEach(r => {
                if (r && r.url) this.form.photos.push(r.url)
              })
              uni.hideLoading()
            })
            .catch(() => {
              uni.hideLoading()
              uni.showToast({ title: '照片上传失败', icon: 'none' })
            })
        }
      })
    },
    removePhoto(index) {
      this.form.photos.splice(index, 1)
    },
    preview(list, index) {
      const urls = list.map(resolveImg)
      uni.previewImage({ current: urls[index], urls })
    },
    save() {
      if (this.saving) return
      if (this.form.status === 'resolved' && !String(this.form.handleDesc || '').trim()) {
        uni.showToast({ title: '标记已解决时请填写处理结果', icon: 'none' })
        return
      }
      this.saving = true
      uni.showLoading({ title: '保存中' })
      updateDormIssue({
        issueId: this.issueId,
        status: this.form.status,
        handleDesc: this.form.handleDesc,
        attachmentUrls: this.form.photos
      }).then(res => {
        uni.hideLoading()
        this.saving = false
        if (res.code === 200) {
          uni.showToast({ title: '已保存', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 600)
        } else {
          uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
        }
      }).catch(() => {
        uni.hideLoading()
        this.saving = false
        uni.showToast({ title: '保存失败', icon: 'none' })
      })
    },
    resolveImg
  }
}
</script>

<style lang="scss" scoped>
.issue-detail-page { min-height: 100vh; background: #f4f6fa; padding: 24rpx 24rpx 60rpx; }
.head-card, .section-card { padding: 22rpx; background: #fff; border: 1rpx solid #e2e8f0; border-radius: 14rpx; }
.section-card { margin-top: 14rpx; }
.head-top { display: flex; align-items: flex-start; justify-content: space-between; }
.room-no { display: block; font-size: 38rpx; font-weight: 700; color: #1e293b; line-height: 48rpx; }
.room-loc { display: block; font-size: 21rpx; color: #94a3b8; }
.status-tag { flex: none; padding: 5rpx 14rpx; border-radius: 10rpx; font-size: 20rpx; }
.status-tag.st-open { background: #fef2f2; color: #dc2626; }
.status-tag.st-processing { background: #fff7ed; color: #d97706; }
.status-tag.st-resolved { background: #ecfdf5; color: #059669; }
.status-tag.st-closed { background: #f1f5f9; color: #64748b; }
.issue-title { display: block; margin-top: 12rpx; font-size: 30rpx; font-weight: 600; color: #1e293b; line-height: 40rpx; }
.meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10rpx; margin-top: 8rpx; }
.sev-tag { padding: 2rpx 8rpx; border-radius: 8rpx; font-size: 18rpx; }
.sev-low { background: #f1f5f9; color: #64748b; }
.sev-medium { background: #fef3c7; color: #b45309; }
.sev-high { background: #fee2e2; color: #b91c1c; }
.meta-text { font-size: 20rpx; color: #64748b; }
.section-title { display: block; margin-bottom: 10rpx; font-size: 26rpx; font-weight: 600; color: #1e293b; }
.desc-text { display: block; font-size: 23rpx; color: #334155; line-height: 34rpx; white-space: pre-wrap; }
.photo-grid, .photo-row { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.photo-thumb, .photo-add { width: 108rpx; height: 108rpx; }
.photo-thumb { position: relative; }
.photo-thumb image, .photo-img { width: 108rpx; height: 108rpx; border-radius: 8rpx; }
.photo-del {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 32rpx;
  height: 32rpx;
  line-height: 30rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 20rpx;
}
.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  border: 1rpx dashed #cbd5e1;
  border-radius: 8rpx;
  background: #fff;
}
.photo-add-text { font-size: 17rpx; color: #94a3b8; }
.info-row { display: flex; align-items: baseline; gap: 12rpx; padding: 8rpx 0; border-top: 1rpx solid #f1f5f9; }
.info-row:first-of-type { border-top: 0; }
.info-label { flex: none; width: 90rpx; font-size: 21rpx; color: #94a3b8; }
.info-value { flex: 1; font-size: 22rpx; color: #334155; }
.handle-desc { margin-top: 8rpx; padding: 12rpx; background: #f8fafc; border-radius: 8rpx; }
.handle-label { display: block; font-size: 19rpx; color: #94a3b8; }
.handle-text { display: block; margin-top: 4rpx; font-size: 22rpx; color: #334155; line-height: 32rpx; white-space: pre-wrap; }
.status-row { display: flex; gap: 8rpx; margin-bottom: 12rpx; }
.status-opt { flex: 1; padding: 11rpx 0; text-align: center; border-radius: 9rpx; background: #f8fafc; border: 1rpx solid #e2e8f0; font-size: 21rpx; color: #64748b; }
.status-opt.active { background: #dbeafe; border-color: #bfdbfe; color: #2563eb; font-weight: 600; }
.handle-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14rpx 16rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 9rpx;
  font-size: 22rpx;
  color: #1e293b;
  min-height: 140rpx;
}
.save-btn {
  margin-top: 16rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 40rpx;
  background: #2563eb;
  color: #fff;
  font-size: 25rpx;
  font-weight: 600;
}
.save-btn.saving { opacity: .6; }
</style>
