<template>
  <view class="page-container">
    <!-- 班级信息 -->
    <view class="class-card" v-if="classInfo">
      <view class="class-header">
        <text class="class-name">{{ classInfo.className || classInfo.bjname }}</text>
      </view>
      <view class="class-meta">
        <view class="meta-item">
          <text class="meta-label">班级代码</text>
          <text class="meta-value">{{ classInfo.bjdm || '-' }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">学院代码</text>
          <text class="meta-value">{{ classInfo.xydm || '-' }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">班级人数</text>
          <text class="meta-value">{{ students.length }}人</text>
        </view>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <uni-easyinput v-model="searchKey" placeholder="搜索姓名/学号" clearable @input="onSearch">
        <template #right>
          <uni-icons type="search" size="18" @click="onSearch"></uni-icons>
        </template>
      </uni-easyinput>
    </view>

    <!-- 学生列表 -->
    <view class="student-card">
      <text class="card-title">学生名单 ({{ filteredStudents.length }})</text>
      <view class="stu-row" v-for="(stu, idx) in filteredStudents" :key="idx">
        <text class="stu-idx">{{ idx + 1 }}</text>
        <text class="stu-name">{{ stu.studentName }}</text>
        <text :class="['stu-sex', stu.genderName === '男' ? 'male' : stu.genderName === '女' ? 'female' : 'unknown']">
          {{ stu.genderName === '男' ? '♂' : stu.genderName === '女' ? '♀' : '' }}
        </text>
        <text class="stu-xh">{{ stu.xh }}</text>
        <text class="stu-phone" v-if="stu.lxdh">{{ stu.lxdh }}</text>
      </view>
      <view class="empty" v-if="filteredStudents.length === 0">
        <text>暂无学生数据</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getClassDetail } from '@/api/affair/headteacher'

export default {
  data() {
    return {
      bjid: null,
      className: '',
      classInfo: null,
      students: [],
      searchKey: '',
      searchTimer: null
    }
  },
  computed: {
    filteredStudents() {
      if (!this.searchKey) return this.students
      const key = this.searchKey.trim()
      if (!key) return this.students
      return this.students.filter(s =>
        (s.studentName && s.studentName.indexOf(key) >= 0) ||
        (s.xh && s.xh.indexOf(key) >= 0)
      )
    }
  },
  onLoad(options) {
    this.bjid = options.bjid
    this.className = decodeURIComponent(options.className || '')
    this.loadDetail()
  },
  methods: {
    loadDetail() {
      uni.showLoading({ title: '加载中...' })
      getClassDetail(this.bjid).then(res => {
        uni.hideLoading()
        if (res.data) {
          this.classInfo = res.data.classInfo || res.data
          this.students = res.data.students || []
        }
      }).catch(() => {
        uni.hideLoading()
        uni.showToast({ title: '加载失败', icon: 'none' })
      })
    },
    onSearch() {
      // 使用计算属性自动过滤，这里不需要额外操作
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

.class-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.class-header {
  margin-bottom: 16rpx;
}

.class-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.class-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.meta-label {
  font-size: 22rpx;
  color: #999;
}

.meta-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.search-bar {
  margin-bottom: 16rpx;
}

.student-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.stu-row {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
  gap: 12rpx;

  &:last-child {
    border-bottom: none;
  }
}

.stu-idx {
  font-size: 22rpx;
  color: #ccc;
  width: 40rpx;
  text-align: center;
  flex-shrink: 0;
}

.stu-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  width: 100rpx;
  flex-shrink: 0;
}

.stu-sex {
  font-size: 22rpx;
  width: 28rpx;
  text-align: center;
  flex-shrink: 0;

  &.male { color: #2979ff; }
  &.female { color: #e43d33; }
  &.unknown { color: #999; }
}

.stu-xh {
  font-size: 20rpx;
  color: #999;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stu-phone {
  font-size: 20rpx;
  color: #666;
  flex-shrink: 0;
}

.empty {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}
</style>
