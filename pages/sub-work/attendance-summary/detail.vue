<template>
  <view class="attendance-detail">
    <!-- 班级信息头 -->
    <view class="class-info-bar">
      <text class="class-info-name">{{ className }}</text>
      <text class="class-info-course" v-if="courseName">{{ courseName }}</text>
    </view>

    <!-- 图例 -->
    <view class="legend-bar">
      <view class="legend-item" v-for="item in legendItems" :key="item.key">
        <view class="legend-dot" :style="'background:' + item.color"></view>
        <text class="legend-text">{{ item.label }}</text>
      </view>
    </view>

    <!-- 调试信息 -->
    <view class="debug-info" v-if="debugMsg">
      <text>{{ debugMsg }}</text>
    </view>

    <!-- 网格表格：水平滚动 -->
    <scroll-view v-if="rows.length > 0" scroll-x class="grid-scroll" :style="'height:' + scrollHeight + 'px'">
      <view :style="'width:' + totalWidth + 'px'">
        <!-- 表头行 -->
        <view class="g-row g-hd">
          <view class="g-cell c-name">
            <text class="hd-text">学生</text>
          </view>
          <view v-for="(week, wIdx) in weeks" :key="'hw' + wIdx" class="g-cell c-wk" :title="getWeekTitle(week)">
            <text class="hd-text">{{ week }}</text>
          </view>
          <view class="g-cell c-sum">
            <text class="hd-text">出勤率</text>
          </view>
        </view>
        <!-- 数据行 -->
        <view v-for="(row, rIdx) in rows" :key="'dr' + rIdx" class="g-row" :class="rIdx % 2 === 1 ? 'row-alt' : ''">
          <view class="g-cell c-name">
            <text class="nm-text">{{ row.name }}</text>
            <text class="xh-text">{{ row.xh }}</text>
          </view>
          <view v-for="(cell, wIdx) in row.cells" :key="'dc' + rIdx + '-' + wIdx" class="g-cell c-wk" :title="getCellTitle(cell, weeks[wIdx])">
            <view class="st-dot" :class="cell.cls">
              <text class="st-char">{{ cell.txt }}</text>
            </view>
          </view>
          <view class="g-cell c-sum">
            <text class="rate-text">{{ row.rate }}%</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading" class="center-msg">
      <text>加载中...</text>
    </view>
    <view v-if="!loading && rows.length === 0" class="center-msg">
      <text>暂无数据</text>
    </view>

    <!-- 底部统计 -->
    <view class="bottom-stats" v-if="rows.length > 0">
      <view class="stats-row">
        <text class="stats-label">出勤率</text>
        <text class="stats-value">{{ attendanceRate }}%</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getTeacherReportGrid } from '@/api/work/rollcall'

export default {
  data() {
    return {
      bjdm: '',
      className: '',
      courseName: '',
      weeks: [],
      weekInfo: {},
      rows: [],
      currentWeek: 0,
      loading: true,
      scrollHeight: 500,
      totalWidth: 800,
      debugMsg: '',
      legendItems: [
        { key: 'p', label: '出勤', color: '#4caf50' },
        { key: 'l', label: '请假', color: '#ff9800' },
        { key: 't', label: '迟到', color: '#ffc107' },
        { key: 'a', label: '旷课', color: '#f44336' },
        { key: 'e', label: '未考勤', color: '#e0e0e0' }
      ]
    }
  },
  computed: {
    attendanceRate() {
      if (!this.rows.length || !this.weeks.length) return 0
      let total = 0, present = 0
      for (let i = 0; i < this.rows.length; i++) {
        for (let j = 0; j < this.rows[i].cells.length; j++) {
          const c = this.rows[i].cells[j]
          if (c && c !== 'empty') {
            total++
            if (c === 'present') present++
          }
        }
      }
      return total > 0 ? Math.round(present / total * 100) : 0
    }
  },
  onLoad(options) {
    this.bjdm = options.bjdm || ''
    this.className = decodeURIComponent(options.className || '')
    this.courseName = decodeURIComponent(options.courseName || '')
    uni.setNavigationBarTitle({ title: this.className || '考勤详情' })
    const sys = uni.getSystemInfoSync()
    this.scrollHeight = sys.windowHeight - 160
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      this.debugMsg = '开始加载...'
      try {
        const res = await getTeacherReportGrid(this.bjdm)
        this.debugMsg = 'res keys: ' + Object.keys(res).join(',')
        const data = res.data || {}
        this.debugMsg = 'data keys: ' + Object.keys(data).join(',')
        const students = data.students || []
        const weeks = data.weeks || []
        const grid = data.grid || {}
        this.currentWeek = data.currentWeek || 0
        this.weeks = weeks
        this.weekInfo = data.weekInfo || {}
        this.debugMsg = 'students:' + students.length + ' weeks:' + weeks.length + ' gridKeys:' + Object.keys(grid).length

        // 构建二维数组，cells为对象数组
        const arr = []
        for (let i = 0; i < students.length; i++) {
          const s = students[i]
          const wm = grid[s.xh] || {}
          const cells = []
          let total = 0, present = 0
          for (let j = 0; j < weeks.length; j++) {
            const val = wm[String(weeks[j])] || 'empty'
            // 预计算class和text
            let cls = 'd-gray', txt = '-'
            if (val === 'present') { cls = 'd-green'; txt = '✓' }
            else if (val === 'leave') { cls = 'd-orange'; txt = '假' }
            else if (val === 'late' || val === 'early_leave') { cls = 'd-yellow'; txt = '迟' }
            else if (val === 'absent') { cls = 'd-red'; txt = '旷' }
            cells.push({ cls: cls, txt: txt })
            if (val && val !== 'empty') {
              total++
              if (val === 'present') present++
            }
          }
          const rate = total > 0 ? Math.round(present / total * 100) : 0
          arr.push({ xh: s.xh, name: s.studentName || '', cells: cells, rate: rate })
        }
        this.rows = arr
        // 计算总宽度：姓名列80px + 每列40px + 汇总列80px
        this.totalWidth = 80 + weeks.length * 40 + 80
        this.debugMsg = 'rows:' + arr.length + ' totalW:' + this.totalWidth + ' scrollH:' + this.scrollHeight
      } catch (e) {
        this.debugMsg = 'error: ' + JSON.stringify(e)
      }
      this.loading = false
    },
    dotCls(cell) {
      if (cell === 'present') return 'd-green'
      if (cell === 'leave') return 'd-orange'
      if (cell === 'late' || cell === 'early_leave') return 'd-yellow'
      if (cell === 'truant' || cell === 'absent') return 'd-red'
      return 'd-gray'
    },
    dotTxt(cell) {
      if (cell === 'present') return '✓'
      if (cell === 'leave') return '假'
      if (cell === 'late') return '迟'
      if (cell === 'early_leave') return '早'
      if (cell === 'truant') return '旷'
      if (cell === 'absent') return '缺'
      return '-'
    },
    getWeekTitle(week) {
      const info = this.weekInfo[String(week)]
      if (!info) return `第${week}周`
      let title = `第${week}周`
      if (info.startDate && info.endDate) {
        title += ` (${info.startDate} ~ ${info.endDate})`
      }
      if (info.checkDate) {
        title += `\n点名日期：${info.checkDate}`
      }
      return title
    },
    getCellTitle(cell, week) {
      const statusMap = {
        'd-green': '出勤',
        'd-orange': '请假',
        'd-yellow': '迟到/早退',
        'd-red': '旷课/缺勤',
        'd-gray': '未考勤'
      }
      const status = statusMap[cell.cls] || '未知'
      return `第${week}周：${status}`
    }
  }
}
</script>

<style lang="scss" scoped>
.attendance-detail {
  min-height: 100vh;
  background: #f5f6f8;
}
.class-info-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  background: #fff;
}
.class-info-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-right: 16rpx;
}
.class-info-course {
  font-size: 24rpx;
  color: #888;
}
.legend-bar {
  display: flex;
  padding: 12rpx 28rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}
.legend-item {
  display: flex;
  align-items: center;
  margin-right: 20rpx;
}
.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
  margin-right: 6rpx;
}
.legend-text {
  font-size: 20rpx;
  color: #666;
}
.debug-info {
  padding: 10rpx 20rpx;
  background: #fffbe6;
  font-size: 20rpx;
  color: #996600;
  border-bottom: 1rpx solid #ffe58f;
}

/* 网格滚动容器 */
.grid-scroll {
  background: #fff;
}

/* 网格行 */
.g-row {
  display: flex;
  flex-direction: row;
  height: 72rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.g-hd {
  height: 56rpx;
  background: #f0f2f5;
  border-bottom: 1rpx solid #ddd;
}
.row-alt {
  background: #fafbfc;
}

/* 网格单元格 */
.g-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.c-name {
  width: 160rpx;
  min-width: 160rpx;
  flex-direction: column;
  border-right: 2rpx solid #ddd;
  background: #fff;
}
.g-hd .c-name {
  background: #f0f2f5;
}
.row-alt .c-name {
  background: #fafbfc;
}
.c-wk {
  width: 80rpx;
  min-width: 80rpx;
}
.c-sum {
  width: 160rpx;
  min-width: 160rpx;
  border-left: 2rpx solid #ddd;
  background: #f8f9fa;
}
.g-hd .c-sum {
  background: #f0f2f5;
}

/* 文本样式 */
.hd-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #333;
}
.nm-text {
  font-size: 22rpx;
  color: #333;
  text-align: center;
}
.xh-text {
  font-size: 16rpx;
  color: #999;
  text-align: center;
}
.rate-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #4caf50;
}

/* 状态点 */
.st-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.st-char {
  font-size: 20rpx;
  font-weight: 600;
  color: #fff;
}
.d-green { background: #4caf50; }
.d-orange { background: #ff9800; }
.d-yellow { background: #ffc107; }
.d-red { background: #f44336; }
.d-gray { background: #e0e0e0; }
.d-gray .st-char { color: #bbb; }

.bottom-stats {
  background: #fff;
  padding: 16rpx 28rpx;
  border-top: 1rpx solid #eee;
}
.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stats-label { font-size: 26rpx; color: #666; }
.stats-value { font-size: 30rpx; font-weight: 700; color: #4caf50; }

.center-msg {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
  font-size: 28rpx;
  color: #999;
}
</style>
