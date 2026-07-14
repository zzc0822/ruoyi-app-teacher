<template>
  <view class="container">
    <!-- 支部筛选（仅书记模式且有多个支部时显示） -->
    <view v-if="mode === 'secretary' && branches.length > 1" class="branch-filter">
      <view :class="['bf-item', selectedBranchIds.length === 0 ? 'active' : '']" @click="filterBranch(0)">全部支部</view>
      <view v-for="b in branches" :key="b.branchId"
            :class="['bf-item', selectedBranchIds.includes(b.branchId) ? 'active' : '']"
            @click="filterBranch(b.branchId)">
        {{ b.branchName }}
      </view>
    </view>

    <!-- 阶段筛选 -->
    <view class="filter-bar">
      <view :class="['filter-item', currentStage === '' ? 'active' : '']" @click="filterBy('')">全部</view>
      <view :class="['filter-item', currentStage === 'APPLICANT' ? 'active' : '']" @click="filterBy('APPLICANT')">申请人</view>
      <view :class="['filter-item', currentStage === 'ACTIVIST' ? 'active' : '']" @click="filterBy('ACTIVIST')">积极分子</view>
      <view :class="['filter-item', currentStage === 'TARGET' ? 'active' : '']" @click="filterBy('TARGET')">发展对象</view>
      <view :class="['filter-item', currentStage === 'PROBATIONARY' ? 'active' : '']" @click="filterBy('PROBATIONARY')">预备党员</view>
      <view :class="['filter-item', currentStage === 'FORMAL' ? 'active' : '']" @click="filterBy('FORMAL')">正式党员</view>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <u-icon name="search" size="18" color="#909399"></u-icon>
      <input class="search-input" type="text" placeholder="搜索姓名/学号/工号/手机号" 
             :value="searchKeyword" @input="onSearchInput" confirm-type="search" />
      <u-icon v-if="searchKeyword" name="close-circle-fill" size="18" color="#c0c4cc" @click="clearSearch"></u-icon>
    </view>

    <!-- 统计栏 -->
    <view class="summary-bar" v-if="filteredList.length > 0">
      <text class="summary-text">共 {{ filteredList.length }} 人</text>
      <text class="summary-text">学生 {{ studentCount }} 人</text>
      <text class="summary-text">教师 {{ teacherCount }} 人</text>
    </view>

    <!-- 成员列表 -->
    <view v-if="filteredList.length === 0" class="empty">暂无数据</view>
    <view v-for="item in filteredList" :key="item.memberId" class="member-card" @click="viewDetail(item.memberId)">
      <!-- 第一行：姓名 + 工号/学号 + 阶段 -->
      <view class="row-main">
        <text class="member-name">{{ item.memberName || item.studentName || item.xh }}</text>
        <text class="xh-text">{{ item.memberType === 'teacher' ? '工号' : '学号' }}：{{ item.xh }}</text>
        <text class="stage-tag" :class="'stage-' + item.currentStage">{{ stageLabel(item.currentStage) }}</text>
      </view>
      <!-- 第二行：其他信息 -->
      <view class="row-sub">
        <text class="meta" v-if="item.archiveNo">档案：{{ item.archiveNo }}</text>
        <text class="meta" v-if="item.applyDate">申请：{{ item.applyDate.substring(0, 10) }}</text>
        <text class="meta" v-if="item.branchName">支部：{{ item.branchName }}</text>
        <text class="meta" v-if="item.lastFeeDate">党费：{{ item.lastFeeDate.substring(0, 10) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party/party'

const stageMap = { APPLICANT: '入党申请人', ACTIVIST: '积极分子', TARGET: '发展对象', PROBATIONARY: '预备党员', FORMAL: '正式党员' }

export default {
  data() {
    return {
      list: [],
      allList: [], // 全量数据（用于支部筛选）
      currentStage: '',
      mode: 'secretary',
      branches: [],
      selectedBranchIds: [],
      searchKeyword: ''
    }
  },
  computed: {
    filteredList() {
      let list = this.selectedBranchIds.length === 0 ? this.list : this.list.filter(item => this.selectedBranchIds.includes(item.branchId))
      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase()
        list = list.filter(item => {
          const name = (item.memberName || item.studentName || '').toLowerCase()
          const xh = (item.xh || '').toLowerCase()
          const phone = (item.phone || '').toLowerCase()
          return name.includes(kw) || xh.includes(kw) || phone.includes(kw)
        })
      }
      return list
    },
    studentCount() {
      return this.filteredList.filter(i => i.memberType === 'student').length
    },
    teacherCount() {
      return this.filteredList.filter(i => i.memberType === 'teacher').length
    }
  },
  onLoad(options) {
    this.currentStage = options.stage || ''
    this.mode = options.mode || 'secretary'
    if (options.branchIds) {
      this.selectedBranchIds = options.branchIds.split(',').map(Number)
    }
    if (options.keyword) {
      this.searchKeyword = decodeURIComponent(options.keyword)
    }
    this.loadData()
  },
  methods: {
    stageLabel(code) { return stageMap[code] || code },
    filterBy(stage) {
      this.currentStage = stage
      this.loadData()
    },
    filterBranch(branchId) {
      if (branchId === 0) {
        this.selectedBranchIds = []
      } else {
        const idx = this.selectedBranchIds.indexOf(branchId)
        if (idx >= 0) {
          this.selectedBranchIds.splice(idx, 1)
        } else {
          this.selectedBranchIds.push(branchId)
        }
      }
    },
    loadData() {
      uni.showLoading({ title: '加载中...' })
      const query = {}
      if (this.currentStage) query.currentStage = this.currentStage

      const apiCall = this.mode === 'counselor'
        ? partyApi.counselorMembers(query)
        : partyApi.branchMembers(query)

      apiCall.then(res => {
        uni.hideLoading()
        this.list = res.data || []
        // 加载支部列表（书记模式）
        if (this.mode === 'secretary' && this.branches.length === 0) {
          partyApi.childBranches().then(r => {
            this.branches = r.data || []
          })
        }
      }).catch(() => { uni.hideLoading() })
    },
    viewDetail(memberId) {
      uni.navigateTo({ url: '/pages/sub-work/party/memberDetail?id=' + memberId })
    },
    onSearchInput(e) {
      this.searchKeyword = e.detail.value || ''
    },
    clearSearch() {
      this.searchKeyword = ''
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
/* 搜索框 */
.search-bar { display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 16rpx 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.search-input { flex: 1; margin: 0 16rpx; font-size: 28rpx; color: #303133; }

.empty { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }

/* 支部筛选 */
.branch-filter { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 16rpx; background: #fff; border-radius: 12rpx; padding: 16rpx; }
.bf-item { padding: 8rpx 20rpx; border-radius: 16rpx; font-size: 24rpx; color: #606266; background: #f0f2f5; }
.bf-item.active { background: #e8f4ff; color: #409EFF; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; background: #fff; border-radius: 12rpx; padding: 16rpx; }
.filter-item { padding: 10rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; color: #606266; background: #f0f2f5; }
.filter-item.active { background: #409EFF; color: #fff; }

/* 统计栏 */
.summary-bar { display: flex; gap: 20rpx; margin-bottom: 16rpx; padding: 0 8rpx; }
.summary-text { font-size: 24rpx; color: #909399; }

.member-card { background: #fff; border-radius: 8rpx; padding: 16rpx 20rpx; margin-bottom: 8rpx; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.03); }
.row-main { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.member-name { font-size: 28rpx; font-weight: bold; color: #303133; flex-shrink: 0; }
.xh-text { font-size: 24rpx; color: #606266; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage-tag { padding: 2rpx 12rpx; border-radius: 12rpx; font-size: 20rpx; color: #fff; flex-shrink: 0; }
.stage-APPLICANT { background: #909399; }
.stage-ACTIVIST { background: #409EFF; }
.stage-TARGET { background: #E6A23C; }
.stage-PROBATIONARY { background: #F56C6C; }
.stage-FORMAL { background: #67C23A; }
.row-sub { display: flex; flex-wrap: wrap; gap: 16rpx; }
.meta { font-size: 22rpx; color: #909399; }
</style>
