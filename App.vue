<script>
  import config from './config'
  import { getToken } from '@/utils/auth'
  import store from './store'

  export default {
    onLaunch: function() {
      this.initApp()
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
        if (!getToken()) {
          store.dispatch('WxLogin').then(() => {
            store.dispatch('GetInfo')
          }).catch(() => {
            // 未绑定，跳转登录页进行账号绑定
            uni.reLaunch({ url: '/pages/login' })
          })
        }
      },
      checkLogin() {
        if (!getToken()) {
          this.$tab.reLaunch('/pages/login') 
        }
      }
    }
  }
</script>

<style lang="scss">
  @import '@/static/scss/index.scss'
</style>
