<template>
  <view class="page-wrap">
    <!-- 基本信息 -->
    <view class="form-section">
      <view class="section-title">基本信息</view>
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
        <picker mode="date" :value="talkDate" @change="onDateChange">
          <view class="picker-value">{{ talkDate }}</view>
        </picker>
        <picker mode="time" :value="talkTime" @change="onTimeChange">
          <view class="picker-value">{{ talkTime }}</view>
        </picker>
      </view>
      <!-- 谈话地点 -->
      <view class="form-item">
        <text class="form-label">谈话地点</text>
        <input class="form-input" v-model="form.talkPlace" placeholder="请输入谈话地点" />
        <view class="loc-btn" @click="pickLocation"><text class="loc-icon">📍</text></view>
      </view>
      <!-- 截止时间（有谈话对象时显示） -->
      <view class="form-item" v-if="hasViolationStudent">
        <text class="form-label">截止时间</text>
        <picker mode="date" :value="deadlineDate" @change="onDeadlineDateChange">
          <view class="picker-value">{{ deadlineDate }}</view>
        </picker>
        <picker mode="time" :value="deadlineTime" @change="onDeadlineTimeChange">
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
          <view class="tag-item" v-for="(stu, idx) in form.studentList" :key="stu.xh + '-' + idx">
            <text class="tag-name">{{ stu.studentName }}</text>
            <text v-if="stu.violationType === 'late'" class="tag-vi vi-late">迟</text>
            <text v-else-if="stu.violationType === 'early_leave'" class="tag-vi vi-early">退</text>
            <text v-else-if="stu.violationType === 'truant'" class="tag-vi vi-truant">旷</text>
            <text class="tag-x" @tap.stop="removeStudent(idx)">×</text>
          </view>
        </view>
        <input class="tag-field" v-model="stuKeyword" placeholder="输入学号或姓名自动搜索" @input="onStuInput" @focus="onInputFocus" />
      </view>
      <!-- 操作按钮 -->
      <view class="action-row">
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
            <text :class="['vp-badge', 'vp-' + (stu && stu.absentType)]" v-if="stu && stu.absentType">
              {{ stu.absentType === 'late' ? '迟到' : stu.absentType === 'early_leave' ? '早退' : '旷课' }}
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
    </view>

    <!-- 谈话内容 -->
    <view class="form-section">
      <view class="section-title">谈话内容</view>
      <!-- 历史记录 -->
      <view class="history-timeline" v-if="historyContent.length > 0">
        <view class="history-item" v-for="(c, idx) in historyContent" :key="c.id || idx">
          <view class="history-header">
            <text class="history-time">第{{ idx + 1 }}次 {{ formatDateTime(c.contentTime) }}</text>
          </view>
          <view class="history-body">{{ c.content }}</view>
        </view>
      </view>
      <textarea class="content-textarea" v-model="form.newContent" :placeholder="historyContent.length > 0 ? '请输入追加的谈话内容...' : '请输入谈话内容...'" />
      <view class="ended-check">
        <view :class="['check-box', form.isEnded === '1' ? 'checked' : '']" @click="toggleEnded">
          <text v-if="form.isEnded === '1'" style="color:#fff;font-size:20rpx;">✓</text>
        </view>
        <text style="font-size:26rpx;color:#666;margin-left:12rpx;">该谈话已结束</text>
      </view>
    </view>

    <!-- 佐证材料 -->
    <view class="form-section attach-section">
      <view class="section-title attach-title">
        <text>📎 佐证材料</text>
        <text class="attach-hint">（可选，最多5个）</text>
      </view>
      <view class="attach-row">
        <view class="attach-btn" @click="takePhoto"><text>📷 拍照</text></view>
        <view class="attach-btn" @click="chooseImage"><text>🖼 相册</text></view>
        <view class="attach-btn" @click="chooseDocument"><text>📄 文档</text></view>
        <view class="attach-btn" @click="chooseAudio"><text>🎙 录音</text></view>
      </view>
      <view class="attach-grid" v-if="attachList.length > 0">
        <view :class="['attach-item', item.mediaType === 'image' ? 'attach-image' : 'attach-file']" v-for="(item, idx) in attachList" :key="item.filePath || item.url || idx">
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
          <view class="attach-del" @click="removeAttach(idx)"><text>x</text></view>
        </view>
      </view>
      <view class="attach-tip">
        <text>附件总数不超过5个</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <button class="submit-btn" @click="submitForm" :loading="submitting" :disabled="submitting">
        {{ editId ? '确认修改' : '提交谈话' }}
      </button>
    </view>
  </view>
</template>

<script>
import { addTalk, updateTalk, getTalk, getMyStudents, getViolationStudents, getTalkAttachments, getDeadlineConfig } from '@/api/stumanage/talk'
import { getClassCheck } from '@/api/stumanage/classcheck'
import upload from '@/utils/upload'
import config from '@/config'
import { chooseLocation } from '@/utils/common'

const TALK_TYPES = [
  { value: 'ideological', label: '思想动态' },
  { value: 'psychological', label: '心理健康' },
  { value: 'academic', label: '学业指导' },
  { value: 'career', label: '就业指导' },
  { value: 'life', label: '生活关怀' },
  { value: 'discipline', label: '纪律教育' },
  { value: 'other', label: '其他' },
]

export default {
  data() {
    return {
      talkTypes: TALK_TYPES,
      editId: null,
      submitting: false,
      form: {
        talkCategory: 'daily',
        talkTypeList: [],
        talkPlace: '',
        isEnded: '0',
        newContent: '',
        studentList: [],
      },
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
    }
  },
  onLoad(options) {
    this.initDateTime()
    this.loadDeadlineConfig()
    if (options.id) {
      this.editId = options.id
      this.loadDetail(options.id)
    }
    // 处理从待办进入的情况：todoId + businessId
    if (options.todoId && options.businessId) {
      // businessId 是查课记录ID，需要加载该记录的违纪学生
      this.loadViolationStudentsFromCheck(options.businessId)
    }
  },
  computed: {
    hasViolationStudent() {
      return this.form.studentList.some(s => s.violationType != null)
    }
  },
  methods: {
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
      getTalk(id).then(res => {
        const data = res.data
        
        if (!data) return
        this.form.talkCategory = data.talkCategory || 'daily'
        this.form.talkTypeList = data.talkType ? data.talkType.split(',') : []
        this.form.talkPlace = data.talkPlace || ''
        this.form.isEnded = data.isEnded || '0'
        this.form.newContent = ''
        
        // 加载学生列表
        this.form.studentList = (data.studentList || []).map(s => ({
          xh: s.xh, studentName: s.studentName, bjdm: s.bjdm || '',
          violationType: s.violationType || null, checkDetailId: s.checkDetailId || null,
          checkId: s.checkId || null, studentRemark: s.studentRemark || '',
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
          return {
            url: isImage ? (att.thumbnailBase64 || '') : '',
            thumbUrl: isImage ? (att.thumbnailBase64 || '') : '',
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
      const idx = this.form.talkTypeList.indexOf(val)
      if (idx >= 0) {
        this.form.talkTypeList.splice(idx, 1)
      } else {
        this.form.talkTypeList.push(val)
      }
    },
    toggleEnded() {
      this.form.isEnded = this.form.isEnded === '1' ? '0' : '1'
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
      getViolationStudents().then(res => {
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
      })
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
      })
      // 添加违纪学生后自动设置为违纪谈话，并选中纪律教育标签
      this.form.talkCategory = 'disciplinary'
      if (!this.form.talkTypeList.includes('discipline')) {
        this.form.talkTypeList.push('discipline')
      }
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
    takePhoto() {
      if (this.attachList.length >= 5) {
        uni.showToast({ title: '附件最多5个', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: 5 - this.attachList.length,
        sourceType: ['camera'],
        sizeType: ['compressed'],
        success: (res) => {
          res.tempFilePaths.forEach(p => this.uploadFile(p, 'image'))
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
          res.tempFilePaths.forEach(p => this.uploadFile(p, 'image'))
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
          res.tempFiles.forEach(f => this.uploadFile(f.path, 'document', f.name))
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
          res.tempFiles.forEach(f => this.uploadFile(f.path, 'audio', f.name))
        },
        fail: () => {
          uni.showToast({ title: '当前环境不支持选择录音', icon: 'none' })
        }
      })
    },
    uploadFile(filePath, mediaType, fileName) {
      uni.showLoading({ title: '上传中...' })
      upload({
        url: '/stumanage/talk/upload',
        filePath: filePath,
        name: 'file',
        formData: { mediaType: mediaType || 'image' }
      }).then(res => {
        uni.hideLoading()
        const data = res.data || res
        if (data) {
          const isImage = (mediaType || 'image') === 'image'
          this.attachList.push({
            url: isImage ? filePath : '',
            thumbUrl: isImage ? filePath : '',
            fileName: fileName || data.fileName || '',
            mediaType: mediaType || 'image',
            attachment: {
              fileName: fileName || data.fileName || '', filePath: data.url || '',
              fileSize: data.fileSize || 0, fileType: data.fileType || '',
              mediaType: mediaType || 'image', exifData: data.exifData || '',
            }
          })
        }
      }).catch(() => {
        uni.hideLoading()
        uni.showToast({ title: '上传失败', icon: 'none' })
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
      const url = config.baseUrl + item.attachment.filePath
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
    // 提交
    submitForm() {
      if (this.form.studentList.length === 0) {
        uni.showToast({ title: '请至少添加一个谈话对象', icon: 'none' })
        return
      }
      if (this.form.talkTypeList.length === 0) {
        uni.showToast({ title: '请选择谈话类型', icon: 'none' })
        return
      }
      this.submitting = true
      const talkTimeStr = this.talkDate + ' ' + this.talkTime + ':00'
      const deadlineStr = this.form.talkCategory === 'disciplinary' ? (this.deadlineDate + ' ' + this.deadlineTime + ':00') : null
      
      // 构建提交数据
      const data = {
        id: this.editId || undefined,
        talkCategory: this.form.talkCategory,
        talkType: this.form.talkTypeList.join(','),
        talkTime: talkTimeStr,
        talkPlace: this.form.talkPlace,
        deadline: deadlineStr,
        isEnded: this.form.isEnded,
        // 设置谈话状态：新增时默认为pending（待谈话）
        talkStatus: this.editId ? undefined : 'pending',
        studentList: this.form.studentList.map(s => ({
          xh: s.xh, studentName: s.studentName, bjdm: s.bjdm || '',
          violationType: s.violationType || null, checkDetailId: s.checkDetailId || null,
          checkId: s.checkId || null, studentRemark: s.studentRemark || '',
        })),
        contentList: this.form.newContent ? [{
          content: this.form.newContent,
          contentTime: talkTimeStr,
        }] : [],
        attachmentList: this.attachList.map((p, i) => ({
          businessType: 'talk',
          fileName: p.attachment?.fileName || '',
          filePath: p.attachment?.filePath || '',
          fileSize: p.attachment?.fileSize || 0,
          fileType: p.attachment?.fileType || '',
          mediaType: p.attachment?.mediaType || 'image',
          exifData: p.attachment?.exifData || '',
          sortOrder: i + 1,
        })),
      }
      
      let request
      if (this.editId) {
        request = updateTalk(data)
      } else {
        request = addTalk(data)
      }
      request.then(res => {
        uni.showToast({ title: this.editId ? '修改成功' : '提交成功', icon: 'success' })
        
        // 通知首页和谈话列表刷新
        uni.$emit('refreshHomeData')
        uni.$emit('refreshTalkList')
        
        setTimeout(() => { uni.navigateBack() }, 800)
      }).catch(err => {
        uni.showToast({ title: '提交失败: ' + (err.msg || err.message || '未知错误'), icon: 'none', duration: 3000 })
      }).finally(() => {
        this.submitting = false
      })
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

.ended-check {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}

.check-box {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #ccc;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checked {
  background: #2979ff;
  border-color: #2979ff;
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

.submit-btn {
  width: 100%;
  background: #2979ff;
  color: #fff;
  font-size: 30rpx;
  border-radius: 12rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
}
</style>
