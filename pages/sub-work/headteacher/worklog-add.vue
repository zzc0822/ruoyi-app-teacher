<template>
  <view class="page-container">
    <view class="form-card">
      <!-- 班级选择 -->
      <view class="form-item">
        <text class="form-label">班级</text>
        <picker mode="selector" :range="classOptions" range-key="className" @change="onClassChange" :value="classIndex">
          <view class="picker-value" :class="{ placeholder: !selectedClass }">
            {{ selectedClass ? selectedClass.className : '请选择班级' }}
          </view>
        </picker>
      </view>

      <!-- 手册章节 -->
      <view class="form-item">
        <text class="form-label">手册章节</text>
        <view class="type-grid">
          <view
            class="type-item"
            v-for="(t, i) in chapterTypes"
            :key="t.value"
            :class="{ active: form.workType === t.value }"
            @click="setWorkType(t.value)"
          >{{ t.label }}</view>
        </view>
        <text class="type-tip">{{ chapterTip }}</text>
      </view>

      <view class="form-item" v-for="f in formFields" :key="f.prop">
        <text class="form-label" :class="{ optional: !f.required }">{{ f.label }}</text>

        <picker v-if="f.kind === 'date'" mode="date" :value="form[f.prop]" @change="onDate(f.prop, $event)">
          <view class="picker-value" :class="{ placeholder: !form[f.prop] }">{{ form[f.prop] || '请选择日期' }}</view>
        </picker>

        <picker v-else-if="f.kind === 'time'" mode="time" :value="form[f.prop]" @change="onTime(f.prop, $event)">
          <view class="picker-value" :class="{ placeholder: !form[f.prop] }">{{ form[f.prop] || '请选择时间' }}</view>
        </picker>

        <picker
          v-else-if="f.kind === 'select'"
          mode="selector"
          :range="f.options"
          range-key="label"
          :value="optionIndex(f)"
          @change="onSelect(f, $event)"
        >
          <view class="picker-value" :class="{ placeholder: !form[f.prop] }">{{ optionLabel(f) }}</view>
        </picker>

        <picker
          v-else-if="f.kind === 'student'"
          mode="selector"
          :range="studentOptions"
          range-key="label"
          :value="studentIndex"
          @change="onStudentSelect"
        >
          <view class="picker-value" :class="{ placeholder: !form.studentNames }">
            {{ form.studentNames ? form.studentNames + '（' + form.studentIds + '）' : (studentLoading ? '学生名单加载中…' : '请选择学生') }}
          </view>
        </picker>

        <view v-else-if="f.kind === 'radio'" class="radio-row">
          <view
            class="radio-item"
            v-for="(opt, oi) in f.options"
            :key="oi"
            :class="{ active: form[f.prop] === opt.value }"
            @click="onRadio(f.prop, opt.value)"
          >{{ opt.label }}</view>
        </view>

        <view v-else-if="f.kind === 'textarea'">
          <textarea
            class="form-textarea"
            :value="form[f.prop]"
            :placeholder="f.placeholder"
            :maxlength="2000"
            @input="onInput(f.prop, $event)"
          />
          <text class="type-tip" v-if="contentRich && htmlLike(form[f.prop])">本章正文在后台是富文本，小程序按纯文本编辑，保存会覆盖排版</text>
        </view>

        <view v-else-if="f.kind === 'static'" class="static-value">
          <text>{{ form[f.prop] || 0 }}</text>
          <text class="static-from">（本班在校生，系统给出）</text>
        </view>

        <input
          v-else
          class="form-input"
          :type="f.kind === 'number' ? 'number' : 'text'"
          :value="form[f.prop]"
          :placeholder="f.placeholder || (f.kind === 'number' ? '0' : '请输入' + f.label)"
          @input="onInput(f.prop, $event)"
        />
      </view>
    </view>

    <view class="form-card attach-card">
      <text class="form-label" :class="{ optional: !evidenceRequired }">佐证材料</text>
      <text class="type-tip">{{ evidenceTip }}</text>
      <view class="attach-grid">
        <view class="attach-item" v-for="(item, idx) in evidenceList" :key="item.filePath || idx">
          <image class="attach-img" :src="item.thumbUrl || fullUrl(item.filePath)" mode="aspectFill" @click="previewEvidence(idx)" />
          <view class="attach-del" @click="removeEvidence(idx)"><text>×</text></view>
        </view>
        <view class="attach-add" v-if="evidenceList.length < evidenceLimit" @click="chooseEvidence">
          <text class="add-icon">＋</text>
          <text class="add-text">拍照/相册</text>
        </view>
      </view>
    </view>

    <view class="btn-group">
      <button class="btn-cancel" @click="goBack">取消</button>
      <button class="btn-submit" @click="submit" :loading="submitting">提交</button>
    </view>
  </view>
</template>

<script>
import { getMyClasses, getClassDetail, getWorklog, getWorklogContext } from '@/api/affair/headteacher'
import config from '@/config'
import { enqueueRequest, flushOfflineQueue } from '@/utils/offlineQueue'

const PUNISH_OPTIONS = [
  { value: '1', label: '警告' },
  { value: '2', label: '严重警告' },
  { value: '3', label: '记过' },
  { value: '4', label: '留校察看' },
  { value: '5', label: '开除学籍' }
]
const YES_NO = [
  { value: '1', label: '是' },
  { value: '0', label: '否' }
]
const SCOPE_OPTIONS = [
  { value: '0', label: '个人' },
  { value: '1', label: '集体' }
]

/** 章节字段：与《班主任工作手册》表头一致，必填口径同后端 validateByType */
const CHAPTER_FIELDS = {
  plan: [
    { prop: 'workDate', label: '制定日期', kind: 'date', required: true },
    { prop: 'workContent', label: '工作计划', kind: 'textarea', required: true, placeholder: '必填，结合班级情况：学风建设、班级建设、困难学生帮扶、活动安排等' }
  ],
  meeting: [
    { prop: 'workDate', label: '召开时间', kind: 'date', required: true },
    { prop: 'title', label: '班会主题', kind: 'text', required: true },
    { prop: 'workLocation', label: '班会地点', kind: 'text', required: true },
    { prop: 'participantCount', label: '参加人数', kind: 'number', required: true },
    { prop: 'workContent', label: '班会记录', kind: 'textarea', required: true, placeholder: '议程、发言要点、结论' }
  ],
  dorm: [
    { prop: 'workDate', label: '走访日期', kind: 'date', required: true },
    { prop: 'roomNo', label: '走访宿舍号', kind: 'text', required: true },
    { prop: 'student', label: '走访学生', kind: 'student' },
    { prop: 'workContent', label: '走访记录', kind: 'textarea', required: true, placeholder: '宿舍卫生、成员状态、发现的问题' }
  ],
  activity: [
    { prop: 'workDate', label: '活动时间', kind: 'date', required: true },
    { prop: 'title', label: '活动主题', kind: 'text', required: true },
    { prop: 'workLocation', label: '活动地点', kind: 'text' },
    { prop: 'participantCount', label: '参与人数', kind: 'number' },
    { prop: 'attended', label: '本人是否参加', kind: 'radio', options: YES_NO },
    { prop: 'workContent', label: '活动概况', kind: 'textarea' }
  ],
  award: [
    { prop: 'workDate', label: '获奖时间', kind: 'date', required: true },
    { prop: 'awardScope', label: '获奖对象', kind: 'radio', options: SCOPE_OPTIONS },
    { prop: 'student', label: '获奖学生', kind: 'student' },
    { prop: 'title', label: '奖项名称', kind: 'text', required: true },
    { prop: 'awardOrg', label: '颁奖机构', kind: 'text', required: true },
    { prop: 'workContent', label: '备注说明', kind: 'textarea' }
  ],
  summary: [
    { prop: 'workDate', label: '总结日期', kind: 'date', required: true },
    { prop: 'workContent', label: '总结正文', kind: 'textarea', required: true, placeholder: '班级学风建设情况、学生获奖、学生竞赛等' }
  ],
  discipline: [
    { prop: 'student', label: '违纪学生', kind: 'student', required: true },
    { prop: 'workDate', label: '违纪日期', kind: 'date', required: true },
    { prop: 'punishLevel', label: '处分等级', kind: 'select', options: PUNISH_OPTIONS, required: true },
    { prop: 'punishBeginDate', label: '处分起始时间', kind: 'date', required: true },
    { prop: 'punishEndDate', label: '处分终止时间', kind: 'date' },
    { prop: 'punishReleaseDate', label: '解除处分时间', kind: 'date' },
    { prop: 'workContent', label: '违纪事实', kind: 'textarea', required: true }
  ],
  other: [
    { prop: 'workDate', label: '工作日期', kind: 'date', required: true },
    { prop: 'title', label: '事项', kind: 'text' },
    { prop: 'workLocation', label: '地点', kind: 'text' },
    { prop: 'workContent', label: '工作内容', kind: 'textarea', required: true }
  ]
}

/** 章节为「需考勤」时插入的考勤块：应到由系统给出，实到必填 */
const ATTENDANCE_FIELDS = [
  { prop: 'expectedCount', label: '应到人数', kind: 'static' },
  { prop: 'participantCount', label: '实到人数', kind: 'number', required: true },
  { prop: 'leaveCount', label: '请假人数', kind: 'number' },
  { prop: 'leaveStudentNames', label: '请假名单', kind: 'text', placeholder: '多人用、分隔' }
]

/** 内置兜底目录：仅在学校/学院配置取不到时使用，名称与频次一律以配置为准 */
const CHAPTERS = [
  { value: 'plan', label: '工作计划', tip: '每学期一份，必填' },
  { value: 'meeting', label: '班会', tip: '每月至少召开1次班会' },
  { value: 'dorm', label: '宿舍走访', tip: '每月至少走访1次宿舍' },
  { value: 'activity', label: '班级活动', tip: '每学期至少开展2次班级活动' },
  { value: 'award', label: '获奖情况', tip: '集体或个人获奖，有事即记' },
  { value: 'summary', label: '学期总结', tip: '每学期一份；第一学期写学期总结，第二学期写学年总结' },
  { value: 'discipline', label: '学生违纪', tip: '违纪事实与处分期限，有事即记' },
  { value: 'other', label: '其他', tip: '手册未列的其他班级工作' }
]

export default {
  data() {
    return {
      editId: null,
      submitting: false,
      classList: [],
      classIndex: 0,
      studentList: [],
      studentIndex: -1,
      studentLoading: false,
      chapters: [],
      evidenceList: [],
      evidenceLoaded: false,
      evidenceLimit: 9,
      form: {
        bjid: null,
        className: '',
        bjdm: '',
        xydm: '',
        workType: 'meeting',
        workDate: this.getToday(),
        title: '',
        roomNo: '',
        startTime: '',
        endTime: '',
        attended: '1',
        awardScope: '0',
        awardOrg: '',
        punishLevel: '',
        punishBeginDate: '',
        punishEndDate: '',
        punishReleaseDate: '',
        workLocation: '',
        participantCount: '',
        expectedCount: '',
        leaveCount: '',
        leaveStudentNames: '',
        studentIds: '',
        studentNames: '',
        workContent: ''
      }
    }
  },
  computed: {
    classOptions() {
      return this.classList
    },
    selectedClass() {
      return this.classList[this.classIndex] || null
    },
    /** 章节目录来自班主任工作配置（学院覆盖学校），取不到才退回内置口径 */
    chapterTypes() {
      const list = this.chapters.length
        ? this.chapters.map(item => ({
          value: item.type,
          label: item.typeName || item.type,
          tip: item.frequency || ''
        }))
        : CHAPTERS
      // 第四章谈话台账统一在「谈心谈话」登记，这里不再提供入口
      return list.filter(item => item.value !== 'talk')
    },
    chapterMeta() {
      return this.chapterTypes.find(item => item.value === this.form.workType) || this.chapterTypes[0] || { label: '', tip: '' }
    },
    currentChapter() {
      return this.chapters.find(item => item.type === this.form.workType) || null
    },
    chapterTip() {
      const no = this.currentChapter && this.currentChapter.chapterNo
      return (no ? '手册第 ' + no + ' 章 · ' : '') + (this.chapterMeta.tip || this.chapterMeta.label)
    },
    needAttendance() {
      return !!this.currentChapter && this.currentChapter.needAttendance === '1'
    },
    contentRich() {
      return !!this.currentChapter && this.currentChapter.contentRich === '1'
    },
    evidenceRequired() {
      return !!this.currentChapter && this.currentChapter.attachmentRequired === '1'
    },
    evidenceTip() {
      if (this.evidenceRequired) {
        return '本章按学院配置要求必传佐证，至少 1 张'
      }
      return '可选，拍照或从相册选择，最多 ' + this.evidenceLimit + ' 张'
    },
    formFields() {
      const fields = (CHAPTER_FIELDS[this.form.workType] || []).map(item => Object.assign({}, item))
      return this.needAttendance ? this.withAttendance(fields) : fields
    },
    studentOptions() {
      return this.studentList.map(item => ({
        value: item.xh,
        label: item.studentName + ' ' + item.xh
      }))
    }
  },
  onLoad(options) {
    if (options.id) {
      this.editId = options.id
      uni.setNavigationBarTitle({ title: '修改工作记录' })
    }
    if (options.type) {
      this.form.workType = options.type
    }
    this.loadClasses()
    if (this.editId) {
      this.loadDetail(this.editId)
    }
  },
  methods: {
    getToday() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    toNumber(value) {
      if (value === null || value === undefined || String(value).trim() === '') return null
      const num = parseInt(value, 10)
      return isNaN(num) ? null : num
    },
    loadClasses() {
      getMyClasses().then(res => {
        this.classList = (res.data || []).filter(item => item.assignStatus === '0')
        if (this.editId) return
        if (this.classList.length > 0) {
          this.applyClass(0)
        } else {
          uni.showModal({
            title: '尚未带班',
            content: '工作记录需先由学院指派班主任，可在「班主任申请」中提交申请',
            showCancel: false
          })
        }
      }).catch(() => {})
    },
    applyClass(index) {
      this.classIndex = index
      const cls = this.classList[index]
      if (!cls) return
      this.form.bjid = cls.bjid
      this.form.className = cls.className
      this.form.bjdm = cls.bjdm
      this.form.xydm = cls.xydm
      this.loadStudents(cls.bjid)
      this.loadContext(cls.bjid)
    },
    /** 本班生效的手册章节与应到人数：小程序不再自带硬编码目录 */
    loadContext(bjid) {
      if (!bjid) return
      getWorklogContext(bjid).then(res => {
        const data = res.data || {}
        this.chapters = data.chapters || []
        if (data.expectedCount && (!this.editId || !this.form.expectedCount)) {
          this.$set(this.form, 'expectedCount', data.expectedCount)
        }
        if (!this.chapters.length) return
        if (!this.chapters.some(item => item.type === this.form.workType)) {
          if (this.editId && this.form.workType) {
            // 编辑历史记录时该章可能已被学院停用，仍要能显示、能改
            const fallback = CHAPTERS.find(item => item.value === this.form.workType) || { label: this.form.workType, tip: '' }
            this.chapters = this.chapters.concat([{
              type: this.form.workType,
              typeName: fallback.label,
              frequency: fallback.tip,
              attachmentRequired: '0',
              needAttendance: '0',
              contentRich: '0'
            }])
            return
          }
          this.form.workType = this.chapters[0].type
        }
      }).catch(() => {})
    },
    loadStudents(bjid) {
      if (!bjid) return
      this.studentLoading = true
      this.studentList = []
      this.studentIndex = -1
      getClassDetail(bjid).then(res => {
        this.studentList = (res.data && res.data.students) || []
      }).catch(() => {}).finally(() => {
        this.studentLoading = false
      })
    },
    loadDetail(id) {
      getWorklog(id).then(res => {
        if (!res.data) return
        this.form = { ...this.form, ...res.data }
        this.evidenceList = (res.data.attachmentList || []).map(att => ({
          filePath: att.filePath,
          fileName: att.fileName || '',
          fileType: att.fileType || '',
          mediaType: att.mediaType || 'image',
          exifData: att.exifData || '',
          thumbUrl: ''
        }))
        this.$set(this.form, 'attachmentList', null)
        this.evidenceLoaded = true
        const idx = this.classList.findIndex(c => c.bjid === this.form.bjid)
        if (idx >= 0) {
          this.applyClass(idx)
          this.restoreStudent()
        }
      }).catch(() => {})
    },
    restoreStudent() {
      const xh = (this.form.studentIds || '').split(',')[0]
      if (!xh) return
      const idx = this.studentOptions.findIndex(item => item.value === xh)
      if (idx >= 0) this.studentIndex = idx
    },
    onClassChange(e) {
      this.applyClass(Number(e.detail.value))
    },
    setWorkType(type) {
      this.form.workType = type
    },
    onInput(prop, e) {
      this.$set(this.form, prop, e.detail.value)
    },
    onDate(prop, e) {
      this.$set(this.form, prop, e.detail.value)
    },
    onTime(prop, e) {
      this.$set(this.form, prop, e.detail.value)
    },
    onRadio(prop, value) {
      this.$set(this.form, prop, value)
    },
    optionIndex(f) {
      const idx = f.options.findIndex(item => item.value === this.form[f.prop])
      return idx < 0 ? 0 : idx
    },
    optionLabel(f) {
      const hit = f.options.find(item => item.value === this.form[f.prop])
      return hit ? hit.label : '请选择' + f.label
    },
    onSelect(f, e) {
      const hit = f.options[Number(e.detail.value)]
      if (hit) this.$set(this.form, f.prop, hit.value)
    },
    onStudentSelect(e) {
      this.studentIndex = Number(e.detail.value)
      const stu = this.studentOptions[this.studentIndex]
      if (stu) {
        this.$set(this.form, 'studentIds', stu.value)
        this.$set(this.form, 'studentNames', this.studentList[this.studentIndex].studentName)
      }
    },
    /** 需考勤的章节在正文前插入应到/实到/请假块，替换掉布局里原有的参加人数 */
    withAttendance(fields) {
      const block = ATTENDANCE_FIELDS.map(item => Object.assign({}, item))
      let at = fields.findIndex(f => f.prop === 'participantCount')
      if (at < 0) {
        at = fields.findIndex(f => f.prop === 'workContent')
      }
      const rest = fields.filter(f => f.prop !== 'participantCount')
      const pos = at < 0 ? rest.length : at
      return rest.slice(0, pos).concat(block, rest.slice(pos))
    },
    fullUrl(path) {
      if (!path) return ''
      return path.indexOf('http') === 0 ? path : config.baseUrl + path
    },
    htmlLike(value) {
      return !!value && /<[a-z][\s\S]*>/i.test(String(value))
    },
    extOf(path) {
      const clean = (path || '').split('?')[0]
      const dot = clean.lastIndexOf('.')
      return dot > -1 ? clean.substring(dot + 1).toLowerCase() : ''
    },
    chooseEvidence() {
      const remain = this.evidenceLimit - this.evidenceList.length
      if (remain <= 0) {
        uni.showToast({ title: '佐证材料最多 ' + this.evidenceLimit + ' 张', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: res => {
          (res.tempFilePaths || []).forEach(path => this.uploadEvidence(path))
        }
      })
    },
    uploadEvidence(tempPath) {
      // 本地占位，提交时由离线队列后台上传并回填附件字段
      this.evidenceList.push({
        localPath: tempPath,
        filePath: '',
        fileName: '',
        fileType: this.extOf(tempPath),
        mediaType: 'image',
        thumbUrl: tempPath
      })
    },
    removeEvidence(idx) {
      this.evidenceList.splice(idx, 1)
    },
    previewEvidence(idx) {
      uni.previewImage({
        current: idx,
        urls: this.evidenceList.map(item => item.thumbUrl || this.fullUrl(item.filePath))
      })
    },
    buildAttachments() {
      return this.evidenceList.map((item, idx) => ({
        fileName: item.fileName || '',
        filePath: item.filePath,
        fileType: item.fileType || this.extOf(item.filePath),
        mediaType: item.mediaType || 'image',
        exifData: item.exifData || '',
        sortOrder: idx + 1
      }))
    },
    validate() {
      if (!this.form.bjid) {
        uni.showToast({ title: '请选择班级', icon: 'none' })
        return false
      }
      if (!this.form.workDate) {
        uni.showToast({ title: '请选择日期', icon: 'none' })
        return false
      }
      const missing = this.formFields.find(field => {
        if (!field.required) return false
        if (field.kind === 'student') return !this.form.studentIds && !this.form.studentNames
        const value = this.form[field.prop]
        return value === null || value === undefined || String(value).trim() === ''
      })
      if (missing) {
        uni.showToast({ title: '请填写' + missing.label, icon: 'none' })
        return false
      }
      if (this.evidenceRequired && this.evidenceList.length === 0) {
        uni.showToast({ title: '本章需上传佐证材料', icon: 'none', duration: 2500 })
        return false
      }
      return true
    },
    submit() {
      if (!this.validate()) return
      this.submitting = true
      const data = { ...this.form }
      data.participantCount = this.toNumber(data.participantCount)
      data.leaveCount = this.toNumber(data.leaveCount)
      data.expectedCount = this.toNumber(data.expectedCount)
      if (data.participantCount === null) delete data.participantCount
      if (data.leaveCount === null) delete data.leaveCount
      if (data.expectedCount === null) delete data.expectedCount
      if (!this.editId || this.evidenceLoaded) {
        data.attachmentList = this.buildAttachments()
      } else {
        delete data.attachmentList
      }
      const uploads = this.evidenceList
        .map((item, index) => item.localPath ? {
          localPath: item.localPath,
          uploadUrl: '/common/upload',
          field: 'file',
          dataPathPrefix: 'attachmentList[' + index + ']'
        } : null)
        .filter(Boolean)
      enqueueRequest({
        businessType: this.editId ? 'headteacher_worklog_update' : 'headteacher_worklog_add',
        title: '班主任工作记录：' + (this.form.title || this.chapterMeta.label || ''),
        request: {
          url: '/api/headteacher/worklog',
          method: this.editId ? 'put' : 'post',
          params: { viewScope: 'headteacher' },
          data
        },
        uploads
      }).then(result => {
        flushOfflineQueue()
        uni.showToast({
          title: result.duplicate ? '该记录已在后台处理' : '已提交，照片后台上传',
          icon: 'none'
        })
        setTimeout(() => {
          uni.navigateBack()
        }, 900)
      }).catch(() => {
        uni.showToast({ title: '提交失败，请重试', icon: 'none', duration: 2500 })
      }).finally(() => {
        this.submitting = false
      })
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 20rpx;
  padding-bottom: 140rpx;
}

.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 12rpx;
  display: block;

  &::before {
    content: '* ';
    color: #e43d33;
  }

  &.optional::before {
    content: '';
  }
}

.picker-value {
  font-size: 26rpx;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;

  &.placeholder {
    color: #999;
  }
}

.form-input {
  font-size: 26rpx;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}

.form-textarea {
  font-size: 26rpx;
  color: #333;
  width: 100%;
  min-height: 200rpx;
  padding: 16rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.type-grid {
  display: flex;
  flex-wrap: wrap;
}

.static-value {
  font-size: 26rpx;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}

.static-from {
  font-size: 22rpx;
  color: #999;
  margin-left: 8rpx;
}

.attach-card {
  margin-top: 20rpx;
}

.attach-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
}

.attach-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin: 0 12rpx 12rpx 0;
}

.attach-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
}

.attach-del {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 32rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 26rpx;
}

.attach-add {
  width: 160rpx;
  height: 160rpx;
  border: 1rpx dashed #c8c9cc;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.add-icon {
  font-size: 40rpx;
  color: #999;
  line-height: 44rpx;
}

.add-text {
  font-size: 20rpx;
  color: #999;
}

.type-item {
  width: 33.33%;
  box-sizing: border-box;
  text-align: center;
  padding: 14rpx 0;
  margin-bottom: 12rpx;
  background: #f5f6f8;
  border-radius: 8rpx;
  font-size: 25rpx;
  color: #666;

  &.active {
    background: #2979ff;
    color: #fff;
  }
}

.type-tip {
  display: block;
  font-size: 22rpx;
  color: #999;
  line-height: 32rpx;
}

.radio-row {
  display: flex;
}

.radio-item {
  padding: 12rpx 32rpx;
  margin-right: 16rpx;
  background: #f5f6f8;
  border-radius: 8rpx;
  font-size: 25rpx;
  color: #666;

  &.active {
    background: #2979ff;
    color: #fff;
  }
}

.btn-group {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.btn-cancel {
  flex: 1;
  font-size: 28rpx;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8rpx;
}

.btn-submit {
  flex: 2;
  font-size: 28rpx;
  background: #2979ff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
}
</style>
