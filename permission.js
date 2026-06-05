import { getToken } from '@/utils/auth'
import { getRoleConfig, getRealNameStatus } from '@/api/roleView'
import { getConfigByRoles } from '@/utils/roleConfig'

// 登录页面
const loginPage = "/pages/login"

// 页面白名单
const whiteList = [
  '/pages/login', 
  '/pages/register', 
  '/pages/common/webview/index',
  '/pages/auth/chooseIdentity' // 身份选择页面（白名单）
]

// 全局角色配置缓存
let globalRoleConfig = null

// 检查地址白名单
function checkWhite(url) {
  const path = url.split('?')[0]
  return whiteList.indexOf(path) !== -1
}

/**
 * 初始化角色配置
 * 登录后调用，获取用户角色并设置TabBar
 */
export async function initRoleConfig() {
  try {
    // 获取后端角色配置
    const res = await getRoleConfig()
    
    if (res.code === 200 && res.data) {
      const { roles, homePage } = res.data
      
      // 使用角色配置文件生成配置
      globalRoleConfig = getConfigByRoles(roles)
      
      // 动态设置TabBar
      if (globalRoleConfig.tabBar && globalRoleConfig.tabBar.length > 0) {
        uni.setTabBar({
          list: globalRoleConfig.tabBar
        })
      }
      
      // 保存用户信息到全局状态
      uni.setStorageSync('roleConfig', globalRoleConfig)
      uni.setStorageSync('userRoles', roles)
      
      console.log('[角色配置] 初始化成功', {
        roles,
        homePage,
        tabBarCount: globalRoleConfig.tabBar.length
      })
      
      return globalRoleConfig
    }
  } catch (error) {
    console.error('[角色配置] 初始化失败', error)
    // 失败时使用默认配置（教师）
    globalRoleConfig = getConfigByRoles(['teacher'])
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
      const { needAuth, teacherAuthenticated, studentAuthenticated } = res.data
      
      // 保存认证状态
      uni.setStorageSync('authStatus', {
        needAuth,
        teacherAuthenticated,
        studentAuthenticated,
        teacherInfo: res.data.teacherInfo,
        studentInfo: res.data.studentInfo
      })
      
      console.log('[实名认证] 检查成功', {
        needAuth,
        teacherAuthenticated,
        studentAuthenticated
      })
      
      return res.data
    }
  } catch (error) {
    console.error('[实名认证] 检查失败', error)
    return { needAuth: false }
  }
}

/**
 * 获取角色配置
 */
export function getRoleConfigSync() {
  if (!globalRoleConfig) {
    // 从缓存读取
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

// 页面跳转验证拦截器
let list = ["navigateTo", "redirectTo", "reLaunch", "switchTab"]
list.forEach(item => {
  uni.addInterceptor(item, {
    invoke(to) {
      if (getToken()) {
        // 已登录用户访问登录页，重定向到首页
        if (to.url === loginPage || to.url === '/pages/login') {
          // 获取缓存的角色配置
          const config = getRoleConfigSync()
          const homePage = config?.homePage || '/pages/index'
          
          uni.reLaunch({ url: homePage })
          return false
        }
        return true
      } else {
        // 未登录用户访问非白名单页面，重定向到登录页
        if (checkWhite(to.url)) {
          return true
        }
        uni.reLaunch({ url: loginPage })
        return false
      }
    },
    fail(err) {
      console.log('[权限拦截] 跳转失败:', err)
    }
  })
})
