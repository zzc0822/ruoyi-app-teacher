<template>
  <view class="container">
    <u-form :model="form" ref="uForm" label-width="160">
      <u-form-item label="标题" prop="title" required>
        <u-input v-model="form.title" placeholder="请输入标题" />
      </u-form-item>
      <u-form-item label="汇报类型" prop="reportType" required>
        <u-radio-group v-model="form.reportType">
          <u-radio name="季度" :name-val="'QUARTERLY'" />
          <u-radio name="半年" :name-val="'SEMIANNUAL'" />
          <u-radio name="年度" :name-val="'ANNUAL'" />
          <u-radio name="专题" :name-val="'SPECIAL'" />
        </u-radio-group>
      </u-form-item>
      <u-form-item label="汇报日期" prop="reportDate" required>
        <u-datetime-picker v-model="form.reportDate" mode="date" />
      </u-form-item>
      <u-form-item label="季度" prop="quarter">
        <u-input v-model="form.quarter" placeholder="如2026Q1" />
      </u-form-item>
    </u-form>
    <view class="content-section">
      <text class="content-label">汇报内容</text>
      <textarea v-model="form.content" placeholder="请输入思想汇报内容" class="content-input" />
    </view>
    <u-button type="primary" @click="submit" :loading="loading" style="margin-top: 30rpx;">提交</u-button>
  </view>
</template>

<script>
import partyApi from '@/api/party'
export default {
  data() {
    return {
      loading: false,
      form: { title: '', reportType: 'QUARTERLY', reportDate: '', quarter: '', content: '' }
    }
  },
  methods: {
    submit() {
      if (!this.form.title) return uni.showToast({ title: '请输入标题', icon: 'none' })
      if (!this.form.content) return uni.showToast({ title: '请输入内容', icon: 'none' })
      if (!this.form.reportDate) return uni.showToast({ title: '请选择日期', icon: 'none' })
      this.loading = true
      const data = { ...this.form, reportDate: this.formatDate(this.form.reportDate) }
      partyApi.submitThoughtReport(data).then(() => {
        this.loading = false
        uni.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1500)
      }).catch(() => { this.loading = false })
    },
    formatDate(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; }
.content-section { margin-top: 20rpx; }
.content-label { font-size: 28rpx; color: #303133; margin-bottom: 12rpx; display: block; }
.content-input { width: 100%; min-height: 300rpx; background: #fff; border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; box-sizing: border-box; }
</style>
