<template>
  <view class="page-container">
    <!-- 顶部统计 + 新增按钮 -->
    <view class="top-row">
      <view class="stats-card">
        <view class="stats-date">
          <text class="stats-date-text">谈心谈话</text>
        </view>
        <view class="stats-row">
          <view class="stats-item">
            <text class="stats-num">{{ stats.total || 0 }}</text>
            <text class="stats-label">全部</text>
          </view>
          <view class="stats-item">
            <text class="stats-num blue">{{ stats.pending || 0 }}</text>
            <text class="stats-label">待谈话</text>
          </view>
          <view class="stats-item">
            <text class="stats-num orange">{{ stats.ongoing || 0 }}</text>
            <text class="stats-label">进行中</text>
          </view>
          <view class="stats-item">
            <text class="stats-num green">{{ stats.completed || 0 }}</text>
            <text class="stats-label">已完成</text>
          </view>
        </view>
      </view>
      <view class="add-btn-col" @click="goAdd">
        <uni-icons type="plusempty" size="28" color="#fff"></uni-icons>
        <text class="add-btn-label">新增</text>
      </view>
    </view>

    <!-- 待谈话提醒（可折叠） -->
    <view class="pending-section" v-if="pendingList.length > 0">
      <view class="pending-bar" @click="showPending = !showPending">
        <view class="pending-left">
          <view class="pending-dot"></view>
          <text class="pending-text">待谈话 {{ pendingList.length }} 条</text>
        </view>
        <uni-icons :type="showPending ? 'up' : 'down'" size="14" color="#e43d33"></uni-icons>
      </view>
      <view class="pending-list" v-if="showPending">
        <view class="pending-item" v-for="(item, index) in pendingList" :key="index" @click="goDetail(item)">
          <view class="pi-left">
            <text class="pi-name">{{ item.studentNames || '未知学生' }}</text>
            <text class="pi-type">{{ formatTalkCategory(item.talkCategory) }}</text>
          </view>
          <view class="pi-right">
            <text :class="['pi-urgency', 'urg-' + (item.urgency || 'normal')]">{{ formatUrgency(item.urgency) }}</text>
            <text class="pi-deadline" v-if="item.deadline">{{ formatDeadline(item.deadline) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view :class="['filter-btn', filterStatus === '' ? 'filter-active' : '']" @click="setFilter('')">
        <text>全部</text>
      </view>
      <view :class="['filter-btn', filterStatus === 'pending' ? 'filter-active' : '']" @click="setFilter('pending')">
        <text>待谈话</text>
      </view>
      <view :class="['filter-btn', filterStatus === 'ongoing' ? 'filter-active' : '']" @click="setFilter('ongoing')">
        <text>进行中</text>
      </view>
      <view :class="['filter-btn', filterStatus === 'completed' ? 'filter-active' : '']" @click="setFilter('completed')">
        <text>已完成</text>
      </view>
    </view>

    <!-- 谈话记录列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="list-item" v-for="(item, index) in list" :key="index" @click="goDetail(item)">
        <!-- 左侧色条 -->
        <view :class="['item-bar', 'bar-' + (item.talkCategory || 'daily')]"></view>
        <view class="item-content">
          <view class="item-header">
            <text class="item-name">{{ item.studentNames || item.talkName || '未知' }}</text>
            <text :class="['item-status', item.talkStatus === 'completed' ? 'st-done' : item.talkStatus === 'ongoing' ? 'st-ongoing' : 'st-pending']">
              {{ formatStatus(item.talkStatus) }}
            </text>
          </view>
          <view class="item-meta">
            <text :class="['item-category', 'cat-' + (item.talkCategory || 'daily')]">{{ formatTalkCategory(item.talkCategory) }}</text>
            <text class="item-info">{{ item.studentCount || 0 }}人</text>
            <text class="item-info" v-if="item.talkTime">{{ formatTime(item.talkTime) }}</text>
          </view>
          <view class="item-detail" v-if="item.talkPlace">
            <text class="item-place">📍 {{ item.talkPlace }}</text>
          </view>
          <view class="item-detail" v-if="item.talkType">
            <text class="item-types">📋 {{ formatTalkTypes(item.talkType) }}</text>
          </view>
          <view class="item-bottom">
            <text class="item-deadline" v-if="item.deadline && item.talkStatus !== 'completed'">
              截止：{{ formatDeadline(item.deadline) }}
            </text>
            <text class="item-attach" v-if="item.attachmentCount > 0">📎 {{ item.attachmentCount }}</text>
          </view>
          <!-- 附件缩略图 -->
          <view class="item-attach-list" v-if="item.attachmentList && item.attachmentList.length > 0" @click.stop>
            <view class="attach-thumb-wrap" v-for="(att, ai) in item.attachmentList.filter(a => a.mediaType === 'image').slice(0, 3)" :key="ai" @click="previewPhoto(item.attachmentList, ai)">
              <image :src="baseUrl + '/profile' + att.filePath" mode="aspectFill" class="attach-thumb"></image>
            </view>
            <view class="attach-file-tag" v-if="item.attachmentList.some(a => a.mediaType !== 'image')">
              <text>{{ item.attachmentList.filter(a => a.mediaType !== 'image').length }}个文件</text>
            </view>
          </view>
        </view>
      </view>
      <uni-load-more :status="loadStatus" @clickLoadMore="loadMore"></uni-load-more>
    </scroll-view>
  </view>
</template>

<script>
import { listTalk, getPendingTalks } from '@/api/stumanage/talk'
import config from '@/config'

export default {
  data() {
    return {
      baseUrl: config.baseUrl,
      queryParam: { pageNum: 1, pageSize: 20 },
      list: [],
      total: 0,
      loadStatus: 'more',
      pendingList: [],
      showPending: true,
      filterStatus: '',
      stats: { total: 0, pending: 0, ongoing: 0, completed: 0 }
    }
  },
  onLoad() {
    this.getList()
    this.getPending()
  },
  onShow() {
    if (this.list.length > 0 || this._loaded) {
      this.queryParam.pageNum = 1
      this.getList()
      this.getPending()
    }
    this._loaded = true
  },
  methods: {
    getList() {
      this.loadStatus = 'loading'
      const params = { ...this.queryParam }
      if (this.filterStatus) {
        params.talkStatus = this.filterStatus
      }
      listTalk(params).then(res => {
        const rows = res.rows || []
        if (this.queryParam.pageNum === 1) {
          this.list = rows
        } else {
          this.list = [...this.list, ...rows]
        }
        this.total = res.total || 0
        this.loadStatus = this.list.length >= this.total ? 'noMore' : 'more'
        this.calcStats(rows)
      }).catch(() => { this.loadStatus = 'more' })
    },
    calcStats(latestRows) {
      // 用最新一批数据来估算统计，完整统计需后端接口
      // 这里用 pendingList 计算 pending，其余从列表推算
      this.stats.pending = this.pendingList.length
      this.stats.ongoing = this.list.filter(i => i.talkStatus === 'ongoing').length
      this.stats.completed = this.list.filter(i => i.talkStatus === 'completed').length
      this.stats.total = this.total
    },
    getPending() {
      getPendingTalks().then(res => {
        this.pendingList = res.data || []
        this.stats.pending = this.pendingList.length
      }).catch(() => {})
    },
    loadMore() {
      if (this.list.length < this.total) {
        this.queryParam.pageNum++
        this.getList()
      }
    },
    setFilter(status) {
      this.filterStatus = status
      this.queryParam.pageNum = 1
      this.getList()
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/work/talk/add' })
    },
    goDetail(item) {
      uni.navigateTo({ url: '/pages/work/talk/add?id=' + item.id })
    },
    formatTalkCategory(val) {
      const map = { daily: '日常谈心', disciplinary: '违纪谈话' }
      return map[val] || val || '日常谈心'
    },
    formatStatus(val) {
      const map = { pending: '待谈话', ongoing: '进行中', completed: '已完成' }
      return map[val] || '待谈话'
    },
    formatUrgency(val) {
      const map = { overdue: '已逾期', today: '今日截止', tomorrow: '明日截止', normal: '常规' }
      return map[val] || ''
    },
    formatTalkTypes(val) {
      if (!val) return ''
      const map = { ideological: '思想动态', psychological: '心理健康', academic: '学业指导', career: '就业指导', life: '生活关怀', discipline: '纪律教育', other: '其他' }
      return val.split(',').map(v => map[v] || v).join('、')
    },
    formatTime(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    },
    formatDeadline(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    },
    previewPhoto(attachmentList, index) {
      const imageList = attachmentList.filter(a => a.mediaType === 'image')
      const urls = imageList.map(a => this.baseUrl + '/profile' + a.filePath)
      const currentUrl = imageList[index] ? (this.baseUrl + '/profile' + imageList[index].filePath) : urls[0]
      uni.previewImage({
        current: currentUrl,
        urls: urls
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f7;
}

/* ===== 顶部统计+新增 ===== */
.top-row {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  padding: 20rpx 20rpx 0;
}

.stats-card {
  flex: 0 0 75%;
  background: linear-gradient(135deg, #f3a044, #e07e1c);
  border-radius: 20rpx;
  padding: 24rpx;
}

.stats-date {
  text-align: center;
  margin-bottom: 16rpx;
}

.stats-date-text {
  font-size: 26rpx;
  color: rgba(255,255,255,0.9);
  font-weight: 500;
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
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  &.blue { color: #a0cfff; }
  &.orange { color: #fbbd3c; }
  &.green { color: #a5d6a7; }
}

.stats-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  margin-top: 6rpx;
}

.add-btn-col {
  flex: 1;
  background: linear-gradient(135deg, #18bc37, #0fad2e);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.add-btn-label {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

/* ===== 待谈话 ===== */
.pending-section {
  margin: 20rpx 20rpx 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.pending-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fef0f0;
}

.pending-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pending-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #e43d33;
}

.pending-text {
  font-size: 28rpx;
  color: #e43d33;
  font-weight: bold;
}

.pending-list {
  padding: 0 24rpx;
}

.pending-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.pending-item:last-child {
  border-bottom: none;
}

.pi-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pi-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.pi-type {
  font-size: 22rpx;
  color: #999;
}

.pi-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.pi-urgency {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  &.urg-overdue { color: #e43d33; background: #ffebee; }
  &.urg-today { color: #f3a044; background: #fef3e2; }
  &.urg-tomorrow { color: #2979ff; background: #e8f0ff; }
  &.urg-normal { color: #18bc37; background: #e8f8ea; }
}

.pi-deadline {
  font-size: 20rpx;
  color: #999;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 20rpx 10rpx;
}

.filter-btn {
  padding: 8rpx 24rpx;
  border-radius: 30rpx;
  background: #fff;
  font-size: 24rpx;
  color: #666;
}

.filter-active {
  background: #f3a044;
  color: #fff;
}

/* ===== 列表 ===== */
.list-scroll {
  flex: 1;
  padding: 0 20rpx 20rpx;
}

.list-item {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  display: flex;
  overflow: hidden;
}

.item-bar {
  width: 8rpx;
  flex-shrink: 0;
  &.bar-daily { background: #00bcd4; }
  &.bar-disciplinary { background: #e43d33; }
}

.item-content {
  flex: 1;
  padding: 24rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.item-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.item-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  &.st-done { color: #18bc37; background: #e8f8ea; }
  &.st-ongoing { color: #2979ff; background: #e8f0ff; }
  &.st-pending { color: #f3a044; background: #fef3e2; }
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 10rpx;
}

.item-category {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  &.cat-daily { color: #00bcd4; background: #e0f7fa; }
  &.cat-disciplinary { color: #e43d33; background: #ffebee; }
}

.item-info {
  font-size: 24rpx;
  color: #999;
}

.item-detail {
  margin-bottom: 8rpx;
}

.item-place {
  font-size: 24rpx;
  color: #666;
}

.item-types {
  font-size: 24rpx;
  color: #666;
}

.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
}

.item-deadline {
  font-size: 22rpx;
  color: #e43d33;
}

.item-attach {
  font-size: 22rpx;
  color: #999;
}

.item-attach-list {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
  flex-wrap: wrap;
  align-items: center;
}

.attach-thumb-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.attach-thumb {
  width: 120rpx;
  height: 120rpx;
}

.attach-file-tag {
  padding: 6rpx 16rpx;
  background: #f5f6f7;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #666;
}
</style>
