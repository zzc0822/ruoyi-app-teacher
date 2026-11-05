<template>
  <view class="normal-login-container">
    <view class="login-bg"></view>
    <view class="login-overlay"></view>
    
    <view class="login-card">
      <view class="logo-content">
        <image class="logo-img" :src="globalConfig.appInfo.logo" mode="widthFix"></image>
        <text class="title">智慧学工系统</text>
        <text class="subtitle">统一身份认证</text>
      </view>
      
      <view class="login-form-content">
        <!-- 账号登录表单 -->
        <view class="account-login-form">
          <view class="input-item">
            <view class="iconfont icon-user icon"></view>
            <input v-model="loginForm.username" class="input" type="text" placeholder="请输入账号（工号/手机号）" maxlength="30" />
          </view>
          <view class="input-item">
            <view class="iconfont icon-password icon"></view>
            <input v-model="loginForm.password" type="password" class="input" placeholder="请输入密码" maxlength="20" />
          </view>
          <!-- 非小程序环境显示验证码 -->
          <view class="code-row" v-if="captchaEnabled && !isWxEnv">
            <view class="input-item code-input">
              <view class="iconfont icon-code icon"></view>
              <input v-model="loginForm.code" type="number" class="input" placeholder="请输入验证码" maxlength="4" />
            </view>
            <image :src="codeUrl" @click="getCode" class="login-code-img"></image>
          </view>
        </view>
        
        <!-- 隐私协议自主选择 -->
        <view class="privacy-consent">
          <view class="consent-control">
            <checkbox-group class="consent-checkbox-group" @change="handlePrivacyConsentChange">
              <label class="consent-checkbox-label">
                <checkbox value="accepted" :checked="privacyAccepted" color="#2563eb" class="consent-checkbox" />
              </label>
            </checkbox-group>
            <view class="consent-copy">
              <text class="consent-text">我已阅读并同意</text>
              <text @click="handleUserAgrement" class="consent-link">《用户服务协议》</text>
              <text class="consent-text">和</text>
              <text @click="handlePrivacy" class="consent-link">《隐私政策》</text>
            </view>
          </view>
        </view>

        <!-- 登录按钮 -->
        <view class="action-area">
          <button @click="handleLogin" class="login-btn primary">{{ isWxEnv ? '绑定并登录' : '登录' }}</button>
          
          <!-- 微信小程序环境：显示一键登录按钮 -->
          <view class="wx-quick-login" v-if="isWxEnv">
            <view class="divider">
              <view class="divider-line"></view>
              <text class="divider-text">或</text>
              <view class="divider-line"></view>
            </view>
            <button
              v-if="privacyAccepted"
              open-type="getPhoneNumber" 
              @getphonenumber="handleGetPhoneNumber" 
              class="login-btn outline"
            >
              <text class="iconfont icon-phone btn-icon"></text>
              一键手机号登录
            </button>
            <button
              v-else
              @click="showPrivacyRequired"
              class="login-btn outline"
            >
              <text class="iconfont icon-phone btn-icon"></text>
              一键手机号登录
            </button>
          </view>
        </view>
        
        <!-- 底部链接 -->
        <view class="bottom-links">
          <view class="reg text-center" v-if="register">
            <text class="text-grey1">没有账号？</text>
            <text @click="handleUserRegister" class="text-blue">立即注册</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  import { getCodeImg } from '@/api/auth'
  import { getToken } from '@/utils/auth'
  import { bootstrapAuth } from '@/utils/authBootstrap'
  import { acceptPrivacyConsent, hasPrivacyConsent } from '@/utils/privacy'

  export default {
    data() {
      return {
        codeUrl: "",
        captchaEnabled: true,
        // 用户注册开关
        register: false,
        // 是否微信小程序环境
        isWxEnv: false,
        autoLoginPending: false,
        redirecting: false,
        privacyAccepted: hasPrivacyConsent(),
        globalConfig: getApp().globalData.config,
        // 登录表单
        loginForm: {
          username: "",
          password: "",
          code: "",
          uuid: ""
        }
      }
    },
    created() {
      // #ifndef MP-WEIXIN
      this.getCode()
      // #endif
    },
    onLoad() {
      // #ifdef MP-WEIXIN
      this.isWxEnv = true
      // #endif
      // #ifndef MP-WEIXIN
      if (getToken() && hasPrivacyConsent()) {
        uni.reLaunch({ url: '/pages/index' })
      }
      // #endif
    },
    onReady() {
      // #ifdef MP-WEIXIN
      this.tryWxAutoLogin()
      // #endif
    },
    methods: {
      // 尝试微信自动登录
      async tryWxAutoLogin() {
        if (!hasPrivacyConsent() || this.autoLoginPending || this.redirecting) {
          return
        }
        this.autoLoginPending = true
        this.$modal.loading("自动登录中...")
        try {
          await bootstrapAuth()
          this.$modal.closeLoading()
          await this.redirectAfterLogin()
        } catch (e) {
          this.$modal.closeLoading()
          // 微信未绑定，显示账号密码输入框让用户绑定
        } finally {
          this.autoLoginPending = false
        }
      },
      // 用户注册
      handleUserRegister() {
        this.$tab.redirectTo(`/pages/register`)
      },
      handlePrivacyConsentChange(e) {
        this.privacyAccepted = (e.detail.value || []).indexOf('accepted') !== -1
      },
      showPrivacyRequired() {
        this.$modal.msgError('请先阅读并勾选同意《用户服务协议》和《隐私政策》')
      },
      ensurePrivacyConsent() {
        if (!this.privacyAccepted) {
          this.showPrivacyRequired()
          return false
        }
        if (!acceptPrivacyConsent()) {
          this.$modal.msgError('隐私协议状态保存失败，请重试')
          return false
        }
        return true
      },
      // 隐私协议
      handlePrivacy() {
        let site = this.globalConfig.appInfo.agreements[0]
        this.$tab.navigateTo(site.path)
      },
      // 用户协议
      handleUserAgrement() {
        let site = this.globalConfig.appInfo.agreements[1]
        this.$tab.navigateTo(site.path)
      },
      // 获取图形验证码
      getCode() {
        getCodeImg().then(res => {
          this.captchaEnabled = res.captchaEnabled === undefined ? true : res.captchaEnabled
          if (this.captchaEnabled) {
            this.codeUrl = 'data:image/gif;base64,' + res.img
            this.loginForm.uuid = res.uuid
          }
        })
      },
      // 登录方法 — 区分环境
      async handleLogin() {
        if (!this.ensurePrivacyConsent()) {
          return
        }
        if (this.loginForm.username === "") {
          this.$modal.msgError("请输入账号")
        } else if (this.loginForm.password === "") {
          this.$modal.msgError("请输入密码")
        } else if (this.loginForm.code === "" && this.captchaEnabled && !this.isWxEnv) {
          this.$modal.msgError("请输入验证码")
        } else {
          this.$modal.loading("登录中，请耐心等待...")
          // #ifdef MP-WEIXIN
          this.wxBindLogin()
          // #endif
          // #ifndef MP-WEIXIN
          this.pwdLogin()
          // #endif
        }
      },
      // 微信绑定登录
      async wxBindLogin() {
        this.$store.dispatch('WxBind', this.loginForm).then(() => {
          this.$modal.closeLoading()
          this.loginSuccess()
        }).catch(() => {
          // 绑定失败
        })
      },
      // 密码登录
      async pwdLogin() {
        this.$store.dispatch('Login', this.loginForm).then(() => {
          this.$modal.closeLoading()
          this.loginSuccess()
        }).catch(() => {
          if (this.captchaEnabled) {
            this.getCode()
          }
        })
      },
      // 登录成功后，处理函数
      loginSuccess() {
        this.$store.dispatch('GetInfo').then(() => {
          this.$modal.closeLoading()
          this.redirectAfterLogin()
        }).catch(() => {
          
          // 统一提示“账号不存在”，不暴露具体原因
          this.$modal.msgError('账号不存在')
          // 延迟后关闭loading
          setTimeout(() => {
            this.$modal.closeLoading()
          }, 1500)
        })
      },
      async redirectAfterLogin() {
        if (this.redirecting) {
          return
        }
        this.redirecting = true
        try {
          // 清除旧的角色配置缓存（避免使用上一次的角色）
          uni.removeStorageSync('roleConfig')
          uni.removeStorageSync('userRoles')

          const { initRoleConfig, checkRealNameAuth } = await import('@/permission')
          const roleConfig = await initRoleConfig()
          const authStatus = await checkRealNameAuth()

          if (authStatus.needAuth) {
            this.$tab.reLaunch('/pages/auth/chooseIdentity')
          } else {
            const homePage = (roleConfig && roleConfig.homePage) || '/pages/index'
            this.$tab.reLaunch(homePage)
          }
        } catch (e) {
          this.redirecting = false
          this.$modal.closeLoading()
          this.$modal.msgError('登录成功，但页面跳转失败，请重试')
        }
      },
      
      // 获取手机号快捷登录
      handleGetPhoneNumber(e) {
        if (!this.ensurePrivacyConsent()) {
          return
        }
        if (e.detail.errMsg === 'getPhoneNumber:ok') {
          // 检查是否有code
          if (!e.detail.code) {
            this.$modal.msgError('获取手机号失败：未返回code')
            return
          }
          
          this.$modal.loading('登录中，请耐心等待...')
          
          // 先调用uni.login获取openid的code
          uni.login({
            provider: 'weixin',
            success: (loginRes) => {
              // 调用教师手机号绑定
              this.$store.dispatch('TeacherPhoneBind', {
                phoneCode: e.detail.code,  // 获取手机号的code
                loginCode: loginRes.code   // 获取openid的code
              }).then(() => {
                this.$modal.closeLoading()
                this.loginSuccess()
              }).catch((err) => {
                this.$modal.closeLoading()
                this.$modal.msgError(err || '教师手机号绑定失败，请检查手机号是否正确')
              })
            },
            fail: (err) => {
              this.$modal.closeLoading()
              this.$modal.msgError('获取微信会话失败，请重试')
            }
          })
        } else if (e.detail.errMsg === 'getPhoneNumber:fail user deny') {
          this.$modal.msgError('您已拒绝授权，请使用账号密码登录')
        } else {
          this.$modal.msgError('获取手机号失败：' + (e.detail.errMsg || '未知错误'))
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #0f172a;
  }

  .normal-login-container {
    position: relative;
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .login-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%);
    z-index: 0;
  }

  .login-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 20%, rgba(37, 99, 235, 0.25) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(124, 58, 237, 0.2) 0%, transparent 50%);
    z-index: 1;
  }

  .login-card {
    position: relative;
    z-index: 2;
    width: 84%;
    max-width: 640rpx;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 32rpx;
    padding: 60rpx 40rpx 50rpx;
    box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(12rpx);
  }

  .logo-content {
    text-align: center;
    margin-bottom: 50rpx;

    .logo-img {
      width: 120rpx;
      height: 120rpx;
      border-radius: 24rpx;
      margin-bottom: 24rpx;
    }

    .title {
      display: block;
      font-size: 42rpx;
      font-weight: bold;
      color: #1e293b;
      letter-spacing: 2rpx;
    }

    .subtitle {
      display: block;
      font-size: 26rpx;
      color: #64748b;
      margin-top: 12rpx;
    }
  }

  .login-form-content {
    .input-item {
      display: flex;
      align-items: center;
      background-color: #f1f5f9;
      height: 96rpx;
      border-radius: 48rpx;
      padding: 0 32rpx;
      margin-bottom: 28rpx;

      .icon {
        font-size: 40rpx;
        color: #64748b;
        margin-right: 20rpx;
      }

      .input {
        flex: 1;
        font-size: 30rpx;
        color: #1e293b;
        background: transparent;
      }
    }

    .code-row {
      display: flex;
      align-items: center;
      gap: 20rpx;
      margin-bottom: 28rpx;

      .code-input {
        flex: 1;
        margin-bottom: 0;
      }

      .login-code-img {
        width: 200rpx;
        height: 96rpx;
        border-radius: 24rpx;
      }
    }

    .action-area {
      margin-top: 40rpx;
    }

    .privacy-consent {
      margin-top: 28rpx;
      padding: 0 8rpx;
    }

    .consent-control {
      display: flex;
      align-items: flex-start;
    }

    .consent-checkbox-group {
      flex: 0 0 46rpx;
      width: 46rpx;
      min-height: 38rpx;
    }

    .consent-checkbox-label {
      display: flex;
      align-items: flex-start;
      min-height: 38rpx;
    }

    .consent-checkbox {
      margin-top: -4rpx;
      transform: scale(0.82);
      transform-origin: left top;
    }

    .consent-copy {
      flex: 1;
      font-size: 24rpx;
      line-height: 38rpx;
      color: #64748b;
    }

    .consent-link {
      color: #2563eb;
    }

    .login-btn {
      width: 100%;
      height: 96rpx;
      line-height: 96rpx;
      border-radius: 48rpx;
      font-size: 32rpx;
      font-weight: bold;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;

      &::after {
        border: none;
      }

      &.primary {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #fff;
        box-shadow: 0 12rpx 32rpx rgba(37, 99, 235, 0.35);
      }

      &.outline {
        background: #fff;
        color: #2563eb;
        border: 2rpx solid #2563eb;
      }

      .btn-icon {
        margin-right: 12rpx;
        font-size: 34rpx;
      }
    }

    .wx-quick-login {
      .divider {
        display: flex;
        align-items: center;
        margin: 36rpx 0;

        .divider-line {
          flex: 1;
          height: 1rpx;
          background-color: #e2e8f0;
        }

        .divider-text {
          padding: 0 24rpx;
          font-size: 24rpx;
          color: #94a3b8;
        }
      }
    }

    .bottom-links {
      margin-top: 40rpx;

      .reg {
        margin-bottom: 16rpx;
        font-size: 26rpx;
      }

      .text-blue {
        color: #2563eb;
      }

      .text-grey1 {
        color: #94a3b8;
      }
    }
  }
</style>
