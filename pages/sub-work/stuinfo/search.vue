<template>
  <view class="page-container">
    <!-- 搜索栏 -->
    <view class="search-header">
      <view class="search-box">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input
          class="search-input"
          v-model="keyword"
          type="text"
          placeholder="输入学号或姓名搜索"
          confirm-type="search"
          @confirm="handleSearch"
          @input="onInput"
          @focus="onFocus"
        />
        <uni-icons v-if="keyword" type="clear" size="16" color="#999" @click="clearKeyword"></uni-icons>
      </view>
    </view>

    <!-- 搜索提示 -->
    <view class="search-tip" v-if="!hasSearched && !showDropdown">
      <uni-icons type="info-filled" size="16" color="#2979ff"></uni-icons>
      <text>输入纯数字按学号搜索，输入文字按姓名搜索</text>
    </view>

    <!-- 搜索结果下拉 -->
    <view class="search-dropdown" v-if="showDropdown && list.length > 0">
      <scroll-view scroll-y class="dropdown-list">
        <view class="stu-card" v-for="(item, index) in list" :key="index" @click="goDetail(item)">
          <image class="stu-avatar" :src="item.photo || '/static/images/default-avatar.png'" mode="aspectFill"></image>
          <view class="stu-info">
            <view class="stu-name-row">
              <text class="stu-name">{{ item.studentName }}</text>
              <text class="stu-gender" :class="String(item.gender).trim() === '1' ? 'male' : (String(item.gender).trim() === '2' ? 'female' : 'unknown')">{{ formatGender(item.gender) }}</text>
            </view>
            <text class="stu-xh">学号：{{ item.xh }}</text>
            <text class="stu-major">{{ item.collegeName }} · {{ item.majorName }} · {{ item.className }}</text>
          </view>
          <uni-icons type="arrowright" size="16" color="#ccc"></uni-icons>
        </view>
      </scroll-view>
    </view>

    <!-- 加载中 -->
    <view class="loading-box" v-if="loading">
      <uni-load-more status="loading" iconType="circle"></uni-load-more>
    </view>

    <!-- 搜索结果为空 -->
    <view class="empty-box" v-if="hasSearched && !loading && list.length === 0 && !showDropdown">
      <image src="/static/images/empty.png" class="empty-img" mode="aspectFit"></image>
      <text class="empty-text">未找到相关学生</text>
    </view>
  </view>
</template>

<script>
import { searchStuinfo } from '@/api/student/stuinfo'

export default {
  data() {
    return {
      keyword: '',
      list: [],
      loading: false,
      hasSearched: false,
      showDropdown: false,
      searchTimer: null
    }
  },
  methods: {
    onFocus() {
      // 获得焦点时，如果有关键词且有结果，显示下拉
      if (this.keyword.trim() && this.list.length > 0) {
        this.showDropdown = true
      }
    },
    onInput() {
      const key = this.keyword.trim()
      
      // 清空时重置
      if (!key) {
        this.list = []
        this.hasSearched = false
        this.showDropdown = false
        return
      }
      
      // 防抖搜索：300ms
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.doSearch(key)
      }, 300)
    },
    doSearch(key) {
      this.loading = true
      this.hasSearched = true
      this.showDropdown = true
      
      searchStuinfo(key).then(res => {
        this.list = res.rows || []
      }).catch(err => {
        uni.showToast({ title: err.message || '搜索失败', icon: 'none' })
      }).finally(() => {
        this.loading = false
      })
    },
    handleSearch() {
      const key = this.keyword.trim()
      if (!key) {
        uni.showToast({ title: '请输入搜索内容', icon: 'none' })
        return
      }
      // 点击搜索按钮，直接搜索
      clearTimeout(this.searchTimer)
      this.doSearch(key)
    },
    clearKeyword() {
      this.keyword = ''
      this.list = []
      this.hasSearched = false
      this.showDropdown = false
    },
    goDetail(item) {
      uni.navigateTo({
        url: '/pages/sub-work/stuinfo/detail?xh=' + item.xh
      })
    },
    formatGender(gender) {
      const val = gender == null ? '' : String(gender).trim()
      if (val === '1') return '男'
      if (val === '2') return '女'
      return '未知'
    },
    genderClass(gender) {
      const val = gender == null ? '' : String(gender).trim()
      if (val === '1') return 'male'
      if (val === '2') return 'female'
      return 'unknown'
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  position: relative;
  z-index: 100;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f0f1f2;
  border-radius: 36rpx;
  padding: 16rpx 24rpx;
}

.search-input {
  flex: 1;
  margin: 0 16rpx;
  font-size: 28rpx;
  color: #333;
}

.search-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  color: #666;
  font-size: 26rpx;
  text {
    margin-left: 8rpx;
  }
}

// 搜索下拉浮层
.search-dropdown {
  position: fixed;
  top: 120rpx;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f6f7;
  z-index: 99;
}

.dropdown-list {
  padding: 0 24rpx 24rpx;
  height: 100%;
}

.loading-box {
  padding: 60rpx 0;
}

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-img {
  width: 200rpx;
  height: 200rpx;
  opacity: 0.6;
}

.empty-text {
  margin-top: 20rpx;
  color: #999;
  font-size: 28rpx;
}

.stu-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 20rpx;
}

.stu-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #eee;
}

.stu-info {
  flex: 1;
  margin-left: 24rpx;
}

.stu-name-row {
  display: flex;
  align-items: center;
}

.stu-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.stu-gender {
  margin-left: 16rpx;
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 12rpx;
  &.male {
    color: #2979ff;
    background: #e6f0ff;
  }
  &.female {
    color: #e43d7e;
    background: #ffe6f0;
  }
  &.unknown {
    color: #999;
    background: #f0f0f0;
  }
}

.stu-xh {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.stu-major {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
