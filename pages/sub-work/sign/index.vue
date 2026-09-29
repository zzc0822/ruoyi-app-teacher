<template>
  <view class="page-container">
    <!-- 顶部操作栏 -->
    <view class="top-bar">
      <view class="tab-bar">
        <view class="tab-item" :class="{active: tab === 'active'}" @click="switchTab('active')">
          <text>进行中</text>
          <view class="tab-badge" v-if="activeCount > 0">{{ activeCount }}</view>
        </view>
        <view class="tab-item" :class="{active: tab === 'finished'}" @click="switchTab('finished')">
          <text>已结束</text>
        </view>
      </view>
      <view class="create-btn" @click="goCreate">
        <uni-icons type="plusempty" size="18" color="#fff"></uni-icons>
        <text class="create-btn-text">发起签到</text>
      </view>
    </view>

    <!-- 签到列表 -->
    <view class="sign-list" v-if="filteredList.length > 0">
      <view class="sign-card" v-for="item in filteredList" :key="item.sessionId" @click="goDetail(item)">
        <view class="sc-header">
          <view class="sc-title-row">
            <text class="sc-title">{{ item.sessionName }}</text>
            <view class="sc-type-tag" :class="'type-' + item.signType">
              {{ typeMap[item.signType] || item.signType }}
            </view>
          </view>
          <view class="sc-status-row">
            <view class="sc-status" :class="'status-' + item.status">
              {{ statusMap[item.status] }}
            </view>
            <view class="sc-convert" v-if="item.status === '1' && item.convertStatus">
              <text class="convert-tag" :class="'convert-' + item.convertStatus">{{ convertMap[item.convertStatus] }}</text>
            </view>
          </view>
        </view>
        <view class="sc-body">
          <view class="sc-info-row">
            <text class="sc-label">班级</text>
            <text class="sc-value">{{ item.className || item.bjdm || '-' }}</text>
          </view>
          <view class="sc-info-row" v-if="item.courseName">
            <text class="sc-label">课程</text>
            <text class="sc-value">{{ item.courseName }}</text>
          </view>
          <view class="sc-info-row">
            <text class="sc-label">时间</text>
            <text class="sc-value">{{ formatTime(item.startTime) }} ~ {{ formatTime(item.endTime) }}</text>
          </view>
        </view>
        <view class="sc-footer">
          <view class="sc-progress-bar">
            <view class="progress-track">
              <view class="progress-fill" :style="'width:' + getProgressPercent(item) + '%'"></view>
            </view>
            <text class="progress-text">{{ item.signedCount || 0 }}/{{ item.totalCount || 0 }}</text>
          </view>
          <view class="sc-actions">
            <view class="action-btn code-btn" v-if="item.signCode && item.status === '0'" @click.stop="showCode(item)">
              <text class="action-code">{{ item.signCode }}</text>
            </view>
            <view class="action-btn finish-btn" v-if="item.status === '0'" @click.stop="handleFinish(item)">
              <text>结束</text>
            </view>
            <view class="action-btn confirm-btn" v-if="item.status === '1' && item.convertStatus === '0'" @click.stop="handleConfirm(item)">
              <text>确认转化</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <view class="empty-state" v-else>
      <uni-icons type="info" size="48" color="#ccc"></uni-icons>
      <text class="empty-text">{{ tab === 'active' ? '暂无进行中的签到' : '暂无已结束的签到' }}</text>
      <view class="empty-btn" @click="goCreate">
        <text>发起签到</text>
      </view>
    </view>

    <!-- 签到码弹窗 -->
    <view class="code-modal-mask" v-if="codeModalVisible" @click="codeModalVisible = false">
      <view class="code-modal" @click.stop>
        <text class="code-modal-title">签到码</text>
        <text class="code-modal-code">{{ currentCode }}</text>
        <text class="code-modal-hint">请将此签到码告知学生</text>
        <view class="code-modal-close" @click="codeModalVisible = false">
          <text>关闭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listSignSession, finishSignSession, confirmSignSession, getSignProgress } from '@/api/work/sign'

export default {
  data() {
    return {
      tab: 'active',
      list: [],
      activeCount: 0,
      typeMap: { code: '签到码', qr: '二维码', location: '位置' },
      statusMap: { '0': '进行中', '1': '已结束', '2': '已取消' },
      convertMap: { '0': '待确认', '1': '已转换', '2': '已拒绝' },
      codeModalVisible: false,
      currentCode: '',
      refreshTimer: null,
    }
  },
  computed: {
    filteredList() {
      if (this.tab === 'active') {
        return this.list.filter(i => i.status === '0')
      }
      return this.list.filter(i => i.status !== '0')
    }
  },
  onLoad() { this.getList() },
  onShow() { this.getList() },
  onUnload() { this.clearTimer() },
  methods: {
    switchTab(tab) { this.tab = tab },
    async getList() {
      try {
        const res = await listSignSession({ pageNum: 1, pageSize: 50 })
        this.list = res.rows || []
        this.activeCount = this.list.filter(i => i.status === '0').length
        if (this.activeCount > 0 && !this.refreshTimer) {
          this.refreshTimer = setInterval(() => { this.getList() }, 10000)
        } else if (this.activeCount === 0) {
          this.clearTimer()
        }
      } catch (e) {}
    },
    clearTimer() {
      if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null }
    },
    getProgressPercent(item) {
      if (!item.totalCount) return 0
      return Math.round((item.signedCount || 0) / item.totalCount * 100)
    },
    formatTime(t) {
      if (!t) return ''
      return t.substring(11, 16) || t
    },
    goCreate() {
      uni.navigateTo({ url: '/pages/sub-work/sign/create' })
    },
    goDetail(item) {
      uni.navigateTo({ url: '/pages/sub-work/sign/detail?sessionId=' + item.sessionId })
    },
    showCode(item) {
      this.currentCode = item.signCode
      this.codeModalVisible = true
    },
    handleFinish(item) {
      uni.showModal({
        title: '提示',
        content: '确认结束该签到任务？结束后学生将无法继续签到。',
        success: (res) => {
          if (res.confirm) {
            finishSignSession(item.sessionId).then(() => {
              uni.showToast({ title: '签到已结束', icon: 'success' })
              this.getList()
            })
          }
        }
      })
    },
    handleConfirm(item) {
      uni.showModal({
        title: '确认转化',
        content: '将签到结果转化为查课记录？未到学生将记为旷课。',
        success: (res) => {
          if (res.confirm) {
            confirmSignSession(item.sessionId).then(() => {
              uni.showToast({ title: '已转化为查课记录', icon: 'success' })
              this.getList()
            })
          }
        }
      })
    },
  }
}
</script>

<style scoped>
.page-container { min-height: 100vh; background: #f5f6f8; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-bottom: 1px solid #eee; }
.tab-bar { display: flex; gap: 20px; }
.tab-item { position: relative; font-size: 15px; color: #666; padding: 6px 0; border-bottom: 2px solid transparent; }
.tab-item.active { color: #409EFF; border-bottom-color: #409EFF; font-weight: 600; }
.tab-badge { position: absolute; top: -4px; right: -18px; background: #F56C6C; color: #fff; font-size: 10px; min-width: 16px; height: 16px; line-height: 16px; text-align: center; border-radius: 8px; padding: 0 4px; }
.create-btn { display: flex; align-items: center; gap: 4px; background: #409EFF; color: #fff; padding: 6px 14px; border-radius: 20px; }
.create-btn-text { font-size: 13px; color: #fff; }

.sign-list { padding: 12px; }
.sign-card { background: #fff; border-radius: 12px; margin-bottom: 12px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.sc-header { margin-bottom: 10px; }
.sc-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.sc-title { font-size: 16px; font-weight: 600; color: #333; flex: 1; }
.sc-type-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f0f0f0; color: #666; }
.sc-type-tag.type-code { background: #ecf5ff; color: #409EFF; }
.sc-type-tag.type-qr { background: #f0f9eb; color: #67C23A; }
.sc-type-tag.type-location { background: #fdf6ec; color: #E6A23C; }
.sc-status-row { display: flex; align-items: center; gap: 8px; }
.sc-status { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.sc-status.status-0 { background: #f0f9eb; color: #67C23A; }
.sc-status.status-1 { background: #f4f4f5; color: #909399; }
.sc-status.status-2 { background: #fef0f0; color: #F56C6C; }
.convert-tag { font-size: 11px; padding: 2px 6px; border-radius: 4px; }
.convert-convert-0 { background: #fdf6ec; color: #E6A23C; }
.convert-0 { background: #fdf6ec; color: #E6A23C; }
.convert-1 { background: #f0f9eb; color: #67C23A; }
.convert-2 { background: #fef0f0; color: #F56C6C; }

.sc-body { margin-bottom: 10px; }
.sc-info-row { display: flex; align-items: center; margin-bottom: 4px; }
.sc-label { font-size: 12px; color: #999; width: 36px; flex-shrink: 0; }
.sc-value { font-size: 13px; color: #666; flex: 1; }

.sc-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #f5f5f5; }
.sc-progress-bar { display: flex; align-items: center; gap: 8px; flex: 1; }
.progress-track { flex: 1; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; max-width: 120px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #409EFF, #67C23A); border-radius: 3px; transition: width 0.3s; }
.progress-text { font-size: 12px; color: #999; }
.sc-actions { display: flex; gap: 8px; }
.action-btn { font-size: 12px; padding: 4px 12px; border-radius: 14px; }
.action-btn.code-btn { background: #ecf5ff; }
.action-code { color: #409EFF; font-weight: 700; font-size: 14px; letter-spacing: 2px; }
.finish-btn { background: #fdf6ec; color: #E6A23C; }
.confirm-btn { background: #f0f9eb; color: #67C23A; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 0; }
.empty-text { font-size: 14px; color: #999; margin-top: 12px; margin-bottom: 20px; }
.empty-btn { background: #409EFF; color: #fff; padding: 8px 24px; border-radius: 20px; font-size: 14px; }

.code-modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.code-modal { background: #fff; border-radius: 16px; padding: 30px 40px; text-align: center; min-width: 240px; }
.code-modal-title { font-size: 16px; color: #333; display: block; margin-bottom: 16px; }
.code-modal-code { font-size: 48px; font-weight: 700; color: #409EFF; letter-spacing: 8px; display: block; margin: 16px 0; }
.code-modal-hint { font-size: 13px; color: #999; display: block; margin-bottom: 20px; }
.code-modal-close { background: #f5f5f5; padding: 8px 24px; border-radius: 20px; display: inline-block; }
.code-modal-close text { font-size: 14px; color: #666; }
</style>
