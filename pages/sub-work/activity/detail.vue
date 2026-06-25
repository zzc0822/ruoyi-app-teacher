<template>
  <view class="page-container">
    <!-- 活动信息 -->
    <view class="card" v-if="activity">
      <view class="card-title">{{ activity.title }}</view>
      <view class="info-row">
        <text class="info-label">状态</text>
        <text :class="['info-value', 'status-' + activity.status]">{{ formatStatus(activity.status) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">维度</text>
        <text class="info-value">{{ formatCategory(activity.category) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">范围</text>
        <text class="info-value">{{ formatTargetType(activity.targetType) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">开始时间</text>
        <text class="info-value">{{ activity.startTime }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">结束时间</text>
        <text class="info-value">{{ activity.endTime }}</text>
      </view>
      <view class="info-row" v-if="activity.signupEnd">
        <text class="info-label">报名截止</text>
        <text class="info-value">{{ activity.signupEnd }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">说明</text>
        <text class="info-value">{{ activity.description || '无' }}</text>
      </view>
    </view>

    <!-- 积分阶段 -->
    <view class="card" v-if="phases.length > 0">
      <view class="card-title">积分阶段</view>
      <view class="phase-item" v-for="(p, idx) in phases" :key="idx">
        <text class="phase-name">{{ p.sceneName }}</text>
        <text class="phase-score">{{ formatPoints(p) }}</text>
      </view>
    </view>

    <!-- 参与学生 -->
    <view class="card">
      <view class="section-header">
        <text class="card-title">参与学生</text>
        <view class="add-stu-btn" @click="goBatchAdd">
          <uni-icons type="plusempty" size="16" color="#fff"></uni-icons>
          <text>批量安排</text>
        </view>
      </view>
      <scroll-view scroll-y class="stu-scroll" @scrolltolower="loadMoreStu">
        <view class="stu-item" v-for="item in studentList" :key="item.id">
          <view class="stu-left">
            <text class="stu-name">{{ item.xm || '未知' }}</text>
            <text class="stu-xh">{{ item.xh }}</text>
            <text class="stu-status">{{ formatStuStatus(item.status) }}</text>
          </view>
          <view class="stu-actions">
            <text class="action-text" v-if="item.status === '0'" @click="updateStatus(item, '1')">标记参与</text>
            <text class="action-text absent" v-if="item.status === '0'" @click="updateStatus(item, '2')">标记弃权</text>
          </view>
        </view>
        <view class="empty-tip" v-if="!stuLoading && studentList.length === 0">
          <text>暂无学生</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { getActivity, getActivityPhases, listActivityStudents, updateStudentStatus } from '@/api/stumanage/activity'

const STATUS_MAP = { '0': '进行中', '1': '已结束', '2': '草稿' }
const STU_STATUS_MAP = { '0': '已报名', '1': '已参与', '2': '已弃权' }
const CATEGORY_MAP = {
  de: '德育', zhi: '智育', ti: '体育', mei: '美育', lao: '劳育', chuang: '创新创业'
}

export default {
  data() {
    return {
      activityId: null,
      activity: null,
      phases: [],
      studentList: [],
      stuQuery: { pageNum: 1, pageSize: 20 },
      stuTotal: 0,
      stuLoading: false
    }
  },
  onLoad(options) {
    this.activityId = Number(options.id)
    this.loadDetail()
    this.loadStudents()
  },
  methods: {
    loadDetail() {
      getActivity(this.activityId).then(res => {
        this.activity = res.data
      })
      getActivityPhases(this.activityId).then(res => {
        this.phases = res.data || []
      })
    },
    loadStudents() {
      if (this.stuLoading) return
      this.stuLoading = true
      listActivityStudents(this.activityId, this.stuQuery).then(res => {
        const rows = res.rows || []
        if (this.stuQuery.pageNum === 1) {
          this.studentList = rows
        } else {
          this.studentList = [...this.studentList, ...rows]
        }
        this.stuTotal = res.total || 0
      }).finally(() => {
        this.stuLoading = false
      })
    },
    loadMoreStu() {
      if (this.studentList.length < this.stuTotal) {
        this.stuQuery.pageNum++
        this.loadStudents()
      }
    },
    updateStatus(item, status) {
      const label = status === '1' ? '标记为已参与' : '标记为已弃权'
      uni.showModal({
        title: '确认',
        content: `将 ${item.xm || item.xh} ${label}？`,
        success: (res) => {
          if (res.confirm) {
            updateStudentStatus(item.id, status).then(() => {
              uni.showToast({ title: '操作成功', icon: 'success' })
              this.stuQuery.pageNum = 1
              this.loadStudents()
            }).catch(() => {
              uni.showToast({ title: '操作失败', icon: 'none' })
            })
          }
        }
      })
    },
    goBatchAdd() {
      uni.navigateTo({ url: `/pages/sub-work/activity/batch?id=${this.activityId}` })
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
    formatStuStatus(val) {
      return STU_STATUS_MAP[val] || val || '未知'
    },
    formatPoints(p) {
      if (p.pointMode === 'range') {
        return `${p.minPoints || 0}~${p.maxPoints || 0}分`
      }
      return `${p.points || 0}分`
    }
  }
}
</script>

<style scoped lang="scss">
.page-container {
  background-color: #f5f6f8;
  min-height: 100vh;
  padding: 12px;
}
.card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.add-stu-btn {
  display: flex;
  align-items: center;
  background: #2979ff;
  color: #fff;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
}
.info-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}
.info-label {
  color: #999;
  width: 80px;
}
.info-value {
  flex: 1;
  color: #333;
}
.status-0 { color: #2979ff; }
.status-1 { color: #4caf50; }
.status-2 { color: #999; }
.phase-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}
.phase-score {
  color: #ff9900;
  font-weight: 600;
}
.stu-scroll {
  max-height: 360px;
}
.stu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.stu-left {
  display: flex;
  flex-direction: column;
}
.stu-name {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}
.stu-xh {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.stu-status {
  font-size: 12px;
  color: #2979ff;
  margin-top: 2px;
}
.stu-actions {
  display: flex;
  gap: 10px;
}
.action-text {
  font-size: 13px;
  color: #2979ff;
}
.action-text.absent {
  color: #ff4d4f;
}
.empty-tip {
  text-align: center;
  color: #999;
  padding: 20px 0;
}
</style>
