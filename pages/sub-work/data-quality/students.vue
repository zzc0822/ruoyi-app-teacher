<template>
  <view class="student-page">
    <view class="summary-band">
      <text class="summary-issue">{{ issueLabel }}</text>
      <text class="summary-group">{{ groupLabel || '未分组' }}</text>
      <view class="summary-count">
        <text class="count-value">{{ total }}</text>
        <text class="count-label">名学生</text>
      </view>
    </view>

    <view class="search-bar">
      <view class="search-box">
        <uni-icons type="search" size="16" color="#94a3b8"></uni-icons>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="学号 / 姓名"
          @confirm="search"
        />
        <view v-if="keyword" class="search-clear" @click="clearSearch">
          <uni-icons type="clear" size="16" color="#94a3b8"></uni-icons>
        </view>
      </view>
      <view class="search-btn" @click="search">查询</view>
    </view>

    <view v-if="loading && !students.length" class="page-state">
      <text>学生加载中...</text>
    </view>
    <view v-else-if="loadError && !students.length" class="page-state" @click="reload">
      <text>{{ loadError }}</text>
      <text class="state-action">点击重试</text>
    </view>
    <view v-else-if="students.length" class="student-list">
      <view v-for="(item, index) in students" :key="index" class="student-row">
        <view class="student-main">
          <view class="student-name-row">
            <text class="student-name">{{ item.studentName || '未命名' }}</text>
            <text class="student-xh">{{ item.xh || '无学号' }}</text>
          </view>
          <text class="student-class">{{ item.className || item.bjdm || '未归属班级' }}</text>
          <text class="student-major">
            {{ [item.collegeName, item.grade ? item.grade + '级' : '', item.majorName].filter(Boolean).join(' · ') || '专业信息缺失' }}
          </text>
        </view>
      </view>
      <view class="load-more">
        <text v-if="loading">加载中...</text>
        <text v-else-if="hasMore" @click="loadMore">加载更多</text>
        <text v-else>已显示全部 {{ total }} 名学生</text>
      </view>
    </view>
    <view v-else class="page-state">
      <text>当前筛选下没有学生</text>
    </view>
  </view>
</template>

<script>
import { listMyTaskStudents } from '@/api/work/qualityTask'

const ISSUE_LABELS = {
  missingClass: '学生不在有效班级名册',
  missingCollege: '学生缺少学院归属',
  gradeMissing: '学生没有成绩记录',
  bedNoAssignment: '学生主档有床位但无分配',
  bedAssignmentMismatch: '分配与学生主档床位不一致',
  aidApprovedNoGrant: '已认定但未发放',
  aidGrantNoAppr: '已发放但无认定'
}

export default {
  data() {
    return {
      taskId: null,
      issueType: '',
      groupLabel: '',
      students: [],
      total: 0,
      pageNum: 1,
      pageSize: 20,
      keyword: '',
      loading: false,
      loadError: ''
    }
  },
  computed: {
    issueLabel() {
      return ISSUE_LABELS[this.issueType] || this.issueType || '学生明细'
    },
    hasMore() {
      return this.students.length < this.total
    }
  },
  onLoad(options) {
    this.taskId = Number(options.taskId)
    this.issueType = options.issueType ? decodeURIComponent(options.issueType) : ''
    this.groupLabel = options.groupLabel ? decodeURIComponent(options.groupLabel) : ''
    this.reload()
  },
  onPullDownRefresh() {
    this.reload().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  onReachBottom() {
    this.loadMore()
  },
  methods: {
    reload() {
      this.pageNum = 1
      this.students = []
      return this.loadPage(true)
    },
    loadMore() {
      if (this.loading || !this.hasMore) return
      this.pageNum++
      this.loadPage(false)
    },
    loadPage(reset) {
      if (!this.taskId) {
        this.loadError = '整改任务不存在'
        return Promise.resolve()
      }
      this.loading = true
      if (reset) {
        this.loadError = ''
      }
      return listMyTaskStudents({
        taskId: this.taskId,
        keyword: this.keyword.trim(),
        pageNum: this.pageNum,
        pageSize: this.pageSize
      }).then(res => {
        const rows = res.rows || []
        this.students = reset ? rows : this.students.concat(rows)
        this.total = Number(res.total || 0)
        this.loading = false
      }).catch(error => {
        if (reset) {
          this.students = []
          this.total = 0
        } else {
          this.pageNum--
        }
        this.loading = false
        this.loadError = typeof error === 'string' ? error : '学生明细加载失败'
      })
    },
    search() {
      this.reload()
    },
    clearSearch() {
      this.keyword = ''
      this.reload()
    }
  }
}
</script>

<style lang="scss" scoped>
.student-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
  box-sizing: border-box;
  background: #f4f7f9;
}

.summary-band {
  position: relative;
  padding: 26rpx 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
  padding-right: 150rpx;
  box-sizing: border-box;
}

.summary-issue {
  display: block;
  font-size: 29rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.45;
  word-break: break-all;
}

.summary-group {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
  word-break: break-all;
}

.summary-count {
  position: absolute;
  top: 26rpx;
  right: 24rpx;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.count-value {
  font-size: 38rpx;
  font-weight: 600;
  color: #2563eb;
}

.count-label {
  font-size: 22rpx;
  color: #64748b;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin: 20rpx 0;
}

.search-box {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 20rpx;
  border-radius: 8rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  font-size: 25rpx;
  color: #0f172a;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
}

.search-btn {
  padding: 0 26rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 8rpx;
  font-size: 25rpx;
  color: #ffffff;
  background: #2563eb;
}

.page-state {
  margin-top: 32rpx;
  padding: 60rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #64748b;
}

.state-action {
  color: #2563eb;
}

.student-list {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.student-row {
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid #f1f5f9;
}

.student-row:last-child {
  border-bottom: none;
}

.student-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.student-name-row {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  min-width: 0;
}

.student-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.student-xh {
  font-size: 23rpx;
  color: #64748b;
}

.student-class {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #334155;
  line-height: 1.5;
  word-break: break-all;
}

.student-major {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #94a3b8;
  line-height: 1.5;
  word-break: break-all;
}

.load-more {
  padding: 22rpx;
  text-align: center;
  font-size: 23rpx;
  color: #94a3b8;
}

@media (min-width: 900px) {
  .student-page {
    max-width: 720px;
    margin: 0 auto;
  }
}
</style>
