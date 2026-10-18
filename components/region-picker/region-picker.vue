<template>
  <view class="region-picker">
    <picker mode="multiSelector" :range="columnNames" :value="picked" :disabled="!ready || disabled"
      @columnchange="onColumnChange" @change="onConfirm">
      <view class="rp-field">
        <text :class="regionText ? 'rp-value' : 'rp-ph'">{{ regionText || placeholder }}</text>
        <text class="rp-arrow">›</text>
      </view>
    </picker>
    <input class="rp-field rp-detail" :value="detail" :placeholder="detailPlaceholder"
      placeholder-class="rp-ph" :disabled="disabled" @blur="onDetailBlur" />
    <text v-if="unresolved" class="rp-tip">原地址未能识别出省市，已保留在上方，请重选地区</text>
  </view>
</template>

<script>
import request from '@/utils/request'

const STORAGE_KEY = 'sys_region_tree_v1'
// 区划是只读参照数据：整个应用共用一棵树，命中缓存后连接口都不用发
let sharedTree = null
let sharedPromise = null

function loadTree() {
  if (sharedTree && sharedTree.length) return Promise.resolve(sharedTree)
  if (!sharedPromise) {
    let cached = null
    try {
      cached = uni.getStorageSync(STORAGE_KEY)
    } catch (e) {
      cached = null
    }
    if (cached) {
      sharedTree = typeof cached === 'string' ? JSON.parse(cached) : cached
      return Promise.resolve(sharedTree)
    }
    sharedPromise = request({ url: '/system/region/treeselect', method: 'get' })
      .then(res => {
        sharedTree = (res && res.data) || []
        if (sharedTree.length) {
          try {
            uni.setStorageSync(STORAGE_KEY, JSON.stringify(sharedTree))
          } catch (e) {
            // 超出小程序单键上限就只留内存态，下次进页面重新拉
          }
        }
        return sharedTree
      })
      .catch(() => {
        sharedPromise = null
        return []
      })
  }
  return sharedPromise
}

export default {
  name: 'RegionPicker',
  props: {
    // 与后台 RegionCascader 同一套存储口径：「省/市/区县」+ 门牌详址拼成一串存原字段
    value: { type: String, default: '' },
    placeholder: { type: String, default: '选择省 / 市 / 区县' },
    detailPlaceholder: { type: String, default: '街道、门牌号（选填）' },
    defaultProvince: { type: String, default: '' },
    minLevel: { type: Number, default: 2 },
    disabled: { type: Boolean, default: false }
  },
  data() {
    return {
      tree: [],
      cols: [[], [], []].map(() => [{ code: '', name: '—' }]),
      picked: [0, 0, 0],
      regionNodes: [],
      detail: '',
      unresolved: '',
      ready: false,
      selfEmit: false
    }
  },
  computed: {
    columnNames() {
      return this.cols.map(list => list.map(n => n.name))
    },
    regionText() {
      return this.namesOf(this.regionNodes).join('/')
    }
  },
  watch: {
    value() {
      // 自己 emit 出去的值不再回解析：拼出去的串里详址粘在区县后面，再拆一遍会拆出自家的脏值
      if (this.selfEmit) {
        this.selfEmit = false
        return
      }
      this.applyValue(this.value)
    }
  },
  created() {
    loadTree().then(tree => {
      this.tree = tree || []
      this.ready = true
      this.applyValue(this.value)
    })
  },
  methods: {
    pad(list) {
      return list && list.length ? list : [{ code: '', name: '—' }]
    },
    stripSuffix(name) {
      return String(name).replace(/(特别行政区|自治区|自治州|地区|省|市|区|县|盟|旗)$/, '')
    },
    // 整串吃掉前缀：区划名后面粘着门牌号（南山区科技园南路12号）也算命中
    matchOne(list, text) {
      if (!list || !text) return null
      const exact = list.find(n => n.name === text)
      if (exact) return { node: exact, rest: '' }
      const byName = list.filter(n => n.name && text.indexOf(n.name) === 0)
        .sort((a, b) => b.name.length - a.name.length)[0]
      if (byName) return { node: byName, rest: text.slice(byName.name.length) }
      const shorts = list.map(n => ({ node: n, short: this.stripSuffix(n.name) }))
        .filter(x => x.short.length >= 2 && text.indexOf(x.short) === 0)
        .sort((a, b) => b.short.length - a.short.length)[0]
      if (shorts) return { node: shorts.node, rest: text.slice(shorts.short.length) }
      return null
    },
    // 去掉分隔符后逐级前缀下钻，剩下的残留即详址
    pathOf(raw) {
      let rest = String(raw || '').replace(/\//g, '')
      const path = []
      let level = this.tree
      for (let i = 0; i < 3 && rest; i++) {
        const hit = this.matchOne(level, rest)
        if (hit) {
          path.push(hit.node)
          level = hit.node.children || []
          rest = hit.rest
          continue
        }
        if (!i) {
          // 省名压根没写的老数据（「端州区水印蓝山」「深圳南山区xx」）：按市名/县名全国扫
          const globalHit = this.findGlobally(rest)
          if (globalHit) {
            path.push(...globalHit.path)
            level = path[path.length - 1].children || []
            rest = globalHit.rest
            continue
          }
          break
        }
        // 海南/湖北的市挂在「省直辖县级行政区划」这类空壳层级的下一层，本级配不上就下探一级
        const deep = path.length && path.length < 3 ? this.findDeeper(level, rest) : null
        if (!deep) break
        path.push(deep.parent, deep.node)
        level = deep.node.children || []
        rest = deep.rest
      }
      return { path, rest }
    },
    findGlobally(text) {
      const hits = []
      for (const province of this.tree) {
        const city = this.matchOne(province.children, text)
        if (city) {
          hits.push({ path: [province, city.node], rest: city.rest })
          // 市名与辖县同根（安阳市/安阳县）时市层会吃掉前缀剩个「县」，下面整串吃干净的才是本意
          const sub = this.matchOne(city.node.children, text)
          if (sub && !sub.rest) hits.push({ path: [province, city.node, sub.node], rest: '' })
          continue
        }
        for (const c of province.children || []) {
          const district = this.matchOne(c.children, text)
          if (district) hits.push({ path: [province, c, district.node], rest: district.rest })
        }
      }
      // 「深圳南山区」会顺手撞上鹤岗市的南山区：只认挂在文本开头的那个，撞名才算真歧义
      const anchored = hits.filter(h => this.anchorAt(text, h.path[h.path.length - 1]) === 0)
      const pool = anchored.length ? anchored : hits
      const rank = h => (h.rest ? 10 : 0) - h.path.length
      const best = pool.slice().sort((a, b) => rank(a) - rank(b))[0]
      if (!best) return null
      const tied = pool.filter(h => rank(h) === rank(best))
      const distinct = new Set(tied.map(h => h.path.map(n => n.code).join('>')))
      return distinct.size === 1 ? tied[0] : null
    },
    anchorAt(text, node) {
      const at = text.indexOf(node.name)
      if (at >= 0) return at
      const short = this.stripSuffix(node.name)
      return short.length >= 2 ? text.indexOf(short) : -1
    },
    findDeeper(nodes, text) {
      let loose = null
      for (const parent of nodes || []) {
        const hit = this.matchOne(parent.children, text)
        if (!hit) continue
        if (!hit.rest) return { parent, node: hit.node, rest: '' }
        if (!loose) loose = { parent, node: hit.node, rest: hit.rest }
      }
      return loose
    },
    // 按节点路径摆好三列滚轮的初始位置
    locate(path) {
      let level = this.tree
      const cols = [[], [], []]
      const idx = [0, 0, 0]
      for (let i = 0; i < 3; i++) {
        cols[i] = this.pad(level)
        const want = path[i]
        const at = want ? cols[i].findIndex(n => n.code === want.code) : -1
        idx[i] = at >= 0 ? at : 0
        level = cols[i][idx[i]].children || []
      }
      this.cols = cols
      this.picked = idx
    },
    applyValue(raw) {
      if (!this.ready) return
      const text = String(raw || '').trim()
      if (!text) {
        this.regionNodes = []
        this.detail = ''
        this.unresolved = ''
        this.locate(this.defaultPath())
        return
      }
      const { path, rest } = this.pathOf(text)
      this.regionNodes = path
      this.detail = path.length ? rest : text
      // 区划树没拉下来（接口未发布/断网）就没法重选，别报脏
      this.unresolved = this.tree.length && path.length < this.minLevel ? text : ''
      this.locate(path.length ? path : this.defaultPath())
    },
    // 空值时滚轮停在默认省（学校在广东，省内请假/外宿占绝大多数），但不往字段里写
    defaultPath() {
      if (!this.defaultProvince || !this.tree.length) return []
      const hit = this.matchOne(this.tree, this.defaultProvince)
      return hit ? [hit.node] : []
    },
    onColumnChange(e) {
      const { column, value } = e.detail
      const cols = this.cols.slice()
      const idx = this.picked.slice()
      idx[column] = value
      let level = (cols[column][value] || {}).children || []
      for (let i = column + 1; i < 3; i++) {
        cols[i] = this.pad(level)
        idx[i] = 0
        level = cols[i][0].children || []
      }
      this.cols = cols
      this.picked = idx
    },
    nodesFromPicked() {
      const out = []
      for (let i = 0; i < 3; i++) {
        const node = this.cols[i][this.picked[i]]
        if (!node || !node.code) break
        out.push(node)
      }
      return out
    },
    // 「海南省省直辖县级行政区划」是 GB 码里的空壳层级，不是地名，别存进业务串
    namesOf(nodes) {
      return nodes.map(n => n.name).filter(n => !/直辖县级行政区划$/.test(n))
    },
    onConfirm(e) {
      const idx = (e.detail.value || []).slice()
      const cols = this.cols.slice()
      let level = this.tree
      for (let i = 0; i < 3; i++) {
        cols[i] = this.pad(level)
        idx[i] = Math.min(Math.max(idx[i] || 0, 0), cols[i].length - 1)
        level = cols[i][idx[i]].children || []
      }
      this.cols = cols
      this.picked = idx
      const nodes = this.nodesFromPicked()
      if (nodes.length < this.minLevel) {
        uni.showToast({ title: `至少要选到${this.minLevel === 2 ? '市' : '区县'}`, icon: 'none' })
        return
      }
      this.regionNodes = nodes
      this.unresolved = ''
      this.commit()
    },
    onDetailBlur(e) {
      this.detail = (e.detail && e.detail.value) || ''
      this.commit()
    },
    commit() {
      // 一个区划都没认出过就只存详址，等价于原来的自由文本，不硬凑半截串
      const joined = this.namesOf(this.regionNodes).join('/') + (this.detail || '')
      this.selfEmit = true
      this.$emit('input', joined)
      this.$emit('change', joined)
    }
  }
}
</script>

<style lang="scss" scoped>
.region-picker {
  width: 100%;
}
.rp-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 20rpx 24rpx;
  min-height: 72rpx;
  line-height: 72rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #333;
}
.rp-detail {
  margin-top: 12rpx;
}
.rp-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rp-ph {
  color: #999;
}
.rp-arrow {
  font-size: 20rpx;
  color: #999;
  margin-left: 12rpx;
}
.rp-tip {
  display: block;
  font-size: 22rpx;
  color: #e6a23c;
  line-height: 1.5;
  margin-top: 8rpx;
}
</style>
