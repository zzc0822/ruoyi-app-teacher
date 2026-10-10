<template>
  <view class="offcampus-add-page">
    <!-- 学生信息 -->
    <view class="form-card">
      <view class="card-title">学生信息</view>
      <view class="form-item">
        <text class="form-label">选择学生 <text class="required">*</text></text>
        <student-picker ref="stuPicker" placeholder="输入姓名或学号搜索" @select="onStudentSelect" @clear="onStudentClear"></student-picker>
      </view>
      <view class="form-item">
        <text class="form-label">学号</text>
        <input class="form-input" v-model="form.xh" placeholder="自动填充" disabled />
      </view>
      <view class="form-item">
        <text class="form-label">学生姓名</text>
        <input class="form-input" v-model="form.studentName" placeholder="自动填充" disabled />
      </view>
      <view class="form-item">
        <text class="form-label">班级</text>
        <input class="form-input" v-model="form.className" placeholder="自动填充" disabled />
      </view>
      <view class="form-item">
        <text class="form-label">学年</text>
        <input class="form-input" v-model="form.academicYear" disabled />
      </view>
    </view>

    <!-- 历史申请记录 -->
    <view class="form-card" v-if="historyList.length > 0">
      <view class="card-title">历史申请记录</view>
      <view class="history-tip">该学生之前已有外宿申请记录，可参考以往信息</view>
      <view class="history-item" v-for="item in historyList" :key="item.id">
        <view class="history-row">
          <text class="history-year">{{ item.academicYear }}</text>
          <text class="history-status" :class="'status-' + getStatusClass(item)">{{ getStatusText(item.status) }}</text>
        </view>
        <view class="history-row">
          <text class="history-type">{{ getHousingTypeText(item.housingType) }}</text>
          <text class="history-addr" v-if="item.address">{{ item.address }}</text>
        </view>
        <view class="history-row">
          <text class="history-time">{{ item.applyTime || item.createTime }}</text>
          <text class="history-period" v-if="item.startDate">{{ item.startDate }} ~ {{ item.endDate }}</text>
        </view>
      </view>
    </view>

    <!-- 出勤记录 -->
    <view class="form-card" v-if="attendanceList.length > 0">
      <view class="card-title">出勤记录</view>
      <view class="att-item" v-for="(item, idx) in attendanceList" :key="idx">
        <view class="att-row">
          <text class="att-course">{{ item.courseName }}</text>
          <text class="att-rate" :class="getAttRateClass(item)">{{ calcAbsentRate(item) }}</text>
        </view>
        <view class="att-row">
          <text class="att-detail">总{{ item.totalLessons }}节 | 缺勤{{ item.absentLessons }} | 迟到{{ item.lateLessons }} | 早退{{ item.earlyLeaveLessons }}</text>
        </view>
      </view>
    </view>

    <!-- 外宿信息 -->
    <view class="form-card">
      <view class="card-title">外宿信息</view>
      <view class="form-item">
        <text class="form-label">外宿类型 <text class="required">*</text></text>
        <picker :range="housingTypeOptions" range-key="label" @change="onHousingTypeChange">
          <view class="form-picker">
            <text :class="{ placeholder: !form.housingType }">{{ form.housingType ? getHousingTypeText(form.housingType) : '请选择外宿类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <text v-if="housingTypeHint()" class="period-tip">{{ housingTypeHint() }}</text>
      </view>
      <view class="form-item">
        <text class="form-label">外宿期限 <text class="required">*</text></text>
        <view class="period-chips">
          <text v-for="p in periodOptions" :key="p.code" class="period-chip" :class="{ active: periodPreset === p.code }" @click="pickPreset(p.code)">{{ p.short }}</text>
          <text class="period-chip" :class="{ active: periodPreset === 'custom' }" @click="periodPreset = 'custom'">自定义</text>
        </view>
        <view class="period-range">
          <picker class="period-cell" mode="date" :value="form.startDate" @change="onStartDateChange">
            <view class="form-picker"><text :class="{ placeholder: !form.startDate }">{{ form.startDate || '开始日期' }}</text></view>
          </picker>
          <text class="period-sep">至</text>
          <picker class="period-cell" mode="date" :value="form.endDate" @change="onEndDateChange">
            <view class="form-picker"><text :class="{ placeholder: !form.endDate }">{{ form.endDate || '结束日期' }}</text></view>
          </picker>
        </view>
        <text class="period-tip">外宿一般覆盖整学年；学期中途开始可自开学日起、学年末止</text>
      </view>
      <view class="form-item">
        <text class="form-label">外宿地址 <text class="required">*</text></text>
        <input class="form-input" v-model="form.address" placeholder="请输入外宿地址" />
      </view>
      <view class="form-item">
        <text class="form-label">外宿理由 <text class="required">*</text></text>
        <textarea class="form-textarea" v-model="form.applyReason" placeholder="请输入外宿理由" maxlength="500" />
      </view>
    </view>

    <!-- 佐证材料：不分门别类，一律传到同一处 -->
    <view class="form-card">
      <view class="card-title">佐证材料 <text class="required">*</text></view>
      <text class="upload-hint">{{ uploadHint() }}</text>
      <view class="photo-upload-grid">
        <view class="upload-item" v-for="(photo, idx) in materialPhotoList" :key="idx">
          <image :src="photo" class="upload-preview" mode="aspectFill" @click="previewMaterial(idx)" />
          <view class="remove-btn" @click="removeMaterial(idx)">×</view>
        </view>
        <view class="upload-item add-item" v-if="materialPhotoList.length < 9" @click="chooseMaterial">
          <text class="add-icon">+</text><text class="add-text">拍照</text>
        </view>
      </view>
    </view>

    <!-- 交通信息 -->
    <view class="form-card" v-if="form.housingType">
      <view class="card-title">交通信息</view>
      <view class="form-item">
        <text class="form-label">往返学校交通工具 <text class="required">*</text></text>
        <picker :range="transportOptions" range-key="label" @change="onTransportChange">
          <view class="form-picker">
            <text :class="{ placeholder: !form.transportType }">{{ form.transportType ? getTransportText(form.transportType) : '请选择交通工具' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item" v-if="form.transportType === 'motorcycle' || form.transportType === 'car'">
        <text class="form-label">关联车辆登记</text>
        <picker :range="vehicleOptions" range-key="label" @change="onVehicleChange">
          <view class="form-picker">
            <text :class="{ placeholder: !form.vehicleId }">{{ form.vehicleId ? selectedVehicleLabel : '请选择已登记车辆（可选）' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="submit-btn" @click="submit">
      <text class="submit-text">提交申请</text>
    </view>
    <!-- 水印Canvas（离屏） -->
    <canvas canvas-id="watermarkCanvas" style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"></canvas>
  </view>
</template>

<script>
import { addOffcampus, getOffcampusHistory, getOffcampusAttendance, getOffcampusPeriods } from '@/api/affair/offcampus'
import { listVehicle } from '@/api/affair/vehicle'
import { uploadFile, stripBaseUrl } from '@/utils/upload'
import studentPicker from '@/components/student-picker/index.vue'
import { getWatermarkConfig } from '@/api/work/watermark'
import { getDicts } from '@/api/system/dict/data'
import { getLocation, addWatermark } from '@/utils/watermark'

export default {
  components: { studentPicker },
  computed: {
    selectedVehicleLabel() {
      const v = this.vehicleOptions.find(v => v.value === this.form.vehicleId)
      return v ? v.label : ''
    }
  },
  data() {
    return {
      form: {
        xh: '', studentName: '', bjdm: '', className: '', xydm: '',
        academicYear: '', startDate: '', endDate: '', housingType: '', applyReason: '', address: '',
        transportType: '', vehicleId: null
      },
      // 外宿期限快捷项，来自校历
      periodOptions: [],
      periodPreset: 'full_year',
      // 佐证材料不分门别类，全部落 material_photos
      materialPhotoList: [],
      historyList: [],
      attendanceList: [],
      // 字典 fd_offcampus_housing_type 拉取前的兜底选项，onLoad 里会被字典结果整体替换
      housingTypeOptions: [
        { label: '自有住房', value: 'own_house', remark: '需房产证照片＋产权人关系证明' },
        { label: '租房', value: 'rent_house', remark: '需租房合同照片' },
        { label: '投靠亲属', value: 'relative', remark: '需关系证明（户口本或亲属关系材料）' },
        { label: '其他', value: 'other', remark: '无专项材料，交理由佐证与住宿环境照片' }
      ],
      // 字典 transport_type 与请假共用，拉取前用这份兜底
      transportOptions: [
        { label: '火车', value: 'train' },
        { label: '飞机', value: 'plane' },
        { label: '汽车', value: 'bus' },
        { label: '步行', value: 'walk' },
        { label: '地铁', value: 'metro' },
        { label: '电动车', value: 'electric_bike' },
        { label: '摩托车', value: 'motorcycle' },
        { label: '其他', value: 'other' }
      ],
      vehicleOptions: [],
      watermarkConfig: null
    }
  },
  onLoad() {
    this.calcAcademicYear()
    this.loadPeriods()
    this.loadHousingTypes()
    this.loadTransportTypes()
    getWatermarkConfig('offcampus').then(res => {
      this.watermarkConfig = res.data
    }).catch(() => {})
  },
  methods: {
    /** 外宿类型读字典，字典不可用时保留内置选项 */
    loadHousingTypes() {
      return getDicts('fd_offcampus_housing_type').then(res => {
        const options = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue, remark: d.remark }))
        if (options.length) this.housingTypeOptions = options
      }).catch(() => {})
    },
    /** 交通工具与请假共用字典 transport_type */
    loadTransportTypes() {
      return getDicts('transport_type').then(res => {
        const options = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
        if (options.length) this.transportOptions = options
      }).catch(() => {})
    },
    housingTypeHint() {
      const hit = this.housingTypeOptions.find(o => o.value === this.form.housingType)
      return hit && hit.remark ? hit.remark : ''
    },
    /** 上传提示：先按外宿类型点明该交什么，再说明不必分类 */
    uploadHint() {
      const need = this.housingTypeHint()
      const base = '材料一律传到同一处、无需分类，最多 9 张，建议 3 张以上；请含住宿环境现场照片'
      return need ? need + '；' + base : base
    },
    /** 期限候选取自校历：整学年 + 该学年各学期 */
    loadPeriods() {
      return getOffcampusPeriods(this.form.academicYear).then(res => {
        this.periodOptions = (res.data || []).map(p => ({
          code: p.code,
          short: p.code === 'full_year' ? '整学年' : String(p.label || '').replace(/^\d{4}-\d{4}学年/, ''),
          startDate: p.startDate,
          endDate: p.endDate
        }))
        if (this.periodPreset !== 'custom') this.pickPreset(this.periodPreset)
      }).catch(() => { this.periodOptions = [] })
    },
    pickPreset(code) {
      const p = this.periodOptions.find(item => item.code === code)
      if (!p) return
      this.periodPreset = code
      this.form.startDate = p.startDate
      this.form.endDate = p.endDate
    },
    onStartDateChange(e) {
      this.form.startDate = e.detail.value
      this.periodPreset = 'custom'
    },
    onEndDateChange(e) {
      this.form.endDate = e.detail.value
      this.periodPreset = 'custom'
    },
    calcAcademicYear() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      if (month >= 9) {
        this.form.academicYear = year + '-' + (year + 1)
      } else {
        this.form.academicYear = (year - 1) + '-' + year
      }
    },
    async onStudentSelect(stu) {
      if (!stu) return
      this.form.xh = stu.xh || ''
      this.form.studentName = stu.studentName || ''
      this.form.bjdm = stu.bjdm || ''
      this.form.className = stu.className || stu.bjjc || ''
      this.form.xydm = stu.xydm || ''
      // 加载该学生的车辆登记列表
      this.loadStudentVehicles()
      // 加载该学生的历史外宿申请
      this.loadStudentHistory()
      // 加载该学生的出勤记录
      this.loadStudentAttendance()
    },
    onStudentClear() {
      this.form.xh = ''
      this.form.studentName = ''
      this.form.bjdm = ''
      this.form.className = ''
      this.form.xydm = ''
      this.vehicleOptions = []
      this.historyList = []
      this.attendanceList = []
    },
    async loadStudentHistory() {
      if (!this.form.xh) {
        this.historyList = []
        return
      }
      try {
        const res = await getOffcampusHistory(this.form.xh)
        this.historyList = res.data || []
      } catch (e) {
        this.historyList = []
      }
    },
    async loadStudentAttendance() {
      if (!this.form.xh) {
        this.attendanceList = []
        return
      }
      try {
        const res = await getOffcampusAttendance(this.form.xh)
        this.attendanceList = res.data || []
      } catch (e) {
        this.attendanceList = []
      }
    },
    async loadStudentVehicles() {
      try {
        const res = await listVehicle({ xh: this.form.xh, verifyStatus: 'verified', pageNum: 1, pageSize: 50 })
        if (res.code === 200 && res.rows) {
          this.vehicleOptions = res.rows
            .filter(v => v.vehicleType === 'motorcycle' || v.vehicleType === 'car')
            .map(v => ({ label: v.plateNo + ' (' + v.vehicleType + ')', value: v.id }))
        }
      } catch (e) {
        // 加载车辆列表失败
      }
    },
    onHousingTypeChange(e) {
      this.form.housingType = this.housingTypeOptions[e.detail.value].value
    },
    onTransportChange(e) {
      this.form.transportType = this.transportOptions[e.detail.value].value
    },
    onVehicleChange(e) {
      this.form.vehicleId = this.vehicleOptions[e.detail.value].value
    },
    /** 佐证材料：拍照走水印、相册不加水印，都落到同一个桶 */
    chooseMaterial() {
      if (this.materialPhotoList.length >= 9) return uni.showToast({ title: '最多9张', icon: 'none' })
      uni.showActionSheet({
        itemList: ['拍照上传', '从相册选择'],
        success: (action) => {
          if (action.index === 0) {
            const locPromise = getLocation()
            uni.chooseImage({
              count: 1, sizeType: ['compressed'], sourceType: ['camera'],
              success: async (res) => {
                let path = res.tempFilePaths[0]
                if (this.watermarkConfig && this.watermarkConfig.enabled === '1') {
                  const location = await locPromise
                  path = await addWatermark(path, this.watermarkConfig, location)
                }
                this.appendMaterial(path)
              }
            })
          } else {
            uni.chooseImage({
              count: 1, sizeType: ['compressed'], sourceType: ['album'],
              success: (res) => {
                this.appendMaterial(res.tempFilePaths[0])
              }
            })
          }
        }
      })
    },
    appendMaterial(path) {
      uploadFile(path).then(url => {
        this.materialPhotoList.push(url)
      }).catch(() => { uni.showToast({ title: '上传失败', icon: 'none' }) })
    },
    removeMaterial(idx) { this.materialPhotoList.splice(idx, 1) },
    previewMaterial(idx) { uni.previewImage({ current: idx, urls: this.materialPhotoList }) },
    /** 交通工具文案取自字典；老数据里的 car 字典没有，单独兜底 */
    getTransportText(type) {
      if (!type) return '-'
      const hit = this.transportOptions.find(o => o.value === type)
      if (hit) return hit.label
      return type === 'car' ? '汽车' : type
    },
    getHousingTypeText(type) {
      const hit = this.housingTypeOptions.find(o => o.value === type)
      return hit ? hit.label : (type || '-')
    },
    getStatusClass(item) {
      if (item.status === 'rejected') return 'rejected'
      if (item.status === 'student_affairs_approved') return 'approved'
      if (item.verifyStatus === 'pending') return 'pending'
      return 'processing'
    },
    getStatusText(status) {
      const map = {
        pending_verify: '待核实',
        counselor_approved: '待书记审批',
        secretary_approved: '待学生处审批',
        student_affairs_approved: '已通过',
        rejected: '已驳回'
      }
      return map[status] || status
    },
    calcAbsentRate(item) {
      const total = Number(item.totalLessons) || 0
      if (total === 0) return '无记录'
      const absent = (Number(item.absentLessons) || 0) + (Number(item.lateLessons) || 0) + (Number(item.earlyLeaveLessons) || 0)
      return '缺勤率 ' + (absent / total * 100).toFixed(1) + '%'
    },
    getAttRateClass(item) {
      const total = Number(item.totalLessons) || 0
      if (total === 0) return ''
      const absent = (Number(item.absentLessons) || 0) + (Number(item.lateLessons) || 0) + (Number(item.earlyLeaveLessons) || 0)
      const rate = absent / total
      if (rate >= 0.33) return 'att-rate-danger'
      if (rate >= 0.15) return 'att-rate-warn'
      return 'att-rate-ok'
    },
    async submit() {
      if (!this.form.xh) return uni.showToast({ title: '请选择学生', icon: 'none' })
      if (!this.form.housingType) return uni.showToast({ title: '请选择外宿类型', icon: 'none' })
      if (!this.form.startDate || !this.form.endDate) return uni.showToast({ title: '请选择外宿期限', icon: 'none' })
      if (this.form.startDate > this.form.endDate) return uni.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
      if (!this.form.address) return uni.showToast({ title: '请输入外宿地址', icon: 'none' })
      if (!this.form.applyReason) return uni.showToast({ title: '请输入外宿理由', icon: 'none' })
      if (this.materialPhotoList.length < 3) return uni.showToast({ title: '请至少上传3张佐证材料', icon: 'none' })
      if (!this.form.transportType) return uni.showToast({ title: '请选择交通工具', icon: 'none' })

      const data = {
        ...this.form,
        materialPhotos: JSON.stringify(this.materialPhotoList.map(stripBaseUrl))
      }

      try {
        const res = await addOffcampus(data)
        if (res.code === 200) {
          uni.showToast({ title: '提交成功，待现场核实', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1500)
        }
      } catch (e) {
        uni.showToast({ title: '提交失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.offcampus-add-page { min-height: 100vh; background: #f5f6f8; padding-bottom: 120rpx; }
.form-card { background: #fff; margin: 20rpx; border-radius: 12rpx; padding: 24rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; padding-left: 12rpx; border-left: 6rpx solid #667eea; }
.form-item { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #666; margin-bottom: 12rpx; display: block; }
.required { color: #f56c6c; }
.form-input { background: #f5f5f5; padding: 20rpx 24rpx; border-radius: 8rpx; font-size: 28rpx; min-height: 72rpx; line-height: 72rpx; box-sizing: border-box; }
.form-textarea { background: #f5f5f5; padding: 20rpx 24rpx; border-radius: 8rpx; font-size: 28rpx; width: 100%; min-height: 180rpx; box-sizing: border-box; }
.form-picker { background: #f5f5f5; padding: 20rpx 24rpx; border-radius: 8rpx; font-size: 28rpx; min-height: 72rpx; line-height: 72rpx; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
.placeholder { color: #999; }
.picker-arrow { font-size: 20rpx; color: #999; }
/* 外宿期限 */
.period-chips { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 14rpx; }
.period-chip { padding: 8rpx 22rpx; border-radius: 24rpx; background: #f0f2f5; color: #666; font-size: 24rpx; border: 2rpx solid transparent; }
.period-chip.active { background: #eef1ff; color: #667eea; border-color: #667eea; }
.period-range { display: flex; align-items: center; }
.period-cell { flex: 1; }
.period-sep { padding: 0 14rpx; font-size: 24rpx; color: #999; }
.period-tip { display: block; margin-top: 10rpx; font-size: 22rpx; color: #999; line-height: 32rpx; }
.history-period { font-size: 22rpx; color: #999; }
/* 上传提示压在九宫格上方，先看清要交什么再拍 */
.upload-hint { display: block; font-size: 22rpx; color: #999; line-height: 32rpx; margin-bottom: 16rpx; }
.photo-upload-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.upload-item { width: 160rpx; height: 160rpx; position: relative; }
.upload-preview { width: 100%; height: 100%; border-radius: 8rpx; }
.remove-btn { position: absolute; top: -10rpx; right: -10rpx; width: 36rpx; height: 36rpx; background: #f56c6c; color: #fff; border-radius: 50%; text-align: center; line-height: 36rpx; font-size: 24rpx; }
.add-item { background: #f5f5f5; border: 2rpx dashed #ddd; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8rpx; }
.add-icon { font-size: 48rpx; color: #999; }
.add-text { font-size: 22rpx; color: #999; }
.submit-btn { position: fixed; bottom: 40rpx; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20rpx 80rpx; border-radius: 40rpx; box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.4); }
.submit-text { color: #fff; font-size: 30rpx; font-weight: 500; }
.history-tip { font-size: 24rpx; color: #ff9800; background: #fff3e0; padding: 16rpx; border-radius: 8rpx; margin-bottom: 16rpx; }
.history-item { padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.history-item:last-child { border-bottom: none; }
.history-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.history-year { font-size: 28rpx; color: #333; font-weight: 500; }
.history-status { font-size: 24rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.status-approved { color: #4caf50; background: #e8f5e9; }
.status-rejected { color: #f44336; background: #ffebee; }
.status-pending { color: #ff9800; background: #fff3e0; }
.status-processing { color: #2196f3; background: #e3f2fd; }
.history-type { font-size: 24rpx; color: #666; }
.history-addr { font-size: 22rpx; color: #999; flex: 1; margin-left: 16rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-time { font-size: 22rpx; color: #999; }
.att-item { padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.att-item:last-child { border-bottom: none; }
.att-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rpx; }
.att-course { font-size: 26rpx; color: #333; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-rate { font-size: 24rpx; font-weight: 500; flex-shrink: 0; margin-left: 12rpx; }
.att-rate-ok { color: #4caf50; }
.att-rate-warn { color: #ff9800; }
.att-rate-danger { color: #f44336; }
.att-detail { font-size: 22rpx; color: #999; }
</style>
