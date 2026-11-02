<template>
  <view class="check-page">
    <view class="check-head">
      <view class="ch-main">
        <text class="ch-room">{{ roomNo || room.roomNo || '宿舍' }}</text>
        <text class="ch-loc">{{ buildingName || room.buildingName }}{{ room.floorNo ? ' · ' + room.floorNo + 'F' : '' }}</text>
      </view>
      <view class="ch-score">
        <text class="ch-score-num" :class="scoreClass(finalScore)">{{ finalScore }}</text>
        <text class="ch-score-label">实得分</text>
      </view>
    </view>

    <view class="score-strip">
      <view class="ss-item"><text class="ss-num">100</text><text class="ss-label">基础分</text></view>
      <view class="ss-item"><text class="ss-num minus">-{{ deductTotal }}</text><text class="ss-label">扣分</text></view>
      <view class="ss-item"><text class="ss-num">{{ deductions.length }}</text><text class="ss-label">扣分项</text></view>
      <view class="ss-item"><text class="ss-num">{{ contrabands.length }}</text><text class="ss-label">违禁品</text></view>
    </view>

    <view class="students-strip" v-if="occupants.length">
      <text class="students-title">在住 {{ occupants.length }} 人</text>
      <text class="student-chip" v-for="s in occupants" :key="s.assignId">{{ s.bedNo || '—' }}床 {{ s.studentName }}</text>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">选择扣分项</text>
        <text class="section-tip">按现场逐项勾选</text>
      </view>
      <scroll-view scroll-x class="cat-scroll">
        <view class="cat-row">
          <text class="cat-chip" v-for="c in categories" :key="c.value" :class="{ active: activeCategory === c.value }"
                @click="activeCategory = c.value">{{ c.label }}</text>
        </view>
      </scroll-view>
      <view class="item-list">
        <view class="item-row" v-for="it in categoryItems" :key="it.itemId" @click="addDeduction(it)">
          <view class="item-main">
            <text class="item-name">{{ it.itemName }}</text>
            <text class="item-meta">扣 {{ it.deductScore }} 分<text v-if="it.needPhoto === '1'"> · 需拍照</text><text v-if="it.needRectify === '1'"> · 默认整改</text></text>
          </view>
          <view class="item-add">
            <uni-icons :type="isPicked(it.itemId) ? 'checkmarkempty' : 'plusempty'" size="15"
                       :color="isPicked(it.itemId) ? '#059669' : '#2563eb'" />
          </view>
        </view>
        <view class="empty-box" v-if="!categoryItems.length">
          <text>该类别暂无启用的检查标准</text>
        </view>
      </view>
      <view class="custom-row" @click="addCustomDeduction">
        <uni-icons type="compose" size="14" color="#64748b" />
        <text>自定义扣分项</text>
      </view>
    </view>

    <view class="section" v-if="deductions.length">
      <view class="section-head">
        <text class="section-title">已选扣分</text>
        <text class="section-tip">每条单独留证</text>
      </view>
      <view class="ded-card" v-for="(d, di) in deductions" :key="d.key">
        <view class="ded-top">
          <input v-model="d.itemName" class="ded-name-input" placeholder="扣分项名称" />
          <view class="ded-score-box">
            <text class="ded-minus">-</text>
            <input v-model="d.deductScore" type="digit" class="ded-score-input" />
          </view>
          <text class="ded-del" @click="removeDeduction(di)">删除</text>
        </view>
        <textarea v-model="d.description" class="ded-desc" placeholder="现场说明：哪张床、什么问题，写清楚便于复核" maxlength="300" />
        <view class="ded-options">
          <view class="opt-row">
            <text class="opt-label">要求整改</text>
            <switch :checked="d.needRectify === '1'" color="#2563eb" style="transform: scale(0.8)"
                    @change="toggleRectify(d, $event)" />
          </view>
          <view class="opt-row">
            <text class="opt-label">涉及学生</text>
            <scroll-view scroll-x class="stu-scroll">
              <view class="stu-row">
                <text class="stu-opt" v-for="s in occupants" :key="s.xh" :class="{ active: d.involveXhs.indexOf(s.xh) > -1 }"
                      @click="toggleInvolve(d, s.xh)">{{ s.bedNo || '—' }}床 {{ s.studentName }}</text>
                <text class="stu-opt" v-if="!occupants.length">宿舍整体</text>
              </view>
            </scroll-view>
          </view>
        </view>
        <view class="photo-row">
          <view class="photo-thumb" v-for="(p, pi) in d.photos" :key="pi">
            <image :src="resolveImg(p)" mode="aspectFill" class="photo-img" @click="preview(d.photos, pi)" />
            <text class="photo-del" @click="removePhoto(d, pi)">×</text>
          </view>
          <view class="photo-add" @click="choosePhoto(d)">
            <uni-icons type="camera" size="20" color="#94a3b8" />
            <text class="photo-add-text">{{ d.photos.length ? '继续拍' : '拍照留证' }}</text>
          </view>
        </view>
        <text class="photo-hint" v-if="needPhotoOf(d)">该项按标准必须上传现场照片</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">违禁品登记</text>
        <text class="section-tip">没有可跳过</text>
      </view>
      <view class="contraband-card" v-for="(c, ci) in contrabands" :key="c.key">
        <view class="ded-top">
          <input v-model="c.itemName" class="ded-name-input" placeholder="名称，如 热得快" />
          <input v-model="c.quantity" type="number" class="qty-input" />
          <text class="ded-del" @click="removeContraband(ci)">删除</text>
        </view>
        <view class="cb-row">
          <text class="opt-label">归属</text>
          <view class="cb-chips">
            <text class="stu-opt" :class="{ active: c.belongType === 'shared' }" @click="setBelong(c, 'shared')">宿舍共有</text>
            <text class="stu-opt" :class="{ active: c.belongType === 'single' }" @click="setBelong(c, 'single')">个人所有</text>
          </view>
        </view>
        <scroll-view scroll-x class="stu-scroll" v-if="c.belongType === 'single'">
          <view class="stu-row">
            <text class="stu-opt" v-for="s in occupants" :key="s.xh" :class="{ active: c.ownerXhs.indexOf(s.xh) > -1 }"
                  @click="toggleOwner(c, s.xh)">{{ s.bedNo || '—' }}床 {{ s.studentName }}</text>
          </view>
        </scroll-view>
        <view class="cb-row">
          <text class="opt-label">处置</text>
          <view class="cb-chips">
            <text class="stu-opt" v-for="h in handleOptions" :key="h.value" :class="{ active: c.handleType === h.value }"
                  @click="c.handleType = h.value">{{ h.label }}</text>
          </view>
        </view>
        <input v-model="c.handleDesc" class="cb-input" placeholder="处置说明：暂存何处、谁签收" />
        <view class="photo-row">
          <view class="photo-thumb" v-for="(p, pi) in c.photos" :key="pi">
            <image :src="resolveImg(p)" mode="aspectFill" class="photo-img" @click="preview(c.photos, pi)" />
            <text class="photo-del" @click="removePhoto(c, pi)">×</text>
          </view>
          <view class="photo-add" @click="choosePhoto(c)">
            <uni-icons type="camera" size="20" color="#94a3b8" />
            <text class="photo-add-text">{{ c.photos.length ? '继续拍' : '拍照取证' }}</text>
          </view>
        </view>
      </view>
      <view class="custom-row" @click="addContraband">
        <uni-icons type="plusempty" size="14" color="#64748b" />
        <text>登记一件违禁品</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">本次备注</text>
      </view>
      <textarea v-model="remark" class="remark-input" maxlength="500" placeholder="整体情况、需要后续关注的事项" />
    </view>

    <view class="bottom-bar">
      <view class="bar-summary">
        <text class="bs-score" :class="scoreClass(finalScore)">{{ finalScore }}</text>
        <text class="bs-label">扣 {{ deductTotal }} 分</text>
      </view>
      <view class="bar-save" :class="{ saving: saving }" @click="save">
        <text>{{ saving ? '保存中...' : '保存检查单' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
  ensureDailyCheckTask,
  listCheckRooms,
  listEnabledCheckItems,
  getCheckRecord,
  saveCheckRecord,
  getRoomStudents
} from '@/api/work/dormcheck'
import { uploadFileTo } from '@/utils/upload'
import { resolveImg } from '@/utils/image'

let seq = 0

export default {
  data() {
    return {
      roomId: null,
      roomNo: '',
      buildingName: '',
      task: null,
      room: {},
      occupants: [],
      items: [],
      activeCategory: 'hygiene',
      deductions: [],
      contrabands: [],
      remark: '',
      saving: false,
      categories: [
        { value: 'hygiene', label: '内务卫生' },
        { value: 'safety', label: '安全' },
        { value: 'discipline', label: '纪律' },
        { value: 'other', label: '其他' }
      ],
      handleOptions: [
        { value: 'confiscate', label: '暂扣' },
        { value: 'return', label: '登记退还' },
        { value: 'report', label: '上报学院' }
      ]
    }
  },
  computed: {
    categoryItems() {
      return this.items.filter(it => (it.category || 'other') === this.activeCategory)
    },
    deductTotal() {
      let sum = 0
      this.deductions.forEach(d => {
        const n = Number(d.deductScore)
        if (!isNaN(n)) sum += n
      })
      return Math.round(sum * 10) / 10
    },
    finalScore() {
      return Math.max(0, Math.round((100 - this.deductTotal) * 10) / 10)
    }
  },
  onLoad(options) {
    this.roomId = options && options.roomId ? Number(options.roomId) : null
    this.roomNo = options && options.roomNo ? decodeURIComponent(options.roomNo) : ''
    this.buildingName = options && options.buildingName ? decodeURIComponent(options.buildingName) : ''
    this.loadPage()
  },
  methods: {
    loadPage() {
      if (!this.roomId) return
      uni.showLoading({ title: '加载检查标准' })
      ensureDailyCheckTask().then(taskRes => {
        if (taskRes.code !== 200) throw new Error(taskRes.msg || '无法开始巡查')
        this.task = taskRes.data
        return Promise.all([
          listCheckRooms({ taskId: this.task.taskId, pageNum: 1, pageSize: 200 }),
          listEnabledCheckItems({ checkType: 'spot' }),
          getRoomStudents(this.roomId)
        ])
      }).then(([roomsRes, itemsRes, studentsRes]) => {
        const rooms = roomsRes.code === 200 ? (roomsRes.rows || []) : []
        this.room = rooms.find(r => Number(r.roomId) === Number(this.roomId)) || {}
        if (!this.roomNo) this.roomNo = this.room.roomNo || ''
        if (!this.buildingName) this.buildingName = this.room.buildingName || ''
        this.items = itemsRes.code === 200 ? (itemsRes.data || []) : []
        this.occupants = studentsRes.code === 200 ? (studentsRes.data || []) : []
        const firstCat = this.items.length ? (this.items[0].category || 'other') : 'hygiene'
        this.activeCategory = firstCat
        if (this.room.recordId) {
          return getCheckRecord(this.room.recordId)
        }
        return null
      }).then(recordRes => {
        uni.hideLoading()
        if (recordRes && recordRes.code === 200 && recordRes.data) {
          this.applyRecord(recordRes.data)
        }
      }).catch(() => {
        uni.hideLoading()
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      })
    },
    applyRecord(record) {
      this.remark = record.remark || ''
      this.deductions = (record.deductionList || []).map(d => ({
        key: 'd' + (++seq),
        deductionId: d.deductionId,
        itemId: d.itemId,
        itemName: d.itemName,
        category: d.category,
        deductScore: d.deductScore == null ? 2 : Number(d.deductScore),
        description: d.description || '',
        needRectify: d.needRectify || '0',
        involveXhs: d.involveXh ? String(d.involveXh).split(',').filter(x => !!x) : [],
        photos: (d.attachmentList || []).map(a => a.filePath).filter(p => !!p)
      }))
      this.contrabands = (record.contrabandList || []).map(c => ({
        key: 'c' + (++seq),
        contrabandId: c.contrabandId,
        itemName: c.itemName,
        itemType: c.itemType || 'appliance',
        spec: c.spec || '',
        quantity: c.quantity || 1,
        belongType: c.belongType || 'single',
        ownerXhs: (c.ownerList || []).filter(o => o.source !== 'room_shared').map(o => o.xh),
        handleType: c.handleType || 'confiscate',
        handleDesc: c.handleDesc || '',
        photos: (c.attachmentList || []).map(a => a.filePath).filter(p => !!p)
      }))
    },
    isPicked(itemId) {
      return this.deductions.some(d => d.itemId === itemId)
    },
    addDeduction(item) {
      if (this.isPicked(item.itemId)) {
        uni.showToast({ title: '该扣分项已添加', icon: 'none' })
        return
      }
      this.deductions.push({
        key: 'd' + (++seq),
        deductionId: null,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        deductScore: Number(item.deductScore || 2),
        description: '',
        needRectify: item.needRectify || '0',
        involveXhs: [],
        photos: []
      })
    },
    addCustomDeduction() {
      this.deductions.push({
        key: 'd' + (++seq),
        deductionId: null,
        itemId: null,
        itemName: '',
        category: this.activeCategory,
        deductScore: 2,
        description: '',
        needRectify: '0',
        involveXhs: [],
        photos: []
      })
    },
    removeDeduction(index) {
      this.deductions.splice(index, 1)
    },
    toggleInvolve(d, xh) {
      const idx = d.involveXhs.indexOf(xh)
      if (idx > -1) d.involveXhs.splice(idx, 1)
      else d.involveXhs.push(xh)
    },
    toggleRectify(d, e) {
      d.needRectify = e.detail.value ? '1' : '0'
    },
    needPhotoOf(d) {
      const item = this.items.find(it => it.itemId === d.itemId)
      return item && item.needPhoto === '1'
    },
    choosePhoto(target) {
      const remain = 6 - target.photos.length
      if (remain <= 0) {
        uni.showToast({ title: '最多 6 张照片', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: res => {
          const files = res.tempFilePaths || []
          if (!files.length) return
          uni.showLoading({ title: '上传中' })
          Promise.all(files.map(path => uploadFileTo('/api/teacher/dorm/check/upload/image', path, null, { timeout: 30000 })))
            .then(list => {
              list.forEach(r => {
                if (r && r.url) target.photos.push(r.url)
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
    removePhoto(target, index) {
      target.photos.splice(index, 1)
    },
    preview(list, index) {
      const urls = list.map(resolveImg)
      uni.previewImage({ current: urls[index], urls })
    },
    addContraband() {
      this.contrabands.push({
        key: 'c' + (++seq),
        contrabandId: null,
        itemName: '',
        itemType: 'appliance',
        spec: '',
        quantity: 1,
        belongType: 'shared',
        ownerXhs: [],
        handleType: 'confiscate',
        handleDesc: '',
        photos: []
      })
    },
    removeContraband(index) {
      this.contrabands.splice(index, 1)
    },
    setBelong(c, value) {
      c.belongType = value
      if (value === 'shared') c.ownerXhs = []
    },
    toggleOwner(c, xh) {
      const idx = c.ownerXhs.indexOf(xh)
      if (idx > -1) c.ownerXhs.splice(idx, 1)
      else c.ownerXhs.push(xh)
    },
    validate() {
      if (this.deductTotal > 100) {
        uni.showToast({ title: '扣分合计不能超过 100', icon: 'none' })
        return false
      }
      for (let i = 0; i < this.deductions.length; i++) {
        const d = this.deductions[i]
        if (!String(d.itemName || '').trim()) {
          uni.showToast({ title: '第 ' + (i + 1) + ' 项缺少名称', icon: 'none' })
          return false
        }
        if (!Number(d.deductScore) || Number(d.deductScore) <= 0) {
          uni.showToast({ title: '第 ' + (i + 1) + ' 项扣分需大于 0', icon: 'none' })
          return false
        }
        if (this.needPhotoOf(d) && !d.photos.length) {
          uni.showToast({ title: '「' + d.itemName + '」必须拍照', icon: 'none' })
          return false
        }
      }
      for (let i = 0; i < this.contrabands.length; i++) {
        const c = this.contrabands[i]
        if (!String(c.itemName || '').trim()) {
          uni.showToast({ title: '第 ' + (i + 1) + ' 件违禁品缺少名称', icon: 'none' })
          return false
        }
        if (c.belongType === 'single' && !c.ownerXhs.length) {
          uni.showToast({ title: '请选择违禁品所有人，或改为宿舍共有', icon: 'none' })
          return false
        }
        if (!c.photos.length) {
          uni.showToast({ title: '违禁品必须拍照取证', icon: 'none' })
          return false
        }
      }
      return true
    },
    save() {
      if (this.saving || !this.validate()) return
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      const checkTime = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())
      const payload = {
        taskId: this.task.taskId,
        roomId: this.roomId,
        checkType: 'spot',
        checkDate: this.task.checkDate,
        checkTime,
        remark: this.remark,
        deductionList: this.deductions.map((d, i) => ({
          deductionId: d.deductionId || undefined,
          itemId: d.itemId || undefined,
          itemName: String(d.itemName || '').trim(),
          category: d.category,
          deductScore: Number(d.deductScore),
          description: d.description,
          needRectify: d.needRectify,
          sortNo: i + 1,
          involveXh: d.involveXhs.join(','),
          attachmentUrls: d.photos
        })),
        contrabandList: this.contrabands.map(c => ({
          contrabandId: c.contrabandId || undefined,
          itemName: String(c.itemName || '').trim(),
          itemType: c.itemType,
          spec: c.spec,
          quantity: Number(c.quantity) || 1,
          belongType: c.belongType,
          ownerXhs: c.belongType === 'shared' ? [] : c.ownerXhs,
          handleType: c.handleType,
          handleDesc: c.handleDesc,
          attachmentUrls: c.photos
        }))
      }
      this.saving = true
      uni.showLoading({ title: '保存中' })
      saveCheckRecord(payload).then(res => {
        uni.hideLoading()
        this.saving = false
        if (res.code === 200) {
          const score = res.data && res.data.finalScore != null ? res.data.finalScore : this.finalScore
          uni.showToast({ title: '已保存 ' + score + ' 分', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 600)
        } else {
          uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
        }
      }).catch(() => {
        uni.hideLoading()
        this.saving = false
        uni.showToast({ title: '保存失败', icon: 'none' })
      })
    },
    scoreClass(score) {
      const n = Number(score)
      if (n >= 95) return 'is-excellent'
      if (n >= 85) return 'is-good'
      if (n >= 60) return 'is-pass'
      return 'is-fail'
    },
    resolveImg
  }
}
</script>

<style lang="scss" scoped>
.check-page {
  min-height: 100vh;
  background: #f4f6fa;
  padding: 24rpx 24rpx 180rpx;
}
.check-head {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
}
.ch-main { flex: 1; min-width: 0; }
.ch-room { display: block; font-size: 42rpx; font-weight: 700; color: #1e293b; line-height: 52rpx; }
.ch-loc { display: block; font-size: 21rpx; color: #94a3b8; }
.ch-score { text-align: right; flex: none; margin-left: 16rpx; }
.ch-score-num { display: block; font-size: 46rpx; font-weight: 700; line-height: 52rpx; }
.ch-score-num.is-excellent { color: #059669; }
.ch-score-num.is-good { color: #2563eb; }
.ch-score-num.is-pass { color: #d97706; }
.ch-score-num.is-fail { color: #dc2626; }
.ch-score-label { display: block; font-size: 18rpx; color: #94a3b8; }
.score-strip {
  display: flex;
  margin-top: 12rpx;
  padding: 10rpx 0;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
}
.ss-item { flex: 1; text-align: center; }
.ss-item + .ss-item { border-left: 1rpx solid #f1f5f9; }
.ss-num { display: block; font-size: 27rpx; font-weight: 700; color: #334155; line-height: 34rpx; }
.ss-num.minus { color: #dc2626; }
.ss-label { display: block; font-size: 18rpx; color: #94a3b8; }
.students-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
}
.students-title { font-size: 20rpx; color: #64748b; margin-right: 4rpx; }
.student-chip { padding: 3rpx 10rpx; border-radius: 8rpx; background: #f1f5f9; font-size: 19rpx; color: #475569; }
.section { margin-top: 14rpx; padding: 20rpx; background: #fff; border: 1rpx solid #e2e8f0; border-radius: 14rpx; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10rpx; }
.section-title { font-size: 27rpx; font-weight: 600; color: #1e293b; }
.section-tip { font-size: 19rpx; color: #94a3b8; }
.cat-scroll { white-space: nowrap; margin-bottom: 8rpx; }
.cat-row { display: flex; gap: 8rpx; }
.cat-chip { flex-shrink: 0; padding: 7rpx 16rpx; border-radius: 16rpx; background: #f1f5f9; color: #64748b; font-size: 21rpx; }
.cat-chip.active { background: #2563eb; color: #fff; }
.item-row { display: flex; align-items: center; padding: 12rpx 0; border-top: 1rpx solid #f1f5f9; }
.item-row:first-child { border-top: 0; }
.item-main { flex: 1; min-width: 0; }
.item-name { display: block; font-size: 24rpx; color: #334155; }
.item-meta { display: block; margin-top: 2rpx; font-size: 19rpx; color: #94a3b8; }
.item-add { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f8fafc; }
.empty-box { padding: 30rpx 0; text-align: center; font-size: 21rpx; color: #94a3b8; }
.custom-row { display: flex; align-items: center; gap: 6rpx; margin-top: 10rpx; padding: 10rpx 0 2rpx; border-top: 1rpx dashed #e2e8f0; font-size: 21rpx; color: #64748b; }
.ded-card, .contraband-card { margin-top: 12rpx; padding: 14rpx; border: 1rpx solid #e2e8f0; border-radius: 10rpx; background: #fbfcfe; }
.ded-top { display: flex; align-items: center; gap: 8rpx; }
.ded-name-input { flex: 1; min-width: 0; font-size: 24rpx; color: #1e293b; }
.ded-score-box { display: flex; align-items: center; flex: none; }
.ded-minus { font-size: 24rpx; color: #dc2626; }
.ded-score-input { width: 56rpx; text-align: center; font-size: 26rpx; font-weight: 700; color: #dc2626; }
.ded-del { flex: none; font-size: 19rpx; color: #dc2626; }
.ded-desc, .remark-input {
  width: 100%;
  box-sizing: border-box;
  margin-top: 10rpx;
  padding: 10rpx 12rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 8rpx;
  font-size: 21rpx;
  color: #334155;
  min-height: 70rpx;
}
.remark-input { min-height: 120rpx; }
.ded-options { margin-top: 8rpx; }
.opt-row { display: flex; align-items: center; gap: 10rpx; margin-top: 6rpx; }
.opt-label { flex: none; width: 100rpx; font-size: 20rpx; color: #64748b; }
.stu-scroll { flex: 1; white-space: nowrap; }
.stu-row { display: flex; gap: 6rpx; }
.stu-opt { flex-shrink: 0; padding: 4rpx 10rpx; border-radius: 8rpx; background: #f1f5f9; color: #64748b; font-size: 19rpx; }
.stu-opt.active { background: #dbeafe; color: #2563eb; }
.photo-row { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }
.photo-thumb { position: relative; width: 100rpx; height: 100rpx; }
.photo-img { width: 100rpx; height: 100rpx; border-radius: 8rpx; }
.photo-del {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 30rpx;
  height: 30rpx;
  line-height: 28rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 20rpx;
}
.photo-add {
  width: 100rpx;
  height: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  border: 1rpx dashed #cbd5e1;
  border-radius: 8rpx;
  background: #fff;
}
.photo-add-text { font-size: 16rpx; color: #94a3b8; }
.photo-hint { display: block; margin-top: 4rpx; font-size: 18rpx; color: #dc2626; }
.qty-input { width: 54rpx; text-align: center; font-size: 22rpx; color: #334155; }
.cb-row { display: flex; align-items: center; gap: 10rpx; margin-top: 8rpx; }
.cb-chips { display: flex; flex-wrap: wrap; gap: 6rpx; }
.cb-input {
  width: 100%;
  box-sizing: border-box;
  margin-top: 8rpx;
  padding: 8rpx 10rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 8rpx;
  font-size: 21rpx;
  color: #334155;
}
.bottom-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 30rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 16rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  border-radius: 46rpx;
  box-shadow: 0 8rpx 28rpx rgba(15, 23, 42, 0.12);
}
.bar-summary { flex: 1; padding-left: 6rpx; }
.bs-score { display: block; font-size: 34rpx; font-weight: 700; line-height: 38rpx; }
.bs-score.is-excellent { color: #059669; }
.bs-score.is-good { color: #2563eb; }
.bs-score.is-pass { color: #d97706; }
.bs-score.is-fail { color: #dc2626; }
.bs-label { display: block; font-size: 18rpx; color: #94a3b8; }
.bar-save {
  flex: none;
  padding: 18rpx 40rpx;
  border-radius: 38rpx;
  background: #2563eb;
  color: #fff;
  font-size: 25rpx;
  font-weight: 600;
}
.bar-save.saving { opacity: .6; }
</style>
