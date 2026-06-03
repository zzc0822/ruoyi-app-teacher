<template>
  <view class="page-container">
    <!-- 未读待办提示 -->
    <view class="unread-bar" v-if="unreadCount > 0">
      <text class="unread-text">您有 {{ unreadCount }} 条未读待办</text>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input 
          class="search-input" 
          v-model="searchKeyword" 
          placeholder="搜索姓名或标题" 
          @input="onSearchInput"
          @confirm="handleSearch"
        />
        <text v-if="searchKeyword" class="search-clear" @click="clearSearch">×</text>
      </view>
      <view class="filter-btn" @click="showFilterPopup">
        <text class="filter-icon">🔽</text>
        <text>筛选</text>
      </view>
    </view>

    <!-- 筛选条件显示 -->
    <view class="filter-tags" v-if="hasFilter">
      <view class="filter-tag" v-if="filterForm.status" @click="showFilterPopup">
        <text>状态：{{ formatStatus(filterForm.status) }}</text>
        <text class="tag-close" @click.stop="clearFilter('status')">×</text>
      </view>
      <view class="filter-tag" v-if="filterForm.type" @click="showFilterPopup">
        <text>类型：{{ formatTodoType(filterForm.type) }}</text>
        <text class="tag-close" @click.stop="clearFilter('type')">×</text>
      </view>
      <view class="filter-tag" v-if="filterForm.dateRange" @click="showFilterPopup">
        <text>时间：{{ filterForm.dateRange }}</text>
        <text class="tag-close" @click.stop="clearFilter('dateRange')">×</text>
      </view>
      <view class="filter-tag filter-clear-all" @click="clearAllFilters">
        <text>清空筛选</text>
      </view>
    </view>

    <!-- 排序切换 -->
    <view class="sort-bar">
      <view :class="['sort-btn', sortBy === 'time' ? 'sort-active' : '']" @click="sortBy = 'time'">
        <text>按时间</text>
      </view>
      <view :class="['sort-btn', sortBy === 'urgency' ? 'sort-active' : '']" @click="sortBy = 'urgency'">
        <text>按紧急程度</text>
      </view>
    </view>

    <!-- 待办列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="list-item" v-for="(item, index) in filteredList" :key="index" @click="handleTodo(item)">
        <!-- 紧急程度左侧色条 -->
        <view :class="['item-urgency-bar', 'bar-' + (item.urgency || 'normal')]"></view>
        <view class="item-content">
          <view class="item-header">
            <view class="item-title-row">
              <view :class="['urgency-dot', 'urgency-' + (item.urgency || 'normal')]" v-if="item.urgency"></view>
              <text class="item-title">{{ item.title }}</text>
            </view>
            <view class="item-unread" v-if="item.isRead !== '1'"></view>
          </view>
          <view class="item-body" v-if="item.description">
            <text class="item-desc">{{ item.description }}</text>
          </view>
          <view class="item-footer">
            <view class="item-type-wrap">
              <text :class="['item-type', 'type-' + (item.todoType || 'default')]">{{ formatTodoType(item.todoType) }}</text>
              <text :class="['item-urgency-label', 'label-' + (item.urgency || 'normal')]" v-if="item.urgency">{{ formatUrgency(item.urgency) }}</text>
            </view>
            <text class="item-deadline" v-if="item.deadline">截止：{{ formatDeadline(item.deadline) }}</text>
          </view>
        </view>
      </view>
      <view class="empty-tip" v-if="!loading && filteredList.length === 0">
        <text>暂无待办事项</text>
      </view>
      <uni-load-more :status="loadStatus" v-else></uni-load-more>
    </scroll-view>

    <!-- 筛选弹窗 -->
    <view class="filter-popup" v-if="showFilter" @click="hideFilterPopup">
      <view class="filter-content" @click.stop>
        <view class="filter-header">
          <text class="filter-title">筛选条件</text>
          <text class="filter-close" @click="hideFilterPopup">×</text>
        </view>
        <scroll-view scroll-y class="filter-body">
          <!-- 时间段 -->
          <view class="filter-section">
            <text class="filter-label">时间段</text>
            <view class="filter-options">
              <view 
                :class="['filter-option', filterForm.dateRange === option.value ? 'option-active' : '']" 
                v-for="option in dateRangeOptions" 
                :key="option.value"
                @click="selectDateRange(option.value)"
              >
                <text>{{ option.label }}</text>
              </view>
            </view>
            <!-- 自定义时间段 -->
            <view class="custom-date-wrap" v-if="filterForm.dateRange === 'custom'">
              <view class="date-picker-row">
                <view class="date-picker-item">
                  <text class="date-label">开始日期</text>
                  <picker mode="date" :value="filterForm.startDate" :end="maxEndDate" @change="onStartDateChange">
                    <view class="picker-display">
                      <text v-if="filterForm.startDate">{{ filterForm.startDate }}</text>
                      <text v-else class="placeholder">请选择</text>
                    </view>
                  </picker>
                </view>
                <view class="date-picker-item">
                  <text class="date-label">结束日期</text>
                  <picker mode="date" :value="filterForm.endDate" :start="filterForm.startDate || minStartDate" :end="today" @change="onEndDateChange">
                    <view class="picker-display">
                      <text v-if="filterForm.endDate">{{ filterForm.endDate }}</text>
                      <text v-else class="placeholder">请选择</text>
                    </view>
                  </picker>
                </view>
              </view>
              <view class="date-hint" v-if="dateRangeHint">
                <text>{{ dateRangeHint }}</text>
              </view>
            </view>
          </view>
          <!-- 状态 -->
          <view class="filter-section">
            <text class="filter-label">状态</text>
            <view class="filter-options">
              <view 
                :class="['filter-option', filterForm.status === option.value ? 'option-active' : '']" 
                v-for="option in statusOptions" 
                :key="option.value"
                @click="filterForm.status = option.value"
              >
                <text>{{ option.label }}</text>
              </view>
            </view>
          </view>
          <!-- 类型 -->
          <view class="filter-section">
            <text class="filter-label">类型</text>
            <view class="filter-options">
              <view 
                :class="['filter-option', filterForm.type === option.value ? 'option-active' : '']" 
                v-for="option in typeOptions" 
                :key="option.value"
                @click="filterForm.type = option.value"
              >
                <text>{{ option.label }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="filter-footer">
          <view class="filter-reset-btn" @click="resetFilter">
            <text>重置</text>
          </view>
          <view class="filter-confirm-btn" @click="applyFilter">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listTodo, getUnreadCount, markRead } from '@/api/stumanage/todo'

export default {
  data() {
    return {
      list: [],
      loadStatus: 'more',
      unreadCount: 0,
      loading: false,
      sortBy: 'time',
      // 搜索
      searchKeyword: '',
      _searchTimer: null,
      // 筛选
      showFilter: false,
      filterForm: {
        dateRange: '',
        status: '',
        type: '',
        startDate: '',
        endDate: ''
      },
      today: '',
      maxEndDate: '',
      minStartDate: '',
      // 筛选选项
      dateRangeOptions: [
        { label: '今天', value: 'today' },
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' },
        { label: '自定义', value: 'custom' },
        { label: '全部', value: '' }
      ],
      statusOptions: [
        { label: '全部', value: '' },
        { label: '未完成', value: '0' },
        { label: '已完成', value: '1' }
      ],
      typeOptions: [
        { label: '全部', value: '' },
        { label: '请假审批', value: 'leave' },
        { label: '违纪谈话', value: 'talk_disciplinary' },
        { label: '日常谈心', value: 'talk_daily' },
        { label: '查课谈话', value: 'classcheck_talk' },
        { label: '抽查待确认', value: 'classcheck_confirm' }
      ]
    }
  },
  computed: {
    // 是否有筛选条件
    hasFilter() {
      return this.filterForm.dateRange || this.filterForm.status || this.filterForm.type
    },
    // 搜索 + 排序 + 筛选
    filteredList() {
      let arr = [...this.list]
      
      // 1. 搜索过滤
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase()
        arr = arr.filter(item => {
          const title = (item.title || '').toLowerCase()
          const desc = (item.description || '').toLowerCase()
          return title.includes(keyword) || desc.includes(keyword)
        })
      }
      
      // 2. 筛选过滤
      if (this.filterForm.status) {
        arr = arr.filter(item => item.status === this.filterForm.status)
      }
      if (this.filterForm.type) {
        arr = arr.filter(item => item.todoType === this.filterForm.type)
      }
      if (this.filterForm.dateRange) {
        const now = new Date()
        arr = arr.filter(item => {
          if (!item.createTime) return false
          const itemDate = new Date(item.createTime.replace(/ /g, 'T'))
          const diff = now - itemDate
          const dayDiff = diff / (1000 * 60 * 60 * 24)
          
          if (this.filterForm.dateRange === 'today') {
            return dayDiff <= 1
          } else if (this.filterForm.dateRange === 'week') {
            return dayDiff <= 7
          } else if (this.filterForm.dateRange === 'month') {
            return dayDiff <= 30
          } else if (this.filterForm.dateRange === 'custom') {
            // 自定义时间段
            if (!this.filterForm.startDate || !this.filterForm.endDate) {
              return false
            }
            const startDate = new Date(this.filterForm.startDate.replace(/-/g, '/'))
            const endDate = new Date(this.filterForm.endDate.replace(/-/g, '/'))
            // 设置结束日期为一天的结束
            endDate.setHours(23, 59, 59, 999)
            return itemDate >= startDate && itemDate <= endDate
          }
          return true
        })
      }
      
      // 3. 排序
      if (this.sortBy === 'urgency') {
        const urgencyOrder = { overdue: 0, today: 1, tomorrow: 2, normal: 3 }
        arr.sort((a, b) => {
          const ua = urgencyOrder[a.urgency] != null ? urgencyOrder[a.urgency] : 9
          const ub = urgencyOrder[b.urgency] != null ? urgencyOrder[b.urgency] : 9
          if (ua !== ub) return ua - ub
          return new Date(b.createTime) - new Date(a.createTime)
        })
      } else {
        // 按时间倒序
        arr.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      }
      
      return arr
    }
  },
  onLoad(options) {
    // 初始化日期
    this.initDateRange()
  },
  onShow() {
    this.getList()
    this.getUnread()
  },
  methods: {
    getList() {
      this.loading = true
      this.loadStatus = 'loading'
      listTodo().then(res => {
        this.list = res.data || []
        this.loadStatus = 'noMore'
        this.loading = false
      }).catch(() => {
        this.loadStatus = 'more'
        this.loading = false
      })
    },
    getUnread() {
      getUnreadCount().then(res => {
        this.unreadCount = res.data || 0
      }).catch(() => {})
    },
    handleTodo(item) {
      // 标记已读
      if (item.isRead !== '1') {
        markRead(item.id).then(() => {
          item.isRead = '1'
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }).catch(() => {})
      }
      
      // 根据待办类型跳转到对应页面
      if (item.todoType === 'classcheck_confirm') {
        // 抽查待确认 -> 跳转到查课确认页面
        uni.navigateTo({
          url: '/pages/work/classcheck/confirm?id=' + item.businessId,
          fail: (err) => {
            uni.showToast({
              title: '跳转失败',
              icon: 'none'
            })
          }
        })
      } else if (item.todoType === 'leave' || item.todoType === 'leave_approval') {
        // 请假审批 -> 跳转到请假详情页面
        uni.navigateTo({
          url: '/pages/work/leave/detail?id=' + item.businessId
        })
      } else if (item.todoType === 'talk_disciplinary') {
        // 违纪谈话 -> 跳转到编辑谈话页面（businessId是谈话记录ID）
        uni.navigateTo({
          url: '/pages/work/talk/add?id=' + item.businessId
        })
      } else if (item.todoType === 'talk' || item.todoType === 'talk_daily') {
        // 谈话提醒 -> 跳转到谈话列表页面
        uni.navigateTo({
          url: '/pages/work/talk/index'
        })
      } else if (item.todoType === 'classcheck_talk') {
        // 查课违纪谈话 -> 跳转到新增谈话页面
        uni.navigateTo({
          url: '/pages/work/talk/add?todoId=' + item.id + '&businessId=' + item.businessId
        })
      }
      // 其他类型不跳转（如日程等）
    },
    formatTodoType(val) {
      const map = {
        schedule: '日程',
        leave: '请假审批',
        leave_approval: '请假审批',
        talk: '谈话提醒',
        talk_disciplinary: '违纪谈话',
        talk_daily: '日常谈心',
        classcheck_talk: '查课谈话',
        classcheck_confirm: '抽查待确认',
        check: '查课提醒',
        overdue: '逾期提醒'
      }
      return map[val] || val || '待办'
    },
    formatUrgency(val) {
      const map = {
        overdue: '已逾期',
        today: '今日截止',
        tomorrow: '明日截止',
        normal: '常规'
      }
      return map[val] || '常规'
    },
    formatDeadline(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      const m = d.getMonth() + 1
      const day = d.getDate()
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return m + '/' + day + ' ' + h + ':' + min
    },
    // 搜索
    onSearchInput() {
      clearTimeout(this._searchTimer)
      this._searchTimer = setTimeout(() => {
        this.handleSearch()
      }, 300)
    },
    handleSearch() {
      // 搜索逻辑
    },
    clearSearch() {
      this.searchKeyword = ''
    },
    // 筛选
    showFilterPopup() {
      this.showFilter = true
    },
    hideFilterPopup() {
      this.showFilter = false
    },
    applyFilter() {
      this.hideFilterPopup()
    },
    resetFilter() {
      this.filterForm = {
        dateRange: '',
        status: '',
        type: '',
        startDate: '',
        endDate: ''
      }
    },
    clearFilter(field) {
      this.filterForm[field] = ''
      // 如果清除的是时间段，也清空自定义日期
      if (field === 'dateRange') {
        this.filterForm.startDate = ''
        this.filterForm.endDate = ''
      }
    },
    clearAllFilters() {
      this.filterForm = {
        dateRange: '',
        status: '',
        type: '',
        startDate: '',
        endDate: ''
      }
    },
    formatStatus(val) {
      const map = {
        '0': '未完成',
        '1': '已完成'
      }
      return map[val] || val
    },
    // 日期范围
    initDateRange() {
      const now = new Date()
      this.today = this.formatDate(now)
      // 最大结束日期：今天
      this.maxEndDate = this.today
      // 最小开始日期：半年前
      const halfYearAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      this.minStartDate = this.formatDate(halfYearAgo)
    },
    formatDate(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    // 自定义时间段提示
    dateRangeHint() {
      if (!this.filterForm.startDate || !this.filterForm.endDate) {
        return ''
      }
      const start = new Date(this.filterForm.startDate.replace(/-/g, '/'))
      const end = new Date(this.filterForm.endDate.replace(/-/g, '/'))
      const diff = (end - start) / (1000 * 60 * 60 * 24)
      if (diff > 180) {
        return '⚠️ 时间跨度不能超过半年'
      }
      return `已选择 ${Math.ceil(diff)} 天`
    },
    // 选择时间段
    selectDateRange(value) {
      this.filterForm.dateRange = value
      // 如果切换到非自定义，清空自定义日期
      if (value !== 'custom') {
        this.filterForm.startDate = ''
        this.filterForm.endDate = ''
      }
    },
    onStartDateChange(e) {
      this.filterForm.startDate = e.detail.value
      // 清空结束日期，让用户重新选择
      this.filterForm.endDate = ''
    },
    onEndDateChange(e) {
      this.filterForm.endDate = e.detail.value
      // 验证时间跨度
      if (this.filterForm.startDate && this.filterForm.endDate) {
        const start = new Date(this.filterForm.startDate.replace(/-/g, '/'))
        const end = new Date(this.filterForm.endDate.replace(/-/g, '/'))
        const diff = (end - start) / (1000 * 60 * 60 * 24)
        if (diff > 180) {
          uni.showToast({
            title: '时间跨度不能超过半年',
            icon: 'none'
          })
          this.filterForm.endDate = ''
        }
      }
    },
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

.unread-bar {
  background: #fef3e2;
  padding: 16rpx 30rpx;
}

.unread-text {
  font-size: 26rpx;
  color: #f3a044;
  font-weight: bold;
}

/* ===== 搜索栏 ===== */
.search-bar {
  display: flex;
  padding: 16rpx 30rpx;
  gap: 16rpx;
  background: #fff;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 30rpx;
  padding: 0 24rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  height: 60rpx;
}

.search-clear {
  font-size: 36rpx;
  color: #999;
  padding: 0 8rpx;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 24rpx;
  background: #2979ff;
  color: #fff;
  border-radius: 30rpx;
  font-size: 26rpx;
}

.filter-icon {
  font-size: 24rpx;
}

/* ===== 筛选标签 ===== */
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  padding: 12rpx 30rpx;
  gap: 12rpx;
  background: #fff;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #e3f2fd;
  color: #2979ff;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.tag-close {
  font-size: 28rpx;
  font-weight: bold;
  margin-left: 4rpx;
}

.filter-clear-all {
  background: #ffebee;
  color: #e43d33;
}

/* ===== 排序切换 ===== */
.sort-bar {
  display: flex;
  padding: 16rpx 30rpx;
  gap: 16rpx;
}

.sort-btn {
  padding: 10rpx 28rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #666;
  background: #fff;
}

.sort-active {
  background: #2979ff;
  color: #fff;
}

.list-scroll {
  flex: 1;
  padding: 0 30rpx 20rpx;
}

.list-item {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

/* 紧急程度左侧色条 */
.item-urgency-bar {
  width: 8rpx;
  flex-shrink: 0;
  &.bar-overdue { background: #e43d33; }
  &.bar-today { background: #f3a044; }
  &.bar-tomorrow { background: #2979ff; }
  &.bar-normal { background: #18bc37; }
}

.item-content {
  flex: 1;
  padding: 24rpx 24rpx 20rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.item-title-row {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.urgency-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-right: 10rpx;
  flex-shrink: 0;
  &.urgency-overdue { background: #e43d33; }
  &.urgency-today { background: #f3a044; }
  &.urgency-tomorrow { background: #2979ff; }
  &.urgency-normal { background: #18bc37; }
}

.item-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-unread {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #e43d33;
  flex-shrink: 0;
  margin-left: 10rpx;
}

.item-body {
  margin-bottom: 10rpx;
}

.item-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10rpx;
  border-top: 1rpx solid #f5f5f5;
}

.item-type-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

/* 业务类型颜色标签 */
.item-type {
  font-size: 20rpx;
  color: #fff;
  padding: 2rpx 14rpx;
  border-radius: 6rpx;
  &.type-schedule { background: #2979ff; }
  &.type-leave { background: #9c27b0; }
  &.type-talk { background: #18bc37; }
  &.type-talk_disciplinary { background: #e43d33; }
  &.type-talk_daily { background: #00bcd4; }
  &.type-classcheck_talk { background: #ff9800; }
  &.type-check { background: #2979ff; }
  &.type-overdue { background: #e43d33; }
  &.type-default { background: #999; }
}

/* 紧急程度文字标签 */
.item-urgency-label {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  &.label-overdue { color: #e43d33; background: #ffebee; }
  &.label-today { color: #f3a044; background: #fff8e1; }
  &.label-tomorrow { color: #2979ff; background: #e3f2fd; }
  &.label-normal { color: #18bc37; background: #e8f8ea; }
}

.item-deadline {
  font-size: 22rpx;
  color: #999;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

/* ===== 筛选弹窗 ===== */
.filter-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.filter-content {
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.filter-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.filter-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.filter-body {
  flex: 1;
  padding: 30rpx;
  max-height: 60vh;
}

.filter-section {
  margin-bottom: 40rpx;
}

.filter-label {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.filter-option {
  padding: 16rpx 32rpx;
  background: #f5f5f5;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
}

.option-active {
  background: #2979ff;
  color: #fff;
}

/* 自定义时间段 */
.custom-date-wrap {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.date-picker-row {
  display: flex;
  gap: 20rpx;
}

.date-picker-item {
  flex: 1;
}

.date-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.picker-display {
  padding: 16rpx 20rpx;
  background: #fff;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  border: 1rpx solid #e0e0e0;
}

.placeholder {
  color: #999;
}

.date-hint {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #fff3e0;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #f3a044;
}

.filter-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 1rpx solid #f5f5f5;
}

.filter-reset-btn {
  flex: 1;
  padding: 20rpx 0;
  background: #f5f5f5;
  border-radius: 30rpx;
  text-align: center;
  font-size: 28rpx;
  color: #666;
}

.filter-confirm-btn {
  flex: 1;
  padding: 20rpx 0;
  background: #2979ff;
  border-radius: 30rpx;
  text-align: center;
  font-size: 28rpx;
  color: #fff;
}
</style>
