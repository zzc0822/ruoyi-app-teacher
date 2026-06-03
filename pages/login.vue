<template>
  <view class="normal-login-container">
    <view class="logo-content align-center justify-center flex">
      <image style="width: 100rpx;height: 100rpx;" :src="globalConfig.appInfo.logo" mode="widthFix">
      </image>
      <text class="title">若依移动端登录</text>
    </view>
    <view class="login-form-content">
      <!-- 微信小程序环境: 提示绑定信息 -->
      <view class="wx-bind-tip" v-if="isWxEnv">
        <text class="tip-text">首次使用请绑定已有账号</text>
      </view>
      <view class="input-item flex align-center">
        <view class="iconfont icon-user icon"></view>
        <input v-model="loginForm.username" class="input" type="text" placeholder="请输入账号" maxlength="30" />
      </view>
      <view class="input-item flex align-center">
        <view class="iconfont icon-password icon"></view>
        <input v-model="loginForm.password" type="password" class="input" placeholder="请输入密码" maxlength="20" />
      </view>
      <!-- 非小程序环境显示验证码 -->
      <view class="input-item flex align-center" style="width: 60%;margin: 0px;" v-if="captchaEnabled && !isWxEnv">
        <view class="iconfont icon-code icon"></view>
        <input v-model="loginForm.code" type="number" class="input" placeholder="请输入验证码" maxlength="4" />
        <view class="login-code"> 
          <image :src="codeUrl" @click="getCode" class="login-code-img"></image>
        </view>
      </view>
      <view class="action-btn">
        <button @click="handleLogin" class="login-btn cu-btn block bg-blue lg round">{{ isWxEnv ? '绑定并登录' : '登录' }}</button>
      </view>
      
      <!-- 微信小程序环境：显示一键登录按钮 -->
      <view class="wx-quick-login" v-if="isWxEnv">
        <view class="divider">
          <text class="divider-text">或</text>
        </view>
        <button 
          open-type="getPhoneNumber" 
          @getphonenumber="handleGetPhoneNumber" 
          class="phone-login-btn cu-btn block bg-green lg round"
        >
          <text class="iconfont icon-phone"></text>
          一键手机号登录
        </button>
      </view>
      <view class="reg text-center" v-if="register">
        <text class="text-grey1">没有账号？</text>
        <text @click="handleUserRegister" class="text-blue">立即注册</text>
      </view>
      <view class="xieyi text-center">
        <text class="text-grey1">登录即代表同意</text>
        <text @click="handleUserAgrement" class="text-blue">《用户协议》</text>
        <text @click="handlePrivacy" class="text-blue">《隐私协议》</text>
      </view>
    </view>
     
  </view>
</template>

<script>
  import { getCodeImg } from '@/api/login'
  import { getToken } from '@/utils/auth'

  export default {
    data() {
      return {
        codeUrl: "",
        captchaEnabled: true,
        // 用户注册开关
        register: false,
        // 是否微信小程序环境
        isWxEnv: false,
        globalConfig: getApp().globalData.config,
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
      this.tryWxAutoLogin()
      // #endif
      // #ifndef MP-WEIXIN
      if (getToken()) {
        uni.reLaunch({ url: '/pages/index' })
      }
      // #endif
    },
    methods: {
      // 尝试微信自动登录
      tryWxAutoLogin() {
        if (getToken()) {
          uni.reLaunch({ url: '/pages/index' })
          return
        }
        this.$modal.loading("自动登录中...")
        this.$store.dispatch('WxLogin').then(() => {
          this.$modal.closeLoading()
          this.loginSuccess()
        }).catch(() => {
          this.$modal.closeLoading()
          // 微信未绑定，显示账号密码输入框让用户绑定
        })
      },
      // 用户注册
      handleUserRegister() {
        this.$tab.redirectTo(`/pages/register`)
      },
      // 隐私协议
      handlePrivacy() {
        let site = this.globalConfig.appInfo.agreements[0]
        this.$tab.navigateTo(`/pages/common/webview/index?title=${site.title}&url=${site.url}`)
      },
      // 用户协议
      handleUserAgrement() {
        let site = this.globalConfig.appInfo.agreements[1]
        this.$tab.navigateTo(`/pages/common/webview/index?title=${site.title}&url=${site.url}`)
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
      loginSuccess(result) {
        // 设置用户信息
        this.$store.dispatch('GetInfo').then(res => {
          this.$tab.reLaunch('/pages/index')
        })
      },
      // 获取手机号快捷登录
      handleGetPhoneNumber(e) {
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
              // 同时传递两个code
              this.$store.dispatch('PhoneLogin', {
                phoneCode: e.detail.code,  // 获取手机号的code
                loginCode: loginRes.code   // 获取openid的code
              }).then(() => {
                this.$modal.closeLoading()
                this.loginSuccess()
              }).catch((err) => {
                this.$modal.closeLoading()
                this.$modal.msgError(err || '手机号登录失败，请重试')
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
    background-color: #ffffff;
  }

  .normal-login-container {
    width: 100%;

    .logo-content {
      width: 100%;
      font-size: 21px;
      text-align: center;
      padding-top: 15%;

      image {
        border-radius: 4px;
      }

      .title {
        margin-left: 10px;
      }
    }

    .login-form-content {
      text-align: center;
      margin: 20px auto;
      margin-top: 15%;
      width: 80%;

      .input-item {
        margin: 20px auto;
        background-color: #f5f6f7;
        height: 45px;
        border-radius: 20px;

        .icon {
          font-size: 38rpx;
          margin-left: 10px;
          color: #999;
        }

        .input {
          width: 100%;
          font-size: 14px;
          line-height: 20px;
          text-align: left;
          padding-left: 15px;
        }

      }

      .wx-bind-tip {
        margin-bottom: 15px;

        .tip-text {
          font-size: 14px;
          color: #999;
        }
      }

      .login-btn {
        margin-top: 40px;
        height: 45px;
      }
      
      .reg {
        margin-top: 15px;
      }
      
      .xieyi {
        color: #333;
        margin-top: 20px;
      }
      
      .login-code {
        height: 38px;
        float: right;
      
        .login-code-img {
          height: 38px;
          position: absolute;
          margin-left: 10px;
          width: 200rpx;
        }
      }
    }
  }

</style>
