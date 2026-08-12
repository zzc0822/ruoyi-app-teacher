import request from '@/utils/request'

// 获取当前用户的小程序工作台配置
export function getMyMiniConfig() {
  return request({
    url: '/system/miniConfig/my',
    method: 'get'
  })
}
