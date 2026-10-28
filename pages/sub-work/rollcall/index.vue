<template>
  <view class="page">
    <template v-if="stage === 'setup'">
      <view class="course-hero">
        <view class="hero-heading">
          <text class="hero-course">{{ courseInfo.courseName || '课程点名' }}</text>
          <text v-if="isCombined" class="hero-badge">合班课</text>
        </view>
        <view class="hero-meta">
          <text>{{ courseInfo.className || '-' }}</text>
          <text>{{ courseInfo.checkDate }} 周{{ weekdayText }}</text>
        </view>
        <view class="hero-meta">
          <text>第{{ courseInfo.startSection }}-{{ courseInfo.endSection }}节</text>
          <text>{{ courseInfo.classroom || '地点待定' }}</text>
        </view>
      </view>

      <view v-if="existingCheckInfo" class="saved-record">
        <view>
          <text class="saved-title">本人已提交点名</text>
          <text class="saved-desc">{{ existingRecordTime }}</text>
        </view>
        <text class="saved-action">可修改</text>
      </view>

      <view v-if="!loadingExistingRecord && !isEditMode" class="section-card">
        <view class="section-heading">
          <text class="section-title">点名方式</text>
          <text class="section-note">{{ methodOptions.length }} 种方式</text>
        </view>
        <view class="method-list">
          <view
            v-for="item in methodOptions"
            :key="item.key"
            class="method-item"
            :class="{ active: selectedMethod === item.key, disabled: !item.enabled }"
            @click="selectMethod(item)"
          >
            <view class="method-icon">
              <uni-icons :type="item.icon" size="22" :color="methodIconColor(item)"></uni-icons>
            </view>
            <view class="method-copy">
              <text class="method-label">{{ item.label }}</text>
              <text class="method-desc">{{ item.description }}</text>
            </view>
            <view v-if="selectedMethod === item.key" class="method-check">
              <uni-icons type="checkmarkempty" size="17" color="#ffffff"></uni-icons>
            </view>
            <text v-else-if="!item.enabled" class="method-disabled-tag">暂未开放</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-heading">
          <text class="section-title">点名范围</text>
          <text class="section-note">{{ classNames.length }} 个班级</text>
        </view>
        <view class="class-list">
          <view v-for="(item, index) in classNames" :key="index" class="class-row">
            <view class="class-index">{{ index + 1 }}</view>
            <text class="class-name">{{ item }}</text>
            <uni-icons type="checkbox-filled" size="17" color="#0f766e"></uni-icons>
          </view>
        </view>
        <view class="rule-row">
          <text class="rule-label">请假学生</text>
          <text class="rule-value">自动标记为请假</text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-heading">
          <text class="section-title">状态设置</text>
          <text class="section-note">{{ statusFlow.length }} 种状态</text>
        </view>
        <view class="status-flow">
          <view v-for="(item, index) in statusFlow" :key="item.value" class="flow-step">
            <view class="flow-pill" :class="'flow-' + item.value">{{ item.label }}</view>
            <uni-icons v-if="index < statusFlow.length - 1" type="right" size="14" color="#cbd5e1"></uni-icons>
          </view>
        </view>
      </view>

      <view v-if="!isEditMode && selectedMethod !== 'manual'" class="section-card">
        <view class="section-heading">
          <text class="section-title">签到时长</text>
          <text class="section-note">超时后学生不可签到</text>
        </view>
        <view class="duration-list">
          <view
            v-for="duration in [5, 10, 15, 20, 30]"
            :key="duration"
            class="duration-item"
            :class="{ active: signDuration === duration }"
            @click="signDuration = duration"
          >
            {{ duration }} 分钟
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="primary-btn" :class="{ disabled: enteringRollcall || loadingExistingRecord }" @click="beginRollCall">
          <text>{{ beginButtonText }}</text>
        </view>
      </view>
    </template>

    <template v-else-if="stage === 'rollcall'">
      <view class="rollcall-toolbar">
        <view class="back-setting" @click="backToSetup">
          <uni-icons type="left" size="17" color="#475569"></uni-icons>
          <text>点名设置</text>
        </view>
        <text class="record-mode">{{ isEditMode ? '修改本人记录' : '新建点名记录' }}</text>
      </view>

      <view class="course-summary">
        <view class="summary-title-row">
          <text class="summary-course">{{ courseInfo.courseName }}</text>
          <text v-if="isCombined" class="summary-badge">合班</text>
        </view>
        <text class="summary-meta">{{ courseInfo.className }} · {{ courseInfo.checkDate }} 第{{ courseInfo.startSection }}节</text>
      </view>

      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-number">{{ totalStudents }}</text>
          <text class="stat-label">应到</text>
        </view>
        <view class="stat-item">
          <text class="stat-number stat-green">{{ presentCount }}</text>
          <text class="stat-label">出勤</text>
        </view>
        <view class="stat-item">
          <text class="stat-number stat-amber">{{ leaveCount }}</text>
          <text class="stat-label">请假</text>
        </view>
        <view class="stat-item">
          <text class="stat-number stat-red">{{ abnormalCount }}</text>
          <text class="stat-label">异常</text>
        </view>
      </view>

      <view v-if="abnormalCount > 0" class="abnormal-summary">
        <text v-if="truantCount > 0">旷课 {{ truantCount }}</text>
        <text v-if="lateCount > 0">迟到 {{ lateCount }}</text>
        <text v-if="earlyLeaveCount > 0">早退 {{ earlyLeaveCount }}</text>
      </view>

      <view class="student-list">
        <view
          v-for="(student, index) in studentList"
          :key="student.xh"
          class="student-grid-item"
          :class="[
            'student-' + student.attendStatus,
            { 'student-leave': student.attendStatus === 'leave' }
          ]"
          @click="cycleStudentStatus(index)"
        >
          <text class="student-name">{{ student.studentName }}</text>
          <view class="student-status-mark">
            <text class="status-mark-char">{{ statusMarkText(student.attendStatus) }}</text>
          </view>
        </view>
      </view>

      <view class="grid-legend">
        <view v-for="item in statusFlow" :key="item.value" class="legend-item">
          <view class="legend-mark" :class="'status-' + item.value">
            <text class="status-mark-char">{{ statusMarkText(item.value) }}</text>
          </view>
          <text>{{ item.label }}</text>
        </view>
      </view>

      <view v-if="loadingRoster" class="loading-state">
        <text>正在加载班级名单...</text>
      </view>
      <view v-else-if="studentList.length === 0" class="empty-state">
        <text class="empty-title">暂无学生名单</text>
        <text class="empty-action" @click="loadRoster">重新加载</text>
      </view>

      <view v-if="studentList.length > 0" class="bottom-bar">
        <view class="submit-copy">
          <text>异常 {{ abnormalCount }} 人</text>
          <text>请假 {{ leaveCount }} 人</text>
        </view>
        <view class="submit-btn" :class="{ disabled: submitting }" @click="submitRollCallData">
          <text>{{ submitting ? '提交中...' : (isEditMode ? '保存修改' : '提交点名') }}</text>
        </view>
      </view>
    </template>

    <template v-else>
      <view class="rollcall-toolbar">
        <view class="back-setting" @click="cancelMobileSign">
          <uni-icons type="left" size="17" color="#475569"></uni-icons>
          <text>取消签到</text>
        </view>
        <text class="record-mode">{{ mobileMethodLabel }}点名</text>
      </view>

      <view class="course-summary">
        <view class="summary-title-row">
          <text class="summary-course">{{ courseInfo.courseName }}</text>
          <text v-if="isCombined" class="summary-badge">合班</text>
        </view>
        <text class="summary-meta">{{ courseInfo.className }} · {{ courseInfo.checkDate }} 第{{ courseInfo.startSection }}节</text>
      </view>

      <view class="mobile-sign-card">
        <view class="mobile-sign-heading">
          <view>
            <text class="mobile-sign-title">学生手机签到</text>
            <text class="mobile-sign-subtitle">学生打开手机点名并确认本人</text>
          </view>
          <view class="live-badge">
            <view class="live-dot" :class="{ finished: mobileSession && mobileSession.status === '1' }"></view>
            <text>{{ mobileSession && mobileSession.status === '1' ? '待提交' : '进行中' }}</text>
          </view>
        </view>

        <view v-if="mobileSession && mobileSession.signType === 'code'" class="sign-code-panel">
          <text class="sign-code-label">签到码</text>
          <text class="sign-code-value">{{ mobileSession.signCode || '----' }}</text>
        </view>
        <view v-if="mobileSession && mobileSession.signType === 'qr'" class="qr-panel">
          <image
            v-if="mobileSession.qrImage"
            class="qr-image"
            :src="mobileSession.qrImage"
            mode="aspectFit"
          ></image>
          <text v-else class="qr-loading">二维码生成中...</text>
          <text class="qr-tip">学生使用学生端扫码确认本人</text>
        </view>

        <view class="mobile-progress">
          <view class="progress-copy">
            <text class="progress-value">{{ mobileSignedCount }}/{{ mobileSummary.totalCount || totalStudents }}</text>
            <text class="progress-label">已签到</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="'width:' + mobileProgressPercent + '%'"></view>
          </view>
          <text class="progress-percent">{{ mobileProgressPercent }}%</text>
        </view>
      </view>

      <view class="stats-bar mobile-stats">
        <view class="stat-item">
          <text class="stat-number">{{ mobileSummary.totalCount || 0 }}</text>
          <text class="stat-label">应到</text>
        </view>
        <view class="stat-item">
          <text class="stat-number stat-green">{{ mobileSummary.signedOn || 0 }}</text>
          <text class="stat-label">按时</text>
        </view>
        <view class="stat-item">
          <text class="stat-number stat-amber">{{ mobileSummary.signedLate || 0 }}</text>
          <text class="stat-label">迟到</text>
        </view>
        <view class="stat-item">
          <text class="stat-number stat-cyan">{{ mobileSummary.leave || 0 }}</text>
          <text class="stat-label">请假</text>
        </view>
        <view class="stat-item">
          <text class="stat-number stat-red">{{ mobileSummary.unsigned || 0 }}</text>
          <text class="stat-label">未签</text>
        </view>
      </view>

      <view class="mobile-student-card">
        <view class="mobile-list-heading">
          <text class="section-title">签到进度</text>
          <view class="refresh-action" @click="loadMobileProgress">
            <uni-icons type="refresh" size="15" color="#0f766e"></uni-icons>
            <text>刷新</text>
          </view>
        </view>
        <view class="mobile-student-grid">
          <view
            v-for="student in mobileStudents"
            :key="student.xh"
            class="mobile-student-item"
            :class="'mobile-' + student.signStatus"
          >
            <view class="student-status-mark">
              <uni-icons
                :type="mobileStatusIcon(student.signStatus)"
                size="10"
                color="#ffffff"
              ></uni-icons>
            </view>
            <text class="student-name">{{ student.studentName }}</text>
            <text class="student-grid-status">{{ mobileStatusLabel(student.signStatus) }}</text>
          </view>
        </view>
        <view v-if="mobileStudents.length === 0" class="mobile-empty">
          <text>正在加载签到名单...</text>
        </view>
      </view>

      <view class="bottom-bar mobile-bottom">
        <view class="refresh-button" @click="loadMobileProgress">
          <uni-icons type="refresh" size="19" color="#0f766e"></uni-icons>
          <text>刷新</text>
        </view>
        <view class="submit-btn" :class="{ disabled: submitting }" @click="finishAndSubmitMobileSign">
          <text>{{ submitting ? '正在提交...' : '结束并提交点名' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { submitRollCall, getCheckStatus, getClassStudents, getLeaveStudents } from '@/api/work/rollcall'
import {
  addSignSession,
  getSignProgress,
  finishSignSession,
  confirmSignSession,
  cancelSignSession
} from '@/api/work/sign'

export default {
  data() {
    return {
      stage: 'setup',
      courseInfo: {
        bjdm: '',
        className: '',
        courseName: '',
        classroom: '',
        checkDate: '',
        startSection: '',
        endSection: '',
        weekday: ''
      },
      bjdmList: [],
      isCombined: false,
      selectedMethod: 'manual',
      methodOptions: [
        { key: 'manual', label: '手动点名', description: '逐个确认学生到课状态', icon: 'compose', enabled: true },
        { key: 'code', label: '签到码', description: '学生手机输入数字签到码', icon: 'scan', enabled: true },
        { key: 'qr', label: '二维码', description: '学生扫码确认本人到课', icon: 'scan', enabled: true },
        { key: 'location', label: '位置签到', description: '校验学生当前位置', icon: 'location', enabled: false },
        { key: 'photo', label: '拍照签到', description: '上传现场照片', icon: 'camera', enabled: false },
        { key: 'gesture', label: '手势签到', description: '按教师设置的手势签到', icon: 'settings', enabled: false }
      ],
      statusFlow: [
        { value: 'present', label: '出勤' },
        { value: 'truant', label: '旷课' },
        { value: 'late', label: '迟到' },
        { value: 'early_leave', label: '早退' }
      ],
      statusCycle: ['present', 'truant', 'late', 'early_leave'],
      signDuration: 15,
      studentList: [],
      isEditMode: false,
      existingCheckInfo: null,
      loadingExistingRecord: true,
      enteringRollcall: false,
      loadingRoster: false,
      submitting: false,
      mobileSessionId: null,
      mobileSession: null,
      mobileStudents: [],
      mobileSummary: {},
      mobileRefreshTimer: null
    }
  },
  computed: {
    weekdayText() {
      const days = ['日', '一', '二', '三', '四', '五', '六']
      let weekday = Number(this.courseInfo.weekday)
      if (!weekday && this.courseInfo.checkDate) {
        weekday = new Date(this.courseInfo.checkDate.replace(/-/g, '/')).getDay()
      }
      return days[weekday] || ''
    },
    classNames() {
      if (!this.courseInfo.className) return this.bjdmList
      const names = this.courseInfo.className.split(/[、,，]/).map(name => name.trim()).filter(name => name)
      return names.length > 0 ? names : this.bjdmList
    },
    existingRecordTime() {
      if (!this.existingCheckInfo) return ''
      const time = this.existingCheckInfo.updateTime || this.existingCheckInfo.createTime
      return time ? String(time).replace('T', ' ').substring(0, 16) + ' 更新' : '已有可修改记录'
    },
    totalStudents() {
      return this.studentList.length
    },
    presentCount() {
      return this.studentList.filter(student => student.attendStatus === 'present').length
    },
    leaveCount() {
      return this.studentList.filter(student => student.attendStatus === 'leave').length
    },
    abnormalCount() {
      return this.studentList.filter(student => ['truant', 'late', 'early_leave'].includes(student.attendStatus)).length
    },
    truantCount() {
      return this.studentList.filter(student => student.attendStatus === 'truant').length
    },
    lateCount() {
      return this.studentList.filter(student => student.attendStatus === 'late').length
    },
    earlyLeaveCount() {
      return this.studentList.filter(student => student.attendStatus === 'early_leave').length
    },
    mobileSignedCount() {
      return Number(this.mobileSummary.signedOn || 0) + Number(this.mobileSummary.signedLate || 0)
    },
    mobileProgressPercent() {
      const total = Number(this.mobileSummary.totalCount || 0)
      if (!total) return 0
      return Math.min(100, Math.round(this.mobileSignedCount / total * 100))
    },
    mobileMethodLabel() {
      return this.selectedMethod === 'qr' ? '二维码' : '签到码'
    },
    beginButtonText() {
      if (this.loadingExistingRecord) return '正在检查点名记录...'
      if (this.enteringRollcall) {
        return this.selectedMethod === 'manual' ? '正在加载名单...' : '正在发起签到...'
      }
      if (this.selectedMethod !== 'manual') return '发起学生手机签到'
      return this.isEditMode ? '进入修改' : '开始点名'
    }
  },
  onLoad(options) {
    this.parseCourseInfo(options || {})
    this.loadExistingRecord()
  },
  onUnload() {
    this.clearMobileRefresh()
  },
  methods: {
    safeDecode(value) {
      if (value === undefined || value === null) return ''
      try {
        return decodeURIComponent(String(value))
      } catch (e) {
        return String(value)
      }
    },
    parseCourseInfo(options) {
      this.courseInfo = {
        bjdm: this.safeDecode(options.bjdm),
        className: this.safeDecode(options.classNames || options.className),
        courseName: this.safeDecode(options.courseName),
        classroom: this.safeDecode(options.classroom),
        checkDate: this.safeDecode(options.checkDate),
        startSection: this.safeDecode(options.startSection),
        endSection: this.safeDecode(options.endSection),
        weekday: this.safeDecode(options.weekday)
      }

      let classCodes = []
      if (options.bjdmList) {
        const value = this.safeDecode(options.bjdmList)
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) classCodes = parsed
        } catch (e) {
          classCodes = value.split(',')
        }
      }
      if (classCodes.length === 0 && this.courseInfo.bjdm) {
        classCodes = [this.courseInfo.bjdm]
      }
      this.bjdmList = [...new Set(classCodes.map(code => String(code || '').trim()).filter(code => code))]
      this.isCombined = this.bjdmList.length > 1
    },
    methodIconColor(item) {
      if (!item.enabled) return '#a8b1bd'
      return this.selectedMethod === item.key ? '#0f766e' : '#475569'
    },
    selectMethod(item) {
      if (this.isEditMode) return
      if (!item.enabled) {
        uni.showToast({ title: item.label + '暂未开放', icon: 'none' })
        return
      }
      this.selectedMethod = item.key
    },
    async loadExistingRecord() {
      if (!this.bjdmList.length || !this.courseInfo.checkDate || !this.courseInfo.startSection) {
        this.loadingExistingRecord = false
        return
      }
      try {
        const res = await getCheckStatus(
          this.bjdmList[0],
          this.courseInfo.checkDate,
          Number(this.courseInfo.startSection)
        )
        this.applyExistingRecord(res.data)
      } catch (e) {
        this.applyExistingRecord(null)
      } finally {
        this.loadingExistingRecord = false
      }
    },
    applyExistingRecord(record) {
      this.existingCheckInfo = record || null
      this.isEditMode = !!record
      if (record) this.selectedMethod = 'manual'
    },
    async beginRollCall() {
      if (this.enteringRollcall || this.loadingExistingRecord) return
      if (!this.bjdmList.length) {
        uni.showToast({ title: '班级信息缺失，无法点名', icon: 'none' })
        return
      }
      if (this.isEditMode) this.selectedMethod = 'manual'
      if (this.selectedMethod !== 'manual') {
        await this.startMobileSign()
        return
      }
      this.enteringRollcall = true
      this.stage = 'rollcall'
      uni.setNavigationBarTitle({ title: '手动点名' })
      await this.loadRoster()
      this.enteringRollcall = false
    },
    backToSetup() {
      this.stage = 'setup'
      uni.setNavigationBarTitle({ title: '点名设置' })
    },
    async startMobileSign() {
      if (this.enteringRollcall || this.isEditMode) return
      const today = this.formatDate(new Date())
      if (this.courseInfo.checkDate && this.courseInfo.checkDate !== today) {
        uni.showToast({ title: '学生手机点名仅可在上课当天发起', icon: 'none' })
        return
      }

      this.enteringRollcall = true
      try {
        const now = new Date()
        const data = {
          scene: 'class',
          sessionName: this.buildMobileSessionName(),
          bjdm: this.bjdmList[0],
          bjdmList: this.bjdmList.join(','),
          className: this.courseInfo.className,
          courseName: this.courseInfo.courseName,
          lessonNo: Number(this.courseInfo.startSection),
          classRoom: this.courseInfo.classroom,
          signType: this.selectedMethod,
          startTime: this.formatDateTime(now),
          duration: this.signDuration
        }
        const res = await addSignSession(data)
        this.mobileSessionId = this.extractSessionId(res.data)
        if (!this.mobileSessionId) throw new Error('missing session id')
        this.mobileSession = {
          ...data,
          sessionId: this.mobileSessionId,
          signCode: res.signCode || '',
          status: '0'
        }
        this.mobileSummary = {}
        this.mobileStudents = []
        this.stage = 'mobile'
        uni.setNavigationBarTitle({ title: this.mobileMethodLabel + '点名' })
        await this.loadMobileProgress()
        this.startMobileRefresh()
      } catch (e) {
        this.mobileSessionId = null
        this.mobileSession = null
        this.stage = 'setup'
        uni.showToast({
          title: typeof e === 'string' ? e : (e && e.message ? e.message : '签到发起失败'),
          icon: 'none'
        })
      } finally {
        this.enteringRollcall = false
      }
    },
    buildMobileSessionName() {
      const parts = [
        this.courseInfo.className,
        this.courseInfo.courseName,
        this.courseInfo.checkDate + ' 第' + this.courseInfo.startSection + '节'
      ].filter(Boolean)
      return parts.join(' ') + this.mobileMethodLabel
    },
    extractSessionId(value) {
      if (!value) return null
      if (typeof value === 'object') return value.sessionId || null
      return value
    },
    async loadMobileProgress() {
      if (!this.mobileSessionId) return
      try {
        const res = await getSignProgress(this.mobileSessionId)
        this.mobileSession = res.session || this.mobileSession
        this.mobileStudents = res.studentList || []
        this.mobileSummary = res.summary || {}
      } catch (e) {
        uni.showToast({ title: '签到进度加载失败', icon: 'none' })
      }
    },
    startMobileRefresh() {
      this.clearMobileRefresh()
      this.mobileRefreshTimer = setInterval(() => {
        if (this.stage === 'mobile') this.loadMobileProgress()
      }, 5000)
    },
    clearMobileRefresh() {
      if (this.mobileRefreshTimer) {
        clearInterval(this.mobileRefreshTimer)
        this.mobileRefreshTimer = null
      }
    },
    cancelMobileSign() {
      if (this.mobileSession && this.mobileSession.convertStatus === '1') {
        this.clearMobileRefresh()
        uni.showToast({ title: '点名已提交', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 800)
        return
      }
      if (this.mobileSession && this.mobileSession.status === '1') {
        uni.showToast({ title: '签到已结束，请先提交点名', icon: 'none' })
        return
      }
      uni.showModal({
        title: '取消手机点名',
        content: '取消后本次签到立即失效，不会生成点名记录。',
        success: async res => {
          if (!res.confirm) return
          try {
            await cancelSignSession(this.mobileSessionId)
          } catch (e) {}
          this.clearMobileRefresh()
          this.mobileSessionId = null
          this.mobileSession = null
          this.mobileStudents = []
          this.mobileSummary = {}
          this.backToSetup()
        }
      })
    },
    async finishAndSubmitMobileSign() {
      if (this.submitting || !this.mobileSessionId) return
      this.submitting = true
      try {
        if (!this.mobileSession || this.mobileSession.status === '0') {
          await finishSignSession(this.mobileSessionId)
        }
        const res = await confirmSignSession(this.mobileSessionId)
        if (res.data) this.existingCheckInfo = { id: res.data }
        this.clearMobileRefresh()
        uni.showToast({ title: '点名已提交', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 800)
      } catch (e) {
        await this.loadMobileProgress()
        if (this.mobileSession && this.mobileSession.convertStatus === '1') {
          this.clearMobileRefresh()
          uni.showToast({ title: '点名已提交', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 800)
          return
        }
        uni.showToast({
          title: this.mobileSession && this.mobileSession.status === '1'
            ? '签到已结束，请重试提交'
            : '提交失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
    },
    async loadRoster() {
      if (this.loadingRoster) return
      this.loadingRoster = true
      try {
        const studentGroups = await Promise.all(
          this.bjdmList.map(bjdm => getClassStudents(bjdm).then(res => res.data || []))
        )
        const uniqueStudents = []
        const studentXhs = new Set()
        studentGroups.forEach(group => {
          group.forEach(student => {
            const xh = student.xh || student.studentNo
            if (!xh || studentXhs.has(xh)) return
            studentXhs.add(xh)
            uniqueStudents.push({
              ...student,
              xh,
              studentName: student.studentName || student.xm || ''
            })
          })
        })

        const leaveGroups = await Promise.all(
          this.bjdmList.map(bjdm =>
            getLeaveStudents(bjdm, this.courseInfo.checkDate).catch(() => ({ data: [] }))
          )
        )
        const leaveMap = new Map()
        leaveGroups.forEach(res => {
          const leaves = res.data || []
          leaves.forEach(leave => {
            if (leave.xh) leaveMap.set(leave.xh, leave)
          })
        })

        let existing = this.existingCheckInfo
        if (!existing) {
          try {
            const statusRes = await getCheckStatus(
              this.bjdmList[0],
              this.courseInfo.checkDate,
              Number(this.courseInfo.startSection)
            )
            existing = statusRes.data || null
          } catch (e) {
            existing = null
          }
        }
        const detailMap = new Map()
        if (existing && Array.isArray(existing.detailList)) {
          existing.detailList.forEach(detail => {
            detailMap.set(detail.xh, this.normalizeStatus(detail.absentType))
          })
        }

        this.applyExistingRecord(existing)
        this.studentList = uniqueStudents.map(student => {
          const leave = leaveMap.get(student.xh)
          const savedStatus = detailMap.get(student.xh)
          return {
            ...student,
            attendStatus: leave ? 'leave' : (savedStatus || 'present'),
            leaveTypeText: leave ? this.getLeaveTypeText(leave.leaveType) : '',
            leaveId: leave ? leave.id : null
          }
        })
      } catch (e) {
        this.studentList = []
        uni.showToast({ title: '学生名单加载失败', icon: 'none' })
      } finally {
        this.loadingRoster = false
      }
    },
    normalizeStatus(status) {
      if (status === 'absent') return 'truant'
      return ['truant', 'late', 'early_leave'].includes(status) ? status : 'present'
    },
    getLeaveTypeText(type) {
      if (!type) return '已请假'
      if (String(type).includes('假')) return String(type)
      const labels = { sick: '病假', personal: '事假', other: '其他' }
      return labels[type] || '已请假'
    },
    cycleStudentStatus(index) {
      const student = this.studentList[index]
      if (!student) return
      if (student.attendStatus === 'leave') {
        uni.showToast({ title: '该学生已请假', icon: 'none' })
        return
      }
      const currentIndex = this.statusCycle.indexOf(student.attendStatus)
      const nextStatus = this.statusCycle[(currentIndex + 1) % this.statusCycle.length]
      this.$set(this.studentList, index, { ...student, attendStatus: nextStatus })
    },
    statusLabel(status) {
      const labels = {
        present: '出勤',
        truant: '旷课',
        late: '迟到',
        early_leave: '早退',
        leave: '请假'
      }
      return labels[status] || '出勤'
    },
    statusMarkText(status) {
      const marks = {
        present: '出',
        truant: '旷',
        late: '迟',
        early_leave: '退',
        leave: '假'
      }
      return marks[status] || '出'
    },
    mobileStatusIcon(status) {
      const icons = {
        '0': 'checkmarkempty',
        '1': 'calendar',
        leave: 'info',
        unsigned: 'closeempty'
      }
      return icons[status] || 'closeempty'
    },
    mobileStatusLabel(status) {
      const labels = {
        '0': '按时',
        '1': '迟到',
        leave: '请假',
        unsigned: '未签'
      }
      return labels[status] || '未签'
    },
    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    formatDateTime(date) {
      const h = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      const s = String(date.getSeconds()).padStart(2, '0')
      return `${this.formatDate(date)} ${h}:${min}:${s}`
    },
    async submitRollCallData() {
      if (this.submitting || this.studentList.length === 0) return
      this.submitting = true
      try {
        const detailList = this.studentList
          .filter(student => !['present', 'leave'].includes(student.attendStatus))
          .map(student => ({
            xh: student.xh,
            studentName: student.studentName,
            absentType: student.attendStatus
          }))

        const data = {
          bjdm: this.bjdmList[0],
          bjdmList: this.bjdmList.join(','),
          className: this.courseInfo.className,
          checkDate: this.courseInfo.checkDate,
          lessonNo: Number(this.courseInfo.startSection),
          courseName: this.courseInfo.courseName,
          classRoom: this.courseInfo.classroom,
          totalStudents: this.totalStudents,
          presentCount: this.presentCount,
          leaveCount: this.leaveCount,
          absentCount: this.abnormalCount,
          checkerRole: 'teacher',
          detailList
        }

        const res = await submitRollCall(data)
        if (res.data) this.existingCheckInfo = { id: res.data }
        uni.showToast({ title: this.isEditMode ? '修改成功' : '点名成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 800)
      } catch (e) {
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  background: #f4f7f9;
  color: #1e293b;
}

.course-hero {
  padding: 34rpx 30rpx 32rpx;
  background: #0f766e;
  color: #ffffff;
}

.hero-heading,
.hero-meta,
.summary-title-row,
.student-name-row,
.saved-record,
.method-item,
.class-row,
.rule-row,
.status-flow,
.rollcall-toolbar,
.back-setting,
.status-wrap,
.submit-copy {
  display: flex;
  align-items: center;
}

.hero-heading,
.summary-title-row {
  gap: 14rpx;
}

.hero-course {
  min-width: 0;
  flex: 1;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-all;
}

.hero-badge,
.summary-badge {
  flex-shrink: 0;
  padding: 5rpx 12rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 20rpx;
}

.hero-meta {
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 14rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 23rpx;
}

.hero-meta text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saved-record {
  justify-content: space-between;
  gap: 18rpx;
  margin: 20rpx 24rpx 0;
  padding: 20rpx 24rpx;
  border: 1rpx solid #bae6fd;
  border-radius: 12rpx;
  background: #f0f9ff;
}

.saved-title,
.saved-desc {
  display: block;
}

.saved-title {
  color: #075985;
  font-size: 26rpx;
  font-weight: 600;
}

.saved-desc {
  margin-top: 5rpx;
  color: #64748b;
  font-size: 21rpx;
}

.saved-action {
  flex-shrink: 0;
  color: #0369a1;
  font-size: 23rpx;
  font-weight: 600;
}

.section-card {
  margin: 20rpx 24rpx;
  padding: 24rpx;
  border: 1rpx solid #e3e9ee;
  border-radius: 14rpx;
  background: #ffffff;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.section-title {
  color: #1e293b;
  font-size: 28rpx;
  font-weight: 700;
}

.section-note {
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 21rpx;
}

.method-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.method-item {
  position: relative;
  box-sizing: border-box;
  min-height: 126rpx;
  padding: 18rpx;
  gap: 14rpx;
  border: 2rpx solid #e8edf1;
  border-radius: 12rpx;
  background: #fbfcfd;
}

.method-item.active {
  border-color: #0f766e;
  background: #f0fdfa;
}

.method-item.disabled {
  background: #f7f8fa;
  opacity: 0.7;
}

.method-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  flex-shrink: 0;
  border-radius: 10rpx;
  background: #eef3f5;
}

.method-item.active .method-icon {
  background: #ccfbf1;
}

.method-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.method-label {
  color: #334155;
  font-size: 25rpx;
  font-weight: 600;
}

.method-desc {
  color: #94a3b8;
  font-size: 19rpx;
  line-height: 1.35;
}

.method-check {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #0f766e;
}

.method-disabled-tag {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  color: #a1aab5;
  font-size: 17rpx;
}

.class-list {
  border-top: 1rpx solid #edf1f4;
}

.class-row {
  gap: 14rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.class-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  border-radius: 8rpx;
  background: #ecfdf5;
  color: #0f766e;
  font-size: 19rpx;
  font-weight: 600;
}

.class-name {
  min-width: 0;
  flex: 1;
  color: #334155;
  font-size: 25rpx;
  line-height: 1.4;
  word-break: break-all;
}

.rule-row {
  justify-content: space-between;
  gap: 18rpx;
  padding-top: 18rpx;
  color: #64748b;
  font-size: 23rpx;
}

.rule-label {
  color: #475569;
}

.rule-value {
  color: #0f766e;
}

.status-flow {
  flex-wrap: wrap;
  gap: 10rpx;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.flow-pill {
  padding: 7rpx 13rpx;
  border-radius: 7rpx;
  font-size: 21rpx;
}

.flow-present {
  background: #ecfdf5;
  color: #047857;
}

.flow-truant {
  background: #fef2f2;
  color: #dc2626;
}

.flow-late {
  background: #fffbeb;
  color: #b45309;
}

.flow-early_leave {
  background: #fff7ed;
  color: #c2410c;
}

.duration-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10rpx;
}

.duration-item {
  padding: 15rpx 4rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 9rpx;
  background: #f8fafc;
  color: #64748b;
  font-size: 21rpx;
  text-align: center;
}

.duration-item.active {
  border-color: #0f766e;
  background: #ecfdf5;
  color: #0f766e;
  font-weight: 600;
}

.bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-sizing: border-box;
  padding: 18rpx 28rpx;
  padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #e2e8f0;
  background: #ffffff;
}

.primary-btn,
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  border-radius: 12rpx;
  background: #0f766e;
  color: #ffffff;
  font-size: 29rpx;
  font-weight: 600;
}

.primary-btn {
  width: 100%;
}

.primary-btn.disabled,
.submit-btn.disabled {
  opacity: 0.55;
}

.rollcall-toolbar {
  justify-content: space-between;
  gap: 18rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #e5ebef;
  background: #ffffff;
}

.back-setting {
  gap: 5rpx;
  color: #475569;
  font-size: 24rpx;
}

.record-mode {
  flex-shrink: 0;
  color: #0f766e;
  font-size: 21rpx;
  font-weight: 600;
}

.course-summary {
  margin: 18rpx 24rpx 0;
  padding: 22rpx 24rpx;
  border-radius: 12rpx;
  background: #173f4a;
  color: #ffffff;
}

.summary-course {
  min-width: 0;
  flex: 1;
  font-size: 31rpx;
  font-weight: 700;
  word-break: break-all;
}

.summary-badge {
  background: #2d6671;
}

.summary-meta {
  display: block;
  margin-top: 9rpx;
  overflow: hidden;
  color: #c6dbe1;
  font-size: 21rpx;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 18rpx 24rpx 0;
  padding: 20rpx 0;
  border: 1rpx solid #e3e9ee;
  border-radius: 12rpx;
  background: #ffffff;
}

.stat-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  border-right: 1rpx solid #edf1f4;
}

.stat-item:last-child {
  border-right: none;
}

.stat-number {
  color: #1e293b;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: #7c8797;
  font-size: 20rpx;
}

.stat-green {
  color: #047857;
}

.stat-amber {
  color: #b45309;
}

.stat-red {
  color: #dc2626;
}

.abnormal-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin: 14rpx 24rpx 0;
}

.abnormal-summary text {
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  background: #fff1f2;
  color: #be123c;
  font-size: 20rpx;
}

.student-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10rpx;
  margin: 18rpx 24rpx 0;
}

.student-grid-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6rpx;
  min-width: 0;
  min-height: 64rpx;
  box-sizing: border-box;
  padding: 8rpx 6rpx;
  border: 1rpx solid #86efac;
  border-radius: 7rpx;
  background: #ffffff;
}

.student-grid-item:active {
  background: #f8fafc;
}

.student-truant {
  border-color: #fca5a5;
  background: #fffafa;
}

.student-late {
  border-color: #fcd34d;
  background: #fffdf7;
}

.student-early_leave {
  border-color: #fdba74;
  background: #fffaf5;
}

.student-leave {
  border-color: #67e8f9;
  background: #f8fcfd;
}

.student-name {
  display: block;
  width: 100%;
  margin-top: 10rpx;
  overflow: hidden;
  color: #1e293b;
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.student-grid-item .student-name {
  width: auto;
  min-width: 0;
  flex: 1;
  margin-top: 0;
  font-size: 21rpx;
  line-height: 1.2;
  text-align: left;
}

.student-class {
  display: block;
  width: 100%;
  overflow: hidden;
  margin-top: 5rpx;
  padding: 3rpx 5rpx;
  box-sizing: border-box;
  border-radius: 5rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 16rpx;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leave-type {
  display: block;
  width: 100%;
  overflow: hidden;
  margin-top: 4rpx;
  color: #94a3b8;
  font-size: 17rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leave-type {
  color: #0e7490;
}

.student-status-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26rpx;
  height: 26rpx;
  flex: 0 0 26rpx;
  line-height: 1;
  border-radius: 50%;
  background: #16a34a;
}

.status-mark-char {
  color: #ffffff;
  font-size: 16rpx;
  font-weight: 700;
  line-height: 1;
}

.student-truant .student-status-mark,
.mobile-unsigned .student-status-mark {
  background: #dc2626;
}

.student-late .student-status-mark,
.mobile-1 .student-status-mark {
  background: #d97706;
}

.student-early_leave .student-status-mark {
  background: #ea580c;
}

.student-leave .student-status-mark,
.mobile-leave .student-status-mark {
  background: #0891b2;
}

.student-grid-status {
  display: block;
  margin-top: 6rpx;
  color: #15803d;
  font-size: 18rpx;
  font-weight: 600;
}

.student-truant .student-grid-status,
.mobile-unsigned .student-grid-status {
  color: #b91c1c;
}

.student-late .student-grid-status,
.mobile-1 .student-grid-status {
  color: #b45309;
}

.student-early_leave .student-grid-status {
  color: #c2410c;
}

.student-leave .student-grid-status,
.mobile-leave .student-grid-status {
  color: #0e7490;
}

.grid-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 22rpx;
  margin: 18rpx 28rpx;
  padding: 18rpx 20rpx;
  border-radius: 10rpx;
  background: #ffffff;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 7rpx;
  color: #64748b;
  font-size: 19rpx;
}

.legend-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26rpx;
  height: 26rpx;
  flex: 0 0 26rpx;
  border-radius: 50%;
  background: #16a34a;
}

.legend-mark.status-truant {
  background: #dc2626;
}

.legend-mark.status-late {
  background: #d97706;
}

.legend-mark.status-early_leave {
  background: #ea580c;
}

.mobile-sign-card {
  margin: 18rpx 24rpx 0;
  padding: 24rpx;
  border: 1rpx solid #dce7ea;
  border-radius: 14rpx;
  background: #ffffff;
}

.mobile-sign-heading,
.mobile-progress,
.mobile-list-heading,
.refresh-action,
.live-badge,
.refresh-button {
  display: flex;
  align-items: center;
}

.mobile-sign-heading {
  justify-content: space-between;
  gap: 18rpx;
}

.mobile-sign-title,
.mobile-sign-subtitle {
  display: block;
}

.mobile-sign-title {
  color: #173f4a;
  font-size: 28rpx;
  font-weight: 700;
}

.mobile-sign-subtitle {
  margin-top: 6rpx;
  color: #8a97a3;
  font-size: 20rpx;
}

.live-badge {
  flex-shrink: 0;
  gap: 7rpx;
  padding: 7rpx 12rpx;
  border-radius: 12rpx;
  background: #ecfdf5;
  color: #047857;
  font-size: 19rpx;
}

.live-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #10b981;
}

.live-dot.finished {
  background: #d97706;
}

.sign-code-panel {
  margin-top: 24rpx;
  padding: 22rpx;
  border-radius: 12rpx;
  background: #f0fdfa;
  text-align: center;
}

.sign-code-label,
.sign-code-value {
  display: block;
}

.sign-code-label {
  color: #64748b;
  font-size: 21rpx;
}

.sign-code-value {
  margin-top: 8rpx;
  color: #0f766e;
  font-size: 66rpx;
  font-weight: 800;
  letter-spacing: 12rpx;
  line-height: 1.2;
}

.qr-panel {
  margin-top: 24rpx;
  padding: 18rpx;
  border-radius: 12rpx;
  background: #f0fdfa;
  text-align: center;
}

.qr-image {
  display: block;
  width: 330rpx;
  height: 330rpx;
  margin: 0 auto 10rpx;
}

.qr-loading,
.qr-tip {
  color: #64748b;
  font-size: 21rpx;
}

.mobile-progress {
  gap: 16rpx;
  margin-top: 22rpx;
}

.progress-copy {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.progress-value {
  color: #173f4a;
  font-size: 28rpx;
  font-weight: 700;
}

.progress-label {
  color: #94a3b8;
  font-size: 18rpx;
}

.progress-track {
  flex: 1;
  height: 12rpx;
  overflow: hidden;
  border-radius: 8rpx;
  background: #e8eef0;
}

.progress-fill {
  height: 100%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #0f766e, #22c55e);
  transition: width 0.3s;
}

.progress-percent {
  flex-shrink: 0;
  color: #0f766e;
  font-size: 23rpx;
  font-weight: 700;
}

.mobile-stats {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.stat-cyan {
  color: #0891b2;
}

.mobile-student-card {
  margin: 18rpx 24rpx 0;
  padding: 22rpx;
  border: 1rpx solid #e3e9ee;
  border-radius: 14rpx;
  background: #ffffff;
}

.mobile-list-heading {
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.refresh-action {
  gap: 5rpx;
  color: #0f766e;
  font-size: 20rpx;
}

.mobile-student-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
}

.mobile-student-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  min-height: 142rpx;
  box-sizing: border-box;
  padding: 23rpx 8rpx 14rpx;
  border: 1rpx solid #e3e9ee;
  border-top: 6rpx solid #16a34a;
  border-radius: 12rpx;
  background: #ffffff;
  text-align: center;
  border-top-color: #16a34a;
}

.mobile-student-item:active {
  background: #f8fafc;
}

.mobile-unsigned {
  border-top-color: #dc2626;
  background: #fffafa;
}

.mobile-1 {
  border-top-color: #d97706;
  background: #fffdf7;
}

.mobile-leave {
  border-top-color: #0891b2;
  background: #f8fcfd;
}

.mobile-empty {
  padding: 60rpx 20rpx;
  color: #94a3b8;
  font-size: 23rpx;
  text-align: center;
}

.mobile-bottom {
  gap: 14rpx;
}

.refresh-button {
  flex-shrink: 0;
  justify-content: center;
  gap: 7rpx;
  min-height: 88rpx;
  padding: 0 22rpx;
  border-radius: 12rpx;
  background: #ecfdf5;
  color: #0f766e;
  font-size: 23rpx;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 100rpx 24rpx;
  color: #94a3b8;
  font-size: 25rpx;
}

.empty-title {
  color: #64748b;
  font-size: 27rpx;
}

.empty-action {
  color: #0f766e;
  font-size: 23rpx;
}

.submit-copy {
  min-width: 150rpx;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
  color: #64748b;
  font-size: 20rpx;
}

.submit-btn {
  min-width: 250rpx;
  flex: 1;
}
</style>
