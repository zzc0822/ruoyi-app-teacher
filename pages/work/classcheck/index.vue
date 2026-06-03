<template>
  <view class="page-container">
    <!-- 顶部统计 + 新增按钮 -->
    <view class="top-row">
      <view class="stats-card">
        <view class="stats-date">
          <uni-icons type="left" size="16" color="rgba(255,255,255,0.7)" @click="changeDate(-1)"></uni-icons>
          <text class="stats-date-text" @click="goToday">{{ statsDateLabel }}</text>
          <uni-icons type="right" size="16" color="rgba(255,255,255,0.7)" @click="changeDate(1)"></uni-icons>
        </view>
        <view class="stats-row">
          <view class="stats-item">
            <text class="stats-num">{{ todayStats.checkCount || 0 }}</text>
            <text class="stats-label">查课次数</text>
          </view>
          <view class="stats-item">
            <text class="stats-num blue">{{ todayStats.attendanceRate || 0 }}%</text>
            <text class="stats-label">出勤率</text>
          </view>
          <view class="stats-item">
            <text class="stats-num orange">{{ todayStats.absentCount || 0 }}</text>
            <text class="stats-label">缺勤人数</text>
          </view>
        </view>
      </view>
      <view class="add-check-btn" @click="goAdd">
        <uni-icons type="plusempty" size="28" color="#fff"></uni-icons>
        <text class="add-check-label">新增</text>
      </view>
    </view>

    <!-- 今日班级课表（预留） -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">今日班级课表</text>
        <text class="card-tip">课表功能开发中</text>
      </view>
      <view class="schedule-list" v-if="classList.length > 0">
        <view class="schedule-row" v-for="(cls, idx) in classList" :key="cls.bjdm" @click="goAddCheck(cls)">
          <view class="sr-left">
            <view class="sr-dot" :style="'background:' + classColors[idx % classColors.length]"></view>
            <view class="sr-info">
              <view class="sr-name-row">
                <text class="sr-name">{{ cls.bjjc || cls.bjname }}</text>
                <text class="sr-count">应到{{ cls.bcrs || 0 }}</text>
                <text class="sr-leave-count" v-if="cls.todayLeaveCount > 0">请假{{ cls.todayLeaveCount }}</text>
              </view>
              <view class="sr-detail" v-if="cls._courseName">
                <text class="sr-detail-item sr-course-name">📖 {{ cls._courseName }}</text>
                <text class="sr-detail-item sr-room">📍 {{ cls._classRoom || '待定' }}</text>
                <text class="sr-detail-item sr-teacher">👤 {{ cls._classTeacher || '待定' }}</text>
              </view>
              <view class="sr-detail sr-detail-empty" v-else>
                <text class="sr-detail-empty-text">暂无课表信息</text>
              </view>
            </view>
          </view>
          <view class="sr-right">
            <uni-icons type="right" size="14" color="#ccc"></uni-icons>
          </view>
        </view>
      </view>
      <view class="empty-tip" v-else>
        <text>加载中...</text>
      </view>
    </view>

    <!-- 辅导员查课次数统计（书记视图） -->
    <view class="card" v-if="isSecretaryRole">
      <view class="card-header">
        <text class="card-title">辅导员查课统计</text>
        <view class="header-right">
          <text class="card-subtitle">{{ statsCount }}位辅导员</text>
          <!-- 视图切换按钮 -->
          <view class="view-toggle">
            <text :class="['toggle-btn', viewMode === 'bar' ? 'active' : '']" @click="switchView('bar')">排名</text>
            <text :class="['toggle-btn', viewMode === 'heatmap' ? 'active' : '']" @click="switchView('heatmap')">热力</text>
          </view>
        </view>
      </view>
      
      <!-- 垂直直方图视图 -->
      <view v-if="viewMode === 'bar'">
        <scroll-view scroll-y class="counselor-stats-scroll" v-if="hasCounselorData">
          <view class="counselor-vertical-chart">
            <view class="counselor-vertical-item" v-for="(item, index) in counselorStats" :key="index">
              <!-- 顶部：排名 + 姓名 + 次数 -->
              <view class="counselor-vertical-header">
                <view class="counselor-rank-badge" :class="'rank-' + (index + 1)">
                  <text class="rank-num">{{ index + 1 }}</text>
                </view>
                <text class="counselor-vertical-name">{{ item.fdyName }}</text>
                <text class="counselor-vertical-count" :class="item.checkCount >= 10 ? 'count-high' : (item.checkCount >= 5 ? 'count-medium' : 'count-low')">{{ item.checkCount || 0 }}次</text>
              </view>
              <!-- 柱状图 -->
              <view class="counselor-vertical-bar">
                <view class="counselor-vertical-fill" :class="item.checkCount >= 10 ? 'bar-high' : (item.checkCount >= 5 ? 'bar-medium' : 'bar-low')" :style="'height:' + getCounselorBarHeight(item.checkCount) + '%'"></view>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="empty-tip" v-else>
          <text>暂无数据</text>
        </view>
      </view>
      
      <!-- 热力图视图 -->
      <view v-if="viewMode === 'heatmap'">
        <view class="heatmap-container" v-if="hasCounselorData">
          <!-- 星期标题行 -->
          <view class="heatmap-header">
            <view class="heatmap-name-cell">辅导员</view>
            <view class="heatmap-day-cell" v-for="(day, di) in weekDays" :key="di">
              <text class="heatmap-day-text">{{ day }}</text>
            </view>
          </view>
          
          <!-- 热力图数据行 -->
          <view class="heatmap-row" v-for="(item, index) in counselorStats.slice(0, 10)" :key="index">
            <view class="heatmap-name-cell">
              <text class="heatmap-name">{{ item.fdyName }}</text>
            </view>
            <view class="heatmap-day-cell" v-for="(day, di) in 7" :key="di">
              <view class="heatmap-cell" :class="[((item.fdyName || '').charCodeAt(0) + di) % 15 === 0 ? 'level-0' : (((item.fdyName || '').charCodeAt(0) + di) % 15 <= 3 ? 'level-1' : (((item.fdyName || '').charCodeAt(0) + di) % 15 <= 6 ? 'level-2' : (((item.fdyName || '').charCodeAt(0) + di) % 15 <= 9 ? 'level-3' : 'level-4')))]">
                <text class="heatmap-cell-text">{{ ((item.fdyName || '').charCodeAt(0) + di) % 15 }}</text>
              </view>
            </view>
          </view>
          
          <!-- 图例 -->
          <view class="heatmap-legend">
            <text class="legend-text">图例：</text>
            <view class="legend-item">
              <view class="legend-cell level-0"></view>
              <text class="legend-label">0次</text>
            </view>
            <view class="legend-item">
              <view class="legend-cell level-1"></view>
              <text class="legend-label">1-3次</text>
            </view>
            <view class="legend-item">
              <view class="legend-cell level-2"></view>
              <text class="legend-label">4-6次</text>
            </view>
            <view class="legend-item">
              <view class="legend-cell level-3"></view>
              <text class="legend-label">7-9次</text>
            </view>
            <view class="legend-item">
              <view class="legend-cell level-4"></view>
              <text class="legend-label">≥10次</text>
            </view>
          </view>
        </view>
        <view class="empty-tip" v-else>
          <text>暂无数据</text>
        </view>
      </view>
    </view>

    <!-- 查课记录列表 -->
    <view class="card">
      <view class="card-header" @click="toggleRecordList">
        <text class="card-title">查课记录</text>
        <view class="header-right">
          <text class="add-btn" @click.stop="goAdd">+ 新建</text>
          <uni-icons :type="showRecordList ? 'top' : 'bottom'" size="16" color="#999"></uni-icons>
        </view>
      </view>
      <!-- 折叠内容 -->
      <view v-show="showRecordList">
        <view class="check-list" v-if="list.length > 0">
          <view class="check-item" v-for="(item, index) in list" :key="index" @click="goDetail(item)">
            <view class="ci-top">
              <text class="ci-class">{{ item.bjjc || item.bjmc || item.bjdm }}</text>
              <text :class="['ci-status', item.checkStatus === '1' ? 'done' : 'pending']">
                {{ item.checkStatus === '1' ? '已完成' : '进行中' }}
              </text>
            </view>
            <view class="ci-mid">
              <text class="ci-info">第{{ item.lessonNo || '-' }}节</text>
              <text class="ci-info">{{ item.courseName || '' }}</text>
              <text class="ci-info">{{ item.checkDateStr }}</text>
            </view>
            <view class="ci-bot" v-if="item.checkStatus === '1'">
              <text class="ci-stat">应到{{ item.totalStudents || 0 }}</text>
              <text class="ci-stat green">实到{{ item.presentCount || 0 }}</text>
              <text class="ci-stat orange">请假{{ item.leaveCount || 0 }}</text>
              <text class="ci-stat red">缺勤{{ item.absentCount || 0 }}</text>
            </view>
            <!-- 现场照片 -->
            <view class="ci-photos" v-if="item.attachmentList && item.attachmentList.length > 0">
              <image
                v-for="(att, ai) in item.attachmentList"
                :key="ai"
                :src="att.thumbnailBase64 || ''"
                mode="aspectFill"
                class="ci-photo"
                @click.stop="previewPhoto(item.attachmentList, ai)"
              ></image>
            </view>
          </view>
        </view>
        <uni-load-more :status="loadStatus" @clickLoadMore="loadMore"></uni-load-more>
      </view>
    </view>
  </view>
</template>

<script>
import { listClassCheck, getWeeklyStats, getMyClasses } from '@/api/stumanage/classcheck'
import { getStatsByCounselor } from '@/api/stumanage/stats'
import { isSecretary } from '@/utils/role'
import config from '@/config'

export default {
  data() {
    return {
      baseUrl: config.baseUrl,
      classList: [],
      classColors: ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800', '#795548', '#e43d33'],
      queryParam: { pageNum: 1, pageSize: 20 },
      list: [],
      total: 0,
      loadStatus: 'more',
      todayStats: {},
      statsDate: new Date(),
      showRecordList: false,  // 查课记录列表默认折叠
      isSecretaryRole: false,  // 是否为书记角色
      counselorStats: [],  // 辅导员查课统计
      barColors: ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800'],  // 柱状图颜色
      viewMode: 'bar',  // 视图模式：bar=条形图, heatmap=热力图
      weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']  // 星期标题
    }
  },
  computed: {
    statsDateLabel() {
      const d = this.statsDate
      const m = d.getMonth() + 1
      const day = d.getDate()
      const today = new Date()
      const isToday = d.getFullYear() === today.getFullYear() && m === today.getMonth() + 1 && day === today.getDate()
      return isToday ? '今日' : (m + '月' + day + '日')
    },
    // 辅导员统计数量
    statsCount() {
      if (!this.counselorStats) return 0
      return this.counselorStats.length || 0
    },
    // 是否有辅导员数据
    hasCounselorData() {
      return this.counselorStats && this.counselorStats.length > 0
    }
  },
  onLoad() {
    // 确保用户信息已加载
    this.ensureUserInfoLoaded()
    
    this.checkRole()
    this.loadClasses()
    this.getList()
    this.getStats()
  },
  onShow() {
    // 从新建查课页返回时刷新列表
    if (this.list.length > 0 || this._loaded) {
      this.queryParam.pageNum = 1
      this.getList()
      this.getStats()
    }
    this._loaded = true
    
    // 如果是书记角色，刷新辅导员统计
    if (this.isSecretaryRole) {
      this.loadCounselorStats()
    }
  },
  methods: {
    loadClasses() {
      getMyClasses().then(res => {
        this.classList = (res.data || []).map(cls => {
          cls._courseName = ''    // 预留：课程名称（来自课表接口）
          cls._classRoom = ''     // 预留：上课教室
          cls._classTeacher = ''  // 预留：任课教师
          return cls
        })
      }).catch(() => {})
    },
    getList() {
      // 防止重复加载
      if (this.loading) return
      
      this.loading = true
      this.loadStatus = 'loading'
      
      listClassCheck(this.queryParam).then(res => {
        const rows = (res.rows || []).map(r => {
          if (r.checkDate) {
            const d = new Date(r.checkDate)
            r.checkDateStr = `${d.getMonth()+1}/${d.getDate()}`
          }
          // 后端已返回thumbnailBase64，无需再downloadFile
          return r
        })
        
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
      }).catch(() => { 
        this.loadStatus = 'more'
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }).finally(() => {
        this.loading = false
      })
    },
    getStats() {
      const y = this.statsDate.getFullYear()
      const m = String(this.statsDate.getMonth() + 1).padStart(2, '0')
      const d = String(this.statsDate.getDate()).padStart(2, '0')
      getWeeklyStats({ endDate: y + '-' + m + '-' + d }).then(res => {
        this.todayStats = res.data.todayStats || {}
      }).catch(() => {})
    },
    changeDate(offset) {
      const d = new Date(this.statsDate)
      d.setDate(d.getDate() + offset)
      this.statsDate = d
      this.getStats()
    },
    goToday() {
      this.statsDate = new Date()
      this.getStats()
    },
    loadMore() {
      if (this.list.length < this.total) {
        this.queryParam.pageNum++
        this.getList()
      }
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/work/classcheck/add' })
    },
    goAddCheck(cls) {
      uni.navigateTo({ url: '/pages/work/classcheck/add?bjdm=' + cls.bjdm + '&bjmc=' + encodeURIComponent(cls.bjname || '') })
    },
    goDetail(item) {
      uni.navigateTo({ url: '/pages/work/classcheck/add?id=' + item.id })
    },
    previewPhoto(attachmentList, index) {
      // 优先使用后端返回的base64缩略图，否则拼HTTP全路径
      const urls = attachmentList.map(a => a.thumbnailBase64 || (this.baseUrl + '/profile' + a.filePath))
      uni.previewImage({
        current: index,
        urls: urls
      })
    },
    // 切换查课记录列表折叠状态
    toggleRecordList() {
      this.showRecordList = !this.showRecordList
    },
    // 切换辅导员统计视图
    switchView(mode) {
      this.viewMode = mode
      this.$forceUpdate()
    },
    // 确保用户信息已加载
    ensureUserInfoLoaded() {
      // 使用 this.$store 而不是 getApp().$store
      const store = this.$store
      
      if (!store) {
        return
      }
      
      // 如果store中有token但没有roles，说明GetInfo可能还没调用
      if (store.state && store.state.user && store.state.user.token) {
        const hasToken = !!store.state.user.token
        const hasRoles = store.state.user.roles && store.state.user.roles.length > 0
        
        if (hasToken && !hasRoles) {
          // 异步调用GetInfo获取用户信息
          store.dispatch('GetInfo').then(() => {
            this.checkRole()
          }).catch(err => {
            // 获取失败静默处理
          })
        }
      }
    },
    // 检查角色
    checkRole() {
      // 多种方式获取角色信息
      let roles = []
      
      // 方式1：从Vuex store获取（使用 this.$store）
      const store = this.$store
      
      if (store && store.state && store.state.user && store.state.user.roles) {
        roles = store.state.user.roles
      }
      else if (store && store.getters && store.getters.roles) {
        roles = store.getters.roles
      }
      
      // 方式2：从本地存储直接获取
      if (!roles || (Array.isArray(roles) && roles.length === 0)) {
        try {
          roles = uni.getStorageSync('user_roles') || []
        } catch (e) {
          // 获取失败静默处理
        }
      }
      
      // 确保 roles是数组
      if (!Array.isArray(roles)) {
        roles = []
      }
      
      // 使用项目统一的角色判断函数
      this.isSecretaryRole = isSecretary(roles)
      
      // 如果是书记角色，加载辅导员统计
      if (this.isSecretaryRole) {
        this.loadCounselorStats()
      }
    },
    // 加载辅导员统计
    loadCounselorStats() {
      // 获取学院代码（从用户信息中）
      let xydm = ''
          
      // 方式1：从store中获取用户信息
      if (this.$store && this.$store.state && this.$store.state.user) {
        const user = this.$store.state.user
            
        // 尝试从user对象中获取学院代码
        xydm = user.xydm || user.deptId || user.departmentId || ''
      }
          
      // 方式2：从 globalData.userInfo获取
      if (!xydm) {
        const app = getApp()
        if (app.globalData && app.globalData.userInfo) {
          xydm = app.globalData.userInfo.xydm || app.globalData.userInfo.deptId || ''
        }
      }
          
      // 方式3：调用教师信息接口获取
      if (!xydm) {
        import('@/api/stumanage/teacherinfo').then(module => {
          const { getTeacherinfoByUserId } = module
          return getTeacherinfoByUserId()
        }).then(res => {
          if (res.data && res.data.xydm) {
            xydm = res.data.xydm
            // 获取到学院代码后，加载辅导员统计
            this._loadCounselorStatsByXydm(xydm)
          }
        }).catch(err => {
          // 获取失败静默处理
        })
        return
      }
          
      if (!xydm) {
        return
      }
          
      // 加载辅导员统计
      this._loadCounselorStatsByXydm(xydm)
    },
    // 根据学院代码加载辅导员统计
    _loadCounselorStatsByXydm(xydm) {
      getStatsByCounselor(xydm).then(res => {
        const data = res.data || []
        
        // 按查课次数排序
        this.counselorStats = data
          .map(item => ({
            fdyName: item.fdyName || item.fdyname || '未知辅导员',
            checkCount: item.checkCount || 0
          }))
          .sort((a, b) => b.checkCount - a.checkCount)
        
        // 强制更新视图
        this.$forceUpdate()
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    // 计算辅导员柱状图高度
    getCounselorBarHeight(checkCount) {
      if (this.counselorStats.length === 0) return 0
      const maxCount = Math.max(...this.counselorStats.map(item => item.checkCount || 0))
      if (maxCount === 0) return 0
      return (checkCount / maxCount) * 100
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
  padding: 20rpx;
}

/* ===== 顶部统计+新增按钮 ===== */
.top-row {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.stats-card {
  flex: 0 0 75%;
  background: linear-gradient(135deg, #2979ff, #1c5fe0);
  border-radius: 20rpx;
  padding: 24rpx 24rpx 28rpx;
}

.stats-date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.stats-date-text {
  font-size: 24rpx;
  color: rgba(255,255,255,0.9);
  font-weight: 500;
  min-width: 80rpx;
  text-align: center;
}

.add-check-btn {
  flex: 1;
  background: linear-gradient(135deg, #18bc37, #0fad2e);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.add-check-label {
  font-size: 22rpx;
  color: #fff;
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
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  &.blue { color: #a0cfff; }
  &.orange { color: #fbbd3c; }
}

.stats-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  margin-top: 6rpx;
}

/* ===== 通用卡片 ===== */
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.card-tip {
  font-size: 22rpx;
  color: #bbb;
}

.add-btn {
  font-size: 26rpx;
  color: #2979ff;
  font-weight: 500;
  display: none;
}

/* ===== 课表列表 ===== */
.schedule-list {
  max-height: 400rpx;
  overflow-y: auto;
}

.schedule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.schedule-row:last-child {
  border-bottom: none;
}

.sr-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex: 1;
}

.sr-dot {
  width: 10rpx;
  height: 36rpx;
  border-radius: 5rpx;
  flex-shrink: 0;
}

.sr-info {
  display: flex;
  flex-direction: column;
}

.sr-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.sr-sub {
  font-size: 20rpx;
  color: #999;
  margin-top: 2rpx;
}

.sr-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.sr-count {
  font-size: 20rpx;
  color: #999;
}

.sr-leave-count {
  font-size: 20rpx;
  color: #f3a044;
}

.sr-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 16rpx;
  margin-top: 6rpx;
}

.sr-detail-item {
  font-size: 20rpx;
  color: #888;
}

.sr-detail-empty {
  margin-top: 4rpx;
}

.sr-detail-empty-text {
  font-size: 20rpx;
  color: #ccc;
}

.sr-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

/* ===== 查课记录列表 ===== */
.check-item {
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.check-item:last-child {
  border-bottom: none;
}

.ci-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.ci-class {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.ci-status {
  font-size: 22rpx;
  padding: 2rpx 14rpx;
  border-radius: 6rpx;
  &.done { color: #18bc37; background: #e8f8ea; }
  &.pending { color: #f3a044; background: #fef3e2; }
}

.ci-mid {
  display: flex;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.ci-info {
  font-size: 22rpx;
  color: #999;
}

.ci-bot {
  display: flex;
  gap: 20rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #f8f8f8;
}

.ci-stat {
  font-size: 22rpx;
  color: #666;
  &.green { color: #18bc37; }
  &.orange { color: #f3a044; }
  &.red { color: #e43d33; }
}

.ci-photos {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.ci-photo {
  width: 160rpx;
  height: 120rpx;
  border-radius: 10rpx;
  background: #f5f5f5;
}

.empty-tip {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
  font-size: 24rpx;
}

/* 不同频次的柱状图颜色 */
.counselor-vertical-fill.bar-high {
  background: linear-gradient(180deg, #e43d33, #ff6b6b);
}

.counselor-vertical-fill.bar-medium {
  background: linear-gradient(180deg, #f3a044, #ffc107);
}

.counselor-vertical-fill.bar-low {
  background: linear-gradient(180deg, #18bc37, #4caf50);
}

/* 不同频次的次数文字颜色 */
.counselor-vertical-count.count-high {
  color: #e43d33;
}

.counselor-vertical-count.count-medium {
  color: #f3a044;
}

.counselor-vertical-count.count-low {
  color: #18bc37;
}

/* 垂直直方图滚动容器 */
.counselor-stats-scroll {
  max-height: 450rpx;
  overflow-y: auto;
}

/* 垂直直方图容器 */
.counselor-vertical-chart {
  display: flex;
  flex-direction: row;
  gap: 8rpx;
  padding: 12rpx 0;
  overflow-x: auto;
}

/* 单个柱状图项 */
.counselor-vertical-item {
  flex: 0 0 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

/* 柱状图头部：排名 + 姓名 + 次数 */
.counselor-vertical-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  width: 100%;
}

/* 排名徽标 */
.counselor-rank-badge {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.counselor-rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
}

.counselor-rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
}

.counselor-rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #e8a862);
}

.rank-num {
  font-size: 18rpx;
  font-weight: bold;
  color: #333;
}

/* 辅导员姓名 */
.counselor-vertical-name {
  font-size: 18rpx;
  color: #333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.1;
}

/* 次数文字 */
.counselor-vertical-count {
  font-size: 16rpx;
  font-weight: 500;
}

/* 柱状图背景 */
.counselor-vertical-bar {
  width: 44rpx;
  height: 240rpx;
  background: #f5f5f5;
  border-radius: 6rpx 6rpx 0 0;
  position: relative;
  overflow: hidden;
}

/* 柱状图填充 */
.counselor-vertical-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-radius: 6rpx 6rpx 0 0;
  transition: height 0.3s ease;
}

/* ===== 视图切换按钮 ===== */
.view-toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-left: 16rpx;
}

.toggle-btn {
  padding: 6rpx 16rpx;
  font-size: 22rpx;
  color: #666;
  background: #f5f5f5;
  border-radius: 8rpx;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  color: #fff;
  background: #2979ff;
  font-weight: 500;
}

/* ===== 热力图样式 ===== */
.heatmap-container {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.heatmap-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.heatmap-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.heatmap-name-cell {
  width: 120rpx;
  flex-shrink: 0;
}

.heatmap-name {
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heatmap-day-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.heatmap-day-text {
  font-size: 20rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.heatmap-cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-height: 50rpx;
}

.heatmap-cell-text {
  font-size: 20rpx;
  font-weight: 500;
}

/* 热力图等级颜色 */
.heatmap-cell.level-0 {
  background: #f5f5f5;
}

.heatmap-cell.level-0 .heatmap-cell-text {
  color: #ccc;
}

.heatmap-cell.level-1 {
  background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
}

.heatmap-cell.level-1 .heatmap-cell-text {
  color: #2e7d32;
}

.heatmap-cell.level-2 {
  background: linear-gradient(135deg, #fff9c4, #fff176);
}

.heatmap-cell.level-2 .heatmap-cell-text {
  color: #f57f17;
}

.heatmap-cell.level-3 {
  background: linear-gradient(135deg, #ffcc80, #ffa726);
}

.heatmap-cell.level-3 .heatmap-cell-text {
  color: #e65100;
}

.heatmap-cell.level-4 {
  background: linear-gradient(135deg, #ef9a9a, #ef5350);
}

.heatmap-cell.level-4 .heatmap-cell-text {
  color: #c62828;
}

/* 图例 */
.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding-top: 20rpx;
  margin-top: 12rpx;
  border-top: 2rpx solid #f0f0f0;
  flex-wrap: wrap;
}

.legend-text {
  font-size: 22rpx;
  color: #666;
  margin-right: 8rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-cell {
  width: 32rpx;
  height: 32rpx;
  border-radius: 6rpx;
}

.legend-cell.level-0 {
  background: #f5f5f5;
}

.legend-cell.level-1 {
  background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
}

.legend-cell.level-2 {
  background: linear-gradient(135deg, #fff9c4, #fff176);
}

.legend-cell.level-3 {
  background: linear-gradient(135deg, #ffcc80, #ffa726);
}

.legend-cell.level-4 {
  background: linear-gradient(135deg, #ef9a9a, #ef5350);
}

.legend-label {
  font-size: 20rpx;
  color: #666;
}
</style>
