<template>
  <view class="work-container">
    <!-- 顶部学工金句 -->
    <view class="greeting-section" @click="refreshQuote">
      <view class="quote-content" :style="quoteLayoutStyle">
        <view class="quote-main">
          <view class="quote-first-line-float"></view>
          <text class="quote-text">{{ workQuote.text || '用心做教育,用爱育未来' }}</text>
        </view>
        <text class="quote-author">—— {{ workQuote.author || '学工团队' }}</text>
      </view>
    </view>

    <view class="offline-banner" v-if="offlineSummary.total > 0" @click="syncOfflineQueue">
      <view class="offline-copy">
        <text class="offline-title">{{ offlineSummary.failed ? '有事项同步失败' : '有事项等待同步' }}</text>
        <text class="offline-sub">待同步 {{ offlineSummary.pending }} 条 · 失败 {{ offlineSummary.failed }} 条</text>
      </view>
      <text class="offline-action">{{ syncOfflineLoading ? '同步中...' : '立即同步' }}</text>
    </view>

    <!-- 书记查看学院辅导员进展，辅导员查看本人本周工作 -->
    <view
      class="counselor-progress-section"
      v-if="showCounselorProgress"
    >
      <view class="progress-head" @click="goCounselorProgress('all')">
        <view class="progress-head-copy">
          <text class="progress-title">{{ progressTitle }}</text>
          <text class="progress-meta">{{ progressMeta }}</text>
        </view>
        <view class="progress-head-action">
          <text v-if="progressBoard" class="progress-week">第{{ displayCount(progressBoard.weekNo) }}周</text>
          <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
        </view>
      </view>

      <view v-if="counselorProgressLoading" class="progress-state">
        <text>数据加载中...</text>
      </view>
      <view v-else-if="counselorProgressError" class="progress-state" @click.stop="loadCounselorProgress">
        <text>{{ counselorProgressError }}</text>
        <text class="progress-retry">点击重试</text>
      </view>
      <template v-else-if="progressBoard">
        <view class="progress-overview" v-if="progressViewMode === 'college'">
          <view class="progress-overview-item" hover-class="progress-overview-item--pressed" @click.stop="goCounselorProgress('all')">
            <text class="progress-overview-num">{{ displayCount(progressBoard.counselorCount) }}</text>
            <text class="progress-overview-label">辅导员</text>
          </view>
          <view class="progress-overview-item is-warning" hover-class="progress-overview-item--pressed" @click.stop="goCounselorProgress('backlog')">
            <text class="progress-overview-num">{{ displayCount(progressBoard.backlogCount) }}</text>
            <text class="progress-overview-label">有积压</text>
          </view>
          <view class="progress-overview-item is-muted" hover-class="progress-overview-item--pressed" @click.stop="goCounselorProgress('lagging')">
            <text class="progress-overview-num">{{ displayCount(progressBoard.laggingCount) }}</text>
            <text class="progress-overview-label">无产出</text>
          </view>
          <view class="progress-overview-item is-danger" hover-class="progress-overview-item--pressed" @click.stop="goCounselorProgress('pending')">
            <text class="progress-overview-num">{{ displayCount(progressBoard.pendingTotal) }}</text>
            <text class="progress-overview-label">待处理</text>
          </view>
        </view>
        <view class="progress-overview" v-else-if="progressViewMode === 'mine' && progressMinePerson">
          <view class="progress-overview-item" hover-class="progress-overview-item--pressed" @click.stop="goCounselorRecords('weekOutput', '本周产出')">
            <text class="progress-overview-num">{{ displayCount(progressMinePerson.weekOutput) }}</text>
            <text class="progress-overview-label">本周产出</text>
          </view>
          <view class="progress-overview-item is-warning" hover-class="progress-overview-item--pressed" @click.stop="goCounselorProgress('pending')">
            <text class="progress-overview-num">{{ displayCount(progressMinePerson.pendingTotal) }}</text>
            <text class="progress-overview-label">待处理</text>
          </view>
          <view class="progress-overview-item is-danger" hover-class="progress-overview-item--pressed" @click.stop="goCounselorProgress('overdue')">
            <text class="progress-overview-num">{{ displayCount(progressMinePerson.overdueTotal) }}</text>
            <text class="progress-overview-label">逾期/积压</text>
          </view>
          <view class="progress-overview-item is-muted" hover-class="progress-overview-item--pressed" @click.stop="goCounselorRecords('students', '带班学生')">
            <text class="progress-overview-num">{{ displayCount(progressMinePerson.studentCount) }}</text>
            <text class="progress-overview-label">带班学生</text>
          </view>
        </view>
        <view v-if="progressHasData" class="progress-entry" @click.stop="goCounselorProgress('all')">
          <text>查看人员工作明细</text>
          <uni-icons type="arrowright" size="15" color="#2563eb"></uni-icons>
        </view>
        <view v-else class="progress-state">
          <text>{{ progressViewMode === 'mine' ? '当前账号未绑定辅导员带班信息' : '本学院暂无辅导员带班数据' }}</text>
        </view>
      </template>
    </view>

    <!-- 辅导员训练平台：书记查看学院成绩，辅导员训练与参赛 -->
    <view
      class="training-platform-section"
      v-if="showCounselorTraining"
      @click="goCounselorTraining"
    >
      <view class="training-platform-mark">
        <uni-icons type="star-filled" size="24" color="#ffffff"></uni-icons>
      </view>
      <view class="training-platform-copy">
        <view class="training-platform-title-row">
          <text class="training-platform-title">辅导员训练平台</text>
          <text class="training-platform-tag">{{ isTopSecretaryRole ? '学院成绩' : '训练与比赛' }}</text>
        </view>
        <text class="training-platform-sub">
          {{ isTopSecretaryRole ? '查看本学院辅导员的训练及比赛用时与成绩' : '班情熟知、案例研讨、谈心谈话和比赛' }}
        </text>
      </view>
      <uni-icons type="right" size="18" color="#0f766e"></uni-icons>
    </view>

    <!-- 辅导员毕业班级管理 -->
    <view class="graduation-module" v-if="showGraduationManagement" @click="goGraduationManagement">
      <view class="graduation-module-main">
        <view class="graduation-module-icon">
          <uni-icons type="staff-filled" size="25" color="#ffffff"></uni-icons>
        </view>
        <view class="graduation-module-copy">
          <view class="graduation-module-title-row">
            <text class="graduation-module-title">毕业班级管理</text>
            <text class="graduation-module-tag">毕业生</text>
          </view>
          <text class="graduation-module-sub">毕业生台账 · 论文进度 · 去向登记</text>
        </view>
        <uni-icons type="right" size="18" color="#64748b"></uni-icons>
      </view>
      <view class="graduation-module-meta">
        <text>仅展示本人带班学生</text>
        <text>默认 {{ defaultGraduateYear }} 届</text>
      </view>
    </view>

    <!-- 教学管理（菜单驱动：mini:teaching） -->
    <view class="func-section" v-if="showTeaching">
      <view class="section-header" @click="toggleTeachingSection">
        <text class="section-title">教学管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="teachingCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view class="func-grid" v-if="!teachingCollapsed">
        <view class="func-item" v-for="item in teachingFuncs" :key="item.key" @click="onFuncClick(item)">
          <view :class="['func-icon', 'icon-' + item.color]">
            <uni-icons :type="item.icon" size="26" color="#fff"></uni-icons>
          </view>
          <text class="func-name">{{ item.name }}</text>
        </view>
      </view>
      <view class="teaching-footnote" v-if="!teachingCollapsed">
        <uni-icons type="info" size="14" color="#94a3b8"></uni-icons>
        <text>本周考勤统计任课教师课堂点名，不含辅导员查课</text>
      </view>
    </view>

    <!-- 学生管理（菜单驱动：mini:student） -->
    <view class="func-section" v-if="showStudent">
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

    <!-- 班主任管理（菜单驱动：mini:headteacher） -->
    <view class="func-section ht-section" v-if="showHeadteacher">
      <view class="section-header" @click="toggleHtSection">
        <text class="section-title">班主任管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="htCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view v-if="!htCollapsed">
        <!-- 未分配班级提示 -->
        <view class="ht-no-class" v-if="htClassList.length === 0">
          <uni-icons type="info" size="20" color="#f3a044"></uni-icons>
          <text class="ht-no-class-text">暂未分配班级，快捷操作不可用</text>
        </view>
        <view class="func-grid">
          <view :class="getHtItemClass('myClass')" @click="onHtFuncClick('myClass')">
            <view class="func-icon icon-green">
              <uni-icons type="staff-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">我的班级</text>
            <text class="func-name ht-count" v-if="htClassList.length > 0">({{ htClassList.length }})</text>
          </view>
          <view :class="getHtItemClass('talk')" @click="onHtFuncClick('talk')">
            <view class="func-icon icon-orange">
              <uni-icons type="chat-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">谈心谈话</text>
          </view>
          <view :class="getHtItemClass('worklog')" @click="onHtFuncClick('worklog')">
            <view class="func-icon icon-blue">
              <uni-icons type="list" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">工作记录</text>
          </view>
          <view :class="getHtItemClass('addWorklog')" @click="onHtFuncClick('addWorklog')">
            <view class="func-icon icon-orange">
              <uni-icons type="plusempty" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">新增记录</text>
          </view>
          <view :class="getHtItemClass('certificate')" @click="onHtFuncClick('certificate')">
            <view class="func-icon icon-purple">
              <uni-icons type="paperplane" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">工作证明</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 党务管理（菜单驱动：mini:party） -->
    <view class="func-section party-section" v-if="showParty">
      <view class="section-header" @click="togglePartySection">
        <text class="section-title">党务管理</text>
        <view class="collapse-arrow">
          <uni-icons :type="partyCollapsed ? 'down' : 'up'" size="18" color="#999"></uni-icons>
        </view>
      </view>
      <view v-if="!partyCollapsed">
        <view class="func-grid">
          <view class="func-item" @click="onPartyFuncClick('members')" v-if="isPartyFuncEnabled('member')">
            <view class="func-icon icon-red">
              <uni-icons type="staff-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">党员管理</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('committee')">
            <view class="func-icon icon-blue">
              <uni-icons type="auth-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">委员设置</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('thoughtReport')" v-if="isPartyFuncEnabled('thoughtReport')">
            <view class="func-icon icon-green">
              <uni-icons type="chat-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">思想汇报</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('fee')" v-if="isPartyFuncEnabled('fee')">
            <view class="func-icon icon-orange">
              <uni-icons type="wallet" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">党费管理</text>
          </view>
          <view class="func-item" @click="onPartyFuncClick('training')" v-if="isPartyFuncEnabled('training')">
            <view class="func-icon icon-purple">
              <uni-icons type="calendar-filled" size="26" color="#fff"></uni-icons>
            </view>
            <text class="func-name">培训管理</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getRoleViewConfig } from '@/utils/roleViewConfig'
import { getWorkDashboard } from '@/api/work/dashboard'
import { getCounselorWorkProgress } from '@/api/work/counselorProgress'
import { getRandomQuote } from '@/api/work/workquote'
import { roleMixin } from '@/utils/roleSystem'
import { getMyMiniConfig } from '@/api/system/miniConfig'
import { getMyClasses } from '@/api/affair/headteacher'
import { getGraduationSummary } from '@/api/graduation'
import { getDefaultGraduationYear } from '@/utils/graduation'
import { flushOfflineQueue, getOfflineSummary } from '@/utils/offlineQueue'

// 全量功能定义
const ALL_FUNCS = [
  { key: 'stuinfo', name: '我的学生', icon: 'person-filled', color: 'blue', url: '/pages/sub-work/stuinfo/index' },
  { key: 'classcheck', name: '查课管理', icon: 'checkbox-filled', color: 'green', url: '/pages/sub-work/classcheck/index' },
  { key: 'inspection', name: '学风检查', icon: 'compose', color: 'cyan', url: '/pages/sub-work/inspection/index' },
  { key: 'talk', name: '谈心谈话', icon: 'chat-filled', color: 'orange', url: '/pages/sub-work/talk/index' },
  { key: 'leave', name: '请假管理', icon: 'paperplane-filled', color: 'red', url: '/pages/sub-work/leave/index' },
  { key: 'todo', name: '待办事项', icon: 'flag-filled', color: 'purple', url: '/pages/sub-work/todo/index' },
  { key: 'party', name: '党务管理', icon: 'star-filled', color: 'red', url: '/pages/sub-work/party/index' },
  { key: 'vehicle', name: '车辆登记', icon: 'car', color: 'cyan', url: '/pages/sub-work/vehicle/index' },
  { key: 'offcampus', name: '外宿管理', icon: 'home', color: 'purple', url: '/pages/sub-work/offcampus/index' },
  { key: 'dormcheck', name: '宿舍管理', icon: 'home', color: 'cyan', url: '/pages/sub-work/dormcheck/index' }
]

// 默认常用功能 key
const DEFAULT_COMMON = ['stuinfo', 'classcheck', 'talk', 'leave', 'todo']

const STORAGE_KEY = 'work_common_funcs'
// 金句内容延伸至顶部背景区底部。
const HEADER_CONTENT_BOTTOM_RPX = 280

export default {
  mixins: [roleMixin],
  data() {
    return {
      // 视图配置（从数据库加载）
      viewConfig: null,
      teacherName: '',
      editingCommon: false,
      studentCollapsed: false,
      teachingCollapsed: false,
      htCollapsed: false,
      partyCollapsed: false,
      commonKeys: [],
      // 小程序配置（从后端 API 加载）
      miniConfig: {},
      // 班主任班级列表
      htClassList: [],
      // 书记角色相关
      isSecretaryRole: false,
      counselorProgress: null,
      counselorProgressLoading: false,
      counselorProgressError: '',
      pendingList: [],
      // 学工金句
      workQuote: {
        text: '',
        author: ''
      },
      graduationAvailable: false,
      graduationCheckLoading: false,
      defaultGraduateYear: getDefaultGraduationYear(),
      quoteLayoutStyle: 'top: 47px; left: 26px; width: 264px; height: 98px;',
      offlineSummary: { total: 0, pending: 0, failed: 0, items: [] },
      syncOfflineLoading: false
    }
  },
  computed: {
    // ===== 配置驱动的模块可见性（通过 PC 后台"小程序配置"页面控制） =====
    showGraduationManagement() { return this.isCounselorRole && this.graduationAvailable },
    showTeaching() { return !!(this.miniConfig.teaching && this.miniConfig.teaching.enabled) },
    showCounselorProgress() { return this.isSecretaryRole || this.isCounselorRole },
    showCounselorTraining() { return this.isSecretaryRole || this.isCounselorRole },
    progressBoard() { return this.counselorProgress && this.counselorProgress.board },
    progressViewMode() { return (this.counselorProgress && this.counselorProgress.viewMode) || 'none' },
    progressMinePerson() {
      const counselors = this.progressBoard && this.progressBoard.counselors
      return counselors && counselors.length ? counselors[0] : null
    },
    progressHasData() {
      return !!(this.progressBoard && this.progressBoard.counselors && this.progressBoard.counselors.length)
    },
    progressTitle() { return this.progressViewMode === 'mine' ? '我的本周工作' : '辅导员工作进展' },
    progressMeta() {
      if (!this.progressBoard) return ''
      if (this.progressViewMode === 'mine') {
        const person = this.progressBoard.counselors && this.progressBoard.counselors[0]
        return person ? `${person.counselorName || '本人'} · 本周第${this.progressBoard.weekNo || '--'}周` : '本周工作'
      }
      return `${this.progressBoard.collegeName || '本学院'} · 本周第${this.progressBoard.weekNo || '--'}周`
    },
    showStudent() { return this.miniConfig.student && this.miniConfig.student.enabled },
    showParty() { return !!(this.miniConfig.party && this.miniConfig.party.enabled) },
    showHeadteacher() { return !!(this.miniConfig.headteacher && this.miniConfig.headteacher.enabled) },
    // 教学管理功能列表
    teachingFuncs() {
      const all = [
        { key: 'schedule', name: '我的课表', icon: 'calendar', color: 'blue', url: '/pages/sub-work/schedule/index' },
        { key: 'rollcall', name: '上课点名', icon: 'checkbox-filled', color: 'green', url: '/pages/sub-work/rollcall/course-select' },
        { key: 'attendance_summary', name: '考勤汇总', icon: 'bars', color: 'orange', url: '/pages/sub-work/attendance-summary/index' }
      ]
      const funcs = (this.miniConfig.teaching && this.miniConfig.teaching.funcs) || {}
      return all.filter(f => f.key === 'rollcall' || funcs[f.key])
    },
    allStudentFuncs() {
      const funcs = (this.miniConfig.student && this.miniConfig.student.funcs) || {}
      const funcKeyMap = { stuinfo: 'stuinfo', classcheck: 'classcheck', inspection: 'inspection', talk: 'talk', leave: 'leave', offcampus: 'offcampus', dormcheck: 'dormcheck' }
      return ALL_FUNCS.filter(f => funcKeyMap[f.key] && funcs[funcKeyMap[f.key]])
    },
    commonList() {
      const studentFuncs = (this.miniConfig.student && this.miniConfig.student.funcs) || {}
      const funcKeyMap = { stuinfo: 'stuinfo', classcheck: 'classcheck', inspection: 'inspection', talk: 'talk', leave: 'leave', offcampus: 'offcampus', dormcheck: 'dormcheck' }
      return this.commonKeys
        .map(k => ALL_FUNCS.find(f => f.key === k))
        .filter(f => this.isCommonFuncAllowed(f, studentFuncs, funcKeyMap))
    },
    availableToAdd() {
      const studentFuncs = (this.miniConfig.student && this.miniConfig.student.funcs) || {}
      const funcKeyMap = { stuinfo: 'stuinfo', classcheck: 'classcheck', inspection: 'inspection', talk: 'talk', leave: 'leave', offcampus: 'offcampus', dormcheck: 'dormcheck' }
      return ALL_FUNCS.filter(f =>
        !this.commonKeys.includes(f.key) &&
        this.isCommonFuncAllowed(f, studentFuncs, funcKeyMap)
      )
    }
  },
  async created() {
    // 加载小程序工作台配置
    this.loadMiniConfig()

    // 加载教师姓名
    this.loadTeacherName()

    // 从数据库加载角色视图配置
    this.viewConfig = await getRoleViewConfig('work_index')

    this.loadCommonKeys()

    // 检查角色并加载班主任数据
    await this.checkRole()
    if (this.isCounselorRole) {
      await this.loadGraduationAvailability()
    }
    if (this.isHeadteacherRole) {
      this.loadHtClasses()
    }
    if (this.showCounselorProgress) {
      this.loadCounselorProgress()
    }

    this.refreshOfflineSummary()
    uni.$on('offlineQueueChanged', this.refreshOfflineSummary)
  },
  onShow() {
    this.loadMiniConfig()
    this.syncQuoteLayout()
    this.$nextTick(() => this.syncQuoteLayout())
    this.refreshOfflineSummary()
    flushOfflineQueue()
    // 首页已经展示学院统计，工作台只刷新金句等轻量信息。
    this.loadWorkQuote()
    if (this.showCounselorProgress) {
      this.loadCounselorProgress()
    }
  },
  beforeDestroy() {
    uni.$off('offlineQueueChanged', this.refreshOfflineSummary)
  },
  methods: {
    syncQuoteLayout() {
      const system = uni.getSystemInfoSync()
      const windowWidth = Number(system.windowWidth || 375)
      const statusBarHeight = Number(system.statusBarHeight || (system.safeArea && system.safeArea.top) || 20)
      const contentBottom = uni.upx2px(HEADER_CONTENT_BOTTOM_RPX)
      const left = uni.upx2px(52)
      const capsuleGap = uni.upx2px(16)
      let capsuleLeft = windowWidth

      try {
        const capsule = typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function'
          ? wx.getMenuButtonBoundingClientRect()
          : uni.getMenuButtonBoundingClientRect()
        if (capsule && capsule.left) {
          capsuleLeft = Number(capsule.left)
        }
      } catch (e) {
        // 非微信端没有胶囊时，金句使用整个内容区宽度。
      }

      this.quoteLayoutStyle = [
        `top: ${statusBarHeight}px`,
        `left: ${left}px`,
        `width: ${Math.max(0, capsuleLeft - capsuleGap - left)}px`,
        `height: ${Math.max(1, contentBottom - statusBarHeight)}px`
      ].join('; ') + ';'
    },
    refreshOfflineSummary() {
      this.offlineSummary = getOfflineSummary()
    },
    syncOfflineQueue() {
      if (this.syncOfflineLoading) return
      this.syncOfflineLoading = true
      flushOfflineQueue({ manual: true }).then(result => {
        this.refreshOfflineSummary()
        if (result.needLogin) {
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          return
        }
        if (result.lastError && (result.failed > 0 || result.pending > 0)) {
          const remaining = []
          if (result.pending > 0) remaining.push('仍有 ' + result.pending + ' 条待同步')
          if (result.failed > 0) remaining.push(result.failed + ' 条同步失败')
          uni.showModal({
            title: '同步未完成',
            content: result.lastError + (remaining.length ? '\n\n' + remaining.join('，') : ''),
            showCancel: false
          })
          return
        }
        const parts = []
        if (result.synced > 0) parts.push('已同步 ' + result.synced + ' 条')
        if (result.failed > 0) parts.push(result.failed + ' 条失败')
        if (result.pending > 0) parts.push(result.pending + ' 条仍待同步')
        if (!parts.length) parts.push('没有待同步事项')
        const allDone = result.synced > 0 && result.pending === 0 && result.failed === 0
        uni.showToast({
          title: allDone ? parts[0] : parts.join('，'),
          icon: allDone ? 'success' : 'none'
        })
      }).catch(() => {
        this.refreshOfflineSummary()
        uni.showToast({ title: '同步失败，请稍后重试', icon: 'none' })
      }).finally(() => {
        this.syncOfflineLoading = false
      })
    },
    // 检查党务子功能是否启用
    isPartyFuncEnabled(funcKey) {
      const funcs = (this.miniConfig.party && this.miniConfig.party.funcs) || {}
      return this.showParty && !!funcs[funcKey]
    },
    isCommonFuncAllowed(func, studentFuncs, funcKeyMap) {
      if (!func) return false
      if (func.key === 'party') return this.showParty
      if (func.key === 'vehicle') return this.showStudent
      if (funcKeyMap[func.key]) {
        return this.showStudent && !!studentFuncs[funcKeyMap[func.key]]
      }
      return false
    },
    // 加载小程序工作台配置
    loadMiniConfig() {
      getMyMiniConfig().then(res => {
        this.miniConfig = res.data || {}
      }).catch(() => {
        this.miniConfig = {}
      })
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
    // 工作台不再重复展示首页统计，仅保留接口中的金句。
    loadWorkQuote() {
      return getWorkDashboard().then(res => {
        const data = (res && res.data) || {}
        if (data.workQuote) {
          this.workQuote = {
            text: data.workQuote.text || '用心做教育,用爱育未来',
            author: data.workQuote.author || '学工团队'
          }
        }
      })
    },
    loadCounselorProgress() {
      if (this.counselorProgressLoading) return
      this.counselorProgressLoading = true
      this.counselorProgressError = ''
      getCounselorWorkProgress().then(res => {
        this.counselorProgress = (res && res.data) || null
      }).catch(() => {
        this.counselorProgressError = '辅导员工作进展加载失败'
      }).finally(() => {
        this.counselorProgressLoading = false
      })
    },
    goCounselorProgress(filter) {
      if (!this.progressHasData || this.counselorProgressLoading || this.counselorProgressError) return
      const value = filter && filter !== 'all' ? '?filter=' + filter : ''
      uni.navigateTo({ url: '/pages/sub-work/counselor-progress/index' + value })
    },
    goCounselorRecords(metric, title) {
      const person = this.progressMinePerson
      if (!person || !person.teacherId) return
      uni.navigateTo({
        url: '/pages/sub-work/counselor-progress/records?teacherId=' + person.teacherId
          + '&metric=' + metric + '&title=' + encodeURIComponent(title || '')
      })
    },
    goCounselorTraining() {
      uni.navigateTo({ url: '/pages/sub-work/counselor-training/index' })
    },
    goGraduationManagement() {
      if (!this.showGraduationManagement || !this.defaultGraduateYear) return
      uni.navigateTo({
        url: '/pages/sub-work/graduation/index?graduateYear=' + this.defaultGraduateYear
      })
    },
    async loadGraduationAvailability() {
      if (this.graduationCheckLoading) return
      this.graduationCheckLoading = true
      this.graduationAvailable = false
      this.defaultGraduateYear = getDefaultGraduationYear()
      try {
        const summaryRes = await getGraduationSummary(this.defaultGraduateYear)
        const total = Number((summaryRes.data && summaryRes.data.totalStudents) || 0)
        this.graduationAvailable = total > 0
      } catch (e) {
        this.graduationAvailable = false
      } finally {
        this.graduationCheckLoading = false
      }
    },
    displayCount(value) {
      return value === null || value === undefined || value === '' ? '--' : value
    },
    // 随机选择一条金句（从后端获取）
    refreshQuote() {
      getRandomQuote().then(res => {
        if (res.data) {
          this.workQuote = {
            text: res.data.text || '用心做教育,用爱育未来',
            author: res.data.author || '学工团队'
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
    // 跳转到请假详情
    goLeaveDetail(item) {
      uni.navigateTo({ url: `/pages/sub-work/leave/detail?id=${item.id}` })
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
    toggleEditCommon() {
      this.editingCommon = !this.editingCommon
    },
    toggleStudentSection() {
      this.studentCollapsed = !this.studentCollapsed
    },
    toggleTeachingSection() {
      this.teachingCollapsed = !this.teachingCollapsed
    },
    toggleHtSection() {
      this.htCollapsed = !this.htCollapsed
    },
    togglePartySection() {
      this.partyCollapsed = !this.partyCollapsed
    },
    // 党务管理功能点击
    onPartyFuncClick(key) {
      const routes = {
        members: '/pages/sub-work/party/index',
        committee: '/pages/sub-work/party/index',
        thoughtReport: '/pages/sub-work/party/index',
        fee: '/pages/sub-work/party/index',
        training: '/pages/sub-work/party/index'
      }
      const url = routes[key]
      if (url) {
        uni.navigateTo({ url })
      }
    },
    // 加载班主任班级列表
    loadHtClasses() {
      getMyClasses().then(res => {
        this.htClassList = res.data || []
      }).catch(() => {
        this.htClassList = []
      })
    },
    // 获取班主任功能项样式类
    getHtItemClass(key) {
      const hasClass = this.htClassList.length > 0
      // 我的班级和我的申请始终可用
      if (key === 'myClass') return 'func-item'
      // 谈话记录要看已共享给自己的记录，不要求带班
      if (key === 'talk') return 'func-item'
      // 其他功能需要有班级才可用
      return hasClass ? 'func-item' : 'func-item func-item-disabled'
    },
    // 班主任功能区点击
    onHtFuncClick(key) {
      const hasClass = this.htClassList.length > 0
      if (key === 'myClass') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/index' })
      } else if (key === 'talk') {
        uni.navigateTo({ url: '/pages/sub-work/talk/index?viewScope=headteacher' })
      } else if (!hasClass) {
        uni.showToast({ title: '暂未分配班级，操作不可用', icon: 'none' })
      } else if (key === 'worklog') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/worklog-list' })
      } else if (key === 'addWorklog') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/worklog-add' })
      } else if (key === 'certificate') {
        uni.navigateTo({ url: '/pages/sub-work/headteacher/certificate' })
      }
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
.offline-banner {
  margin: 16rpx 24rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background: #fff7e6;
  border: 1rpx solid #ffd591;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.offline-copy {
  display: flex;
  flex-direction: column;
}
.offline-title {
  font-size: 26rpx;
  color: #ad6800;
  font-weight: 600;
}
.offline-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #ad6800;
}
.offline-action {
  font-size: 24rpx;
  color: #ffffff;
  background: #d46b08;
  padding: 10rpx 20rpx;
  border-radius: 8rpx;
}

.greeting-section {
  height: 280rpx;
  box-sizing: border-box;
  background: #155e75;
  padding: 88rpx 32rpx 40rpx;
  position: relative;
  overflow: hidden;
}

.quote-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16rpx;
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
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
  font-size: 32rpx;
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
  -webkit-line-clamp: 2;
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

.counselor-progress-section {
  margin: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 1rpx solid #e7edf2;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.training-platform-section {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin: 24rpx;
  padding: 24rpx;
  border: 1rpx solid #cfe3dc;
  border-radius: 16rpx;
  background: #f7fcfa;
  box-shadow: 0 6rpx 18rpx rgba(15, 118, 110, 0.06);
}

.training-platform-section:active {
  background: #edf8f4;
}

.training-platform-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  background: #0f766e;
}

.training-platform-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.training-platform-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.training-platform-title {
  color: #123b35;
  font-size: 30rpx;
  font-weight: 700;
}

.training-platform-tag {
  flex-shrink: 0;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  background: #dff3ec;
  color: #0f766e;
  font-size: 19rpx;
}

.training-platform-sub {
  margin-top: 8rpx;
  overflow: hidden;
  color: #56736d;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.graduation-module {
  margin: 24rpx;
  overflow: hidden;
  border: 1rpx solid #dbe4ea;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.graduation-module-main {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx;
}

.graduation-module-icon {
  flex: 0 0 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 18rpx;
  background: #0f766e;
}

.graduation-module-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.graduation-module-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.graduation-module-title {
  color: #172033;
  font-size: 30rpx;
  font-weight: 700;
}

.graduation-module-tag {
  flex-shrink: 0;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  background: #ecfdf5;
  color: #047857;
  font-size: 19rpx;
}

.graduation-module-sub {
  margin-top: 8rpx;
  overflow: hidden;
  color: #64748b;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.graduation-module-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 14rpx 24rpx;
  border-top: 1rpx solid #edf2f7;
  background: #f8fafc;
  color: #7c8799;
  font-size: 20rpx;
}

.progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #edf2f7;
}

.progress-head-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.progress-head-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.progress-title {
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
}

.progress-meta {
  margin-top: 6rpx;
  color: #64748b;
  font-size: 22rpx;
}

.progress-week {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 8rpx;
  background: #ecfdf5;
  color: #047857;
  font-size: 21rpx;
  font-weight: 600;
}

.progress-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 40rpx 24rpx;
  color: #94a3b8;
  font-size: 23rpx;
  text-align: center;
}

.progress-retry {
  color: #2563eb;
}

.progress-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  padding: 18rpx 20rpx;
  background: #f8fafc;
  border-bottom: 1rpx solid #edf2f7;
}

.progress-overview-item {
  min-width: 0;
  padding: 12rpx 8rpx;
  border-radius: 10rpx;
  background: #fff;
  text-align: center;
}

.progress-overview-item--pressed {
  background: #eef6ff;
}

.progress-overview-num {
  display: block;
  color: #0f172a;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.2;
}

.progress-overview-label {
  display: block;
  margin-top: 4rpx;
  color: #64748b;
  font-size: 19rpx;
  white-space: nowrap;
}

.progress-overview-item.is-warning .progress-overview-num {
  color: #d97706;
}

.progress-overview-item.is-muted .progress-overview-num {
  color: #64748b;
}

.progress-overview-item.is-danger .progress-overview-num {
  color: #dc2626;
}

.progress-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 20rpx 24rpx 22rpx;
  color: #2563eb;
  font-size: 22rpx;
  font-weight: 600;
}

.teaching-footnote {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 4rpx 8rpx 0;
  padding: 14rpx 16rpx;
  border-radius: 8rpx;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 20rpx;
  line-height: 1.5;
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
  border-radius: 16rpx;
  border: 1rpx solid #e7edf2;
  padding: 28rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
  position: relative;
  overflow: hidden;
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
  font-size: 30rpx;
  font-weight: 700;
  color: #1e293b;
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
    background: #0f766e;
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
.icon-cyan { background: linear-gradient(135deg, #00bcd4 0%, #4dd0e1 100%); }
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

/* 班主任管理区域 */
.ht-section {
  border-left: 6rpx solid #18bc37;
}

.ht-no-class {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: #fef8ec;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.ht-no-class-text {
  font-size: 24rpx;
  color: #f3a044;
}

.func-item-disabled {
  opacity: 0.4;
}

.func-item-disabled .func-icon {
  filter: grayscale(0.6);
}

.ht-count {
  font-size: 20rpx;
  color: #999;
  margin-left: 4rpx;
}
</style>
