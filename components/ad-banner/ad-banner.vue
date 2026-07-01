<template>
  <view class="ad-banner" @tap="onAdClick">
    <swiper class="banner-swiper" :autoplay="autoplay" :interval="interval" :duration="duration" circular>
      <swiper-item v-for="(ad, index) in adList" :key="ad.id">
        <image 
          class="banner-image" 
          :src="ad.adImage" 
          mode="aspectFill"
          @tap.stop="onItemClick(ad)"
        ></image>
        <view class="ad-mark" v-if="showMark">广告</view>
      </swiper-item>
    </swiper>
  </view>
</template>

<script>
import { getAdList, reportShow, reportClick } from '@/api/ad';

export default {
  name: 'AdBanner',
  props: {
    // 是否自动播放
    autoplay: {
      type: Boolean,
      default: true
    },
    // 自动播放间隔（毫秒）
    interval: {
      type: Number,
      default: 3000
    },
    // 切换动画时长（毫秒）
    duration: {
      type: Number,
      default: 500
    },
    // 是否显示"广告"标识
    showMark: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      adList: []
    };
  },
  mounted() {
    this.loadAds();
  },
  methods: {
    // 加载广告
    async loadAds() {
      try {
        const res = await getAdList('banner');
        if (res.code === 200 && res.data && res.data.length > 0) {
          this.adList = res.data;
          // 上报展示
          this.reportShows();
        }
      } catch (error) {
        console.error('加载轮播图广告失败:', error);
      }
    },

    // 批量上报展示
    reportShows() {
      if (this.adList.length === 0) return;
      
      const adIds = this.adList.map(ad => ad.id);
      reportShow(adIds[0]).catch(err => {
        console.error('上报广告展示失败:', err);
      });
    },

    // 点击广告
    onItemClick(ad) {
      // 上报点击
      reportClick(ad.id).catch(err => {
        console.error('上报广告点击失败:', err);
      });

      // 跳转链接
      if (ad.adLink) {
        if (ad.adLink.startsWith('/pages')) {
          // 小程序内部页面
          uni.navigateTo({ url: ad.adLink });
        } else {
          // H5链接
          // #ifdef H5
          window.open(ad.adLink);
          // #endif
          // #ifdef MP-WEIXIN
          uni.navigateToMiniProgram({
            appId: this.extractAppId(ad.adLink),
            success: () => {},
            fail: () => {
              uni.showToast({ title: '跳转失败', icon: 'none' });
            }
          });
          // #endif
        }
      }

      this.$emit('click', ad);
    }
  }
};
</script>

<style scoped>
.ad-banner {
  width: 100%;
  position: relative;
}

.banner-swiper {
  width: 100%;
  height: 300rpx;
}

.banner-image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}

.ad-mark {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
</style>
