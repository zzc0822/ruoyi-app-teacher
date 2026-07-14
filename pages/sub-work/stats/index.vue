<template>
  <view class="stats-page">
    <!-- 模块切换 -->
    <view class="module-tabs">
      <view class="tab-item" :class="{ active: currentModule === 'overview' }" @click="switchModule('overview')">
        <text>综合概览</text>
      </view>
      <view class="tab-item" :class="{ active: currentModule === 'vehicle' }" @click="switchModule('vehicle')">
        <text>车辆</text>
      </view>
      <view class="tab-item" :class="{ active: currentModule === 'offcampus' }" @click="switchModule('offcampus')">
        <text>外宿</text>
      </view>
      <view class="tab-item" :class="{ active: currentModule === 'classCheck' }" @click="switchModule('classCheck')">
        <text>查课</text>
      </view>
      <view class="tab-item" :class="{ active: currentModule === 'leave' }" @click="switchModule('leave')">
        <text>请假</text>
      </view>
      <view class="tab-item" :class="{ active: currentModule === 'talk' }" @click="switchModule('talk')">
        <text>谈话</text>
      </view>
      <view class="tab-item" :class="{ active: currentModule === 'activity' }" @click="switchModule('activity')">
        <text>活动</text>
      </view>
    </view>

    <!-- 综合概览 -->
    <view class="stats-content" v-if="currentModule === 'overview'">
      <view class="overview-grid">
        <!-- 车辆登记 -->
        <view class="stat-card" @click="switchModule('vehicle')">
          <view class="card-title">车辆登记</view>
          <view class="card-number">{{ overview.vehicle.total || 0 }}</view>
          <view class="card-detail">
            <text>待核实 {{ overview.vehicle.pending || 0 }}</text>
            <text>已通过 {{ overview.vehicle.verified || 0 }}</text>
          </view>
        </view>
        <!-- 外宿申请 -->
        <view class="stat-card" @click="switchModule('offcampus')">
          <view class="card-title">外宿申请</view>
          <view class="card-number">{{ overview.offcampus.total || 0 }}</view>
          <view class="card-detail">
            <text>待审批 {{ overview.offcampus.pending_verify || 0 }}</text>
            <text>已通过 {{ overview.offcampus.approved || 0 }}</text>
          </view>
        </view>
        <!-- 查课记录 -->
        <view class="stat-card" @click="switchModule('classCheck')">
          <view class="card-title">查课记录</view>
          <view class="card-number">{{ overview.classCheck.total || 0 }}</view>
          <view class="card-detail">
            <text>已查课 {{ overview.classCheck.checked || 0 }}</text>
            <text>未查课 {{ overview.classCheck.unchecked || 0 }}</text>
          </view>
        </view>
        <!-- 请假管理 -->
        <view class="stat-card" @click="switchModule('leave')">
          <view class="card-title">请假管理</view>
          <view class="card-number">{{ overview.leave.total || 0 }}</view>
          <view class="card-detail">
            <text>待审批 {{ overview.leave.pending || 0 }}</text>
            <text>在假中 {{ overview.leave.onLeave || 0 }}</text>
          </view>
        </view>
        <!-- 谈心谈话 -->
        <view class="stat-card" @click="switchModule('talk')">
          <view class="card-title">谈心谈话</view>
          <view class="card-number">{{ overview.talk.total || 0 }}</view>
          <view class="card-detail">
            <text>待谈话 {{ overview.talk.pending || 0 }}</text>
            <text>已完成 {{ overview.talk.completed || 0 }}</text>
          </view>
        </view>
        <!-- 活动记录 -->
        <view class="stat-card" @click="switchModule('activity')">
          <view class="card-title">活动记录</view>
          <view class="card-number">{{ overview.activity.total || 0 }}</view>
          <view class="card-detail">
            <text>进行中 {{ overview.activity.ongoing || 0 }}</text>
            <text>已结束 {{ overview.activity.ended || 0 }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 单模块详情 -->
    <view class="stats-content" v-else>
      <!-- 按辅导员分组统计 -->
      <view class="section-title" v-if="isSecretary">按辅导员分组统计</view>
      <view class="counselor-list" v-if="isSecretary && counselorStats.length > 0">
        <view class="counselor-item" v-for="(item, index) in counselorStats" :key="index">
          <view class="counselor-name">{{ item.counselorName || '未分配' }}</view>
          <view class="counselor-stats">
            <text>总数: {{ item.total || 0 }}</text>
            <text v-if="item.pending">待处理: {{ item.pending }}</text>
            <text v-if="item.pending_verify">待审批: {{ item.pending_verify }}</text>
            <text v-if="item.verified">已通过: {{ item.verified }}</text>
            <text v-if="item.approved">已批准: {{ item.approved }}</text>
            <text v-if="item.completed">已完成: {{ item.completed }}</text>
            <text v-if="item.rejected">已驳回: {{ item.rejected }}</text>
          </view>
        </view>
      </view>

      <!-- 汇总统计 -->
      <view class="section-title">汇总统计</view>
      <view class="summary-stats">
        <view class="stat-row" v-for="(value, key) in moduleStats" :key="key">
          <text class="stat-label">{{ getStatLabel(key) }}</text>
          <text class="stat-value">{{ value || 0 }}</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-tip" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
import { getModuleOverview, getModuleStatsByCounselor } from '@/api/student/moduleStats'
import { isSecretary } from '@/utils/role'

export default {
  data() {
    return {
      loading: false,
      currentModule: 'overview',
      overview: {
        vehicle: {},
        offcampus: {},
        classCheck: {},
        leave: {},
        talk: {},
        activity: {}
      },
      moduleStats: {},
      counselorStats: [],
      roles: []
    }
  },
  computed: {
    isSecretary() {
      return isSecretary(this.roles)
    }
  },
  onLoad() {
    this.roles = uni.getStorageSync('roles') || []
    this.loadOverview()
  },
  methods: {
    async loadOverview() {
      this.loading = true
      try {
        const res = await getModuleOverview()
        if (res.code === 200) {
          this.overview = res.data || this.overview
        }
      } catch (e) {
        // 加载统计数据失败
      } finally {
        this.loading = false
      }
    },
    async switchModule(module) {
      this.currentModule = module
      if (module === 'overview') {
        this.loadOverview()
        return
      }
      this.loading = true
      try {
        // 加载模块汇总统计
        const res = await getModuleOverview()
        if (res.code === 200) {
          this.moduleStats = res.data[module] || {}
        }
        // 书记加载按辅导员分组统计
        if (this.isSecretary) {
          const counselorRes = await getModuleStatsByCounselor(module)
          if (counselorRes.code === 200) {
            this.counselorStats = counselorRes.data || []
          }
        }
      } catch (e) {
        // 加载模块统计失败
      } finally {
        this.loading = false
      }
    },
    getStatLabel(key) {
      const labels = {
        total: '总数',
        pending: '待处理',
        pending_verify: '待审批',
        verified: '已通过',
        rejected: '已驳回',
        approved: '已批准',
        counselor_approved: '书记已批',
        secretary_approved: '书记已批',
        student_affairs_approved: '学生处已批',
        onLeave: '在假中',
        completed: '已完成',
        checked: '已查课',
        unchecked: '未查课',
        totalStudents: '涉及学生',
        presentCount: '出勤人数',
        absentCount: '缺勤人数',
        ongoing: '进行中',
        ended: '已结束'
      }
      return labels[key] || key
    }
  }
}
</script>

<style lang="scss" scoped>
.stats-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.module-tabs {
  display: flex;
  flex-wrap: wrap;
  background: #fff;
  padding: 10rpx;
  position: sticky;
  top: 0;
  z-index: 10;
  
  .tab-item {
    flex: 1;
    min-width: calc(25% - 20rpx);
    text-align: center;
    padding: 16rpx 10rpx;
    margin: 5rpx;
    border-radius: 8rpx;
    font-size: 26rpx;
    color: #666;
    
    &.active {
      background: #1890ff;
      color: #fff;
    }
  }
}

.stats-content {
  padding: 20rpx;
}

.overview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  
  .stat-card {
    width: calc(50% - 10rpx);
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
    
    .card-title {
      font-size: 28rpx;
      color: #666;
      margin-bottom: 12rpx;
    }
    
    .card-number {
      font-size: 48rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 12rpx;
    }
    
    .card-detail {
      display: flex;
      justify-content: space-between;
      font-size: 24rpx;
      color: #999;
    }
  }
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin: 20rpx 0;
  padding-left: 10rpx;
  border-left: 6rpx solid #1890ff;
}

.counselor-list {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  
  .counselor-item {
    padding: 24rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .counselor-name {
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 12rpx;
    }
    
    .counselor-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 20rpx;
      font-size: 26rpx;
      color: #666;
    }
  }
}

.summary-stats {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .stat-label {
      font-size: 28rpx;
      color: #666;
    }
    
    .stat-value {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
}

.loading-tip {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}
</style>
