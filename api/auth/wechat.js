import request from '@/utils/request'

// 微信自动登录
export function wxLogin(code) {
  return request({
    url: '/wxLogin',
    headers: { isToken: false },
    method: 'post',
    data: { code }
  })
}

// 微信绑定账号
export function wxBind(code, username, password) {
  return request({
    url: '/wxBind',
    headers: { isToken: false },
    method: 'post',
    data: { code, username, password }
  })
}

// 解除微信绑定
export function unbindWx() {
  return request({
    url: '/api/user/unbind',
    method: 'post'
  })
}

// 学生绑定登录
export function studentBindLogin(code, studentNo) {
  return request({
    url: '/api/auth/studentBindLogin',
    headers: { isToken: false },
    method: 'post',
    data: { code, studentNo }
  })
}

// 手机号快捷登录
export function phoneLogin(phoneCode, loginCode) {
  return request({
    url: '/phoneLogin',
    headers: { isToken: false },
    method: 'post',
    data: { phoneCode, loginCode }
  })
}

// 学生手机号一键绑定
export function studentPhoneBind(phoneCode, loginCode) {
  return request({
    url: '/phoneLogin',
    headers: { isToken: false },
    method: 'post',
    data: { phoneCode, loginCode }
  })
}

// 小程序登录（通用）
export function wxampLoginApi(code) {
  return request({
    url: '/wxLogin',
    headers: { isToken: false },
    method: 'post',
    data: { code }
  })
}
