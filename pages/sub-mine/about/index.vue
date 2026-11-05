<template>
  <view class="about-container">
    <view class="header-section text-center">
      <image style="width: 150rpx;height: 150rpx;" src="/static/logo200.png" mode="widthFix">
      </image>
      <view class="app-name">智慧学工教师端</view>
      <view class="app-desc">学生教育管理与服务</view>
    </view>

    <view class="content-section">
      <view class="menu-list">
        <view class="list-cell">
          <view class="menu-item-box">
            <view>版本信息</view>
            <view class="text-right">v{{version}}</view>
          </view>
        </view>
        <view class="list-cell">
          <view class="menu-item-box">
            <view>服务提供方</view>
            <view class="text-right">学校学生工作管理部门</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleAgreement">
          <view class="menu-item-box">
            <view>用户服务协议</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handlePrivacy">
          <view class="menu-item-box">
            <view>隐私政策</view>
          </view>
        </view>
      </view>
    </view>

    <view class="copyright">
      <view>&copy; 2026 智慧学工系统</view>
    </view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        version: getApp().globalData.config.appInfo.version
      }
    },
    methods: {
      handleAgreement() {
        this.$tab.navigateTo('/pages/sub-mine/agreement/index')
      },
      handlePrivacy() {
        this.$tab.navigateTo('/pages/sub-mine/privacy/index')
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #f8f8f8;
  }

  .copyright {
    margin-top: 50rpx;
    text-align: center;
    line-height: 60rpx;
    color: #999;
  }

  .header-section {
    display: flex;
    padding: 30rpx 0 0;
    flex-direction: column;
    align-items: center;
  }

  .app-name {
    margin-top: 20rpx;
    font-size: 36rpx;
    font-weight: 600;
    color: #303133;
  }

  .app-desc {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #909399;
  }
</style>
