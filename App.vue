<script>
  import config from './config'
  import { getToken } from '@/utils/auth'
  import { bootstrapAuth } from '@/utils/authBootstrap'
  import { flushOfflineQueue, initOfflineQueue } from '@/utils/offlineQueue'
  import { hasPrivacyConsent } from '@/utils/privacy'

  export default {
    globalData: {
      config: null,
      // 每次冷启动允许检查一次功能更新，是否弹出由首页按已展示版本判断
      featureUpdateEligible: true
    },
    onLaunch: function() {
      this.globalData.featureUpdateEligible = true
      this.initApp()
      initOfflineQueue()
    },
    onShow: function() {
      flushOfflineQueue()
    },
    methods: {
      // 初始化应用
      initApp() {
        // 初始化应用配置
        this.initConfig()
        // #ifdef MP-WEIXIN
        this.wxAutoLogin()
        // #endif
        // #ifdef H5
        this.checkLogin()
        // #endif
      },
      initConfig() {
        this.globalData.config = config
      },
      // 微信小程序自动登录
      wxAutoLogin() {
        if (!hasPrivacyConsent()) {
          return
        }
        // The login page owns navigation; App only prepares shared auth state.
        bootstrapAuth().catch(() => {})
      },
      checkLogin() {
        if (!getToken() || !hasPrivacyConsent()) {
          this.$tab.reLaunch('/pages/login') 
        }
      }
    }
  }
</script>

<style lang="scss">
  @import '@/styles/index.scss'
</style>
