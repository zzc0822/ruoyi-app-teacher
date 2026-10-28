<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item">
          <text class="form-label">签到场景</text>
          <view class="fixed-scene">课堂签到 · 学生在手机端确认</view>
        </view>
        <view class="form-item">
          <text class="form-label">签到名称</text>
          <input class="form-input" v-model="form.sessionName" placeholder="如：第5周周一第1-2节" />
        </view>
        <view class="form-item" v-if="form.scene === 'class'">
          <text class="form-label">选择班级</text>
          <picker :range="classList" range-key="bjjc" @change="onClassPick">
            <view class="form-picker">
              <text :class="form.bjdm ? 'picker-value' : 'picker-placeholder'">
                {{ selectedClassName || '请选择班级' }}
              </text>
              <uni-icons type="right" size="14" color="#ccc"></uni-icons>
            </view>
          </picker>
        </view>
        <view class="form-item" v-if="form.scene === 'class'">
          <text class="form-label">课节</text>
          <view class="lesson-grid">
            <view class="lesson-item" v-for="n in 12" :key="n" :class="{active: form.lessonNo === n}" @click="form.lessonNo = n">
              {{ n }}
            </view>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">课程名称</text>
          <input class="form-input" v-model="form.courseName" placeholder="选填" />
        </view>
        <view class="form-row" v-if="form.scene === 'class'">
          <view class="form-item half">
            <text class="form-label">上课地点</text>
            <input class="form-input" v-model="form.classRoom" placeholder="如：教1-301" />
          </view>
          <view class="form-item half">
            <text class="form-label">授课教师</text>
            <input class="form-input" v-model="form.classTeacher" placeholder="选填" />
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">签到方式</view>
        <view class="sign-type-grid">
          <view class="sign-type-item" :class="{active: form.signType === 'code'}" @click="form.signType = 'code'">
            <uni-icons type="compose" size="28" :color="form.signType === 'code' ? '#409EFF' : '#999'"></uni-icons>
            <text class="st-label">签到码</text>
          </view>
          <view class="sign-type-item" :class="{active: form.signType === 'qr'}" @click="form.signType = 'qr'">
            <uni-icons type="scan" size="28" :color="form.signType === 'qr' ? '#409EFF' : '#999'"></uni-icons>
            <text class="st-label">二维码</text>
          </view>
          <view class="sign-type-item" :class="{active: form.signType === 'location'}" @click="form.signType = 'location'">
            <uni-icons type="location" size="28" :color="form.signType === 'location' ? '#409EFF' : '#999'"></uni-icons>
            <text class="st-label">位置签到</text>
          </view>
        </view>

        <view class="form-item" v-if="form.signType === 'code'">
          <text class="form-label">签到码</text>
          <view class="code-row">
            <input class="form-input code-input" v-model="form.signCode" placeholder="4位数字" maxlength="4" />
            <view class="code-refresh" @click="refreshCode">
              <uni-icons type="refresh" size="18" color="#409EFF"></uni-icons>
            </view>
          </view>
        </view>

        <view class="form-item" v-if="form.signType === 'location'">
          <text class="form-label">围栏半径</text>
          <view class="radius-row">
            <view class="radius-btn" v-for="r in [50, 100, 200, 500]" :key="r" :class="{active: form.radius === r}" @click="form.radius = r">
              {{ r }}m
            </view>
          </view>
        </view>

        <view class="form-item" v-if="form.signType === 'location'">
          <view class="location-btn" @click="getLocation">
            <uni-icons type="location" size="16" color="#409EFF"></uni-icons>
            <text>{{ locationText }}</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">有效时长</text>
          <view class="duration-row">
            <view class="duration-btn" v-for="d in [5, 10, 15, 20, 30]" :key="d" :class="{active: form.duration === d}" @click="form.duration = d">
              {{ d }}分钟
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="submit-btn" :class="{disabled: submitting}" @click="submit">
        <text>{{ submitting ? '创建中...' : '开始签到' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { addSignSession } from '@/api/work/sign'
import { getTeacherClasses } from '@/api/work/rollcall'

export default {
  data() {
    return {
      form: {
        scene: 'class',
        sessionName: '',
        bjdm: '',
        className: '',
        lessonNo: null,
        courseName: '',
        classRoom: '',
        classTeacher: '',
        signType: 'code',
        signCode: '',
        radius: 100,
        latitude: null,
        longitude: null,
        duration: 15,
      },
      classList: [],
      submitting: false,
    }
  },
  computed: {
    selectedClassName() {
      const cls = this.classList.find(c => c.bjdm === this.form.bjdm)
      return cls ? (cls.bjjc || cls.className) : ''
    },
    locationText() {
      if (this.form.latitude && this.form.longitude) {
        return '已定位 (' + Number(this.form.latitude).toFixed(4) + ', ' + Number(this.form.longitude).toFixed(4) + ')'
      }
      return '点击获取当前位置'
    }
  },
  onLoad(options) {
    this.refreshCode()
    this.loadClasses()
    if (options.bjdm) {
      this.form.bjdm = options.bjdm
      this.form.className = decodeURIComponent(options.className || '')
      this.form.courseName = decodeURIComponent(options.courseName || '')
      this.form.classRoom = decodeURIComponent(options.classRoom || '')
      this.form.classTeacher = decodeURIComponent(options.classTeacher || '')
      if (options.lessonNo) this.form.lessonNo = parseInt(options.lessonNo)
    }
    this.form.sessionName = this.buildSessionName()
  },
  methods: {
    async loadClasses() {
      try {
        const res = await getTeacherClasses()
        this.classList = res.data || []
      } catch (e) {}
    },
    onClassPick(e) {
      const idx = e.detail.value
      const cls = this.classList[idx]
      if (cls) {
        this.form.bjdm = cls.bjdm
        this.form.className = cls.className || cls.bjjc
        this.form.sessionName = this.buildSessionName()
      }
    },
    buildSessionName() {
      const parts = []
      if (this.form.className) parts.push(this.form.className)
      if (this.form.lessonNo) parts.push('第' + this.form.lessonNo + '节')
      return parts.length > 0 ? parts.join('') + '签到' : ''
    },
    refreshCode() {
      this.form.signCode = String(Math.floor(1000 + Math.random() * 9000))
    },
    getLocation() {
      uni.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.form.latitude = res.latitude
          this.form.longitude = res.longitude
        },
        fail: () => {
          uni.showToast({ title: '获取位置失败', icon: 'none' })
        }
      })
    },
    async submit() {
      if (this.submitting) return
      if (!this.form.sessionName) {
        uni.showToast({ title: '请输入签到名称', icon: 'none' })
        return
      }
      if (this.form.scene === 'class' && !this.form.bjdm) {
        uni.showToast({ title: '请选择班级', icon: 'none' })
        return
      }

      this.submitting = true
      const now = new Date()
      const endTime = new Date(now.getTime() + this.form.duration * 60000)
      const data = {
        scene: this.form.scene,
        sessionName: this.form.sessionName,
        bjdm: this.form.bjdm,
        className: this.form.className,
        lessonNo: this.form.lessonNo,
        courseName: this.form.courseName,
        classRoom: this.form.classRoom,
        classTeacher: this.form.classTeacher,
        signType: this.form.signType,
        signCode: this.form.signType === 'code' ? this.form.signCode : null,
        radius: this.form.signType === 'location' ? this.form.radius : null,
        latitude: this.form.signType === 'location' ? this.form.latitude : null,
        longitude: this.form.signType === 'location' ? this.form.longitude : null,
        duration: this.form.duration,
        startTime: this.formatDateTime(now),
        endTime: this.formatDateTime(endTime),
      }

      try {
        await addSignSession(data)
        uni.showToast({ title: '签到已发起', icon: 'success' })
        setTimeout(() => { uni.navigateBack() }, 1000)
      } catch (e) {
        uni.showToast({ title: '创建失败', icon: 'none' })
      }
      this.submitting = false
    },
    formatDateTime(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      const s = String(d.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${day} ${h}:${min}:${s}`
    },
  }
}
</script>

<style scoped>
.page-container { min-height: 100vh; background: #f5f6f8; padding-bottom: 80px; }
.form-card { padding: 12px; }
.form-section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 14px; padding-left: 8px; border-left: 3px solid #409EFF; }
.form-item { margin-bottom: 14px; }
.form-label { font-size: 13px; color: #666; margin-bottom: 6px; display: block; }
.form-input { background: #f8f8f8; border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; font-size: 14px; width: 100%; box-sizing: border-box; }
.form-row { display: flex; gap: 12px; }
.form-item.half { flex: 1; }

.radio-group { display: flex; gap: 10px; }
.radio-item { padding: 8px 20px; border-radius: 20px; font-size: 13px; background: #f5f5f5; color: #666; }
.radio-item.active { background: #ecf5ff; color: #409EFF; font-weight: 600; }
.fixed-scene { padding: 10px 12px; border-radius: 8px; background: #f5f7ff; color: #4058bd; font-size: 13px; }

.form-picker { display: flex; align-items: center; justify-content: space-between; background: #f8f8f8; border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; }
.picker-value { font-size: 14px; color: #333; }
.picker-placeholder { font-size: 14px; color: #ccc; }

.lesson-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.lesson-item { width: 40px; height: 36px; line-height: 36px; text-align: center; border-radius: 8px; font-size: 13px; background: #f5f5f5; color: #666; }
.lesson-item.active { background: #409EFF; color: #fff; }

.sign-type-grid { display: flex; gap: 12px; margin-bottom: 16px; }
.sign-type-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 14px 0; border-radius: 12px; background: #f8f8f8; border: 2px solid transparent; }
.sign-type-item.active { border-color: #409EFF; background: #ecf5ff; }
.st-label { font-size: 12px; color: #666; margin-top: 4px; }

.code-row { display: flex; align-items: center; gap: 10px; }
.code-input { flex: 1; font-size: 24px !important; letter-spacing: 8px; text-align: center; font-weight: 700; }
.code-refresh { padding: 8px; }

.radius-row, .duration-row { display: flex; gap: 8px; flex-wrap: wrap; }
.radius-btn, .duration-btn { padding: 8px 16px; border-radius: 20px; font-size: 13px; background: #f5f5f5; color: #666; }
.radius-btn.active, .duration-btn.active { background: #409EFF; color: #fff; }

.location-btn { display: flex; align-items: center; gap: 6px; padding: 10px; background: #ecf5ff; border-radius: 8px; }
.location-btn text { font-size: 13px; color: #409EFF; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -2px 8px rgba(0,0,0,0.06); }
.submit-btn { background: #409EFF; color: #fff; text-align: center; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 600; }
.submit-btn.disabled { opacity: 0.6; }
</style>
