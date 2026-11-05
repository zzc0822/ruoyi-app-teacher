<template>
  <view class="legal-page">
    <view class="legal-header">
      <text class="legal-title">{{ title }}</text>
      <view class="legal-meta">
        <text>更新日期：{{ updated }}</text>
        <text class="meta-divider">|</text>
        <text>生效日期：{{ effective }}</text>
      </view>
    </view>

    <view class="legal-content">
      <text v-if="intro" class="legal-intro">{{ intro }}</text>

      <view v-for="(section, index) in sections" :key="index" class="legal-section">
        <view class="section-heading">
          <view class="heading-bar"></view>
          <text class="section-title">{{ section.title }}</text>
        </view>

        <text
          v-for="(paragraph, pIndex) in (section.paragraphs || [])"
          :key="pIndex"
          class="section-paragraph"
        >{{ paragraph }}</text>

        <view v-if="section.items && section.items.length" class="section-items">
          <view v-for="(item, iIndex) in section.items" :key="iIndex" class="section-item">
            <text class="item-dot">·</text>
            <text class="item-text">{{ item }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="legal-footer">
      <text>{{ footer }}</text>
    </view>
  </view>
</template>

<script>
  export default {
    props: {
      title: {
        type: String,
        required: true
      },
      updated: {
        type: String,
        required: true
      },
      effective: {
        type: String,
        required: true
      },
      intro: {
        type: String,
        default: ''
      },
      sections: {
        type: Array,
        default: () => []
      },
      footer: {
        type: String,
        default: ''
      }
    }
  }
</script>

<style lang="scss" scoped>
  .legal-page {
    min-height: 100vh;
    padding-bottom: 60rpx;
    background: #f4f6f8;
    box-sizing: border-box;
  }

  .legal-header {
    padding: 52rpx 40rpx 36rpx;
    background: #ffffff;
    border-bottom: 1rpx solid #e5e7eb;
  }

  .legal-title {
    display: block;
    font-size: 44rpx;
    font-weight: 600;
    line-height: 1.4;
    color: #111827;
  }

  .legal-meta {
    display: flex;
    align-items: center;
    margin-top: 20rpx;
    font-size: 24rpx;
    color: #6b7280;
  }

  .meta-divider {
    margin: 0 16rpx;
    color: #d1d5db;
  }

  .legal-content {
    margin-top: 20rpx;
    padding: 8rpx 40rpx 48rpx;
    background: #ffffff;
  }

  .legal-intro {
    display: block;
    padding-top: 32rpx;
    font-size: 28rpx;
    line-height: 1.85;
    color: #374151;
  }

  .legal-section {
    margin-top: 44rpx;
  }

  .section-heading {
    display: flex;
    align-items: center;
  }

  .heading-bar {
    width: 6rpx;
    height: 30rpx;
    margin-right: 16rpx;
    background: #0f766e;
    border-radius: 3rpx;
  }

  .section-title {
    font-size: 31rpx;
    font-weight: 600;
    line-height: 1.5;
    color: #111827;
  }

  .section-paragraph {
    display: block;
    margin-top: 16rpx;
    font-size: 28rpx;
    line-height: 1.85;
    color: #374151;
    text-align: justify;
  }

  .section-items {
    margin-top: 6rpx;
  }

  .section-item {
    display: flex;
    margin-top: 10rpx;
  }

  .item-dot {
    flex: none;
    width: 24rpx;
    font-size: 30rpx;
    line-height: 1.8;
    color: #0f766e;
  }

  .item-text {
    flex: 1;
    font-size: 28rpx;
    line-height: 1.8;
    color: #374151;
    text-align: justify;
  }

  .legal-footer {
    padding: 36rpx 40rpx 0;
    font-size: 23rpx;
    line-height: 1.7;
    color: #9ca3af;
    text-align: center;
  }
</style>
