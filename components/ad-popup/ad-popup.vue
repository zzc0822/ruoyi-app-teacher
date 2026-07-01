<template>
  <view v-if="visible && currentAd" class="ad-popup-mask" @tap="onClose">
    <view class="ad-popup-content" @tap.stop>
      <image 
        v-if="currentAd.adType === 'image'"
        class="ad-image" 
        :src="currentAd.adImage" 
        mode="aspectFit"
        @tap="onAdClick"
      ></image>
      <video 
        v-else-if="currentAd.adType === 'video'"
        class="ad-video"
        :src="currentAd.adVideo"
        controls
        @tap="onAdClick"
      ></video>
      <view v-else class="ad-text-content" @tap="onAdClick">
        <text class="ad-text">{{ currentAd.adContent }}</text>
        <button class="ad-button" type="primary" size="mini">立即查看</button>
      </view>
      
      <view class="close-btn" @tap="onClose">
        <text class="close-icon">×</text>
      </view>
      
      <view class="ad-mark">广告</view>
    </view>
  </view>
</template>

<script>
import { getAdList, reportShow, reportClick } from '@/api/ad';

export default {
  name: 'AdPopup',
  data() {
    return {
      visible: false,
      currentAd: null,
      shownToday: false
    };
  },
  mounted() {
    this.checkAndShow();
  },
  methods: {
    // 检查是否显示
    async checkAndShow() {
      // 检查今天是否已显示过
      const today = new Date().toDateString();
      const lastShown = uni.getStorageSync('ad_popup_last_shown');
      
      if (lastShown === today) {
        this.shownToday = true;
        return;
      }
      
      // 加载广告
      try {
        const res = await getAdList('popup');
        if (res.code === 200 && res.data && res.data.length > 0) {
          this.currentAd = res.data[0];
          this.visible = true;
          
          // 上报展示
          reportShow(this.currentAd.id).catch(err => {
            console.error('上报广告展示失败:', err);
          });
          
          // 记录今天已显示
          uni.setStorageSync('ad_popup_last_shown', today);
        }
      } catch (error) {
        console.error('加载弹窗广告失败:', error);
      }
    },

    // 点击广告
    onAdClick() {
      if (!this.currentAd) return;
      
      // 上报点击
      reportClick(this.currentAd.id).catch(err => {
        console.error('上报广告点击失败:', err);
      });

      // 跳转链接
      if (this.currentAd.adLink) {
        if (this.currentAd.adLink.startsWith('/pages')) {
          uni.navigateTo({ url: this.currentAd.adLink });
        } else {
          // #ifdef H5
          window.open(this.currentAd.adLink);
          // #endif
          // #ifdef MP-WEIXIN
          uni.showToast({ title: '广告链接', icon: 'none' });
          // #endif
        }
      }

      this.$emit('click', this.currentAd);
      this.close();
    },

    // 关闭弹窗
    onClose() {
      this.visible = false;
      this.$emit('close');
    },

    // 手动显示
    show() {
      this.checkAndShow();
    }
  }
};
</script>

<style scoped>
.ad-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ad-popup-content {
  position: relative;
  width: 600rpx;
  max-height: 800rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.ad-image {
  width: 100%;
  height: 600rpx;
}

.ad-video {
  width: 100%;
  height: 600rpx;
}

.ad-text-content {
  padding: 60rpx 40rpx;
  text-align: center;
}

.ad-text {
  display: block;
  font-size: 32rpx;
  color: #333;
  margin-bottom: 40rpx;
  line-height: 1.6;
}

.ad-button {
  margin: 0 auto;
}

.close-btn {
  position: absolute;
  top: -60rpx;
  right: 0;
  width: 50rpx;
  height: 50rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  font-size: 40rpx;
  color: #999;
  line-height: 1;
}

.ad-mark {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
</style>
