<template>
  <view class="page-container">
    <!-- 手册章节筛选 -->
    <scroll-view class="filter-scroll" scroll-x>
      <view class="filter-bar">
        <view
          class="filter-item"
          v-for="(chip, idx) in filterChips"
          :key="idx"
          :class="{ active: filterType === chip.value }"
          @click="setFilter(chip.value)"
        >{{ chip.label }}</view>
      </view>
    </scroll-view>

    <!-- 工作记录列表 -->
    <view class="worklog-card" v-for="(item, idx) in list" :key="idx" @click="goEdit(item)">
      <view class="wl-top">
        <view class="wl-type-tag" :class="item.workType">{{ typeText(item.workType) }}</view>
        <text class="wl-date">{{ formatDate(item.workDate) }}</text>
      </view>
      <view class="wl-class" v-if="item.className">{{ item.className }}</view>
      <view class="wl-title" v-if="item.title">{{ item.title }}</view>
      <view class="wl-content">{{ plainText(item.workContent) }}</view>
      <view class="wl-bottom">
        <text class="wl-meta" v-for="(part, pi) in metaParts(item)" :key="pi">{{ part }}</text>
      </view>
    </view>

    <view class="empty" v-if="list.length === 0">
      <text>{{ loading ? '加载中…' : '暂无工作记录' }}</text>
    </view>

    <!-- 新增按钮 -->
    <view class="fab-btn" @click="goAdd">
      <uni-icons type="plusempty" size="24" color="#fff"></uni-icons>
    </view>
  </view>
</template>

<script>
import { listWorklog, getWorklogContext } from '@/api/affair/headteacher'

/** 兜底章节口径（附件4）：实际名称、顺序与频次以班主任工作配置为准 */
const TYPE_TEXT = {
  plan: '工作计划',
  meeting: '班会',
  dorm: '宿舍走访',
  activity: '班级活动',
  talk: '谈心谈话',
  award: '获奖情况',
  summary: '学期总结',
  discipline: '学生违纪',
  other: '其他'
}
const PUNISH_TEXT = { 1: '警告', 2: '严重警告', 3: '记过', 4: '留校察看', 5: '开除学籍' }

export default {
  data() {
    return {
      list: [],
      filterType: '',
      chapters: [],
      pageNum: 1,
      pageSize: 20,
      total: 0,
      loading: false
    }
  },
  computed: {
    typeMap() {
      const map = Object.assign({}, TYPE_TEXT)
      this.chapters.forEach(item => {
        if (item.type && item.typeName) map[item.type] = item.typeName
      })
      return map
    },
    filterChips() {
      const chips = [{ value: '', label: '全部' }]
      if (this.chapters.length) {
        this.chapters.forEach(item => { chips.push({ value: item.type, label: item.typeName }) })
        // 已停用但仍有历史记录的章节也要能筛出来
        Object.keys(TYPE_TEXT).forEach(key => {
          if (!chips.some(chip => chip.value === key)) chips.push({ value: key, label: TYPE_TEXT[key] })
        })
        return chips
      }
      Object.keys(TYPE_TEXT).forEach(key => {
        chips.push({ value: key, label: TYPE_TEXT[key] })
      })
      return chips
    }
  },
  onShow() {
    this.loadChapters()
    this.refresh()
  },
  onReachBottom() {
    this.loadMore()
  },
  methods: {
    loadChapters() {
      getWorklogContext().then(res => {
        this.chapters = (res.data && res.data.chapters) || []
      }).catch(() => {})
    },
    plainText(value) {
      if (!value) return ''
      return String(value).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    },
    refresh() {
      this.pageNum = 1
      this.list = []
      this.loadList()
    },
    loadList() {
      if (this.loading) return
      this.loading = true
      const query = {
        pageNum: this.pageNum,
        pageSize: this.pageSize
      }
      if (this.filterType) query.workType = this.filterType
      listWorklog(query).then(res => {
        const rows = res.rows || []
        if (this.pageNum === 1) {
          this.list = rows
        } else {
          this.list = this.list.concat(rows)
        }
        this.total = res.total || 0
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    loadMore() {
      if (this.list.length >= this.total) return
      this.pageNum++
      this.loadList()
    },
    setFilter(type) {
      if (this.filterType === type) return
      this.filterType = type
      this.refresh()
    },
    typeText(type) {
      return this.typeMap[type] || type
    },
    metaParts(item) {
      const parts = []
      if (item.roomNo) parts.push('宿舍 ' + item.roomNo)
      if (item.studentNames) parts.push(item.studentNames)
      if (item.workLocation) parts.push(item.workLocation)
      if (item.participantCount) parts.push('实到 ' + item.participantCount + ' 人')
      if (item.leaveCount) parts.push('请假 ' + item.leaveCount + ' 人')
      if (item.awardOrg) parts.push(item.awardOrg)
      if (item.punishLevel) parts.push('处分：' + (PUNISH_TEXT[item.punishLevel] || item.punishLevel))
      if (item.careLevel && item.careLevel !== '0') parts.push(item.careLevel === '2' ? '重点关注' : '一般关注')
      if (item.attachmentCount) parts.push('佐证 ' + item.attachmentCount)
      return parts.slice(0, 4)
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return dateStr.substring(0, 10)
    },
    goAdd() {
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/worklog-add'
      })
    },
    goEdit(item) {
      // 第四章台账已并入「谈心谈话」，历史谈话记录只留档，登记与修改都在那边做
      if (item.workType === 'talk') {
        this.goTalkList()
        return
      }
      uni.navigateTo({
        url: '/pages/sub-work/headteacher/worklog-add?id=' + item.id
      })
    },
    goTalkList() {
      uni.showModal({
        title: '已统一到谈心谈话',
        content: '谈话台账改在「谈心谈话」中登记与跟进，是否现在前往？',
        confirmText: '前往',
        cancelText: '知道了',
        success: res => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/sub-work/talk/index?viewScope=headteacher' })
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f6f7;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.filter-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 16rpx;
}

.filter-bar {
  display: inline-flex;
  gap: 12rpx;
}

.filter-item {
  padding: 8rpx 20rpx;
  background: #fff;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
  flex-shrink: 0;

  &.active {
    background: #2979ff;
    color: #fff;
  }
}

.worklog-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;

  &:active {
    background: #f9f9f9;
  }
}

.wl-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.wl-type-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  color: #fff;

  &.plan { background: #5c6bc0; }
  &.meeting { background: #18bc37; }
  &.dorm { background: #2979ff; }
  &.activity { background: #00b0b9; }
  &.talk { background: #f3a044; }
  &.award { background: #e6a23c; }
  &.summary { background: #7b1fa2; }
  &.discipline { background: #e43d33; }
  &.other { background: #999; }
}

.wl-date {
  font-size: 24rpx;
  color: #999;
}

.wl-class {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 6rpx;
}

.wl-title {
  font-size: 27rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 6rpx;
}

.wl-content {
  font-size: 26rpx;
  color: #555;
  line-height: 1.5;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.wl-bottom {
  display: flex;
  flex-wrap: wrap;
}

.wl-meta {
  font-size: 22rpx;
  color: #999;
  background: #f5f6f8;
  border-radius: 6rpx;
  padding: 4rpx 12rpx;
  margin-right: 12rpx;
}

.empty {
  text-align: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 60rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #2979ff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(41, 121, 255, 0.4);

  &:active {
    transform: scale(0.95);
  }
}
</style>
