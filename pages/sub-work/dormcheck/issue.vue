<template>
  <view class="issue-page">
    <view class="form-card">
      <view class="form-title">登记宿舍异常</view>
      <view class="form-sub">设施报修、安全隐患、违纪苗头、宿舍矛盾等不记分问题</view>

      <view class="field">
        <text class="field-label">宿舍</text>
        <picker v-if="!roomId" mode="selector" :range="roomLabels" @change="onRoomPick">
          <view class="room-picker">
            <text :class="selectedRoom.roomId ? 'picked' : 'placeholder'">{{ selectedRoom.roomId ? roomLabel(selectedRoom) : '选择楼栋与房间' }}</text>
            <uni-icons type="right" size="14" color="#94a3b8" />
          </view>
        </picker>
        <view class="room-fixed" v-else>
          <text class="room-fixed-no">{{ roomNo || selectedRoom.roomNo || '宿舍' }}</text>
          <text class="room-fixed-loc">{{ buildingName || selectedRoom.buildingName }}</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">异常类型</text>
        <picker mode="selector" :range="typeLabels" @change="onTypeChange">
          <view class="picker-box">
            <text :class="form.issueType ? 'picked' : 'placeholder'">{{ typeLabel(form.issueType) || '请选择' }}</text>
            <uni-icons type="right" size="14" color="#94a3b8" />
          </view>
        </picker>
      </view>

      <view class="field">
        <text class="field-label">严重程度</text>
        <view class="seg-row">
          <text class="seg-item" v-for="s in severityOptions" :key="s.value" :class="{ active: form.severity === s.value }"
                @click="form.severity = s.value">{{ s.label }}</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">关联学生</text>
        <picker mode="selector" :range="studentLabels" @change="onStudentChange" :disabled="!students.length">
          <view class="picker-box">
            <text :class="form.relatedXh ? 'picked' : 'placeholder'">{{ relatedName || '可不选，按宿舍整体问题' }}</text>
            <uni-icons type="right" size="14" color="#94a3b8" />
          </view>
        </picker>
      </view>

      <view class="field">
        <text class="field-label">标题</text>
        <input v-model="form.title" class="text-input" maxlength="120" placeholder="一句话说清问题，如 307 阳台护栏松动" />
      </view>

      <view class="field">
        <text class="field-label">现场描述</text>
        <textarea v-model="form.description" class="textarea-input" maxlength="1000"
                  placeholder="发现时间、具体位置、已采取的措施" />
      </view>

      <view class="field">
        <text class="field-label">现场照片</text>
        <view class="photo-row">
          <view class="photo-thumb" v-for="(p, pi) in photos" :key="pi">
            <image :src="resolveImg(p)" mode="aspectFill" class="photo-img" @click="preview(pi)" />
            <text class="photo-del" @click="removePhoto(pi)">×</text>
          </view>
          <view class="photo-add" @click="choosePhoto" v-if="photos.length < 6">
            <uni-icons type="camera" size="20" color="#94a3b8" />
            <text class="photo-add-text">拍照</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="save-btn" :class="{ saving }" @click="submit">{{ saving ? '提交中...' : '登记异常' }}</view>
    </view>
  </view>
</template>

<script>
import { listDormWorkbenchRooms, getRoomStudents, addDormIssue } from '@/api/work/dormcheck'
import { uploadFileTo } from '@/utils/upload'
import { resolveImg } from '@/utils/image'

export default {
  data() {
    return {
      roomId: null,
      roomNo: '',
      buildingName: '',
      rooms: [],
      selectedRoom: {},
      students: [],
      photos: [],
      saving: false,
      form: {
        issueType: '',
        severity: 'medium',
        title: '',
        description: '',
        relatedXh: ''
      },
      typeOptions: [
        { value: 'facility', label: '设施故障' },
        { value: 'safety', label: '安全隐患' },
        { value: 'discipline', label: '违纪苗头' },
        { value: 'conflict', label: '宿舍矛盾' },
        { value: 'hygiene', label: '卫生问题' },
        { value: 'psych', label: '心理关注' },
        { value: 'other', label: '其他' }
      ],
      severityOptions: [
        { value: 'low', label: '一般' },
        { value: 'medium', label: '关注' },
        { value: 'high', label: '紧急' }
      ]
    }
  },
  computed: {
    typeLabels() {
      return this.typeOptions.map(t => t.label)
    },
    studentLabels() {
      return this.students.map(s => (s.bedNo ? s.bedNo + '床 ' : '') + (s.studentName || '外院在住'))
    },
    roomLabels() {
      return this.rooms.map(r => this.roomLabel(r))
    },
    relatedName() {
      if (!this.form.relatedXh) return ''
      const hit = this.students.find(s => s.xh === this.form.relatedXh)
      return hit ? hit.studentName : ''
    }
  },
  onLoad(options) {
    this.roomId = options && options.roomId ? Number(options.roomId) : null
    this.roomNo = options && options.roomNo ? decodeURIComponent(options.roomNo) : ''
    this.buildingName = options && options.buildingName ? decodeURIComponent(options.buildingName) : ''
    if (this.roomId) {
      this.loadStudents()
    } else {
      this.loadRooms()
    }
  },
  methods: {
    loadRooms() {
      listDormWorkbenchRooms({}).then(res => {
        if (res.code === 200) this.rooms = res.data || []
      }).catch(() => {})
    },
    onRoomPick(e) {
      const room = this.rooms[Number(e.detail.value)]
      if (room) this.pickRoom(room)
    },
    pickRoom(room) {
      this.selectedRoom = room
      this.roomId = room.roomId
      this.roomNo = room.roomNo
      this.buildingName = room.buildingName
      this.form.relatedXh = ''
      this.loadStudents()
    },
    roomLabel(room) {
      return (room.buildingName || '') + ' ' + (room.roomNo || '')
    },
    loadStudents() {
      if (!this.roomId) return
      getRoomStudents(this.roomId).then(res => {
        this.students = res.code === 200 ? (res.data || []) : []
      }).catch(() => {})
    },
    typeLabel(value) {
      const hit = this.typeOptions.find(t => t.value === value)
      return hit ? hit.label : ''
    },
    onTypeChange(e) {
      const item = this.typeOptions[Number(e.detail.value)]
      if (item) this.form.issueType = item.value
    },
    onStudentChange(e) {
      const item = this.students[Number(e.detail.value)]
      this.form.relatedXh = item ? item.xh : ''
    },
    choosePhoto() {
      const remain = 6 - this.photos.length
      if (remain <= 0) return
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: res => {
          const files = res.tempFilePaths || []
          if (!files.length) return
          uni.showLoading({ title: '上传中' })
          Promise.all(files.map(path => uploadFileTo('/api/teacher/dorm/issue/upload/image', path, null, { timeout: 30000 })))
            .then(list => {
              list.forEach(r => {
                if (r && r.url) this.photos.push(r.url)
              })
              uni.hideLoading()
            })
            .catch(() => {
              uni.hideLoading()
              uni.showToast({ title: '照片上传失败', icon: 'none' })
            })
        }
      })
    },
    removePhoto(index) {
      this.photos.splice(index, 1)
    },
    preview(index) {
      const urls = this.photos.map(resolveImg)
      uni.previewImage({ current: urls[index], urls })
    },
    submit() {
      if (this.saving) return
      if (!this.roomId) {
        uni.showToast({ title: '请选择宿舍', icon: 'none' })
        return
      }
      if (!this.form.issueType) {
        uni.showToast({ title: '请选择异常类型', icon: 'none' })
        return
      }
      if (!String(this.form.title || '').trim()) {
        uni.showToast({ title: '请填写异常标题', icon: 'none' })
        return
      }
      this.saving = true
      uni.showLoading({ title: '提交中' })
      addDormIssue({
        roomId: this.roomId,
        issueType: this.form.issueType,
        severity: this.form.severity,
        title: String(this.form.title).trim(),
        description: this.form.description,
        relatedXh: this.form.relatedXh,
        attachmentUrls: this.photos
      }).then(res => {
        uni.hideLoading()
        this.saving = false
        if (res.code === 200) {
          uni.showToast({ title: '异常已登记', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 600)
        } else {
          uni.showToast({ title: res.msg || '登记失败', icon: 'none' })
        }
      }).catch(() => {
        uni.hideLoading()
        this.saving = false
        uni.showToast({ title: '登记失败', icon: 'none' })
      })
    },
    resolveImg
  }
}
</script>

<style lang="scss" scoped>
.issue-page { min-height: 100vh; background: #f4f6fa; padding: 24rpx 24rpx 160rpx; }
.form-card { padding: 24rpx; background: #fff; border: 1rpx solid #e2e8f0; border-radius: 14rpx; }
.form-title { font-size: 32rpx; font-weight: 700; color: #1e293b; line-height: 42rpx; }
.form-sub { margin-top: 4rpx; font-size: 20rpx; color: #94a3b8; line-height: 28rpx; }
.field { margin-top: 22rpx; }
.field-label { display: block; margin-bottom: 8rpx; font-size: 22rpx; color: #475569; }
.picked { color: #1e293b; font-size: 23rpx; }
.placeholder { color: #94a3b8; font-size: 22rpx; }
.room-picker, .picker-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 16rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 9rpx;
}
.room-fixed { display: flex; align-items: baseline; gap: 10rpx; padding: 10rpx 0; }
.room-fixed-no { font-size: 32rpx; font-weight: 700; color: #1e293b; }
.room-fixed-loc { font-size: 21rpx; color: #94a3b8; }
.seg-row { display: flex; gap: 8rpx; }
.seg-item { flex: 1; padding: 12rpx 0; text-align: center; background: #f8fafc; border: 1rpx solid #e2e8f0; border-radius: 9rpx; font-size: 22rpx; color: #64748b; }
.seg-item.active { background: #dbeafe; border-color: #bfdbfe; color: #2563eb; font-weight: 600; }
.text-input, .textarea-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14rpx 16rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 9rpx;
  font-size: 22rpx;
  color: #1e293b;
}
.textarea-input { min-height: 150rpx; }
.photo-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.photo-thumb { position: relative; width: 108rpx; height: 108rpx; }
.photo-img { width: 108rpx; height: 108rpx; border-radius: 8rpx; }
.photo-del {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 32rpx;
  height: 32rpx;
  line-height: 30rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 20rpx;
}
.photo-add {
  width: 108rpx;
  height: 108rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  border: 1rpx dashed #cbd5e1;
  border-radius: 8rpx;
  background: #fff;
}
.photo-add-text { font-size: 17rpx; color: #94a3b8; }
.bottom-bar { position: fixed; left: 24rpx; right: 24rpx; bottom: 30rpx; }
.save-btn {
  height: 86rpx;
  line-height: 86rpx;
  text-align: center;
  border-radius: 43rpx;
  background: #2563eb;
  color: #fff;
  font-size: 27rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.28);
}
.save-btn.saving { opacity: .6; }
</style>
