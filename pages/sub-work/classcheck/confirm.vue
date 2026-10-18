<template>
  <view class="page-container" @click="onPageClick">
    <!-- 抽查信息卡片 -->
    <view class="info-card">
      <view class="card-header">
        <text class="card-title">抽查记录</text>
        <text class="card-badge">待确认</text>
      </view>
      <view class="info-grid">
        <view class="info-row">
          <text class="info-label">班级</text>
          <text class="info-value">{{ checkInfo.bjmc }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">日期</text>
          <text class="info-value">{{ checkInfo.checkDate }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">节次</text>
          <text class="info-value">第{{ checkInfo.lessonNo }}节</text>
        </view>
        <view class="info-row">
          <text class="info-label">抽查人</text>
          <text class="info-value">{{ checkInfo.checkName }}（{{ formatCheckerRole(checkInfo.checkerRole) }}）</text>
        </view>
      </view>
    </view>

    <!-- 抽查统计数据 -->
    <view class="stats-card">
      <view class="stats-header">
        <text class="stats-title">抽查统计</text>
      </view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-value">{{ checkInfo.totalStudents }}</text>
          <text class="stat-label">应到</text>
        </view>
        <view class="stat-item">
          <text class="stat-value present">{{ checkInfo.presentCount }}</text>
          <text class="stat-label">实到</text>
        </view>
        <view class="stat-item">
          <text class="stat-value leave">{{ checkInfo.leaveCount }}</text>
          <text class="stat-label">请假</text>
        </view>
        <view class="stat-item">
          <text class="stat-value absent">{{ checkInfo.absentCount }}</text>
          <text class="stat-label">未到</text>
        </view>
      </view>
    </view>

    <!-- 场景判断提示 -->
    <view class="scene-tip" v-if="scene === 'counselor_checked'">
      <view class="tip-icon">ℹ️</view>
      <view class="tip-content">
        <text class="tip-title">您该节已查课</text>
        <text class="tip-desc">系统已自动比对数据，请核对差异并填写说明</text>
      </view>
    </view>

    <view class="scene-tip warning" v-if="scene === 'counselor_not_checked'">
      <view class="tip-icon">⚠️</view>
      <view class="tip-content">
        <text class="tip-title">您该节未查课</text>
        <text class="tip-desc">请提交缺勤学生名单或填写未查课说明</text>
      </view>
    </view>

    <!-- 未登记请假人员提示 -->
    <view class="scene-tip danger" v-if="unregisteredLeaves.length > 0">
      <view class="tip-icon">🚨</view>
      <view class="tip-content">
        <text class="tip-title">有未登记的请假人员</text>
        <text class="tip-desc">共{{ unregisteredLeaves.length }}人，请先登记请假</text>
      </view>
      <view class="unregistered-list">
        <view class="unregistered-item" v-for="(leave, index) in unregisteredLeaves" :key="index">
          <text class="unregistered-name">{{ leave.studentName }}</text>
          <text class="unregistered-reason">{{ leave.leaveReason || '未填写原因' }}</text>
          <button class="btn-register" size="mini" @click="registerLeave(leave)">登记</button>
        </view>
      </view>
    </view>

    <!-- 操作区域 -->
    <view class="action-section" v-if="canProceed">
      <!-- 场景1：辅导员已查课 - 显示比对结果 -->
      <view v-if="scene === 'counselor_checked'">
        <view class="compare-card">
          <view class="compare-header">
            <text class="compare-title">数据比对</text>
          </view>
          <view class="compare-row">
            <text class="compare-label">抽查统计未到</text>
            <text class="compare-value">{{ checkInfo.absentCount }}人</text>
          </view>
          <view class="compare-row">
            <text class="compare-label">我的统计未到</text>
            <text class="compare-value">{{ counselorAbsentCount }}人</text>
          </view>
          <view class="compare-row highlight" v-if="absentDiff !== 0">
            <text class="compare-label">差异</text>
            <text class="compare-value diff">{{ absentDiff > 0 ? '+' : ''}}{{ absentDiff }}人</text>
          </view>
        </view>

        <view class="remark-section">
          <text class="remark-label">差异说明</text>
          <textarea 
            class="remark-input" 
            v-model="remark" 
            placeholder="请说明数据差异原因..."
            :maxlength="200"
          />
          <text class="remark-count">{{ remark.length }}/200</text>
        </view>
      </view>

      <!-- 场晧2：辅导员未查课 - 三个操作按钮 -->
      <view v-if="scene === 'counselor_not_checked'">
        <!-- 三个操作按钮 -->
        <view class="choice-card">
          <button class="choice-btn" @click.stop="handleAbsentForm" :disabled="submitting">
            <text class="choice-icon">📝</text>
            <text class="choice-text">提交缺勤名单</text>
          </button>
          <button class="choice-btn secondary" @click.stop="handleLeaveRegister" :disabled="submitting">
            <text class="choice-icon">📋</text>
            <text class="choice-text">补登请假记录</text>
          </button>
          <button class="choice-btn tertiary" @click.stop="handleRemarkOnly" :disabled="submitting">
            <text class="choice-icon">📄</text>
            <text class="choice-text">情况说明</text>
          </button>
        </view>
      
        <!-- 缺勤名单表单 -->
        <view class="absent-form" v-if="showAbsentForm" @click.stop>
          <view class="form-header">
            <text class="form-title">缺勤学生名单</text>
            <text class="form-hint">点击学生标记状态</text>
          </view>
                
          <view class="student-grid" v-if="students.length > 0">
            <view
              v-for="(stu, i) in students"
              :key="stu.xh"
              class="student-item"
              @click.stop="submitting ? null : onStuClick(stu)"
            >
              <view :class="['student-btn', getStuClass(stu)]">
                <text class="student-name">{{ stu.studentName }}</text>
                <text :class="['student-status', getStuStatusClass(stu)]" v-if="getStuStatus(stu)">{{ getStuStatus(stu) }}</text>
              </view>
            </view>
          </view>
      
          <view class="absent-summary">
            <text>迟到：{{ lateCount }}人</text>
            <text>早退：{{ earlyCount }}人</text>
            <text>旷课：{{ truantCount }}人</text>
          </view>
        </view>
      
        <!-- 情况说明 -->
        <view class="remark-section" v-if="showRemarkOnly">
          <text class="remark-label">情况说明</text>
          <textarea 
            class="remark-input" 
            v-model="remark" 
            placeholder="请说明情况..."
            :maxlength="200"
            :disabled="submitting"
            @blur="onRemarkBlur"
          />
          <text class="remark-count">{{ remark.length }}/200</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="canProceed">
      <button class="btn-cancel" @click="goBack" :disabled="submitting">取消</button>
      <button class="btn-submit" @click="submitConfirm" :disabled="submitting">
        {{ submitting ? '提交中...' : '提交确认' }}
      </button>
    </view>
  </view>
</template>

<script>
import { getClassCheck, confirmClassCheck } from '@/api/work/classcheck'
import { getClassStudents } from '@/api/work/classcheck'
import { listLeave } from '@/api/work/leave'
import { enqueueRequest, isNetworkFailure } from '@/utils/offlineQueue'

export default {
  data() {
    return {
      checkId: null,
      checkInfo: {},
      students: [],
      clickMap: {},  // { xh: 1=迟到, 2=早退, 3=旷课 }
      remark: '',
      submitting: false,
      
      // 场景判断
      scene: 'counselor_not_checked',  // counselor_checked / counselor_not_checked
      counselorCheckId: null,  // 辅导员查课记录ID
      counselorAbsentCount: 0,
      absentDiff: 0,
      
      // 未登记请假人员
      unregisteredLeaves: [],
      
      // 表单显示
      showAbsentForm: false,
      showRemarkOnly: false,
      canProceed: false  // 是否可以继续操作
    }
  },
  computed: {
    lateCount() {
      return Object.values(this.clickMap).filter(v => v === 1).length
    },
    earlyCount() {
      return Object.values(this.clickMap).filter(v => v === 2).length
    },
    truantCount() {
      return Object.values(this.clickMap).filter(v => v === 3).length
    }
  },
  onLoad(options) {
    if (options.id) {
      this.checkId = options.id
      this.loadCheckInfo()
    }
  },
  methods: {
    // 加载查课信息
    loadCheckInfo() {
      getClassCheck(this.checkId).then(res => {
        this.checkInfo = res.data || {}
        this.checkScene()
      }).catch(err => {
        uni.showToast({ title: '加载失败', icon: 'none' })
      })
    },
    
    // 判断场景
    checkScene() {
      // TODO: 调用接口查询辅导员该节是否已查课
      // 暂时模拟逻辑
      const hasCounselorCheck = false  // 从后端获取
      
      if (hasCounselorCheck) {
        this.scene = 'counselor_checked'
        this.loadCounselorCheckData()
      } else {
        this.scene = 'counselor_not_checked'
        this.loadStudents()
      }
      
      // 检查未登记请假人员
      this.checkUnregisteredLeaves()
    },
    
    // 加载辅导员查课数据
    loadCounselorCheckData() {
      // TODO: 加载辅导员的查课记录
      this.canProceed = true
    },
    
    // 加载学生列表
    loadStudents() {
      getClassStudents(this.checkInfo.bjdm).then(res => {
        this.students = res.data || res.rows || []
        this.canProceed = true
      })
    },
    
    // 提交缺勤名单
    handleAbsentForm() {
      this.showAbsentForm = !this.showAbsentForm
      this.showRemarkOnly = false
      this.confirmType = 'absent'
      
      if (this.showAbsentForm && this.students.length === 0) {
        this.loadStudents()
      }
    },
    
    // 补登请假记录
    handleLeaveRegister() {
      uni.showToast({ title: '代学生请假请前往PC端操作', icon: 'none' })
    },
    
    // 情况说明
    handleRemarkOnly() {
      this.showRemarkOnly = !this.showRemarkOnly
      this.showAbsentForm = false
      this.confirmType = 'remark'
    },
    
    // 文本框失去焦点
    onRemarkBlur() {
      // 不自动隐藏，保持显示状态
    },
    
    // 页面点击（隐藏学生名单）
    onPageClick() {
      if (this.showAbsentForm) {
        this.showAbsentForm = false
      }
    },
    
    // 检查未登记请假人员
    checkUnregisteredLeaves() {
      const today = this.checkInfo.checkDate
      listLeave({ 
        pageNum: 1, 
        pageSize: 999, 
        bjdm: this.checkInfo.bjdm, 
        approvalStatus: 'approved' 
      }).then(res => {
        const rows = res.rows || res.data || []
        // TODO: 比对已登记的请假人员，找出未登记的
        this.unregisteredLeaves = []
      })
    },
    
    // 登记请假
    registerLeave(leave) {
      // TODO: 实现登记请假逻辑
      uni.showToast({ title: '登记成功', icon: 'success' })
      const index = this.unregisteredLeaves.indexOf(leave)
      if (index > -1) {
        this.unregisteredLeaves.splice(index, 1)
      }
    },
    
    // 学生点击
    onStuClick(stu) {
      const cur = this.clickMap[stu.xh] || 0
      const next = (cur + 1) % 4  // 0→1→2→3→0
      this.$set(this.clickMap, stu.xh, next)
    },
    
    // 获取学生样式类
    getStuClass(stu) {
      const status = this.clickMap[stu.xh] || 0
      if (status === 1) return 'status-late'
      if (status === 2) return 'status-early'
      if (status === 3) return 'status-truant'
      return 'status-normal'
    },
    
    // 获取学生状态文本
    getStuStatus(stu) {
      const status = this.clickMap[stu.xh] || 0
      if (status === 1) return '迟'
      if (status === 2) return '退'
      if (status === 3) return '旷'
      return ''
    },
    
    // 获取学生状态样式类
    getStuStatusClass(stu) {
      const status = this.clickMap[stu.xh] || 0
      if (status === 1) return 'status-late-text'
      if (status === 2) return 'status-early-text'
      if (status === 3) return 'status-truant-text'
      return ''
    },
    
    // 提交确认
    submitConfirm() {
      if (this.scene === 'counselor_checked' && !this.remark) {
        uni.showToast({ title: '请填写差异说明', icon: 'none' })
        return
      }
      
      if (this.scene === 'counselor_not_checked') {
        if (!this.confirmType) {
          uni.showToast({ title: '请选择操作方式', icon: 'none' })
          return
        }
        if (this.confirmType === 'absent' && this.truantCount === 0 && this.lateCount === 0 && this.earlyCount === 0) {
          uni.showToast({ title: '请标记缺勤学生', icon: 'none' })
          return
        }
        if (this.confirmType === 'remark' && !this.remark) {
          uni.showToast({ title: '请填写情况说明', icon: 'none' })
          return
        }
        
        // 校验人数：实到 + 请假 + 缺勤 >= 应到
        if (this.confirmType === 'absent') {
          const totalStudents = this.checkInfo.totalStudents || 0
          const presentCount = this.checkInfo.presentCount || 0
          const leaveCount = this.checkInfo.leaveCount || 0
          const absentCount = this.lateCount + this.earlyCount + this.truantCount
          
          if (presentCount + leaveCount + absentCount < totalStudents) {
            uni.showModal({
              title: '人数校验失败',
              content: `实到(${presentCount}) + 请假(${leaveCount}) + 缺勤(${absentCount}) = ${presentCount + leaveCount + absentCount}人，小于应到(${totalStudents})人，请检查`,
              showCancel: false,
              confirmText: '知道了'
            })
            return
          }
        }
      }
      
      this.submitting = true
      
      const data = {
        id: this.checkId,
        remark: this.remark,
        detailList: this.buildDetailList(),
        confirmType: this.confirmType  // absent(缺勤名单) / remark(情况说明)
      }
      
      confirmClassCheck(data).then(res => {
        uni.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      }).catch(async err => {
        if (isNetworkFailure(err)) {
          const result = await enqueueRequest({
            businessType: 'classcheck_confirm',
            title: '查课确认：' + (this.checkInfo.bjmc || this.checkInfo.bjdm),
            request: {
              url: '/api/classcheck/confirm',
              method: 'put',
              data
            }
          })
          uni.showToast({
            title: result.duplicate ? '已在待同步队列' : '网络较弱，已加入待同步',
            icon: 'none'
          })
          setTimeout(() => uni.navigateBack(), 1200)
        } else {
          uni.showToast({ title: '提交失败', icon: 'none' })
        }
      }).finally(() => {
        this.submitting = false
      })
    },
    
    // 构建明细列表
    buildDetailList() {
      if (this.scene === 'counselor_checked') {
        return []  // 已查课不需要提交明细
      }
      
      const absentTypes = { 1: 'late', 2: 'early_leave', 3: 'truant' }
      return Object.keys(this.clickMap)
        .filter(xh => this.clickMap[xh] > 0)
        .map(xh => ({
          xh,
          studentName: (this.students.find(s => s.xh === xh) || {}).studentName || '',
          absentType: absentTypes[this.clickMap[xh]] || 'truant'
        }))
    },
    
    // 返回
    goBack() {
      uni.navigateBack()
    },
    
    // 格式化抽查人角色
    formatCheckerRole(role) {
      const roleMap = {
        'secretary': '书记',
        'student_leader': '学生干部',
        'duty_staff': '值班人员',
        'leader': '领导',
        'counselor': '辅导员'
      }
      return roleMap[role] || role || '抽查人员'
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

/* 信息卡片 */
.info-card, .stats-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.card-badge {
  background: #ff9800;
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.info-row {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

/* 统计卡片 */
.stats-header {
  margin-bottom: 20rpx;
}

.stats-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  
  &.present {
    color: #4caf50;
  }
  
  &.leave {
    color: #2196f3;
  }
  
  &.absent {
    color: #f44336;
  }
}

.stat-label {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

/* 场景提示 */
.scene-tip {
  background: #e3f2fd;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: flex-start;
  
  &.warning {
    background: #fff3e0;
  }
  
  &.danger {
    background: #ffebee;
  }
}

.tip-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.tip-desc {
  font-size: 24rpx;
  color: #666;
}

/* 未登记请假列表 */
.unregistered-list {
  margin-top: 16rpx;
}

.unregistered-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 16rpx;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}

.unregistered-name {
  font-size: 28rpx;
  font-weight: 500;
  margin-right: 16rpx;
}

.unregistered-reason {
  flex: 1;
  font-size: 24rpx;
  color: #666;
}

.btn-register {
  background: #2196f3;
  color: #fff;
}

/* 比对卡片 */
.compare-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.compare-header {
  margin-bottom: 16rpx;
}

.compare-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.compare-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  
  &.highlight {
    background: #fff3e0;
    margin: 0 -20rpx;
    padding: 16rpx 20rpx;
  }
}

.compare-label {
  font-size: 26rpx;
  color: #666;
}

.compare-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  
  &.diff {
    color: #f44336;
  }
}

/* 选择卡片 */
.choice-card {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.choice-btn {
  flex: 1;
  background: #fff;
  border: 2rpx solid #2979ff;
  border-radius: 12rpx;
  padding: 30rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  &.secondary {
    border-color: #ff9800;
  }
  
  &.tertiary {
    border-color: #4caf50;
  }
  
  &[disabled] {
    opacity: 0.5;
    background: #f5f5f5;
  }
}

.choice-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.choice-text {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

/* 缺勤表单 */
.absent-form {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.form-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.form-hint {
  font-size: 24rpx;
  color: #999;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.student-item {
  .student-btn {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    padding: 14rpx 8rpx;
    border-radius: 12rpx;
    background: #e8f5e9;
    border: 2rpx solid #c8e6c9;
    height: 60rpx;
    transition: opacity 0.3s;
    
    &.status-late {
      background: #fff8e1;
      border-color: #ffe082;
    }
    
    &.status-early {
      background: #fff3e0;
      border-color: #ffcc80;
    }
    
    &.status-truant {
      background: #ffebee;
      border-color: #ef9a9a;
    }
  }
  
  .student-name {
    font-size: 24rpx;
    color: #333;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 75%;
  }
  
  .student-status {
    font-size: 20rpx;
    font-weight: bold;
    margin-left: 4rpx;
  }
  
  .status-late-text {
    color: #f3a044;
  }
  
  .status-early-text {
    color: #ff9800;
  }
  
  .status-truant-text {
    color: #e43d33;
  }
}

.absent-summary {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
  
  text {
    font-size: 24rpx;
    color: #666;
    white-space: nowrap;
    flex: 1;
    text-align: center;
  }
}

/* 说明区域 */
.remark-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.remark-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.remark-input {
  width: 100%;
  min-height: 200rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 16rpx;
  font-size: 26rpx;
  color: #333;
}

.remark-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
  
  .btn-cancel {
    flex: 1;
    background: #f5f5f5;
    color: #666;
    font-size: 28rpx;
    border-radius: 12rpx;
    height: 80rpx;
    line-height: 80rpx;
  }
  
  .btn-submit {
    flex: 2;
    background: #2979ff;
    color: #fff;
    font-size: 28rpx;
    font-weight: bold;
    border-radius: 12rpx;
    height: 80rpx;
    line-height: 80rpx;
    
    &[disabled] {
      background: #ccc;
    }
  }
}
</style>
