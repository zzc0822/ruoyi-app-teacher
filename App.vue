<script>
  import config from './config'
  import { getToken } from '@/utils/auth'
  import store from './store'
  import { flushOfflineQueue, initOfflineQueue } from '@/utils/offlineQueue'

  export default {
    onLaunch: function() {
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
        const ensureUserInfo = () => {
          store.dispatch('GetInfo').catch(() => {
            // GetInfo 失败（token 过期等），尝试微信重新登录
            store.dispatch('WxLogin').then(() => {
              store.dispatch('GetInfo')
            }).catch(() => {
              // 未绑定，跳转登录页进行账号绑定
              uni.reLaunch({ url: '/pages/login' })
            })
          })
        }
        if (!getToken()) {
          // 无 token，先微信静默登录获取 token
          store.dispatch('WxLogin').then(() => {
            store.dispatch('GetInfo')
          }).catch(() => {
            // 未绑定，跳转登录页进行账号绑定
            uni.reLaunch({ url: '/pages/login' })
          })
        } else {
          // 已有 token，仍需获取用户信息（roles/permissions/name 等）
          ensureUserInfo()
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
