<template>
  <view class="ad-feed" v-if="adList.length > 0">
    <view 
      v-for="(ad, index) in adList" 
      :key="ad.id"
      class="ad-feed-item"
      @tap="onAdClick(ad)"
    >
      <view class="ad-feed-header">
        <text class="ad-feed-mark">广告</text>
        <text class="ad-feed-time">{{ formatTime(ad.createTime) }}</text>
      </view>
      
      <view class="ad-feed-content">
        <text class="ad-feed-text">{{ ad.adContent }}</text>
        <image 
          v-if="ad.adImage"
          class="ad-feed-image" 
          :src="ad.adImage" 
          mode="aspectFill"
        ></image>
      </view>
      
      <view class="ad-feed-footer">
        <view class="ad-feed-link" v-if="ad.adLink">
          <text class="link-text">查看详情</text>
          <text class="link-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getAdList, reportShow, reportClick } from '@/api/campus/ad';

export default {
  name: 'AdFeed',
  props: {
    // 是否自动加载
    autoLoad: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      adList: [],
      reportedIds: []
    };
  },
  mounted() {
    if (this.autoLoad) {
      this.loadAds();
    }
  },
  methods: {
    // 加载广告
    async loadAds() {
      try {
        const res = await getAdList('feed');
        if (res.code === 200 && res.data && res.data.length > 0) {
          this.adList = res.data;
          // 上报展示
          this.reportShows();
        }
      } catch (error) {
        console.error('加载信息流广告失败:', error);
      }
    },

    // 批量上报展示
    reportShows() {
      if (this.adList.length === 0) return;
      
      this.adList.forEach(ad => {
        if (!this.reportedIds.includes(ad.id)) {
          reportShow(ad.id).catch(err => {
            console.error('上报广告展示失败:', err);
          });
          this.reportedIds.push(ad.id);
        }
      });
    },

    // 点击广告
    onAdClick(ad) {
      // 上报点击
      reportClick(ad.id).catch(err => {
        console.error('上报广告点击失败:', err);
      });

      // 跳转链接
      if (ad.adLink) {
        if (ad.adLink.startsWith('/pages')) {
          uni.navigateTo({ url: ad.adLink });
        } else {
          // #ifdef H5
          window.open(ad.adLink);
          // #endif
          // #ifdef MP-WEIXIN
          uni.showToast({ title: '广告链接', icon: 'none' });
          // #endif
        }
      }

      this.$emit('click', ad);
    },

    // 格式化时间
    formatTime(time) {
      if (!time) return '';
      const date = new Date(time);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}-${day}`;
    },

    // 手动刷新
    refresh() {
      this.reportedIds = [];
      this.loadAds();
    }
  }
};
</script>

<style scoped>
.ad-feed {
  width: 100%;
}

.ad-feed-item {
  background: #fff;
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.ad-feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.ad-feed-mark {
  font-size: 22rpx;
  color: #999;
  background: #f5f5f5;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.ad-feed-time {
  font-size: 22rpx;
  color: #999;
}

.ad-feed-content {
  margin-bottom: 16rpx;
}

.ad-feed-text {
  display: block;
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.ad-feed-image {
  width: 100%;
  height: 400rpx;
  border-radius: 8rpx;
}

.ad-feed-footer {
  display: flex;
  justify-content: flex-end;
}

.ad-feed-link {
  display: flex;
  align-items: center;
  color: #1890ff;
  font-size: 26rpx;
}

.link-text {
  margin-right: 8rpx;
}

.link-arrow {
  font-size: 32rpx;
}
</style>
