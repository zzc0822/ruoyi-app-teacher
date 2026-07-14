<template>
  <view class="rollcall-page">
    <!-- 课程信息卡片 -->
    <view class="course-card">
      <view class="card-header">
        <text class="card-title">{{ courseInfo.courseName }}</text>
        <view class="card-badges">
          <text class="card-badge" v-if="isCombined">合班课</text>
          <text class="card-badge edit-badge" v-if="isEditMode">已修改</text>
        </view>
      </view>
      <view class="card-info">
        <text class="card-info-text">{{ courseInfo.className }}</text>
        <text class="card-info-sep">|</text>
        <text class="card-info-text">{{ courseInfo.classroom }}</text>
        <text class="card-info-sep">|</text>
        <text class="card-info-text">第{{ courseInfo.startSection }}-{{ courseInfo.endSection }}节</text>
      </view>
      <view class="card-info" style="margin-top: 6rpx;">
        <text class="card-info-text">{{ courseInfo.checkDate }} 星期{{ weekdayText }}</text>
        <text class="card-info-text edit-time" v-if="isEditMode && existingCheckInfo.updateTime">（{{ existingCheckInfo.updateTime }} 修改）</text>
      </view>
    </view>

    <!-- 统计栏 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ totalStudents }}</text>
        <text class="stat-label">应到</text>
      </view>
      <view class="stat-item">
        <text class="stat-num stat-green">{{ presentCount }}</text>
        <text class="stat-label">出勤</text>
      </view>
      <view class="stat-item">
        <text class="stat-num stat-orange">{{ leaveCount }}</text>
        <text class="stat-label">请假</text>
      </view>
      <view class="stat-item">
        <text class="stat-num stat-red">{{ absentCount }}</text>
        <text class="stat-label">缺勤</text>
      </view>
    </view>

    <!-- 学生列表 -->
    <view class="student-list">
      <view
        v-for="(student, index) in studentList"
        :key="student.xh || index"
        class="student-item"
        :class="{ 'student-leave': student.status === 'leave' }"
      >
        <view class="student-info">
          <text class="student-name">{{ student.studentName || student.xm }}</text>
          <text class="student-xh">{{ student.xh }}</text>
          <text v-if="student.status === 'leave'" class="student-leave-tag">
            请假{{ student.leaveType ? '（' + student.leaveType + '）' : '' }}
          </text>
        </view>
        <view class="status-btns" v-if="student.status !== 'leave'">
          <view
            v-for="st in statusOptions"
            :key="st.value"
            class="status-btn"
            :class="{ 'status-active': student.attendStatus === st.value, ['status-' + st.type]: student.attendStatus === st.value }"
            @click="setStudentStatus(index, st.value)"
          >
            <text>{{ st.label }}</text>
          </view>
        </view>
        <view class="status-btns" v-else>
          <view class="status-btn status-leave-active">
            <text>已请假</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && studentList.length === 0" class="empty-state">
      <text class="empty-text">暂无学生数据</text>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="studentList.length > 0">
      <view class="btn-submit" :class="{ 'btn-disabled': submitting }" @click="handleSubmit">
        <text>{{ submitting ? '提交中...' : (isEditMode ? '更新点名' : '提交点名') }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { submitRollCall, getCheckStatus, getClassStudents, getLeaveStudents } from '@/api/work/rollcall'

export default {
  data() {
    return {
      courseInfo: {},
      isCombined: false,
      bjdmList: [],
      studentList: [],
      loading: true,
      submitting: false,
      isEditMode: false,
      existingCheckId: null,
      existingCheckInfo: {},
      statusOptions: [
        { label: '出勤', value: 'present', type: 'green' },
        { label: '缺勤', value: 'absent', type: 'red' },
        { label: '迟到', value: 'late', type: 'orange' },
        { label: '早退', value: 'early_leave', type: 'yellow' }
      ]
    }
  },
  computed: {
    weekdayText() {
      const days = ['日', '一', '二', '三', '四', '五', '六']
      const wd = Number(this.courseInfo.weekday)
      return days[wd] || ''
    },
    totalStudents() {
      return this.studentList.length
    },
    presentCount() {
      return this.studentList.filter(s => s.attendStatus === 'present' || s.status === 'leave').length
    },
    leaveCount() {
      return this.studentList.filter(s => s.status === 'leave').length
    },
    absentCount() {
      return this.studentList.filter(s => s.attendStatus === 'absent' || s.attendStatus === 'late' || s.attendStatus === 'early_leave').length
    }
  },
  onLoad(options) {
    this.courseInfo = {
      bjdm: decodeURIComponent(options.bjdm || ''),
      className: decodeURIComponent(options.className || ''),
      courseName: decodeURIComponent(options.courseName || ''),
      classroom: decodeURIComponent(options.classroom || ''),
      checkDate: decodeURIComponent(options.checkDate || ''),
      startSection: decodeURIComponent(options.startSection || ''),
      endSection: decodeURIComponent(options.endSection || ''),
      weekday: decodeURIComponent(options.weekday || '')
    }
    // 合班课
    if (options.bjdmList) {
      try {
        this.bjdmList = JSON.parse(decodeURIComponent(options.bjdmList)).filter(b => b)
        this.isCombined = this.bjdmList.length > 1
      } catch (e) {
        this.bjdmList = this.courseInfo.bjdm ? [this.courseInfo.bjdm] : []
      }
    } else {
      this.bjdmList = this.courseInfo.bjdm ? [this.courseInfo.bjdm] : []
    }
    // 过滤空值
    this.bjdmList = this.bjdmList.filter(b => b && b.trim())
    if (options.classNames) {
      this.courseInfo.className = decodeURIComponent(options.classNames)
    }
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        // 检查是否有有效的班级代码
        if (this.bjdmList.length === 0) {
          uni.showToast({ title: '班级信息缺失，无法加载', icon: 'none' })
          this.loading = false
          return
        }
        // 加载学生名单（合班课加载所有班级）
        let allStudents = []
        for (const bjdm of this.bjdmList) {
          if (!bjdm) continue
          const res = await getClassStudents(bjdm)
          const students = res.data || []
          allStudents = allStudents.concat(students)
        }
        // 初始化状态
        this.studentList = allStudents.map(s => ({
          ...s,
          studentName: s.studentName || s.xm || '',
          attendStatus: 'present',
          status: 'normal'
        }))

        // 加载请假学生
        for (const bjdm of this.bjdmList) {
          const leaveRes = await getLeaveStudents(bjdm, this.courseInfo.checkDate)
          const leaves = leaveRes.data || []
          leaves.forEach(l => {
            const idx = this.studentList.findIndex(s => s.xh === l.xh)
            if (idx >= 0) {
              this.studentList[idx].status = 'leave'
              this.studentList[idx].leaveType = l.leaveType === 'sick' ? '病假' : l.leaveType === 'personal' ? '事假' : '其他'
            }
          })
        }

        // 检查是否已点名
        const statusRes = await getCheckStatus(this.bjdmList[0], this.courseInfo.checkDate, Number(this.courseInfo.startSection))
        if (statusRes.data) {
          this.isEditMode = true
          this.existingCheckId = statusRes.data.id
          this.existingCheckInfo = statusRes.data
          // 恢复之前的点名状态
          const details = statusRes.data.detailList || []
          details.forEach(d => {
            const idx = this.studentList.findIndex(s => s.xh === d.xh)
            if (idx >= 0) {
              this.studentList[idx].attendStatus = d.absentType || 'absent'
            }
          })
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
      this.loading = false
    },
    setStudentStatus(index, status) {
      this.studentList[index].attendStatus = status
      // 触发响应式更新
      this.$set(this.studentList, index, { ...this.studentList[index] })
    },
    async handleSubmit() {
      if (this.submitting) return
      this.submitting = true

      try {
        // 构建缺勤明细（只提交非出勤的学生）
        const detailList = this.studentList
          .filter(s => s.attendStatus !== 'present' && s.status !== 'leave')
          .map(s => ({
            xh: s.xh,
            studentName: s.studentName || s.xm || '',
            absentType: s.attendStatus
          }))

        const absentCount = detailList.filter(d => d.absentType === 'absent').length
        const lateCount = detailList.filter(d => d.absentType === 'late' || d.absentType === 'early_leave').length

        const data = {
          bjdm: this.bjdmList[0],
          className: this.courseInfo.className,
          checkDate: this.courseInfo.checkDate,
          lessonNo: Number(this.courseInfo.startSection),
          courseName: this.courseInfo.courseName,
          classRoom: this.courseInfo.classroom,
          totalStudents: this.totalStudents,
          presentCount: this.presentCount,
          leaveCount: this.leaveCount,
          absentCount: absentCount + lateCount,
          detailList: detailList
        }

        await submitRollCall(data)
        uni.showToast({ title: this.isEditMode ? '更新成功' : '点名成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
      } catch (e) {
        uni.showToast({ title: '提交失败', icon: 'none' })
      }
      this.submitting = false
    }
  }
}
</script>

<style lang="scss" scoped>
.rollcall-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 140rpx;
}

.course-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 28rpx 32rpx;
  color: #fff;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  font-size: 34rpx;
  font-weight: 700;
}
.card-badges {
  display: flex;
  gap: 12rpx;
}
.card-badge {
  background: rgba(255,255,255,0.25);
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.edit-badge {
  background: rgba(255, 193, 7, 0.9);
  color: #fff;
  font-weight: 500;
}
.edit-time {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 8rpx;
}
.card-info {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}
.card-info-text {
  font-size: 26rpx;
  color: rgba(255,255,255,0.85);
}
.card-info-sep {
  margin: 0 12rpx;
  color: rgba(255,255,255,0.4);
}

.stats-bar {
  display: flex;
  background: #fff;
  margin: 0 20rpx;
  border-radius: 12rpx;
  padding: 24rpx 0;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}
.stat-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}
.stat-green { color: #67C23A; }
.stat-orange { color: #E6A23C; }
.stat-red { color: #F56C6C; }

.student-list {
  margin: 20rpx;
}
.student-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.student-leave {
  opacity: 0.6;
  background: #fafafa;
}
.student-info {
  display: flex;
  align-items: center;
  flex: 1;
}
.student-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.student-xh {
  font-size: 24rpx;
  color: #999;
  margin-left: 16rpx;
}
.student-leave-tag {
  font-size: 22rpx;
  color: #E6A23C;
  margin-left: 12rpx;
  background: #fdf6ec;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.status-btns {
  display: flex;
  gap: 10rpx;
}
.status-btn {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
  color: #666;
}
.status-active {
  color: #fff;
}
.status-green { background: #67C23A; }
.status-red { background: #F56C6C; }
.status-orange { background: #E6A23C; }
.status-yellow { background: #f0c020; }
.status-leave-active {
  background: #fdf6ec;
  color: #E6A23C;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}
.empty-text {
  font-size: 28rpx;
  color: #c0c4cc;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 40rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
}
.btn-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
}
.btn-disabled {
  opacity: 0.6;
}
</style>
