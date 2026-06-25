<template>
  <view class="page-container">
    <!-- 顶部统计+新增 -->
    <view class="top-row">
      <view class="stats-card">
        <view class="stats-row">
          <view class="stats-item">
            <text class="stats-num">{{ statTotal }}</text>
            <text class="stats-label">活动总数</text>
          </view>
          <view class="stats-item">
            <text class="stats-num orange">{{ statRunning }}</text>
            <text class="stats-label">进行中</text>
          </view>
          <view class="stats-item">
            <text class="stats-num blue">{{ statEnded }}</text>
            <text class="stats-label">已结束</text>
          </view>
        </view>
      </view>
      <view class="add-btn-col" @click="goAdd">
        <uni-icons type="plusempty" size="28" color="#fff"></uni-icons>
        <text class="add-btn-label">新增</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <uni-easyinput
        v-model="searchKey"
        placeholder="搜索活动标题"
        @confirm="handleSearch"
        clearable
        @clear="handleClear"
      >
        <template #right>
          <uni-icons type="search" size="18" @click="handleSearch"></uni-icons>
        </template>
      </uni-easyinput>
    </view>

    <!-- 维度筛选 -->
    <scroll-view scroll-x class="dim-bar" show-scrollbar="false">
      <view :class="['dim-item', activeDim === '' ? 'active' : '']" @click="switchDim('')">全部</view>
      <view :class="['dim-item', activeDim === 'de' ? 'active' : '']" @click="switchDim('de')">德育</view>
      <view :class="['dim-item', activeDim === 'zhi' ? 'active' : '']" @click="switchDim('zhi')">智育</view>
      <view :class="['dim-item', activeDim === 'ti' ? 'active' : '']" @click="switchDim('ti')">体育</view>
      <view :class="['dim-item', activeDim === 'mei' ? 'active' : '']" @click="switchDim('mei')">美育</view>
      <view :class="['dim-item', activeDim === 'lao' ? 'active' : '']" @click="switchDim('lao')">劳育</view>
      <view :class="['dim-item', activeDim === 'chuang' ? 'active' : '']" @click="switchDim('chuang')">创新创业</view>
    </scroll-view>

    <!-- 状态筛选 -->
    <view class="filter-bar">
      <view :class="['filter-item', activeTab === 'all' ? 'active' : '']" @click="switchTab('all')">全部</view>
      <view :class="['filter-item', activeTab === '0' ? 'active' : '']" @click="switchTab('0')">进行中</view>
      <view :class="['filter-item', activeTab === '1' ? 'active' : '']" @click="switchTab('1')">已结束</view>
      <view :class="['filter-item', activeTab === '2' ? 'active' : '']" @click="switchTab('2')">草稿</view>
    </view>

    <!-- 活动列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="list-item" v-for="item in list" :key="item.id" @click="goDetail(item)">
        <view class="item-header">
          <text class="item-title">{{ item.title }}</text>
          <text :class="['item-status', 'status-' + item.status]">{{ formatStatus(item.status) }}</text>
        </view>
        <view class="item-row">
          <text class="item-label">维度</text>
          <text class="item-value">{{ formatCategory(item.category) }}</text>
        </view>
        <view class="item-row">
          <text class="item-label">范围</text>
          <text class="item-value">{{ formatTargetType(item.targetType) }}</text>
        </view>
        <view class="item-row">
          <text class="item-label">时间</text>
          <text class="item-value">{{ formatDate(item.startTime) }} ~ {{ formatDate(item.endTime) }}</text>
        </view>
        <view class="item-row" v-if="item.signupEnd">
          <text class="item-label">报名截止</text>
          <text class="item-value">{{ formatDate(item.signupEnd) }}</text>
        </view>
      </view>
      <view class="empty-tip" v-if="!loading && list.length === 0">
        <text>暂无活动</text>
      </view>
      <uni-load-more :status="loadStatus" v-else></uni-load-more>
    </scroll-view>
  </view>
</template>

<script>
import { listActivity } from '@/api/stumanage/activity'

const STATUS_MAP = { '0': '进行中', '1': '已结束', '2': '草稿' }
const CATEGORY_MAP = {
  de: '德育', zhi: '智育', ti: '体育', mei: '美育', lao: '劳育', chuang: '创新创业'
}

export default {
  data() {
    return {
      activeTab: 'all',
      activeDim: '',
      searchKey: '',
      queryParam: {
        pageNum: 1,
        pageSize: 20,
        title: undefined,
        category: undefined,
        status: undefined
      },
      list: [],
      total: 0,
      loadStatus: 'more',
      loading: false,
      statTotal: 0,
      statRunning: 0,
      statEnded: 0
    }
  },
  onShow() {
    this.refresh()
  },
  methods: {
    refresh() {
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    getList() {
      if (this.loading) return
      this.loading = true
      this.loadStatus = 'loading'
      listActivity(this.queryParam).then(res => {
        const rows = res.rows || []
        if (this.queryParam.pageNum === 1) {
          this.list = rows
        } else {
          this.list = [...this.list, ...rows]
        }
        this.total = res.total || 0
        this.statTotal = this.total
        this.statRunning = rows.filter(r => r.status === '0').length
        this.statEnded = rows.filter(r => r.status === '1').length
        if (this.list.length >= this.total) {
          this.loadStatus = 'noMore'
        } else {
          this.loadStatus = 'more'
        }
      }).catch(() => {
        this.loadStatus = 'more'
        uni.showToast({ title: '加载失败', icon: 'none' })
      }).finally(() => {
        this.loading = false
      })
    },
    loadMore() {
      if (this.list.length < this.total) {
        this.queryParam.pageNum++
        this.getList()
      }
    },
    switchTab(tab) {
      this.activeTab = tab
      this.queryParam.status = tab === 'all' ? undefined : tab
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    switchDim(dim) {
      this.activeDim = dim
      this.queryParam.category = dim || undefined
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    handleSearch() {
      this.queryParam.title = this.searchKey.trim() || undefined
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    handleClear() {
      this.searchKey = ''
      this.queryParam.title = undefined
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/sub-work/activity/add' })
    },
    goDetail(item) {
      uni.navigateTo({ url: `/pages/sub-work/activity/detail?id=${item.id}` })
    },
    formatStatus(val) {
      return STATUS_MAP[val] || val || '未知'
    },
    formatCategory(val) {
      return CATEGORY_MAP[val] || val || '-'
    },
    formatTargetType(val) {
      return val === '1' ? '指定班级' : '全校'
    },
    formatDate(val) {
      if (!val) return '-'
      const d = new Date(val.replace(/ /g, 'T'))
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6f8;
}
.top-row {
  display: flex;
  padding: 12px;
  gap: 10px;
  background: #fff;
}
.stats-card {
  flex: 1;
  background: linear-gradient(135deg, #f6f9ff, #eef4ff);
  border-radius: 10px;
  padding: 12px 8px;
}
.stats-row {
  display: flex;
  justify-content: space-around;
}
.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stats-num {
  font-size: 22px;
  font-weight: 700;
  color: #333;
}
.stats-num.orange { color: #ff9900; }
.stats-num.blue { color: #2979ff; }
.stats-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.add-btn-col {
  width: 60px;
  background: #2979ff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.add-btn-label {
  font-size: 12px;
  margin-top: 4px;
}
.search-bar {
  padding: 0 12px 10px;
  background: #fff;
}
.dim-bar {
  white-space: nowrap;
  background: #fff;
  padding: 0 12px 10px;
  border-bottom: 1px solid #eee;
}
.dim-item {
  display: inline-block;
  padding: 6px 12px;
  margin-right: 8px;
  font-size: 13px;
  color: #666;
  background: #f2f3f5;
  border-radius: 16px;
}
.dim-item.active {
  color: #fff;
  background: #2979ff;
}
.filter-bar {
  display: flex;
  background: #fff;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}
.filter-item {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: #666;
  padding: 6px 0;
}
.filter-item.active {
  color: #2979ff;
  font-weight: 600;
  border-bottom: 2px solid #2979ff;
}
.list-scroll {
  flex: 1;
  padding: 10px 12px;
}
.list-item {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
}
.item-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
}
.status-0 { background: #e6f3ff; color: #2979ff; }
.status-1 { background: #e8f5e9; color: #4caf50; }
.status-2 { background: #f5f5f5; color: #999; }
.item-row {
  display: flex;
  margin-top: 6px;
  font-size: 13px;
}
.item-label {
  color: #999;
  width: 70px;
}
.item-value {
  color: #333;
  flex: 1;
}
.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
</style>
