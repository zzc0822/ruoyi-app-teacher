import request from '@/utils/request'

/**
 * 获取用户角色配置
 * 根据用户角色返回对应的页面和功能配置
 */
export function getRoleConfig() {
  return request({
    url: '/api/role-view/config',
    method: 'get'
  })
}

/**
 * 获取实名认证状态
 */
export function getRealNameStatus() {
  return request({
    url: '/api/role-view/realname/status',
    method: 'get'
  })
}
