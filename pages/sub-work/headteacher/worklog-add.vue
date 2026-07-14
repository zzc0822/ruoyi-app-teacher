<template>
  <view class="page-container">
    <view class="form-card">
      <!-- 班级选择 -->
      <view class="form-item">
        <text class="form-label">班级</text>
        <picker mode="selector" :range="classOptions" range-key="className" @change="onClassChange" :value="classIndex">
          <view class="picker-value" :class="{ placeholder: !selectedClass }">
            {{ selectedClass ? selectedClass.className : '请选择班级' }}
          </view>
        </picker>
      </view>

      <!-- 工作类型 -->
      <view class="form-item">
        <text class="form-label">工作类型</text>
        <view class="type-grid">
          <view class="type-item" :class="{ active: form.workType === 'meeting' }" @click="setWorkType('meeting')">班会</view>
          <view class="type-item" :class="{ active: form.workType === 'talk' }" @click="setWorkType('talk')">谈话</view>
          <view class="type-item" :class="{ active: form.workType === 'dorm' }" @click="setWorkType('dorm')">宿舍巡查</view>
          <view class="type-item" :class="{ active: form.workType === 'other' }" @click="setWorkType('other')">其他</view>
        </view>
      </view>

      <!-- 工作日期 -->
      <view class="form-item">
        <text class="form-label">工作日期</text>
        <picker mode="date" :value="form.workDate" @change="onDateChange">
          <view class="picker-value" :class="{ placeholder: !form.workDate }">
            {{ form.workDate || '请选择日期' }}
          </view>
        </picker>
      </view>

      <!-- 工作地点 -->
      <view class="form-item">
        <text class="form-label">工作地点</text>
        <input class="form-input" v-model="form.workLocation" placeholder="请输入工作地点" />
      </view>

      <!-- 参与人数 -->
      <view class="form-item">
        <text class="form-label">参与人数</text>
        <input class="form-input" type="number" v-model="form.participantCount" placeholder="0" />
      </view>

      <!-- 涉及学号 -->
      <view class="form-item">
        <text class="form-label">涉及学号</text>
        <input class="form-input" v-model="form.studentIds" placeholder="多个学号用逗号分隔" />
      </view>

      <!-- 工作内容 -->
      <view class="form-item">
        <text class="form-label">工作内容</text>
        <textarea class="form-textarea" v-model="form.workContent" placeholder="请输入工作内容" :maxlength="2000" />
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="btn-group">
      <button class="btn-cancel" @click="goBack">取消</button>
      <button class="btn-submit" @click="submit" :loading="submitting">提交</button>
    </view>
  </view>
</template>

<script>
import { getMyClasses, addWorklog, getWorklog, updateWorklog } from '@/api/affair/headteacher'

export default {
  data() {
    return {
      editId: null,
      submitting: false,
      classList: [],
      classIndex: 0,
      form: {
        bjid: null,
        className: '',
        bjdm: '',
        xydm: '',
        workType: 'meeting',
        workDate: this.getToday(),
        workLocation: '',
        participantCount: 0,
        studentIds: '',
        workContent: ''
      }
    }
  },
  computed: {
    classOptions() {
      return this.classList
    },
    selectedClass() {
      return this.classList[this.classIndex] || null
    }
  },
  onLoad(options) {
    if (options.id) {
      this.editId = options.id
      uni.setNavigationBarTitle({ title: '修改工作记录' })
      this.loadDetail(options.id)
    }
    this.loadClasses()
  },
  methods: {
    getToday() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    loadClasses() {
      getMyClasses().then(res => {
        this.classList = res.data || []
        if (this.editId) {
          // 编辑模式下，加载详情后再设置班级选中
        } else if (this.classList.length > 0) {
          this.form.bjid = this.classList[0].bjid
          this.form.className = this.classList[0].className
        }
      }).catch(() => {})
    },
    loadDetail(id) {
      getWorklog(id).then(res => {
        if (res.data) {
          this.form = { ...this.form, ...res.data }
          // 设置班级选中索引
          if (this.form.bjid) {
            const idx = this.classList.findIndex(c => c.bjid === this.form.bjid)
            if (idx >= 0) this.classIndex = idx
          }
        }
      }).catch(() => {})
    },
    onClassChange(e) {
      this.classIndex = e.detail.value
      const cls = this.selectedClass
      if (cls) {
        this.form.bjid = cls.bjid
        this.form.className = cls.className
        this.form.bjdm = cls.bjdm
        this.form.xydm = cls.xydm
      }
    },
    setWorkType(type) {
      this.form.workType = type
    },
    onDateChange(e) {
      this.form.workDate = e.detail.value
    },
    validate() {
      if (!this.form.bjid) {
        uni.showToast({ title: '请选择班级', icon: 'none' })
        return false
      }
      if (!this.form.workType) {
        uni.showToast({ title: '请选择工作类型', icon: 'none' })
        return false
      }
      if (!this.form.workDate) {
        uni.showToast({ title: '请选择工作日期', icon: 'none' })
        return false
      }
      if (!this.form.workContent || !this.form.workContent.trim()) {
        uni.showToast({ title: '请输入工作内容', icon: 'none' })
        return false
      }
      return true
    },
    submit() {
      if (!this.validate()) return
      this.submitting = true
      const data = { ...this.form }
      if (typeof data.participantCount === 'string') {
        data.participantCount = parseInt(data.participantCount) || 0
      }
      const api = this.editId ? updateWorklog(data) : addWorklog(data)
      api.then(() => {
        uni.showToast({ title: this.editId ? '修改成功' : '提交成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      }).catch(err => {
        uni.showToast({ title: '提交失败', icon: 'none' })
      }).finally(() => {
        this.submitting = false
      })
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 12rpx;
  display: block;

  &::before {
    content: '* ';
    color: #e43d33;
  }
}

.picker-value {
  font-size: 26rpx;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;

  &.placeholder {
    color: #999;
  }
}

.form-input {
  font-size: 26rpx;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}

.form-textarea {
  font-size: 26rpx;
  color: #333;
  width: 100%;
  min-height: 200rpx;
  padding: 16rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.type-grid {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.type-item {
  flex: 1;
  min-width: 140rpx;
  text-align: center;
  padding: 16rpx 0;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #666;

  &.active {
    background: #2979ff;
    color: #fff;
  }
}

.btn-group {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.btn-cancel {
  flex: 1;
  font-size: 28rpx;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8rpx;
}

.btn-submit {
  flex: 2;
  font-size: 28rpx;
  background: #2979ff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
}
</style>
