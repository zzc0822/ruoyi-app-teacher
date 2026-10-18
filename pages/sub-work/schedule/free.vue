<template>
  <view class="free-page">
    <!-- 时间选择 -->
    <view class="picker-card">
      <view class="date-row">
        <picker mode="date" :value="queryDate" :start="rangeStart" :end="rangeEnd" @change="onDateChange">
          <view class="date-pick">
            <text class="date-text">{{ dateLabel }}</text>
            <text class="date-sub">{{ dateSubLabel }}</text>
          </view>
        </picker>
        <view class="today-btn" @click="pickToday">
          <text>今天</text>
        </view>
      </view>

      <!-- 节次区间选择 -->
      <scroll-view scroll-x class="section-scroll" :scroll-into-view="'sec-' + scrollAnchor">
        <view class="section-chips">
          <view
            v-for="sec in sectionChips"
            :key="sec.no"
            :id="'sec-' + sec.no"
            class="sec-chip"
            :class="{ 'chip-active': sec.no >= startSection && sec.no <= endSection, 'chip-edge': sec.no === startSection || sec.no === endSection }"
            @click="pickSection(sec.no)"
          >
            <text class="chip-no">{{ sec.no }}</text>
            <text class="chip-time">{{ sec.start }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="range-info">
        <text class="range-slot">第{{ startSection }}{{ endSection > startSection ? '-' + endSection : '' }}节</text>
        <text class="range-time">{{ rangeTimeText }}</text>
      </view>
    </view>

    <!-- 类型开关（教师名单仅书记/管理员可见） -->
    <view v-if="canViewTeachers" class="type-toggle">
      <text
        v-for="t in typeOptions"
        :key="t.key"
        class="type-btn"
        :class="{ active: activeTypes.indexOf(t.key) > -1 }"
        @click="toggleType(t.key)"
      >{{ t.label }}</text>
      <text class="type-tip">{{ scopeSummary }}</text>
    </view>
    <view v-else class="type-toggle">
      <text class="type-btn active">无课班级</text>
      <text class="type-tip">{{ scopeSummary }}</text>
    </view>

    <!-- 结果 -->
    <view v-if="loading" class="state-tip">
      <text>加载中…</text>
    </view>
    <view v-else-if="isVacation" class="state-tip">
      <text>{{ holidayText }}</text>
    </view>
    <view v-else-if="emptyScope" class="state-tip">
      <text>暂无带班班级，无法查询</text>
    </view>
    <view v-else class="result-wrap">
      <view v-for="group in displayGroups" :key="group.key" class="group-card">
        <view class="group-head">
          <text class="group-title">{{ group.title }}</text>
          <text class="group-count">{{ group.count }}</text>
        </view>
        <view class="block-grid" :class="gridClass">
          <view
            v-for="item in group.shownItems"
            :key="item.id"
            class="free-block"
            :class="group.tone"
          >
            <text class="block-name">{{ item.name }}</text>
            <text class="block-meta">{{ item.meta }}</text>
          </view>
        </view>
        <view v-if="group.hiddenCount > 0 && !group.expanded" class="expand-btn" @click="expandGroup(group.key)">
          <text>展开全部（还有 {{ group.hiddenCount }} 个）</text>
        </view>
        <view v-if="group.hiddenCount === 0 && group.expanded && group.count > PAGE_SIZE" class="expand-btn" @click="collapseGroup(group.key)">
          <text>收起</text>
        </view>
      </view>

      <view v-if="displayGroups.length === 0" class="state-tip">
        <text>该时段视野内没有无课对象</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getFreeSlots, getActiveSchedule } from '@/api/work/schedule'
import { isSecretary, isAdmin } from '@/utils/role'

// 后端作息时间未配置时的兜底时间表
const FALLBACK_TIMES = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:30', end: '15:15' },
  { start: '15:25', end: '16:10' },
  { start: '16:20', end: '17:05' },
  { start: '17:15', end: '18:00' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:50', end: '21:35' },
  { start: '21:45', end: '22:30' }
]

const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default {
  data() {
    return {
      PAGE_SIZE: 30,
      queryDate: '',
      rangeStart: '',
      rangeEnd: '',
      sectionTimes: [],
      startSection: 1,
      endSection: 1,
      scrollAnchor: 1,
      // 教师名单仅书记/管理员可用
      canViewTeachers: false,
      activeTypes: ['class'],
      typeOptions: [
        { key: 'class', label: '无课班级' },
        { key: 'teacher', label: '无课教师' }
      ],
      loading: false,
      isVacation: false,
      emptyScope: false,
      holidayName: '',
      weekday: 0,
      weekdayName: '',
      weekNumber: 0,
      scopeType: 'college',
      collegeName: '',
      classList: [],
      teacherList: [],
      classTotal: 0,
      teacherTotal: 0,
      expandedKeys: []
    }
  },
  computed: {
    sectionChips() {
      const arr = []
      for (let i = 1; i <= this.maxSectionCount; i++) {
        const t = this.getTimeForSection(i)
        arr.push({ no: i, start: t ? t.start : '', end: t ? t.end : '' })
      }
      return arr
    },
    maxSectionCount() {
      return this.sectionTimes.length > 0 ? this.sectionTimes.length : FALLBACK_TIMES.length
    },
    dateLabel() {
      if (!this.queryDate) return '选择日期'
      const parts = this.queryDate.split('-')
      return parts[1] + '月' + parts[2] + '日'
    },
    dateSubLabel() {
      const wd = this.weekdayName || WEEKDAY_NAMES[(this.weekday || 1) - 1]
      return this.weekNumber ? wd + ' · 第' + this.weekNumber + '教学周' : wd
    },
    rangeTimeText() {
      const s = this.getTimeForSection(this.startSection)
      const e = this.getTimeForSection(this.endSection)
      if (!s || !e) return ''
      return s.start + ' - ' + e.end
    },
    holidayText() {
      return '所选日期不在教学周内' + (this.holidayName ? '（' + this.holidayName + '）' : '')
    },
    gridClass() {
      return this.activeTypes.indexOf('teacher') > -1 ? 'grid-wide' : ''
    },
    scopeSummary() {
      const parts = []
      if (this.scopeType === 'all') {
        parts.push('全校')
      } else if (this.scopeType === 'myClasses') {
        parts.push('我的带班')
      } else {
        parts.push(this.collegeName || '本院')
      }
      if (this.activeTypes.indexOf('class') > -1) {
        parts.push('在校班级' + this.classTotal)
      }
      if (this.canViewTeachers && this.activeTypes.indexOf('teacher') > -1) {
        parts.push('在职教师' + this.teacherTotal)
      }
      return parts.join(' · ')
    },
    displayGroups() {
      const groups = []
      if (this.activeTypes.indexOf('class') > -1) {
        groups.push(...this.buildGroups(this.classList, 'class'))
      }
      if (this.canViewTeachers && this.activeTypes.indexOf('teacher') > -1) {
        groups.push(...this.buildGroups(this.teacherList, 'teacher'))
      }
      return groups.filter(g => g.count > 0).map(g => {
        const expanded = this.expandedKeys.indexOf(g.key) > -1
        return {
          ...g,
          expanded,
          shownItems: expanded ? g.items : g.items.slice(0, this.PAGE_SIZE),
          hiddenCount: expanded ? 0 : Math.max(0, g.items.length - this.PAGE_SIZE)
        }
      })
    }
  },
  onLoad() {
    const now = new Date()
    this.queryDate = this.formatDate(now)
    const d = new Date(now.getTime() - 30 * 86400000)
    const e = new Date(now.getTime() + 60 * 86400000)
    this.rangeStart = this.formatDate(d)
    this.rangeEnd = this.formatDate(e)

    this.checkRole()
    this.loadSectionTimes()
    this.loadFreeSlots()
  },
  methods: {
    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return y + '-' + m + '-' + d
    },
    // 教师名单只对书记/管理员开放，其余角色（辅导员、班主任）只看班级
    checkRole() {
      const store = this.$store
      let roles = []

      if (store && store.state && store.state.user && store.state.user.roles) {
        roles = store.state.user.roles
      }

      if (!roles || (Array.isArray(roles) && roles.length === 0)) {
        try {
          roles = uni.getStorageSync('user_roles') || []
        } catch (e) {
          roles = []
        }
      }

      const allowed = isSecretary(roles) || isAdmin(roles)
      this.canViewTeachers = allowed
      if (!allowed) {
        this.activeTypes = ['class']
      }
    },
    getTimeForSection(section) {
      const idx = section - 1
      if (this.sectionTimes.length > 0 && this.sectionTimes[idx]) {
        return this.sectionTimes[idx]
      }
      return FALLBACK_TIMES[idx] || null
    },
    loadSectionTimes() {
      getActiveSchedule(this.queryDate).then(res => {
        const scheme = res.data
        if (scheme && scheme.detailList && scheme.detailList.length > 0) {
          const sorted = scheme.detailList.slice().sort((a, b) => Number(a.lessonNo) - Number(b.lessonNo))
          this.sectionTimes = sorted.map(d => ({ start: d.startTime, end: d.endTime }))
        }
      }).catch(() => {
        this.sectionTimes = []
      })
    },
    // 单选状态下点另一节构成区间；已是区间则重新起点单选
    pickSection(no) {
      if (this.startSection === this.endSection) {
        if (no === this.startSection) {
          return
        }
        const anchor = this.startSection
        this.startSection = Math.min(anchor, no)
        this.endSection = Math.max(anchor, no)
      } else {
        this.startSection = no
        this.endSection = no
      }
      this.scrollAnchor = no
      this.loadFreeSlots()
    },
    toggleType(key) {
      const idx = this.activeTypes.indexOf(key)
      if (idx > -1) {
        if (this.activeTypes.length === 1) {
          return
        }
        this.activeTypes.splice(idx, 1)
      } else {
        this.activeTypes.push(key)
      }
    },
    onDateChange(e) {
      this.queryDate = e.detail.value
      this.loadSectionTimes()
      this.loadFreeSlots()
    },
    pickToday() {
      this.queryDate = this.formatDate(new Date())
      this.loadSectionTimes()
      this.loadFreeSlots()
    },
    expandGroup(key) {
      if (this.expandedKeys.indexOf(key) === -1) {
        this.expandedKeys.push(key)
      }
    },
    collapseGroup(key) {
      const idx = this.expandedKeys.indexOf(key)
      if (idx > -1) {
        this.expandedKeys.splice(idx, 1)
      }
    },
    loadFreeSlots() {
      this.loading = true
      this.expandedKeys = []
      getFreeSlots({
        date: this.queryDate,
        startSection: this.startSection,
        endSection: this.endSection
      }).then(res => {
        const data = res.data || {}
        this.isVacation = !!data.isVacation
        this.emptyScope = !!data.emptyScope
        this.holidayName = data.holidayName || ''
        this.classList = data.classList || []
        this.teacherList = data.teacherList || []
        this.classTotal = data.classTotal || 0
        this.teacherTotal = data.teacherTotal || 0
        this.weekday = data.weekday || 0
        this.weekdayName = data.weekdayName || ''
        this.weekNumber = data.weekNumber || 0
        this.canViewTeachers = this.canViewTeachers && data.canViewTeachers !== false
        this.scopeType = data.scopeType || 'college'
        this.collegeName = data.collegeName || ''
        this.loading = false
      }).catch(() => {
        this.classList = []
        this.teacherList = []
        this.loading = false
      })
    },
    // 按「本日其他时段有课 / 本日全天无课 / 本学期无排课」分档，越靠前越可用
    buildGroups(list, type) {
      const buckets = [
        { suffix: 'day', title: '本日其他时段有课', tone: 'tone-strong', filter: i => Number(i.dayBusy) === 1 },
        { suffix: 'semester', title: '本日全天无课', tone: 'tone-soft', filter: i => Number(i.dayBusy) !== 1 && Number(i.semesterBusy) === 1 },
        { suffix: 'none', title: '本学期无排课', tone: 'tone-none', filter: i => Number(i.semesterBusy) !== 1 }
      ]
      return buckets.map(b => {
        const items = list.filter(b.filter).map(i => ({
          id: type + '_' + (i.bjdm || i.teacherId),
          name: type === 'class' ? (i.shortName || i.className) : i.teacherName,
          meta: type === 'class' ? this.classMeta(i) : this.teacherMeta(i)
        }))
        return {
          key: type + '_' + b.suffix,
          title: b.title,
          tone: b.tone,
          count: items.length,
          items
        }
      })
    },
    classMeta(item) {
      const people = item.bcrs ? item.bcrs + '人' : ''
      return item.counselorName ? item.counselorName + (people ? ' · ' + people : '') : people
    },
    teacherMeta(item) {
      if (this.scopeType === 'all') {
        return item.collegeName || ''
      }
      const jsxz = item.jsxz || ''
      if (jsxz && jsxz !== '校内专任') {
        return jsxz
      }
      return item.gh || ''
    }
  }
}
</script>

<style lang="scss" scoped>
.free-page {
  min-height: 100vh;
  background: #f5f6f7;
  padding-bottom: 40rpx;
}

/* ===== 时间选择 ===== */
.picker-card {
  background: #fff;
  padding: 20rpx 24rpx 16rpx;
  border-bottom: 1rpx solid #eee;
}

.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.date-pick {
  display: flex;
  align-items: baseline;

  .date-text {
    font-size: 34rpx;
    font-weight: 700;
    color: #333;
  }

  .date-sub {
    font-size: 24rpx;
    color: #8a94a6;
    margin-left: 14rpx;
  }
}

.today-btn {
  padding: 8rpx 22rpx;
  border-radius: 26rpx;
  background: #f2f6ff;
  border: 1rpx solid #d7e5ff;
  font-size: 24rpx;
  color: #2979ff;
}

.section-scroll {
  margin-top: 18rpx;
  white-space: nowrap;
}

.section-chips {
  display: inline-flex;
  padding: 2rpx 0 6rpx;
}

.sec-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 86rpx;
  padding: 8rpx 10rpx;
  margin-right: 10rpx;
  border-radius: 12rpx;
  background: #f5f6f7;
  border: 1rpx solid #ececf0;

  .chip-no {
    font-size: 26rpx;
    font-weight: 600;
    color: #5a6472;
    line-height: 1.2;
  }

  .chip-time {
    font-size: 18rpx;
    color: #a6adbb;
    margin-top: 2rpx;
  }
}

.chip-active {
  background: #e8f1ff;
  border-color: #b9d5ff;

  .chip-no {
    color: #2979ff;
  }
}

.chip-edge {
  background: #2979ff;
  border-color: #2979ff;

  .chip-no {
    color: #fff;
  }

  .chip-time {
    color: rgba(255, 255, 255, 0.85);
  }
}

.range-info {
  display: flex;
  align-items: center;
  margin-top: 12rpx;

  .range-slot {
    font-size: 26rpx;
    font-weight: 600;
    color: #333;
    margin-right: 14rpx;
  }

  .range-time {
    font-size: 24rpx;
    color: #8a94a6;
  }
}

/* ===== 类型开关 ===== */
.type-toggle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.type-btn {
  font-size: 26rpx;
  color: #5a6472;
  padding: 10rpx 26rpx;
  border-radius: 30rpx;
  background: #f5f6f7;
  border: 1rpx solid #ececf0;
  margin-right: 14rpx;
}

.type-btn.active {
  color: #fff;
  background: #2979ff;
  border-color: #2979ff;
  font-weight: 600;
}

.type-tip {
  flex: 0 0 auto;
  margin-left: auto;
  white-space: nowrap;
  text-align: right;
  font-size: 22rpx;
  color: #a6adbb;
}

/* ===== 结果分组 ===== */
.result-wrap {
  padding: 16rpx 20rpx 0;
}

.group-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 20rpx 16rpx;
  margin-bottom: 20rpx;
}

.group-head {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;

  .group-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #333;
  }

  .group-count {
    margin-left: 12rpx;
    font-size: 22rpx;
    color: #2979ff;
    background: #eef4ff;
    border-radius: 20rpx;
    padding: 2rpx 16rpx;
  }
}

.block-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -6rpx;
}

.free-block {
  width: calc(33.333% - 12rpx);
  min-height: 92rpx;
  margin: 6rpx;
  padding: 10rpx 10rpx;
  border-radius: 10rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .block-name {
    font-size: 24rpx;
    font-weight: 700;
    line-height: 1.25;
    text-align: center;
    word-break: normal;
    overflow-wrap: break-word;
  }

  .block-meta {
    font-size: 18rpx;
    line-height: 1.2;
    margin-top: 4rpx;
    text-align: center;
    word-break: normal;
    overflow-wrap: break-word;
  }
}

.grid-wide .free-block {
  width: calc(25% - 12rpx);
}

.tone-strong {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .block-name {
    color: #fff;
  }

  .block-meta {
    color: rgba(255, 255, 255, 0.82);
  }
}

.tone-soft {
  background: #f7f9fc;
  border: 1rpx solid #e6ebf2;

  .block-name {
    color: #33404f;
  }

  .block-meta {
    color: #92a0b0;
  }
}

.tone-none {
  background: #f7f8fa;
  border: 1rpx dashed #dcdfe6;

  .block-name {
    color: #99a0ab;
    font-weight: 500;
  }

  .block-meta {
    color: #bcc2cc;
  }
}

.expand-btn {
  margin-top: 10rpx;
  padding: 12rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #2979ff;
  background: #f7f9ff;
  border-radius: 10rpx;
}

.state-tip {
  display: flex;
  justify-content: center;
  padding: 100rpx 40rpx;
  font-size: 26rpx;
  color: #a6adbb;
}
</style>
