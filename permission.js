import { getToken } from '@/utils/auth'

// 登录页面
const loginPage = "/pages/login"
  
// 页面白名单
const whiteList = [
  '/pages/login', '/pages/register', '/pages/common/webview/index'
]

// 检查地址白名单
function checkWhite(url) {
  const path = url.split('?')[0]
  return whiteList.indexOf(path) !== -1
}

// 页面跳转验证拦截器
let list = ["navigateTo", "redirectTo", "reLaunch", "switchTab"]
list.forEach(item => {
  uni.addInterceptor(item, {
    invoke(to) {
      if (getToken()) {
        // 已登录用户访问登录页，重定向到首页
        if (to.url === loginPage || to.url === '/pages/login') {
          uni.reLaunch({ 
            url: "/pages/index"
          })
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
