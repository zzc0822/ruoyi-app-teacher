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
      <view class="top-btn-group">
        <view class="sign-btn" @click="goSign">
          <uni-icons type="calendar" size="20" color="#fff"></uni-icons>
          <text class="sign-btn-label">签到</text>
        </view>
        <view class="add-check-btn" @click="goAdd">
          <uni-icons type="plusempty" size="28" color="#fff"></uni-icons>
          <text class="add-check-label">新增</text>
        </view>
      </view>
    </view>

    <!-- 今日班级课表 -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">今日班级课表</text>
        <view class="week-info-tag" v-if="weekInfo.isVacation">
          <text class="holiday-tag">{{ weekInfo.holidayName || '假期' }}</text>
        </view>
        <view class="week-info-tag" v-else-if="weekInfo.weekNumber">
          <text class="week-tag">{{ weekInfo.weekName || ('第' + weekInfo.weekNumber + '周') }}</text>
          <text class="holiday-tag" v-if="weekInfo.isHoliday">{{ weekInfo.holidayName || '假期' }}</text>
          <text class="weekend-tag" v-else-if="weekInfo.isWeekend">周末</text>
        </view>
      </view>
      
      <!-- 日期/节次选择器 -->
      <view class="schedule-selector">
        <view class="selector-group">
          <uni-icons type="left" size="14" color="#666" @click="changeScheduleDate(-1)"></uni-icons>
          <text class="selector-text">{{ selectedDateText }}</text>
          <uni-icons type="right" size="14" color="#666" @click="changeScheduleDate(1)"></uni-icons>
        </view>
        <view class="selector-group">
          <uni-icons type="top" size="14" color="#666" @click="changeScheduleSection(-1)"></uni-icons>
          <text class="selector-text">{{ currentSectionText }}</text>
          <uni-icons type="bottom" size="14" color="#666" @click="changeScheduleSection(1)"></uni-icons>
        </view>
      </view>
      
      <view class="schedule-list" v-if="todayScheduleList.length > 0">
        <view 
          class="schedule-row" 
          :class="{ checked: isClassChecked(item.bjdm) }"
          v-for="(item, idx) in todayScheduleList" 
          :key="idx" 
          @click.stop="goAddCheck(item)"
        >
          <view class="sr-left">
            <view class="sr-dot" :style="'background:' + classColors[idx % classColors.length]"></view>
            <view class="sr-info">
              <view class="sr-name-row">
                <text class="sr-name">{{ item.bjjc || item.bjname }}</text>
                <text class="sr-check-tag" v-if="isClassChecked(item.bjdm)">已查课</text>
                <text class="sr-check-tag pending" v-else>未查课</text>
              </view>
              <view class="sr-detail">
                <text class="sr-detail-item sr-course-name">📖 {{ item.courseName }}</text>
                <text class="sr-detail-item sr-room">📍 {{ item.classroom }}</text>
                <text class="sr-detail-item sr-teacher">👤 {{ item.teacherName }}</text>
              </view>
            </view>
          </view>
          <view class="sr-right">
            <uni-icons type="right" size="14" color="#ccc"></uni-icons>
          </view>
        </view>
      </view>
      <view class="empty-tip" v-else>
        <text v-if="weekInfo.isVacation">{{ weekInfo.holidayName || '假期' }}期间无课表</text>
        <text v-else-if="weekInfo.isHoliday">{{ weekInfo.holidayName || '假期' }}期间无课表</text>
        <text v-else-if="weekInfo.isWeekend">周末无课表</text>
        <text v-else>当前节次暂无课表</text>
      </view>
    </view>

    <!-- 查课统计概览 -->
    <view class="stats-overview" v-if="showStatsOverview">
      <view class="overview-header" @click="showStatsOverview = false">
        <text class="overview-title">{{ isSecretaryRole ? '辅导员查课统计' : '我的查课统计' }}</text>
        <view class="header-right" v-if="isSecretaryRole">
          <text class="card-subtitle">{{ statsCount }}位辅导员</text>
          <view class="view-toggle">
            <text :class="['toggle-btn', viewMode === 'bar' ? 'active' : '']" @click.stop="switchView('bar')">排名</text>
            <text :class="['toggle-btn', viewMode === 'heatmap' ? 'active' : '']" @click.stop="switchView('heatmap')">热力</text>
          </view>
        </view>
        <text class="overview-toggle">收起 ↑</text>
      </view>
      <!-- 书记视图：按辅导员分组（条形图/热力图） -->
      <view v-if="isSecretaryRole">
        <!-- 垂直直方图视图 -->
        <view v-if="viewMode === 'bar'">
          <scroll-view scroll-y class="counselor-stats-scroll" v-if="hasCounselorData">
            <view class="counselor-vertical-chart">
              <view class="counselor-vertical-item" v-for="(item, index) in counselorStats" :key="index">
                <view class="counselor-vertical-header">
                  <view class="counselor-rank-badge" :class="'rank-' + (index + 1)">
                    <text class="rank-num">{{ index + 1 }}</text>
                  </view>
                  <text class="counselor-vertical-name">{{ item.fdyName }}</text>
                  <text class="counselor-vertical-count" :class="item.checkCount >= 10 ? 'count-high' : (item.checkCount >= 5 ? 'count-medium' : 'count-low')">{{ item.checkCount || 0 }}次</text>
                </view>
                <view class="counselor-vertical-bar">
                  <view class="counselor-vertical-fill" :class="item.checkCount >= 10 ? 'bar-high' : (item.checkCount >= 5 ? 'bar-medium' : 'bar-low')" :style="'height:' + getCounselorBarHeight(item.checkCount) + '%'"></view>
                </view>
              </view>
            </view>
          </scroll-view>
          <view class="empty-tip" v-else><text>暂无数据</text></view>
        </view>
        <!-- 热力图视图 -->
        <view v-if="viewMode === 'heatmap'">
          <view class="heatmap-container" v-if="hasCounselorData">
            <view class="heatmap-header">
              <view class="heatmap-name-cell">辅导员</view>
              <view class="heatmap-day-cell" v-for="(day, di) in weekDays" :key="di">
                <text class="heatmap-day-text">{{ day }}</text>
              </view>
            </view>
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
          <view class="empty-tip" v-else><text>暂无数据</text></view>
        </view>
      </view>
      <!-- 辅导员视图：个人统计 -->
      <view v-else class="personal-stats">
        <view class="personal-stats-row">
          <view class="personal-stat-item">
            <text class="ps-num">{{ personalStats.checkCount || 0 }}</text>
            <text class="ps-label">查课次数</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num blue">{{ personalStats.checkedClasses || 0 }}</text>
            <text class="ps-label">已查班级</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num orange">{{ personalStats.totalClasses || 0 }}</text>
            <text class="ps-label">总班级</text>
          </view>
          <view class="personal-stat-item">
            <text class="ps-num green">{{ personalStats.totalStudents || 0 }}</text>
            <text class="ps-label">涉及学生</text>
          </view>
        </view>
        <view class="completion-bar" v-if="(personalStats.totalClasses || 0) > 0">
          <view class="completion-fill" :style="'width:' + checkCoverage + '%'"></view>
          <text class="completion-text">覆盖率 {{ checkCoverage }}%</text>
        </view>
      </view>
    </view>
    <view class="stats-overview-mini" v-if="!showStatsOverview" @click="showStatsOverview = true">
      <text class="mini-title">{{ isSecretaryRole ? '辅导员统计' : '我的统计' }}</text>
      <text class="mini-toggle">展开 ↓</text>
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
                :src="att.thumbnailBase64 || (baseUrl + '/profile' + att.filePath) || ''"
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
import { listClassCheck, getClassCheckStats, getMyClasses } from '@/api/work/classcheck'
import { getTodaySchedules, getWeekInfo } from '@/api/work/schedule'
import { getStatsByCounselor } from '@/api/student/stats'
import { getModuleOverview } from '@/api/student/moduleStats'
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
      showRecordList: true,  // 查课记录列表默认展开
      isSecretaryRole: false,  // 是否为书记角色
      counselorStats: [],  // 辅导员查课统计
      barColors: ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800'],  // 柱状图颜色
      viewMode: 'bar',  // 视图模式：bar=条形图, heatmap=热力图
      weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],  // 星期标题
      expandedMajors: {},  // 专业展开状态
      secretaryCollege: '',  // 书记所在学院代码
      majorStats: [],  // 专业统计数据
      currentWeekday: 1,  // 当前星期几（1-7，周一=1）
      currentSection: 1,  // 当前节次
      selectedDate: new Date(),  // 选中的日期
      selectedSection: 1,  // 选中的节次
      todayScheduleList: [],  // 当前节次的课表列表
      checkedClasses: {},  // 已查课班级集合：key=bjdm-selectedDate-selectedSection
      weekInfo: {},  // 校历信息（周次、学期、节假日）
      currentSemester: '',  // 当前学期
      showStatsOverview: true,  // 统计概览是否展开
      personalStats: { total: 0, checkCount: 0, totalClasses: 0, checkedClasses: 0, totalStudents: 0 }  // 辅导员个人统计
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
    checkCoverage() {
      const total = this.personalStats.totalClasses || 0
      const checked = this.personalStats.checkedClasses || 0
      return total > 0 ? Math.round((checked / total) * 100) : 0
    },
    // 辅导员统计数量
    statsCount() {
      if (!this.counselorStats) return 0
      return this.counselorStats.length || 0
    },
    // 是否有辅导员数据
    hasCounselorData() {
      return this.counselorStats && this.counselorStats.length > 0
    },
    // 当前星期几中文
    currentWeekdayText() {
      const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return map[this.selectedDate.getDay()]
    },
    // 当前选中日期文本
    selectedDateText() {
      const m = this.selectedDate.getMonth() + 1
      const d = this.selectedDate.getDate()
      return `${this.currentWeekdayText} ${m}/${d}`
    },
    // 当前节次标题
    currentSectionText() {
      return `第${this.selectedSection}节`
    },
    // 选中的星期几（1-7）
    selectedWeekday() {
      const day = this.selectedDate.getDay()
      return day === 0 ? 7 : day
    },
    groupedClasses() {
      if (!this.isSecretaryRole || this.majorStats.length === 0) {
        return []
      }
      
      // 按zydm分组classList
      const classesByMajor = {}
      this.classList.forEach(cls => {
        const zydm = cls.zydm
        if (!classesByMajor[zydm]) {
          classesByMajor[zydm] = []
        }
        classesByMajor[zydm].push(cls)
      })
      
      // 将班级关联到专业统计
      return this.majorStats.map(major => ({
        ...major,
        classes: classesByMajor[major.zydm] || []
      }))
    }
  },
  onLoad() {
    // 确保用户信息已加载
    this.ensureUserInfoLoaded()
    
    // 计算当前星期几和节次
    this.computeCurrentTime()
    
    // 检查角色（内部会调用loadClasses）
    this.checkRole()
    
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
    } else {
      getModuleOverview().then(res => {
        if (res.data && res.data.classCheck) {
          this.personalStats = res.data.classCheck
        }
      }).catch(() => {})
    }
  },
  methods: {
    // 切换专业展开/折叠
    toggleMajorExpand(zydm) {
      this.$set(this.expandedMajors, zydm, !this.expandedMajors[zydm])
    },
    
    // 计算当前星期几和节次（初始化选中值）
    computeCurrentTime() {
      const now = new Date()
      this.selectedDate = now
      
      // 根据当前时间计算节次（默认上课时间，非上课时间默认第1节）
      const minutes = now.getHours() * 60 + now.getMinutes()
      const sections = [
        { no: 1, start: 8 * 60, end: 8 * 60 + 45 },
        { no: 2, start: 8 * 60 + 55, end: 9 * 60 + 40 },
        { no: 3, start: 10 * 60, end: 10 * 60 + 45 },
        { no: 4, start: 10 * 60 + 55, end: 11 * 60 + 40 },
        { no: 5, start: 14 * 60 + 30, end: 15 * 60 + 15 },
        { no: 6, start: 15 * 60 + 25, end: 16 * 60 + 10 },
        { no: 7, start: 16 * 60 + 20, end: 17 * 60 + 5 },
        { no: 8, start: 17 * 60 + 15, end: 18 * 60 },
        { no: 9, start: 19 * 60 + 30, end: 20 * 60 + 15 },
        { no: 10, start: 20 * 60 + 25, end: 21 * 60 + 10 }
      ]
      const matched = sections.find(s => minutes >= s.start && minutes <= s.end)
      this.selectedSection = matched ? matched.no : 1
    },
    
    // 加载当天课表，并过滤当前节次
    loadTodaySchedules() {
      const y = this.selectedDate.getFullYear()
      const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0')
      const d = String(this.selectedDate.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      
      // 先获取校历信息（周次、学期、节假日）
      getWeekInfo(dateStr).then(weekRes => {
        const info = weekRes.data || {}
        this.weekInfo = info
        this.currentSemester = info.currentSemester || ''
        
        // 传递 semester 和 weekNumber 查询课表
        const params = { weekday: this.selectedWeekday }
        if (info.currentSemester) {
          params.semester = info.currentSemester
        }
        if (info.weekNumber) {
          params.weekNumber = info.weekNumber
        }
        
        return getTodaySchedules(this.selectedWeekday, info.currentSemester, info.weekNumber)
      }).then(res => {
        const data = res.data || []
        const classMap = {}
        this.classList.forEach(cls => {
          classMap[cls.bjdm] = cls
        })
        
        const list = []
        data.forEach(item => {
          const bjdm = item.bjdm
          const cls = classMap[bjdm]
          if (!cls) return
          const schedules = (item.schedules || []).filter(s => s.startSection === this.selectedSection)
          schedules.forEach(s => {
            list.push({
              bjdm,
              bjjc: cls.bjjc || item.className || cls.bjname || bjdm,
              bjname: cls.bjname || item.className || bjdm,
              courseName: s.courseName || '-',
              classroom: s.classroom || '-',
              teacherName: s.teacherName || '-'
            })
          })
        })
        
        this.todayScheduleList = list
        this.loadCheckedStatus()
      }).catch(() => {
        this.todayScheduleList = []
        this.checkedClasses = {}
      })
    },
    
    // 切换课表日期
    changeScheduleDate(offset) {
      const d = new Date(this.selectedDate)
      d.setDate(d.getDate() + offset)
      this.selectedDate = d
      this.loadTodaySchedules()
    },
    
    // 切换课表节次
    changeScheduleSection(offset) {
      let section = this.selectedSection + offset
      if (section < 1) section = 1
      if (section > 10) section = 10
      this.selectedSection = section
      this.loadTodaySchedules()
    },
    
    // 加载查课记录，标记已查课班级
    loadCheckedStatus() {
      const y = this.selectedDate.getFullYear()
      const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0')
      const d = String(this.selectedDate.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      
      listClassCheck({ 
        checkDate: dateStr, 
        pageNum: 1, 
        pageSize: 999 
      }).then(res => {
        const rows = res.rows || []
        const checked = {}
        rows.forEach(item => {
          if (item.bjdm && item.lessonNo == this.selectedSection) {
            checked[item.bjdm] = true
          }
        })
        this.checkedClasses = checked
      }).catch(() => {
        this.checkedClasses = {}
      })
    },
    
    // 判断是否已查课
    isClassChecked(bjdm) {
      return !!this.checkedClasses[bjdm]
    },
    
    loadClasses() {
      // 书记角色：获取学院所有班级
      if (this.isSecretaryRole) {
        this.loadClassesForSecretary()
        return
      }
      
      // 辅导员角色：获取自己管理的班级
      getMyClasses().then(res => {
        this.classList = (res.data || []).map(cls => {
          cls._courseName = ''    // 预留：课程名称（来自课表接口）
          cls._classRoom = ''     // 预留：上课教室
          cls._classTeacher = ''  // 预留：任课教师
          return cls
        })
        this.loadTodaySchedules()
      }).catch(() => {})
    },
    
    // 书记角色：加载学院所有班级（按专业分组）
    async loadClassesForSecretary() {
      try {
        // 先获取教师信息得到学院代码
        const { getTeacherinfoByUserId } = await import('@/api/stumanage/teacherinfo')
        const teacherRes = await getTeacherinfoByUserId()
        
        
        if (!teacherRes.data || !teacherRes.data.xydm) {
          this.classList = []
          this.majorStats = []
          return
        }
        
        const xydm = teacherRes.data.xydm
        this.secretaryCollege = xydm
        
        // 并行加载：招生计划专业列表（名称准确）+ 专业统计（数量数据）+ 班级列表
        const { getMajorList, getStatsByMajor } = await import('@/api/stumanage/stats')
        const { listClassinfo } = await import('@/api/stumanage/classinfo')
        const [majorListRes, statsRes, classRes] = await Promise.all([
          getMajorList(xydm),
          getStatsByMajor(xydm),
          listClassinfo({ xydm, pageNum: 1, pageSize: 999 })
        ])
                
        const colors = ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800']
                
        // 用统计数据建立 zydm -> 统计 的索引（兼容 majorCode/zydm 两种字段名）
        const statsMap = {}
        if (statsRes.code === 200 && statsRes.data) {
          statsRes.data.forEach(m => {
            const key = m.zydm || m.majorCode || ''
            if (key) statsMap[key] = m
          })
        }
                
        // 以招生计划专业列表为权威，合并统计数据
        if (majorListRes.code === 200 && majorListRes.data) {
          // 前端去重：按 zydm 合并同名专业（不同培养层次）
          const seenZydm = {}
          const dedupedList = []
          majorListRes.data.forEach(m => {
            const key = m.zydm || ''
            if (!key) return
            if (!seenZydm[key]) {
              seenZydm[key] = true
              dedupedList.push(m)
            }
          })
          
          this.majorStats = dedupedList.map((m, i) => {
            const stat = statsMap[m.zydm] || {}
            const studentCount = stat.studentCount || 0
            const maleCount = stat.maleCount || 0
            const femaleCount = stat.femaleCount || 0
            const classCount = stat.classCount || 0
            return {
              zydm: m.zydm,
              majorName: m.majorName || m.zyname || m.zymc || m.zydm,
              studentCount,
              maleCount,
              femaleCount,
              classCount,
              color: colors[i % colors.length],
              malePercent: studentCount > 0 ? Math.round((maleCount / studentCount) * 100) : 0,
              femalePercent: studentCount > 0 ? Math.round((femaleCount / studentCount) * 100) : 0,
              avgClassSize: classCount > 0 ? Math.round(studentCount / classCount) : 0,
              classes: []
            }
          })
        }
                
        // 加载班级数据
        this.classList = (classRes.rows || []).map(cls => {
          cls._courseName = ''
          cls._classRoom = ''
          cls._classTeacher = ''
          return cls
        })
        this.loadTodaySchedules()
      } catch (err) {
        this.classList = []
        this.majorStats = []
      }
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
      getClassCheckStats({ endDate: y + '-' + m + '-' + d }).then(res => {
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
    goSign() {
      uni.navigateTo({ url: '/pages/sub-work/sign/index' })
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/sub-work/classcheck/add' })
    },
    goAddCheck(cls) {
      if (!cls || !cls.bjdm) return
      const y = this.selectedDate.getFullYear()
      const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0')
      const d = String(this.selectedDate.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      const params = [
        'bjdm=' + cls.bjdm,
        'bjmc=' + encodeURIComponent(cls.bjname || ''),
        'checkDate=' + dateStr,
        'lessonNo=' + this.selectedSection,
        'courseName=' + encodeURIComponent(cls.courseName || ''),
        'classRoom=' + encodeURIComponent(cls.classroom || ''),
        'classTeacher=' + encodeURIComponent(cls.teacherName || '')
      ]
      uni.navigateTo({ url: '/pages/sub-work/classcheck/add?' + params.join('&') })
    },
    goDetail(item) {
      uni.navigateTo({ url: '/pages/sub-work/classcheck/add?id=' + item.id })
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
      
      // 角色判断完成后，加载班级列表
      this.loadClasses()
      
      // 如果是书记角色，加载辅导员统计
      if (this.isSecretaryRole) {
        this.loadCounselorStats()
      } else {
        // 辅导员角色，加载个人统计
        getModuleOverview().then(res => {
          if (res.data && res.data.classCheck) {
            this.personalStats = res.data.classCheck
          }
        }).catch(() => {})
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
            fdyName: item.counselorName || item.fdyName || item.fdyname || '未知辅导员',
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

.top-btn-group {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 120rpx;
}

.sign-btn {
  background: linear-gradient(135deg, #4facfe, #2b85e4);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 12rpx 0;
}

.sign-btn-label {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

.add-check-btn {
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

/* 周次信息标签 */
.week-info-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.week-tag {
  font-size: 22rpx;
  color: #2979ff;
  background: #e8f0fe;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.holiday-tag {
  font-size: 20rpx;
  color: #e43d33;
  background: #fde8e8;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.weekend-tag {
  font-size: 20rpx;
  color: #f3a044;
  background: #fef3e2;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
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
.schedule-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 16rpx 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.selector-group {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.selector-text {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  min-width: 120rpx;
  text-align: center;
}

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
  transition: background 0.2s;
}

.schedule-row.checked {
  background: #f0f9ff;
  border-radius: 8rpx;
  padding: 16rpx 12rpx;
}

.schedule-row:last-child {
  border-bottom: none;
}

.sr-check-tag {
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #18bc37;
  color: #fff;
  margin-left: 8rpx;
}

.sr-check-tag.pending {
  background: #f3a044;
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

/* ===== 书记角色：专业分组样式 ===== */
.major-scroll-view {
  max-height: 800rpx;
}

.major-group {
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
}

.major-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
}

.major-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.major-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.major-count {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.2);
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.major-total {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}

.class-list {
  padding: 0;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* ===== 统计概览 ===== */
.stats-overview {
  margin: 16rpx 20rpx 0;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.overview-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.overview-toggle {
  font-size: 24rpx;
  color: #999;
}

.stats-overview-mini {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16rpx 20rpx 0;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.mini-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.mini-toggle {
  font-size: 24rpx;
  color: #2979ff;
}

.personal-stats {
  padding: 8rpx 0;
}

.personal-stats-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16rpx;
}

.personal-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ps-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  &.blue { color: #2979ff; }
  &.orange { color: #f3a044; }
  &.green { color: #18bc37; }
}

.ps-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.completion-bar {
  position: relative;
  height: 32rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  overflow: hidden;
}

.completion-fill {
  height: 100%;
  background: linear-gradient(90deg, #2979ff, #18bc37);
  border-radius: 16rpx;
  transition: width 0.3s;
}

.completion-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  font-size: 20rpx;
  color: #fff;
}
</style>
