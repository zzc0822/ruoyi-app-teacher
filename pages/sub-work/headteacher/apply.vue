<template>
  <view class="page-container">
    <!-- 教师侧信息全部按登录人档案回填，提交时后端再取一次，页面上只给看不给改 -->
    <view class="info-card" v-if="me.teacherName">
      <view class="info-head">
        <text class="info-name">{{ me.teacherName }}</text>
        <text class="info-tag">{{ me.jsxz || '性质未登记' }}</text>
        <text class="info-tag" :class="me.sfzg === '1' ? 'ok' : 'bad'">{{ me.sfzg === '1' ? '在岗' : '不在岗' }}</text>
      </view>
      <view class="info-line" v-for="(f, fi) in meFields" :key="fi">
        <text class="info-label">{{ f.label }}</text>
        <text class="info-value" :class="{ dim: f.dim }">{{ f.value }}</text>
      </view>
      <text class="info-tip">以上信息取自登录教师档案，如需更正请到「教师档案」页修改</text>
    </view>

    <view class="tips-card">
      <text class="tips-text">申请通过后由学院为您分配班级，资格有效期至 {{ qualifyTip }}</text>
      <text class="tips-line" v-if="qual">{{ academicYearText }}已提交 {{ qual.yearCnt || 0 }} / {{ maxPerYearText }} 份{{ quotaFull ? '，已达上限' : '' }}</text>
    </view>

    <view class="tips-card" :class="qual && !qual.ok ? 'warn' : ''" v-if="qual">
      <text class="tips-text" :class="qual && !qual.ok ? 'warn-text' : 'ok-text'">
        {{ qual && !qual.ok ? '档案暂不满足全校申请门槛' : '档案已满足当前申请门槛' }}
      </text>
      <text class="tips-line" v-for="(r, ri) in qual.reasons" :key="ri">{{ ri + 1 }}. {{ r }}</text>
      <text class="tips-line" v-if="qual && !qual.ok">可先在教师档案里补齐上述信息，或请学院在管理端代录并填写特批原因。</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="form-label required">申请学院</text>
        <view class="chip-group">
          <view
            class="chip"
            :class="{ active: form.applyXydm === item.xydm }"
            v-for="(item, idx) in collegeList"
            :key="idx"
            @click="selectCollege(item)"
          >
            <text class="chip-name">{{ item.collegeName }}</text>
            <text class="chip-sub">{{ item.selfFlag == 1 ? '本院' : '跨院' }} · 空岗{{ item.openCount || 0 }}</text>
          </view>
        </view>
        <view class="empty-inline" v-if="collegeList.length === 0">
          <text>暂无可选学院</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">期望年级</text>
        <view class="chip-group">
          <view class="chip small" :class="{ active: !form.expectNj }" @click="form.expectNj = ''">
            <text class="chip-name">不限</text>
          </view>
          <view
            class="chip small"
            :class="{ active: form.expectNj === y }"
            v-for="(y, idx) in gradeOptions"
            :key="idx"
            @click="form.expectNj = y"
          >
            <text class="chip-name">{{ y }}级</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">带班意愿</text>
        <view class="chip-group">
          <view class="chip small" :class="{ active: form.acceptFreshman === '1' }" @click="toggleWish('acceptFreshman')">
            <text class="chip-name">愿带新生</text>
          </view>
          <view class="chip small" :class="{ active: form.acceptAdjust === '1' }" @click="toggleWish('acceptAdjust')">
            <text class="chip-name">服从调剂</text>
          </view>
          <view class="chip small" :class="{ active: form.canStay === '1' }" @click="toggleWish('canStay')">
            <text class="chip-name">可住学生公寓</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">承诺任职年限</text>
        <view class="chip-group">
          <view
            class="chip small"
            :class="{ active: form.commitYears === y }"
            v-for="(y, idx) in yearOptions"
            :key="idx"
            @click="pickNumber('commitYears', y)"
          >
            <text class="chip-name">{{ y }}年</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">每月到班频次</text>
        <view class="chip-group">
          <view
            class="chip small"
            :class="{ active: form.monthlyVisit === v }"
            v-for="(v, idx) in visitOptions"
            :key="idx"
            @click="pickNumber('monthlyVisit', v)"
          >
            <text class="chip-name">{{ v }}次</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">紧急可达时段</text>
        <view class="chip-group">
          <view
            class="chip small"
            :class="{ active: form.reachablePeriod === p }"
            v-for="(p, idx) in periodOptions"
            :key="idx"
            @click="pickText('reachablePeriod', p)"
          >
            <text class="chip-name">{{ p }}</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">紧急联系电话</text>
        <input class="form-input" type="number" v-model="form.emergencyPhone" placeholder="应急可接通的号码，可与档案不同" maxlength="20" />
      </view>

      <view class="form-item">
        <text class="form-label">学生工作经历</text>
        <textarea class="form-textarea short" v-model="form.workExperience" placeholder="曾任班主任、辅导员助理、社团指导等" :maxlength="200" />
      </view>

      <view class="form-item">
        <text class="form-label">相关获奖</text>
        <textarea class="form-textarea short" v-model="form.awards" placeholder="思政、带班、指导学生竞赛等奖项" :maxlength="200" />
      </view>

      <view class="form-item">
        <text class="form-label required">申请理由</text>
        <textarea
          class="form-textarea"
          v-model="form.applyReason"
          placeholder="请说明任教课程、学生工作经历等"
          :maxlength="500"
        />
        <text class="counter">{{ reasonLen }}/500</text>
      </view>

      <view class="form-item">
        <text class="form-label">资格佐证照片</text>
        <view class="photo-grid">
          <view class="photo-cell" v-for="(p, pi) in photoList" :key="pi">
            <image class="photo-img" :src="p.url" mode="aspectFill" @click="previewPhoto(pi)" />
            <text class="photo-del" @click="removePhoto(pi)">×</text>
          </view>
          <view class="photo-add" v-if="photoList.length < 5" @click="choosePhoto">
            <text class="photo-add-icon">+</text>
            <text class="photo-add-text">最多 5 张</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <view class="agree-line" @click="toggleWish('ethicsPledge')">
          <text class="agree-box" :class="{ checked: form.ethicsPledge === '1' }">{{ form.ethicsPledge === '1' ? '✓' : '' }}</text>
          <text class="agree-text">我承诺遵守高校教师职业道德规范，无师德失范记录</text>
        </view>
      </view>
    </view>

    <!-- 我的申请记录 -->
    <view class="section" v-if="applyList.length > 0">
      <view class="section-header">
        <text class="section-title">我的申请</text>
      </view>
      <view class="apply-item" v-for="(item, idx) in applyList" :key="idx">
        <view class="apply-main">
          <view class="apply-line">
            <text class="apply-college">{{ item.applyCollegeName || item.applyXydm }}</text>
            <text class="apply-cross" v-if="item.acceptCross === '1'">跨院</text>
          </view>
          <text class="apply-sub">
            {{ item.expectNj ? item.expectNj + '级' : '年级不限' }} · 提交于 {{ formatDate(item.createTime) }}
          </text>
          <text class="apply-sub" v-if="item.status === '1'">
            {{ item.assignedFlag > 0 ? '已带班（' + item.assignClassNames + '）' : '待学院分配班级' }}
          </text>
          <!-- 驳回行把审批人带在前面，教师不用点进详情也知道是谁给的意见 -->
          <text class="apply-sub danger" v-if="item.status === '2' && item.reviewRemark">
            {{ (item.reviewName || item.reviewBy || '学院') }}：{{ item.reviewRemark }}
          </text>
        </view>
        <view class="apply-status" :class="statusClass(item.status)">{{ statusText(item.status) }}</view>
      </view>
    </view>

    <view class="btn-group">
      <button class="btn-submit" :loading="submitting" @click="submit">提交申请</button>
    </view>
  </view>
</template>

<script>
import { getCollegeOptions, getMyApply, getApplyQualification } from '@/api/affair/headteacher'
import { enqueueRequest, flushOfflineQueue } from '@/utils/offlineQueue'

export default {
  data() {
    return {
      submitting: false,
      collegeList: [],
      applyList: [],
      // 提交前自检结果：{ok, reasons[], teacher, rule}，不达标时直接在页面上说明
      qual: null,
      photoList: [],
      yearOptions: [1, 2, 3, 5],
      visitOptions: [1, 2, 4, 6],
      periodOptions: ['工作日白天', '工作日晚间', '周末', '24小时'],
      form: {
        applyXydm: '',
        expectNj: '',
        applyReason: '',
        acceptFreshman: '0',
        acceptAdjust: '0',
        canStay: '0',
        ethicsPledge: '0',
        commitYears: null,
        monthlyVisit: null,
        reachablePeriod: '',
        emergencyPhone: '',
        workExperience: '',
        awards: ''
      }
    }
  },
  computed: {
    me() {
      return (this.qual && this.qual.teacher) || {}
    },
    meFields() {
      const m = this.me
      const dash = v => (v === undefined || v === null || v === '' ? '未登记' : v)
      const items = [
        { label: '工号', value: dash(m.gh) },
        { label: '所属学院', value: m.collegeName || m.xydm || '未登记' },
        { label: '职称', value: dash(m.zcText || m.zc) },
        { label: '学历', value: dash(m.xl) },
        { label: '政治面貌', value: dash(m.zzmm) },
        { label: '入职', value: dash(m.rzsj) },
        { label: '从教', value: m.years === undefined || m.years === null ? '未知' : m.years + ' 年' }
      ]
      items.forEach(item => {
        item.dim = item.value === '未登记' || item.value === '未知'
      })
      return items
    },
    maxPerYearText() {
      const max = Number((this.qual || {}).maxPerYear)
      return max > 0 ? max : '不限'
    },
    // 学年串由后端给（9月起算），前端不另算一套免得跨年时对不上
    academicYearText() {
      const y = (this.qual || {}).academicYear
      return y ? y + ' 学年' : '本学年'
    },
    quotaFull() {
      const qual = this.qual || {}
      const max = Number(qual.maxPerYear)
      return max > 0 && Number(qual.yearCnt || 0) >= max
    },
    reasonLen() {
      return (this.form.applyReason || '').length
    },
    gradeOptions() {
      const y = new Date().getFullYear()
      return [0, 1, 2, 3, 4].map(i => String(y - i))
    },
    qualifyTip() {
      const d = new Date()
      const deadline = d.getMonth() >= 8 ? `${d.getFullYear() + 1}-08-31` : `${d.getFullYear()}-08-31`
      return deadline
    }
  },
  onLoad() {
    this.loadColleges()
    this.loadApply()
    this.loadQualification()
  },
  methods: {
    loadColleges() {
      getCollegeOptions().then(res => {
        this.collegeList = res.data || []
        const self = this.collegeList.find(c => c.selfFlag == 1)
        if (self && !this.form.applyXydm) {
          this.form.applyXydm = self.xydm
        }
      }).catch(() => {})
    },
    loadQualification() {
      getApplyQualification().then(res => {
        this.qual = res.data || null
      }).catch(() => {})
    },
    loadApply() {
      getMyApply().then(res => {
        // 已撤回的不展示
        this.applyList = (res.data || []).filter(i => i.status !== '3')
      }).catch(() => {})
    },
    selectCollege(item) {
      this.form.applyXydm = item.xydm
    },
    toggleWish(field) {
      this.form[field] = this.form[field] === '1' ? '0' : '1'
    },
    pickNumber(field, value) {
      this.form[field] = this.form[field] === value ? null : value
    },
    pickText(field, value) {
      this.form[field] = this.form[field] === value ? '' : value
    },
    choosePhoto() {
      uni.chooseImage({
        count: 5 - this.photoList.length,
        sizeType: ['compressed'],
        success: (res) => {
          res.tempFilePaths.forEach(path => {
            this.photoList.push({
              url: path,
              localPath: path,
              attachment: {
                fileName: '',
                filePath: '',
                fileSize: 0,
                fileType: '',
                mediaType: 'image'
              }
            })
          })
        }
      })
    },
    removePhoto(idx) {
      this.photoList.splice(idx, 1)
    },
    previewPhoto(idx) {
      uni.previewImage({ urls: this.photoList.map(p => p.url), current: idx })
    },
    validate() {
      if (!this.form.applyXydm) {
        uni.showToast({ title: '请选择申请学院', icon: 'none' })
        return false
      }
      if (!this.form.applyReason || !this.form.applyReason.trim()) {
        uni.showToast({ title: '请填写申请理由', icon: 'none' })
        return false
      }
      return true
    },
    submit() {
      if (!this.validate()) return
      // 每学年份数上限是额度规则而非档案门槛，先在本地给结论，后端 insert 再兜一次
      if (this.quotaFull) {
        uni.showToast({ title: this.academicYearText + '已提交 ' + this.qual.yearCnt + ' 份，每人每学年最多 ' + this.maxPerYearText + ' 份', icon: 'none', duration: 3000 })
        return
      }
      // 门槛由配置决定，本人提交不能越过，先给结论再让后端兜底
      if (this.qual && !this.qual.ok) {
        const first = (this.qual.reasons && this.qual.reasons[0]) || '不符合申请门槛'
        uni.showToast({ title: first, icon: 'none', duration: 3000 })
        return
      }
      const data = {
        applyXydm: this.form.applyXydm,
        expectNj: this.form.expectNj || null,
        applyReason: this.form.applyReason,
        acceptFreshman: this.form.acceptFreshman,
        acceptAdjust: this.form.acceptAdjust,
        canStay: this.form.canStay,
        ethicsPledge: this.form.ethicsPledge,
        commitYears: this.form.commitYears,
        monthlyVisit: this.form.monthlyVisit,
        reachablePeriod: this.form.reachablePeriod || null,
        emergencyPhone: this.form.emergencyPhone || null,
        workExperience: this.form.workExperience || null,
        awards: this.form.awards || null,
        attachmentList: this.photoList.map(p => p.attachment)
      }
      const uploads = this.photoList.map((item, index) => ({
        localPath: item.localPath,
        uploadUrl: '/api/headteacher/apply/attachment',
        field: 'file',
        dataPathPrefix: 'attachmentList[' + index + ']'
      }))
      this.submitting = true
      enqueueRequest({
        businessType: 'headteacher_apply',
        title: '班主任申请',
        request: {
          url: '/api/headteacher/apply',
          method: 'post',
          data
        },
        uploads
      }).then(result => {
        flushOfflineQueue()
        uni.showToast({ title: result.duplicate ? '申请已在后台处理' : '已提交，附件后台上传', icon: 'none' })
        this.form.applyReason = ''
        this.photoList = []
        this.loadApply()
        this.loadQualification()
      }).catch(() => {
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
      }).finally(() => {
        this.submitting = false
      })
    },
    statusText(status) {
      const map = { '0': '待审核', '1': '已通过', '2': '已驳回' }
      return map[status] || '未知'
    },
    statusClass(status) {
      const map = { '0': 'pending', '1': 'success', '2': 'danger' }
      return map[status] || ''
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return dateStr.substring(0, 10)
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

.tips-card {
  background: #ecf3ff;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 20rpx;

  &.warn {
    background: #fdf0ef;
  }
}

/* 基本信息卡：姓名与身份徽标同排，其余字段左标签右值，读得动也压得住高度 */
.info-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 20rpx;
}

.info-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10rpx;
}

.info-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-right: 14rpx;
}

.info-tag {
  font-size: 20rpx;
  color: #2979ff;
  background: #ecf3ff;
  border-radius: 6rpx;
  padding: 4rpx 12rpx;
  margin-right: 10rpx;

  &.ok {
    color: #18bc37;
    background: #e9f8ee;
  }

  &.bad {
    color: #e43d33;
    background: #fdf0ef;
  }
}

.info-line {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}

.info-label {
  width: 130rpx;
  flex: none;
  font-size: 24rpx;
  color: #999;
}

.info-value {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #333;

  &.dim {
    color: #bbb;
  }
}

.info-tip {
  display: block;
  margin-top: 14rpx;
  font-size: 20rpx;
  color: #bbb;
  line-height: 30rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #2979ff;
  line-height: 34rpx;

  &.warn-text {
    color: #e43d33;
    font-weight: 500;
  }

  &.ok-text {
    color: #18bc37;
  }
}

.tips-line {
  display: block;
  font-size: 22rpx;
  color: #666;
  line-height: 32rpx;
  margin-top: 6rpx;
}

.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.form-item {
  margin-bottom: 28rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 16rpx;
  display: block;

  /* 只有必填项挂星号，扩出来的意愿栏都是可选 */
  &.required::before {
    content: '* ';
    color: #e43d33;
  }
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.chip {
  padding: 14rpx 20rpx;
  background: #f5f6f7;
  border-radius: 10rpx;
  border: 2rpx solid #f5f6f7;

  &.small {
    padding: 10rpx 22rpx;
  }

  &.active {
    background: #ecf3ff;
    border-color: #2979ff;

    .chip-name {
      color: #2979ff;
    }
  }
}

.chip-name {
  font-size: 26rpx;
  color: #333;
  display: block;
}

.chip-sub {
  font-size: 20rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.empty-inline {
  font-size: 24rpx;
  color: #999;
  padding: 16rpx 0;
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

  &.short {
    min-height: 120rpx;
  }
}

.form-input {
  font-size: 26rpx;
  color: #333;
  width: 100%;
  height: 72rpx;
  padding: 0 16rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-cell {
  position: relative;
  width: 150rpx;
  height: 150rpx;
}

.photo-img {
  width: 150rpx;
  height: 150rpx;
  border-radius: 8rpx;
}

.photo-del {
  position: absolute;
  top: -12rpx;
  right: -6rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 32rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 26rpx;
}

.photo-add {
  width: 150rpx;
  height: 150rpx;
  border: 1rpx dashed #dcdfe6;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.photo-add-icon {
  font-size: 40rpx;
  color: #bbb;
  line-height: 44rpx;
}

.photo-add-text {
  font-size: 20rpx;
  color: #bbb;
}

.agree-line {
  display: flex;
  align-items: center;
}

.agree-box {
  width: 34rpx;
  height: 34rpx;
  line-height: 30rpx;
  text-align: center;
  border: 2rpx solid #dcdfe6;
  border-radius: 6rpx;
  color: #fff;
  font-size: 24rpx;
  margin-right: 12rpx;

  &.checked {
    background: #2979ff;
    border-color: #2979ff;
  }
}

.agree-text {
  font-size: 24rpx;
  color: #666;
  line-height: 34rpx;
}

.counter {
  font-size: 22rpx;
  color: #bbb;
  text-align: right;
  display: block;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 20rpx;
}

.section-header {
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.apply-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f2f3f5;

  &:last-child {
    border-bottom: none;
  }
}

.apply-main {
  flex: 1;
  min-width: 0;
}

.apply-line {
  display: flex;
  align-items: center;
}

.apply-college {
  font-size: 27rpx;
  color: #333;
  font-weight: 500;
}

.apply-cross {
  font-size: 20rpx;
  color: #f3a044;
  background: #fdf3e6;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-left: 12rpx;
}

.apply-sub {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 6rpx;

  &.danger {
    color: #e43d33;
  }
}

.apply-status {
  font-size: 24rpx;
  margin-left: 20rpx;

  &.pending {
    color: #f3a044;
  }

  &.success {
    color: #18bc37;
  }

  &.danger {
    color: #e43d33;
  }

  &.info {
    color: #909399;
  }
}

.btn-group {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.btn-submit {
  font-size: 30rpx;
  background: #2979ff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
}
</style>
