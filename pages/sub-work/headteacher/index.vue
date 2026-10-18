<template>
  <view class="page-container">
    <!-- 工作量完成情况 -->
    <view class="workload-card">
      <view class="card-title">本学期工作量完成情况</view>
      <view class="workload-grid">
        <view class="workload-item">
          <view class="wl-circle" :class="meetingPercent >= 100 ? 'done' : ''">
            <text class="wl-num">{{ workload.meetingCompleted }}</text>
            <text class="wl-den">/{{ workload.meetingRequired }}</text>
          </view>
          <text class="wl-label">{{ chapterLabel('meeting', '班会') }}</text>
        </view>
        <!-- 谈话台账在「谈心谈话」里维护，点这一格直接过去 -->
        <view class="workload-item" @click="goTalk">
          <view class="wl-circle" :class="talkPercent >= 100 ? 'done' : ''">
            <text class="wl-num">{{ workload.talkCompleted }}</text>
            <text class="wl-den">/{{ workload.talkRequired }}</text>
          </view>
          <text class="wl-label">{{ chapterLabel('talk', '谈心谈话') }}</text>
        </view>
        <view class="workload-item">
          <view class="wl-circle" :class="dormPercent >= 100 ? 'done' : ''">
            <text class="wl-num">{{ workload.dormCompleted }}</text>
            <text class="wl-den">/{{ workload.dormRequired }}</text>
          </view>
          <text class="wl-label">{{ chapterLabel('dorm', '宿舍巡查') }}</text>
        </view>
      </view>
    </view>

    <!-- 我的班级 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">我的班级</text>
        <text class="section-count" v-if="classList.length > 0">共{{ classList.length }}个</text>
      </view>
      <view class="class-card" v-for="(cls, idx) in classList" :key="idx" @click="goClassDetail(cls)">
        <view class="cls-bar" :style="'background:' + colors[idx % colors.length]"></view>
        <view class="cls-info">
          <text class="cls-name">{{ cls.className }}</text>
          <text class="cls-sub">{{ cls.xydm || '' }}</text>
        </view>
        <uni-icons type="right" size="16" color="#ccc"></uni-icons>
      </view>
      <view class="empty" v-if="classList.length === 0">
        <text>暂无班主任任职记录</text>
        <text class="empty-link" @click="goApply">我想担任班主任，去申请</text>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">快捷操作</text>
      </view>
      <view class="action-grid">
        <view class="action-item" @click="goWorklogList">
          <uni-icons type="list" size="28" color="#2979ff"></uni-icons>
          <text class="action-text">工作记录</text>
        </view>
        <view class="action-item" @click="goWorklogAdd">
          <uni-icons type="plusempty" size="28" color="#18bc37"></uni-icons>
          <text class="action-text">新增记录</text>
        </view>
        <view class="action-item" @click="goTalk">
          <uni-icons type="chat-filled" size="28" color="#e43d33"></uni-icons>
          <text class="action-text">谈心谈话</text>
        </view>
        <view class="action-item" @click="goApply">
          <uni-icons type="person" size="28" color="#f3a044"></uni-icons>
          <text class="action-text">我的申请</text>
        </view>
        <view class="action-item" @click="goCertificate">
          <uni-icons type="paperplane" size="28" color="#9c27b0"></uni-icons>
          <text class="action-text">工作证明</text>
        </view>
      </view>
    </view>

    <!-- 我的申请记录 -->
    <view class="section" v-if="applyList.length > 0">
      <view class="section-header">
        <text class="section-title">申请记录</text>
        <text class="section-count" @click="goApply">继续申请</text>
      </view>
      <view class="apply-item" v-for="(item, idx) in applyList" :key="idx">
        <view class="apply-info">
          <text class="apply-xydm">申请学院：{{ item.applyCollegeName || item.applyXydm || '默认' }}</text>
          <text class="apply-time">{{ formatDate(item.createTime) }}</text>
          <text class="apply-time" v-if="item.status === '1'">
            {{ item.assignedFlag > 0 ? '已带班：' + item.assignClassNames : '待学院分配班级' }}
          </text>
        </view>
        <view class="apply-status" :class="statusClass(item.status)">
          {{ statusText(item.status) }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMyClasses, getMyWorkload, getMyApply, getWorklogContext } from '@/api/affair/headteacher'

export default {
  data() {
    return {
      classList: [],
      applyList: [],
      workload: {
        meetingCompleted: 0,
        meetingRequired: 4,
        talkCompleted: 0,
        talkRequired: 10,
        dormCompleted: 0,
        dormRequired: 4
      },
      chapters: [],
      colors: ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800']
    }
  },
  computed: {
    meetingPercent() {
      return this.workload.meetingRequired > 0 ? Math.round(this.workload.meetingCompleted / this.workload.meetingRequired * 100) : 0
    },
    talkPercent() {
      return this.workload.talkRequired > 0 ? Math.round(this.workload.talkCompleted / this.workload.talkRequired * 100) : 0
    },
    dormPercent() {
      return this.workload.dormRequired > 0 ? Math.round(this.workload.dormCompleted / this.workload.dormRequired * 100) : 0
    }
  },
  onShow() {
    this.loadData()
  },
  methods: {
    loadData() {
      this.loadClasses()
      this.loadChapters()
      this.loadWorkload()
      this.loadApply()
    },
    loadClasses() {
      getMyClasses().then(res => {
        this.classList = res.data || []
      }).catch(() => {})
    },
    loadChapters() {
      getWorklogContext().then(res => {
        this.chapters = (res.data && res.data.chapters) || []
      }).catch(() => {})
    },
    /** 章节名以班主任工作配置为准 */
    chapterLabel(type, fallback) {
      const hit = this.chapters.find(item => item.type === type)
      return hit && hit.typeName ? hit.typeName : fallback
    },
    loadWorkload() {
      getMyWorkload().then(res => {
        if (res.data) {
          this.workload = res.data
        }
      }).catch(() => {})
    },
    loadApply() {
      getMyApply().then(res => {
        this.applyList = res.data || []
      }).catch(() => {})
    },
    goClassDetail(cls) {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/class-detail?bjid=' + cls.bjid + '&className=' + encodeURIComponent(cls.className || '')
      })
    },
    goWorklogList() {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/worklog-list'
      })
    },
    goWorklogAdd() {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/worklog-add'
      })
    },
    goTalk() {
      uni.navigateTo({
        url: '/pages/sub-work/talk/index'
      })
    },
    goApply() {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/apply'
      })
    },
    goCertificate() {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/certificate'
      })
    },
    statusText(status) {
      const map = { '0': '待审核', '1': '已通过', '2': '已驳回', '3': '已撤回' }
      return map[status] || '未知'
    },
    statusClass(status) {
      const map = { '0': 'pending', '1': 'success', '2': 'danger', '3': 'info' }
      return map[status] || ''
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return dateStr.substring(0, 10)
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 20rpx;
}

.workload-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.workload-grid {
  display: flex;
  justify-content: space-around;
}

.workload-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.wl-circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0f7ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #2979ff;

  &.done {
    background: #e8f8ea;
    border-color: #18bc37;
  }
}

.wl-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #2979ff;
}

.wl-circle.done .wl-num {
  color: #18bc37;
}

.wl-den {
  font-size: 22rpx;
  color: #999;
}

.wl-label {
  font-size: 24rpx;
  color: #666;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.section-count {
  font-size: 24rpx;
  color: #999;
}

.class-card {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #f9f9f9;
  }
}

.cls-bar {
  width: 8rpx;
  height: 48rpx;
  border-radius: 4rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.cls-info {
  flex: 1;
}

.cls-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
}

.cls-sub {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

.empty {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}

.empty-link {
  display: block;
  margin-top: 12rpx;
  color: #2979ff;
  font-size: 26rpx;
}

.action-grid {
  display: flex;
  justify-content: space-around;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0;

  &:active {
    opacity: 0.7;
  }
}

.action-text {
  font-size: 24rpx;
  color: #666;
}

.apply-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.apply-info {
  flex: 1;
}

.apply-xydm {
  font-size: 26rpx;
  color: #333;
  display: block;
}

.apply-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

.apply-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  &.pending { color: #f3a044; background: #fef3e2; }
  &.success { color: #18bc37; background: #e8f8ea; }
  &.danger { color: #e43d33; background: #fce8ec; }
  &.info { color: #999; background: #f5f5f5; }
}
</style>
