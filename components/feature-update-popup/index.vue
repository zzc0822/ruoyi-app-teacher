<template>
  <view v-if="visible" class="update-mask" @touchmove.stop.prevent="noop">
    <view class="update-dialog">
      <view class="update-header">
        <view class="update-heading">
          <view class="update-title-row">
            <text class="update-title">功能更新</text>
            <text v-if="displayVersion" class="update-version">{{ displayVersion }}</text>
          </view>
          <text class="update-subtitle">最近上线内容</text>
        </view>
        <view class="update-close" hover-class="update-close-active" @click="close">
          <text class="update-close-glyph">×</text>
        </view>
      </view>

      <scroll-view scroll-y class="update-scroll">
        <view v-for="(item, index) in items" :key="index" class="update-item">
          <view class="update-item-head">
            <text :class="['update-tag', 'update-tag-' + categoryKey(item.category)]">{{ categoryLabel(item.category) }}</text>
            <text class="update-item-title">{{ item.title }}</text>
          </view>
          <text v-if="item.description" class="update-item-desc">{{ item.description }}</text>
        </view>
      </scroll-view>

      <view class="update-footer">
        <view class="update-confirm" hover-class="update-confirm-active" @click="close">
          <text class="update-confirm-text">我知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'FeatureUpdatePopup',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    items: {
      type: Array,
      default: () => []
    },
    appVersion: {
      type: String,
      default: ''
    }
  },
  computed: {
    // 优先展示当前小程序版本，缺失时回落到最新更新记录的版本号
    displayVersion() {
      const appLabel = this.normalizeVersion(this.appVersion)
      if (appLabel) {
        return appLabel
      }
      const list = this.items || []
      for (let i = 0; i < list.length; i++) {
        const label = this.normalizeVersion(list[i] && list[i].version)
        if (label) {
          return label
        }
      }
      return ''
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    noop() {},
    categoryKey(category) {
      return ['new', 'upgrade', 'fix'].indexOf(category) >= 0 ? category : 'new'
    },
    categoryLabel(category) {
      const labels = {
        new: '新功能',
        upgrade: '优化',
        fix: '修复'
      }
      return labels[category] || '更新'
    },
    normalizeVersion(version) {
      const value = version === null || version === undefined ? '' : String(version).trim()
      if (!value) {
        return ''
      }
      return /^[vV]/.test(value) ? value : 'v' + value
    }
  }
}
</script>

<style lang="scss" scoped>
.update-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 7%;
  background: rgba(15, 23, 42, 0.56);
  box-sizing: border-box;
}

.update-dialog {
  width: 100%;
  max-width: 640rpx;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 8rpx solid #155e75;
  border-radius: 16rpx;
  background: #fff;
  box-shadow: 0 30rpx 80rpx rgba(15, 23, 42, 0.28);
}

.update-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 30rpx 30rpx 18rpx;
}

.update-heading {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.update-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.update-title {
  color: #0f172a;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.35;
}

.update-version {
  flex-shrink: 0;
  margin-left: 14rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #ecfeff;
  color: #0e7490;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.5;
}

.update-subtitle {
  margin-top: 8rpx;
  color: #94a3b8;
  font-size: 22rpx;
  line-height: 1.4;
}

.update-close {
  width: 56rpx;
  height: 56rpx;
  margin: -8rpx -8rpx 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.update-close-active {
  background: #f1f5f9;
}

.update-close-glyph {
  color: #94a3b8;
  font-size: 44rpx;
  line-height: 1;
}

.update-scroll {
  max-height: 52vh;
  padding: 0 30rpx;
  box-sizing: border-box;
}

.update-item {
  padding: 22rpx 0;
  border-top: 1rpx solid #eef2f6;
}

.update-item:first-child {
  border-top: 0;
  padding-top: 8rpx;
}

.update-item-head {
  display: flex;
  align-items: flex-start;
}

.update-tag {
  flex-shrink: 0;
  margin: 4rpx 12rpx 0 0;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  line-height: 1.4;
}

.update-tag-new {
  color: #0f766e;
  background: #ccfbf1;
}

.update-tag-upgrade {
  color: #15803d;
  background: #dcfce7;
}

.update-tag-fix {
  color: #b45309;
  background: #fef3c7;
}

.update-item-title {
  flex: 1;
  min-width: 0;
  color: #1e293b;
  font-size: 27rpx;
  font-weight: 600;
  line-height: 1.5;
  word-break: break-word;
}

.update-item-desc {
  display: block;
  margin-top: 10rpx;
  color: #64748b;
  font-size: 24rpx;
  line-height: 1.65;
  word-break: break-word;
}

.update-footer {
  padding: 22rpx 30rpx calc(22rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(22rpx + env(safe-area-inset-bottom));
}

.update-confirm {
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #155e75;
}

.update-confirm-active {
  background: #0e4e61;
}

.update-confirm-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1;
}
</style>
