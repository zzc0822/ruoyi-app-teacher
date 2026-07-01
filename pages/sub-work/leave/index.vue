<template>
  <view class="page-container">
    <!-- 顶部统计+新增 -->
    <view class="top-row">
      <view class="stats-card">
        <view class="stats-row">
          <view class="stats-item">
            <text class="stats-num">{{ pendingCount }}</text>
            <text class="stats-label">待审批</text>
          </view>
          <view class="stats-item">
            <text class="stats-num orange">{{ approvedCount }}</text>
            <text class="stats-label">已批准</text>
          </view>
          <view class="stats-item">
            <text class="stats-num red">{{ overdueCount }}</text>
            <text class="stats-label">逾期未归</text>
          </view>
        </view>
      </view>
    </view>

    <!-- PC端提示 -->
    <view class="pc-tip-bar">
      <uni-icons type="info" size="14" color="#e43d33"></uni-icons>
      <text class="pc-tip-text">代学生请假请前往PC端操作</text>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-easyinput 
          v-model="searchKey" 
          :placeholder="selectedStudent ? '已选择: ' + selectedStudent.studentName : '搜索学生姓名/学号'"
          @input="onSearchInput"
          @confirm="searchStudents" 
          clearable 
          @clear="clearSelection"
          @focus="onSearchFocus"
        >
          <template #right>
            <uni-icons type="search" size="18" @click="searchStudents"></uni-icons>
          </template>
        </uni-easyinput>
      </view>

      <!-- 搜索结果下拉列表 -->
      <view class="search-dropdown" v-if="showStudentPicker && studentList.length > 0">
        <scroll-view scroll-y class="dropdown-list">
          <view class="dropdown-item" v-for="stu in studentList" :key="stu.xh" @click="selectStudent(stu)">
            <view class="student-main">
              <text class="student-name">{{ stu.studentName }}</text>
              <text class="student-xh">{{ stu.xh }}</text>
            </view>
            <view class="student-extra">
              <text class="student-class">{{ stu.bjjc || stu.bjmc || '' }}</text>
              <!-- 显示请假统计 -->
              <text class="leave-badge" v-if="stu.totalCount > 0">
                {{ stu.totalCount }}条请假
                <text v-if="stu.pendingCount > 0">({{ stu.pendingCount }}待审)</text>
              </text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view :class="['filter-item', activeTab === 'all' ? 'active' : '']" @click="switchTab('all')">全部</view>
      <view :class="['filter-item', activeTab === 'pending' ? 'active' : '']" @click="switchTab('pending')">待审批</view>
      <view :class="['filter-item', activeTab === 'approved' ? 'active' : '']" @click="switchTab('approved')">已批准</view>
      <view :class="['filter-item', activeTab === 'rejected' ? 'active' : '']" @click="switchTab('rejected')">已拒绝</view>
      <view :class="['filter-item', activeTab === 'forward' ? 'active' : '']" @click="switchTab('forward')">转上级</view>
    </view>

    <!-- 请假列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="list-item" v-for="(item, index) in list" :key="index" @click="goDetail(item)">
        <view class="item-header">
          <view class="item-left">
            <text class="item-name">{{ item.studentName }}</text>
            <text class="item-class">{{ item.bjjc || item.bjmc || '' }}</text>
          </view>
          <text :class="['item-status', 'status-' + item.approvalStatus]">
            {{ formatStatus(item.approvalStatus) }}
          </text>
        </view>
        <view class="item-body">
          <view class="item-row">
            <text class="item-label">类型</text>
            <text class="item-value">{{ formatLeaveType(item.leaveType) }}</text>
            <text class="item-days">{{ item.leaveDays }}天</text>
          </view>
          <view class="item-row">
            <text class="item-label">时间</text>
            <text class="item-value">{{ formatDate(item.startTime) }} ~ {{ formatDate(item.endTime) }}</text>
          </view>
          <view class="item-row" v-if="item.destination">
            <text class="item-label">目的地</text>
            <text class="item-value">{{ item.destination }}</text>
          </view>
          <view class="item-row" v-if="item.transportType">
            <text class="item-label">交通</text>
            <text class="item-value">{{ formatTransport(item.transportType) }} {{ item.transportInfo || '' }}</text>
          </view>
        </view>
        <!-- 附件缩略图区域 -->
        <view class="item-attach" v-if="getDisplayAttachments(item).length > 0">
          <text class="attach-label">{{ getAttachLabel(item) }}</text>
          <view class="attach-thumbs">
            <image
              v-for="(att, ai) in getDisplayAttachments(item)"
              :key="ai"
              :src="getAttachSrc(att)"
              mode="aspectFill"
              class="attach-thumb"
              @click.stop="previewAttach(item, ai)"
            ></image>
          </view>
        </view>
        <view class="item-footer" v-if="item.leaveReason">
          <text class="item-reason">事由：{{ item.leaveReason }}</text>
        </view>
        <view class="item-footer" v-if="item.returnStatus && item.approvalStatus === 'approved'">
          <text :class="['return-status', 'return-' + item.returnStatus]">
            销假：{{ formatReturnStatus(item.returnStatus) }}
          </text>
        </view>
        <!-- ≤3天待审批操作按钮 -->
        <view class="item-actions" v-if="item.approvalStatus === 'pending' && item.approvalLevel === 'counselor'" @click.stop>
          <view class="action-btn approve-btn" @click="quickApprove(item, $event)">批准</view>
          <view class="action-btn reject-btn" @click="quickReject(item, $event)">拒绝</view>
          <view class="action-btn detail-btn" @click="goDetail(item)">详情</view>
        </view>
      </view>
      <view class="empty-tip" v-if="!loading && list.length === 0">
        <text>暂无请假记录</text>
      </view>
      <uni-load-more :status="loadStatus" v-else></uni-load-more>
    </scroll-view>
  </view>
</template>

<script>
import { listLeave, approvalLeave } from '@/api/stumanage/leave'
import config from '@/config'

export default {
  data() {
    return {
      baseUrl: config.baseUrl,
      activeTab: 'all',
      searchKey: '',
      queryParam: {
        pageNum: 1,
        pageSize: 20,
        approvalStatus: undefined,
        studentName: undefined,
        xh: undefined
      },
      list: [],
      total: 0,
      loadStatus: 'more',
      loading: false,
      // 统计
      pendingCount: 0,
      approvedCount: 0,
      overdueCount: 0,
      // 学生选择
      showStudentPicker: false,
      studentList: [],
      selectedStudent: null
    }
  },
  onShow() {
    this.refresh()
  },
  methods: {
    // 搜索输入（防抖）
    onSearchInput() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.searchStudents()
      }, 500)
    },
    // 搜索框聚焦
    onSearchFocus() {
      // 如果有搜索内容，重新显示下拉
      if (this.searchKey.trim() && this.studentList.length > 0) {
        this.showStudentPicker = true
      }
    },
    // 搜索学生列表（直接按姓名或学号搜索请假记录关联的学生）
    searchStudents() {
      const key = this.searchKey.trim()
      if (!key) {
        this.studentList = []
        this.showStudentPicker = false
        this.refresh()
        return
      }
      // 纯数字按学号查询，否则按姓名查询
      const isNumber = /^\d+$/.test(key)
      const query = isNumber
        ? { pageNum: 1, pageSize: 20, xh: key }
        : { pageNum: 1, pageSize: 20, studentName: key }
      // 直接查请假列表，提取唯一学生
      listLeave({ ...query, pageSize: 200 }).then(leaveRes => {
        const records = leaveRes.rows || []
        if (records.length === 0) {
          this.studentList = []
          this.showStudentPicker = false
          return
        }
        // 按学号去重，并统计每个学生的请假数量
        const map = {}
        records.forEach(r => {
          if (!map[r.xh]) {
            map[r.xh] = { xh: r.xh, studentName: r.studentName, bjjc: r.bjjc, bjmc: r.bjmc, totalCount: 0, pendingCount: 0 }
          }
          map[r.xh].totalCount++
          if (r.approvalStatus === 'pending') map[r.xh].pendingCount++
        })
        this.studentList = Object.values(map)
        this.showStudentPicker = this.studentList.length > 0
      }).catch(() => {
        this.studentList = []
        this.showStudentPicker = false
      })
    },
    // 选择学生
    selectStudent(stu) {
      this.showStudentPicker = false
      this.selectedStudent = stu
      // 加载该学生的请假记录
      this.queryParam.xh = stu.xh
      this.queryParam.studentName = undefined
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    // 清除选择
    clearSelection() {
      this.searchKey = ''
      this.studentList = []
      this.showStudentPicker = false
      this.selectedStudent = null
      this.queryParam.xh = undefined
      this.queryParam.studentName = undefined
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    refresh() {
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
      this.loadStats()
    },
    loadStats() {
      // 待审批数
      listLeave({ pageNum: 1, pageSize: 1, approvalStatus: 'pending' }).then(res => {
        this.pendingCount = res.total || 0
      }).catch(() => {})
      // 已批准数
      listLeave({ pageNum: 1, pageSize: 1, approvalStatus: 'approved' }).then(res => {
        this.approvedCount = res.total || 0
      }).catch(() => {})
      // 逾期未归数
      listLeave({ pageNum: 1, pageSize: 1, approvalStatus: 'approved', returnStatus: 'overdue' }).then(res => {
        this.overdueCount = res.total || 0
      }).catch(() => {})
    },
    switchTab(tab) {
      this.activeTab = tab
      this.queryParam.approvalStatus = tab === 'all' ? undefined : tab
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    handleSearch() {
      const key = this.searchKey.trim()
      // 同时按姓名和学号模糊查询（后端会用OR连接）
      this.queryParam.studentName = key || undefined
      this.queryParam.xh = key || undefined
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    handleClear() {
      this.searchKey = ''
      this.queryParam.studentName = undefined
      this.queryParam.xh = undefined
      this.queryParam.pageNum = 1
      this.list = []
      this.getList()
    },
    getList() {
      // 防止重复加载
      if (this.loading) return
      
      this.loading = true
      this.loadStatus = 'loading'
      
      listLeave(this.queryParam).then(res => {
        const rows = res.rows || []
        
        // 第一页替换，其他页追加
        if (this.queryParam.pageNum === 1) {
          this.list = rows
        } else {
          this.list = [...this.list, ...rows]
        }
        
        this.total = res.total || 0
        
        // 更新加载状态
        if (this.list.length >= this.total) {
          this.loadStatus = 'noMore'
        } else {
          this.loadStatus = 'more'
        }
      }).catch((err) => { 
        this.loadStatus = 'more'
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
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
    goDetail(item) {
      uni.navigateTo({ url: `/pages/sub-work/leave/detail?id=${item.id}` })
    },
    quickApprove(item, e) {
      uni.showModal({
        title: '确认批准',
        content: `批准 ${item.studentName} 的请假申请？`,
        success: (res) => {
          if (res.confirm) {
            approvalLeave({
              id: item.id,
              approvalStatus: 'approved',
              approvalRemark: '小程序快捷审批通过'
            }).then(() => {
              uni.showToast({ title: '已批准', icon: 'success' })
              this.refresh()
            }).catch(() => {
              uni.showToast({ title: '审批失败', icon: 'none' })
            })
          }
        }
      })
    },
    quickReject(item, e) {
      uni.showModal({
        title: '确认拒绝',
        content: `拒绝 ${item.studentName} 的请假申请？`,
        editable: true,
        placeholderText: '请输入拒绝理由',
        success: (res) => {
          if (res.confirm) {
            approvalLeave({
              id: item.id,
              approvalStatus: 'rejected',
              approvalRemark: res.content || '小程序快捷审批拒绝'
            }).then(() => {
              uni.showToast({ title: '已拒绝', icon: 'success' })
              this.refresh()
            }).catch(() => {
              uni.showToast({ title: '审批失败', icon: 'none' })
            })
          }
        }
      })
    },
    formatStatus(val) {
      const map = {
        pending: '待审批',
        approved: '已批准',
        rejected: '已拒绝',
        forward: '转上级审批'
      }
      return map[val] || val || '未知'
    },
    formatLeaveType(val) {
      const map = { sick: '病假', personal: '事假', other: '其他' }
      return map[val] || val || '未知'
    },
    formatReturnStatus(val) {
      const map = { not_returned: '未销假', returned: '已销假', overdue: '逾期未归' }
      return map[val] || val || ''
    },
    formatDate(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return `${d.getMonth()+1}/${d.getDate()}`
    },
    formatTransport(val) {
      const map = { train: '火车', plane: '飞机', bus: '汽车', other: '其他' }
      return map[val] || ''
    },
    // 附件显示逻辑：待审批/转上级显示请假佐证，已销假显示销假佐证
    getDisplayAttachments(item) {
      if (item.returnStatus === 'returned' && item.returnAttachmentList && item.returnAttachmentList.length > 0) {
        return item.returnAttachmentList
      }
      if (item.leaveAttachmentList && item.leaveAttachmentList.length > 0) {
        return item.leaveAttachmentList
      }
      return []
    },
    getAttachLabel(item) {
      if (item.returnStatus === 'returned' && item.returnAttachmentList && item.returnAttachmentList.length > 0) {
        return '销假佐证'
      }
      return '请假佐证'
    },
    // 获取附件图片源：优先使用base64缩略图（微信小程序无法加载HTTP图片URL）
    getAttachSrc(att) {
      if (att.thumbnailBase64 && att.thumbnailBase64.startsWith('data:')) return att.thumbnailBase64
      const path = att.filePath || ''
      if (!path) return ''
      if (path.startsWith('http://') || path.startsWith('https://')) return path
      if (path.startsWith('/profile')) return this.baseUrl + path
      return this.baseUrl + '/profile' + path
    },
    previewAttach(item, idx) {
      const list = this.getDisplayAttachments(item)
      // 预览也优先使用base64
      const urls = list.map(a => {
        if (a.thumbnailBase64 && a.thumbnailBase64.startsWith('data:')) return a.thumbnailBase64
        return this.baseUrl + '/profile' + a.filePath
      })
      uni.previewImage({ current: urls[idx] || urls[0], urls })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6f7;
}

/* ===== 顶部统计+新增 ===== */
.top-row {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  padding: 20rpx 20rpx 0;
}

.stats-card {
  flex: 1;
  background: linear-gradient(135deg, #e43d33, #c62828);
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
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
  &.orange { color: #fbbd3c; }
  &.red { color: #ffcdd2; }
}

.stats-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6rpx;
}

.pc-tip-bar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: #fef0f0;
  margin: 0 20rpx 12rpx;
  border-radius: 12rpx;
}

.pc-tip-text {
  font-size: 24rpx;
  color: #e43d33;
}

/* ===== 搜索栏 ===== */
.search-bar {
  padding: 16rpx 20rpx 0;
  position: relative;
}

.search-input-wrap {
  position: relative;
  z-index: 10;
}

/* 搜索下拉列表 */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 0 0 16rpx 16rpx;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 500rpx;
}

.dropdown-list {
  max-height: 500rpx;
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
  &:active { background: #f9f9f9; }
  &:last-child { border-bottom: none; }
}

.student-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.student-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.student-xh {
  font-size: 22rpx;
  color: #999;
}

.student-extra {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.student-class {
  font-size: 22rpx;
  color: #666;
}

.leave-badge {
  font-size: 20rpx;
  color: #2979ff;
  background: #e8f0ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  background: #fff;
  padding: 16rpx 20rpx;
  margin-top: 12rpx;
  gap: 8rpx;
}

.filter-item {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: #666;
  padding: 10rpx 0;
  border-radius: 30rpx;
  background: #f5f5f5;
  &.active {
    color: #fff;
    background: #e43d33;
    font-weight: bold;
  }
}

/* ===== 列表 ===== */
.list-scroll {
  flex: 1;
  padding: 20rpx 20rpx 0;
}

.list-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.item-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.item-class {
  font-size: 22rpx;
  color: #999;
}

.item-status {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  &.status-pending { color: #f3a044; background: #fef3e2; }
  &.status-approved { color: #18bc37; background: #e8f8ea; }
  &.status-rejected { color: #e43d33; background: #fef0f0; }
  &.status-forward { color: #2979ff; background: #e8f0ff; }
}

.item-body {
  margin-bottom: 8rpx;
}

.item-row {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.item-label {
  font-size: 24rpx;
  color: #999;
  width: 80rpx;
  flex-shrink: 0;
}

.item-value {
  font-size: 24rpx;
  color: #333;
  flex: 1;
}

.item-days {
  font-size: 24rpx;
  color: #e43d33;
  font-weight: bold;
  margin-left: 12rpx;
}

/* ===== 附件缩略图 ===== */
.item-attach {
  margin-top: 10rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #f5f5f5;
}

.attach-label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
  display: block;
}

.attach-thumbs {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.attach-thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 10rpx;
}

.item-footer {
  padding-top: 10rpx;
  border-top: 1rpx solid #f5f5f5;
  margin-top: 10rpx;
}

.item-reason {
  font-size: 24rpx;
  color: #666;
}

.return-status {
  font-size: 24rpx;
  &.return-not_returned { color: #999; }
  &.return-returned { color: #18bc37; }
  &.return-overdue { color: #e43d33; font-weight: bold; }
}

/* ===== 操作按钮 ===== */
.item-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f5f5f5;
}

.action-btn {
  font-size: 24rpx;
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.approve-btn {
  color: #fff;
  background: #18bc37;
}

.reject-btn {
  color: #fff;
  background: #e43d33;
}

.detail-btn {
  color: #2979ff;
  background: #e8f0ff;
}

.forward-btn {
  color: #fff;
  background: #2979ff;
}

.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  font-size: 28rpx;
  color: #999;
}
</style>
