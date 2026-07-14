<template>
  <view class="container">
    <!-- 搜索框 -->
    <view class="search-bar">
      <u-icon name="search" size="18" color="#909399"></u-icon>
      <input class="search-input" type="text" placeholder="搜索姓名/学号/工号/手机号" 
             :value="searchKeyword" @input="onSearchInput" confirm-type="search" />
      <u-icon v-if="searchKeyword" name="close-circle-fill" size="18" color="#c0c4cc" @click="clearSearch"></u-icon>
    </view>

    <!-- 书记角色：组织树 + 统计 + 党员列表 -->
    <view v-if="hasSecretary">
      <!-- 组织树卡片 -->
      <view class="org-card">
        <view class="org-card-header" @click="treeExpanded = !treeExpanded">
          <view class="org-header-left">
            <u-icon :name="treeExpanded ? 'arrow-down' : 'arrow-right'" size="16" color="#c62828"></u-icon>
            <text class="org-card-title">{{ branch.branchName || '组织机构' }}</text>
            <text class="org-card-type">{{ orgTypeLabel(branch.orgType) }}</text>
          </view>
          <text class="org-card-badge">{{ selectedBranchIds.length === 0 ? '未选' : (selectedBranchIds.length === 1 && selectedBranchIds.includes(Number(branch.branchId)) ? '全部' : '已选' + selectedBranchIds.length + '个') }}</text>
        </view>
        <view v-if="treeExpanded" class="org-tree-body">
          <view v-for="node in flatTreeNodes" :key="node.branchId"
                class="tree-node-wrapper" :style="{ paddingLeft: (node._level * 36 + 20) + 'rpx' }">
            <view class="tree-node-row">
              <view class="tree-node-left" @click="toggleBranchSelect(node.branchId)">
                <view :class="['tree-checkbox', isBranchSelected(node.branchId) ? 'checked' : '']">
                  <u-icon v-if="isBranchSelected(node.branchId)" name="checkmark" size="12" color="#fff"></u-icon>
                </view>
                <u-icon v-if="node._children && node._children.length > 0"
                        :name="node._expanded ? 'arrow-down' : 'arrow-right'" size="13" color="#909399" @click.stop="onTreeNodeClick(node)"></u-icon>
                <view v-else class="tree-leaf-spacer"></view>
                <text class="tree-label">{{ node.branchName }}</text>
              </view>
              <text class="tree-count">{{ branchMemberCount(node.branchId) }}人</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 统计卡片 -->
      <view class="overview-card">
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-num">{{ computedStats.total }}</text>
            <text class="stat-label">总人数</text>
          </view>
          <view class="stat-item">
            <text class="stat-num blue">{{ computedStats.stageCounts.FORMAL || 0 }}</text>
            <text class="stat-label">正式党员</text>
          </view>
          <view class="stat-item">
            <text class="stat-num orange">{{ computedStats.stageCounts.PROBATIONARY || 0 }}</text>
            <text class="stat-label">预备党员</text>
          </view>
          <view class="stat-item">
            <text class="stat-num green">{{ (computedStats.stageCounts.ACTIVIST || 0) + (computedStats.stageCounts.TARGET || 0) + (computedStats.stageCounts.APPLICANT || 0) }}</text>
            <text class="stat-label">发展中</text>
          </view>
        </view>
      </view>

      <!-- 阶段筛选 -->
      <view class="filter-bar">
        <view :class="['filter-item', currentStage === '' ? 'active' : '']" @click="filterBy('')">全部</view>
        <view :class="['filter-item', currentStage === 'APPLICANT' ? 'active' : '']" @click="filterBy('APPLICANT')">申请人</view>
        <view :class="['filter-item', currentStage === 'ACTIVIST' ? 'active' : '']" @click="filterBy('ACTIVIST')">积极分子</view>
        <view :class="['filter-item', currentStage === 'TARGET' ? 'active' : '']" @click="filterBy('TARGET')">发展对象</view>
        <view :class="['filter-item', currentStage === 'PROBATIONARY' ? 'active' : '']" @click="filterBy('PROBATIONARY')">预备党员</view>
        <view :class="['filter-item', currentStage === 'FORMAL' ? 'active' : '']" @click="filterBy('FORMAL')">正式党员</view>
      </view>

      <!-- 统计栏 -->
      <view class="summary-bar" v-if="filteredList.length > 0">
        <text class="summary-text">共 {{ filteredList.length }} 人</text>
        <text class="summary-text">学生 {{ studentCount }} 人</text>
        <text class="summary-text">教师 {{ teacherCount }} 人</text>
      </view>

      <!-- 党员列表 -->
      <view v-if="filteredList.length === 0" class="empty-card">
        <u-icon name="info-circle" size="40" color="#c0c4cc"></u-icon>
        <text class="empty-text">暂无数据</text>
      </view>
      <view v-for="item in filteredList" :key="item.memberId" class="member-card" @click="viewDetail(item.memberId)">
        <!-- 第一行：姓名 + 工号/学号 + 阶段 -->
        <view class="row-main">
          <text class="member-name">{{ item.memberName || item.studentName || item.xh }}</text>
          <text class="xh-text">{{ item.memberType === 'teacher' ? '工号' : '学号' }}：{{ item.xh }}</text>
          <text class="stage-tag" :class="'stage-' + item.currentStage">{{ stageLabel(item.currentStage) }}</text>
        </view>
        <!-- 第二行：档案号 + 电话 + 支部 + 最近党费 -->
        <view class="row-sub">
          <text class="meta" v-if="item.archiveNo">档案：{{ item.archiveNo }}</text>
          <text class="meta" v-if="item.phone">电话：{{ item.phone }}</text>
          <text class="meta" v-if="item.branchName">支部：{{ item.branchName }}</text>
          <text class="meta" v-if="item.lastFeeDate">党费：{{ item.lastFeeDate.substring(0, 10) }}</text>
        </view>
      </view>
    </view>

    <!-- 辅导员角色：学生入党统计区块 -->
    <view v-if="hasCounselor">
      <view class="overview-card counselor">
        <view class="overview-header">
          <text class="overview-title">{{ hasSecretary ? '学生入党情况' : '我所带学生入党情况' }}</text>
        </view>
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-num">{{ counselorTotal }}</text>
            <text class="stat-label">入党总人数</text>
          </view>
          <view class="stat-item">
            <text class="stat-num blue">{{ counselorStageCounts.FORMAL || 0 }}</text>
            <text class="stat-label">正式党员</text>
          </view>
          <view class="stat-item">
            <text class="stat-num orange">{{ counselorStageCounts.PROBATIONARY || 0 }}</text>
            <text class="stat-label">预备党员</text>
          </view>
          <view class="stat-item">
            <text class="stat-num green">{{ (counselorStageCounts.ACTIVIST || 0) + (counselorStageCounts.TARGET || 0) + (counselorStageCounts.APPLICANT || 0) }}</text>
            <text class="stat-label">发展中</text>
          </view>
        </view>
      </view>

      <view class="menu-section">
        <text class="section-title">学生入党情况</text>
        <view class="menu-list">
          <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=&mode=counselor')">
            <view class="menu-left">
              <u-icon name="account" size="22" color="#409EFF"></u-icon>
              <text class="menu-name">全部</text>
            </view>
            <view class="menu-right">
              <text class="menu-count">{{ counselorTotal }}人</text>
              <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
            </view>
          </view>
          <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=FORMAL&mode=counselor')">
            <view class="menu-left">
              <u-icon name="checkmark-circle" size="22" color="#67C23A"></u-icon>
              <text class="menu-name">正式党员</text>
            </view>
            <view class="menu-right">
              <text class="menu-count">{{ counselorStageCounts.FORMAL || 0 }}人</text>
              <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
            </view>
          </view>
          <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=PROBATIONARY&mode=counselor')">
            <view class="menu-left">
              <u-icon name="warning" size="22" color="#F56C6C"></u-icon>
              <text class="menu-name">预备党员</text>
            </view>
            <view class="menu-right">
              <text class="menu-count">{{ counselorStageCounts.PROBATIONARY || 0 }}人</text>
              <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
            </view>
          </view>
          <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=ACTIVIST&mode=counselor')">
            <view class="menu-left">
              <u-icon name="list" size="22" color="#E6A23C"></u-icon>
              <text class="menu-name">积极分子</text>
            </view>
            <view class="menu-right">
              <text class="menu-count">{{ counselorStageCounts.ACTIVIST || 0 }}人</text>
              <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
            </view>
          </view>
          <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=TARGET&mode=counselor')">
            <view class="menu-left">
              <u-icon name="star" size="22" color="#E6A23C"></u-icon>
              <text class="menu-name">发展对象</text>
            </view>
            <view class="menu-right">
              <text class="menu-count">{{ counselorStageCounts.TARGET || 0 }}人</text>
              <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
            </view>
          </view>
          <view class="menu-item" @click="goTo('/pages/sub-work/party/members?stage=APPLICANT&mode=counselor')">
            <view class="menu-left">
              <u-icon name="edit-pen" size="22" color="#909399"></u-icon>
              <text class="menu-name">入党申请人</text>
            </view>
            <view class="menu-right">
              <text class="menu-count">{{ counselorStageCounts.APPLICANT || 0 }}人</text>
              <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的党务入口 -->
    <view v-if="hasSecretary || hasCounselor" class="menu-section">
      <view class="menu-list">
        <view class="menu-item" @click="goTo('/pages/sub-mine/party/index')">
          <view class="menu-left">
            <u-icon name="star" size="22" color="#c62828"></u-icon>
            <text class="menu-name">我的党务</text>
          </view>
          <view class="menu-right">
            <text class="menu-count">个人档案</text>
            <u-icon name="arrow-right" size="16" color="#c0c4cc"></u-icon>
          </view>
        </view>
      </view>
    </view>

    <!-- 无角色提示 -->
    <view v-if="!hasSecretary && !hasCounselor && !loading" class="empty-card">
      <u-icon name="info-circle" size="60" color="#909399"></u-icon>
      <text class="empty-text">暂无党务管理权限</text>
      <text class="empty-tip">您未担任支部书记或辅导员</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="empty-card">
      <u-loading-icon size="40"></u-loading-icon>
      <text class="empty-text">加载中...</text>
    </view>
  </view>
</template>

<script>
import partyApi from '@/api/party/party'
import { isSecretary, isCounselor } from '@/utils/role'

export default {
  data() {
    return {
      loading: true,
      hasSecretary: false,
      hasCounselor: false,
      // 书记数据
      branch: {},
      allMembers: [],
      childBranches: [],
      selectedBranchIds: [],
      searchKeyword: '',
      currentStage: '',
      treeNodes: [],
      expandedKeys: {},
      treeExpanded: true,
      // 辅导员数据
      counselorTotal: 0,
      counselorStageCounts: {}
    }
  },
  computed: {
    flatTreeNodes() {
      return this.flattenTree(this.treeNodes)
    },
    computedStats() {
      let members = this.allMembers
      if (this.selectedBranchIds.length > 0) {
        const selectedIds = new Set()
        this.selectedBranchIds.forEach(id => {
          this.getDescendantBranchIds(Number(id)).forEach(did => selectedIds.add(did))
        })
        members = members.filter(m => selectedIds.has(Number(m.branchId)))
      }
      const counts = {}
      members.forEach(m => {
        if (m.currentStage) counts[m.currentStage] = (counts[m.currentStage] || 0) + 1
      })
      return { total: members.length, stageCounts: counts }
    },
    filteredList() {
      let list = this.allMembers
      // 支部筛选
      if (this.selectedBranchIds.length > 0) {
        const selectedIds = new Set()
        this.selectedBranchIds.forEach(id => {
          this.getDescendantBranchIds(Number(id)).forEach(did => selectedIds.add(did))
        })
        list = list.filter(m => selectedIds.has(Number(m.branchId)))
      }
      // 阶段筛选
      if (this.currentStage) {
        list = list.filter(m => m.currentStage === this.currentStage)
      }
      // 搜索筛选
      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase()
        list = list.filter(item => {
          const name = (item.memberName || item.studentName || '').toLowerCase()
          const xh = (item.xh || '').toLowerCase()
          const phone = (item.phone || '').toLowerCase()
          return name.includes(kw) || xh.includes(kw) || phone.includes(kw)
        })
      }
      return list
    },
    studentCount() {
      return this.filteredList.filter(i => i.memberType === 'student').length
    },
    teacherCount() {
      return this.filteredList.filter(i => i.memberType === 'teacher').length
    }
  },
  onShow() { this.loadData() },
  methods: {
    orgTypeLabel(t) { return { '1': '党委', '2': '党总支', '3': '党支部' }[t] || '—' },
    async loadData() {
      this.loading = true
      const roles = this.$store.getters.roles || []
      this.hasSecretary = false
      this.hasCounselor = false

      const promises = []

      if (isSecretary(roles)) {
        promises.push(this.loadSecretaryData())
      }
      if (isCounselor(roles)) {
        promises.push(this.loadCounselorData())
      }

      await Promise.all(promises)
      this.loading = false
    },
    async loadSecretaryData() {
      try {
        const res = await partyApi.branchStats()
        const data = res.data || {}
        if (data.branch) {
          this.hasSecretary = true
          this.branch = data.branch
          await Promise.all([
            this.loadChildBranches(),
            this.loadAllMembers()
          ])
          // 默认选中根节点
          const rootId = Number(this.branch.branchId)
          if (!this.selectedBranchIds.includes(rootId)) {
            this.selectedBranchIds = [rootId]
          }
        }
      } catch (e) {}
    },
    loadAllMembers() {
      return partyApi.branchMembers({}).then(res => {
        const list = res.data || []
        this.allMembers = list.map(m => ({ ...m, branchId: Number(m.branchId) }))
      }).catch(() => {})
    },
    loadChildBranches() {
      return partyApi.childBranches().then(res => {
        const list = res.data || []
        this.childBranches = list.map(b => ({ ...b, branchId: Number(b.branchId), parentId: b.parentId != null ? Number(b.parentId) : null }))
        this.buildTree()
      }).catch(() => {})
    },
    buildTree() {
      const list = this.childBranches
      const rootId = this.branch ? Number(this.branch.branchId) : null
      const buildNode = (item, level) => {
        const children = list.filter(b => Number(b.parentId) === Number(item.branchId) && Number(b.branchId) !== Number(item.branchId))
        const expanded = this.expandedKeys[item.branchId] === true
        return {
          ...item,
          _level: level,
          _expanded: expanded,
          _children: children.map(c => buildNode(c, level + 1))
        }
      }
      const nodes = []
      // 添加"全部"节点代表根节点（根节点名称已在标题展示，这里用"全部"避免重复）
      if (rootId) {
        const root = list.find(b => Number(b.branchId) === rootId)
        if (root) {
          nodes.push(buildNode({ ...root, branchName: '全部' }, 0))
        }
      }
      // 添加根节点的直接子节点
      list.forEach(item => {
        if (Number(item.branchId) === rootId) return
        if (Number(item.parentId) === rootId) {
          nodes.push(buildNode(item, 0))
        }
      })
      this.treeNodes = nodes
    },
    branchMemberCount(branchId) {
      const bid = Number(branchId)
      const ids = this.getDescendantBranchIds(bid)
      return this.allMembers.filter(m => ids.includes(Number(m.branchId))).length
    },
    flattenTree(nodes, result = []) {
      for (const node of nodes) {
        result.push(node)
        if (node._expanded && node._children && node._children.length > 0) {
          this.flattenTree(node._children, result)
        }
      }
      return result
    },
    onTreeNodeClick(node) {
      if (node._children && node._children.length > 0) {
        this.expandedKeys[node.branchId] = !node._expanded
        this.buildTree()
      }
    },
    isBranchSelected(branchId) {
      return this.selectedBranchIds.includes(branchId)
    },
    toggleBranchSelect(branchId) {
      const idx = this.selectedBranchIds.indexOf(branchId)
      if (idx >= 0) {
        this.selectedBranchIds.splice(idx, 1)
      } else {
        this.selectedBranchIds.push(branchId)
      }
    },
    getDescendantBranchIds(branchId) {
      const bid = Number(branchId)
      const ids = [bid]
      const children = this.childBranches.filter(b => Number(b.parentId) === bid)
      children.forEach(c => {
        ids.push(...this.getDescendantBranchIds(Number(c.branchId)))
      })
      return ids
    },
    stageLabel(code) {
      return { APPLICANT: '入党申请人', ACTIVIST: '积极分子', TARGET: '发展对象', PROBATIONARY: '预备党员', FORMAL: '正式党员' }[code] || code
    },
    filterBy(stage) {
      this.currentStage = stage
    },
    onSearchInput(e) {
      this.searchKeyword = e.detail.value || ''
    },
    clearSearch() {
      this.searchKeyword = ''
    },
    viewDetail(memberId) {
      uni.navigateTo({ url: '/pages/sub-work/party/memberDetail?id=' + memberId })
    },
    loadCounselorData() {
      return partyApi.counselorStats().then(res => {
        const data = res.data || {}
        if (data.hasStudents) {
          this.hasCounselor = true
          this.counselorTotal = data.totalMembers || 0
          this.counselorStageCounts = {}
          const stats = data.stageStats || []
          stats.forEach(s => { this.counselorStageCounts[s.stage] = s.count })
        }
      }).catch(() => {})
    },
    goTo(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.empty-card { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-text { margin-top: 20rpx; color: #909399; font-size: 28rpx; }
.empty-tip { margin-top: 12rpx; color: #c0c4cc; font-size: 24rpx; }

.overview-card { background: linear-gradient(135deg, #c62828, #e53935); border-radius: 16rpx; padding: 30rpx; margin-bottom: 24rpx; color: #fff; box-shadow: 0 4rpx 16rpx rgba(198,40,40,0.3); }
.overview-card.counselor { background: linear-gradient(135deg, #1565c0, #1e88e5); box-shadow: 0 4rpx 16rpx rgba(21,101,192,0.3); }
.overview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.overview-title { font-size: 34rpx; font-weight: bold; }
.overview-type { font-size: 24rpx; background: rgba(255,255,255,0.2); padding: 4rpx 16rpx; border-radius: 12rpx; }

.stats-grid { display: flex; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 40rpx; font-weight: bold; color: #fff; }
.stat-num.blue { color: #bbdefb; }
.stat-num.orange { color: #ffe0b2; }
.stat-num.green { color: #c8e6c9; }
.stat-label { font-size: 22rpx; opacity: 0.8; margin-top: 6rpx; }

/* 搜索框 */
.search-bar { display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 16rpx 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.search-input { flex: 1; margin: 0 16rpx; font-size: 28rpx; color: #303133; }

/* 组织树卡片 */
.org-card { background: #fff; border-radius: 12rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); overflow: hidden; }
.org-card-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; }
.org-header-left { display: flex; align-items: center; }
.org-card-title { font-size: 30rpx; font-weight: bold; color: #c62828; margin-left: 12rpx; }
.org-card-type { font-size: 22rpx; color: #fff; background: #c62828; padding: 2rpx 12rpx; border-radius: 10rpx; margin-left: 12rpx; }
.org-card-badge { font-size: 22rpx; color: #fff; background: #c62828; padding: 4rpx 16rpx; border-radius: 16rpx; }
.org-tree-body { padding: 0 20rpx 20rpx; max-height: 600rpx; overflow-y: auto; }
.tree-node-wrapper { display: flex; align-items: center; }
.tree-node-row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 12rpx; border-bottom: 1rpx solid #f5f5f5; }
.tree-node-left { display: flex; align-items: center; flex: 1; }
.tree-leaf-spacer { width: 14rpx; display: inline-block; }
.tree-label { font-size: 26rpx; color: #303133; margin-left: 8rpx; }
.tree-count { font-size: 22rpx; color: #909399; }
.tree-checkbox { width: 36rpx; height: 36rpx; border: 2rpx solid #dcdfe6; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; }
.tree-checkbox.checked { background: #c62828; border-color: #c62828; }

.menu-section { margin-top: 10rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #303133; margin-bottom: 16rpx; display: block; padding-left: 10rpx; }
.menu-list { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 30rpx; border-bottom: 1rpx solid #f5f5f5; }
.menu-item:last-child { border-bottom: none; }
.menu-left { display: flex; align-items: center; }
.menu-name { margin-left: 16rpx; font-size: 28rpx; color: #303133; }
.menu-right { display: flex; align-items: center; }
.menu-count { margin-right: 10rpx; font-size: 26rpx; color: #909399; }

/* 阶段筛选 */
.filter-bar { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; background: #fff; border-radius: 12rpx; padding: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.filter-item { padding: 10rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; color: #606266; background: #f0f2f5; }
.filter-item.active { background: #c62828; color: #fff; }

/* 统计栏 */
.summary-bar { display: flex; gap: 20rpx; margin-bottom: 16rpx; padding: 0 8rpx; }
.summary-text { font-size: 24rpx; color: #909399; }

/* 党员卡片 */
.member-card { background: #fff; border-radius: 8rpx; padding: 16rpx 20rpx; margin-bottom: 8rpx; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.03); }
.row-main { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.member-name { font-size: 28rpx; font-weight: bold; color: #303133; flex-shrink: 0; }
.xh-text { font-size: 24rpx; color: #606266; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage-tag { padding: 2rpx 12rpx; border-radius: 12rpx; font-size: 20rpx; color: #fff; flex-shrink: 0; }
.stage-APPLICANT { background: #909399; }
.stage-ACTIVIST { background: #409EFF; }
.stage-TARGET { background: #E6A23C; }
.stage-PROBATIONARY { background: #F56C6C; }
.stage-FORMAL { background: #67C23A; }
.row-sub { display: flex; flex-wrap: wrap; gap: 16rpx; }
.meta { font-size: 22rpx; color: #909399; }
</style>
