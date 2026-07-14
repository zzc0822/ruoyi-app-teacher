import request from '@/utils/request'

/**
 * 辅导员管理API（移动端专用）
 * 使用ruoyi-api模块的公共接口
 */

// 查询辅导员列表
export function listCounselor(query) {
  return request({
    url: '/api/counselor/list',
    method: 'get',
    params: query
  })
}

// 获取辅导员详情
export function getCounselor(jsid) {
  return request({
    url: '/api/counselor/' + jsid,
    method: 'get'
  })
}

// 查询辅导员带班列表
export function getCounselorClasses(jsid) {
  return request({
    url: '/api/counselor/classes/' + jsid,
    method: 'get'
  })
}

// 获取辅导员带班统计
export function getCounselorStats(jsid) {
  return request({
    url: '/api/counselor/stats/' + jsid,
    method: 'get'
  })
}

// 获取我的带班列表（当前登录辅导员）
export function getMyClasses() {
  return request({
    url: '/api/counselor/my/classes',
    method: 'get'
  })
}

// 获取我的带班统计（当前登录辅导员）
export function getMyStats() {
  return request({
    url: '/api/counselor/my/stats',
    method: 'get'
  })
}
