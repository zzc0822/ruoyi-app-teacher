<template>
  <view class="work-container">
    <!-- 顶部学工金句 -->
    <view class="greeting-section" @click="refreshQuote">
      <view class="quote-content">
        <view class="quote-main">
          <view class="quote-first-line-float"></view>
          <text class="quote-text">{{ workQuote.text || '用心做教育,用爱育未来' }}</text>
        </view>
        <text class="quote-author">—— {{ workQuote.author || '学工团队' }}</text>
      </view>
    </view>

    <!-- 数据汇总卡片(所有角色都显示) -->
    <view class="summary-cards-grid">
      <view class="summary-card-item">
        <text class="stats-num">{{ summaryData.attendanceRate }}</text>
        <text class="stats-label">当天到课率</text>
      </view>
      
      <view class="summary-card-item" @click="goLeaveList">
        <text class="stats-num orange">{{ summaryData.pendingLeave }}/{{ summaryData.onLeave }}</text>
        <text class="stats-label">待审批/在假</text>
      </view>
      
      <view class="summary-card-item">
        <text class="stats-num red">{{ summaryData.talkCount }}</text>
        <text class="stats-label">谈话次数</text>
      </view>
      
      <view class="summary-card-item">
        <text class="stats-num blue">{{ summaryData.reserved }}</text>
        <text class="stats-label">预留</text>
      </view>
    </view>

    <!-- 学生管理（可折叠九宫格） -->
    <view class="func-section">
      <view class="section-header" @click="toggleStudentSection">
        <text class="section-title">学生管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="studentCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view class="func-grid" v-if="!studentCollapsed">
        <view class="func-item" v-for="item in allStudentFuncs" :key="item.key" @click="onFuncClick(item)">
          <view :class="['func-icon', 'icon-' + item.color]">
            <uni-icons :type="item.icon" size="26" color="#fff"></uni-icons>
          </view>
          <text class="func-name">{{ item.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getUnreadCount } from '@/api/stumanage/todo'
import { listStuinfo } from '@/api/stumanage/stuinfo'
import { listClassCheck } from '@/api/stumanage/classcheck'
import { getRoleViewConfig } from '@/utils/roleViewConfig'
import { getWorkStats } from '@/api/stumanage/workstats'
import { getRandomQuote } from '@/api/stumanage/workquote'

// 全量功能定义
const ALL_FUNCS = [
  { key: 'stuinfo', name: '我的学生', icon: 'person-filled', color: 'blue', url: '/pages/sub-work/stuinfo/index' },
  { key: 'classcheck', name: '查课管理', icon: 'checkbox-filled', color: 'green', url: '/pages/sub-work/classcheck/index' },
  { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'orange', url: '/pages/sub-work/talk/index' },
  { key: 'leave', name: '请假管理', icon: 'paperplane-filled', color: 'red', url: '/pages/sub-work/leave/index' },
  { key: 'activity', name: '活动管理', icon: 'calendar-filled', color: 'cyan', url: '/pages/sub-work/activity/index' },
  { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple', url: '/pages/sub-work/todo/index' }
]

// 默认常用功能 key
const DEFAULT_COMMON = ['stuinfo', 'classcheck', 'talk', 'leave', 'activity', 'todo']

const STORAGE_KEY = 'work_common_funcs'
const STATS_CACHE_KEY = 'work_stats_cache'
const STATS_CACHE_EXPIRE = 5 * 60 * 1000 // 5分钟缓存

export default {
  data() {
    return {
      // 视图配置（从数据库加载）
      viewConfig: null,
      teacherName: '',
      unreadCount: 0,
      editingCommon: false,
      studentCollapsed: false,
      commonKeys: [],
      // 书记角色相关
      isSecretaryRole: true,
      summaryData: {
        attendanceRate: '--',
        pendingLeave: '--',
        onLeave: '--',
        talkCount: '--',
        reserved: '--'
      },
      pendingList: [],
      // 学工金句
      workQuote: {
        text: '',
        author: ''
      }
    }
  },
  computed: {
    allStudentFuncs() {
      // 所有角色都显示全部功能
      return ALL_FUNCS
    },
    commonList() {
      return this.commonKeys.map(k => ALL_FUNCS.find(f => f.key === k)).filter(Boolean)
    },
    availableToAdd() {
      return ALL_FUNCS.filter(f => !this.commonKeys.includes(f.key))
    }
  },
  async created() {
    
    // 初始化汇总数据为加载状态
    this.initSummaryData()
    
    // 加载教师姓名
    this.loadTeacherName()
    
    // 从数据库加载角色视图配置
    this.viewConfig = await getRoleViewConfig('work_index')
    
    this.loadCommonKeys()
    
    // 初始化时随机选择一条金句
    this.refreshQuote()
    
  },
  onShow() {
    this.loadUnread()
    // 始终加载汇总数据
    this.loadSummaryData()
  },
  methods: {
    // 初始化汇总数据
    initSummaryData() {
      this.summaryData = {
        attendanceRate: '--',
        pendingLeave: '--',
        onLeave: '--',
        talkCount: '--',
        reserved: '--'
      }
    },
    // 加载教师姓名
    loadTeacherName() {
      if (!this.$store.state.user.id) {
        this.$store.dispatch('GetInfo').then(() => {
          this.fetchTeacherName()
        }).catch(() => {
          this.teacherName = ''
        })
      } else {
        this.fetchTeacherName()
      }
    },
    // 获取教师姓名
    fetchTeacherName() {
      const userId = this.$store.state.user.id
      if (!userId) {
        this.teacherName = ''
        return
      }
      
      // 使用 store 中的用户信息
      this.teacherName = this.$store.getters.name || ''
    },
    // 加载汇总数据
    loadSummaryData() {
      // 检查缓存(5分钟有效期)
      const cache = uni.getStorageSync(STATS_CACHE_KEY)
      if (cache && cache.data && (Date.now() - cache.timestamp < STATS_CACHE_EXPIRE)) {
        this.summaryData = cache.data
        // 加载缓存中的金句
        if (cache.data.workQuote) {
          this.workQuote = cache.data.workQuote
        }
        return
      }
      
      // 只需一个请求,获取所有统计数据
      this.fetchWorkStats().catch(() => {
        // 静默失败,使用默认值
      })
    },
    // 获取工作台统计(包含待审批)
    fetchWorkStats() {
      return getWorkStats().then(res => {
        if (res && res.data) {
          this.summaryData.attendanceRate = res.data.attendanceRate || '0%'
          this.summaryData.talkCount = res.data.talkCount || '0'
          this.summaryData.onLeave = res.data.onLeave || '0'
          this.summaryData.pendingLeave = res.data.pendingLeave || '0'
          
          // 保存缓存
          uni.setStorageSync(STATS_CACHE_KEY, {
            data: {
              attendanceRate: this.summaryData.attendanceRate,
              talkCount: this.summaryData.talkCount,
              onLeave: this.summaryData.onLeave,
              pendingLeave: this.summaryData.pendingLeave,
              reserved: this.summaryData.reserved
            },
            timestamp: Date.now()
          })
        }
      })
    },
    // 随机选择一条金句（从后端获取）
    refreshQuote() {
      getRandomQuote().then(res => {
        if (res.data) {
          this.workQuote = {
            text: res.data.quoteText || '用心做教育,用爱育未来',
            author: res.data.quoteAuthor || '学工团队'
          }
          
          // 更新缓存
          const cache = uni.getStorageSync(STATS_CACHE_KEY)
          if (cache && cache.data) {
            cache.data.workQuote = this.workQuote
            cache.timestamp = Date.now()
            uni.setStorageSync(STATS_CACHE_KEY, cache)
          }
        }
      }).catch(() => {
        // 如果接口失败，使用默认金句
        this.workQuote = {
          text: '用心做教育,用爱育未来',
          author: '学工团队'
        }
      })
    },
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return ''
      const date = new Date(timeStr.replace(/ /g, 'T'))
      const now = new Date()
      const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      if (diff === 0) return '今天'
      if (diff === 1) return '昨天'
      if (diff < 7) return diff + '天前'
      
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}/${day}`
    },
    // 获取紧急程度
    getUrgency(days) {
      if (!days) return 'low'
      if (days <= 1) return 'high'
      if (days <= 3) return 'medium'
      return 'low'
    },
    // 跳转到学生列表
    goStudentList() {
      uni.navigateTo({ url: '/pages/sub-work/stuinfo/index' })
    },
    // 跳转到请假列表
    goLeaveList() {
      uni.navigateTo({ url: '/pages/sub-work/leave/index' })
    },
    // 跳转到请假详情
    goLeaveDetail(item) {
      uni.navigateTo({ url: `/pages/sub-work/leave/detail?id=${item.id}` })
    },
    // 跳转到查课列表
    goClassCheckList() {
      uni.navigateTo({ url: '/pages/sub-work/classcheck/index' })
    },
    loadCommonKeys() {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved && Array.isArray(saved) && saved.length > 0) {
        this.commonKeys = saved
      } else {
        this.commonKeys = [...DEFAULT_COMMON]
      }
    },
    saveCommonKeys() {
      uni.setStorageSync(STORAGE_KEY, this.commonKeys)
    },
    loadUnread() {
      getUnreadCount().then(res => {
        this.unreadCount = res.data || 0
      }).catch(() => {})
    },
    toggleEditCommon() {
      this.editingCommon = !this.editingCommon
    },
    toggleStudentSection() {
      this.studentCollapsed = !this.studentCollapsed
    },
    onFuncClick(item) {
      if (this.editingCommon) return
      uni.navigateTo({ url: item.url })
    },
    goTodo() {
      uni.navigateTo({ url: '/pages/sub-work/todo/index' })
    },
    removeCommon(idx) {
      this.commonKeys.splice(idx, 1)
      this.saveCommonKeys()
    },
    addCommon(item) {
      if (!this.commonKeys.includes(item.key)) {
        this.commonKeys.push(item.key)
        this.saveCommonKeys()
      }
    },
    showAddPopup() {
      this.$refs.addPopup.open()
    },
    closeAddPopup() {
      this.$refs.addPopup.close()
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background-color: #f5f6f7;
}

.work-container {
  min-height: 100vh;
  background-color: #f5f6f7;
}

/* 顶部金句区 */
.greeting-section {
  background: linear-gradient(135deg, #2979ff 0%, #1a5cd8 50%, #0d47a1 100%);
  padding: 96rpx 40rpx 60rpx;
  position: relative;
  overflow: hidden;
  
  /* 添加背景装饰 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 400rpx;
    height: 400rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    border-radius: 50%;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -10%;
    width: 300rpx;
    height: 300rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
}

.quote-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  position: relative;
  z-index: 1;
  padding: 0 20rpx;
}

.quote-main {
  position: relative;
  width: 100%;
}

/* 使用浮动元素实现第一行75%宽度 */
.quote-first-line-float {
  float: right;
  width: 25%;
  height: 65rpx; /* 36rpx * 1.8 line-height */
}

.quote-text {
  font-size: 36rpx;
  color: #fff;
  line-height: 1.8;
  font-weight: 500;
  letter-spacing: 1rpx;
  text-align: left;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  word-break: break-all;
  display: block;
  /* 限制最多显示3行 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.quote-author {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  text-align: right;
  font-style: italic;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.15);
  align-self: flex-end;
  margin-top: 8rpx;
}

/* 汇总卡片网格 */
.summary-cards-grid {
  display: flex;
  gap: 16rpx;
  margin: -40rpx 24rpx 24rpx;
  padding: 0;
  position: relative;
  z-index: 10;
}

.summary-card-item {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  /* 添加顶部装饰线 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6rpx;
    background: linear-gradient(90deg, #2979ff, #5ba3ff);
  }
  
  &:active {
    transform: translateY(-4rpx);
    box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.15);
  }
}

.stats-num {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
  margin-bottom: 8rpx;
  min-width: 80rpx;
  text-align: center;
  
  &.orange { 
    color: #ff9800;
    background: linear-gradient(135deg, #ff9800, #ffb74d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  &.red { 
    color: #f44336;
    background: linear-gradient(135deg, #f44336, #ef5350);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  &.blue { 
    color: #2979ff;
    background: linear-gradient(135deg, #2979ff, #5ba3ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.stats-label {
  font-size: 24rpx;
  color: #666;
  margin-top: 4rpx;
  font-weight: 500;
  text-align: center;
}

.greeting-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
}

.greeting-sub {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
}

.greeting-right {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  font-size: 20rpx;
  color: #fff;
  background: #e43d33;
  border-radius: 16rpx;
  padding: 0 8rpx;
}

/* 通用卡片区 */
.func-section {
  background: #fff;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  
  /* 添加微妙背景 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 200rpx;
    height: 200rpx;
    background: radial-gradient(circle, rgba(41, 121, 255, 0.03) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none; /* 确保伪元素不阻止点击 */
  }
}

.func-section:first-of-type {
  margin-top: 24rpx;
}

.func-section + .func-section {
  margin-top: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1; /* 确保在伪元素之上 */
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  position: relative;
  padding-left: 20rpx;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8rpx;
    height: 28rpx;
    background: linear-gradient(180deg, #2979ff, #1a5cd8);
    border-radius: 4rpx;
  }
}

.section-manage {
  font-size: 26rpx;
  color: #2979ff;
  padding: 8rpx 16rpx;
  cursor: pointer;
  user-select: none;
}

.section-manage:active {
  opacity: 0.6;
}

.collapse-arrow {
  padding: 8rpx;
  cursor: pointer;
  user-select: none;
}

.collapse-arrow:active {
  opacity: 0.6;
}

/* 九宫格 */
.func-grid {
  display: flex;
  flex-wrap: wrap;
}

.func-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
  position: relative;
}

.func-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.func-item:active .func-icon {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.icon-blue { background: linear-gradient(135deg, #2979ff 0%, #5ba3ff 100%); }
.icon-green { background: linear-gradient(135deg, #18bc37 0%, #4cd964 100%); }
.icon-orange { background: linear-gradient(135deg, #f3a044 0%, #ffc870 100%); }
.icon-red { background: linear-gradient(135deg, #e43d33 0%, #ff6b6b 100%); }
.icon-purple { background: linear-gradient(135deg, #9c27b0 0%, #c77dff 100%); }
.icon-add { 
  background: #f5f5f5;
  border: 2rpx dashed #ccc;
}

.add-icon-text {
  font-size: 44rpx;
  color: #999;
  font-weight: 300;
  line-height: 88rpx;
}

.func-name {
  font-size: 24rpx;
  color: #333;
}

.func-badge {
  position: absolute;
  top: -4rpx;
  right: 10rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  font-size: 20rpx;
  color: #fff;
  background: #e43d33;
  border-radius: 16rpx;
  padding: 0 8rpx;
}

.func-del {
  position: absolute;
  top: -8rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  background: #e43d33;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.func-del-x {
  font-size: 28rpx;
  color: #fff;
  line-height: 36rpx;
}

.empty-tip {
  text-align: center;
  padding: 30rpx 0;
  font-size: 26rpx;
  color: #999;
}

/* 添加弹窗 */
.add-popup {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx;
  max-height: 70vh;
}

.add-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.add-popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.add-popup-grid {
  display: flex;
  flex-wrap: wrap;
}

.add-popup-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
}

.add-popup-empty {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: #999;
}
</style>
