<template>
  <view class="student-picker" @tap.stop>
    <!-- 搜索输入框 -->
    <view class="picker-search-box">
      <uni-icons type="search" size="16" color="#999"></uni-icons>
      <input
        class="picker-search-input"
        v-model="keyword"
        :placeholder="placeholder"
        confirm-type="search"
        @input="onInput"
        @focus="onFocus"
        @confirm="onConfirm"
      />
      <uni-icons v-if="keyword" type="clear" size="14" color="#c0c4cc" @click="clearKeyword"></uni-icons>
    </view>

    <!-- 单选模式：已选学生展示 -->
    <view class="selected-student" v-if="mode === 'single' && selectedStudent" @click="clearSelection">
      <view class="selected-info">
        <text class="selected-name">{{ selectedStudent.studentName }}</text>
        <text class="selected-detail">{{ selectedStudent.xh }} · {{ selectedStudent.className || selectedStudent.bjjc || '' }}</text>
      </view>
      <text class="selected-clear">×</text>
    </view>

    <!-- 多选模式：已选学生标签列表 -->
    <view class="selected-tags" v-if="mode === 'multi' && selectedList.length > 0">
      <view class="tag-item" v-for="(stu, idx) in selectedList" :key="stu.xh">
        <text class="tag-name">{{ stu.studentName }}</text>
        <text class="tag-close" @click.stop="removeStudent(idx)">×</text>
      </view>
    </view>

    <!-- 搜索结果下拉列表 -->
    <view class="picker-dropdown" v-if="showDropdown && resultList.length > 0">
      <scroll-view scroll-y class="dropdown-scroll">
        <view
          class="dropdown-item"
          v-for="stu in resultList"
          :key="stu.xh"
          @click="onSelect(stu)"
          :class="{ 'item-disabled': isAlreadySelected(stu) }"
        >
          <view class="item-main">
            <text class="item-name">{{ stu.studentName }}</text>
            <text class="item-xh">{{ stu.xh }}</text>
          </view>
          <view class="item-extra">
            <text class="item-class">{{ stu.className || stu.bjjc || stu.bjmc || '' }}</text>
            <text class="item-check" v-if="isAlreadySelected(stu)">✓</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 搜索无结果 -->
    <view class="picker-empty" v-if="showDropdown && hasSearched && resultList.length === 0 && !loading">
      <text class="empty-text">未找到相关学生</text>
    </view>

    <!-- 加载中 -->
    <view class="picker-loading" v-if="showDropdown && loading">
      <text class="loading-text">搜索中...</text>
    </view>
  </view>
</template>

<script>
import { searchStuinfo } from '@/api/student/stuinfo'

export default {
  name: 'student-picker',
  props: {
    // 模式：single=单选，multi=多选
    mode: {
      type: String,
      default: 'single'
    },
    // 搜索框占位文字
    placeholder: {
      type: String,
      default: '输入姓名搜索学生'
    },
    // 多选模式下已选学生数组
    value: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      keyword: '',
      resultList: [],
      loading: false,
      hasSearched: false,
      showDropdown: false,
      searchTimer: null,
      selectedStudent: null, // 单选模式已选
      selectedList: [] // 多选模式已选
    }
  },
  watch: {
    value: {
      handler(val) {
        if (this.mode === 'multi' && Array.isArray(val)) {
          this.selectedList = [...val]
        }
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    onInput() {
      const key = this.keyword.trim()
      if (!key) {
        this.resultList = []
        this.hasSearched = false
        this.showDropdown = false
        return
      }
      // 300ms 防抖
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.doSearch(key)
      }, 300)
    },
    onConfirm() {
      const key = this.keyword.trim()
      if (!key) return
      clearTimeout(this.searchTimer)
      this.doSearch(key)
    },
    onFocus() {
      if (this.keyword.trim() && this.resultList.length > 0) {
        this.showDropdown = true
      }
    },
    doSearch(key) {
      this.loading = true
      this.hasSearched = true
      this.showDropdown = true
      searchStuinfo(key).then(res => {
        this.resultList = res.rows || []
      }).catch(() => {
        this.resultList = []
      }).finally(() => {
        this.loading = false
      })
    },
    onSelect(stu) {
      if (this.isAlreadySelected(stu)) {
        // 已选中则取消选择
        if (this.mode === 'multi') {
          this.removeStudentByXh(stu.xh)
        }
        return
      }
      if (this.mode === 'single') {
        this.selectedStudent = stu
        this.showDropdown = false
        this.keyword = ''
        this.resultList = []
        this.$emit('select', stu)
      } else {
        // 多选模式
        this.selectedList.push(stu)
        this.keyword = ''
        this.resultList = []
        this.showDropdown = false
        this.$emit('change', [...this.selectedList])
        this.$emit('input', [...this.selectedList])
      }
    },
    isAlreadySelected(stu) {
      if (this.mode === 'single') {
        return this.selectedStudent && this.selectedStudent.xh === stu.xh
      }
      return this.selectedList.some(s => s.xh === stu.xh)
    },
    removeStudent(idx) {
      this.selectedList.splice(idx, 1)
      this.$emit('change', [...this.selectedList])
      this.$emit('input', [...this.selectedList])
    },
    removeStudentByXh(xh) {
      const idx = this.selectedList.findIndex(s => s.xh === xh)
      if (idx >= 0) {
        this.removeStudent(idx)
      }
    },
    clearSelection() {
      this.selectedStudent = null
      this.$emit('select', null)
      this.$emit('clear')
    },
    clearKeyword() {
      this.keyword = ''
      this.resultList = []
      this.hasSearched = false
      this.showDropdown = false
    },
    // 外部调用：清空所有选择
    reset() {
      this.selectedStudent = null
      this.selectedList = []
      this.keyword = ''
      this.resultList = []
      this.showDropdown = false
    }
  }
}
</script>

<style scoped>
.student-picker {
  position: relative;
}

.picker-search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  min-height: 72rpx;
  box-sizing: border-box;
  gap: 12rpx;
}

.picker-search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

/* 单选已选展示 */
.selected-student {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #e6f7ff;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-top: 12rpx;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.selected-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.selected-detail {
  font-size: 24rpx;
  color: #999;
}

.selected-clear {
  font-size: 32rpx;
  color: #999;
  padding: 0 8rpx;
}

/* 多选标签 */
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.tag-item {
  display: flex;
  align-items: center;
  background: #e6f7ff;
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
  gap: 8rpx;
}

.tag-name {
  font-size: 24rpx;
  color: #1890ff;
}

.tag-close {
  font-size: 24rpx;
  color: #999;
  padding: 0 4rpx;
}

/* 搜索结果下拉 */
.picker-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: #fff;
  border-radius: 0 0 16rpx 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  z-index: 200;
  max-height: 500rpx;
}

.dropdown-scroll {
  max-height: 500rpx;
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.dropdown-item:active {
  background: #f9f9f9;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item.item-disabled {
  opacity: 0.5;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.item-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.item-xh {
  font-size: 24rpx;
  color: #999;
}

.item-extra {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.item-class {
  font-size: 24rpx;
  color: #666;
}

.item-check {
  font-size: 28rpx;
  color: #1890ff;
  font-weight: bold;
}

/* 空状态和加载 */
.picker-empty,
.picker-loading {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: #fff;
  border-radius: 0 0 16rpx 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  z-index: 200;
  padding: 30rpx;
  text-align: center;
}

.empty-text,
.loading-text {
  font-size: 26rpx;
  color: #999;
}
</style>
