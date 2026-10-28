import { getToken } from '@/utils/auth'
import { getRoleConfig, getRealNameStatus } from '@/api/campus/roleView'
import { hasPrivacyConsent } from '@/utils/privacy'

// 登录页面
const loginPage = "/pages/login"

// 页面白名单
const whiteList = [
  '/pages/login', 
  '/pages/register', 
  '/pages/common/webview/index'
]

// 全局角色配置缓存
let globalRoleConfig = null
let redirectingToLogin = false

// 检查地址白名单
function checkWhite(url) {
  const path = url.split('?')[0]
  return whiteList.indexOf(path) !== -1
}

/**
 * 初始化角色配置
 */
export async function initRoleConfig() {
  try {
    const res = await getRoleConfig()
    
    if (res.code === 200 && res.data) {
      globalRoleConfig = res.data
      
      // 动态设置TabBar（仅小程序支持）
      // #ifdef MP-WEIXIN
      try {
        if (globalRoleConfig.tabBar && globalRoleConfig.tabBar.length > 0 && typeof uni.setTabBar === 'function') {
          uni.setTabBar({
            list: globalRoleConfig.tabBar
          })
        }
      } catch (e) {
      }
      // #endif
      
      uni.setStorageSync('roleConfig', globalRoleConfig)
      uni.setStorageSync('userRoles', globalRoleConfig.roles)
      
      return globalRoleConfig
    }
  } catch (error) {
    // 失败时使用默认配置（教师）
    globalRoleConfig = {
      roles: ['teacher'],
      homePage: '/pages/index',
      tabBar: [],
      features: {}
    }
    return globalRoleConfig
  }
}

/**
 * 检查实名认证状态
 */
export async function checkRealNameAuth() {
  try {
    const res = await getRealNameStatus()
    
    if (res.code === 200 && res.data) {
      uni.setStorageSync('authStatus', res.data)
      return res.data
    }
  } catch (error) {
    return { needAuth: false }
  }
}

/**
 * 获取角色配置
 */
export function getRoleConfigSync() {
  if (!globalRoleConfig) {
    globalRoleConfig = uni.getStorageSync('roleConfig')
  }
  return globalRoleConfig
}

/**
 * 检查是否有指定权限
 */
export function hasFeature(feature) {
  const config = getRoleConfigSync()
  if (!config || !config.features) return false
  return config.features[feature] === true
}

function redirectToLogin() {
  if (redirectingToLogin) {
    return
  }
  redirectingToLogin = true
  // Avoid launching a new route from inside the active navigation interceptor.
  setTimeout(() => {
    uni.reLaunch({
      url: loginPage,
      complete: () => {
        redirectingToLogin = false
      }
    })
  }, 0)
}

// 页面跳转验证拦截器
let list = ["navigateTo", "redirectTo", "reLaunch", "switchTab"]
list.forEach(item => {
  uni.addInterceptor(item, {
    invoke(to) {
      if (to.url && to.url.indexOf('redirect=true') !== -1) {
        return true
      }
      
      if (getToken() && hasPrivacyConsent()) {
        // The login page owns the post-authentication redirect after onReady.
        if (to.url === loginPage || to.url === '/pages/login') {
          return false
        }
        return true
      } else {
        // 未登录用户访问非白名单页面，重定向到登录页
        if (checkWhite(to.url)) {
          return true
        }
        redirectToLogin()
        return false
      }
    },
    fail(err) {
    }
  })
})
