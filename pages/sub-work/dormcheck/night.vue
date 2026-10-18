<template>
  <view class="rollcall-page">
    <!-- 点名时间 -->
    <view class="form-card">
      <view class="card-title">点名信息</view>
      <view class="form-item">
        <text class="form-label">点名日期 <text class="required">*</text></text>
        <picker mode="date" :value="form.checkDate" @change="onDateChange">
          <view class="form-picker">
            <text>{{ form.checkDate }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">点名时刻</text>
        <picker mode="time" :value="form.checkTime" @change="onTimeChange">
          <view class="form-picker">
            <text>{{ checkTimeText }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="form-label">备注</text>
        <input class="form-input" v-model="form.remark" placeholder="如：整层点完，2人请假" maxlength="200" />
      </view>
    </view>

    <!-- 夜间考勤凭证：现场逐床之外，可按学校要求校验楼栋定位与指定手势照片 -->
    <view class="form-card evidence-card">
      <view class="card-title-row">
        <text class="card-title">夜间考勤凭证</text>
        <text class="verify-tag" :class="locationVerified || !needsLocation ? 'ok' : 'wait'">{{ evidenceSummary }}</text>
      </view>
      <view class="mode-grid">
        <view class="mode-item" :class="{ active: attendanceMode === m.value }"
              v-for="m in modeOptions" :key="m.value" @click="pickAttendanceMode(m.value)">
          <text class="mode-title">{{ m.label }}</text>
          <text class="mode-desc">{{ m.desc }}</text>
        </view>
      </view>

      <view class="evidence-box" v-if="needsLocation">
        <view class="evidence-head">
          <text class="evidence-title">楼栋定位</text>
          <text class="evidence-op" @click="locateAndVerify">{{ locating ? '定位中...' : '重新定位' }}</text>
        </view>
        <view class="location-state" :class="{ ok: locationVerified, fail: locationData && !locationVerified }">
          <text>{{ locationMessage || '尚未定位；定位考勤一次只能提交同一栋楼，提交前需用手机当前位置完成校验' }}</text>
          <text class="location-addr" v-if="locationAddress">{{ locationAddress }}</text>
          <text class="location-coord" v-if="locationData">
            {{ fmtCoord(locationData.latitude) }}, {{ fmtCoord(locationData.longitude) }}
            <text v-if="locationData.accuracy"> · 精度 ±{{ fmtAccuracy(locationData.accuracy) }}m</text>
            <text v-if="locationDistance != null"> · 距楼栋 {{ locationDistance }}m</text>
          </text>
        </view>
      </view>

      <view class="evidence-box" v-if="needsGesture">
        <view class="evidence-head">
          <text class="evidence-title">指定手势照片</text>
          <text class="evidence-op" @click="requestGestureChallenge">{{ gestureLoading ? '获取中...' : (gestureChallenge ? '换一个手势' : '获取手势') }}</text>
        </view>
        <view class="gesture-prompt" v-if="gestureChallenge">
          <text class="gesture-pre">拍摄现场，画面中人员比出</text>
          <text class="gesture-name">{{ gestureChallenge.gestureLabel }}</text>
          <text class="gesture-expire">挑战 {{ challengeExpireText }} 前有效，仅可使用一次</text>
        </view>
        <view class="gesture-prompt empty" v-else>
          <text>先获取后端随机手势，再使用相机现场拍照，不能从相册选择</text>
        </view>
        <view class="gesture-photo-row" v-if="gestureChallenge">
          <image v-if="gesturePhoto" class="gesture-photo" :src="fullUrl(gesturePhoto)" mode="aspectFill" @click="previewGesturePhoto" />
          <view class="gesture-add" @click="captureGesturePhoto">
            <text>{{ gestureUploading ? '上传中' : (gesturePhoto ? '重拍' : '现场拍照') }}</text>
          </view>
          <text class="gesture-remove" v-if="gesturePhoto" @click="removeGesturePhoto">删除</text>
        </view>
      </view>
    </view>

    <!-- 点哪几间 -->
    <view class="form-card">
      <view class="card-title">选择宿舍</view>
      <view class="level-label">楼栋</view>
      <scroll-view scroll-x class="chip-scroll">
        <view class="chip-row">
          <text class="chip" :class="{ active: !buildingId }" @click="pickBuilding('')">全部</text>
          <text class="chip" :class="{ active: buildingId === b.buildingId }"
                v-for="b in buildingOptions" :key="b.buildingId" @click="pickBuilding(b.buildingId)">{{ b.label }}</text>
        </view>
      </scroll-view>
      <view class="level-label" v-if="buildingId">楼层</view>
      <scroll-view scroll-x class="chip-scroll" v-if="buildingId">
        <view class="chip-row">
          <text class="chip" :class="{ active: floorId === f.floorId }"
                v-for="f in floorOptions" :key="f.floorId" @click="pickFloor(f.floorId)">{{ f.label }}</text>
        </view>
      </scroll-view>

      <view class="room-block" v-if="roomOptions.length > 0">
        <view class="room-head">
          <text class="room-head-title">房间（点选加入本次点名）</text>
          <text class="room-head-op" @click="toggleAllRooms">{{ allRoomsChecked ? '取消全选' : '全选' }}</text>
        </view>
        <view class="room-grid">
          <view class="room-cell" :class="{ on: isRoomChecked(r.roomId) }"
                v-for="r in roomOptions" :key="r.roomId" @click="toggleRoom(r)">
            <text class="room-cell-text">{{ r.label }}</text>
          </view>
        </view>
      </view>
      <view class="empty-tip" v-if="checkedRoomIds.length === 0">
        <text>还没有选择房间{{ buildingId ? '，点上面的房间即可' : '，先选楼栋再选楼层' }}</text>
      </view>
    </view>

    <!-- 逐床点名 -->
    <view class="form-card" v-if="roomList.length > 0">
      <view class="card-title-row">
        <text class="card-title">逐床点名</text>
        <text class="title-op" @click="goRectify">整改复核 ›</text>
      </view>
      <view class="roster-tip">
        <text>请假/外宿按当晚单据已自动标好，其余逐床点实；全部点完才能提交。每张床可顺手标内务（只留痕不计分），违纪与违禁品仍在「整改复核」跟进</text>
      </view>
      <view class="bulk-line">
        <text class="bulk-btn" @click="markAllPresent">本批全部在寝</text>
      </view>

      <view class="room-group" v-for="g in roomList" :key="g.roomId">
        <view class="group-head">
          <text class="group-room">{{ g.roomNo }}</text>
          <text class="group-bed">{{ g.people.length }} 床</text>
          <text class="group-unmarked" v-if="unmarkedOf(g)">未点 {{ unmarkedOf(g) }}</text>
          <text class="group-op" @click="markRoomPresent(g)">整间在寝</text>
        </view>
        <view class="stu-row" v-for="p in g.people" :key="p.key">
          <view class="stu-line1">
            <text class="stu-name" :class="{ gray: !p.checkStatus }">{{ p.studentName }}</text>
            <text class="stu-bed" v-if="p.bedNo">{{ p.bedNo }}号床</text>
            <text class="stu-class" v-if="p.className">{{ p.className }}</text>
            <text class="rel-tag" :class="'rel-' + p.relation" v-if="relLabel(p.relation)">{{ relLabel(p.relation) }}</text>
          </view>
          <view class="stu-line2">
            <text class="stu-xh">{{ p.xh || '占位床（无学号）' }}</text>
            <text class="v-legacy" v-if="p.violationType">原记违纪·{{ p.violationType }}</text>
          </view>
          <view class="status-pills">
            <text class="pill" :class="pillClass(p, s.value)"
                  v-for="s in statusOptions" :key="s.value" @click="setStatus(p, s.value)">{{ s.label }}</text>
          </view>
          <view class="hw-pills">
            <text class="hw-cap">内务</text>
            <text class="hw-pill" :class="hwPillClass(p, h.value)"
                  v-for="h in houseworkOptions" :key="h.value" @click="setHousework(p, h.value)">{{ h.label }}</text>
          </view>
          <view class="hw-detail" v-if="hwEditable(p)">
            <view class="hw-chips">
              <text class="hw-chip" :class="hwItemClass(p, it.itemName)"
                    v-for="it in hygieneItems" :key="it.itemId" @click="toggleHwItem(p, it.itemName)">{{ it.itemName }}</text>
            </view>
            <view class="hw-photo-row">
              <image class="hw-thumb" v-for="(ph, pi) in p.houseworkPhotos" :key="pi" :src="fullUrl(ph)"
                     mode="aspectFill" @click="previewHwPhoto(p, pi)" @longpress="removeHwPhoto(p, pi)" />
              <view class="hw-add" @click="chooseHwPhoto(p)"><text>＋拍照</text></view>
              <text class="hw-hint" v-if="p.houseworkPhotos.length">长按缩略图可删除</text>
            </view>
            <input class="hw-remark" v-model="p.houseworkRemark" placeholder="内务备注" maxlength="200" />
          </view>
        </view>
        <view class="empty-beds" v-if="g.emptyText"><text>空床 {{ g.emptyBeds.length }} 张：{{ g.emptyText }}</text></view>
      </view>
    </view>

    <!-- 底部汇总与提交 -->
    <view class="foot-bar" v-if="checkedRoomIds.length > 0">
      <view class="foot-stat">
        <text class="fs-item">房间 {{ summary.roomCount }}</text>
        <text class="fs-item">应查 {{ summary.total }}</text>
        <text class="fs-item green">在寝 {{ summary.present }}</text>
        <text class="fs-item red">未归 {{ summary.absent }}</text>
        <text class="fs-item orange">晚归 {{ summary.late }}</text>
        <text class="fs-item blue">请假 {{ summary.leave }}</text>
        <text class="fs-item gray">外宿 {{ summary.offcampus }}</text>
        <text class="fs-item orange" v-if="summary.housework">内务问题 {{ summary.housework }}</text>
        <text class="fs-item orange" v-if="summary.unmarked">未点 {{ summary.unmarked }}</text>
      </view>
      <view class="foot-btns">
        <view class="btn-ghost" @click="submit('draft')"><text>保存草稿</text></view>
        <view class="btn-main" @click="submit('submitted')"><text>提交</text></view>
      </view>
    </view>

    <canvas canvas-id="watermarkCanvas" style="position:fixed;left:-9999px;top:-9999px;width:1920px;height:1920px;"></canvas>
  </view>
</template>

<script>
import {
  listDormBuildings,
  listDormFloors,
  listDormRooms,
  getNightRoster,
  addNightCheck,
  updateNightCheck,
  getNightCheck,
  listHouseworkItems,
  getNightGestureChallenge,
  verifyNightLocation
} from '@/api/work/dormcheck'
import { uploadFile, stripBaseUrl } from '@/utils/upload'
import config from '@/config'
import { enqueueRequest, isNetworkFailure, makeClientRequestId } from '@/utils/offlineQueue'
import { getWatermarkAddress, getWatermarkConfig } from '@/api/work/watermark'
import { getLocation, prepareCapture, addWatermark } from '@/utils/watermark'

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

function nowTime() {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00'
}

export default {
  data() {
    return {
      editId: null,
      form: {
        checkDate: today(),
        checkTime: nowTime(),
        remark: ''
      },
      attendanceMode: 'location_gesture',
      modeOptions: [
        { value: 'location_gesture', label: '定位 + 手势', desc: '定位入楼栋并拍指定手势' },
        { value: 'location', label: '定位点名', desc: '校验辅导员在楼栋范围' },
        { value: 'gesture', label: '手势照片', desc: '现场人员按随机手势合影' },
        { value: 'onsite', label: '现场逐床', desc: '仅逐床登记，不取凭证' }
      ],
      locationData: null,
      locationAddress: '',
      locationDistance: null,
      locationMessage: '',
      locationVerified: false,
      locating: false,
      gestureChallenge: null,
      gesturePhoto: '',
      gestureLoading: false,
      gestureUploading: false,
      watermarkConfig: null,
      buildingOptions: [],
      floorOptions: [],
      roomOptions: [],
      buildingId: '',
      floorId: '',
      checkedRoomIds: [],
      // roomId → 名册卡片（床位状态就记在卡片里，切换勾选不丢已点结果）
      roomCache: {},
      roomList: [],
      rosterLoading: false,
      submitting: false,
      statusOptions: [
        { value: 'present', label: '在寝' },
        { value: 'absent', label: '未归' },
        { value: 'late', label: '晚归' },
        { value: 'leave', label: '请假' },
        { value: 'offcampus', label: '外宿' }
      ],
      // 小程序端没有字典插件，内务等级与状态一样在此写死；PC 端读 dorm_housework_level 字典
      houseworkOptions: [
        { value: 'tidy', label: '整洁' },
        { value: 'normal', label: '一般' },
        { value: 'messy', label: '凌乱' }
      ],
      // 内务问题项候选：借用 check 线启用中的 hygiene（内务卫生）标准，只作留痕不计分
      hygieneItems: [],
      hwUploading: 0,
      clientRequestId: ''
    }
  },
  computed: {
    checkTimeText() {
      const s = this.form.checkTime || ''
      return s.length > 5 ? s.substring(0, 5) : s
    },
    needsLocation() {
      return this.attendanceMode === 'location' || this.attendanceMode === 'location_gesture'
    },
    needsGesture() {
      return this.attendanceMode === 'gesture' || this.attendanceMode === 'location_gesture'
    },
    evidenceSummary() {
      if (!this.needsLocation && !this.needsGesture) return '无需取凭证'
      if (this.needsLocation && !this.locationVerified) return '待定位'
      if (this.needsGesture && (!this.gestureChallenge || !this.gesturePhoto)) return '待手势照'
      return '凭证已就绪'
    },
    challengeExpireText() {
      if (!this.gestureChallenge || !this.gestureChallenge.expireTime) return ''
      const text = String(this.gestureChallenge.expireTime)
      return text.length >= 16 ? text.substring(11, 16) : text
    },
    allRoomsChecked() {
      return this.roomOptions.length > 0 &&
        this.roomOptions.every(r => this.checkedRoomIds.indexOf(String(r.roomId)) > -1)
    },
    summary() {
      const s = { roomCount: this.roomList.length, total: 0, present: 0, absent: 0, late: 0, leave: 0, offcampus: 0, unmarked: 0, housework: 0 }
      this.roomList.forEach(g => {
        g.people.forEach(p => {
          s.total++
          if (!p.checkStatus) s.unmarked++
          else if (s[p.checkStatus] !== undefined) s[p.checkStatus]++
          if (this.houseworkProblem(p)) s.housework++
        })
      })
      return s
    }
  },
  onLoad(options) {
    this.loadBuildings()
    this.loadHouseworkItems()
    this.loadWatermarkConfig()
    if (options && options.id) {
      this.editId = options.id
      this.loadForEdit(options.id)
    }
  },
  methods: {
    pickAttendanceMode(value) {
      this.attendanceMode = value
      if (!this.needsLocation) {
        this.locationVerified = false
        this.locationDistance = null
        this.locationMessage = ''
      }
      if (!this.needsGesture) {
        this.gestureChallenge = null
        this.gesturePhoto = ''
      }
    },
    loadWatermarkConfig() {
      getWatermarkConfig('dorm_night_check').then(res => {
        this.watermarkConfig = res.data || null
      }).catch(() => {
        this.watermarkConfig = null
      })
    },
    async locateAndVerify() {
      return this.captureAndVerifyLocation(false)
    },
    async captureAndVerifyLocation(silent) {
      if (this.locating) return false
      this.locating = true
      if (!silent) uni.showLoading({ title: '定位中...' })
      try {
        const location = await getLocation()
        if (!location) {
          this.locationVerified = false
          this.locationMessage = '未获取到定位，请开启定位权限后重试'
          if (!silent) uni.showToast({ title: this.locationMessage, icon: 'none' })
          return false
        }
        this.locationData = location
        this.locationMessage = '已获取当前位置，正在匹配楼栋...'
        try {
          const addressRes = await getWatermarkAddress(location.latitude, location.longitude)
          this.locationAddress = (addressRes && addressRes.data) || ''
        } catch (e) {
          this.locationAddress = ''
        }
        return await this.verifySelectedLocation(silent)
      } finally {
        this.locating = false
        if (!silent) uni.hideLoading()
      }
    },
    async verifySelectedLocation(silent) {
      if (!this.locationData) {
        this.locationVerified = false
        this.locationMessage = '请先获取当前位置'
        return false
      }
      if (!this.checkedRoomIds.length) {
        this.locationVerified = false
        this.locationMessage = '已获取位置，选择点名房间后再校验楼栋范围'
        return false
      }
      try {
        const res = await verifyNightLocation({
          roomIds: this.checkedRoomIds.map(id => Number(id)),
          latitude: this.locationData.latitude,
          longitude: this.locationData.longitude,
          accuracy: this.locationData.accuracy || null
        })
        const data = res.data || {}
        this.locationVerified = !!data.verified
        this.locationDistance = data.distance != null ? data.distance : null
        this.locationMessage = data.message || (data.verified ? '定位校验通过' : '定位校验未通过')
        if (!data.verified && !silent) uni.showToast({ title: this.locationMessage, icon: 'none', duration: 2500 })
        return !!data.verified
      } catch (e) {
        this.locationVerified = false
        this.locationMessage = (e && e.message) || '定位校验失败，请重试'
        return false
      }
    },
    async requestGestureChallenge() {
      if (this.gestureLoading) return
      this.gestureLoading = true
      try {
        const res = await getNightGestureChallenge()
        if (res.code !== 200 || !res.data) {
          uni.showToast({ title: res.msg || '获取手势失败', icon: 'none' })
          return
        }
        this.gestureChallenge = res.data
        this.gesturePhoto = ''
      } catch (e) {
        uni.showToast({ title: '获取手势失败', icon: 'none' })
      } finally {
        this.gestureLoading = false
      }
    },
    captureGesturePhoto() {
      if (this.gestureUploading) return
      if (!this.gestureChallenge) {
        uni.showToast({ title: '请先获取指定手势', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera'],
        success: async res => {
          this.gestureUploading = true
          uni.showLoading({ title: '加定位水印并上传...' })
          try {
            const capture = await prepareCapture(this.watermarkConfig, this.locationAddress || '宿舍夜间考勤')
            if (!capture.ready) {
              uni.hideLoading()
              uni.showToast({ title: capture.message, icon: 'none', duration: 2500 })
              return
            }
            const watermarked = await addWatermark(res.tempFilePaths[0], this.watermarkConfig, capture.captureInfo)
            const url = await uploadFile(watermarked)
            this.gesturePhoto = stripBaseUrl(url)
          } catch (e) {
            uni.hideLoading()
            uni.showToast({ title: '手势照片上传失败', icon: 'none' })
          } finally {
            uni.hideLoading()
            this.gestureUploading = false
          }
        }
      })
    },
    removeGesturePhoto() {
      this.gesturePhoto = ''
    },
    previewGesturePhoto() {
      if (!this.gesturePhoto) return
      uni.previewImage({ current: 0, urls: [this.fullUrl(this.gesturePhoto)] })
    },
    fmtCoord(value) {
      return value == null ? '-' : Number(value).toFixed(6)
    },
    fmtAccuracy(value) {
      return value == null ? '-' : String(Math.round(value))
    },
    challengeExpired() {
      if (!this.gestureChallenge || !this.gestureChallenge.expireTime) return true
      return new Date(String(this.gestureChallenge.expireTime).replace(/-/g, '/')).getTime() <= Date.now()
    },
    async ensureAttendanceEvidence() {
      if (this.needsLocation) {
        const ok = await this.captureAndVerifyLocation(true)
        if (!ok) {
          uni.showToast({ title: this.locationMessage || '楼栋定位校验未通过', icon: 'none', duration: 2500 })
          return false
        }
      }
      if (this.needsGesture) {
        if (!this.gestureChallenge) {
          uni.showToast({ title: '请先获取指定手势', icon: 'none' })
          return false
        }
        if (this.challengeExpired()) {
          uni.showToast({ title: '手势挑战已过期，请重新获取并拍照', icon: 'none' })
          return false
        }
        if (!this.gesturePhoto) {
          uni.showToast({ title: '请按指定手势现场拍照', icon: 'none' })
          return false
        }
      }
      return true
    },
    onDateChange(e) {
      this.form.checkDate = e.detail.value
      this.refreshSuggestions()
    },
    onTimeChange(e) {
      // picker 只给 HH:mm，后端字段是 HH:mm:ss
      const v = e.detail.value
      this.form.checkTime = v.length === 5 ? v + ':00' : v
    },
    loadBuildings() {
      listDormBuildings({}).then(res => {
        this.buildingOptions = res.data || []
      }).catch(() => {})
    },
    pickBuilding(id) {
      if (String(id) === String(this.buildingId)) return
      this.buildingId = id
      this.floorId = ''
      this.floorOptions = []
      this.roomOptions = []
      if (!id) return
      listDormFloors(id).then(res => {
        this.floorOptions = res.data || []
        if (this.floorOptions.length) this.pickFloor(this.floorOptions[0].floorId)
      }).catch(() => {})
    },
    pickFloor(id) {
      this.floorId = id
      this.roomOptions = []
      if (!id) return
      const bid = this.buildingId
      listDormRooms(bid, id).then(res => {
        this.roomOptions = res.data || []
      }).catch(() => {})
    },
    isRoomChecked(roomId) {
      return this.checkedRoomIds.indexOf(String(roomId)) > -1
    },
    toggleRoom(room) {
      const key = String(room.roomId)
      const ids = this.checkedRoomIds.slice()
      const idx = ids.indexOf(key)
      if (idx > -1) ids.splice(idx, 1)
      else ids.push(key)
      this.applyChecked(ids)
    },
    toggleAllRooms() {
      const ids = this.checkedRoomIds.slice()
      if (this.allRoomsChecked) {
        this.roomOptions.forEach(r => {
          const idx = ids.indexOf(String(r.roomId))
          if (idx > -1) ids.splice(idx, 1)
        })
        this.applyChecked(ids)
        return
      }
      this.roomOptions.forEach(r => {
        const key = String(r.roomId)
        if (ids.indexOf(key) === -1) ids.push(key)
      })
      this.applyChecked(ids)
    },
    /** 勾选变化 → 名册：已缓存的房间直接用（取消勾选不清缓存，误点不丢已录状态），新增的整间拉一次 */
    applyChecked(ids) {
      this.checkedRoomIds = ids
      if (!ids.length) {
        this.roomList = []
        this.locationVerified = false
        this.locationDistance = null
        if (this.needsLocation && this.locationData) {
          this.locationMessage = '已获取位置，选择点名房间后再校验楼栋范围'
        }
        return
      }
      if (this.needsLocation && this.locationData) {
        this.verifySelectedLocation(true)
      }
      const need = ids.filter(id => !this.roomCache[id])
      if (!need.length) {
        this.renderRooms()
        return
      }
      this.rosterLoading = true
      getNightRoster(need, this.form.checkDate).then(res => {
        this.rosterLoading = false
        this.fillCache(res.data || [])
        this.renderRooms()
      }).catch(() => {
        this.rosterLoading = false
        this.renderRooms()
      })
    },
    fillCache(rooms) {
      rooms.forEach(raw => {
        const key = String(raw.roomId)
        if (this.checkedRoomIds.indexOf(key) === -1) return
        this.$set(this.roomCache, key, this.buildRoom(raw))
      })
    },
    /** 换日期：已点过的状态不动，只把「未点」床位按新日期的请假/外宿重新预填 */
    refreshSuggestions() {
      if (this.editId || !this.checkedRoomIds.length) return
      getNightRoster(this.checkedRoomIds.slice(), this.form.checkDate).then(res => {
        const byRoom = {}
        ;(res.data || []).forEach(raw => {
          const map = {}
          ;(raw.beds || []).forEach(b => { map[b.bedNo] = b })
          byRoom[String(raw.roomId)] = map
        })
        this.checkedRoomIds.forEach(id => {
          const room = this.roomCache[id]
          const beds = byRoom[id]
          if (!room || !beds) return
          room.people.forEach(p => {
            if (p.checkStatus) return
            const b = beds[p.bedNo]
            if (!b || !b.suggestStatus) return
            p.checkStatus = b.suggestStatus
            p.leaveId = b.suggestStatus === 'leave' ? b.leaveId : null
          })
        })
      }).catch(() => {})
    },
    renderRooms() {
      const list = this.checkedRoomIds.map(id => this.roomCache[id]).filter(r => !!r)
      list.sort((l, r) => {
        const b = String(l.buildingName || '').localeCompare(String(r.buildingName || ''))
        if (b) return b
        const f = (l.floorNo || 0) - (r.floorNo || 0)
        if (f) return f
        return String(l.roomNo || '').localeCompare(String(r.roomNo || ''), 'en', { numeric: true })
      })
      this.roomList = list
    },
    /** 一间房的床位 → 卡片：有住人的床逐床点名（外院在住占位床也实名在册），空床只列床号 */
    buildRoom(raw) {
      const people = []
      const emptyBeds = []
      ;(raw.beds || []).forEach(b => {
        if (!b.relation) {
          if (b.status !== 'maintenance') emptyBeds.push(b.bedNo)
          return
        }
        const suggest = b.suggestStatus || ''
        people.push({
          key: String(raw.roomId) + ':' + b.bedNo,
          roomId: raw.roomId,
          roomNo: raw.roomNo,
          bedNo: b.bedNo,
          xh: b.currentXh || '',
          studentName: b.currentName || (b.relation === 'other_college' ? '外院在住' : '未在住台账'),
          bjdm: b.currentBjdm || '',
          // 外院在住占位床没有班级，第二格给标记时填的学院，至少知道是哪边的床
          className: b.currentClassShort
            || (b.relation === 'other_college' ? (b.occupantCollegeName || '其他学院') : ''),
          relation: b.relation,
          checkStatus: suggest,
          leaveId: suggest === 'leave' ? b.leaveId : null,
          violationType: null,
          houseworkLevel: '',
          houseworkItems: [],
          houseworkPhotos: [],
          houseworkRemark: ''
        })
      })
      people.sort((l, r) => String(l.bedNo || '').localeCompare(String(r.bedNo || ''), 'en', { numeric: true }))
      return {
        roomId: String(raw.roomId),
        roomNo: raw.roomNo,
        buildingId: raw.buildingId,
        buildingName: raw.buildingName,
        floorNo: raw.floorNo,
        people: people,
        emptyBeds: emptyBeds,
        emptyText: emptyBeds.join('、')
      }
    },
    /** 草稿：入库明细反推成房间卡片，名册以当时登记的为准 */
    buildRoomFromDetails(roomId, list) {
      const first = list[0] || {}
      const people = list.map((d, i) => ({
        key: String(roomId) + ':' + (d.bedNo || i),
        roomId: d.roomId,
        roomNo: d.roomNo,
        bedNo: d.bedNo,
        xh: d.xh || '',
        studentName: d.studentName || '未在住台账',
        bjdm: d.bjdm || '',
        className: '',
        relation: d.xh ? 'mine' : 'other_college',
        // 违纪已移出点名线：存量违纪行按未点载入，改点成在场状态后才能保存
        checkStatus: d.checkStatus === 'violation' ? '' : (d.checkStatus || ''),
        leaveId: d.leaveId || null,
        violationType: d.violationType || null,
        houseworkLevel: d.houseworkLevel || '',
        houseworkItems: d.houseworkItems ? d.houseworkItems.split(',').filter(x => !!x) : [],
        houseworkPhotos: d.houseworkPhotos ? d.houseworkPhotos.split(/[ ,]+/).filter(x => !!x) : [],
        houseworkRemark: d.remark || ''
      }))
      people.sort((l, r) => String(l.bedNo || '').localeCompare(String(r.bedNo || ''), 'en', { numeric: true }))
      return {
        roomId: String(roomId),
        roomNo: first.roomNo || String(roomId),
        buildingId: null,
        buildingName: '',
        floorNo: null,
        people: people,
        emptyBeds: [],
        emptyText: ''
      }
    },
    relLabel(relation) {
      if (relation === 'peer') return '同院'
      if (relation === 'other_college') return '外院'
      return ''
    },
    unmarkedOf(g) {
      return g.people.filter(p => !p.checkStatus).length
    },
    // 小程序模板不支持 :class 数组字面量，选中态拼成字符串返回
    pillClass(p, value) {
      return p.checkStatus === value ? value + ' on' : value
    },
    setStatus(p, value) {
      p.checkStatus = value
      p.leaveId = value === 'leave' ? p.leaveId : null
    },
    /* ---------- 内务轻标记（只留痕，不计分；记分与整改归「宿舍检查」线） ---------- */
    /** 与后端 recount 同口径：凌乱或勾了问题项才算「内务问题床」 */
    houseworkProblem(p) {
      return p.houseworkLevel === 'messy' || (p.houseworkItems || []).length > 0
    },
    hwPillClass(p, value) {
      return p.houseworkLevel === value ? value + ' on' : value
    },
    /** 点同一档取消；「整洁」是判过没问题，不再展开问题项 */
    setHousework(p, value) {
      p.houseworkLevel = p.houseworkLevel === value ? '' : value
      if (!p.houseworkLevel || p.houseworkLevel === 'tidy') p.houseworkItems = []
    },
    hwEditable(p) {
      return !!p.houseworkLevel && p.houseworkLevel !== 'tidy'
    },
    hwItemClass(p, name) {
      return (p.houseworkItems || []).indexOf(name) > -1 ? 'on' : ''
    },
    toggleHwItem(p, name) {
      if (!p.houseworkItems) this.$set(p, 'houseworkItems', [])
      const idx = p.houseworkItems.indexOf(name)
      if (idx > -1) p.houseworkItems.splice(idx, 1)
      else p.houseworkItems.push(name)
    },
    loadHouseworkItems() {
      listHouseworkItems().then(res => {
        this.hygieneItems = res.data || []
      }).catch(() => { this.hygieneItems = [] })
    },
    /** 现场拍照：入库存相对路径，显示时再拼 baseUrl（反代后后端返回的 url 可能是内网地址） */
    chooseHwPhoto(p) {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: res => {
          this.hwUploading++
          uni.showLoading({ title: '上传中' })
          uploadFile(res.tempFilePaths[0]).then(url => {
            this.hwUploading--
            uni.hideLoading()
            if (!p.houseworkPhotos) this.$set(p, 'houseworkPhotos', [])
            p.houseworkPhotos.push(stripBaseUrl(url))
          }).catch(() => {
            this.hwUploading--
            uni.hideLoading()
            uni.showToast({ title: '照片上传失败', icon: 'none' })
          })
        }
      })
    },
    removeHwPhoto(p, idx) {
      p.houseworkPhotos.splice(idx, 1)
    },
    previewHwPhoto(p, idx) {
      uni.previewImage({ current: idx, urls: (p.houseworkPhotos || []).map(x => this.fullUrl(x)) })
    },
    /** 相对路径 → 可显示地址；已是绝对地址（历史数据）原样返回。模板只能调组件方法，故不做成模块级函数 */
    fullUrl(path) {
      if (!path) return ''
      if (path.indexOf('http') === 0) return path
      return config.baseUrl + (path.indexOf('/profile') === 0 ? path : '/profile' + path)
    },
    markRoomPresent(g) {
      g.people.forEach(p => this.setStatus(p, 'present'))
    },
    markAllPresent() {
      this.roomList.forEach(g => this.markRoomPresent(g))
    },
    /** 点名线不记违纪：违禁品等问题由「宿舍检查」线内务记分后下达整改，小程序只看整改进度 */
    goRectify() {
      uni.navigateTo({ url: '/pages/sub-work/dormcheck/rectify' })
    },
    loadForEdit(id) {
      getNightCheck(id).then(res => {
        const data = res.data
        if (!data) return
        this.form.checkDate = (data.checkDate || '').substring(0, 10) || this.form.checkDate
        this.form.checkTime = data.checkTime || this.form.checkTime
        this.form.remark = data.remark || ''
        this.attendanceMode = data.attendanceMode || 'onsite'
        if (data.checkLatitude != null && data.checkLongitude != null) {
          this.locationData = {
            latitude: data.checkLatitude,
            longitude: data.checkLongitude,
            accuracy: data.checkAccuracy || 0
          }
          this.locationAddress = data.checkAddress || ''
          this.locationDistance = data.checkDistance != null ? data.checkDistance : null
          this.locationVerified = data.locationVerified === '1'
          this.locationMessage = data.verifyMessage || ''
        }
        if (data.gestureToken) {
          this.gestureChallenge = {
            token: data.gestureToken,
            gestureCode: data.gestureCode,
            gestureLabel: data.gestureLabel,
            expireTime: null
          }
          this.gesturePhoto = data.gesturePhoto || ''
        } else if (data.gestureLabel) {
          // token 不回传前端；重新进入草稿必须重新获取一次性手势
          this.gestureChallenge = null
          this.gesturePhoto = data.gesturePhoto || ''
        }
        const map = {}
        const ids = []
        ;(data.detailList || []).forEach(d => {
          const key = String(d.roomId)
          if (!map[key]) {
            map[key] = []
            ids.push(key)
          }
          map[key].push(d)
        })
        const cache = {}
        ids.forEach(key => { cache[key] = this.buildRoomFromDetails(key, map[key]) })
        this.roomCache = cache
        this.checkedRoomIds = ids
        this.buildingId = data.buildingId ? String(data.buildingId) : ''
        this.renderRooms()
        if (data.buildingId) this.pickBuilding(data.buildingId)
      }).catch(() => {})
    },
    validate(status) {
      if (!this.form.checkDate) {
        uni.showToast({ title: '请选择点名日期', icon: 'none' })
        return false
      }
      const total = this.summary.total
      if (total === 0) {
        uni.showToast({ title: '请至少选择一间有住人的宿舍', icon: 'none' })
        return false
      }
      if (status === 'submitted' && this.summary.unmarked > 0) {
        uni.showToast({ title: '还有 ' + this.summary.unmarked + ' 个床位未点名', icon: 'none' })
        return false
      }
      return true
    },
    buildPayload(status) {
      const details = []
      this.roomList.forEach(g => {
        g.people.forEach(p => {
          details.push({
            roomId: Number(p.roomId),
            roomNo: p.roomNo,
            bedNo: p.bedNo,
            xh: p.xh || null,
            studentName: p.studentName,
            bjdm: p.bjdm || null,
            checkStatus: p.checkStatus || null,
            leaveId: p.leaveId || null,
            houseworkLevel: p.houseworkLevel || null,
            houseworkItems: (p.houseworkItems || []).join(',') || null,
            houseworkPhotos: (p.houseworkPhotos || []).join(',') || null,
            remark: p.houseworkRemark || null
          })
        })
      })
      return {
        id: this.editId || null,
        clientRequestId: this.clientRequestId || undefined,
        checkDate: this.form.checkDate,
        checkTime: this.form.checkTime,
        remark: this.form.remark,
        buildingId: this.scopeBuildingId(),
        buildingName: this.scopeBuildingName(),
        floor: this.scopeFloor(),
        attendanceMode: this.attendanceMode,
        checkLatitude: this.needsLocation && this.locationData ? this.locationData.latitude : null,
        checkLongitude: this.needsLocation && this.locationData ? this.locationData.longitude : null,
        checkAccuracy: this.needsLocation && this.locationData ? (this.locationData.accuracy || null) : null,
        checkAddress: this.needsLocation ? (this.locationAddress || null) : null,
        gestureToken: this.needsGesture && this.gestureChallenge ? this.gestureChallenge.token : null,
        gesturePhoto: this.needsGesture ? (this.gesturePhoto || null) : null,
        // 应查与各状态计数一律由后端按明细重算，这里只送逐床明细
        status: status,
        detailList: details
      }
    },
    /** 跨楼栋/跨楼层登记时主表只留一条：楼栋存合并名称，楼层留空 */
    scopeBuildings() {
      const out = []
      this.roomList.forEach(r => {
        if (r.buildingId && !out.some(b => b.buildingId === r.buildingId)) {
          out.push({ buildingId: r.buildingId, buildingName: r.buildingName })
        }
      })
      return out
    },
    scopeBuildingId() {
      const list = this.scopeBuildings()
      return list.length === 1 ? list[0].buildingId : null
    },
    scopeBuildingName() {
      const list = this.scopeBuildings()
      if (!list.length) return ''
      return list.map(b => b.buildingName).join('、').substring(0, 50)
    },
    scopeFloor() {
      if (this.scopeBuildings().length !== 1) return null
      const floors = []
      this.roomList.forEach(r => {
        if (r.floorNo != null && floors.indexOf(r.floorNo) === -1) floors.push(r.floorNo)
      })
      return floors.length === 1 ? floors[0] : null
    },
    async submit(status) {
      if (this.submitting || !this.validate(status)) return
      if (status === 'submitted') {
        const evidenceReady = await this.ensureAttendanceEvidence()
        if (!evidenceReady) return
      }
      this.submitting = true
      const payload = this.buildPayload(status)
      if (!this.editId && !payload.clientRequestId) {
        payload.clientRequestId = makeClientRequestId('DORMNIGHT')
        this.clientRequestId = payload.clientRequestId
      }
      const req = this.editId ? updateNightCheck(payload) : addNightCheck(payload)
      req.then(res => {
        this.submitting = false
        if (res.code === 200) {
          uni.showToast({ title: status === 'submitted' ? '已提交' : '草稿已保存', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 600)
        } else {
          uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
        }
      }).catch(async error => {
        this.submitting = false
        if (isNetworkFailure(error) && status === 'submitted' && (this.needsLocation || this.needsGesture)) {
          uni.showToast({ title: '网络较弱，现场凭证尚未提交，请恢复网络后重试', icon: 'none', duration: 2500 })
          return
        }
        if (isNetworkFailure(error)) {
          const result = await enqueueRequest({
            businessType: this.editId ? 'dorm_night_update' : 'dorm_night_add',
            title: '夜间考勤：' + (this.form.checkDate || ''),
            clientRequestId: payload.clientRequestId,
            request: {
              url: '/api/teacher/dorm/night',
              method: this.editId ? 'put' : 'post',
              data: payload
            }
          })
          uni.showToast({
            title: result.duplicate ? '已在待同步队列' : '网络较弱，已加入待同步',
            icon: 'none'
          })
          setTimeout(() => uni.navigateBack(), 800)
        } else {
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.rollcall-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 20rpx 20rpx 220rpx;
}
.form-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.card-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}
.card-title-row .card-title { margin-bottom: 0; }
.title-op {
  margin-left: auto;
  font-size: 24rpx;
  color: #667eea;
}
.form-item { margin-bottom: 16rpx; }
.form-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}
.required { color: #f56c6c; }
.form-input {
  height: 72rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #333;
}
.form-picker {
  height: 72rpx;
  line-height: 72rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #333;
  display: flex;
  justify-content: space-between;
}
.picker-arrow { color: #bbb; font-size: 20rpx; }
.verify-tag {
  margin-left: auto;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  background: #fdf6ec;
  color: #e6a23c;
}
.verify-tag.ok { background: #e8f5e9; color: #4caf50; }
.mode-grid { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.mode-item {
  width: calc(50% - 6rpx);
  box-sizing: border-box;
  padding: 14rpx 16rpx;
  border: 1rpx solid #e5e6eb;
  border-radius: 10rpx;
  background: #fafafa;
}
.mode-item.active { border-color: #667eea; background: #eef0ff; }
.mode-title { display: block; font-size: 24rpx; font-weight: 600; color: #333; }
.mode-item.active .mode-title { color: #4c5fce; }
.mode-desc { display: block; margin-top: 4rpx; font-size: 20rpx; line-height: 30rpx; color: #999; }
.evidence-box {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 10rpx;
  background: #f8f9fb;
}
.evidence-head { display: flex; align-items: center; }
.evidence-title { font-size: 24rpx; font-weight: 600; color: #555; }
.evidence-op { margin-left: auto; font-size: 22rpx; color: #667eea; padding: 4rpx 0 4rpx 16rpx; }
.location-state {
  margin-top: 10rpx;
  padding: 14rpx;
  border-radius: 8rpx;
  background: #fff8e1;
  font-size: 22rpx;
  line-height: 32rpx;
  color: #b88230;
}
.location-state.ok { background: #edf8ee; color: #388e3c; }
.location-state.fail { background: #fff0f0; color: #d64d4d; }
.location-addr, .location-coord { display: block; margin-top: 4rpx; color: #888; }
.gesture-prompt {
  margin-top: 10rpx;
  padding: 16rpx;
  border-radius: 8rpx;
  background: #eef0ff;
  text-align: center;
}
.gesture-prompt.empty { background: #f5f5f5; color: #999; font-size: 22rpx; line-height: 32rpx; text-align: left; }
.gesture-pre { display: block; font-size: 22rpx; color: #777; }
.gesture-name { display: block; margin: 4rpx 0; font-size: 34rpx; font-weight: 700; color: #4c5fce; }
.gesture-expire { display: block; font-size: 20rpx; color: #999; }
.gesture-photo-row { display: flex; align-items: center; gap: 14rpx; margin-top: 12rpx; }
.gesture-photo { width: 150rpx; height: 150rpx; border-radius: 10rpx; background: #eee; }
.gesture-add {
  width: 150rpx;
  height: 70rpx;
  line-height: 70rpx;
  text-align: center;
  border: 1rpx dashed #667eea;
  border-radius: 10rpx;
  color: #667eea;
  font-size: 22rpx;
}
.gesture-remove { font-size: 22rpx; color: #f56c6c; }
.level-label {
  font-size: 24rpx;
  color: #999;
  margin: 14rpx 0 8rpx;
}
.chip-scroll { width: 100%; }
.chip-row { display: flex; gap: 12rpx; white-space: nowrap; }
.chip {
  padding: 10rpx 22rpx;
  border-radius: 22rpx;
  font-size: 24rpx;
  color: #666;
  background: #f5f5f5;
  flex-shrink: 0;
}
.chip.active { background: #667eea; color: #fff; }
.room-block { margin-top: 16rpx; }
.room-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.room-head-title { font-size: 24rpx; color: #999; }
.room-head-op { font-size: 24rpx; color: #667eea; }
.room-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.room-cell {
  padding: 12rpx 18rpx;
  border-radius: 8rpx;
  border: 1rpx solid #e5e6eb;
  background: #fff;
}
.room-cell.on { border-color: #667eea; background: #eef0ff; }
.room-cell-text { font-size: 24rpx; color: #333; }
.room-cell.on .room-cell-text { color: #667eea; font-weight: 500; }
.empty-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #bbb;
  font-size: 26rpx;
}
.roster-tip {
  font-size: 22rpx;
  color: #999;
  line-height: 34rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  padding: 12rpx 16rpx;
}
.bulk-line { display: flex; justify-content: flex-end; margin-top: 12rpx; }
.bulk-btn {
  font-size: 22rpx;
  color: #667eea;
  padding: 6rpx 18rpx;
  border-radius: 18rpx;
  background: #eef0ff;
}
.room-group {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
  margin-top: 16rpx;
}
.room-group:first-of-type { border-top: none; padding-top: 0; margin-top: 4rpx; }
.group-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.group-room { font-size: 28rpx; font-weight: 600; color: #333; }
.group-bed { font-size: 22rpx; color: #999; }
.group-unmarked {
  font-size: 20rpx;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 2rpx 10rpx;
  border-radius: 14rpx;
}
.group-op {
  margin-left: auto;
  font-size: 22rpx;
  color: #667eea;
  padding: 4rpx 14rpx;
  border-radius: 16rpx;
  background: #eef0ff;
}
.stu-row {
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f7f7f7;
}
.stu-row:last-child { border-bottom: none; }
.stu-line1 { display: flex; align-items: baseline; gap: 12rpx; }
.stu-name { font-size: 28rpx; color: #333; font-weight: 500; }
.stu-name.gray { color: #909399; font-weight: normal; }
.stu-bed { font-size: 22rpx; color: #ff9800; }
.stu-class { font-size: 22rpx; color: #999; }
.rel-tag {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: #f7f8fa;
  color: #909399;
}
.rel-tag.rel-peer { color: #e6a23c; background: #fdf6ec; }
.rel-tag.rel-other_college { color: #f56c6c; background: #fef0f0; }
.stu-line2 { margin-top: 4rpx; display: flex; gap: 12rpx; align-items: baseline; }
.stu-xh { font-size: 22rpx; color: #bbb; }
.v-legacy { font-size: 20rpx; color: #f56c6c; }
.empty-beds {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #bbb;
}
.status-pills { display: flex; gap: 8rpx; margin-top: 10rpx; }
.pill {
  flex: 1;
  text-align: center;
  padding: 10rpx 0;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #888;
  background: #f5f5f5;
}
.pill.on.present { background: #e8f5e9; color: #4caf50; font-weight: 500; }
.pill.on.absent { background: #ffebee; color: #f44336; font-weight: 500; }
.pill.on.late { background: #fff3e0; color: #ff9800; font-weight: 500; }
.pill.on.leave { background: #e3f2fd; color: #1976d2; font-weight: 500; }
.pill.on.offcampus { background: #eceff1; color: #607d8b; font-weight: 500; }
/* 内务轻标记：字号比在位状态小一档、底色更浅，别让人读成第六个状态 */
.hw-pills { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.hw-cap { flex: 0 0 auto; font-size: 20rpx; color: #aaa; }
.hw-pill { flex: 1; text-align: center; padding: 6rpx 0; border-radius: 8rpx; font-size: 20rpx; color: #999; background: #fafafa; border: 1rpx solid #f0f0f0; }
.hw-pill.on.tidy { background: #f1f8e9; color: #4caf50; border-color: #c8e6c9; }
.hw-pill.on.normal { background: #fff8e1; color: #fb8c00; border-color: #ffe082; }
.hw-pill.on.messy { background: #fce4ec; color: #e53935; border-color: #ffcdd2; }
.hw-detail { margin-top: 8rpx; padding: 12rpx; background: #fafafa; border-radius: 8rpx; }
.hw-chips { display: flex; flex-wrap: wrap; gap: 8rpx; }
.hw-chip { font-size: 20rpx; color: #777; background: #fff; border: 1rpx solid #e5e5e5; border-radius: 20rpx; padding: 6rpx 14rpx; }
.hw-chip.on { color: #fff; background: #f56c6c; border-color: #f56c6c; }
.hw-photo-row { display: flex; align-items: center; gap: 10rpx; margin-top: 12rpx; }
.hw-thumb { width: 84rpx; height: 84rpx; border-radius: 8rpx; background: #eee; }
.hw-add { width: 84rpx; height: 84rpx; border-radius: 8rpx; border: 1rpx dashed #ccc;
  display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #999; }
.hw-hint { font-size: 20rpx; color: #bbb; }
.hw-remark { margin-top: 12rpx; height: 56rpx; padding: 0 14rpx; font-size: 22rpx; background: #fff;
  border: 1rpx solid #e5e5e5; border-radius: 8rpx; }
.foot-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #eee;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
}
.foot-stat { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 12rpx; }
.fs-item { font-size: 22rpx; color: #666; }
.fs-item.green { color: #4caf50; }
.fs-item.red { color: #f44336; }
.fs-item.orange { color: #ff9800; }
.fs-item.blue { color: #1976d2; }
.fs-item.gray { color: #607d8b; }
.foot-btns { display: flex; gap: 16rpx; }
.btn-ghost, .btn-main {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  font-size: 28rpx;
}
.btn-ghost { border: 1rpx solid #667eea; color: #667eea; }
.btn-main {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
</style>
