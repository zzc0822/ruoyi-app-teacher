<template>
  <view class="auth-container">
    <view class="header">
      <text class="title">学生实名认证</text>
      <text class="subtitle">请输入您的学号完成认证</text>
    </view>

    <view class="form-container">
      <view class="form-item">
        <text class="label">学号</text>
        <input 
          v-model="xh" 
          class="input" 
          type="text" 
          placeholder="请输入学号" 
          maxlength="20"
        />
      </view>

      <button class="submit-btn" @click="submitAuth" :loading="loading">
        {{ loading ? '认证中...' : '提交认证' }}
      </button>
    </view>

    <view class="tip">
      <text class="tip-text">提示：学号应与学校系统中的一致</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      xh: '',
      loading: false
    }
  },
  methods: {
    submitAuth() {
      if (!this.xh) {
        this.$modal.msgError('请输入学号')
        return
      }

      this.loading = true

      // TODO: 调用后端认证接口
      setTimeout(() => {
        this.loading = false
        this.$modal.msgSuccess('认证成功')
        
        // 重新检查认证状态
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      }, 1000)
    }
  }
}
</script>

<style lang="scss" scoped>
.auth-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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

  .form-container {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 40rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);

    .form-item {
      margin-bottom: 40rpx;

      .label {
        display: block;
        font-size: 30rpx;
        color: #333333;
        margin-bottom: 20rpx;
        font-weight: bold;
      }

      .input {
        width: 100%;
        height: 80rpx;
        background: #f5f5f5;
        border-radius: 12rpx;
        padding: 0 20rpx;
        font-size: 28rpx;
      }
    }

    .submit-btn {
      width: 100%;
      height: 80rpx;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: #ffffff;
      border: none;
      border-radius: 12rpx;
      font-size: 32rpx;
      font-weight: bold;
    }
  }

  .tip {
    margin-top: 40rpx;
    padding: 30rpx;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 16rpx;

    .tip-text {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.9);
    }
  }
}
</style>
