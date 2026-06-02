import store from '@/store'
import config from '@/config'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { toast, showConfirm, tansParams } from '@/utils/common'

let timeout = 10000
const baseUrl = config.baseUrl

const request = config => {
  // 是否需要设置 token
  const isToken = (config.headers || {}).isToken === false
  config.header = config.header || {}
  if (getToken() && !isToken) {
    config.header['Authorization'] = 'Bearer ' + getToken()
  }
  // get请求映射params参数
  if (config.params) {
    let url = config.url + '?' + tansParams(config.params)
    url = url.slice(0, -1)
    config.url = url
  }
  return new Promise((resolve, reject) => {
    uni.request({
        method: config.method || 'get',
        timeout: config.timeout ||  timeout,
        url: config.baseUrl || baseUrl + config.url,
        data: config.data,
        header: config.header,
        dataType: 'json'
      }).then(response => {
        let [error, res] = response
        if (error) {
          toast('后端接口连接异常')
          reject('后端接口连接异常')
          return
        }
        const code = res.data.code || 200
        const msg = errorCode[code] || res.data.msg || errorCode['default']
        if (code === 401) {
          // #ifdef MP-WEIXIN
          store.dispatch('WxLogin').then(() => {
            // 微信自动登录成功，重新发起原请求
            config.header['Authorization'] = 'Bearer ' + getToken()
            uni.request({
              method: config.method || 'get',
              timeout: config.timeout || timeout,
              url: config.baseUrl || baseUrl + config.url,
              data: config.data,
              header: config.header,
              dataType: 'json'
            }).then(response => {
              let [err, resp] = response
              if (!err) {
                resolve(resp.data)
              } else {
                reject('重试请求失败')
              }
            })
          }).catch(() => {
            // 微信自动登录也失败，跳转登录页
            store.dispatch('LogOut').then(() => {
              uni.reLaunch({ url: '/pages/login' })
            })
          })
          // #endif
          // #ifndef MP-WEIXIN
          store.dispatch('LogOut').then(() => {
            uni.reLaunch({ url: '/pages/login' })
          })
          // #endif
          reject('无效的会话，或者会话已过期，请重新登录。')
        } else if (code === 500) {
          toast(msg)
          reject('500')
        } else if (code !== 200) {
          // 20001: 微信未绑定账号，静默拒绝，不弹提示
          if (code !== 20001) {
            toast(msg)
          }
          reject(code)
        }
        resolve(res.data)
      })
      .catch(error => {
        let { message } = error
        if (message === 'Network Error') {
          message = '后端接口连接异常'
        } else if (message.includes('timeout')) {
          message = '系统接口请求超时'
        } else if (message.includes('Request failed with status code')) {
          message = '系统接口' + message.slice(-3) + '异常'
        }
        toast(message)
        reject(error)
      })
  })
}

export default request
