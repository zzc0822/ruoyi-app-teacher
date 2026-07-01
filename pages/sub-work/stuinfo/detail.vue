<template>
  <view class="page-container">
    <!-- 头部学生卡片 -->
    <view class="header-card">
      <image class="header-avatar" :src="stu.photo || '/static/images/default-avatar.png'" mode="aspectFill"></image>
      <view class="header-info">
        <view class="header-name-row">
          <text class="header-name">{{ stu.studentName || '-' }}</text>
          <text class="header-gender" :class="stu.gender === '1' ? 'male' : 'female'">{{ formatGender(stu.gender) }}</text>
        </view>
        <text class="header-xh">学号：{{ stu.xh || '-' }}</text>
        <text class="header-major">{{ stu.collegeName || '-' }} · {{ stu.majorName || '-' }} · {{ stu.className || '-' }}</text>
      </view>
    </view>

    <!-- 提示条 -->
    <view class="notice-bar" v-if="!fullAccess">
      <uni-icons type="info-filled" size="16" color="#ff9900"></uni-icons>
      <text>非本人所带学生，仅展示校内基本信息</text>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view class="tab-item" v-for="(tab, index) in tabs" :key="index" :class="{ active: activeTab === index }" @click="switchTab(index)">
        <text>{{ tab }}</text>
        <view class="tab-line" v-if="activeTab === index"></view>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="content-scroll">
      <!-- 基本信息 -->
      <view v-if="activeTab === 0" class="info-card">
        <view class="info-row">
          <text class="info-label">学号</text>
          <text class="info-value">{{ stu.xh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">姓名</text>
          <text class="info-value">{{ stu.studentName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">性别</text>
          <text class="info-value">{{ formatGender(stu.gender) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">身份证号</text>
          <text class="info-value">{{ stu.sfzh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">政治面貌</text>
          <text class="info-value">{{ stu.zzmmName || stu.zzmm || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">学籍状态</text>
          <text class="info-value">{{ stu.xjzt || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">学院</text>
          <text class="info-value">{{ stu.collegeName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">专业</text>
          <text class="info-value">{{ stu.majorName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">班级</text>
          <text class="info-value">{{ stu.className || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">年级</text>
          <text class="info-value">{{ stu.grade || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">培养层次</text>
          <text class="info-value">{{ stu.pycc || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">校区</text>
          <text class="info-value">{{ stu.campus || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">手机号</text>
          <text class="info-value">{{ stu.phone || '-' }}</text>
        </view>
      </view>

      <!-- 家庭信息 -->
      <view v-if="activeTab === 1" class="info-card">
        <view class="info-row">
          <text class="info-label">家庭联系人</text>
          <text class="info-value">{{ stu.jtlxr || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">家庭联系电话</text>
          <text class="info-value" selectable>{{ stu.jtdh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">家庭地址</text>
          <text class="info-value">{{ stu.jtdz || '-' }}</text>
        </view>
      </view>

      <!-- 个人信息 -->
      <view v-if="activeTab === 2" class="info-card">
        <view class="info-row">
          <text class="info-label">出生日期</text>
          <text class="info-value">{{ stu.csrq || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">民族</text>
          <text class="info-value">{{ stu.nz || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">生源地</text>
          <text class="info-value">{{ stu.sysf || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">身高</text>
          <text class="info-value">{{ stu.sg ? stu.sg + ' cm' : '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">宿舍楼</text>
          <text class="info-value">{{ stu.ssh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">宿舍号</text>
          <text class="info-value">{{ stu.sssh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">银行卡号</text>
          <text class="info-value" selectable>{{ stu.yhkkh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">开户行</text>
          <text class="info-value">{{ stu.khh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">银行卡备注</text>
          <text class="info-value">{{ stu.yhkBz || '-' }}</text>
        </view>
      </view>

      <!-- 校内信息（非本人所带学生只显示此页） -->
      <view v-if="activeTab === 0 && tabs.length === 1" class="info-card">
        <view class="info-row">
          <text class="info-label">学院</text>
          <text class="info-value">{{ stu.collegeName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">专业</text>
          <text class="info-value">{{ stu.majorName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">班级</text>
          <text class="info-value">{{ stu.className || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">学号</text>
          <text class="info-value">{{ stu.xh || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">辅导员</text>
          <text class="info-value">{{ stu.counselorName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">辅导员电话</text>
          <text class="info-value" selectable>{{ stu.counselorPhone || '-' }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getStuinfoDetail } from '@/api/stumanage/stuinfo'

export default {
  data() {
    return {
      xh: '',
      stu: {},
      fullAccess: false,
      activeTab: 0,
      tabs: ['基本信息', '家庭信息', '个人信息']
    }
  },
  onLoad(options) {
    this.xh = options.xh || ''
    if (this.xh) {
      this.loadDetail()
    }
  },
  methods: {
    loadDetail() {
      uni.showLoading({ title: '加载中' })
      getStuinfoDetail(this.xh).then(res => {
        this.stu = res.data.stu || {}
        this.fullAccess = res.data.fullAccess === true
        if (!this.fullAccess) {
          this.tabs = ['校内信息']
          this.activeTab = 0
        } else {
          this.tabs = ['基本信息', '家庭信息', '个人信息']
          this.activeTab = 0
        }
      }).catch(err => {
        uni.showToast({ title: err.message || '加载失败', icon: 'none' })
      }).finally(() => {
        uni.hideLoading()
      })
    },
    switchTab(index) {
      this.activeTab = index
    },
    formatGender(gender) {
      if (gender === '1') return '男'
      if (gender === '2') return '女'
      return '未知'
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
}

.header-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #2979ff, #1a5cd8);
  padding: 40rpx 30rpx;
}

.header-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  background: #eee;
}

.header-info {
  flex: 1;
  margin-left: 30rpx;
}

.header-name-row {
  display: flex;
  align-items: center;
}

.header-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
}

.header-gender {
  margin-left: 16rpx;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.header-xh {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.header-major {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.notice-bar {
  display: flex;
  align-items: center;
  background: #fffbe6;
  padding: 20rpx 30rpx;
  color: #ff9900;
  font-size: 26rpx;
  text {
    margin-left: 10rpx;
  }
}

.tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #2979ff;
  font-weight: bold;
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background: #2979ff;
  border-radius: 2rpx;
}

.content-scroll {
  padding: 20rpx 24rpx;
}

.info-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 0 24rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  max-width: 60%;
  text-align: right;
  word-break: break-all;
}
</style>
