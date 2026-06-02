import request from '@/utils/request'

// 登录方法
export function login(username, password, code, uuid) {
  const data = {
    username,
    password,
    code,
    uuid
  }
  return request({
    'url': '/login',
    headers: {
      isToken: false
    },
    'method': 'post',
    'data': data
  })
}

// 注册方法
export function register(data) {
  return request({
    url: '/register',
    headers: {
      isToken: false
    },
    method: 'post',
    data: data
  })
}

// 获取用户详细信息
export function getInfo() {
  return request({
    'url': '/getInfo',
    'method': 'get'
  })
}

// 退出方法
export function logout() {
  return request({
    'url': '/logout',
    'method': 'post'
  })
}

// 获取验证码
export function getCodeImg() {
  return request({
    'url': '/captchaImage',
    headers: {
      isToken: false
    },
    method: 'get',
    timeout: 20000
  })
}

// 微信自动登录
export function wxLogin(code) {
  return request({
    url: '/wxLogin',
    headers: {
      isToken: false
    },
    method: 'post',
    data: { code }
  })
}

// 微信绑定账号
export function wxBind(code, username, password) {
  return request({
    url: '/wxBind',
    headers: {
      isToken: false
    },
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
