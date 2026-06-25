<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-item">
        <text class="form-label">活动标题</text>
        <input class="form-input" v-model="form.title" placeholder="请输入活动标题" />
      </view>
      <view class="form-item">
        <text class="form-label">场景分组Key</text>
        <input class="form-input" v-model="form.sceneGroup" placeholder="如：innovation" />
      </view>
      <view class="form-item">
        <text class="form-label">场景分组名称</text>
        <input class="form-input" v-model="form.groupName" placeholder="如：创新创业" />
      </view>
      <view class="form-item">
        <text class="form-label">所属维度</text>
        <picker mode="selector" :range="dimArray" :value="dimIndex" @change="onDimChange">
          <view class="form-input">{{ dimArray[dimIndex] }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">范围类型</text>
        <picker mode="selector" :range="targetArray" :value="targetIndex" @change="onTargetChange">
          <view class="form-input">{{ targetArray[targetIndex] }}</view>
        </picker>
      </view>
      <view class="form-item" v-if="form.targetType === '1'">
        <text class="form-label">指定班级</text>
        <input class="form-input" v-model="classStr" placeholder="班级代码，多个用逗号分隔" />
      </view>
      <view class="form-item">
        <text class="form-label">开始时间</text>
        <picker mode="multiSelector" :range="dateRange" :value="startIndex" @change="onStartChange" @columnchange="onColumnChange">
          <view class="form-input">{{ form.startTime }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">结束时间</text>
        <picker mode="multiSelector" :range="dateRange" :value="endIndex" @change="onEndChange" @columnchange="onColumnChange">
          <view class="form-input">{{ form.endTime }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">报名截止</text>
        <picker mode="multiSelector" :range="dateRange" :value="signupIndex" @change="onSignupChange" @columnchange="onColumnChange">
          <view class="form-input">{{ form.signupEnd }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">活动说明</text>
        <textarea class="form-textarea" v-model="form.description" placeholder="请输入活动说明" />
      </view>
    </view>
    <view class="submit-btn" @click="submit">创建活动</view>
  </view>
</template>

<script>
import { addActivity } from '@/api/stumanage/activity'

const DIM_OPTIONS = [
  { label: '德育', value: 'de' },
  { label: '智育', value: 'zhi' },
  { label: '体育', value: 'ti' },
  { label: '美育', value: 'mei' },
  { label: '劳育', value: 'lao' },
  { label: '创新创业', value: 'chuang' }
]

export default {
  data() {
    return {
      form: {
        title: '',
        sceneGroup: '',
        groupName: '',
        category: 'de',
        targetType: '0',
        startTime: '',
        endTime: '',
        signupEnd: '',
        description: '',
        status: '0'
      },
      classStr: '',
      dimArray: DIM_OPTIONS.map(d => d.label),
      dimIndex: 0,
      targetArray: ['全校', '指定班级'],
      targetIndex: 0,
      dateRange: [[], [], [], [], []],
      startIndex: [0, 0, 0, 0, 0],
      endIndex: [0, 0, 0, 0, 0],
      signupIndex: [0, 0, 0, 0, 0]
    }
  },
  created() {
    this.initDateRange()
  },
  methods: {
    initDateRange() {
      const years = []
      const months = []
      const days = []
      const hours = []
      const minutes = []
      const now = new Date()
      for (let i = now.getFullYear(); i <= now.getFullYear() + 2; i++) years.push(i + '年')
      for (let i = 1; i <= 12; i++) months.push(i + '月')
      for (let i = 1; i <= 31; i++) days.push(i + '日')
      for (let i = 0; i < 24; i++) hours.push(String(i).padStart(2, '0') + '时')
      for (let i = 0; i < 60; i++) minutes.push(String(i).padStart(2, '0') + '分')
      this.dateRange = [years, months, days, hours, minutes]
    },
    parseIndexToDate(index) {
      const y = this.dateRange[0][index[0]].replace('年', '')
      const m = this.dateRange[1][index[1]].replace('月', '').padStart(2, '0')
      const d = this.dateRange[2][index[2]].replace('日', '').padStart(2, '0')
      const h = this.dateRange[3][index[3]].replace('时', '')
      const min = this.dateRange[4][index[4]].replace('分', '')
      return `${y}-${m}-${d} ${h}:${min}:00`
    },
    onDimChange(e) {
      this.dimIndex = e.detail.value
      this.form.category = DIM_OPTIONS[this.dimIndex].value
    },
    onTargetChange(e) {
      this.targetIndex = e.detail.value
      this.form.targetType = this.targetIndex === 0 ? '0' : '1'
    },
    onStartChange(e) {
      this.startIndex = e.detail.value
      this.form.startTime = this.parseIndexToDate(this.startIndex)
    },
    onEndChange(e) {
      this.endIndex = e.detail.value
      this.form.endTime = this.parseIndexToDate(this.endIndex)
    },
    onSignupChange(e) {
      this.signupIndex = e.detail.value
      this.form.signupEnd = this.parseIndexToDate(this.signupIndex)
    },
    onColumnChange() {},
    submit() {
      if (!this.form.title) {
        uni.showToast({ title: '请输入活动标题', icon: 'none' })
        return
      }
      if (!this.form.sceneGroup) {
        uni.showToast({ title: '请输入场景分组Key', icon: 'none' })
        return
      }
      if (!this.form.startTime || !this.form.endTime) {
        uni.showToast({ title: '请选择活动时间', icon: 'none' })
        return
      }
      const data = { ...this.form }
      if (data.targetType === '1' && this.classStr) {
        data.classList = this.classStr.split(',').map(s => s.trim()).filter(Boolean)
      }
      addActivity(data).then(() => {
        uni.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      }).catch(() => {
        uni.showToast({ title: '创建失败', icon: 'none' })
      })
    }
  }
}
</script>

<style scoped lang="scss">
.page-container {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 12px;
}
.form-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
}
.form-item {
  margin-bottom: 14px;
}
.form-label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
}
.form-input {
  height: 42px;
  line-height: 42px;
  padding: 0 10px;
  background: #f5f6f8;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
}
.form-textarea {
  width: 100%;
  height: 80px;
  padding: 10px;
  background: #f5f6f8;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}
.submit-btn {
  margin-top: 20px;
  height: 46px;
  line-height: 46px;
  text-align: center;
  background: #2979ff;
  color: #fff;
  border-radius: 23px;
  font-size: 16px;
}
</style>
