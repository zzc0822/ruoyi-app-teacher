<template>
  <view class="container">
    <view v-if="!loaded" class="empty">加载中...</view>
    <view v-else-if="!hasPartyRecord" class="empty">暂无党员档案</view>
    <view v-else>
      <!-- 发展阶段时间线 -->
      <view class="section-card">
        <text class="section-title">发展过程</text>
        <view class="timeline">
          <view class="timeline-item" v-for="(item, idx) in stages" :key="idx" :class="{ active: item.reached }">
            <view class="dot"></view>
            <view class="tl-content">
              <text class="tl-label">{{ item.label }}</text>
              <text class="tl-date">{{ item.dateText }}</text>
              <!-- 佐证材料 -->
              <view class="materials" v-if="item.reached">
                <view v-if="item.materials.length === 0" class="no-material">
                  <text class="no-material-text">请补充</text>
                </view>
                <view v-else>
                  <view class="img-row">
                    <image
                      v-for="(img, imgIdx) in item.materials.slice(0, 5)"
                      :key="imgIdx"
                      :src="img"
                      mode="aspectFill"
                      class="thumb"
                      @click="previewImage(item.materials, imgIdx)"
                    />
                    <view v-if="item.materials.length > 5" class="more-btn" @click="previewImage(item.materials, 5)">
                      <text class="more-text">+{{ item.materials.length - 5 }}张</text>
                      <text class="more-text">更多</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 前置条件 -->
      <view class="section-card" v-if="conditions && conditions.length > 0">
        <text class="section-title">晋升至下一阶段条件</text>
        <view v-for="(c, idx) in conditions" :key="idx" class="condition-item">
          <u-icon :name="c.met ? 'checkmark-circle-fill' : 'close-circle-fill'"
            :color="c.met ? '#67C23A' : '#F56C6C'" size="36"></u-icon>
          <text class="condition-text">{{ c.name }}：{{ c.met ? '已满足' : (c.reason || '未满足') }}</text>
        </view>
      </view>

      <!-- 思想汇报入口 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title" style="margin-bottom:0">思想汇报 ({{ thoughtReports.length }})</text>
          <text class="link-btn" @click="goThoughtAdd">+ 提交汇报</text>
        </view>
        <view v-if="thoughtReports.length === 0" class="no-data">暂无记录</view>
        <view v-for="item in thoughtReports" :key="item.reportId" class="report-item">
          <text class="report-title">{{ item.title }}</text>
          <view class="report-meta">
            <text class="meta">{{ item.reportType }} · {{ formatDate(item.reportDate) }}</text>
            <text class="status-tag" :class="'status-' + item.reviewStatus">
              {{ ['待审','通过','需改','退回'][item.reviewStatus] }}
            </text>
          </view>
        </view>
      </view>

      <!-- 入党申请书入口 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title" style="margin-bottom:0">入党申请书</text>
          <text class="link-btn" @click="goApplication">查看/编辑</text>
        </view>
        <view v-if="!applicationImages || applicationImages.length === 0" class="no-data">
          <text>请补充</text>
        </view>
        <view v-else class="img-row" style="margin-top: 16rpx;">
          <image
            v-for="(img, idx) in applicationImages.slice(0, 5)"
            :key="idx"
            :src="img"
            mode="aspectFill"
            class="thumb"
            @click="previewImage(applicationImages, idx)"
          />
          <view v-if="applicationImages.length > 5" class="more-btn" @click="previewImage(applicationImages, 5)">
            <text class="more-text">+{{ applicationImages.length - 5 }}张</text>
            <text class="more-text">更多</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party/party'
import config from '@/config'

const stageMap = [
  { key: 'APPLICANT', label: '递交申请书' },
  { key: 'ACTIVIST', label: '确定为积极分子' },
  { key: 'TARGET', label: '确定为发展对象' },
  { key: 'PROBATIONARY', label: '接收为预备党员' },
  { key: 'FORMAL', label: '转为正式党员' }
]
const dateFields = ['applyDate', 'activistDate', 'targetDate', 'probationDate', 'formalDate']

export default {
  data() {
    return {
      loaded: false,
      hasPartyRecord: false,
      stages: [],
      conditions: [],
      thoughtReports: [],
      applicationImages: [],
      politicalReview: null,
      trainingRecords: []
    }
  },
  onLoad() { this.loadData() },
  onShow() { this.loadData() },
  methods: {
    formatDate(d) { return d ? d.substring(0, 10) : '' },
    fullImageUrl(path) {
      if (!path) return ''
      if (path.startsWith('http')) return path
      return config.baseUrl + path
    },
    parseImages(str) {
      if (!str) return []
      return str.split(',').filter(Boolean).map(p => this.fullImageUrl(p))
    },
    loadData() {
      uni.showLoading({ title: '加载中...' })
      partyApi.progress().then(res => {
        uni.hideLoading()
        const data = res.data || {}
        if (!data.hasPartyRecord) {
          this.hasPartyRecord = false
          this.loaded = true
          return
        }
        this.hasPartyRecord = true
        const member = data.member || {}
        const currentIdx = stageMap.findIndex(s => s.key === member.currentStage)

        // 收集各阶段佐证材料
        const appImages = this.parseImages(data.applicationImages)
        this.applicationImages = appImages
        this.thoughtReports = data.thoughtReports || []
        this.politicalReview = data.politicalReview
        this.trainingRecords = data.trainingRecords || []
        this.conditions = data.conditions || []

        // 思想汇报附件图片
        const thoughtImages = []
        this.thoughtReports.forEach(r => {
          if (r.attachment) {
            thoughtImages.push(...this.parseImages(r.attachment))
          }
        })

        // 政审附件图片
        const reviewImages = this.politicalReview && this.politicalReview.attachment
          ? this.parseImages(this.politicalReview.attachment) : []

        // 培训证书/记录（无图片字段，显示结业证书编号）
        const trainingImages = []
        this.trainingRecords.forEach(t => {
          if (t.certificateNo) {
            // 培训记录没有图片，用证书编号作为文字材料标识
          }
        })

        // 构建各阶段数据
        this.stages = stageMap.map((s, i) => {
          const reached = i <= currentIdx
          const dateVal = member[dateFields[i]]
          let dateText = ''
          if (!reached) {
            dateText = '未到达'
          } else if (dateVal) {
            dateText = this.formatDate(dateVal)
          } else {
            dateText = '请补充'
          }

          // 各阶段对应的佐证材料
          let materials = []
          if (reached) {
            if (i === 0) materials = appImages
            else if (i === 1) materials = thoughtImages
            else if (i === 2) materials = reviewImages
            // i === 3 培训记录无图片, i === 4 正式党员
          }

          return { ...s, reached, dateText, materials }
        })

        this.loaded = true
      }).catch(() => { uni.hideLoading() })
    },
    previewImage(urls, idx) {
      uni.previewImage({ urls, current: idx })
    },
    goThoughtAdd() {
      uni.navigateTo({ url: '/pages/sub-mine/party/thoughtAdd' })
    },
    goApplication() {
      uni.navigateTo({ url: '/pages/sub-mine/party/application' })
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.empty { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }

.section-card { background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.section-title { font-size: 30rpx; font-weight: bold; color: #303133; margin-bottom: 20rpx; display: block; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.link-btn { font-size: 26rpx; color: #409EFF; }

/* 时间线 */
.timeline { padding-left: 10rpx; }
.timeline-item { display: flex; padding: 16rpx 0; position: relative; }
.timeline-item::before { content: ''; position: absolute; left: 8rpx; top: 40rpx; bottom: -16rpx; width: 2rpx; background: #e4e7ed; }
.timeline-item:last-child::before { display: none; }
.dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: #e4e7ed; margin-right: 20rpx; margin-top: 6rpx; flex-shrink: 0; z-index: 1; }
.timeline-item.active .dot { background: #409EFF; }
.tl-content { flex: 1; }
.tl-label { font-size: 28rpx; color: #303133; display: block; }
.tl-date { font-size: 24rpx; color: #909399; margin-top: 4rpx; display: block; }

/* 佐证材料 */
.materials { margin-top: 12rpx; }
.no-material { padding: 8rpx 0; }
.no-material-text { font-size: 24rpx; color: #E6A23C; }
.img-row { display: flex; flex-wrap: wrap; gap: 12rpx; align-items: center; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; }
.more-btn { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f5f7fa; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.more-text { font-size: 22rpx; color: #909399; }

/* 条件 */
.condition-item { display: flex; align-items: center; padding: 12rpx 0; }
.condition-text { margin-left: 12rpx; font-size: 26rpx; color: #606266; }

/* 思想汇报 */
.no-data { text-align: center; color: #c0c4cc; font-size: 26rpx; padding: 20rpx 0; }
.report-item { padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.report-item:last-child { border-bottom: none; }
.report-title { font-size: 28rpx; color: #303133; display: block; margin-bottom: 8rpx; }
.report-meta { display: flex; justify-content: space-between; align-items: center; }
.meta { font-size: 24rpx; color: #909399; }
.status-tag { padding: 2rpx 12rpx; border-radius: 10rpx; font-size: 22rpx; color: #fff; }
.status-0 { background: #E6A23C; }
.status-1 { background: #67C23A; }
.status-2 { background: #F56C6C; }
.status-3 { background: #909399; }
</style>
