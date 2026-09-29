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
      <view class="header-row" v-if="form.courseName || form.classRoom || form.classTeacher">
        <text class="h-course">{{ form.courseName }} {{ form.classRoom ? '| ' + form.classRoom : '' }} {{ form.classTeacher ? '| ' + form.classTeacher : '' }}</text>
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
      <view v-if="students.length > 0" style="overflow:hidden;">
        <view
          v-for="(stu, i) in students"
          :key="stu.xh"
          style="display:inline-block;width:25%;box-sizing:border-box;padding:6rpx;vertical-align:top;"
          @click="onStuClick(stu)"
        >
          <view :style="'display:flex;align-items:center;justify-content:center;padding:14rpx 4rpx;border-radius:12rpx;height:60rpx;' + stuBg(stu)">
            <text style="font-size:24rpx;color:#333;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80%;">{{ stu.studentName }}</text>
            <text v-if="isOnLeave(stu.xh)" style="font-size:20rpx;color:#2979ff;margin-left:4rpx;font-weight:bold;">假</text>
            <text v-else-if="getClickCount(stu.xh) === 1" style="font-size:20rpx;color:#f3a044;margin-left:4rpx;font-weight:bold;">迟</text>
            <text v-else-if="getClickCount(stu.xh) === 2" style="font-size:20rpx;color:#ff9800;margin-left:4rpx;font-weight:bold;">退</text>
            <text v-else-if="getClickCount(stu.xh) >= 3" style="font-size:20rpx;color:#e43d33;margin-left:4rpx;font-weight:bold;">旷</text>
          </view>
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
      <view class="leave-list" v-if="leaveList.length > 0">
        <view class="leave-header">
          <text class="leave-title">请假学生（{{ leaveList.length }}人）</text>
        </view>
        <view class="leave-item" v-for="(leave, index) in leaveList" :key="index">
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
      <view style="display:flex;flex-wrap:wrap;gap:16rpx;">
        <view v-for="(item, idx) in photoList" :key="idx" style="position:relative;width:200rpx;height:200rpx;">
          <image :src="item.thumbUrl || item.url" mode="aspectFill" style="width:200rpx;height:200rpx;border-radius:12rpx;"></image>
          <view @click="removePhoto(idx)" style="position:absolute;top:-12rpx;right:-12rpx;width:40rpx;height:40rpx;background:#e43d33;border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <text style="color:#fff;font-size:24rpx;line-height:40rpx;text-align:center;">x</text>
          </view>
          <text style="display:block;text-align:center;font-size:20rpx;color:#666;margin-top:4rpx;">{{ item.label }}</text>
        </view>
        <view v-if="photoList.length < 4" @click="onTakePhoto" style="width:200rpx;height:200rpx;border:2rpx dashed #ccc;border-radius:12rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <text style="font-size:60rpx;color:#ccc;line-height:1;">+</text>
          <text style="font-size:22rpx;color:#999;margin-top:8rpx;">拍照上传</text>
        </view>
      </view>
      <!-- 水印要素：拍照前确认 -->
      <view class="wm-panel" v-if="watermarkConfig && watermarkConfig.enabled === '1'">
        <view class="wm-row">
          <text class="wm-label">水印时间</text>
          <text class="wm-value" :class="{ 'wm-pending': !captureInfo }">{{ captureInfo ? captureInfo.time : '待确认' }}</text>
        </view>
        <view class="wm-row">
          <text class="wm-label">水印地址</text>
          <text class="wm-value" :class="{ 'wm-pending': !captureInfo || !captureInfo.address }">{{ (captureInfo && captureInfo.address) || '待确认' }}</text>
        </view>
        <text class="wm-refresh" @click="refreshWatermarkInfo">重新定位</text>
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
    <!-- 水印Canvas（离屏） -->
    <canvas canvas-id="watermarkCanvas" style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"></canvas>
  </view>
</template>

<script>
import { getMyClasses, getClassStudents, addClassCheck, updateClassCheck, getClassCheck, checkDuplicate } from '@/api/work/classcheck'
import { listClassinfo } from '@/api/work/classinfo'
import { listLeave } from '@/api/work/leave'
import { getMajorList } from '@/api/student/stats'
import { getTeacherinfoByUserId } from '@/api/work/teacherinfo'
import { getActiveSchedule } from '@/api/work/schedule'
import upload from '@/utils/upload'
import request from '@/utils/request'
import config from '@/config'
import { isSecretary } from '@/utils/role'
import { getWatermarkConfig } from '@/api/work/watermark'
import { addWatermark, prepareCapture } from '@/utils/watermark'

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
      clickMap: {},     // { xh: 点击次数 } 0=到课, 1=迟到, 2=早退, 3+=旷课
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
      photoList: [],  // [{url, thumbUrl, label, attachment: {filePath,fileName,fileSize,fileType,mediaType,exifData,sortOrder}}]
      photoLabels: ['教室前方', '教室后方', '补充照片', '补充照片'],
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
      captureInfo: null       // 拍照前已确认的水印取证信息（时间+地址）
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
    leaveCount() {
      return this.leaveXhSet.length
    },
    absentCount() {
      return Object.keys(this.clickMap).filter(xh => this.clickMap[xh] > 0).length
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
    this.checkRole()
    this.loadScheduleTimes()
    // 加载水印配置
    this.watermarkConfigPromise = getWatermarkConfig('classcheck').then(res => {
      this.watermarkConfig = res.data
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
    if (options.id) {
      this.editId = options.id
      this._explicitEdit = true  // 从列表点击进来的，锁定编辑模式
      this.loadDetail(options.id)
    }
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
          const xydm = teacherRes.data?.xydm
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
          this.form.remark = data.remark || ''
          this.loadStudents(data.bjdm)
          if (data.detailList) {
            data.detailList.forEach(d => {
              const typeMap = { late: 1, early_leave: 2, truant: 3 }
              this.$set(this.clickMap, d.xh, typeMap[d.absentType] || 3)
            })
          }
          // 加载已有附件
          this.loadAttachments(id)
        }
      }).catch(() => {})
    },
    onClassChange(e) {
      const idx = e.detail.value
      // 使用筛选后的班级列表
      const cls = this.filteredClassList[idx]
      if (cls) {
        this.form.bjdm = cls.bjdm
        this.form.bjmc = cls.bjname || ''
        this.clickMap = {}
        this.loadStudents(cls.bjdm)
        // 选班后检查是否已有查课记录
        this.checkExistingRecord()
      }
    },
    onDateChange(e) {
      this.form.checkDate = e.detail.value
      this.checkExistingRecord()
    },
    onLessonChange(e) {
      this.lessonIndex = e.detail.value
      this.form.lessonNo = this.lessonIndex + 1
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
        this.restoreDraft()
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
      // 循环：0(到课) → 1(迟到) → 2(早退) → 3(旷课) → 0(到课)
      const next = (cur + 1) % 4
      this.$set(this.clickMap, stu.xh, next)
    },
    // 保存草稿到本地缓存
    saveDraft() {
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
    submitForm() {
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
    doSubmit(existingId) {
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
        const absentTypes = { 1: 'late', 2: 'early_leave', 3: 'truant' }
        detailList = Object.keys(this.clickMap)
          .filter(xh => this.clickMap[xh] > 0)
          .map(xh => ({
            xh,
            studentName: (this.students.find(s => s.xh === xh) || {}).studentName || '',
            absentType: absentTypes[this.clickMap[xh]] || 'truant'
          }))
        totalStudents = this.students.length
        absentCount = detailList.length
        presentCount = totalStudents - absentCount - this.leaveCount
      }
      
      // 获取当前用户信息
      const store = this.$store
      const userId = store.state.user.id || store.state.user.userId || ''
      const userName = store.state.user.name || store.state.user.nickName || ''
      
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
        attachmentList: this.photoList.map((p, i) => ({
          businessType: 'classcheck',
          fileName: p.attachment.fileName,
          filePath: p.attachment.filePath,
          fileSize: p.attachment.fileSize,
          fileType: p.attachment.fileType,
          mediaType: p.attachment.mediaType || 'image',
          exifData: p.attachment.exifData || '',
          sortOrder: i + 1
        }))
      }
      let request
      if (existingId) {
        data.id = existingId
        request = updateClassCheck(data)
      } else if (this.editId) {
        data.id = this.editId
        request = updateClassCheck(data)
      } else {
        request = addClassCheck(data)
      }
      request.then(() => {
        const key = 'checkDraft_' + this.form.bjdm + '_' + this.form.checkDate + '_' + this.form.lessonNo
        uni.removeStorageSync(key)
        this.$modal.msgSuccess(existingId ? '修改成功' : '记录成功')
        
        // 通知首页刷新待办和统计
        uni.$emit('refreshHomeData')
        
        setTimeout(() => { uni.navigateBack() }, 800)
      }).catch(() => {
        this.$modal.msgError('提交失败')
      }).finally(() => {
        this.submitting = false
      })
    },
    loadAttachments(checkId) {
      request({
        url: '/stumanage/classcheck/attachment/' + checkId,
        method: 'get'
      }).then(res => {
        const list = res.data || []
        this.photoList = list.map((att, i) => ({
          url: att.thumbnailBase64 || '',
          thumbUrl: att.thumbnailBase64 || '',
          label: i < this.photoLabels.length ? this.photoLabels[i] : '补充照片',
          attachment: {
            fileName: att.fileName || '',
            filePath: att.filePath || '',
            fileSize: att.fileSize || 0,
            fileType: att.fileType || '',
            mediaType: att.mediaType || 'image',
            exifData: att.exifData || ''
          }
        }))
      }).catch(() => {})
    },
    // 点击拍照：先确认水印要素，再打开相机
    async onTakePhoto() {
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
      // 已有确认信息时直接复用，避免重复定位
      if (this.captureInfo) {
        return true
      }
      uni.showLoading({ title: '定位并确认水印...' })
      const result = await prepareCapture(config, this.form.classRoom)
      uni.hideLoading()
      if (!result.ready) {
        uni.showToast({ title: result.message, icon: 'none', duration: 2500 })
        return false
      }
      this.captureInfo = result.captureInfo
      return true
    },
    refreshWatermarkInfo() {
      this.captureInfo = null
      this.ensureWatermarkReady()
    },
    takePhoto() {
      uni.chooseImage({
        count: 1,
        sourceType: ['camera'],
        sizeType: ['compressed'],
        success: async (res) => {
          let tempPath = res.tempFilePaths[0]
          // 水印：拍照前已确认的时间与地址
          if (this.watermarkConfig && this.watermarkConfig.enabled === '1') {
            uni.showLoading({ title: '添加水印...' })
            tempPath = await addWatermark(tempPath, this.watermarkConfig, this.captureInfo)
            uni.hideLoading()
          }
          this.compressAndUpload(tempPath)
        }
      })
    },
    compressAndUpload(filePath) {
      uni.showLoading({ title: '压缩中...' })
      uni.compressImage({
        src: filePath,
        quality: 70,
        success: (res) => {
          uni.hideLoading()
          // 压缩成功，用压缩后的路径上传
          this.uploadPhoto(res.tempFilePath)
        },
        fail: () => {
          uni.hideLoading()
          // 压缩失败，直接用原图上传
          this.uploadPhoto(filePath)
        }
      })
    },
    uploadPhoto(filePath) {
      uni.showLoading({ title: '上传中...' })
      upload({
        url: '/api/attachment/upload',  // 使用通用附件上传API
        filePath: filePath,
        name: 'file',
        formData: { businessType: 'classcheck', bjdm: this.form.bjdm || '' }
      }).then(res => {
        uni.hideLoading()
        const data = res.data
        if (data) {
          const idx = this.photoList.length
          const label = idx < this.photoLabels.length ? this.photoLabels[idx] : '补充照片'
          this.photoList.push({
            url: filePath,
            thumbUrl: data.thumbnailPath ? (config.baseUrl + data.thumbnailPath) : filePath,
            label: label,
            attachment: {
              fileName: data.fileName || '',
              filePath: data.filePath || '',
              fileSize: data.fileSize || 0,
              fileType: data.fileType || '',
              mediaType: data.mediaType || 'image',
              exifData: data.exifData || ''
            }
          })
        }
      }).catch(() => {
        uni.hideLoading()
        this.$modal.msgError('照片上传失败')
      })
    },
    removePhoto(idx) {
      this.photoList.splice(idx, 1)
      // 重新修正标签
      this.photoList.forEach((p, i) => {
        p.label = i < this.photoLabels.length ? this.photoLabels[i] : '补充照片'
      })
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
  padding-bottom: 120rpx;
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

.h-course {
  font-size: 22rpx;
  color: #999;
  margin-left: 60rpx;
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
