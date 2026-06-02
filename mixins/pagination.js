/**
 * 分页加载混入
 * 为列表页提供统一的分页加载、上拉加载更多、下拉刷新功能
 * 
 * 使用方式：
 * 1. 在页面中引入：import paginationMixin from '@/mixins/pagination'
 * 2. 混入：mixins: [paginationMixin]
 * 3. 实现 loadData 方法
 */

export default {
  data() {
    return {
      // 分页参数
      pageNum: 1,
      pageSize: 20,
      total: 0,
      
      // 列表数据
      list: [],
      
      // 加载状态
      loading: false,
      loadStatus: 'more', // more | loading | noMore
      
      // 刷新状态
      refreshing: false
    }
  },
  
  methods: {
    /**
     * 加载数据（子类必须实现）
     * 返回 Promise，resolve 数据列表和总数
     */
    loadData() {
      throw new Error('必须实现 loadData 方法')
    },
    
    /**
     * 刷新列表（重置到第一页）
     */
    async refresh() {
      if (this.loading) return
      
      this.pageNum = 1
      this.list = []
      this.loadStatus = 'loading'
      this.loading = true
      
      try {
        const { list, total } = await this.loadData()
        this.list = list || []
        this.total = total || 0
        
        // 判断是否还有更多数据
        if (this.list.length >= this.total) {
          this.loadStatus = 'noMore'
        } else {
          this.loadStatus = 'more'
        }
      } catch (error) {
        console.error('加载数据失败:', error)
        this.loadStatus = 'more'
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 加载更多（上拉加载）
     */
    async loadMore() {
      // 如果正在加载或没有更多数据，不执行
      if (this.loading || this.loadStatus === 'noMore') {
        return
      }
      
      this.loadStatus = 'loading'
      this.loading = true
      this.pageNum++
      
      try {
        const { list, total } = await this.loadData()
        const newList = list || []
        
        // 追加数据
        this.list = this.list.concat(newList)
        this.total = total || 0
        
        // 判断是否还有更多数据
        if (this.list.length >= this.total) {
          this.loadStatus = 'noMore'
        } else {
          this.loadStatus = 'more'
        }
      } catch (error) {
        console.error('加载更多失败:', error)
        this.pageNum-- // 回退页码
        this.loadStatus = 'more'
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 下拉刷新
     */
    async onPullDownRefresh() {
      this.refreshing = true
      await this.refresh()
      this.refreshing = false
      uni.stopPullDownRefresh()
    }
  }
}
