<template>
  <view class="page-wrap">
    <view class="form-section">
      <view class="section-head">
        <view>
          <text class="section-title">执勤信息</text>
          <text class="section-sub">选择本次检查的执勤点和时间</text>
        </view>
        <text class="required-note">必填</text>
      </view>

      <view class="form-row">
        <text class="form-label">执勤点</text>
        <picker
          :range="pointLabels"
          :value="pointIndex"
          :disabled="points.length === 0"
          @change="onPointChange"
        >
          <view :class="['picker-field', form.pointId ? '' : 'is-placeholder']">
            <text>{{ selectedPointLabel || (points.length ? '请选择执勤点' : '暂无启用执勤点') }}</text>
            <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
          </view>
        </picker>
      </view>

      <view class="form-row split-row">
        <view class="split-field">
          <text class="form-label">日期</text>
          <picker mode="date" :value="form.checkDate" @change="onDateChange">
            <view class="picker-field compact">
              <text>{{ form.checkDate }}</text>
              <uni-icons type="calendar" size="16" color="#94a3b8"></uni-icons>
            </view>
          </picker>
        </view>
        <view class="split-field">
          <text class="form-label">时间</text>
          <picker mode="time" :value="form.checkTime" @change="onTimeChange">
            <view class="picker-field compact">
              <text>{{ form.checkTime }}</text>
              <uni-icons type="calendar" size="16" color="#94a3b8"></uni-icons>
            </view>
          </picker>
        </view>
      </view>

      <view class="form-row split-row">
        <view class="split-field">
          <text class="form-label">检查人数</text>
          <input
            v-model="form.checkedCount"
            class="number-input"
            type="number"
            maxlength="4"
            placeholder="选填"
          />
        </view>
        <view class="split-field">
          <text class="form-label">登记结果</text>
          <view :class="['result-preview', rows.length ? 'has-issue' : 'is-normal']">
            <text>{{ rows.length ? '发现 ' + rows.length + ' 人次违纪' : '未发现违纪' }}</text>
          </view>
        </view>
      </view>

      <view class="form-row">
        <text class="form-label">检查说明</text>
        <textarea
          v-model="form.summary"
          class="summary-input"
          maxlength="500"
          placeholder="填写本次执勤总体情况，选填"
        />
      </view>
    </view>

    <view class="form-section">
      <view class="section-head">
        <view>
          <text class="section-title">违纪登记</text>
          <text class="section-sub">支持全校任意学号，匹配后自动归属辅导员</text>
        </view>
        <view class="add-student-btn" @click="addRow">
          <uni-icons type="plusempty" size="16" color="#0f766e"></uni-icons>
          <text>添加学生</text>
        </view>
      </view>

      <view v-if="rows.length === 0" class="normal-state">
        <view class="normal-icon">
          <uni-icons type="checkbox-filled" size="28" color="#0f766e"></uni-icons>
        </view>
        <view>
          <text class="normal-title">本次检查未登记违纪学生</text>
          <text class="normal-sub">直接提交可保留一条正常检查记录</text>
        </view>
      </view>

      <view v-for="(row, index) in rows" :key="row.key" class="student-editor">
        <view class="editor-head">
          <text class="editor-index">学生 {{ index + 1 }}</text>
          <view class="remove-btn" @click="removeRow(index)">
            <uni-icons type="closeempty" size="19" color="#dc2626"></uni-icons>
          </view>
        </view>

        <view class="lookup-row">
          <input
            v-model="row.xh"
            class="xh-input"
            maxlength="30"
            placeholder="输入学号"
            @input="resetLookup(row)"
            @confirm="lookupRow(row)"
          />
          <button
            class="lookup-btn"
            :loading="row._loading"
            :disabled="row._loading"
            @click="lookupRow(row)"
          >{{ row._loaded ? '重新匹配' : '匹配' }}</button>
        </view>

        <view v-if="row._loaded" class="match-panel">
          <view class="match-main">
            <text class="match-name">{{ row.studentName }}</text>
            <text class="match-meta">{{ row.collegeName || row.xydm }} · {{ row.className || row.bjdm || '未匹配班级' }}</text>
          </view>
          <view class="match-counselor">
            <text class="match-label">辅导员</text>
            <text :class="['match-value', row.counselorReady ? '' : 'is-warning']">
              {{ row.counselorName || '未匹配' }}
            </text>
          </view>
          <text v-if="row.routeHint" class="route-hint">{{ row.routeHint }}</text>
        </view>
        <view v-else-if="row._lookupTried" class="match-panel is-error">
          <text>未匹配到学生，请核对学号后重试</text>
        </view>

        <view class="field-block">
          <text class="field-label">违纪类型</text>
          <picker
            :range="violationTypeLabels"
            :value="violationTypeIndex(row)"
            :disabled="!row._loaded"
            @change="onViolationTypeChange(row, $event)"
          >
            <view :class="['picker-field', row.violationType ? '' : 'is-placeholder']">
              <text>{{ violationLabel(row.violationType) || '请选择违纪类型' }}</text>
              <uni-icons type="right" size="16" color="#94a3b8"></uni-icons>
            </view>
          </picker>
        </view>

        <view class="field-block">
          <text class="field-label">严重程度</text>
          <view class="severity-row">
            <view
              v-for="item in severityOptions"
              :key="item.value"
              :class="['severity-chip', row.severity === item.value ? 'severity-active' : '']"
              @click="setSeverity(row, item.value)"
            >
              <text>{{ item.label }}</text>
            </view>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">事实说明</text>
          <textarea
            v-model="row.violationDetail"
            class="detail-input"
            maxlength="300"
            placeholder="简述违纪事实，选填"
          />
        </view>
      </view>
    </view>

    <view v-if="points.length === 0 && !pointsLoading" class="points-empty">
      <uni-icons type="info" size="18" color="#b45309"></uni-icons>
      <text>暂无启用中的执勤点，请联系管理员在后台维护。</text>
    </view>

    <view class="submit-bar">
      <view class="submit-summary">
        <text class="submit-count">{{ rows.length }}</text>
        <text class="submit-label">名违纪学生</text>
      </view>
      <button class="submit-btn" :loading="submitting" :disabled="submitting || points.length === 0" @click="submit">
        提交检查
      </button>
    </view>
  </view>
</template>

<script>
import {
  listStudyInspectionPoints,
  lookupStudyInspectionStudent,
  addStudyInspection
} from '@/api/work/studyInspection'

const VIOLATION_TYPES = [
  { label: '迟到', value: 'late' },
  { label: '旷课', value: 'truant' },
  { label: '课堂睡觉', value: 'sleeping' },
  { label: '课堂使用手机', value: 'phone' },
  { label: '公共场所吸烟', value: 'smoking' },
  { label: '仪容仪表不规范', value: 'dress' },
  { label: '其他违纪', value: 'other' }
]

export default {
  data() {
    const now = new Date()
    return {
      points: [],
      pointsLoading: false,
      pointIndex: 0,
      form: {
        pointId: null,
        checkDate: this.formatDate(now),
        checkTime: this.formatTime(now),
        checkedCount: '',
        summary: ''
      },
      rows: [],
      violationTypes: VIOLATION_TYPES,
      violationTypeLabels: VIOLATION_TYPES.map(item => item.label),
      severityOptions: [
        { label: '一般', value: 'minor' },
        { label: '较重', value: 'normal' },
        { label: '严重', value: 'serious' }
      ],
      submitting: false,
      rowSeed: 0
    }
  },
  computed: {
    pointLabels() {
      return this.points.map(item => this.pointLabel(item))
    },
    selectedPointLabel() {
      const point = this.points.find(item => item.id === this.form.pointId)
      return point ? this.pointLabel(point) : ''
    }
  },
  onLoad() {
    this.loadPoints()
  },
  methods: {
    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return year + '-' + month + '-' + day
    },
    formatTime(date) {
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return hour + ':' + minute
    },
    pointLabel(point) {
      const detail = point.campus || point.location
      return detail ? point.pointName + ' · ' + detail : point.pointName
    },
    loadPoints() {
      this.pointsLoading = true
      listStudyInspectionPoints().then(res => {
        this.points = res.data || []
        if (this.points.length > 0) {
          this.form.pointId = this.points[0].id
          this.pointIndex = 0
        }
      }).finally(() => {
        this.pointsLoading = false
      })
    },
    onPointChange(event) {
      this.pointIndex = Number(event.detail.value || 0)
      const point = this.points[this.pointIndex]
      this.form.pointId = point ? point.id : null
    },
    onDateChange(event) {
      this.form.checkDate = event.detail.value
    },
    onTimeChange(event) {
      this.form.checkTime = event.detail.value
    },
    addRow() {
      this.rowSeed += 1
      this.rows.push(this.emptyRow(this.rowSeed))
    },
    emptyRow(key) {
      return {
        key: key,
        xh: '',
        studentName: '',
        xydm: '',
        collegeName: '',
        bjdm: '',
        className: '',
        counselorGh: '',
        counselorName: '',
        counselorUserId: null,
        counselorReady: false,
        studentUserId: null,
        studentReady: false,
        routeHint: '',
        violationType: '',
        severity: 'normal',
        violationDetail: '',
        _loaded: false,
        _loading: false,
        _lookupTried: false
      }
    },
    removeRow(index) {
      this.rows.splice(index, 1)
    },
    resetLookup(row) {
      if (!row._loaded) return
      row._loaded = false
      row._lookupTried = false
      row.studentName = ''
      row.collegeName = ''
      row.className = ''
      row.counselorName = ''
      row.counselorReady = false
      row.routeHint = ''
    },
    async lookupRow(row) {
      const xh = String(row.xh || '').trim()
      if (!xh) {
        uni.showToast({ title: '请先输入学号', icon: 'none' })
        return false
      }
      const duplicate = this.rows.some(item => item !== row && item._loaded && item.xh === xh)
      if (duplicate) {
        uni.showToast({ title: '同一检查单不能重复登记该学号', icon: 'none' })
        return false
      }
      row._loading = true
      row._lookupTried = false
      try {
        const res = await lookupStudyInspectionStudent(xh)
        const data = res.data || {}
        Object.assign(row, {
          xh: data.xh || xh,
          studentName: data.studentName || '',
          xydm: data.xydm || '',
          collegeName: data.collegeName || '',
          bjdm: data.bjdm || '',
          className: data.className || '',
          counselorGh: data.counselorGh || '',
          counselorName: data.counselorName || '',
          counselorUserId: data.counselorUserId || null,
          counselorReady: !!data.counselorReady,
          studentUserId: data.studentUserId || null,
          studentReady: !!data.studentReady,
          routeHint: data.routeHint || '',
          _loaded: true
        })
        if (!data.counselorReady) {
          uni.showToast({ title: '该生暂未匹配辅导员账号', icon: 'none' })
        }
        return true
      } catch (e) {
        row._loaded = false
        row._lookupTried = true
        return false
      } finally {
        row._loading = false
      }
    },
    violationTypeIndex(row) {
      const index = this.violationTypes.findIndex(item => item.value === row.violationType)
      return index < 0 ? 0 : index
    },
    onViolationTypeChange(row, event) {
      const item = this.violationTypes[Number(event.detail.value || 0)]
      row.violationType = item ? item.value : ''
    },
    violationLabel(value) {
      const item = this.violationTypes.find(entry => entry.value === value)
      return item ? item.label : ''
    },
    setSeverity(row, value) {
      row.severity = value
    },
    async submit() {
      if (this.submitting) return
      if (!this.form.pointId) {
        uni.showToast({ title: '请选择执勤点', icon: 'none' })
        return
      }
      const blankXh = this.rows.some(row => !String(row.xh || '').trim())
      if (blankXh) {
        uni.showToast({ title: '存在未填写学号的违纪记录', icon: 'none' })
        return
      }
      for (const row of this.rows) {
        if (!row._loaded) {
          const matched = await this.lookupRow(row)
          if (!matched) return
        }
        if (!row.violationType) {
          uni.showToast({ title: '请选择 ' + row.studentName + ' 的违纪类型', icon: 'none' })
          return
        }
      }
      const count = this.form.checkedCount === '' ? null : Number(this.form.checkedCount)
      if (count !== null && (!Number.isFinite(count) || count < 0)) {
        uni.showToast({ title: '检查人数不能为负数', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await addStudyInspection({
          pointId: this.form.pointId,
          checkTime: this.form.checkDate + ' ' + this.form.checkTime + ':00',
          checkedCount: count,
          summary: this.form.summary,
          violationList: this.rows.map(row => ({
            xh: row.xh,
            violationType: row.violationType,
            severity: row.severity,
            violationDetail: row.violationDetail
          }))
        })
        const unassigned = this.rows.filter(row => !row.counselorReady).length
        let message = this.rows.length ? '检查已登记，跟进任务已生成' : '正常检查已留档'
        if (unassigned) message += '；' + unassigned + ' 条待补辅导员'
        uni.showToast({ title: message, icon: 'none', duration: 2200 })
        setTimeout(() => uni.navigateBack(), 800)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background: #f4f6f8;
}

.page-wrap {
  min-height: 100vh;
  padding: 22rpx 24rpx calc(150rpx + env(safe-area-inset-bottom));
  background: #f4f6f8;
}

.form-section {
  margin-bottom: 18rpx;
  padding: 22rpx;
  border: 1rpx solid #e5eaef;
  border-radius: 10rpx;
  background: #ffffff;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 22rpx;
}

.section-title,
.section-sub {
  display: block;
}

.section-title {
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
}

.section-sub {
  margin-top: 6rpx;
  color: #64748b;
  font-size: 22rpx;
  line-height: 1.45;
}

.required-note {
  flex-shrink: 0;
  padding: 5rpx 10rpx;
  border-radius: 5rpx;
  color: #b45309;
  font-size: 20rpx;
  background: #fffbeb;
}

.form-row + .form-row,
.field-block + .field-block {
  margin-top: 20rpx;
}

.form-label,
.field-label {
  display: block;
  color: #475569;
  font-size: 23rpx;
  font-weight: 600;
}

.form-label {
  margin-bottom: 10rpx;
}

.picker-field,
.number-input,
.summary-input,
.xh-input,
.detail-input {
  box-sizing: border-box;
  width: 100%;
  border: 1rpx solid #dce3ea;
  border-radius: 8rpx;
  color: #1e293b;
  font-size: 25rpx;
  background: #fbfcfd;
}

.picker-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  min-height: 76rpx;
  padding: 0 18rpx;
}

.picker-field.is-placeholder {
  color: #94a3b8;
}

.picker-field.compact {
  min-height: 70rpx;
}

.number-input {
  height: 72rpx;
  padding: 0 18rpx;
}

.summary-input {
  min-height: 120rpx;
  padding: 16rpx 18rpx;
  line-height: 1.55;
}

.split-row {
  display: flex;
  gap: 16rpx;
}

.split-field {
  flex: 1;
  min-width: 0;
}

.result-preview {
  display: flex;
  align-items: center;
  min-height: 70rpx;
  padding: 0 16rpx;
  border-radius: 8rpx;
  font-size: 23rpx;
}

.result-preview.is-normal {
  color: #0f766e;
  background: #ecfdf5;
}

.result-preview.has-issue {
  color: #b91c1c;
  background: #fef2f2;
}

.add-student-btn {
  display: flex;
  align-items: center;
  gap: 5rpx;
  flex-shrink: 0;
  padding: 10rpx 14rpx;
  border: 1rpx solid #99f6e4;
  border-radius: 7rpx;
  color: #0f766e;
  font-size: 22rpx;
  background: #f0fdfa;
}

.normal-state {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx;
  border: 1rpx dashed #a7f3d0;
  border-radius: 8rpx;
  background: #f0fdf4;
}

.normal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: #dcfce7;
}

.normal-title,
.normal-sub {
  display: block;
}

.normal-title {
  color: #166534;
  font-size: 24rpx;
  font-weight: 600;
}

.normal-sub {
  margin-top: 5rpx;
  color: #4d7c5a;
  font-size: 21rpx;
}

.student-editor {
  margin-top: 18rpx;
  padding: 18rpx;
  border: 1rpx solid #dfe6ec;
  border-radius: 9rpx;
  background: #fbfcfd;
}

.editor-head,
.lookup-row,
.match-main,
.match-counselor {
  display: flex;
  align-items: center;
}

.editor-head,
.match-main {
  justify-content: space-between;
}

.editor-index {
  color: #0f172a;
  font-size: 25rpx;
  font-weight: 700;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #fef2f2;
}

.lookup-row {
  gap: 12rpx;
  margin-top: 14rpx;
}

.xh-input {
  flex: 1;
  min-width: 0;
  height: 70rpx;
  padding: 0 16rpx;
  background: #ffffff;
}

.lookup-btn {
  flex-shrink: 0;
  width: 142rpx;
  height: 70rpx;
  margin: 0;
  border-radius: 7rpx;
  color: #0f766e;
  font-size: 23rpx;
  line-height: 70rpx;
  background: #ccfbf1;
}

.match-panel {
  margin-top: 14rpx;
  padding: 15rpx 16rpx;
  border-left: 5rpx solid #0f766e;
  border-radius: 0 7rpx 7rpx 0;
  background: #f0fdfa;
}

.match-panel.is-error {
  border-left-color: #dc2626;
  color: #b91c1c;
  font-size: 23rpx;
  background: #fef2f2;
}

.match-name {
  color: #0f172a;
  font-size: 25rpx;
  font-weight: 700;
}

.match-meta {
  display: block;
  margin-top: 5rpx;
  color: #64748b;
  font-size: 21rpx;
}

.match-counselor {
  justify-content: space-between;
  gap: 10rpx;
  margin-top: 12rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #ccfbf1;
}

.match-label {
  color: #64748b;
  font-size: 21rpx;
}

.match-value {
  overflow: hidden;
  color: #166534;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-value.is-warning {
  color: #b45309;
}

.route-hint {
  display: block;
  margin-top: 8rpx;
  color: #b45309;
  font-size: 20rpx;
  line-height: 1.45;
}

.field-block {
  margin-top: 18rpx;
}

.field-label {
  margin-bottom: 9rpx;
}

.severity-row {
  display: flex;
  gap: 12rpx;
}

.severity-chip {
  flex: 1;
  padding: 12rpx 8rpx;
  border: 1rpx solid #dce3ea;
  border-radius: 7rpx;
  color: #64748b;
  font-size: 23rpx;
  text-align: center;
  background: #ffffff;
}

.severity-chip.severity-active {
  border-color: #0f766e;
  color: #0f766e;
  font-weight: 600;
  background: #ccfbf1;
}

.detail-input {
  min-height: 100rpx;
  padding: 14rpx 16rpx;
  line-height: 1.5;
  background: #ffffff;
}

.points-empty {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 18rpx;
  border: 1rpx solid #fde68a;
  border-radius: 8rpx;
  color: #92400e;
  font-size: 23rpx;
  line-height: 1.5;
  background: #fffbeb;
}

.submit-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #e2e8f0;
  background: rgba(255, 255, 255, 0.98);
}

.submit-summary {
  flex: 1;
  min-width: 0;
}

.submit-count {
  color: #0f172a;
  font-size: 34rpx;
  font-weight: 700;
}

.submit-label {
  margin-left: 7rpx;
  color: #64748b;
  font-size: 22rpx;
}

.submit-btn {
  width: 260rpx;
  height: 76rpx;
  margin: 0;
  border-radius: 8rpx;
  color: #ffffff;
  font-size: 26rpx;
  line-height: 76rpx;
  background: #0f766e;
}

.submit-btn[disabled] {
  opacity: 0.55;
}
</style>
