<template>
  <view class="page-container">
    <!-- 学生选择 -->
    <view class="form-section">
      <view class="section-title">学生信息</view>
      <view class="form-item">
        <text class="form-label required">学生</text>
        <view class="student-search-wrap">
          <input 
            class="form-input student-input" 
            v-model="stuSearchKey" 
            placeholder="输入姓名或学号搜索" 
            @input="onStudentSearch"
            @focus="onStudentFocus"
            :disabled="selectedStudent"
          />
          <uni-icons 
            v-if="selectedStudent" 
            type="closeempty" 
            size="16" 
            color="#999" 
            @click="clearStudent"
          ></uni-icons>
        </view>
      </view>
      <!-- 搜索结果下拉 -->
      <view class="student-dropdown" v-if="showStudentDropdown && studentOptions.length > 0">
        <scroll-view scroll-y class="student-list">
          <view class="student-item" v-for="stu in studentOptions" :key="stu.xh" @click="selectStudent(stu)">
            <view class="student-info">
              <text class="student-name">{{ stu.xsname }}</text>
              <text class="student-xh">{{ stu.xh }}</text>
            </view>
            <text class="student-class">{{ stu.bjjc || stu.bjmc || '' }}</text>
          </view>
        </scroll-view>
      </view>
      <!-- 已选学生信息 -->
      <view class="form-item" v-if="selectedStudent">
        <text class="form-label">班级</text>
        <text class="form-input readonly">{{ form.bjjc || form.bjmc || '-' }}</text>
      </view>
    </view>

    <!-- 请假信息 -->
    <view class="form-section">
      <view class="section-title">请假信息</view>
      <view class="type-tags">
        <view 
          v-for="type in leaveTypes" 
          :key="type.value"
          :class="['type-tag', form.leaveType === type.value ? 'active' : '']"
          @click="form.leaveType = type.value"
        >
          {{ type.label }}
        </view>
      </view>
      <view class="form-item">
        <text class="form-label">目的地</text>
        <picker mode="region" :value="regionArray" @change="onRegionChange">
          <view class="form-value-picker">
            <text :class="['form-input', destinationText ? '' : 'placeholder']">{{ destinationText || '广东省广州市越秀区' }}</text>
            <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
          </view>
        </picker>
      </view>
      <view class="form-item full">
        <text class="form-label required">事由</text>
        <textarea class="form-textarea" v-model="form.leaveReason" placeholder="请描述请假事由" maxlength="300" />
      </view>
    </view>

    <!-- 时间信息 -->
    <view class="form-section">
      <view class="section-title">时间信息</view>
      <view class="form-row-2">
        <view class="form-item">
          <text class="form-label required">离校</text>
          <picker mode="multiSelector" :value="startDateTimeIndex" :range="startDateTimeRange" @change="onStartDateTimeChange" @columnchange="onStartDateTimeColumnChange">
            <view class="form-value-picker">
              <text :class="['form-input', startDateTimeText ? '' : 'placeholder']">{{ startDateTimeText || '选择时间' }}</text>
              <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label required">返校</text>
          <picker mode="multiSelector" :value="endDateTimeIndex" :range="endDateTimeRange" @change="onEndDateTimeChange" @columnchange="onEndDateTimeColumnChange">
            <view class="form-value-picker">
              <text :class="['form-input', endDateTimeText ? '' : 'placeholder']">{{ endDateTimeText || '选择时间' }}</text>
              <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
            </view>
          </picker>
        </view>
      </view>
      <view class="form-row-2">
        <view class="form-item">
          <text class="form-label">天数</text>
          <text class="form-input readonly highlight">{{ leaveDaysText }}</text>
        </view>
        <view class="form-item">
          <text class="form-label">交通</text>
          <picker :range="transportNames" @change="onTransportChange">
            <view class="form-value-picker">
              <text :class="['form-input', form.transportType ? '' : 'placeholder']">{{ transportName || '请选择' }}</text>
              <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
            </view>
          </picker>
        </view>
      </view>
      <view class="form-item" v-if="form.transportType">
        <text class="form-label">车次</text>
        <input class="form-input" v-model="form.transportInfo" placeholder="如：G1234、CA1234" />
      </view>
    </view>

    <!-- 佐证材料 -->
    <view class="form-section">
      <view class="section-title">佐证材料</view>
      <view class="attach-row">
        <view class="attach-btn" @click="takePhoto"><text>📷 拍照</text></view>
        <view class="attach-btn" @click="chooseImage"><text>🖼 相册</text></view>
      </view>
      <view class="attach-grid" v-if="photoList.length > 0">
        <view class="attach-item attach-image" v-for="(item, idx) in photoList" :key="idx">
          <image :src="item" mode="aspectFill" class="attach-img" @click="previewPhoto(idx)"></image>
          <view class="attach-del" @click="removePhoto(idx)"><text>x</text></view>
        </view>
      </view>
      <text class="attach-tip">最多5张，每张不超过5MB</text>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-row">
      <button class="submit-btn" @click="submitForm" :loading="submitting" :disabled="submitting">提交请假</button>
    </view>
  </view>
</template>

<script>
import { applyLeave } from '@/api/stumanage/leave'
import { listStuinfo } from '@/api/stumanage/stuinfo'
import upload from '@/utils/upload'

export default {
  data() {
    return {
      form: {
        xh: '',
        xsname: '',
        sex: '',
        sfzh: '',
        xydm: '',
        xymc: '',
        zydm: '',
        zymc: '',
        bjdm: '',
        bjmc: '',
        bjjc: '',
        counselorId: null,
        counselorName: '',
        deptId: null,
        leaveType: 'sick',
        leaveReason: '',
        startTime: '',
        endTime: '',
        leaveDays: null,
        destination: '广东省广州市越秀区',
        transportType: '',
        transportInfo: ''
      },
      startDate: '',
      endDate: '',
      photoList: [],
      uploadedFiles: [],
      submitting: false,
      stuSearchKey: '',
      studentOptions: [],
      showStudentDropdown: false,
      selectedStudent: false,
      // 行政区域
      regionArray: ['广东省', '广州市', '越秀区'],
      // 日期时间选择器
      startDateTimeIndex: [0, 0, 0],
      endDateTimeIndex: [0, 0, 0],
      startDateTimeRange: [[], [], []],
      endDateTimeRange: [[], [], []],
      leaveTypes: [
        { value: 'sick', label: '病假' },
        { value: 'personal', label: '事假' },
        { value: 'other', label: '其他' }
      ],
      transportTypes: [
        { value: 'train', label: '火车' },
        { value: 'plane', label: '飞机' },
        { value: 'bus', label: '汽车' },
        { value: 'other', label: '其他' }
      ],
      // 查课信息（从抽查确认页面传入）
      checkDate: null,
      lessonNo: null
    }
  },
  computed: {
    minDate() {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return this.formatDateStr(d)
    },
    destinationText() {
      return this.regionArray.join('')
    },
    startDateTimeText() {
      if (!this.form.startTime) return ''
      return this.form.startTime.replace(/ /g, ' ')
    },
    endDateTimeText() {
      if (!this.form.endTime) return ''
      return this.form.endTime.replace(/ /g, ' ')
    },
    leaveDaysText() {
      if (this.form.leaveDays) return this.form.leaveDays + '天'
      return '-'
    },
    transportNames() {
      return this.transportTypes.map(t => t.label)
    },
    transportName() {
      const t = this.transportTypes.find(t => t.value === this.form.transportType)
      return t ? t.label : ''
    }
  },
  onLoad(options) {
    // 接收查课信息
    if (options.checkDate) {
      this.checkDate = options.checkDate
      this.lessonNo = options.lessonNo ? parseInt(options.lessonNo) : null
    }
    
    // 初始化默认日期时间
    this.initDefaultDateTime()
  },
  methods: {
    // 初始化默认日期时间
    initDefaultDateTime() {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      
      // 生成日期范围（近7天到后30天）
      const dates = []
      for (let i = -7; i <= 30; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() + i)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        dates.push(dateStr)
      }
      
      // 生成小时和分钟
      const hoursArr = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0') + '时')
      const minutesArr = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0') + '分')
      
      this.startDateTimeRange = [dates, hoursArr, minutesArr]
      this.endDateTimeRange = [dates, hoursArr, minutesArr]
      
      // 默认选中当前时间
      const dateIndex = dates.findIndex(d => d === `${year}-${month}-${day}`)
      const hourIndex = now.getHours()
      const minuteIndex = now.getMinutes()
      
      this.startDateTimeIndex = [dateIndex >= 0 ? dateIndex : 7, hourIndex, minuteIndex]
      this.endDateTimeIndex = [dateIndex >= 0 ? dateIndex : 7, hourIndex, minuteIndex]
      
      // 设置默认值
      this.form.startTime = `${year}-${month}-${day} ${hours}:${minutes}:00`
      this.form.endTime = `${year}-${month}-${day} ${hours}:${minutes}:00`
    },
    // 学生搜索
    onStudentSearch() {
      const key = this.stuSearchKey.trim()
      if (!key || key.length < 1) {
        this.studentOptions = []
        this.showStudentDropdown = false
        return
      }
      // 防抖：延迟300ms执行搜索
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.searchStudents()
      }, 300)
    },
    onStudentFocus() {
      if (this.stuSearchKey.trim() && this.studentOptions.length > 0) {
        this.showStudentDropdown = true
      }
    },
    searchStudents() {
      const key = this.stuSearchKey.trim()
      if (!key) {
        this.studentOptions = []
        this.showStudentDropdown = false
        return
      }
      // 纯数字按学号查询，否则按姓名查询
      const isNumber = /^\d+$/.test(key)
      const query = isNumber
        ? { pageNum: 1, pageSize: 20, xh: key }
        : { pageNum: 1, pageSize: 20, xsname: key }
      listStuinfo(query).then(res => {
        this.studentOptions = res.rows || []
        this.showStudentDropdown = this.studentOptions.length > 0
      }).catch(() => {
        this.studentOptions = []
        this.showStudentDropdown = false
      })
    },
    selectStudent(stu) {
      this.form.xh = stu.xh
      this.form.xsname = stu.xsname
      this.form.sex = stu.sex || ''
      this.form.bjdm = stu.bjdm || ''
      this.form.bjmc = stu.bjmc || ''
      this.form.bjjc = stu.bjjc || ''
      this.form.xymc = stu.xymc || ''
      this.form.xydm = stu.xydm || ''
      this.form.zymc = stu.zymc || ''
      this.form.zydm = stu.zydm || ''
      this.form.counselorName = stu.counselorName || ''
      this.form.counselorId = stu.counselorId || null
      this.stuSearchKey = `${stu.xsname} (${stu.xh})`
      this.selectedStudent = true
      this.showStudentDropdown = false
    },
    clearStudent() {
      this.form.xh = ''
      this.form.xsname = ''
      this.form.bjdm = ''
      this.form.bjmc = ''
      this.form.bjjc = ''
      this.stuSearchKey = ''
      this.selectedStudent = false
      this.studentOptions = []
    },
    onRegionChange(e) {
      this.regionArray = e.detail.value
      this.form.destination = this.regionArray.join('')
    },
    onTransportChange(e) {
      this.form.transportType = this.transportTypes[e.detail.value].value
    },
    onStartDateTimeChange(e) {
      const idx = e.detail.value
      this.startDateTimeIndex = idx
      const date = this.startDateTimeRange[0][idx[0]]
      const hour = this.startDateTimeRange[1][idx[1]].replace('时', '')
      const minute = this.startDateTimeRange[2][idx[2]].replace('分', '')
      this.form.startTime = `${date} ${hour}:${minute}:00`
      
      // 自动设置返校时间为离校时间 + 0.5天（+6小时）
      this.autoSetEndTime()
      
      this.calcDays()
    },
    onStartDateTimeColumnChange(e) {
      // 列变化时更新索引
    },
    onEndDateTimeChange(e) {
      const idx = e.detail.value
      this.endDateTimeIndex = idx
      const date = this.endDateTimeRange[0][idx[0]]
      const hour = this.endDateTimeRange[1][idx[1]].replace('时', '')
      const minute = this.endDateTimeRange[2][idx[2]].replace('分', '')
      this.form.endTime = `${date} ${hour}:${minute}:00`
      this.calcDays()
    },
    onEndDateTimeColumnChange(e) {
      // 列变化时更新索引
    },
    // 自动设置返校时间
    autoSetEndTime() {
      if (!this.form.startTime) return
      
      const startDate = new Date(this.form.startTime.replace(/ /g, 'T'))
      // 加6小时（0.5天）
      const endDate = new Date(startDate.getTime() + 6 * 60 * 60 * 1000)
      
      const year = endDate.getFullYear()
      const month = String(endDate.getMonth() + 1).padStart(2, '0')
      const day = String(endDate.getDate()).padStart(2, '0')
      const hours = String(endDate.getHours()).padStart(2, '0')
      const minutes = String(endDate.getMinutes()).padStart(2, '0')
      
      this.form.endTime = `${year}-${month}-${day} ${hours}:${minutes}:00`
      
      // 同步更新endDateTimeIndex
      const dateStr = `${year}-${month}-${day}`
      const dateIndex = this.endDateTimeRange[0].findIndex(d => d === dateStr)
      const hourIndex = endDate.getHours()
      const minuteIndex = endDate.getMinutes()
      
      if (dateIndex >= 0) {
        this.endDateTimeIndex = [dateIndex, hourIndex, minuteIndex]
      }
    },
    calcDays() {
      if (!this.form.startTime || !this.form.endTime) { this.form.leaveDays = null; return }
      const s = new Date(this.form.startTime.replace(/ /g, 'T'))
      const e = new Date(this.form.endTime.replace(/ /g, 'T'))
      const diffMs = e - s
      const diffHours = diffMs / (1000 * 60 * 60)
      // 按半天计算：小于4小时算0.5天，4-12小时算0.5天，12-28小时算1天，以此类推
      if (diffHours < 4) {
        this.form.leaveDays = 0.5
      } else {
        this.form.leaveDays = Math.ceil(diffHours / 12) * 0.5
      }
    },
    formatDateStr(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    // 照片
    takePhoto() {
      if (this.photoList.length >= 5) { uni.showToast({ title: '最多5张', icon: 'none' }); return }
      uni.chooseImage({
        count: 5 - this.photoList.length,
        sourceType: ['camera'],
        success: (res) => {
          res.tempFilePaths.forEach(p => { this.photoList.push(p); this.uploadPhoto(p) })
        }
      })
    },
    chooseImage() {
      if (this.photoList.length >= 5) { uni.showToast({ title: '最多5张', icon: 'none' }); return }
      uni.chooseImage({
        count: 5 - this.photoList.length,
        sourceType: ['album'],
        success: (res) => {
          res.tempFilePaths.forEach(p => { this.photoList.push(p); this.uploadPhoto(p) })
        }
      })
    },
    uploadPhoto(filePath) {
      upload({
        url: '/stumanage/attachment/upload/image',
        filePath: filePath,
        name: 'file'
      }).then(res => {
        if (res.data) {
          this.uploadedFiles.push({
            filePath: res.data.url || res.data,
            fileName: res.data.fileName || '',
            fileSize: res.data.fileSize || 0,
            fileType: res.data.fileType || 'jpg',
            mediaType: res.data.mediaType || 'image'
          })
        }
      }).catch(() => {
        uni.showToast({ title: '上传失败', icon: 'none' })
      })
    },
    removePhoto(idx) {
      this.photoList.splice(idx, 1)
      this.uploadedFiles.splice(idx, 1)
    },
    previewPhoto(idx) {
      uni.previewImage({ current: idx, urls: this.photoList })
    },
    // 提交
    submitForm() {
      if (!this.form.xh) { uni.showToast({ title: '请选择学生', icon: 'none' }); return }
      if (!this.form.leaveType) { uni.showToast({ title: '请选择请假类型', icon: 'none' }); return }
      if (!this.form.leaveReason) { uni.showToast({ title: '请填写请假事由', icon: 'none' }); return }
      if (!this.form.startTime) { uni.showToast({ title: '请选择离校时间', icon: 'none' }); return }
      if (!this.form.endTime) { uni.showToast({ title: '请选择返校时间', icon: 'none' }); return }
      
      // 验证查课时间（如果是从抽查确认页面进入）
      if (this.checkDate && this.lessonNo) {
        // 将查课日期转换为 Date 对象
        const checkDateStr = this.checkDate.replace(/-/g, '/')
        const checkStart = new Date(checkDateStr + ' 00:00:00')
        const checkEnd = new Date(checkDateStr + ' 23:59:59')
        
        // 将请假时间转换为 Date 对象
        const leaveStart = new Date(this.form.startTime.replace(/ /g, 'T'))
        const leaveEnd = new Date(this.form.endTime.replace(/ /g, 'T'))
        
        // 判断请假时间是否包含查课日期
        // 条件：请假开始时间 <= 查课结束时间 且 请假结束时间 >= 查课开始时间
        const isOverlap = leaveStart <= checkEnd && leaveEnd >= checkStart
        
        if (!isOverlap) {
          uni.showModal({
            title: '时间验证失败',
            content: '请假时间必须包含本次查课时间（' + this.checkDate + '），请修改请假时间',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }
      }

      // 由后端根据 leaveDays 自动处理审批状态，前端不再预设 approvalStatus
      // 只传 approvalLevel 作为提示给后端判断流程
      const days = this.form.leaveDays || 0
      this.form.approvalLevel = days <= 3 ? 'counselor' : 'secretary'
      delete this.form.approvalStatus  // 清除前端预设的状态，由后端 apply 接口控制

      this.submitting = true
      // 附件先上传完成后一并提交（uploadedFiles 已通过 uploadPhoto 异步上传）
      applyLeave(this.form).then(res => {
        const newId = res.data
        if (newId) {
          uni.showToast({ title: days <= 3 ? '提交成功，待审批' : '提交成功，已转上级审批', icon: 'success', duration: 2000 })
        } else {
          uni.showToast({ title: '提交成功', icon: 'success', duration: 2000 })
        }
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      }).catch(err => {
        uni.showToast({ title: '提交失败: ' + (err.msg || err.message || '未知错误'), icon: 'none', duration: 3000 })
      }).finally(() => {
        this.submitting = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 16rpx 24rpx 130rpx;
  box-sizing: border-box;
}

.form-section {
  background: #fff;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
  padding: 20rpx;
  position: relative;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

/* 请假类型标签 */
.type-tags {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.type-tag {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  background: #f5f5f5;
  border-radius: 10rpx;
  font-size: 26rpx;
  color: #666;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  &.active {
    background: #fff5f5;
    color: #e43d33;
    border-color: #e43d33;
    font-weight: 600;
  }
}

.form-row-2 {
  display: flex;
  gap: 16rpx;
  margin-bottom: 8rpx;
  .form-item {
    flex: 1;
  }
}

.form-item {
  display: flex;
  align-items: center;
  min-height: 70rpx;
  padding: 8rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
  &.full { flex-direction: column; align-items: flex-start; }
}

.form-label {
  font-size: 26rpx;
  color: #666;
  width: 110rpx;
  flex-shrink: 0;
  &.required::before { content: '*'; color: #e43d33; margin-right: 4rpx; }
}

.form-input {
  font-size: 26rpx;
  color: #333;
  flex: 1;
  text-align: right;
  &.placeholder { color: #999; }
  &.readonly { 
    color: #e43d33; 
    text-align: right; 
    font-weight: 600;
    &.highlight {
      color: #e43d33;
      font-size: 28rpx;
    }
  }
}

.student-search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.student-input {
  flex: 1;
  font-size: 26rpx;
}

.form-value-picker {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8rpx;
}

/* 学生搜索下拉 */
.student-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 0 0 12rpx 12rpx;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 400rpx;
}

.student-list {
  max-height: 400rpx;
}

.student-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 22rpx;
  border-bottom: 1rpx solid #f5f5f5;
  &:active { background: #f9f9f9; }
}

.student-info {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.student-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.student-xh {
  font-size: 22rpx;
  color: #999;
}

.student-class {
  font-size: 22rpx;
  color: #666;
}

.form-textarea {
  width: 100%;
  height: 120rpx;
  font-size: 26rpx;
  color: #333;
  padding: 14rpx;
  background: #f9f9f9;
  border-radius: 10rpx;
  box-sizing: border-box;
}

/* 附件 */
.attach-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.attach-btn {
  padding: 12rpx 22rpx;
  background: #f5f5f5;
  border-radius: 10rpx;
  font-size: 24rpx;
  color: #333;
}

.attach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.attach-item {
  position: relative;
  width: 140rpx;
  height: 140rpx;
}

.attach-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 10rpx;
}

.attach-del {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  width: 32rpx;
  height: 32rpx;
  background: #e43d33;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22rpx;
}

.attach-tip {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

/* 提交按钮 */
.submit-row {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.06);
  z-index: 50;
}

.submit-btn {
  background: linear-gradient(135deg, #e43d33, #c62828);
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  height: 84rpx;
  line-height: 84rpx;
}
</style>
