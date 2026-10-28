<template>
  <view class="page-container">
    <view class="form-section">
      <view class="section-title">晚寝确认范围</view>
      <view class="field-label">楼栋</view>
      <scroll-view scroll-x class="chip-scroll">
        <view class="chips">
          <view
            v-for="item in buildingOptions"
            :key="item.buildingId"
            class="chip"
            :class="{ active: String(buildingId) === String(item.buildingId) }"
            @click="pickBuilding(item)"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>

      <view v-if="buildingId">
        <view class="field-label">楼层</view>
        <scroll-view scroll-x class="chip-scroll">
          <view class="chips">
            <view
              v-for="item in floorOptions"
              :key="item.floorId"
              class="chip"
              :class="{ active: String(floorId) === String(item.floorId) }"
              @click="pickFloor(item)"
            >
              {{ item.label }}
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-if="floorId">
        <view class="field-label">选择房间</view>
        <view class="room-grid">
          <view
            v-for="room in roomOptions"
            :key="room.roomId"
            class="room-item"
            :class="{ active: isRoomSelected(room.roomId) }"
            @click="toggleRoom(room)"
          >
            <text class="room-name">{{ room.label }}</text>
            <text class="room-state">{{ isRoomSelected(room.roomId) ? '已选' : '选择' }}</text>
          </view>
        </view>
      </view>

      <view class="selected-box" v-if="selectedRooms.length">
        <view class="selected-head">
          <text>已选 {{ selectedRooms.length }} 间</text>
          <text class="clear-link" @click="clearRooms">清空</text>
        </view>
        <view class="selected-list">
          <text class="selected-tag" v-for="room in selectedRooms" :key="room.roomId" @click="toggleRoom(room)">
            {{ room.label }} ×
          </text>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="section-title">确认方式</view>
      <view class="mode-grid">
        <view class="mode-item" :class="{ active: form.signType === 'code' }" @click="form.signType = 'code'">
          <uni-icons type="compose" size="25" color="#4d68d8"></uni-icons>
          <text>签到码</text>
        </view>
        <view class="mode-item" :class="{ active: form.signType === 'qr' }" @click="form.signType = 'qr'">
          <uni-icons type="scan" size="25" color="#248a68"></uni-icons>
          <text>二维码</text>
        </view>
        <view class="mode-item" :class="{ active: form.signType === 'location' }" @click="form.signType = 'location'">
          <uni-icons type="location" size="25" color="#b56a20"></uni-icons>
          <text>楼栋定位</text>
        </view>
      </view>
      <view class="mode-note">
        {{ modeNote }}
      </view>
      <view class="form-item" v-if="form.signType === 'code'">
        <text class="field-label">4 位签到码</text>
        <view class="code-row">
          <input class="code-input" type="number" maxlength="4" v-model="form.signCode" />
          <view class="refresh-btn" @click="refreshCode">
            <uni-icons type="refresh" size="18" color="#4d68d8"></uni-icons>
          </view>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="section-title">确认时限</view>
      <view class="duration-row">
        <view
          v-for="minute in [5, 10, 15, 20, 30, 60]"
          :key="minute"
          class="duration-item"
          :class="{ active: form.duration === minute }"
          @click="form.duration = minute"
        >
          {{ minute }} 分钟
        </view>
      </view>
      <view class="form-item">
        <text class="field-label">任务名称</text>
        <input class="text-input" v-model="form.sessionName" placeholder="如：10月24日晚寝确认" />
      </view>
    </view>

    <view class="bottom-bar">
      <button class="submit-btn" :loading="submitting" @click="submit">
        发起学生手机确认
      </button>
    </view>
  </view>
</template>

<script>
import { addSignSession } from '@/api/work/sign'
import { listDormBuildings, listDormFloors, listDormRooms } from '@/api/work/dormcheck'

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

export default {
  data() {
    return {
      buildingId: '',
      buildingName: '',
      floorId: '',
      buildingOptions: [],
      floorOptions: [],
      roomOptions: [],
      selectedRooms: [],
      form: {
        scene: 'dorm',
        sessionName: '',
        signType: 'code',
        signCode: '',
        duration: 15
      },
      submitting: false
    }
  },
  computed: {
    selectedRoomIds() {
      return this.selectedRooms.map(room => room.roomId)
    },
    modeNote() {
      if (this.form.signType === 'location') {
        return '学生确认时校验其是否在所选楼栋的夜间考勤范围内。'
      }
      if (this.form.signType === 'qr') {
        return '教师展示二维码，学生扫码后只确认本人；二维码仅本任务有效。'
      }
      return '教师口头告知签到码，学生输入后确认本人。'
    }
  },
  onLoad() {
    this.refreshCode()
    this.form.sessionName = '晚寝确认 ' + formatDateTime(new Date()).substring(0, 10)
    this.loadBuildings()
  },
  methods: {
    loadBuildings() {
      listDormBuildings({}).then(res => {
        this.buildingOptions = res.data || []
      }).catch(() => {})
    },
    pickBuilding(building) {
      const nextId = String(building.buildingId)
      if (this.buildingId === nextId) return
      this.buildingId = nextId
      this.buildingName = building.label || ''
      this.floorId = ''
      this.floorOptions = []
      this.roomOptions = []
      this.selectedRooms = []
      this.form.sessionName = (building.label || '宿舍') + '晚寝确认 ' + formatDateTime(new Date()).substring(0, 10)
      listDormFloors(building.buildingId).then(res => {
        this.floorOptions = res.data || []
        if (this.floorOptions.length) this.pickFloor(this.floorOptions[0])
      }).catch(() => {})
    },
    pickFloor(floor) {
      this.floorId = String(floor.floorId)
      this.roomOptions = []
      listDormRooms(this.buildingId, floor.floorId).then(res => {
        this.roomOptions = res.data || []
      }).catch(() => {})
    },
    isRoomSelected(roomId) {
      return this.selectedRooms.some(room => String(room.roomId) === String(roomId))
    },
    toggleRoom(room) {
      const index = this.selectedRooms.findIndex(item => String(item.roomId) === String(room.roomId))
      if (index >= 0) this.selectedRooms.splice(index, 1)
      else this.selectedRooms.push(room)
    },
    clearRooms() {
      this.selectedRooms = []
    },
    refreshCode() {
      this.form.signCode = String(Math.floor(1000 + Math.random() * 9000))
    },
    submit() {
      if (this.submitting) return
      if (!this.selectedRooms.length) {
        uni.showToast({ title: '请选择晚寝确认房间', icon: 'none' })
        return
      }
      if (this.form.signType === 'code' && !/^\d{4}$/.test(this.form.signCode)) {
        uni.showToast({ title: '请输入 4 位签到码', icon: 'none' })
        return
      }
      const now = new Date()
      const end = new Date(now.getTime() + this.form.duration * 60000)
      this.submitting = true
      addSignSession({
        scene: 'dorm',
        sessionName: this.form.sessionName,
        signType: this.form.signType,
        signCode: this.form.signType === 'code' ? this.form.signCode : null,
        duration: this.form.duration,
        startTime: formatDateTime(now),
        endTime: formatDateTime(end),
        dormRooms: this.selectedRoomIds.join(','),
        classRoom: this.buildingName
      }).then(res => {
        uni.showToast({ title: '晚寝确认已发起', icon: 'success' })
        const sessionId = res.sessionId || (typeof res.data === 'number' ? res.data : null)
        setTimeout(() => {
          if (sessionId) {
            uni.redirectTo({ url: '/pages/sub-work/sign/detail?sessionId=' + sessionId })
          } else {
            uni.redirectTo({ url: '/pages/sub-work/sign/index' })
          }
        }, 600)
      }).catch(() => {}).finally(() => {
        this.submitting = false
      })
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f4f6fa;
  padding: 12px 12px 90px;
  box-sizing: border-box;
}
.form-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #253047;
  padding-left: 9px;
  border-left: 3px solid #4d68d8;
  margin-bottom: 16px;
}
.field-label {
  display: block;
  font-size: 13px;
  color: #667085;
  margin: 12px 0 8px;
}
.chip-scroll {
  width: 100%;
  white-space: nowrap;
}
.chips {
  display: inline-flex;
  gap: 8px;
  padding-bottom: 4px;
}
.chip {
  padding: 8px 14px;
  border-radius: 8px;
  background: #f3f5f9;
  color: #5f6b7a;
  font-size: 13px;
}
.chip.active {
  background: #e8edff;
  color: #415bc5;
  font-weight: 600;
}
.room-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.room-item {
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  padding: 11px 8px;
  text-align: center;
  background: #fafbfc;
}
.room-item.active {
  border-color: #4d68d8;
  background: #eef1ff;
}
.room-name {
  display: block;
  font-size: 13px;
  color: #2f3a4d;
}
.room-state {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #8d98a8;
}
.room-item.active .room-state {
  color: #415bc5;
}
.selected-box {
  margin-top: 14px;
  padding: 12px;
  border-radius: 8px;
  background: #f7f9fd;
}
.selected-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #445066;
}
.clear-link {
  color: #c14f4f;
}
.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.selected-tag {
  padding: 5px 9px;
  border-radius: 6px;
  background: #e8edff;
  color: #415bc5;
  font-size: 12px;
}
.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.mode-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 6px;
  border: 1px solid #e6eaf1;
  border-radius: 9px;
  font-size: 12px;
  color: #5c6879;
}
.mode-item.active {
  border-color: #4d68d8;
  background: #f5f7ff;
  color: #334db8;
}
.mode-note {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f7f9fd;
  color: #7a8494;
  font-size: 12px;
  line-height: 1.6;
}
.form-item {
  margin-top: 14px;
}
.code-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.code-input,
.text-input {
  height: 42px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fafbfc;
  padding: 0 12px;
  font-size: 15px;
  box-sizing: border-box;
}
.code-input {
  flex: 1;
  font-size: 22px;
  letter-spacing: 8px;
  text-align: center;
}
.text-input {
  width: 100%;
}
.refresh-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #edf1ff;
  border-radius: 8px;
}
.duration-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.duration-item {
  text-align: center;
  padding: 10px 4px;
  border-radius: 8px;
  background: #f3f5f9;
  color: #667085;
  font-size: 13px;
}
.duration-item.active {
  background: #4d68d8;
  color: #ffffff;
}
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -2px 10px rgba(37, 48, 71, 0.08);
}
.submit-btn {
  height: 46px;
  line-height: 46px;
  border: none;
  border-radius: 10px;
  background: #4d68d8;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
}
.submit-btn::after {
  border: none;
}
</style>
