<template>
  <view class="plate-keyboard">
    <!-- 车牌展示区 -->
    <view class="plate-display">
      <view class="plate-slots">
        <view
          class="plate-slot"
          v-for="(ch, idx) in displaySlots"
          :key="idx"
          :class="{ 'slot-active': idx === currentPos, 'slot-filled': ch }"
          @click="onSlotTap(idx)"
        >
          <text class="slot-char">{{ ch || '' }}</text>
        </view>
      </view>
      <view class="plate-options">
        <view class="new-energy-toggle" @click="toggleNewEnergy">
          <view class="toggle-check" :class="{ checked: isNewEnergy }">
            <text class="check-mark" v-if="isNewEnergy">✓</text>
          </view>
          <text class="toggle-label">新能源</text>
        </view>
        <view class="plate-actions">
          <text class="action-btn" @click="clearPlate">清空</text>
          <text class="action-btn" @click="backspace">退格</text>
        </view>
      </view>
    </view>

    <!-- 省份键盘 -->
    <view class="keyboard-panel" v-if="keyboardType === 'province'">
      <view class="kb-row" v-for="(row, rIdx) in provinceKeys" :key="rIdx">
        <view
          class="kb-key"
          v-for="key in row"
          :key="key"
          @click="onKeyInput(key)"
        >
          <text class="kb-text">{{ key }}</text>
        </view>
      </view>
    </view>

    <!-- 字母数字键盘 -->
    <view class="keyboard-panel" v-if="keyboardType === 'alphanum'">
      <view class="kb-row" v-for="(row, rIdx) in alphanumKeys" :key="rIdx">
        <view
          class="kb-key"
          v-for="key in row"
          :key="key"
          @click="onKeyInput(key)"
          :class="{ 'key-wide': key === '退格' }"
        >
          <text class="kb-text">{{ key }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
const PROVINCES = '京沪津渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁'
// 省份缩写不含I、O
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const NUMS = '0123456789'

export default {
  name: 'plate-keyboard',
  props: {
    value: { type: String, default: '' },
    // 默认是否新能源
    newEnergy: { type: Boolean, default: false }
  },
  data() {
    return {
      plateChars: [],
      currentPos: 0,
      isNewEnergy: this.newEnergy || false,
      provinceKeys: this.buildProvinceRows(),
      alphanumKeys: this.buildAlphanumRows()
    }
  },
  computed: {
    maxLen() {
      return this.isNewEnergy ? 8 : 7
    },
    keyboardType() {
      // 第0位需要省份，其余字母数字
      return this.currentPos === 0 ? 'province' : 'alphanum'
    },
    displaySlots() {
      const slots = []
      for (let i = 0; i < this.maxLen; i++) {
        slots.push(this.plateChars[i] || '')
      }
      return slots
    }
  },
  watch: {
    value: {
      handler(val) {
        if (val !== this.getPlateStr()) {
          this.plateChars = val ? val.toUpperCase().split('') : []
          this.currentPos = Math.min(this.plateChars.length, this.maxLen - 1)
        }
      },
      immediate: true
    },
    isNewEnergy() {
      // 切换时截断多余字符
      if (this.plateChars.length > this.maxLen) {
        this.plateChars = this.plateChars.slice(0, this.maxLen)
      }
      if (this.currentPos >= this.maxLen) {
        this.currentPos = this.maxLen - 1
      }
      this.emitChange()
    }
  },
  methods: {
    buildProvinceRows() {
      const arr = PROVINCES.split('')
      const rows = []
      // 每行7个
      for (let i = 0; i < arr.length; i += 7) {
        rows.push(arr.slice(i, i + 7))
      }
      return rows
    },
    buildAlphanumRows() {
      // Row1: Q W E R T Y U I O P -> 去掉I O
      const r1 = ['Q','W','E','R','T','Y','U','P']
      // Row2: A S D F G H J K L
      const r2 = ['A','S','D','F','G','H','J','K','L']
      // Row3: Z X C V B N M + 退格
      const r3 = ['Z','X','C','V','B','N','M','退格']
      // Row4: 1-9, 0
      const r4 = ['1','2','3','4','5','6','7','8','9','0']
      return [r1, r2, r3, r4]
    },
    onSlotTap(idx) {
      this.currentPos = idx
    },
    onKeyInput(key) {
      if (key === '退格') {
        this.backspace()
        return
      }
      // 自动转大写
      const ch = key.toUpperCase()
      // 第2位（index=1）不允许 I O
      if (this.currentPos === 1 && (ch === 'I' || ch === 'O')) {
        uni.showToast({ title: '车牌第二位不含I和O', icon: 'none' })
        return
      }
      this.$set(this.plateChars, this.currentPos, ch)
      // 前进到下一位
      if (this.currentPos < this.maxLen - 1) {
        this.currentPos++
      }
      this.emitChange()
    },
    backspace() {
      if (this.plateChars.length > 0) {
        this.plateChars.splice(this.plateChars.length - 1, 1)
        this.currentPos = this.plateChars.length
      }
      this.emitChange()
    },
    clearPlate() {
      this.plateChars = []
      this.currentPos = 0
      this.emitChange()
    },
    toggleNewEnergy() {
      this.isNewEnergy = !this.isNewEnergy
    },
    getPlateStr() {
      return this.plateChars.join('')
    },
    emitChange() {
      const plateStr = this.getPlateStr()
      this.$emit('input', plateStr)
      this.$emit('change', plateStr)
    }
  }
}
</script>

<style scoped>
.plate-keyboard {
  background: #f5f6f8;
  border-radius: 12rpx;
  overflow: hidden;
}

/* 车牌展示区 */
.plate-display {
  background: #fff;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #eee;
}

.plate-slots {
  display: flex;
  justify-content: center;
  gap: 8rpx;
}

.plate-slot {
  width: 72rpx;
  height: 80rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.plate-slot.slot-active {
  border-color: #1890ff;
  background: #e6f7ff;
  box-shadow: 0 0 0 2rpx rgba(24, 144, 255, 0.2);
}

.plate-slot.slot-filled {
  background: #fff;
  border-color: #bbb;
}

.slot-char {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
}

.plate-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}

.new-energy-toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.toggle-check {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #ccc;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-check.checked {
  background: #1890ff;
  border-color: #1890ff;
}

.check-mark {
  color: #fff;
  font-size: 22rpx;
  font-weight: bold;
}

.toggle-label {
  font-size: 24rpx;
  color: #666;
}

.plate-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  font-size: 24rpx;
  color: #1890ff;
}

/* 键盘区 */
.keyboard-panel {
  padding: 12rpx 8rpx;
  background: #e8e8e8;
}

.kb-row {
  display: flex;
  justify-content: center;
  gap: 6rpx;
  margin-bottom: 6rpx;
}

.kb-key {
  min-width: 60rpx;
  height: 72rpx;
  background: #fff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.08);
}

.kb-key:active {
  background: #d0d0d0;
}

.kb-key.key-wide {
  min-width: 120rpx;
  background: #ddd;
}

.kb-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
</style>
