<template>
  <view class="page-wrap">
    <!-- 只读提示：看得到但不是自己记的，或已结束的谈话 -->
    <view class="readonly-banner" v-if="readOnly">
      <text class="readonly-text">{{ readonlyText }}</text>
    </view>

    <!-- 高危上报闭环：有 stumanage:talk:report 权限的学院书记才给处置入口，谈话人只看上报状态 -->
    <view class="report-card" v-if="riskStudents.length > 0">
      <view class="rc-head">
        <text class="rc-title">{{ rcTitle }}</text>
        <text class="rc-names">{{ riskNames }}</text>
      </view>
      <block v-if="canHandleReport">
        <textarea class="rc-textarea" v-model="handleRemark" placeholder="处置说明，例：已转介校心理中心并约谈家长，明日复访宿舍" />
        <button class="rc-btn" @click="submitReportHandle" :loading="handling" :disabled="handling">接手处置并闭环</button>
      </block>
      <view class="rc-handled" v-if="handledText">
        <text class="rc-handled-text">{{ handledText }}</text>
      </view>
    </view>
    <!-- 基本信息 -->
    <view class="form-section">
      <view class="section-title">基本信息</view>
      <!-- 记录身份：兼辅导员与班主任时选择以哪个身份记录 -->
      <view class="form-item" v-if="!editId && dualRole">
        <text class="form-label">记录身份</text>
        <view class="type-tags">
          <view v-for="r in recorderRoles" :key="r.value" :class="['type-tag', form.recorderRole === r.value ? 'type-active' : '']" @click="setRecorderRole(r.value)">
            <text>{{ r.label }}</text>
          </view>
        </view>
      </view>
      <view class="form-item" v-if="editId">
        <text class="form-label">记录身份</text>
        <text class="readonly-value">{{ recorderRole === 'headteacher' ? '班主任' : '辅导员' }}</text>
        <text class="share-count" v-if="shareCount > 0">已共享 {{ shareCount }} 位班主任</text>
      </view>
      <!-- 谈话类型 -->
      <view class="form-item">
        <text class="form-label">谈话类型</text>
        <view class="type-tags">
          <view v-for="t in talkTypes" :key="t.value" :class="['type-tag', isTypeSelected(t.value) ? 'type-active' : '']" @click="toggleType(t.value)">
            <text>{{ t.label }}</text>
          </view>
        </view>
      </view>
      <!-- 谈话时间 -->
      <view class="form-item">
        <text class="form-label">谈话时间</text>
        <picker mode="date" :value="talkDate" :disabled="readOnly" @change="onDateChange">
          <view class="picker-value">{{ talkDate }}</view>
        </picker>
        <picker mode="time" :value="talkTime" :disabled="readOnly" @change="onTimeChange">
          <view class="picker-value">{{ talkTime }}</view>
        </picker>
      </view>
      <!-- 谈话地点 -->
      <view class="form-item">
        <text class="form-label">谈话地点</text>
        <input class="form-input" v-model="form.talkPlace" :disabled="readOnly" placeholder="请输入谈话地点" />
        <view class="loc-btn" v-if="!readOnly" @click="pickLocation"><text class="loc-icon">📍</text></view>
      </view>
      <!-- 截止时间（违纪谈话必须有，后端同一口径校验） -->
      <view class="form-item" v-if="hasViolationStudent || form.talkCategory === 'disciplinary'">
        <text class="form-label">截止时间</text>
        <picker mode="date" :value="deadlineDate" :disabled="readOnly" @change="onDeadlineDateChange">
          <view class="picker-value">{{ deadlineDate }}</view>
        </picker>
        <picker mode="time" :value="deadlineTime" :disabled="readOnly" @change="onDeadlineTimeChange">
          <view class="picker-value">{{ deadlineTime }}</view>
        </picker>
      </view>
    </view>

    <!-- 谈话对象 -->
    <view class="form-section" @tap="hideDropdowns">
      <view class="section-title">谈话对象</view>
      <!-- 标签输入框 -->
      <view class="tag-input-box">
        <view class="tag-list" v-if="form.studentList.length > 0">
          <view class="tag-item" v-for="(stu, idx) in form.studentList" :key="idx">
            <text class="tag-name">{{ stu.studentName }}</text>
            <text v-if="stu.violationType === 'late'" class="tag-vi vi-late">迟</text>
            <text v-else-if="stu.violationType === 'early_leave'" class="tag-vi vi-early">退</text>
            <text v-else-if="stu.violationType === 'truant'" class="tag-vi vi-truant">旷</text>
            <text class="tag-x" v-if="!readOnly" @tap.stop="removeStudent(idx)">×</text>
          </view>
        </view>
        <input class="tag-field" v-if="!readOnly" v-model="stuKeyword" placeholder="输入学号或姓名自动搜索" @input="onStuInput" @focus="onInputFocus" />
      </view>
      <!-- 操作按钮 -->
      <view class="action-row" v-if="!readOnly">
        <view class="action-btn btn-warn" @tap.stop="toggleViolationList">
          <text class="action-icon">⚠️</text>
          <text>{{ showViolationList ? '收起列表' : '谈话对象' }}</text>
        </view>
        <view class="selected-badge" v-if="form.studentList.length > 0">
          <text>已选 {{ form.studentList.length }} 人</text>
        </view>
      </view>
      <!-- 搜索结果 -->
      <view class="dropdown-list" v-if="searchResult.length > 0">
        <view class="dropdown-item" v-for="stu in searchResult" :key="stu.xh" @tap.stop="addStudent(stu)">
          <view class="item-main">
            <text class="item-name">{{ stu.studentName }}</text>
            <text class="item-sub">{{ stu.xh }}</text>
          </view>
          <text class="item-extra">{{ stu.bjjc || stu.bjname || '' }}</text>
          <text class="item-arrow">›</text>
        </view>
      </view>
      <!-- 谈话对象多选面板（checkbox多选） -->
      <view class="violation-panel" v-if="showViolationList && violationList.length > 0">
        <view class="vp-header">
          <text class="vp-title">谈话对象列表</text>
          <text class="vp-count">共 {{ violationList.length }} 人</text>
          <text class="vp-action" @tap.stop="addAllViolation">全选</text>
        </view>
        <view class="vp-body">
          <view class="vp-item" v-for="(stu, vIdx) in violationList" :key="vIdx" @tap.stop="toggleViolationCheck(stu)">
            <view :class="['vp-check', isViolationChecked(stu) ? 'vp-checked' : '']">
              <text v-if="isViolationChecked(stu)" class="vp-tick">✓</text>
            </view>
            <text :class="['vp-badge', 'vp-' + violationBadgeClass(stu && stu.absentType)]" v-if="stu && stu.absentType">
              {{ violationBadgeLabel(stu.absentType) }}
            </text>
            <view class="vp-info" v-if="stu">
              <view class="vp-name-row">
                <text class="vp-name">{{ stu.studentName || '' }}</text>
                <text class="vp-bjjc" v-if="stu.bjjc">{{ stu.bjjc }}</text>
                <text class="vp-stats" v-if="stu.violationCount != null">违纪{{ stu.violationCount }}次 已谈{{ stu.talkCount || 0 }}次</text>
              </view>
              <text class="vp-sub">{{ stu.xh || '' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 八必谈标注：标了重点关注/高危的学生必须有情形与跟进计划，否则台账不成立 -->
      <view class="annot-list" v-if="form.studentList.length > 0">
        <view class="annot-head">
          <text class="annot-title">八必谈标注</text>
          <text class="annot-hint">非「常规」的学生必须选情形并填跟进计划</text>
        </view>
        <view class="annot-row" v-for="(stu, ai) in form.studentList" :key="stu.xh">
          <view class="annot-main" @tap="toggleAnnot(stu)">
            <text class="annot-name">{{ stu.studentName || stu.xh }}</text>
            <text class="annot-tag tag-scene" v-if="stu.requiredScene">{{ sceneLabel(stu.requiredScene) }}</text>
            <text class="annot-tag tag-focus" v-if="stu.careLevel === '1'">重点关注</text>
            <text class="annot-tag tag-risk" v-if="stu.careLevel === '2'">高危</text>
            <text class="annot-none" v-if="!stu.requiredScene && stu.careLevel !== '1' && stu.careLevel !== '2'">未标注</text>
            <text class="annot-state" v-if="stu.reportStatus === '1'">已上报待学院处理</text>
            <text class="annot-state done" v-else-if="stu.reportStatus === '2'">学院已接手</text>
            <text class="annot-arrow" v-if="!readOnly">{{ openXh === stu.xh ? '▾' : '▸' }}</text>
          </view>
          <view class="annot-body" v-if="!readOnly && openXh === stu.xh">
            <view class="profile-line" v-if="stu._profile">
              <text class="pf-item">累计谈话 {{ stu._profile.count }} 次</text>
              <text class="pf-item" v-if="stu._profile.lastDate">最近 {{ stu._profile.lastDate }}</text>
              <text class="pf-item" v-if="stu._profile.lastScene">{{ stu._profile.lastScene }}</text>
            </view>
            <text class="field-label">必谈情形</text>
            <view class="chip-group">
              <view v-for="sc in scenes" :key="sc.value"
                    :class="['chip', stu.requiredScene === sc.value ? 'chip-active' : '']"
                    @tap="setScene(stu, sc.value)">
                <text>{{ sc.label }}</text>
              </view>
            </view>
            <text class="field-label">关注等级</text>
            <view class="chip-group">
              <view v-for="c in careLevels" :key="c.value"
                    :class="['chip', (stu.careLevel || '0') === c.value ? 'chip-active' : '', 'chip-care-' + c.value]"
                    @tap="setCare(stu, c.value)">
                <text>{{ c.label }}</text>
              </view>
            </view>
            <block v-if="isFocusStudent(stu)">
              <text class="field-label">后续跟进计划</text>
              <textarea class="plan-textarea" v-model="stu.followUpPlan" placeholder="例：本周约谈家长，两周后复访宿舍，心理中心转介已预约" />
            </block>
            <block v-if="isRiskStudent(stu)">
              <text class="field-label">下次跟进时间</text>
              <picker mode="date" :value="stu.nextFollowDate" @change="onFollowChange(stu, $event)">
                <view class="picker-value">{{ stu.nextFollowDate || '选择日期' }}</view>
              </picker>
              <text class="risk-hint">提交后即时上报学院总支书记，书记接手才算闭环</text>
            </block>
          </view>
        </view>
      </view>
    </view>

    <!-- 谈话内容 -->
    <view class="form-section">
      <view class="section-title">谈话内容</view>
      <!-- 历史记录 -->
      <view class="history-timeline" v-if="historyContent.length > 0">
        <view class="history-item" v-for="(c, idx) in historyContent" :key="idx">
          <view class="history-header">
            <text class="history-time">第{{ idx + 1 }}次 {{ formatDateTime(c.contentTime) }}</text>
          </view>
          <view class="history-body">{{ c.content }}</view>
        </view>
      </view>
      <textarea class="content-textarea" v-if="!readOnly" v-model="form.newContent" :placeholder="historyContent.length > 0 ? '请输入追加的谈话内容...' : '请输入谈话内容...'" />
      <view class="ended-tip" v-if="editId && !readOnly">
        <text class="ended-tip-text">内容记全后点底部「结束本次谈话」闭环；标了重点关注/高危的学生要先填跟进计划才能结束</text>
      </view>
      <view class="history-empty" v-if="readOnly && historyContent.length === 0">
        <text>暂无谈话内容</text>
      </view>
    </view>

    <!-- 佐证材料 -->
    <view class="form-section attach-section">
      <view class="section-title attach-title">
        <text>📎 佐证材料</text>
        <text class="attach-hint" v-if="!readOnly">（可选，最多5个）</text>
      </view>
      <view class="attach-row" v-if="!readOnly">
        <view class="attach-btn" @click="onTakePhoto"><text>📷 拍照</text></view>
        <view class="attach-btn" @click="chooseImage"><text>🖼 相册</text></view>
        <view class="attach-btn" @click="chooseDocument"><text>📄 文档</text></view>
        <view class="attach-btn" @click="chooseAudio"><text>🎙 录音</text></view>
      </view>
      <view class="attach-grid" v-if="attachList.length > 0">
        <view :class="['attach-item', item.mediaType === 'image' ? 'attach-image' : 'attach-file']" v-for="(item, idx) in attachList" :key="idx">
          <!-- 图片 -->
          <template v-if="item.mediaType === 'image'">
            <image :src="item.thumbUrl || item.url" mode="aspectFill" class="attach-img" @click="previewAttach(idx)"></image>
          </template>
          <!-- 文档/录音 -->
          <template v-else>
            <view class="attach-icon-box" @click="openFile(item)">
              <text class="attach-icon">{{ item.mediaType === 'audio' ? '🎙' : '📄' }}</text>
              <text class="attach-file-name">{{ item.fileName }}</text>
            </view>
          </template>
          <view class="attach-del" v-if="!readOnly" @click="removeAttach(idx)"><text>x</text></view>
        </view>
      </view>
      <view class="attach-tip" v-if="!readOnly">
        <text>附件总数不超过5个</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar" v-if="!readOnly || canShare">
      <view class="btn-row" v-if="!readOnly">
        <button class="submit-btn" @click="submitForm" :loading="submitting" :disabled="submitting || ending">
          {{ editId ? '确认修改' : '提交谈话' }}
        </button>
        <button class="end-btn" v-if="canEnd" @click="handleEnd" :loading="ending" :disabled="ending || submitting">结束谈话</button>
      </view>
      <button class="share-btn" v-if="canShare" @click="openShare">共享给班主任</button>
    </view>

    <!-- 共享给班主任 -->
    <uni-popup ref="sharePopup" type="bottom">
      <view class="share-panel">
        <view class="sp-header">
          <text class="sp-title">共享给班主任</text>
          <text class="sp-close" @click="closeShare">×</text>
        </view>
        <text class="sp-subject">谈话对象：{{ shareStudentNames }}</text>
        <scroll-view scroll-y class="sp-body">
          <view class="sp-item" v-for="c in shareCandidates" :key="c.toTeacherId" @click="toggleSharePick(c)">
            <view :class="['sp-check', isShareChecked(c.toTeacherId) ? 'sp-checked' : '']">
              <text v-if="isShareChecked(c.toTeacherId)" class="sp-tick">✓</text>
            </view>
            <view class="sp-info">
              <text class="sp-name">{{ c.toName }}</text>
              <text class="sp-classes">{{ c.classNames || '' }}</text>
            </view>
            <text class="sp-shared" v-if="isAlreadyShared(c.toTeacherId)">已共享</text>
          </view>
          <view class="sp-empty" v-if="shareCandidates.length === 0">
            <text>本次谈话对象所属班级暂无班主任</text>
          </view>
        </scroll-view>
        <view class="sp-current" v-if="shareList.length > 0">
          <text class="sp-current-title">当前共享名单</text>
          <view class="sp-current-item" v-for="s in shareList" :key="s.toTeacherId">
            <text class="sp-current-name">{{ s.toName }}</text>
            <text class="sp-revoke" @click="doRevoke(s)">撤销</text>
          </view>
        </view>
        <button class="sp-submit" @click="doShare" :disabled="sharing">
          {{ sharing ? '共享中...' : '确认共享' }}
        </button>
      </view>
    </uni-popup>
    <!-- 水印Canvas（离屏） -->
    <canvas canvas-id="watermarkCanvas" style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"></canvas>
  </view>
</template>

<script>
import { getTalk, getTalkByCheck, getMyStudents, getViolationStudents, getTalkAttachments, getDeadlineConfig, getShareCandidates, getTalkShares, shareTalk, revokeTalkShare, handleRiskReport, getStudentTalkProfile } from '@/api/work/talk'
import { getClassCheck } from '@/api/work/classcheck'
import { getStudyInspectionViolation } from '@/api/work/studyInspection'
import { enqueueRequest, flushOfflineQueue, makeClientRequestId } from '@/utils/offlineQueue'
import { chooseLocation, attachmentUrl } from '@/utils/common'
import { checkPermi } from '@/utils/permission'
import { getWatermarkConfig } from '@/api/work/watermark'
import { addWatermark, prepareCapture } from '@/utils/watermark'
import { isCounselor, isHeadteacher, isAdmin } from '@/utils/role'
import { getTalkDicts } from '@/utils/talkDict'

export default {
  data() {
    return {
      talkTypes: [],
      scenes: [],
      careLevels: [],
      editId: null,
      submitting: false,
      clientRequestId: '',
      ending: false,
      // 展开标注的学生学号：一次只摊开一人，避免长表单滚到找不到提交
      openXh: '',
      form: {
        talkCategory: 'daily',
        talkTypeList: [],
        talkPlace: '',
        isEnded: '0',
        newContent: '',
        studentList: [],
        recorderRole: 'counselor',
      },
      // 已存在记录的归属信息（可见不等于可改）
      writable: true,
      recorderRole: '',
      talkName: '',
      shareCount: 0,
      endedRecord: false,
      adminUser: false,
      // 学院处置高危上报
      handleRemark: '',
      handling: false,
      // 共享面板
      sharing: false,
      shareCandidates: [],
      shareList: [],
      checkedTeacherIds: [],
      loginRoles: [],
      talkDate: '',
      talkTime: '',
      deadlineDate: '',
      deadlineTime: '',
      historyContent: [],
      // 学生搜索
      stuKeyword: '',
      searchResult: [],
      violationList: [],
      showViolationList: false,
      // 附件
      attachList: [],
      watermarkConfig: null,
      watermarkConfigPromise: null,
      captureInfo: null,
      viewScope: '',
    }
  },
  onLoad(options) {
    this.viewScope = options && options.viewScope === 'headteacher' ? 'headteacher' : ''
    this.loadDicts()
    this.initDateTime()
    this.loginRoles = this.currentRoles()
    this.adminUser = isAdmin(this.loginRoles)
    this.form.recorderRole = this.defaultRecorderRole()
    this.loadDeadlineConfig()
    // 加载水印配置
    this.watermarkConfigPromise = getWatermarkConfig('talk').then(res => {
      this.watermarkConfig = res.data
      return this.watermarkConfig
    }).catch(() => {})
    if (options.id) {
      this.editId = options.id
      this.loadDetail(options.id)
    }
    // 学风检查待办的 businessId 是违纪记录ID，需要带入学生和违纪类型
    if (options.studyViolationId) {
      this.openTalkByStudyViolation(options.studyViolationId)
    } else if (options.todoId && options.businessId) {
      // businessId 是查课记录ID
      this.openTalkByCheck(options.businessId)
    }
  },
  computed: {
    hasViolationStudent() {
      return this.form.studentList.some(s => s.violationType != null)
    },
    // 只读：看得到但不是自己记录的谈话；已结束的谈话除管理员外也不能再改（与后端同一口径）
    readOnly() {
      if (!this.editId) return false
      if (this.writable === false) return true
      return this.endedRecord && !this.adminUser
    },
    readonlyText() {
      if (this.endedRecord && !this.adminUser) {
        return '本次谈话已结束，台账已闭环，仅可查看'
      }
      return '该谈话由「' + (this.talkName || '他人') + '」记录，仅可查看'
    },
    // 结束走 /api/talk/end 独立路由：服务端校验内容与跟进后就闭环待办，不再让「勾一下已结束」绕过门槛
    canEnd() {
      return !!this.editId && !this.readOnly && !this.endedRecord
    },
    riskStudents() {
      return this.form.studentList.filter(s => s.careLevel === '2')
    },
    pendingReportCount() {
      return this.riskStudents.filter(s => s.reportStatus !== '2').length
    },
    riskNames() {
      return this.riskStudents.map(s => s.studentName || s.xh).join('、')
    },
    canHandleReport() {
      // 新建还没落库时无从处置，等台账保存后从列表进详情再接手
      return !!this.editId && this.pendingReportCount > 0 && checkPermi(['stumanage:talk:report'])
    },
    rcTitle() {
      if (this.pendingReportCount > 0) {
        return this.canHandleReport
          ? this.pendingReportCount + ' 名高危学生待学院处置'
          : this.pendingReportCount + ' 名高危学生已上报，等待学院处置'
      }
      return '高危上报已由学院接手处置'
    },
    handledText() {
      const done = this.riskStudents.filter(s => s.reportStatus === '2')
      return done.slice(0, 2).map(s => {
        const time = s.handleTime ? this.formatDateTime(s.handleTime) : ''
        return (s.handleBy || '学院') + (time ? ' ' + time : '') + '：' + (s.handleRemark || '已接手处置')
      }).join('\n')
    },
    // 共享入口：只有辅导员自己记录的谈话可以共享给班主任
    canShare() {
      if (!this.editId || this.writable === false) return false
      return this.recorderRole !== 'headteacher'
    },
    dualRole() {
      if (this.viewScope === 'headteacher') return false
      return isCounselor(this.loginRoles) && isHeadteacher(this.loginRoles)
    },
    recorderRoles() {
      return [
        { value: 'counselor', label: '辅导员' },
        { value: 'headteacher', label: '班主任' },
      ]
    },
    shareStudentNames() {
      return this.form.studentList.map(s => s.studentName).filter(Boolean).join('、') || '-'
    }
  },
  methods: {
    currentRoles() {
      let roles = []
      try { roles = uni.getStorageSync('user_roles') || [] } catch (e) {}
      if (!Array.isArray(roles) || roles.length === 0) {
        const store = this.$store
        if (store && store.state && store.state.user && store.state.user.roles) {
          roles = store.state.user.roles
        }
      }
      return Array.isArray(roles) ? roles : []
    },
    // 兼双职时默认以辅导员身份记录，仅有班主任身份时以班主任记录
    defaultRecorderRole() {
      if (this.viewScope === 'headteacher') return 'headteacher'
      const roles = this.currentRoles()
      if (isCounselor(roles)) return 'counselor'
      if (isHeadteacher(roles)) return 'headteacher'
      return 'counselor'
    },
    setRecorderRole(val) {
      if (this.readOnly) return
      this.form.recorderRole = val
    },
    initDateTime() {
      const now = new Date()
      this.talkDate = this.formatDate(now)
      this.talkTime = this.formatTime(now)
      // 默认截止2天后，配置加载后会覆盖
      const dl = new Date(now.getTime() + 2 * 86400000)
      this.deadlineDate = this.formatDate(dl)
      this.deadlineTime = '23:59'
    },
    loadDeadlineConfig() {
      getDeadlineConfig().then(res => {
        const cfg = res.data || {}
        const days = parseInt(cfg.talkDisciplinary, 10)
        if (!isNaN(days) && days >= 0) {
          const now = new Date()
          const dl = new Date(now.getTime() + days * 86400000)
          this.deadlineDate = this.formatDate(dl)
        }
      }).catch(() => {})
    },
    formatDate(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    formatTime(d) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    formatDateTime(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    loadDetail(id) {
      getTalk(id, this.viewScope ? { viewScope: this.viewScope } : undefined).then(res => {
        const data = res.data
        
        if (!data) return
        this.writable = data.writable !== false
        this.recorderRole = data.recorderRole || 'counselor'
        this.talkName = data.talkName || ''
        this.shareCount = data.shareCount || 0
        this.form.recorderRole = this.recorderRole
        this.form.talkCategory = data.talkCategory || 'daily'
        this.form.talkTypeList = data.talkType ? data.talkType.split(',') : []
        this.form.talkPlace = data.talkPlace || ''
        this.form.isEnded = data.isEnded || '0'
        this.endedRecord = data.isEnded === '1' || data.talkStatus === 'completed'
        this.form.newContent = ''
        
        // 加载学生列表
        this.form.studentList = (data.studentList || []).map(s => ({
          xh: s.xh, studentName: s.studentName, bjdm: s.bjdm || '',
          violationType: s.violationType || null, checkDetailId: s.checkDetailId || null,
          checkId: s.checkId || null, studentRemark: s.studentRemark || '',
          requiredScene: s.requiredScene || '', careLevel: s.careLevel || '0',
          followUpPlan: s.followUpPlan || '', nextFollowDate: s.nextFollowDate || '',
          // 上报状态与学院处置留痕由服务端写入，只回显不提交
          reportStatus: s.reportStatus || '0',
          handleBy: s.handleBy || '', handleTime: s.handleTime || '', handleRemark: s.handleRemark || '',
        }))
        
        this.historyContent = data.contentList || []
        if (data.talkTime) {
          const dt = new Date(data.talkTime.replace(/ /g, 'T'))
          this.talkDate = this.formatDate(dt)
          this.talkTime = this.formatTime(dt)
        }
        if (data.deadline) {
          const dl = new Date(data.deadline.replace(/ /g, 'T'))
          this.deadlineDate = this.formatDate(dl)
          this.deadlineTime = this.formatTime(dl)
        }
        // 加载附件
        this.loadAttachments(id)
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    loadAttachments(talkId) {
      getTalkAttachments(talkId).then(res => {
        const list = res.data || []
        this.attachList = list.map(att => {
          const isImage = att.mediaType === 'image'
          const fullUrl = attachmentUrl(att.filePath)
          return {
            url: isImage ? fullUrl : '',
            thumbUrl: isImage ? fullUrl : '',
            fileName: att.fileName || '',
            mediaType: att.mediaType || 'image',
            attachment: {
              fileName: att.fileName || '', filePath: att.filePath || '',
              fileSize: att.fileSize || 0, fileType: att.fileType || '',
              mediaType: att.mediaType || 'image', exifData: att.exifData || '',
            }
          }
        })
      }).catch(() => {})
    },
    // 谈话类型
    isTypeSelected(val) {
      return this.form.talkTypeList.indexOf(val) >= 0
    },
    toggleType(val) {
      if (this.readOnly) return
      const idx = this.form.talkTypeList.indexOf(val)
      if (idx >= 0) {
        this.form.talkTypeList.splice(idx, 1)
      } else {
        this.form.talkTypeList.push(val)
      }
    },
    loadDicts() {
      getTalkDicts().then(d => {
        this.talkTypes = d.talk_type
        this.scenes = d.talk_required_scene
        this.careLevels = d.talk_care_level
      })
    },
    sceneLabel(val) {
      const hit = this.scenes.filter(s => s.value === val)[0]
      return hit ? hit.label : val
    },
    toggleAnnot(stu) {
      if (this.readOnly || !stu) return
      this.openXh = this.openXh === stu.xh ? '' : stu.xh
      if (this.openXh === stu.xh) this.loadStudentProfile(stu)
    },
    // 展开某个学生才拉他的一人一档，避免进页面就按人数并发一堆请求
    loadStudentProfile(stu) {
      if (!stu.xh || stu._profile) return
      getStudentTalkProfile(stu.xh, this.viewScope ? { viewScope: this.viewScope } : undefined).then(res => {
        const d = res.data || {}
        const last = (d.sessions || [])[0] || {}
        this.$set(stu, '_profile', {
          count: d.sessionCount || 0,
          lastDate: String(last.talkTime || '').substring(0, 10),
          lastScene: last.requiredSceneLabel || '',
        })
      }).catch(() => {})
    },
    setScene(stu, val) {
      if (!stu) return
      stu.requiredScene = stu.requiredScene === val ? '' : val
    },
    setCare(stu, val) {
      if (!stu) return
      stu.careLevel = val
      // 降回常规就把跟进字段清掉，否则台账上会留下「常规学生却有跟进计划」的脏形状
      if (val === '0') {
        stu.followUpPlan = ''
        stu.nextFollowDate = ''
      }
    },
    isFocusStudent(stu) {
      return !!stu && stu.careLevel && stu.careLevel !== '0'
    },
    isRiskStudent(stu) {
      return !!stu && stu.careLevel === '2'
    },
    onFollowChange(stu, e) {
      if (stu) stu.nextFollowDate = e.detail.value
    },
    pickLocation() {
      chooseLocation().then(res => {
        if (res.name) {
          this.form.talkPlace = res.name
        } else if (res.address) {
          this.form.talkPlace = res.address
        }
      }).catch(() => {})
    },
    // 日期时间
    onDateChange(e) { this.talkDate = e.detail.value },
    onTimeChange(e) { this.talkTime = e.detail.value },
    onDeadlineDateChange(e) { this.deadlineDate = e.detail.value },
    onDeadlineTimeChange(e) { this.deadlineTime = e.detail.value },
    // 学生搜索
    onStuInput() {
      clearTimeout(this._searchTimer)
      if (!this.stuKeyword || this.stuKeyword.length < 1) {
        this.searchResult = []
        return
      }
      this._searchTimer = setTimeout(() => {
        getMyStudents(this.stuKeyword).then(res => {
          this.searchResult = res.rows || res.data || []
          this.violationList = []
          this.showViolationList = false
        }).catch(() => {})
      }, 400)
    },
    searchStudents() {
      if (!this.stuKeyword) return
      getMyStudents(this.stuKeyword).then(res => {
        this.searchResult = res.rows || res.data || []
        this.violationList = []
        this.showViolationList = false
      }).catch(() => {})
    },
    toggleViolationList() {
      if (this.showViolationList) {
        this.showViolationList = false
        return
      }
      if (this.violationList.length > 0) {
        this.showViolationList = true
        this.searchResult = []
        return
      }
      getViolationStudents(null, null, this.viewScope ? { viewScope: this.viewScope } : undefined).then(res => {
        const rawList = (res.data || []).filter(s => s && s.xh)
        // 过滤掉：已谈话次数 >= 违纪次数 的学生
        this.violationList = rawList.filter(s => {
          const vCount = Number(s.violationCount) || 0
          const tCount = Number(s.talkCount) || 0
          return tCount < vCount
        })
        this.showViolationList = true
        this.searchResult = []
      }).catch(() => {})
    },
    hideDropdowns() {
      this.showViolationList = false
      this.searchResult = []
    },
    onInputFocus() {
      this.showViolationList = false
    },
    addStudent(stu) {
      if (this.form.studentList.some(s => s.xh === stu.xh)) {
        uni.showToast({ title: '该学生已添加', icon: 'none' })
        return
      }
      this.form.studentList.push({
        xh: stu.xh, studentName: stu.studentName, bjdm: stu.bjdm || '',
        violationType: null, checkDetailId: null, checkId: null, studentRemark: '',
        requiredScene: '', careLevel: '0', followUpPlan: '', nextFollowDate: '', reportStatus: '0',
      })
      this.openXh = stu.xh
      this.searchResult = []
      this.stuKeyword = ''
    },
    addViolationStudent(stu) {
      if (!stu || !stu.xh) {
        return
      }
      const detailId = stu.checkDetailId != null ? Number(stu.checkDetailId) : null
      const checkId = stu.checkId != null ? Number(stu.checkId) : null
      if (this.form.studentList.some(s => s.xh === stu.xh)) {
        uni.showToast({ title: '该学生已在列表中', icon: 'none' })
        return
      }
      this.form.studentList.push({
        xh: stu.xh, studentName: stu.studentName || '', bjdm: stu.bjdm || '',
        violationType: stu.absentType, checkDetailId: detailId,
        checkId: checkId, studentRemark: '',
        // 八必谈情形预置为「违纪处分」，关注等级仍由谈话人自己判断
        requiredScene: 'disciplinary', careLevel: '0',
        followUpPlan: '', nextFollowDate: '', reportStatus: '0',
      })
      // 添加违纪学生后自动设置为违纪谈话，并选中纪律教育标签
      this.form.talkCategory = 'disciplinary'
      if (!this.form.talkTypeList.includes('discipline')) {
        this.form.talkTypeList.push('discipline')
      }
    },
    violationBadgeLabel(type) {
      return {
        late: '迟到',
        early_leave: '早退',
        truant: '旷课',
        sleeping: '课堂睡觉',
        phone: '使用手机',
        smoking: '吸烟',
        dress: '仪容不规范',
        other: '其他违纪'
      }[type] || '违纪'
    },
    violationBadgeClass(type) {
      if (type === 'late') return 'late'
      if (type === 'early_leave') return 'early_leave'
      return 'truant'
    },
    // 从学风检查待办进入：带入违纪学生，保存谈话后由后端按学号自动闭环待办
    openTalkByStudyViolation(violationId) {
      getStudyInspectionViolation(violationId).then(res => {
        const violation = res.data
        if (!violation || !violation.xh) return
        if (violation.talkId) {
          this.editId = String(violation.talkId)
          this.loadDetail(violation.talkId)
          uni.showToast({ title: '已加载学风违纪谈话计划', icon: 'none' })
          return
        }
        this.addViolationStudent({
          xh: violation.xh,
          studentName: violation.studentName,
          bjdm: violation.bjdm,
          absentType: violation.violationType
        })
        uni.showToast({ title: '已加载学风违纪学生', icon: 'none' })
      }).catch(() => {})
    },
    // 从查课待办进入：优先复用查课自动生成的待谈话计划，避免重复新建
    openTalkByCheck(checkId) {
      getTalkByCheck(checkId, this.viewScope ? { viewScope: this.viewScope } : undefined).then(res => {
        const talk = res.data
        if (talk && talk.id) {
          this.editId = talk.id
          this.loadDetail(talk.id)
          uni.showToast({ title: '已加载该次查课的待谈话计划', icon: 'none' })
          return
        }
        this.loadViolationStudentsFromCheck(checkId)
      }).catch(() => {
        this.loadViolationStudentsFromCheck(checkId)
      })
    },
    // 从查课记录加载违纪学生（从待办进入时调用）
    loadViolationStudentsFromCheck(checkId) {
      getClassCheck(checkId).then(res => {
        const record = res.data
        
        if (!record || !record.detailList || record.detailList.length === 0) {
          return
        }
        
        // 过滤出违纪学生（迟到/早退/旷课）
        const violationStudents = record.detailList.filter(d => 
          d.absentType && ['late', 'early_leave', 'truant'].includes(d.absentType)
        )
        
        if (violationStudents.length === 0) {
          return
        }
        // 自动添加到谈话对象
        violationStudents.forEach(stu => {
          this.addViolationStudent({
            xh: stu.xh,
            studentName: stu.studentName,
            bjdm: stu.bjdm || '',
            absentType: stu.absentType,
            checkDetailId: stu.id,
            checkId: checkId,
          })
        })
        uni.showToast({ 
          title: '已加载 ' + violationStudents.length + ' 个谈话对象', 
          icon: 'none' 
        })
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    isViolationChecked(stu) {
      if (!stu || !stu.xh) return false
      return this.form.studentList.some(s => s.xh === stu.xh)
    },
    toggleViolationCheck(stu) {
      if (!stu || !stu.xh) return
      if (this.isViolationChecked(stu)) {
        const idx = this.form.studentList.findIndex(s => s.xh === stu.xh)
        if (idx >= 0) this.removeStudent(idx)
      } else {
        this.addViolationStudent(stu)
      }
    },
    addAllViolation() {
      let added = 0
      this.violationList.forEach(stu => {
        if (!this.isViolationChecked(stu)) {
          this.addViolationStudent(stu)
          added++
        }
      })
      if (added > 0) {
        uni.showToast({ title: '已添加 ' + added + ' 人', icon: 'none' })
      } else {
        uni.showToast({ title: '全部已在列表中', icon: 'none' })
      }
    },
    removeStudent(idx) {
      const removed = this.form.studentList[idx]
      this.form.studentList.splice(idx, 1)
      // 如果移除的是违纪学生且没有剩余违纪学生了，恢复为日常谈话
      if (removed && removed.violationType != null && !this.hasViolationStudent) {
        this.form.talkCategory = 'daily'
        // 可选：移除纪律教育标签（如果用户想保留也可以）
        const dIdx = this.form.talkTypeList.indexOf('discipline')
        if (dIdx >= 0) this.form.talkTypeList.splice(dIdx, 1)
      }
    },
    // 拍照/相册
    async onTakePhoto() {
      if (this.attachList.length >= 5) {
        uni.showToast({ title: '附件最多5个', icon: 'none' })
        return
      }
      const ready = await this.ensureWatermarkReady()
      if (!ready) return
      this.takePhoto()
    },
    // 拍照前确认水印时间与地址（未确认则阻断）
    async ensureWatermarkReady() {
      if (!this.watermarkConfig && this.watermarkConfigPromise) {
        await this.watermarkConfigPromise
      }
      const config = this.watermarkConfig
      if (!config || config.enabled !== '1') {
        return true
      }
      if (this.captureInfo) {
        return true
      }
      uni.showLoading({ title: '定位并确认水印...' })
      const result = await prepareCapture(config, this.form.talkPlace)
      uni.hideLoading()
      if (!result.ready) {
        uni.showToast({ title: result.message, icon: 'none', duration: 2500 })
        return false
      }
      this.captureInfo = result.captureInfo
      return true
    },
    takePhoto() {
      uni.chooseImage({
        count: 5 - this.attachList.length,
        sourceType: ['camera'],
        sizeType: ['compressed'],
        success: async (res) => {
          for (const p of res.tempFilePaths) {
            let path = p
            if (this.watermarkConfig && this.watermarkConfig.enabled === '1') {
              path = await addWatermark(path, this.watermarkConfig, this.captureInfo)
            }
            this.appendLocalAttachment(path, 'image')
          }
        }
      })
    },
    chooseImage() {
      if (this.attachList.length >= 5) {
        uni.showToast({ title: '附件最多5个', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: 5 - this.attachList.length,
        sourceType: ['album'],
        sizeType: ['compressed'],
        success: (res) => {
          res.tempFilePaths.forEach(p => this.appendLocalAttachment(p, 'image'))
        }
      })
    },
    chooseDocument() {
      if (this.attachList.length >= 5) {
        uni.showToast({ title: '附件最多5个', icon: 'none' })
        return
      }
      uni.chooseMessageFile && uni.chooseMessageFile({
        count: 5 - this.attachList.length,
        type: 'file',
        success: (res) => {
          res.tempFiles.forEach(f => this.appendLocalAttachment(f.path, 'document', f.name))
        },
        fail: () => {
          uni.showToast({ title: '当前环境不支持选择文档', icon: 'none' })
        }
      })
    },
    chooseAudio() {
      if (this.attachList.length >= 5) {
        uni.showToast({ title: '附件最多5个', icon: 'none' })
        return
      }
      uni.chooseMessageFile && uni.chooseMessageFile({
        count: 5 - this.attachList.length,
        type: 'all',
        extension: ['mp3', 'wav', 'amr', 'aac', 'm4a'],
        success: (res) => {
          res.tempFiles.forEach(f => this.appendLocalAttachment(f.path, 'audio', f.name))
        },
        fail: () => {
          uni.showToast({ title: '当前环境不支持选择录音', icon: 'none' })
        }
      })
    },
    appendLocalAttachment(filePath, mediaType, fileName) {
      const type = mediaType || 'image'
      const isImage = type === 'image'
      this.attachList.push({
        localPath: filePath,
        url: isImage ? filePath : '',
        thumbUrl: isImage ? filePath : '',
        fileName: fileName || '',
        mediaType: type,
        attachment: {
          fileName: fileName || '',
          filePath: '',
          fileSize: 0,
          fileType: '',
          mediaType: type,
          exifData: ''
        }
      })
    },
    removeAttach(idx) {
      this.attachList.splice(idx, 1)
    },
    previewAttach(idx) {
      const urls = this.attachList.filter(a => a.mediaType === 'image').map(p => p.thumbUrl || p.url)
      uni.previewImage({ current: idx, urls: urls })
    },
    openFile(item) {
      if (!item.attachment || !item.attachment.filePath) return
      const url = attachmentUrl(item.attachment.filePath)
      uni.showLoading({ title: '打开中...' })
      uni.downloadFile({
        url: url,
        success: (res) => {
          uni.hideLoading()
          const filePath = res.tempFilePath
          uni.openDocument({
            filePath: filePath,
            showMenu: true,
            success: () => {},
            fail: () => {
              uni.showToast({ title: '无法打开文件', icon: 'none' })
            }
          })
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '下载文件失败', icon: 'none' })
        }
      })
    },
    // 共享给班主任
    openShare() {
      if (!this.canShare) return
      this.loadShare()
      this.$refs.sharePopup && this.$refs.sharePopup.open()
    },
    closeShare() {
      this.$refs.sharePopup && this.$refs.sharePopup.close()
    },
    loadShare() {
      const query = this.viewScope ? { viewScope: this.viewScope } : undefined
      Promise.all([getShareCandidates(this.editId, query), getTalkShares(this.editId, query)]).then(([cRes, sRes]) => {
        this.shareCandidates = cRes.data || []
        this.shareList = sRes.data || []
        this.shareCount = this.shareList.length
        this.checkedTeacherIds = this.shareList.map(s => s.toTeacherId)
      }).catch(() => {})
    },
    isShareChecked(teacherId) {
      return this.checkedTeacherIds.indexOf(teacherId) >= 0
    },
    isAlreadyShared(teacherId) {
      return this.shareList.some(s => s.toTeacherId === teacherId)
    },
    toggleSharePick(c) {
      if (!c || !c.toTeacherId) return
      if (this.isAlreadyShared(c.toTeacherId)) return
      const idx = this.checkedTeacherIds.indexOf(c.toTeacherId)
      if (idx >= 0) {
        this.checkedTeacherIds.splice(idx, 1)
      } else {
        this.checkedTeacherIds.push(c.toTeacherId)
      }
    },
    doShare() {
      const toAdd = this.checkedTeacherIds.filter(id => !this.isAlreadyShared(id))
      if (toAdd.length === 0) {
        uni.showToast({ title: '请选择要共享的班主任', icon: 'none' })
        return
      }
      this.sharing = true
      shareTalk(this.editId, toAdd).then(res => {
        uni.showToast({ title: '已共享', icon: 'success' })
        this.loadShare()
      }).catch(err => {
        uni.showToast({ title: '共享失败: ' + ((err && (err.msg || err.message)) || '未知错误'), icon: 'none', duration: 3000 })
      }).finally(() => { this.sharing = false })
    },
    doRevoke(item) {
      if (!item) return
      uni.showModal({
        title: '撤销共享',
        content: '撤销后「' + (item.toName || '') + '」将不能再看到这条谈话',
        success: (r) => {
          if (!r.confirm) return
          revokeTalkShare(this.editId, item.toTeacherId).then(() => {
            uni.showToast({ title: '已撤销', icon: 'success' })
            this.loadShare()
          }).catch(() => {
            uni.showToast({ title: '撤销失败', icon: 'none' })
          })
        }
      })
    },
    // 校验口径与后端 validateForSave 一致，前端先拦一遍，提示直接点名学生
    validateForm() {
      const tip = title => {
        uni.showToast({ title, icon: 'none', duration: 2500 })
        return false
      }
      if (!this.form.talkPlace) return tip('请填写谈话地点')
      if (this.form.talkTypeList.length === 0) return tip('请至少选择一项谈话类型')
      if (this.form.talkCategory === 'disciplinary' && !this.deadlineDate) return tip('违纪谈心谈话必须设置完成截止时间')
      if (this.form.studentList.length === 0) return tip('请至少选择一名谈心谈话对象')
      for (const s of this.form.studentList) {
        if (!s.xh) return tip('谈话对象缺少学号，请重新选择学生')
        const who = s.studentName || s.xh
        if (!this.isFocusStudent(s)) continue
        if (!s.requiredScene) {
          this.openXh = s.xh
          return tip('「' + who + '」请指明属于哪一类必谈情形')
        }
        if (!s.followUpPlan) {
          this.openXh = s.xh
          return tip('「' + who + '」是' + (this.isRiskStudent(s) ? '高危' : '重点关注') + '学生，请填写后续跟进计划')
        }
        if (this.isRiskStudent(s) && !s.nextFollowDate) {
          this.openXh = s.xh
          return tip('「' + who + '」是高危学生，请填写下次跟进时间')
        }
      }
      return true
    },
    buildRecordPayload() {
      const talkTimeStr = this.talkDate + ' ' + this.talkTime + ':00'
      const deadlineStr = this.form.talkCategory === 'disciplinary' ? (this.deadlineDate + ' ' + this.deadlineTime + ':00') : null
      return {
        id: this.editId || undefined,
        clientRequestId: this.clientRequestId || undefined,
        viewScope: this.viewScope || undefined,
        recorderRole: this.editId ? undefined : this.form.recorderRole,
        talkCategory: this.form.talkCategory,
        talkType: this.form.talkTypeList.join(','),
        talkTime: talkTimeStr,
        talkPlace: this.form.talkPlace,
        deadline: deadlineStr,
        isEnded: this.form.isEnded,
        // 状态由服务端 applyStatusForSave 推导，客户端不再谎报 pending
        studentList: this.form.studentList.map(s => ({
          xh: s.xh, studentName: s.studentName, bjdm: s.bjdm || '',
          violationType: s.violationType || null, checkDetailId: s.checkDetailId || null,
          checkId: s.checkId || null, studentRemark: s.studentRemark || '',
          requiredScene: s.requiredScene || '', careLevel: s.careLevel || '0',
          followUpPlan: s.followUpPlan || '', nextFollowDate: s.nextFollowDate || null,
          // reportStatus/处置留痕由服务端写入，提交不带，避免覆盖书记的闭环记录
        })),
        contentList: this.form.newContent ? [{
          content: this.form.newContent,
          contentTime: talkTimeStr,
        }] : [],
        attachmentList: this.attachList.map((p, i) => ({
          businessType: 'talk',
          fileName: (p.attachment && p.attachment.fileName) || '',
          filePath: (p.attachment && p.attachment.filePath) || '',
          fileSize: (p.attachment && p.attachment.fileSize) || 0,
          fileType: (p.attachment && p.attachment.fileType) || '',
          mediaType: (p.attachment && p.attachment.mediaType) || 'image',
          exifData: (p.attachment && p.attachment.exifData) || '',
          sortOrder: i + 1,
        })),
      }
    },
    buildAttachmentUploads() {
      return this.attachList.map((item, index) => item.localPath ? {
        localPath: item.localPath,
        uploadUrl: '/stumanage/talk/upload',
        field: 'file',
        formData: { mediaType: item.mediaType || 'image' },
        responseFields: { filePath: ['url'] },
        dataPathPrefix: 'attachmentList[' + index + ']'
      } : null).filter(Boolean)
    },
    emitRefresh() {
      // 通知首页和谈话列表刷新
      uni.$emit('refreshHomeData')
      uni.$emit('refreshTalkList')
    },
    // 提交
    submitForm() {
      if (!this.validateForm()) return
      this.submitting = true
      if (!this.editId && !this.clientRequestId) {
        this.clientRequestId = makeClientRequestId('TALK')
      }
      const payload = this.buildRecordPayload()
      enqueueRequest({
        businessType: this.editId ? 'talk_update' : 'talk_add',
        title: '谈心谈话：' + this.form.talkPlace,
        clientRequestId: this.clientRequestId,
        request: {
          url: '/api/talk',
          method: this.editId ? 'put' : 'post',
          data: payload
        },
        uploads: this.buildAttachmentUploads()
      }).then(result => {
        flushOfflineQueue()
        uni.showToast({
          title: result.duplicate ? '该记录已在后台处理' : '已提交，附件后台上传',
          icon: 'none'
        })
        this.emitRefresh()
        setTimeout(() => { uni.navigateBack() }, 800)
      }).catch(() => {
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
      }).finally(() => {
        this.submitting = false
      })
    },
    // 结束本次谈话：先落库再走 /end 路由，服务端会把谈话待办一并闭环
    handleEnd() {
      if (!this.validateForm()) return
      const talkId = this.editId
      if (!talkId && !this.clientRequestId) {
        this.clientRequestId = makeClientRequestId('TALK')
      }
      const payload = this.buildRecordPayload()
      this.ending = true
      const endQuery = this.viewScope ? { viewScope: this.viewScope } : undefined
      enqueueRequest({
        businessType: 'talk_update_and_end',
        title: '结束谈话：' + this.form.talkPlace,
        clientRequestId: this.clientRequestId,
        request: {
          url: '/api/talk',
          method: 'put',
          data: payload
        },
        uploads: this.buildAttachmentUploads(),
        followUps: [{
          request: {
            url: '/api/talk/end/' + talkId,
            method: 'put',
            params: endQuery
          }
        }]
      }).then(result => {
        flushOfflineQueue()
        uni.showToast({
          title: result.duplicate ? '结束操作已在后台处理' : '已提交，后台完成结束闭环',
          icon: 'none'
        })
        this.endedRecord = true
        this.form.isEnded = '1'
        this.emitRefresh()
        setTimeout(() => { uni.navigateBack() }, 1000)
      }).catch(() => {
        uni.showToast({ title: '结束失败，请重试', icon: 'none' })
      }).finally(() => {
        this.ending = false
      })
    },
    // 学院书记接手处置高危上报：只写处置留痕，不动谈话内容
    submitReportHandle() {
      if (!this.handleRemark) {
        uni.showToast({ title: '请填写处置说明', icon: 'none' })
        return
      }
      this.handling = true
      handleRiskReport(this.editId, this.handleRemark).then(() => {
        uni.showToast({ title: '已记录处置情况', icon: 'success' })
        this.handleRemark = ''
        this.refreshReportState()
        this.emitRefresh()
      }).catch(() => {
        // 失败原因由请求层提示
      }).finally(() => {
        this.handling = false
      })
    },
    // 只回读明细的上报/处置状态，不整页重载，免得冲掉未保存的编辑
    refreshReportState() {
      getTalk(this.editId, this.viewScope ? { viewScope: this.viewScope } : undefined).then(res => {
        const rows = (res.data && res.data.studentList) || []
        this.form.studentList.forEach(s => {
          const hit = rows.filter(x => x.xh === s.xh)[0]
          if (!hit) return
          s.reportStatus = hit.reportStatus || '0'
          s.handleBy = hit.handleBy || ''
          s.handleTime = hit.handleTime || ''
          s.handleRemark = hit.handleRemark || ''
        })
      }).catch(() => {})
    },
  }
}
</script>

<style lang="scss" scoped>
.page-wrap {
  min-height: 100vh;
  background: #f5f6f7;
  padding-bottom: 140rpx;
}

.form-section {
  background: #fff;
  margin-top: 16rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item {
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.form-label {
  font-size: 26rpx;
  color: #666;
  width: 140rpx;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 26rpx;
  padding: 12rpx 16rpx;
  background: #f5f6f7;
  border-radius: 8rpx;
}

.loc-btn {
  margin-left: 12rpx;
  padding: 10rpx 16rpx;
  background: #e8f5e9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loc-icon {
  font-size: 28rpx;
}

.picker-value {
  font-size: 26rpx;
  padding: 12rpx 20rpx;
  background: #f5f6f7;
  border-radius: 8rpx;
  margin-right: 12rpx;
  color: #333;
}

/* 类别选择 */
.category-row {
  display: flex;
  gap: 16rpx;
}

.cat-btn {
  padding: 12rpx 32rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
}

.cat-daily { background: #e0f7fa; color: #00838f; }
.cat-daily-active { background: #00bcd4; color: #fff; }
.cat-disc { background: #ffebee; color: #c62828; }
.cat-disc-active { background: #e43d33; color: #fff; }

/* 谈话类型标签 */
.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  flex: 1;
}

.type-tag {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  background: #f0f0f0;
  color: #666;
}

.type-active {
  background: #2979ff;
  color: #fff;
}

.type-locked {
  border: 1rpx dashed #fff;
  opacity: 0.9;
}

/* 谈话对象 - 标签输入框 */
.tag-input-box {
  min-height: 72rpx;
  background: #f5f6f7;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
  margin-bottom: 16rpx;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 12rpx 6rpx 14rpx;
  background: #2979ff;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #fff;
  line-height: 1.4;
}

.tag-name {
  max-width: 160rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-vi {
  font-size: 18rpx;
  padding: 0rpx 6rpx;
  border-radius: 4rpx;
  line-height: 1.5;
}
.tag-vi.vi-late { background: #f3a044; color: #fff; }
.tag-vi.vi-early { background: #ff9800; color: #fff; }
.tag-vi.vi-truant { background: #e43d33; color: #fff; }

.tag-x {
  margin-left: 4rpx;
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  padding: 0 4rpx;
}

.tag-field {
  font-size: 26rpx;
  min-height: 40rpx;
  width: 100%;
}

/* 操作按钮行 */
.action-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  background: #f0f7ff;
  border: 1rpx solid #c8e0ff;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #2979ff;
}

.action-icon {
  font-size: 22rpx;
}

.btn-warn {
  background: #fff8f0;
  border-color: #fde2c8;
  color: #e43d33;
}

.selected-badge {
  margin-left: auto;
  padding: 4rpx 14rpx;
  background: #e8f5e9;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #4caf50;
}

/* 下拉列表 */
.dropdown-list {
  max-height: 600rpx;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.list-danger {
  background: #fffbfb;
  border-color: #fde2e2;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.dropdown-item:last-child { border-bottom: none; }

.dropdown-item:active { background: #f8f8f8; }

.item-main {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-right: 12rpx;
}

.item-sub {
  font-size: 22rpx;
  color: #999;
  margin-left: 8rpx;
}

.item-extra {
  font-size: 22rpx;
  color: #bbb;
  flex-shrink: 0;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-arrow {
  font-size: 32rpx;
  color: #ccc;
  margin-left: 8rpx;
  flex-shrink: 0;
}

.item-badge {
  display: inline-block;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.item-badge.vi-late { background: #fff8e1; color: #f3a044; }
.item-badge.vi-early_leave { background: #fff3e0; color: #ff9800; }
.item-badge.vi-truant { background: #ffebee; color: #e43d33; }

/* 违纪学生多选面板 */
.violation-panel {
  background: #fffbfb;
  border: 1rpx solid #fde2e2;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.vp-header {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #fff5f5;
  border-bottom: 1rpx solid #fde2e2;
}

.vp-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #e43d33;
}

.vp-count {
  font-size: 22rpx;
  color: #e43d33;
  opacity: 0.7;
  margin-left: 12rpx;
}

.vp-action {
  margin-left: auto;
  font-size: 24rpx;
  color: #2979ff;
  padding: 4rpx 16rpx;
}

.vp-body {
  max-height: 500rpx;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.vp-item {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.vp-item:last-child { border-bottom: none; }

.vp-check {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #ccc;
  border-radius: 8rpx;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vp-checked {
  background: #2979ff;
  border-color: #2979ff;
}

.vp-tick {
  color: #fff;
  font-size: 20rpx;
}

.vp-badge {
  display: inline-block;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.vp-badge.vp-late { background: #fff8e1; color: #f3a044; }
.vp-badge.vp-early_leave { background: #fff3e0; color: #ff9800; }
.vp-badge.vp-truant { background: #ffebee; color: #e43d33; }

.vp-info {
  flex: 1;
  min-width: 0;
}

.vp-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-right: 8rpx;
}

.vp-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.vp-bjjc {
  font-size: 22rpx;
  color: #666;
  background: #f0f0f0;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.vp-stats {
  font-size: 20rpx;
  color: #e43d33;
  background: #ffebee;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  margin-left: auto;
}

.vp-sub {
  font-size: 22rpx;
  color: #999;
}

/* 八必谈标注 */
.annot-list {
  margin-top: 8rpx;
  border: 1rpx solid #eef0f3;
  border-radius: 12rpx;
  overflow: hidden;
}

.annot-head {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 14rpx 20rpx;
  background: #f7f8fa;
}

.annot-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
}

.annot-hint {
  flex: 1;
  font-size: 20rpx;
  color: #999;
}

.annot-row {
  border-top: 1rpx solid #f0f0f0;
}

.annot-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 16rpx 20rpx;
}

.annot-main:active {
  background: #f8f8f8;
}

.annot-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.annot-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.tag-scene { color: #00838f; background: #e0f7fa; }
.tag-focus { color: #e07e1c; background: #fef3e2; }
.tag-risk { color: #e43d33; background: #ffebee; }

.annot-none {
  font-size: 20rpx;
  color: #bbb;
}

.annot-state {
  font-size: 20rpx;
  color: #f3a044;
}

.annot-state.done {
  color: #18bc37;
}

.annot-arrow {
  margin-left: auto;
  font-size: 24rpx;
  color: #ccc;
}

.annot-body {
  padding: 4rpx 20rpx 20rpx;
  background: #fbfcfd;
}

/* 一生一档：展开标注时回读该生的历史谈话概览 */
.profile-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  padding-top: 16rpx;
}

.pf-item {
  font-size: 22rpx;
  color: #8a94a6;
  background: #eef1f6;
  border-radius: 6rpx;
  padding: 4rpx 12rpx;
}

.field-label {
  display: block;
  font-size: 22rpx;
  color: #666;
  margin: 14rpx 0 8rpx;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.chip {
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  background: #f0f0f0;
  border: 1rpx solid transparent;
  font-size: 22rpx;
  color: #666;
}

.chip-active {
  background: #2979ff;
  border-color: #2979ff;
  color: #fff;
}

.chip-care-1.chip-active {
  background: #f3a044;
  border-color: #f3a044;
}

.chip-care-2.chip-active {
  background: #e43d33;
  border-color: #e43d33;
}

.plan-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 14rpx;
  background: #fff;
  border: 1rpx solid #e8e8e8;
  border-radius: 8rpx;
  font-size: 24rpx;
  box-sizing: border-box;
}

.risk-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #e43d33;
}

/* 历史记录 */
.history-timeline {
  border-left: 4rpx solid #2979ff;
  padding-left: 24rpx;
  margin-left: 12rpx;
  margin-bottom: 20rpx;
}

.history-item {
  margin-bottom: 16rpx;
  position: relative;
}

.history-item::before {
  content: '';
  position: absolute;
  left: -30rpx;
  top: 8rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #2979ff;
}

.history-header {
  margin-bottom: 6rpx;
}

.history-time {
  font-size: 24rpx;
  color: #2979ff;
  font-weight: bold;
}

.history-body {
  background: #f5f7fa;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}

/* 谈话内容 */
.content-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 16rpx;
  background: #f5f6f7;
  border-radius: 8rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.ended-tip {
  margin-top: 16rpx;
}

.ended-tip-text {
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
}

/* 佐证材料 */
.attach-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.attach-btn {
  padding: 14rpx 20rpx;
  background: #f0f7ff;
  border: 1rpx solid #c8e0ff;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #2979ff;
}

.attach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.attach-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
}

.attach-image {
  width: 200rpx;
  height: 200rpx;
}

.attach-file {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  background: #f5f6f7;
  border: 1rpx solid #e0e0e0;
  overflow: hidden;
}

.attach-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
}

.attach-icon-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200rpx;
  height: 200rpx;
  padding: 16rpx;
  box-sizing: border-box;
}

.attach-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.attach-file-name {
  font-size: 22rpx;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.attach-del {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  background: #e43d33;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  z-index: 2;
}

.attach-tip {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #999;
}

/* 附件区域特殊样式 */
.attach-section {
  background: #f8f9ff;
  border: 2rpx solid #e8ecff;
}

.attach-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.attach-hint {
  font-size: 24rpx;
  color: #999;
  font-weight: normal;
}

/* 底部 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
  z-index: 10;
}

.btn-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.submit-btn {
  flex: 1;
  min-width: 0;
  background: #2979ff;
  color: #fff;
  font-size: 30rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
}

.end-btn {
  flex: 0 0 34%;
  background: #18bc37;
  color: #fff;
  font-size: 28rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
}

/* ===== 高危上报闭环 ===== */
.report-card {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: #fff;
  border-left: 6rpx solid #f56c6c;
  border-radius: 12rpx;
}

.rc-head {
  display: flex;
  flex-direction: column;
}

.rc-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #f56c6c;
}

.rc-names {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  word-break: break-all;
}

.rc-textarea {
  width: 100%;
  min-height: 140rpx;
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f5f6f7;
  border-radius: 8rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.rc-btn {
  margin-top: 16rpx;
  background: #f56c6c;
  color: #fff;
  font-size: 28rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
}

.rc-handled {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f0f9eb;
  border-radius: 8rpx;
}

.rc-handled-text {
  font-size: 24rpx;
  color: #529365;
  line-height: 1.6;
  white-space: pre-line;
}

/* ===== 只读与归属 ===== */
.readonly-banner {
  margin: 20rpx 24rpx 0;
  padding: 20rpx 24rpx;
  background: #fef3e2;
  border-radius: 12rpx;
}

.readonly-text {
  font-size: 26rpx;
  color: #e07e1c;
}

.readonly-value {
  font-size: 28rpx;
  color: #333;
  margin-right: 16rpx;
}

.share-count {
  font-size: 24rpx;
  color: #2979ff;
}

.history-empty {
  padding: 24rpx 0;
  text-align: center;
}

.history-empty text {
  font-size: 26rpx;
  color: #999;
}

.share-btn {
  width: 100%;
  margin-top: 12rpx;
  background: #fff;
  color: #2979ff;
  border: 1rpx solid #2979ff;
  font-size: 30rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
}

/* ===== 共享面板 ===== */
.share-panel {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.sp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sp-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.sp-close {
  font-size: 40rpx;
  color: #999;
  line-height: 1;
  padding: 0 12rpx;
}

.sp-subject {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.sp-body {
  max-height: 480rpx;
  margin-top: 16rpx;
}

.sp-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.sp-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sp-checked {
  background: #2979ff;
  border-color: #2979ff;
}

.sp-tick {
  color: #fff;
  font-size: 24rpx;
}

.sp-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sp-name {
  font-size: 28rpx;
  color: #333;
}

.sp-classes {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.sp-shared {
  font-size: 22rpx;
  color: #18bc37;
}

.sp-empty {
  padding: 40rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.sp-current {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #eee;
}

.sp-current-title {
  font-size: 24rpx;
  color: #666;
}

.sp-current-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.sp-current-name {
  font-size: 26rpx;
  color: #333;
}

.sp-revoke {
  font-size: 24rpx;
  color: #e43d33;
}

.sp-submit {
  margin-top: 24rpx;
  width: 100%;
  background: #2979ff;
  color: #fff;
  font-size: 30rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
}
</style>
