<template>
  <view class="container">
    <!-- 阶段筛选 -->
    <view class="filter-bar">
      <view :class="['filter-item', currentStage === '' ? 'active' : '']" @click="filterBy('')">全部</view>
      <view :class="['filter-item', currentStage === 'APPLICANT' ? 'active' : '']" @click="filterBy('APPLICANT')">申请人</view>
      <view :class="['filter-item', currentStage === 'ACTIVIST' ? 'active' : '']" @click="filterBy('ACTIVIST')">积极分子</view>
      <view :class="['filter-item', currentStage === 'TARGET' ? 'active' : '']" @click="filterBy('TARGET')">发展对象</view>
      <view :class="['filter-item', currentStage === 'PROBATIONARY' ? 'active' : '']" @click="filterBy('PROBATIONARY')">预备党员</view>
      <view :class="['filter-item', currentStage === 'FORMAL' ? 'active' : '']" @click="filterBy('FORMAL')">正式党员</view>
    </view>

    <!-- 成员列表 -->
    <view v-if="list.length === 0" class="empty">暂无数据</view>
    <view v-for="item in list" :key="item.memberId" class="member-card" @click="viewDetail(item.memberId)">
      <view class="card-top">
        <text class="member-name">{{ item.studentName || item.xh }}</text>
        <text class="stage-tag" :class="'stage-' + item.currentStage">{{ stageLabel(item.currentStage) }}</text>
      </view>
      <view class="card-bottom">
        <text class="meta">学号：{{ item.xh }}</text>
        <text class="meta" v-if="item.applyDate">申请：{{ item.applyDate.substring(0, 10) }}</text>
        <text class="meta" v-if="item.introducer1">介绍人：{{ item.introducer1 }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party'

const stageMap = { APPLICANT: '入党申请人', ACTIVIST: '积极分子', TARGET: '发展对象', PROBATIONARY: '预备党员', FORMAL: '正式党员' }

export default {
  data() {
    return {
      list: [],
      currentStage: ''
    }
  },
  onLoad(options) {
    this.currentStage = options.stage || ''
    this.loadData()
  },
  methods: {
    stageLabel(code) { return stageMap[code] || code },
    filterBy(stage) {
      this.currentStage = stage
      this.loadData()
    },
    loadData() {
      uni.showLoading({ title: '加载中...' })
      const query = {}
      if (this.currentStage) query.currentStage = this.currentStage
      partyApi.branchMembers(query).then(res => {
        uni.hideLoading()
        this.list = res.data || []
      }).catch(() => { uni.hideLoading() })
    },
    viewDetail(memberId) {
      uni.navigateTo({ url: '/pages/sub-work/party/memberDetail?id=' + memberId })
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.empty { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 20rpx; background: #fff; border-radius: 12rpx; padding: 16rpx; }
.filter-item { padding: 10rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; color: #606266; background: #f5f7fa; }
.filter-item.active { background: #409EFF; color: #fff; }

.member-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.member-name { font-size: 30rpx; font-weight: bold; color: #303133; }
.stage-tag { padding: 4rpx 16rpx; border-radius: 16rpx; font-size: 22rpx; color: #fff; }
.stage-APPLICANT { background: #909399; }
.stage-ACTIVIST { background: #409EFF; }
.stage-TARGET { background: #E6A23C; }
.stage-PROBATIONARY { background: #F56C6C; }
.stage-FORMAL { background: #67C23A; }
.card-bottom { display: flex; flex-wrap: wrap; gap: 16rpx; }
.meta { font-size: 24rpx; color: #909399; }
</style>
