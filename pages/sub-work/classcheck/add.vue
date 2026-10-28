<template>
  <view class="page-wrap">
    <!-- 紧凑表头 -->
    <view class="header-card">
      <view class="header-row">
        <!-- 书记角色：专业年级筛选 -->
        <template v-if="isSecretaryRole">
          <text class="h-label">专业</text>
          <picker :range="majorNames" @change="onMajorChange">
            <view class="h-picker flex1">
              <text :class="filterForm.zydm ? '' : 'ph'">{{ selectedMajorName || '全部' }}</text>
            </view>
          </picker>
          <text class="h-label ml">年级</text>
          <picker :range="gradeOptions" @change="onGradeChange">
            <view class="h-picker flex1">
              <text :class="filterForm.nj ? '' : 'ph'">{{ filterForm.nj || '全部' }}</text>
            </view>
          </picker>
        </template>
        <text class="h-label">班级</text>
        <picker :range="filteredClassNames" @change="onClassChange">
          <view class="h-picker flex2">
            <text :class="form.bjdm ? '' : 'ph'">{{ selectedClassName || '选择班级' }}</text>
          </view>
        </picker>
      </view>
      <view class="header-row">
        <text class="h-label">日期</text>
        <picker mode="date" :value="form.checkDate" @change="onDateChange">
          <view class="h-picker"><text>{{ form.checkDate }}</text></view>
        </picker>
        <text class="h-label ml">节次</text>
        <picker :range="lessonLabels" :value="lessonIndex" @change="onLessonChange">
          <view class="h-picker"><text>{{ lessonLabels[lessonIndex] }}</text></view>
        </picker>
      </view>
      <view class="course-match" v-if="form.bjdm">
        <view class="course-match-head">
          <text class="course-match-title">本节课课程</text>
          <text :class="['course-match-state', 'state-' + scheduleLookupState]">{{ scheduleLookupLabel }}</text>
        </view>
        <view class="course-loading" v-if="scheduleLookupState === 'loading'">
          <text>正在匹配班级课表...</text>
        </view>
        <view class="course-match-body" v-else-if="hasCourseInfo">
          <view class="course-name-row">
            <text class="course-name">{{ form.courseName || '课程名称待补充' }}</text>
          </view>
          <view class="course-meta-row">
            <view class="course-meta-item">
              <text class="course-meta-label">授课教师</text>
              <text class="course-meta-value">{{ form.classTeacher || '待补充' }}</text>
            </view>
            <view class="course-meta-item">
              <text class="course-meta-label">上课教室</text>
              <text class="course-meta-value">{{ form.classRoom || '待补充' }}</text>
            </view>
          </view>
        </view>
        <view class="course-empty" v-else>
          <text>{{ scheduleLookupState === 'error' ? '课表查询失败，可继续完成本次查课记录' : '当前日期和节次未匹配到课程' }}</text>
        </view>
      </view>
    </view>

    <!-- 学生名单（辅导员角色） -->
    <view class="stu-section" v-if="form.bjdm && !isSecretaryRole">
      <!-- 统计 -->
      <view class="grid-summary" v-if="students.length > 0">
        <text style="font-size:24rpx;color:#333;font-weight:500;">共{{ students.length }}人</text>
        <text style="font-size:24rpx;color:#2979ff;">请假{{ leaveCount }}</text>
        <text style="font-size:24rpx;color:#e43d33;">异常{{ absentCount }}</text>
      </view>
      <!-- 加载中 -->
      <view class="empty-tip" v-if="studentsLoading">
        <text>加载中...</text>
      </view>
      <!-- 学生按钮 -->
      <view v-if="students.length > 0" class="student-list">
        <view
          v-for="(stu, i) in students"
          :key="stu.xh"
          class="student-grid-item"
          :class="studentStateClass(stu)"
          @click="onStuClick(stu)"
        >
          <text class="student-name">{{ stu.studentName }}</text>
          <view class="student-status-mark">
            <text class="status-mark-char">{{ studentMarkText(stu) }}</text>
          </view>
        </view>
      </view>
      <view v-if="students.length > 0" class="grid-legend">
        <view v-for="item in studentStatusLegend" :key="item.value" class="legend-item">
          <view class="legend-mark" :class="'status-' + item.value">
            <text class="status-mark-char">{{ statusMarkText(item.value) }}</text>
          </view>
          <text>{{ item.label }}</text>
        </view>
      </view>
      <!-- 无数据 -->
      <view class="empty-tip" v-if="!studentsLoading && students.length === 0">
        <text>无学生数据</text>
      </view>
    </view>
    
    <!-- 书记角色：实到人数输入 -->
    <view class="attend-section" v-if="form.bjdm && isSecretaryRole">
      <view class="attend-card">
        <view class="attend-row">
          <text class="attend-label">应到人数</text>
          <text class="attend-value">{{ totalStudents }}人</text>
        </view>
        <view class="attend-row">
          <text class="attend-label">请假人数</text>
          <text class="attend-value leave">{{ leaveCount }}人</text>
        </view>
        <view class="attend-divider"></view>
        <view class="attend-row highlight">
          <text class="attend-label">实到人数</text>
          <input 
            class="attend-input" 
            type="number" 
            v-model="actualAttendance" 
            placeholder="请输入实到人数"
            :max="totalStudents - leaveCount"
            :min="0"
          />
          <text class="attend-unit">人</text>
        </view>
      </view>
      
      <!-- 请假学生列表 -->
        <view class="leave-list" v-if="displayLeaveList.length > 0">
        <view class="leave-header">
            <text class="leave-title">请假学生（{{ displayLeaveList.length }}人）</text>
        </view>
        <view class="leave-item" v-for="(leave, index) in displayLeaveList" :key="leave.xh || index">
          <view class="leave-info">
            <text class="leave-name">{{ leave.studentName }}</text>
            <text class="leave-reason">{{ leave.leaveReason || '未填写原因' }}</text>
          </view>
          <text class="leave-time">{{ formatDate(leave.startTime) }}</text>
        </view>
      </view>
    </view>

    <!-- 拍照区域 -->
    <view class="photo-section" v-if="form.bjdm">
      <view style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16rpx;">
        <text style="font-size:28rpx;color:#333;font-weight:bold;">现场拍照</text>
        <text style="font-size:22rpx;color:#e43d33;">*至少2张，教室前后各一张，须含教师</text>
      </view>
      <view class="photo-grid">
        <view
          v-for="(photo, index) in photoList"
          :key="photo.localId || photo.url || index"
          class="photo-item"
        >
          <image
            :src="photoPreviewUrl(photo)"
            class="photo-preview"
            mode="aspectFill"
            @click="previewPhoto(index)"
          />
          <view class="photo-remove" @click.stop="removePhoto(index)">×</view>
          <text class="photo-label">{{ photo.label || photoLabels[index] || '补充照片' }}</text>
        </view>
        <view
          v-if="photoList.length < 4"
          class="photo-item photo-add"
          @click="capturePhoto"
        >
          <text class="photo-add-icon">+</text>
          <text class="photo-add-text">拍照上传</text>
        </view>
      </view>
      <!-- 水印要素：拍照前确认 -->
      <view class="wm-panel" v-if="watermarkConfig && watermarkConfig.enabled === '1'">
        <view class="wm-row">
          <text class="wm-label">水印时间</text>
          <text class="wm-value" :class="{ 'wm-pending': !captureInfo }">{{ watermarkTimeText }}</text>
        </view>
        <view class="wm-row">
          <text class="wm-label">水印地址</text>
          <text class="wm-value" :class="{ 'wm-pending': !captureInfo || !captureInfo.address }">{{ watermarkAddressText }}</text>
        </view>
        <text class="wm-note" v-if="captureInfo && captureInfo.addressSource === 'coordinate'">地图地址未解析，水印已记录现场坐标</text>
        <text class="wm-note" v-else-if="captureInfo && captureInfo.addressSource === 'fallback'">地图地址未解析，水印已使用查课地点</text>
        <text class="wm-note" v-else-if="captureLocationError">{{ captureLocationError }}</text>
        <text class="wm-refresh" @click="refreshWatermarkInfo">{{ captureInfo ? '重新定位' : '获取定位' }}</text>
      </view>
    </view>

    <!-- 未选班级 -->
    <view class="empty-tip" v-if="classList.length > 0 && !form.bjdm">
      <text>请选择班级</text>
    </view>

    <!-- 底部确认栏 -->
    <view class="bottom-bar" v-if="form.bjdm && (students.length > 0 || isSecretaryRole)">
      <text v-if="!isSecretaryRole" style="font-size:26rpx;color:#e43d33;font-weight:500;">异常{{ absentCount }}人</text>
      <text v-else style="font-size:26rpx;color:#666;font-weight:500;">{{ selectedClassName }}</text>
    <button style="background:#2979ff;color:#fff;font-size:28rpx;border-radius:10rpx;height:72rpx;line-height:72rpx;padding:0 60rpx;" @click="submitForm" :loading="submitting" :disabled="submitting">{{ editId ? '确认修改' : '确认记录' }}</button>
    </view>
  </view>
</template>

<script>
import { getMyClasses, getClassStudents, getClassCheck, checkDuplicate, getClassScheduleByDate } from '@/api/work/classcheck'
import { listClassinfo } from '@/api/work/classinfo'
import { listLeave } from '@/api/work/leave'
import { getMajorList } from '@/api/student/stats'
import { getTeacherinfoByUserId } from '@/api/work/teacherinfo'
import { getActiveSchedule } from '@/api/work/schedule'
import request from '@/utils/request'
import { isSecretary } from '@/utils/role'
import { getWatermarkConfig } from '@/api/work/watermark'
import { prepareCapture } from '@/utils/watermark'
import { resolveImg } from '@/utils/image'
import { parseTime } from '@/utils/common'
import { enqueueRequest, flushOfflineQueue, isNetworkFailure, makeClientRequestId } from '@/utils/offlineQueue'

// 课节时间映射表（兜底默认值）
const FALLBACK_TIMES = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:00', end: '14:45' },
  { start: '14:55', end: '15:40' },
  { start: '16:00', end: '16:45' },
  { start: '16:55', end: '17:40' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:50', end: '21:35' },
  { start: '21:45', end: '22:30' }
]

export default {
  data() {
    return {
      classList: [],
      classNames: [],
      students: [],
      studentsLoading: false,
      leaveXhSet: [],  // 请假学生学号集合
      clickMap: {},     // { xh: 点击次数 } 0=到课, 1=迟到, 2=早退, 3=旷课, 4=请假
      lessonIndex: 0,
      // 从后端加载的课节时间
      sectionTimes: [],
      form: {
        bjdm: '',
        bjmc: '',
        checkDate: '',
        lessonNo: 1,
        courseName: '',
        classRoom: '',
        classTeacher: '',
        remark: ''
      },
      editId: null,
      _explicitEdit: false, // 是否从列表点进来的编辑（区别于自动查重进入的编辑）
      submitting: false,
      clientRequestId: '',
      _submittedToQueue: false,
      scheduleLookupState: 'idle',
      scheduleLookupSeq: 0,
      photoList: [],  // [{url, thumbUrl, label, attachment: {filePath,fileName,fileSize,fileType,mediaType,exifData,sortOrder}}]
      photoLabels: ['教室前方', '教室后方', '补充照片', '补充照片'],
      studentStatusLegend: [
        { value: 'present', label: '出勤' },
        { value: 'late', label: '迟到' },
        { value: 'early_leave', label: '早退' },
        { value: 'truant', label: '旷课' },
        { value: 'leave', label: '请假' }
      ],
      // 书记角色筛选
      isSecretaryRole: false,  // 是否为书记角色
      filterForm: {
        zydm: '',  // 专业代码
        nj: ''     // 年级
      },
      majorList: [],  // 专业列表
      majorNames: [],  // 专业名称列表
      gradeOptions: [],  // 年级选项列表
      actualAttendance: '',  // 书记角色：实到人数
      leaveList: [],  // 请假学生列表
      watermarkConfig: null,  // 水印配置
      watermarkConfigPromise: null,
      captureInfo: null,      // 水印定位信息；拍照成功后补充快门时间
      captureLocating: false,
      captureLocationError: ''
    }
  },
  computed: {
    lessonLabels() {
      const times = this.sectionTimes.length > 0 ? this.sectionTimes : FALLBACK_TIMES
      return times.map((l, i) => `第${i + 1}节 ${l.start}`)
    },
    selectedClassName() {
      const cls = this.classList.find(c => c.bjdm === this.form.bjdm)
      return cls ? (cls.bjjc || cls.bjname) : ''
    },
    hasCourseInfo() {
      return Boolean(this.form.courseName || this.form.classRoom || this.form.classTeacher)
    },
    hasExistingPhoto() {
      return (this.photoList || []).some(photo => {
        const attachment = photo && photo.attachment
        return Boolean(attachment && (attachment.id || attachment.filePath))
      })
    },
    watermarkTimeText() {
      if (this.captureLocating) return '定位中...'
      if (this.captureInfo && this.captureInfo.time) return this.captureInfo.time
      return this.hasExistingPhoto ? '已有照片记录' : '待定位'
    },
    watermarkAddressText() {
      if (this.captureLocating) return '定位中...'
      if (this.captureInfo && this.captureInfo.address) return this.captureInfo.address
      return this.hasExistingPhoto ? '历史照片未保存地址' : '待定位'
    },
    scheduleLookupLabel() {
      const labels = {
        idle: '待匹配',
        loading: '查询中',
        matched: '已匹配',
        record: '记录信息',
        empty: '未匹配',
        error: '查询失败'
      }
      return labels[this.scheduleLookupState] || '待匹配'
    },
    // 筛选后的班级列表
    filteredClassList() {
      let list = this.classList
      // 按专业筛选
      if (this.filterForm.zydm) {
        list = list.filter(c => c.zydm === this.filterForm.zydm)
      }
      // 按年级筛选
      if (this.filterForm.nj) {
        list = list.filter(c => c.nj === this.filterForm.nj)
      }
      return list
    },
    // 筛选后的班级名称列表
    filteredClassNames() {
      return this.filteredClassList.map(c => c.bjjc || c.bjname)
    },
    // 选中的专业名称
    selectedMajorName() {
      const major = this.majorList.find(m => m.zydm === this.filterForm.zydm)
      return major ? major.majorName : ''
    },
    manualLeaveXhList() {
      return Object.keys(this.clickMap).filter(xh => this.clickMap[xh] === 4)
    },
    leaveCount() {
      const all = new Set(this.leaveXhSet)
      this.manualLeaveXhList.forEach(xh => all.add(xh))
      return all.size
    },
    absentCount() {
      return Object.keys(this.clickMap).filter(xh => this.clickMap[xh] > 0 && this.clickMap[xh] < 4).length
    },
    displayLeaveList() {
      const result = (this.leaveList || []).slice()
      const known = new Set(result.map(item => item.xh))
      this.manualLeaveXhList.forEach(xh => {
        if (known.has(xh)) return
        const student = this.students.find(item => item.xh === xh) || {}
        result.push({
          xh,
          studentName: student.studentName || '',
          leaveReason: '查课登记请假，待辅导员补充',
          startTime: this.form.checkDate,
          endTime: this.form.checkDate
        })
      })
      return result
    },
    // 总人数（书记角色用）
    totalStudents() {
      // 书记角色：使用班级的应到人数
      if (this.isSecretaryRole && this.form.bjdm) {
        const cls = this.classList.find(c => c.bjdm === this.form.bjdm)
        return cls ? (cls.bcrs || 0) : 0
      }
      // 辅导员角色：使用学生列表长度
      return this.students.length || 0
    }
  },
  onLoad(options) {
    this.syncPageTitle()
    this.checkRole()
    this.loadScheduleTimes()
    // 加载水印配置
    this.watermarkConfigPromise = getWatermarkConfig('classcheck').then(res => {
      this.watermarkConfig = res.data
      this.prepareWatermarkInfo({ showLoading: false, showError: false })
      return this.watermarkConfig
    }).catch(() => {})
    this.initDateTime()
    
    // 加载班级列表（内部会根据角色自动加载筛选选项）
    this.loadClasses()
    
    // 从课表等页面传入的参数
    if (options.bjdm) {
      this.form.bjdm = options.bjdm
      this.form.bjmc = decodeURIComponent(options.bjmc || '')
    }
    if (options.checkDate) {
      this.form.checkDate = options.checkDate
    }
    if (options.lessonNo) {
      this.form.lessonNo = parseInt(options.lessonNo, 10) || 1
      this.lessonIndex = this.form.lessonNo - 1
    }
    if (options.courseName) {
      this.form.courseName = decodeURIComponent(options.courseName || '')
    }
    if (options.classRoom) {
      this.form.classRoom = decodeURIComponent(options.classRoom || '')
    }
    if (options.classTeacher) {
      this.form.classTeacher = decodeURIComponent(options.classTeacher || '')
    }
    const recordId = options.id || options.checkId || options.recordId
    if (recordId) {
      this.editId = recordId
      this._explicitEdit = true  // 从列表点击进来的，锁定编辑模式
      this.syncPageTitle()
      this.loadDetail(recordId)
    } else {
      this.loadScheduleForSelection({ keepExisting: true })
    }
  },
  onShow() {
    // 小程序首帧可能用 pages.json 的静态标题覆盖 onLoad 中的设置。
    this.syncPageTitle()
  },
  onReady() {
    this.syncPageTitle()
  },
  onBackPress() {
    // 退出时自动保存草稿
    this.saveDraft()
    return false
  },
  onUnload() {
    this.saveDraft()
  },
  methods: {
    syncPageTitle() {
      uni.setNavigationBarTitle({
        title: this.editId || this._explicitEdit ? '修改查课' : '新增查课'
      })
    },
    // 检查角色
    checkRole() {
      const store = this.$store
      let roles = []
      
      if (store && store.state && store.state.user && store.state.user.roles) {
        roles = store.state.user.roles
      }
      
      // 使用项目统一的角色判断函数
      this.isSecretaryRole = isSecretary(roles)
      
      // 注意：不在这里加载筛选选项，等班级数据加载完成后再加载
    },
    // 加载年级选项（从班级数据中提取）
    loadGradeOptions() {
      if (this.classList.length === 0) {
        this.gradeOptions = ['全部年级']
        return
      }
      
      const gradeSet = new Set()
      
      // 计算在校年级范围（只显示4个年级）
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1  // 1-12
      const isFirstHalf = currentMonth <= 6
      const minGradeYear = isFirstHalf ? (currentYear - 4) : (currentYear - 3)
      
      this.classList.forEach(cls => {
        const nj = cls.nj || cls.grade || cls.njdm || ''
        if (nj) {
          const gradeYear = parseInt(nj.substring(0, 4))
          if (gradeYear >= minGradeYear) {
            gradeSet.add(nj)
          }
        }
      })
      
      this.gradeOptions = ['全部年级', ...Array.from(gradeSet).sort((a, b) => b.localeCompare(a))]
    },
    
    // 加载筛选选项（专业和年级）
    loadFilterOptions() {
      // 从班级列表中提取专业和年级
      if (this.classList.length === 0) {
        return
      }
          
      // 提取专业列表
      const majorMap = {}
      const gradeSet = new Set()
          
      // 计算在校年级范围（只显示4个年级）
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1  // 1-12
      const isFirstHalf = currentMonth <= 6
      const minGradeYear = isFirstHalf ? (currentYear - 4) : (currentYear - 3)
          
      this.classList.forEach(cls => {
        // 专业 - 尝试多种字段名
        const zydm = cls.zydm || cls.majorCode || ''
        const majorName = cls.majorName || cls.zymc || cls.zyname || ''
            
        if (zydm && majorName) {
          majorMap[zydm] = majorName
        }
            
        // 年级 - 尝试多种字段名
        const nj = cls.nj || cls.grade || cls.njdm || ''
        if (nj) {
          // 提取年级年份（前4位）
          const gradeYear = parseInt(nj.substring(0, 4))
          // 只保留在校年级
          if (gradeYear >= minGradeYear) {
            gradeSet.add(nj)
          }
        }
      })
          
      this.majorList = Object.keys(majorMap).map(zydm => ({
        zydm,
        majorName: majorMap[zydm]
      }))
      this.majorNames = ['全部专业', ...this.majorList.map(m => m.majorName)]
          
      // 排序年级并添加“全部年级”
      this.gradeOptions = ['全部年级', ...Array.from(gradeSet).sort((a, b) => b.localeCompare(a))]
    },
    // 专业选择变化
    onMajorChange(e) {
      const idx = e.detail.value
      if (idx === 0) {
        // 全部专业
        this.filterForm.zydm = ''
      } else {
        this.filterForm.zydm = this.majorList[idx - 1].zydm
      }
      // 清空班级选择
      this.form.bjdm = ''
      this.students = []
      this.resetCourseInfo()
    },
    // 年级选择变化
    onGradeChange(e) {
      const idx = e.detail.value
      if (idx === 0) {
        // 全部年级
        this.filterForm.nj = ''
      } else {
        this.filterForm.nj = this.gradeOptions[idx]
      }
      // 清空班级和专业选择
      this.form.bjdm = ''
      this.students = []
      this.resetCourseInfo()
      this.filterForm.zydm = ''
      // 书记角色：按年级动态刷新招生计划专业列表
      if (this.isSecretaryRole && this._xydm) {
        const nj = this.filterForm.nj || undefined
        getMajorList(this._xydm, nj).then(res => {
          if (res.code === 200 && res.data) {
            this.majorList = res.data.map(m => ({
              zydm: m.zydm,
              majorName: m.majorName || m.zyname || m.zymc || m.zydm
            }))
            this.majorNames = ['全部专业', ...this.majorList.map(m => m.majorName)]
          }
        }).catch(() => {})
      }
    },
    // 从后端加载作息时间
    loadScheduleTimes() {
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      getActiveSchedule(todayStr).then(res => {
        const scheme = res.data
        if (scheme && scheme.detailList && scheme.detailList.length > 0) {
          const sorted = scheme.detailList.sort((a, b) => Number(a.lessonNo) - Number(b.lessonNo))
          this.sectionTimes = sorted.map(d => ({
            start: d.startTime,
            end: d.endTime
          }))
        }
      }).catch(() => {
        this.sectionTimes = []
      })
    },
    // 根据当前时间自动设置日期和课节
    initDateTime() {
      const now = new Date()
      this.form.checkDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const times = this.sectionTimes.length > 0 ? this.sectionTimes : FALLBACK_TIMES
      const nowMin = now.getHours() * 60 + now.getMinutes()
      let lessonIdx = 0
      for (let i = 0; i < times.length; i++) {
        const [h, m] = times[i].start.split(':').map(Number)
        if (nowMin >= h * 60 + m) {
          lessonIdx = i
        }
      }
      this.lessonIndex = lessonIdx
      this.form.lessonNo = lessonIdx + 1
    },
    loadClasses() {
      // 书记角色：获取学院所有班级（与"我的学生"页面一致）
      if (this.isSecretaryRole) {
        // 先获取教师信息得到学院代码
        return getTeacherinfoByUserId().then(teacherRes => {
          const xydm = teacherRes.data && teacherRes.data.xydm
          if (!xydm) {
            this.classList = []
            this.majorList = []
            this.majorNames = []
            return
          }
              
          // 保存学院代码，年级切换时需要
          this._xydm = xydm
              
          // 并行加载：招生计划专业列表（不限年级）+ 班级列表
          return Promise.all([
            getMajorList(xydm),
            listClassinfo({ xydm, pageNum: 1, pageSize: 999 })
          ]).then(([majorRes, classRes]) => {
            // 加载招生计划专业列表（zyname 即为展示名称）
            if (majorRes.code === 200 && majorRes.data) {
              this.majorList = majorRes.data.map(m => ({
                zydm: m.zydm,
                majorName: m.majorName || m.zyname || m.zymc || m.zydm
              }))
              this.majorNames = ['全部专业', ...this.majorList.map(m => m.majorName)]
            }
                
            // 加载班级列表
            let data = classRes.rows || classRes.data || []
            if (!Array.isArray(data)) {
              if (data && data.rows && Array.isArray(data.rows)) {
                data = data.rows
              } else {
                data = []
              }
            }
            this.classList = data
            this.classNames = this.classList.map(c => c.bjjc || c.bjname)
                
            // 加载年级选项
            this.loadGradeOptions()
                
            if (this.form.bjdm) {
              this.loadStudents(this.form.bjdm)
              this.checkExistingRecord()
            }
          })
        }).catch((err) => {
          this.classList = []
          this.majorList = []
          this.majorNames = []
        })
      }
      // 辅导员角色：获取我的班级
      else {
        return getMyClasses().then(res => {
          let data = res.data || []
          if (!Array.isArray(data)) {
            if (data && data.rows && Array.isArray(data.rows)) {
              data = data.rows
            } else {
              data = []
            }
          }
          this.classList = data
          this.classNames = this.classList.map(c => c.bjjc || c.bjname)
          
          // 加载筛选选项
          if (this.isSecretaryRole && this.classList.length > 0) {
            this.loadFilterOptions()
          }
          
          if (this.form.bjdm) {
            this.loadStudents(this.form.bjdm)
            this.checkExistingRecord()
          }
        }).catch((err) => {
          // 加载失败静默处理
        })
      }
    },
    loadDetail(id) {
      this.scheduleLookupSeq += 1
      this.clickMap = {}
      this.photoList = []
      this.syncPageTitle()
      getClassCheck(id).then(res => {
        const data = res.data
        if (data) {
          this.form.bjdm = data.bjdm
          this.form.bjmc = data.bjmc || ''
          this.form.checkDate = data.checkDate || this.form.checkDate
          this.form.lessonNo = data.lessonNo || 1
          this.lessonIndex = this.form.lessonNo - 1
          this.form.courseName = data.courseName || ''
          this.form.classRoom = data.classRoom || ''
          this.form.classTeacher = data.classTeacher || ''
          this.scheduleLookupState = this.hasCourseInfo ? 'record' : 'idle'
          this.form.remark = data.remark || ''
          this.actualAttendance = this.resolvePresentCount(data)
          this.syncPageTitle()
          this.loadStudents(data.bjdm)
          if (data.detailList) {
            data.detailList.forEach(d => {
              const typeMap = { late: 1, early_leave: 2, truant: 3, leave: 4 }
              this.$set(this.clickMap, d.xh, typeMap[d.absentType] || 3)
            })
          }
          // 加载已有附件
          if (data.attachmentList && data.attachmentList.length) {
            this.applyLoadedAttachments(data.attachmentList)
          } else {
            this.loadAttachments(id)
          }
        }
      }).catch(() => {})
    },
    resolvePresentCount(data) {
      if (!data) return ''
      const directFields = ['presentCount', 'actualAttendance', 'attendanceCount', 'presentNum']
      for (const field of directFields) {
        const value = data[field]
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          return String(value)
        }
      }
      const total = Number(data.totalStudents)
      const leave = Number(data.leaveCount)
      const absent = Number(data.absentCount)
      if ([total, leave, absent].every(Number.isFinite)) {
        return String(Math.max(0, total - leave - absent))
      }
      return ''
    },
    resetCourseInfo() {
      this.scheduleLookupSeq += 1
      this.form.courseName = ''
      this.form.classRoom = ''
      this.form.classTeacher = ''
      this.scheduleLookupState = 'idle'
    },
    loadScheduleForSelection(options = {}) {
      const keepExisting = Boolean(options.keepExisting)
      if (!this.form.bjdm || !this.form.checkDate || !this.form.lessonNo) {
        if (!keepExisting) this.resetCourseInfo()
        return
      }

      const requestSeq = this.scheduleLookupSeq + 1
      this.scheduleLookupSeq = requestSeq
      if (!keepExisting) {
        this.form.courseName = ''
        this.form.classRoom = ''
        this.form.classTeacher = ''
      }
      this.scheduleLookupState = 'loading'

      getClassScheduleByDate(
        this.form.checkDate,
        Number(this.form.lessonNo),
        this.form.bjdm
      ).then(res => {
        if (requestSeq !== this.scheduleLookupSeq) return
        const schedule = res.data
        if (schedule && (schedule.courseName || schedule.classroom || schedule.teacherName)) {
          this.form.courseName = schedule.courseName || ''
          this.form.classRoom = schedule.classroom || ''
          this.form.classTeacher = schedule.teacherName || ''
          this.scheduleLookupState = 'matched'
        } else if (!keepExisting || !this.hasCourseInfo) {
          this.form.courseName = ''
          this.form.classRoom = ''
          this.form.classTeacher = ''
          this.scheduleLookupState = 'empty'
        } else {
          this.scheduleLookupState = 'idle'
        }
      }).catch(() => {
        if (requestSeq !== this.scheduleLookupSeq) return
        if (!keepExisting) {
          this.form.courseName = ''
          this.form.classRoom = ''
          this.form.classTeacher = ''
        }
        this.scheduleLookupState = 'error'
      })
    },
    onClassChange(e) {
      const idx = e.detail.value
      // 使用筛选后的班级列表
      const cls = this.filteredClassList[idx]
      if (cls) {
        this.form.bjdm = cls.bjdm
        this.form.bjmc = cls.bjname || ''
        this.clickMap = {}
        this.resetCourseInfo()
        this.loadScheduleForSelection()
        this.loadStudents(cls.bjdm)
        // 选班后检查是否已有查课记录
        this.checkExistingRecord()
      }
    },
    onDateChange(e) {
      this.form.checkDate = e.detail.value
      this.loadScheduleForSelection()
      if (this.form.bjdm) this.loadLeaves(this.form.bjdm)
      this.checkExistingRecord()
    },
    onLessonChange(e) {
      this.lessonIndex = e.detail.value
      this.form.lessonNo = this.lessonIndex + 1
      this.loadScheduleForSelection()
      this.checkExistingRecord()
    },
    // 检查是否已有查课记录，有则自动进入修改模式
    checkExistingRecord() {
      if (!this.form.bjdm || !this.form.checkDate) return
      if (this._explicitEdit) return // 从列表点进来的编辑，不重新检查
      // 自动编辑模式下，切换班级/课节/日期要重新检查
      checkDuplicate(this.form.bjdm, this.form.checkDate, this.form.lessonNo).then(res => {
        const existing = res.data
        if (existing && existing.id) {
          // 找到已有记录，进入修改模式
          this.editId = existing.id
          this._explicitEdit = false
          this.loadDetail(existing.id)
          this.$modal.msgSuccess('正在修改' + (this.selectedClassName || '') + '的查课记录')
        } else {
          // 没有已有记录，清除之前的自动编辑状态，切回新增模式
          if (this.editId && !this._explicitEdit) {
            this.editId = null
            this.photoList = []
            this.clickMap = {}
            this.syncPageTitle()
          }
        }
      }).catch(() => {})
    },
    loadStudents(bjdm) {
      this.students = []
      this.studentsLoading = true
      getClassStudents(bjdm).then(res => {
        let data = res.data || res.rows || []
        if (!Array.isArray(data)) {
          if (data && data.rows && Array.isArray(data.rows)) {
            data = data.rows
          } else if (data && data.list && Array.isArray(data.list)) {
            data = data.list
          } else {
            data = []
          }
        }
        this.students = data
        this.studentsLoading = false
        this.loadLeaves(bjdm)
        if (!this.editId) this.restoreDraft()
      }).catch(err => {
        this.students = []
        this.studentsLoading = false
      })
    },
    loadLeaves(bjdm) {
      const today = this.form.checkDate
      listLeave({ pageNum: 1, pageSize: 999, bjdm: bjdm, approvalStatus: 'approved' }).then(res => {
        const rows = res.rows || res.data || []
        const leaves = rows.filter(l => {
          if (!l.startTime || !l.endTime) return false
          const s = this.fmtDate(l.startTime)
          const e = this.fmtDate(l.endTime)
          return today >= s && today <= e
        })
        
        // 请假学号集合（用于辅导员）
        this.leaveXhSet = leaves.map(l => l.xh)
        
        // 请假详细列表（用于书记）
        this.leaveList = leaves.map(l => ({
          xh: l.xh,
          studentName: l.studentName || l.studentName || '',
          leaveReason: l.leaveReason || l.qjyy || '',
          startTime: l.startTime,
          endTime: l.endTime
        }))
      }).catch(() => { 
        this.leaveXhSet = []
        this.leaveList = []
      })
    },
    isOnLeave(xh) {
      return this.leaveXhSet.indexOf(xh) >= 0
    },
    getClickCount(xh) {
      return this.clickMap[xh] || 0
    },
    studentAttendState(stu) {
      if (this.isOnLeave(stu.xh)) return 'leave'
      const count = this.getClickCount(stu.xh)
      if (count === 1) return 'late'
      if (count === 2) return 'early_leave'
      if (count === 3) return 'truant'
      if (count === 4) return 'leave'
      return 'present'
    },
    studentStateClass(stu) {
      return 'student-' + this.studentAttendState(stu)
    },
    studentMarkText(stu) {
      return this.statusMarkText(this.studentAttendState(stu))
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
    stuBg(stu) {
      if (this.isOnLeave(stu.xh)) return 'background-color:#f0f0f0;border:1rpx solid #ddd;opacity:0.6;'
      const c = this.getClickCount(stu.xh)
      if (c === 1) return 'background-color:#fff8e1;border:1rpx solid #ffe082;'
      if (c === 2) return 'background-color:#fff3e0;border:1rpx solid #ffcc80;'
      if (c >= 3) return 'background-color:#ffebee;border:1rpx solid #ef9a9a;'
      return 'background-color:#e8f8ea;border:1rpx solid #c3e6cb;'
    },
    btnClass(stu) {
      if (this.isOnLeave(stu.xh)) return 'btn-leave'
      const c = this.getClickCount(stu.xh)
      if (c === 0) return 'btn-normal'
      if (c === 1) return 'btn-late'
      if (c === 2) return 'btn-early'
      return 'btn-truant'
    },
    onStuClick(stu) {
      if (this.isOnLeave(stu.xh)) return // 请假不可点击
      const cur = this.clickMap[stu.xh] || 0
      // 循环：0(到课) → 1(迟到) → 2(早退) → 3(旷课) → 4(请假) → 0(到课)
      const next = (cur + 1) % 5
      this.$set(this.clickMap, stu.xh, next)
    },
    // 保存草稿到本地缓存
    saveDraft() {
      if (this._submittedToQueue) return
      if (!this.form.bjdm || this.students.length === 0) return
      const key = 'checkDraft_' + this.form.bjdm + '_' + this.form.checkDate + '_' + this.form.lessonNo
      const draft = {
        form: this.form,
        clickMap: this.clickMap,
        timestamp: Date.now()
      }
      uni.setStorageSync(key, JSON.stringify(draft))
    },
    // 恢复草稿
    restoreDraft() {
      if (!this.form.bjdm) return
      const key = 'checkDraft_' + this.form.bjdm + '_' + this.form.checkDate + '_' + this.form.lessonNo
      const raw = uni.getStorageSync(key)
      if (!raw) return
      try {
        const draft = JSON.parse(raw)
        if (draft.clickMap && Object.keys(draft.clickMap).length > 0) {
          this.clickMap = draft.clickMap
        }
      } catch (e) {}
    },
    async submitForm() {
      if (!this.form.bjdm) {
        this.$modal.msgError('请选择班级')
        return
      }
      
      // 书记角色：验证实到人数和照片
      if (this.isSecretaryRole) {
        if (!this.actualAttendance || this.actualAttendance === '') {
          this.$modal.msgError('请输入实到人数')
          return
        }
        const actualNum = parseInt(this.actualAttendance)
        const maxAttendance = this.totalStudents - this.leaveCount
        if (actualNum < 0 || actualNum > this.totalStudents) {
          this.$modal.msgError('实到人数必须在0-' + this.totalStudents + '之间')
          return
        }
        if (this.photoList.length < 2) {
          this.$modal.msgError('请至少拍摄2张现场照片')
          return
        }
      }
      
      // 辅导员角色：验证照片
      if (!this.isSecretaryRole && this.photoList.length < 2) {
        this.$modal.msgError('请至少拍摄2张现场照片')
        return
      }

      // 显式编辑模式直接提交
      if (this._explicitEdit && this.editId) {
        this.doSubmit(this.editId)
      } else if (this.editId) {
        // 自动编辑模式，先确认当前班级+课节是否匹配
        checkDuplicate(this.form.bjdm, this.form.checkDate, this.form.lessonNo).then(res => {
          const existing = res.data
          if (existing && existing.id && existing.id === this.editId) {
            // 匹配，直接提交
            this.doSubmit(this.editId)
          } else if (existing && existing.id) {
            // 不匹配但有其他记录，切换到该记录
            this.editId = existing.id
            this.submitting = false
            this.loadDetail(existing.id)
            this.$modal.msgSuccess('正在修改' + (this.selectedClassName || '') + '的查课记录')
          } else {
            // 没有已有记录，新增
            this.editId = null
            this.doSubmit(null)
          }
        }).catch(() => {
          this.doSubmit(this.editId)
        })
      } else {
        this.submitting = true
        // 新增模式检查重复
        checkDuplicate(this.form.bjdm, this.form.checkDate, this.form.lessonNo).then(res => {
          const existing = res.data
          if (existing && existing.id) {
            // 已有记录，直接进入修改模式
            this.submitting = false
            this.editId = existing.id
            this.loadDetail(existing.id)
            this.$modal.msgSuccess('正在修改' + (this.selectedClassName || '') + '的查课记录')
          } else {
            this.doSubmit(null)
          }
        }).catch(() => {
          // 查重失败，直接提交
          this.doSubmit(null)
        })
      }
    },
    async doSubmit(existingId) {
      this.submitting = true
      
      let totalStudents, presentCount, absentCount, detailList
      
      // 书记角色：使用实到人数
      if (this.isSecretaryRole) {
        totalStudents = this.totalStudents
        presentCount = parseInt(this.actualAttendance) || 0
        absentCount = totalStudents - presentCount - this.leaveCount
        detailList = []  // 书记不提交明细
      } 
      // 辅导员角色：使用学生点击状态
      else {
        const absentTypes = { 1: 'late', 2: 'early_leave', 3: 'truant', 4: 'leave' }
        detailList = Object.keys(this.clickMap)
          .filter(xh => this.clickMap[xh] > 0)
          .map(xh => ({
            xh,
            studentName: (this.students.find(s => s.xh === xh) || {}).studentName || '',
            absentType: absentTypes[this.clickMap[xh]] || 'truant'
          }))
        totalStudents = this.students.length
        absentCount = detailList.filter(item => item.absentType !== 'leave').length
        presentCount = totalStudents - this.leaveCount - absentCount
      }
      
      // 获取当前用户信息
      const store = this.$store
      const userId = store.state.user.id || store.state.user.userId || ''
      const userName = store.state.user.name || store.state.user.nickName || ''
      
      if (!existingId && !this.editId && !this.clientRequestId) {
        this.clientRequestId = makeClientRequestId('CLASSCHECK')
      }
      const existingAttachments = this.photoList.map((p, i) => ({
        id: (p.attachment || {}).id || undefined,
        businessType: 'classcheck',
        fileName: (p.attachment || {}).fileName || '',
        filePath: (p.attachment || {}).filePath || '',
        fileSize: (p.attachment || {}).fileSize || 0,
        fileType: (p.attachment || {}).fileType || '',
        mediaType: (p.attachment || {}).mediaType || 'image',
        exifData: (p.attachment || {}).exifData || '',
        sortOrder: i + 1
      })).filter(att => att.id || att.filePath)
      const data = {
        ...this.form,
        totalStudents: totalStudents,
        presentCount: presentCount,
        leaveCount: this.leaveCount,
        absentCount: absentCount,
        checkStatus: '1',
        detailList: detailList,
        // 记录查课人
        checkerId: userId,
        checkerName: userName,
        checkerRole: this.isSecretaryRole ? 'secretary' : 'counselor',
        // 标记是否需要辅导员补充（书记查课需要辅导员补充）
        needCounselorConfirm: this.isSecretaryRole ? '1' : '0',
        attachmentList: existingAttachments,
        clientRequestId: this.clientRequestId || undefined
      }
      let method = 'post'
      if (existingId) {
        data.id = existingId
        method = 'put'
      } else if (this.editId) {
        data.id = this.editId
        method = 'put'
      }

      const requestConfig = {
        url: '/api/classcheck',
        method,
        data
      }
      const recordId = existingId || this.editId || null
      const uploads = this.buildBackgroundPhotoUploads({
        recordId,
        clientRequestId: this.clientRequestId
      })
      let recordSaved = false
      let queuedForSync = false
      let photoQueueSaved = false
      let backgroundUploads = []
      let savedRecordId = recordId
      try {
        let response = null
        try {
          response = await request(Object.assign({}, requestConfig, { silent: true }))
          recordSaved = true
        } catch (error) {
          if (!isNetworkFailure(error)) throw error
          await enqueueRequest({
            businessType: method === 'put' ? 'classcheck_update' : 'classcheck_add',
            title: '查课记录：' + (this.selectedClassName || this.form.bjdm),
            clientRequestId: this.clientRequestId,
            request: requestConfig
          })
          queuedForSync = true
        }

        const savedId = response && response.data ? response.data.id : recordId
        savedRecordId = savedId
        backgroundUploads = uploads.length
          ? this.buildBackgroundPhotoUploads({
            recordId: savedId,
            clientRequestId: this.clientRequestId
          })
          : []
        if (backgroundUploads.length) {
          await enqueueRequest({
            businessType: 'classcheck_photo',
            title: '查课照片：' + (this.selectedClassName || this.form.bjdm),
            skipRequest: true,
            dependsOnClientRequestId: queuedForSync && !savedId ? this.clientRequestId : '',
            fingerprint: this.photoQueueFingerprint(savedId),
            uploads: backgroundUploads
          })
          photoQueueSaved = true
        }
        const key = 'checkDraft_' + this.form.bjdm + '_' + this.form.checkDate + '_' + this.form.lessonNo
        uni.removeStorageSync(key)
        this._submittedToQueue = true
        uni.showToast({
          title: queuedForSync
            ? '已保存，记录和照片后台同步'
            : (method === 'post' ? '已提交，可选择下一个班级' : '已保存，照片后台上传'),
          icon: 'none',
          duration: 1600
        })
        if (queuedForSync || backgroundUploads.length) flushOfflineQueue()
        this.finishSubmission(method)
      } catch (error) {
        if (recordSaved || queuedForSync) {
          if (backgroundUploads.length && !photoQueueSaved) {
            if (savedRecordId) this.editId = savedRecordId
            uni.showToast({
              title: recordSaved ? '记录已保存，照片暂未加入同步队列，请重试' : '记录已排队，照片暂未加入同步队列，请重试',
              icon: 'none',
              duration: 3000
            })
          } else {
            uni.showToast({ title: '记录已保存，照片将在网络恢复后重试', icon: 'none', duration: 2400 })
            this.finishSubmission(method)
          }
        } else {
          const message = typeof error === 'string'
            ? error
            : ((error && error.message) || '提交失败，请重试')
          this.$modal.msgError(message)
        }
      } finally {
        this.submitting = false
      }
    },
    finishSubmission(method) {
      if (method === 'post') {
        this.resetForNextClassCheck()
        uni.pageScrollTo({ scrollTop: 0, duration: 200 })
      } else {
        setTimeout(() => uni.navigateBack(), 600)
      }
    },
    resetForNextClassCheck() {
      const checkDate = this.form.checkDate
      const lessonNo = this.form.lessonNo
      this.scheduleLookupSeq += 1
      this.form = {
        bjdm: '',
        bjmc: '',
        checkDate,
        lessonNo,
        courseName: '',
        classRoom: '',
        classTeacher: '',
        remark: ''
      }
      this.students = []
      this.studentsLoading = false
      this.leaveXhSet = []
      this.leaveList = []
      this.clickMap = {}
      this.actualAttendance = ''
      this.photoList = []
      this.captureInfo = null
      this.captureLocationError = ''
      this.editId = null
      this._explicitEdit = false
      this.clientRequestId = ''
      this._submittedToQueue = false
      this.scheduleLookupState = 'idle'
    },
    loadAttachments(checkId) {
      request({
        url: '/stumanage/classcheck/attachment/' + checkId,
        method: 'get'
      }).then(res => {
        this.applyLoadedAttachments(res.data || [])
      }).catch(() => {})
    },
    applyLoadedAttachments(list) {
      this.photoList = (list || []).map((att, i) => ({
          url: att.thumbnailBase64 || att.filePath || '',
          thumbUrl: att.thumbnailBase64 || att.filePath || '',
          label: i < this.photoLabels.length ? this.photoLabels[i] : '补充照片',
          attachment: {
            id: att.id || undefined,
            fileName: att.fileName || '',
            filePath: att.filePath || '',
            fileSize: att.fileSize || 0,
            fileType: att.fileType || '',
            mediaType: att.mediaType || 'image',
            exifData: att.exifData || '',
            watermarkContext: att.watermarkContext || ''
          }
        }))
      const restored = this.restoreCaptureInfoFromAttachments(list)
      if (restored) this.captureInfo = restored
    },
    restoreCaptureInfoFromAttachments(list) {
      for (const att of list || []) {
        if (!att || !att.watermarkContext) continue
        try {
          const context = typeof att.watermarkContext === 'string'
            ? JSON.parse(att.watermarkContext)
            : att.watermarkContext
          const latitude = context.latitude == null ? null : Number(context.latitude)
          const longitude = context.longitude == null ? null : Number(context.longitude)
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
          return {
            latitude,
            longitude,
            accuracy: Number(context.accuracy) || 0,
            altitude: Number(context.altitude) || 0,
            address: context.address || '',
            addressSource: context.addressSource || 'stored',
            time: context.shootTime || context.time || ''
          }
        } catch (e) {
          // Ignore malformed historical attachment metadata.
        }
      }
      return null
    },
    refreshWatermarkInfo() {
      return this.prepareWatermarkInfo({ showLoading: true, showError: true })
    },
    photoPreviewUrl(photo) {
      const path = photo && (photo.localPath || photo.url || photo.thumbUrl)
      if (!path) return ''
      const value = String(path)
      if (/^(https?:|data:|blob:|wxfile:|file:|\/tmp\/|\/var\/)/.test(value)) return value
      return resolveImg(value)
    },
    previewPhoto(index) {
      const urls = this.photoList.map(photo => this.photoPreviewUrl(photo)).filter(Boolean)
      if (urls.length) uni.previewImage({ current: index, urls })
    },
    removePhoto(index) {
      this.photoList.splice(index, 1)
      this.photoList.forEach((photo, photoIndex) => {
        photo.label = this.photoLabels[photoIndex] || '补充照片'
      })
    },
    async prepareWatermarkInfo(options = {}) {
      if (this.captureLocating) return { ready: false, info: null }
      this.captureLocating = true
      this.captureLocationError = ''
      try {
        const result = await this.resolveCaptureInfo(options)
        if (result.ready) {
          if (result.info) this.captureInfo = result.info
          return result
        }
        this.captureLocationError = result.message || '定位失败，请重试'
        return result
      } finally {
        this.captureLocating = false
      }
    },
    async resolveCaptureInfo(options = {}) {
      const showLoading = options.showLoading !== false
      const showError = options.showError !== false
      if (!this.watermarkConfig && this.watermarkConfigPromise) {
        await this.watermarkConfigPromise
      }
      if (!this.watermarkConfig || this.watermarkConfig.enabled !== '1') {
        return { ready: true, info: null }
      }
      if (showLoading) uni.showLoading({ title: '定位中...' })
      const result = await prepareCapture(this.watermarkConfig, this.form.classRoom)
      if (showLoading) uni.hideLoading()
      if (!result.ready) {
        if (showError) uni.showToast({ title: result.message, icon: 'none', duration: 2500 })
        return { ready: false, info: null, message: result.message }
      }
      return { ready: true, info: result.captureInfo }
    },
    async capturePhoto() {
      if (this.photoList.length >= 4) {
        return uni.showToast({ title: '现场照片最多4张', icon: 'none' })
      }
      const capture = await this.resolveCaptureInfo({ showLoading: true, showError: true })
      if (!capture.ready) return
      uni.chooseImage({
        count: 1,
        // 原图保留相机写入的 EXIF 拍摄时间，后端会优先按该时间生成水印。
        sizeType: ['original'],
        sourceType: ['camera'],
        success: res => {
          const originalPath = res.tempFilePaths && res.tempFilePaths[0]
          if (!originalPath) return
          const index = this.photoList.length
          const capturedInfo = Object.assign({}, capture.info || {}, {
            time: parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s} 星期{a}')
          })
          this.photoList.push({
            localId: 'PHOTO-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
            localPath: originalPath,
            originalPath,
            url: originalPath,
            thumbUrl: originalPath,
            label: this.photoLabels[index] || '补充照片',
            captureInfo: capturedInfo,
            attachment: {
              fileName: '',
              filePath: '',
              fileSize: 0,
              fileType: '',
              mediaType: 'image',
              exifData: ''
            }
          })
          this.onLocalPhotoCaptured(capturedInfo)
        }
      })
    },
    onLocalPhotoCaptured(captureInfo) {
      this.captureInfo = captureInfo || null
      this.captureLocationError = ''
    },
    photoQueueFingerprint(recordId) {
      const photoIds = this.photoList
        .filter(photo => {
          const attachment = photo && photo.attachment
          return !(attachment && (attachment.id || attachment.filePath))
        })
        .map(photo => photo.localId || photo.localPath || photo.originalPath)
        .filter(Boolean)
        .join('|')
      return 'classcheck_photos_' + (recordId || this.clientRequestId) + '_' + photoIds
    },
    buildBackgroundPhotoUploads(options = {}) {
      const recordId = options.recordId || ''
      const clientRequestId = options.clientRequestId || ''
      return this.photoList.map((photo, index) => {
        const attachment = photo.attachment || {}
        if (attachment.id || attachment.filePath) return null
        const localPath = photo.localPath || photo.originalPath
        if (!localPath) return null
        const capture = photo.captureInfo || {}
        return {
          localPath,
          uploadUrl: '/api/attachment/upload',
          field: 'file',
          formData: {
            businessType: 'classcheck',
            bjdm: this.form.bjdm || '',
            businessId: recordId || '',
            clientRequestId: recordId ? '' : clientRequestId,
            applyWatermark: '1',
            place: this.form.classRoom || '',
            shootTime: capture.time || '',
            address: capture.address || '',
            latitude: capture.latitude != null ? capture.latitude : '',
            longitude: capture.longitude != null ? capture.longitude : '',
            sortOrder: index + 1
          },
          jsonArrayPath: 'attachmentList',
          jsonArrayValue: 'attachmentId'
        }
      }).filter(Boolean)
    },
    fmtDate(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    formatDate(val) {
      if (!val) return ''
      // 只显示月-日 时:分
      const d = new Date(val.replace(/ /g, 'T'))
      const month = d.getMonth() + 1
      const day = d.getDate()
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${month}月${day}日 ${hours}:${minutes}`
    }
  }
}
</script>

<style lang="scss" scoped>
.page-wrap {
  min-height: 100vh;
  background: #f5f6f7;
  padding-bottom: calc(148rpx + env(safe-area-inset-bottom));
}

/* ===== 紧凑表头 ===== */
.header-card {
  background: #fff;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #eee;
}

.header-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.header-row:last-child {
  margin-bottom: 0;
}

.h-label {
  font-size: 26rpx;
  color: #666;
  width: 60rpx;
  flex-shrink: 0;
}

.h-label.ml {
  margin-left: 30rpx;
}

.h-picker {
  font-size: 26rpx;
  color: #333;
  padding: 6rpx 16rpx;
  background: #f5f6f7;
  border-radius: 8rpx;

  .ph {
    color: #999;
  }
}

/* 弹性宽度 */
.h-picker.flex1 {
  flex: 1;
  min-width: 0;
}

.h-picker.flex2 {
  flex: 2;
  min-width: 0;
}

.course-match {
  margin-top: 14rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #eef0f2;
}

.course-match-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.course-match-title {
  color: #333;
  font-size: 25rpx;
  font-weight: 600;
}

.course-match-state {
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  background: #f3f5f7;
  color: #8a949e;
  font-size: 20rpx;
}

.course-match-state.state-loading {
  background: #edf4ff;
  color: #2979ff;
}

.course-match-state.state-matched {
  background: #eaf8ef;
  color: #168a4b;
}

.course-match-state.state-record {
  background: #edf4ff;
  color: #2979ff;
}

.course-match-state.state-empty {
  background: #f5f6f7;
  color: #8a949e;
}

.course-match-state.state-error {
  background: #fff0f0;
  color: #d63d32;
}

.course-loading,
.course-empty {
  margin-top: 12rpx;
  padding: 18rpx 20rpx;
  border-radius: 8rpx;
  background: #f7f8fa;
  color: #8a949e;
  font-size: 23rpx;
}

.course-match-body {
  margin-top: 10rpx;
}

.course-name {
  display: block;
  color: #1f2d3d;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.4;
}

.course-meta-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 10rpx;
}

.course-meta-item {
  min-width: 0;
  padding: 12rpx 14rpx;
  border-radius: 8rpx;
  background: #f7f8fa;
}

.course-meta-label,
.course-meta-value {
  display: block;
}

.course-meta-label {
  color: #8a949e;
  font-size: 20rpx;
}

.course-meta-value {
  margin-top: 4rpx;
  overflow: hidden;
  color: #384551;
  font-size: 24rpx;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 学生区域 ===== */
.stu-section {
  background: #fff;
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
}

.grid-summary {
  display: flex;
  margin-bottom: 16rpx;
}

.student-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10rpx;
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
  background: #fff;
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
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #1e293b;
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.student-status-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26rpx;
  height: 26rpx;
  flex: 0 0 26rpx;
  border-radius: 50%;
  background: #16a34a;
}

.status-mark-char {
  color: #fff;
  font-size: 16rpx;
  font-weight: 700;
  line-height: 1;
}

.student-truant .student-status-mark,
.legend-mark.status-truant {
  background: #dc2626;
}

.student-late .student-status-mark,
.legend-mark.status-late {
  background: #d97706;
}

.student-early_leave .student-status-mark,
.legend-mark.status-early_leave {
  background: #ea580c;
}

.student-leave .student-status-mark,
.legend-mark.status-leave {
  background: #0891b2;
}

.grid-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx 22rpx;
  margin-top: 18rpx;
  padding: 16rpx 18rpx;
  border-radius: 10rpx;
  background: #f8fafc;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 7rpx;
  color: #64748b;
  font-size: 20rpx;
}

.legend-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #16a34a;
}

/* ===== 书记实到人数区域 ===== */
.attend-section {
  background: #fff;
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
}

.attend-card {
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 24rpx;
}

.attend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}

.attend-label {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.attend-value {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
  
  &.leave {
    color: #2979ff;
  }
}

.attend-divider {
  height: 1rpx;
  background: #e0e0e0;
  margin: 8rpx 0;
}

.attend-row.highlight {
  background: #fff;
  margin: 0 -24rpx;
  padding: 24rpx;
  border-radius: 12rpx;
}

.attend-input {
  flex: 1;
  font-size: 40rpx;
  color: #2979ff;
  font-weight: bold;
  text-align: right;
  padding: 0 16rpx;
}

.attend-unit {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

/* 请假学生列表 */
.leave-list {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
}

.leave-header {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 16rpx;
}

.leave-title {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.leave-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.leave-item:last-child {
  border-bottom: none;
}

.leave-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.leave-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 8rpx;
}

.leave-reason {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}

.leave-time {
  font-size: 22rpx;
  color: #999;
  margin-left: 24rpx;
  flex-shrink: 0;
}

/* ===== 拍照区域 ===== */
.photo-section {
  background: #fff;
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  box-sizing: border-box;
}

.photo-preview {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  background: #f1f5f9;
}

.photo-remove {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 25rpx;
  line-height: 36rpx;
  text-align: center;
}

.photo-label {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: hidden;
  padding: 5rpx 6rpx;
  border-radius: 0 0 8rpx 8rpx;
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  font-size: 19rpx;
  line-height: 27rpx;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #cbd5e1;
  border-radius: 8rpx;
  background: #f8fafc;
}

.photo-add-icon {
  color: #94a3b8;
  font-size: 50rpx;
  line-height: 1;
}

.photo-add-text {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 21rpx;
}

/* ===== 水印要素 ===== */
.wm-panel {
  margin-top: 16rpx;
  padding: 14rpx 18rpx;
  background: #f7fbff;
  border: 1rpx solid #e1effe;
  border-radius: 10rpx;
  position: relative;
}

.wm-row {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  line-height: 34rpx;
}

.wm-label {
  color: #909399;
  width: 120rpx;
}

.wm-value {
  color: #2979ff;
  flex: 1;
}

.wm-value.wm-pending {
  color: #e6a23c;
}

.wm-note {
  display: block;
  margin-top: 4rpx;
  padding-left: 120rpx;
  color: #e6a23c;
  font-size: 20rpx;
  line-height: 30rpx;
}

.wm-refresh {
  position: absolute;
  right: 18rpx;
  top: 14rpx;
  font-size: 22rpx;
  color: #2979ff;
}

/* ===== 空状态 ===== */
.empty-tip {
  text-align: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 26rpx;
}

/* ===== 底部确认栏 ===== */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
  z-index: 10;
}

.bb-btn {
  background: #2979ff;
  color: #fff;
  font-size: 28rpx;
  border-radius: 10rpx;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 60rpx;
}
</style>
