<template>
  <view class="page-container">
    <view class="tips">
      请选择要安排的学生，设置目标状态后提交。
    </view>

    <!-- 数据源与筛选 -->
    <view class="filter-card">
      <view class="filter-row">
        <text class="filter-label">数据来源</text>
        <picker mode="selector" :range="sourceArray" :value="sourceIndex" @change="onSourceChange">
          <view class="filter-picker">{{ sourceArray[sourceIndex] }}</view>
        </picker>
      </view>
      <view class="filter-row">
        <text class="filter-label">班级</text>
        <picker mode="selector" :range="classArray" :value="classIndex" @change="onClassChange">
          <view class="filter-picker">{{ classArray[classIndex] || '全部班级' }}</view>
        </picker>
      </view>
      <view class="filter-row">
        <text class="filter-label">政治面貌</text>
        <picker mode="selector" :range="zzmmArray" :value="zzmmIndex" @change="onZzmmChange">
          <view class="filter-picker">{{ zzmmArray[zzmmIndex] || '不限' }}</view>
        </picker>
      </view>
      <view class="filter-row">
        <text class="filter-label">性别</text>
        <picker mode="selector" :range="genderArray" :value="genderIndex" @change="onGenderChange">
          <view class="filter-picker">{{ genderArray[genderIndex] || '不限' }}</view>
        </picker>
      </view>
      <view class="filter-btn" @click="queryStudents">查询学生</view>
    </view>

    <view class="search-bar">
      <uni-easyinput v-model="searchKey" placeholder="搜索姓名/学号" @confirm="filterStudents" clearable @clear="filterStudents">
        <template #right>
          <uni-icons type="search" size="18" @click="filterStudents"></uni-icons>
        </template>
      </uni-easyinput>
    </view>
    <view class="status-bar">
      <text class="status-label">安排状态：</text>
      <picker mode="selector" :range="statusArray" :value="statusIndex" @change="onStatusChange">
        <view class="status-picker">{{ statusArray[statusIndex] }}</view>
      </picker>
      <view class="quick-actions">
        <text class="quick-text" @click="selectAll">全选</text>
        <text class="quick-text" @click="clearAll">清空</text>
      </view>
    </view>
    <scroll-view scroll-y class="stu-scroll">
      <view class="stu-item" v-for="stu in displayList" :key="stu.xh" @click="toggleSelect(stu)">
        <view :class="['checkbox', selectedXh.includes(stu.xh) ? 'checked' : '']">
          <uni-icons v-if="selectedXh.includes(stu.xh)" type="checkmarkempty" size="14" color="#fff"></uni-icons>
        </view>
        <view class="stu-info">
          <text class="stu-name">{{ stu.studentName || stu.xm }}</text>
          <text class="stu-xh">{{ stu.xh }}</text>
          <text class="stu-class">{{ stu.bjjc || stu.bjmc || stu.className }}</text>
        </view>
      </view>
      <view class="empty-tip" v-if="displayList.length === 0">
        <text>暂无学生</text>
      </view>
    </scroll-view>
    <view class="bottom-bar">
      <text class="selected-count">已选 {{ selectedXh.length }} 人</text>
      <view class="submit-btn" @click="submit">确认安排</view>
    </view>
  </view>
</template>

<script>
import { listStuinfo, getMyStudents, getCollegeClassTreeByRole } from '@/api/stumanage/stuinfo'
import { batchArrange } from '@/api/stumanage/activity'

const STATUS_OPTIONS = [
  { label: '已报名', value: '0' },
  { label: '已参与', value: '1' },
  { label: '已弃权', value: '2' }
]

const ZZMM_OPTIONS = [
  { label: '不限', value: '' },
  { label: '群众', value: '0' },
  { label: '共青团员', value: '1' },
  { label: '中共党员', value: '2' },
  { label: '中共预备党员', value: '3' }
]

const GENDER_OPTIONS = [
  { label: '不限', value: '' },
  { label: '男', value: '1' },
  { label: '女', value: '2' }
]

export default {
  data() {
    return {
      activityId: null,
      searchKey: '',
      allStudents: [],
      displayList: [],
      selectedXh: [],
      statusArray: STATUS_OPTIONS.map(s => s.label),
      statusIndex: 0,
      targetStatus: '0',
      sourceArray: ['我的学生', '全学院学生'],
      sourceIndex: 0,
      classArray: ['全部班级'],
      classList: [],
      classIndex: 0,
      zzmmArray: ZZMM_OPTIONS.map(z => z.label),
      zzmmIndex: 0,
      zzmmValue: '',
      genderArray: GENDER_OPTIONS.map(g => g.label),
      genderIndex: 0,
      genderValue: ''
    }
  },
  onLoad(options) {
    this.activityId = Number(options.id)
    this.loadClassTree()
    this.queryStudents()
  },
  methods: {
    // 加载班级树，提取班级选项
    loadClassTree() {
      getCollegeClassTreeByRole().then(res => {
        const list = []
        const tree = res.data || []
        const walk = (nodes) => {
          (nodes || []).forEach(node => {
            if (node.children && node.children.length > 0) {
              walk(node.children)
            } else if (node.value && node.value.length > 4) {
              // 叶子节点且代码长度大于4视为班级
              list.push({ label: node.text || node.label, value: node.value })
            }
          })
        }
        walk(tree)
        this.classList = list
        this.classArray = ['全部班级', ...list.map(c => c.label)]
      }).catch(() => {
        // 加载失败静默处理
      })
    },
    onSourceChange(e) {
      this.sourceIndex = e.detail.value
    },
    onClassChange(e) {
      this.classIndex = e.detail.value
    },
    onZzmmChange(e) {
      this.zzmmIndex = e.detail.value
      this.zzmmValue = ZZMM_OPTIONS[this.zzmmIndex].value
    },
    onGenderChange(e) {
      this.genderIndex = e.detail.value
      this.genderValue = GENDER_OPTIONS[this.genderIndex].value
    },
    queryStudents() {
      uni.showLoading({ title: '加载中' })
      const isMySource = this.sourceIndex === 0
      const query = {}
      if (this.classIndex > 0) {
        query.bjdm = this.classList[this.classIndex - 1].value
      }
      if (this.zzmmValue) {
        query.zzmm = this.zzmmValue
      }
      if (this.genderValue) {
        query.gender = this.genderValue
      }

      const fetch = isMySource ? getMyStudents() : listStuinfo(query)
      fetch.then(res => {
        this.allStudents = res.data || res.rows || []
        this.filterStudents()
      }).catch(() => {
        uni.showToast({ title: '加载学生失败', icon: 'none' })
      }).finally(() => {
        uni.hideLoading()
      })
    },
    filterStudents() {
      const key = this.searchKey.trim()
      if (!key) {
        this.displayList = this.allStudents
        return
      }
      this.displayList = this.allStudents.filter(s => {
        const name = s.studentName || s.xm || ''
        const xh = s.xh || ''
        const cls = s.bjjc || s.bjmc || s.className || ''
        return name.includes(key) || xh.includes(key) || cls.includes(key)
      })
    },
    toggleSelect(stu) {
      const xh = stu.xh
      const idx = this.selectedXh.indexOf(xh)
      if (idx > -1) {
        this.selectedXh.splice(idx, 1)
      } else {
        this.selectedXh.push(xh)
      }
    },
    selectAll() {
      this.selectedXh = this.displayList.map(s => s.xh)
    },
    clearAll() {
      this.selectedXh = []
    },
    onStatusChange(e) {
      this.statusIndex = e.detail.value
      this.targetStatus = STATUS_OPTIONS[this.statusIndex].value
    },
    submit() {
      if (this.selectedXh.length === 0) {
        uni.showToast({ title: '请选择学生', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认安排',
        content: `确定将选中的 ${this.selectedXh.length} 名学生标记为${this.statusArray[this.statusIndex]}？`,
        success: (res) => {
          if (res.confirm) {
            batchArrange(this.activityId, {
              xhList: this.selectedXh,
              status: this.targetStatus
            }).then(() => {
              uni.showToast({ title: '安排成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 1000)
            }).catch(() => {
              uni.showToast({ title: '安排失败', icon: 'none' })
            })
          }
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f8;
}
.tips {
  padding: 10px 12px;
  font-size: 12px;
  color: #999;
  background: #fff;
}
.filter-card {
  background: #fff;
  padding: 12px;
  margin-bottom: 8px;
}
.filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.filter-label {
  width: 70px;
  font-size: 14px;
  color: #666;
}
.filter-picker {
  flex: 1;
  height: 36px;
  line-height: 36px;
  padding: 0 10px;
  background: #f5f6f8;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
}
.filter-btn {
  margin-top: 6px;
  height: 38px;
  line-height: 38px;
  text-align: center;
  background: #2979ff;
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
}
.search-bar {
  padding: 10px 12px;
  background: #fff;
}
.status-bar {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.status-label {
  font-size: 14px;
  color: #666;
}
.status-picker {
  margin-left: 10px;
  padding: 4px 12px;
  background: #f2f3f5;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
}
.quick-actions {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}
.quick-text {
  margin-left: 12px;
  font-size: 14px;
  color: #2979ff;
}
.stu-scroll {
  flex: 1;
  padding: 10px 12px;
}
.stu-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
.checkbox {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  border-radius: 50%;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkbox.checked {
  background: #2979ff;
  border-color: #2979ff;
}
.stu-info {
  display: flex;
  flex-direction: column;
}
.stu-name {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}
.stu-xh {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.stu-class {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}
.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #eee;
}
.selected-count {
  font-size: 14px;
  color: #666;
}
.submit-btn {
  padding: 8px 24px;
  background: #2979ff;
  color: #fff;
  border-radius: 18px;
  font-size: 14px;
}
</style>
<template>
  <view class="page-container">
    <view class="tips">
      请选择要安排的学生，设置目标状态后提交。
    </view>
    <view class="search-bar">
      <uni-easyinput v-model="searchKey" placeholder="搜索姓名/学号" @confirm="filterStudents" clearable @clear="filterStudents">
        <template #right>
          <uni-icons type="search" size="18" @click="filterStudents"></uni-icons>
        </template>
      </uni-easyinput>
    </view>
    <view class="status-bar">
      <text class="status-label">安排状态：</text>
      <picker mode="selector" :range="statusArray" :value="statusIndex" @change="onStatusChange">
        <view class="status-picker">{{ statusArray[statusIndex] }}</view>
      </picker>
    </view>
    <scroll-view scroll-y class="stu-scroll">
      <view class="stu-item" v-for="stu in displayList" :key="stu.xh" @click="toggleSelect(stu)">
        <view :class="['checkbox', selectedXh.includes(stu.xh) ? 'checked' : '']">
          <uni-icons v-if="selectedXh.includes(stu.xh)" type="checkmarkempty" size="14" color="#fff"></uni-icons>
        </view>
        <view class="stu-info">
          <text class="stu-name">{{ stu.studentName || stu.xm }}</text>
          <text class="stu-xh">{{ stu.xh }}</text>
          <text class="stu-class">{{ stu.bjjc || stu.bjmc || stu.className }}</text>
        </view>
      </view>
      <view class="empty-tip" v-if="displayList.length === 0">
        <text>暂无学生</text>
      </view>
    </scroll-view>
    <view class="bottom-bar">
      <text class="selected-count">已选 {{ selectedXh.length }} 人</text>
      <view class="submit-btn" @click="submit">确认安排</view>
    </view>
  </view>
</template>

<script>
import { getMyStudents } from '@/api/stumanage/stuinfo'
import { batchArrange } from '@/api/stumanage/activity'

const STATUS_OPTIONS = [
  { label: '已报名', value: '0' },
  { label: '已参与', value: '1' },
  { label: '已弃权', value: '2' }
]

export default {
  data() {
    return {
      activityId: null,
      searchKey: '',
      allStudents: [],
      displayList: [],
      selectedXh: [],
      statusArray: STATUS_OPTIONS.map(s => s.label),
      statusIndex: 0,
      targetStatus: '0'
    }
  },
  onLoad(options) {
    this.activityId = Number(options.id)
    this.loadStudents()
  },
  methods: {
    loadStudents() {
      getMyStudents().then(res => {
        this.allStudents = res.data || []
        this.filterStudents()
      }).catch(() => {
        uni.showToast({ title: '加载学生失败', icon: 'none' })
      })
    },
    filterStudents() {
      const key = this.searchKey.trim()
      if (!key) {
        this.displayList = this.allStudents
        return
      }
      this.displayList = this.allStudents.filter(s => {
        const name = s.studentName || s.xm || ''
        const xh = s.xh || ''
        const cls = s.bjjc || s.bjmc || s.className || ''
        return name.includes(key) || xh.includes(key) || cls.includes(key)
      })
    },
    toggleSelect(stu) {
      const xh = stu.xh
      const idx = this.selectedXh.indexOf(xh)
      if (idx > -1) {
        this.selectedXh.splice(idx, 1)
      } else {
        this.selectedXh.push(xh)
      }
    },
    onStatusChange(e) {
      this.statusIndex = e.detail.value
      this.targetStatus = STATUS_OPTIONS[this.statusIndex].value
    },
    submit() {
      if (this.selectedXh.length === 0) {
        uni.showToast({ title: '请选择学生', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认安排',
        content: `确定将选中的 ${this.selectedXh.length} 名学生标记为${this.statusArray[this.statusIndex]}？`,
        success: (res) => {
          if (res.confirm) {
            batchArrange(this.activityId, {
              xhList: this.selectedXh,
              status: this.targetStatus
            }).then(() => {
              uni.showToast({ title: '安排成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 1000)
            }).catch(() => {
              uni.showToast({ title: '安排失败', icon: 'none' })
            })
          }
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f8;
}
.tips {
  padding: 10px 12px;
  font-size: 12px;
  color: #999;
  background: #fff;
}
.search-bar {
  padding: 10px 12px;
  background: #fff;
}
.status-bar {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.status-label {
  font-size: 14px;
  color: #666;
}
.status-picker {
  margin-left: 10px;
  padding: 4px 12px;
  background: #f2f3f5;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
}
.stu-scroll {
  flex: 1;
  padding: 10px 12px;
}
.stu-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
.checkbox {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  border-radius: 50%;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkbox.checked {
  background: #2979ff;
  border-color: #2979ff;
}
.stu-info {
  display: flex;
  flex-direction: column;
}
.stu-name {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}
.stu-xh {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.stu-class {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}
.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #eee;
}
.selected-count {
  font-size: 14px;
  color: #666;
}
.submit-btn {
  padding: 8px 24px;
  background: #2979ff;
  color: #fff;
  border-radius: 18px;
  font-size: 14px;
}
</style>
