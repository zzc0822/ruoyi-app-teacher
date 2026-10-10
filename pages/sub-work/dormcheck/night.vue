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
        <text>请假/外宿按当晚单据已自动标好，其余逐床点实；全部点完才能提交。违纪与内务问题不在点名登记，请在「整改复核」跟进</text>
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
        <text class="fs-item orange" v-if="summary.unmarked">未点 {{ summary.unmarked }}</text>
      </view>
      <view class="foot-btns">
        <view class="btn-ghost" @click="submit('draft')"><text>保存草稿</text></view>
        <view class="btn-main" @click="submit('submitted')"><text>提交</text></view>
      </view>
    </view>
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
  getNightCheck
} from '@/api/work/dormcheck'

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
      ]
    }
  },
  computed: {
    checkTimeText() {
      const s = this.form.checkTime || ''
      return s.length > 5 ? s.substring(0, 5) : s
    },
    allRoomsChecked() {
      return this.roomOptions.length > 0 &&
        this.roomOptions.every(r => this.checkedRoomIds.indexOf(String(r.roomId)) > -1)
    },
    summary() {
      const s = { roomCount: this.roomList.length, total: 0, present: 0, absent: 0, late: 0, leave: 0, offcampus: 0, unmarked: 0 }
      this.roomList.forEach(g => {
        g.people.forEach(p => {
          s.total++
          if (!p.checkStatus) s.unmarked++
          else if (s[p.checkStatus] !== undefined) s[p.checkStatus]++
        })
      })
      return s
    }
  },
  onLoad(options) {
    this.loadBuildings()
    if (options && options.id) {
      this.editId = options.id
      this.loadForEdit(options.id)
    }
  },
  methods: {
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
        return
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
          violationType: null
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
        violationType: d.violationType || null
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
            leaveId: p.leaveId || null
          })
        })
      })
      return {
        id: this.editId || null,
        checkDate: this.form.checkDate,
        checkTime: this.form.checkTime,
        remark: this.form.remark,
        buildingId: this.scopeBuildingId(),
        buildingName: this.scopeBuildingName(),
        floor: this.scopeFloor(),
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
    submit(status) {
      if (this.submitting || !this.validate(status)) return
      this.submitting = true
      const payload = this.buildPayload(status)
      const req = this.editId ? updateNightCheck(payload) : addNightCheck(payload)
      req.then(res => {
        this.submitting = false
        if (res.code === 200) {
          uni.showToast({ title: status === 'submitted' ? '已提交' : '草稿已保存', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 600)
        } else {
          uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
        }
      }).catch(() => {
        this.submitting = false
        uni.showToast({ title: '保存失败', icon: 'none' })
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
