<template>
  <view class="choose-identity-container">
    <view class="header">
      <text class="title">选择您的身份</text>
      <text class="subtitle">请选择您的身份以完成实名认证</text>
    </view>

    <view class="identity-list">
      <!-- 教师身份 -->
      <view class="identity-card" @click="chooseIdentity('teacher')">
        <view class="icon-wrapper teacher-bg">
          <text class="iconfont icon-teacher"></text>
        </view>
        <view class="info">
          <text class="name">教师</text>
          <text class="desc">使用工号进行实名认证</text>
        </view>
        <text class="arrow">→</text>
      </view>

      <!-- 学生身份 -->
      <view class="identity-card" @click="chooseIdentity('student')">
        <view class="icon-wrapper student-bg">
          <text class="iconfont icon-student"></text>
        </view>
        <view class="info">
          <text class="name">学生</text>
          <text class="desc">使用学号进行实名认证</text>
        </view>
        <text class="arrow">→</text>
      </view>
    </view>

    <view class="tip">
      <text class="tip-text">提示：如果您同时拥有教师和学生身份，可以稍后切换身份</text>
    </view>
  </view>
</template>

<script>
import { getRealNameStatus } from '@/api/roleView'

export default {
  data() {
    return {
      userRoles: []
    }
  },
  onLoad() {
    // 获取用户角色
    this.userRoles = uni.getStorageSync('userRoles') || []
    
    // 如果只有单一角色，自动跳转
    if (this.userRoles.length === 1) {
      const role = this.userRoles[0]
      if (role === 'teacher' || role === 'student') {
        this.chooseIdentity(role)
      }
    }
  },
  methods: {
    chooseIdentity(identity) {
      // 检查用户是否有该角色
      if (!this.userRoles.includes(identity)) {
        this.$modal.msgError(`您没有${identity === 'teacher' ? '教师' : '学生'}角色`)
        return
      }

      // 跳转到对应的实名认证页面
      if (identity === 'teacher') {
        uni.navigateTo({
          url: '/pages/auth/teacherAuth'
        })
      } else {
        uni.navigateTo({
          url: '/pages/auth/studentAuth'
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.choose-identity-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx;

  .header {
    text-align: center;
    margin-bottom: 80rpx;

    .title {
      display: block;
      font-size: 48rpx;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 20rpx;
    }

    .subtitle {
      display: block;
      font-size: 28rpx;
      color: rgba(255, 255, 255, 0.8);
    }
  }

  .identity-list {
    .identity-card {
      display: flex;
      align-items: center;
      background: #ffffff;
      border-radius: 20rpx;
      padding: 40rpx;
      margin-bottom: 30rpx;
      box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);

      .icon-wrapper {
        width: 100rpx;
        height: 100rpx;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 30rpx;

        &.teacher-bg {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        &.student-bg {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .iconfont {
          font-size: 48rpx;
          color: #ffffff;
        }
      }

      .info {
        flex: 1;

        .name {
          display: block;
          font-size: 36rpx;
          font-weight: bold;
          color: #333333;
          margin-bottom: 10rpx;
        }

        .desc {
          display: block;
          font-size: 26rpx;
          color: #999999;
        }
      }

      .arrow {
        font-size: 40rpx;
        color: #cccccc;
      }
    }
  }

  .tip {
    margin-top: 60rpx;
    padding: 30rpx;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 16rpx;

    .tip-text {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.6;
    }
  }
}
</style>
