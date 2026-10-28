import request from '@/utils/request'

/**
 * 请假管理公共API（移动端）
 * 使用ruoyi-api模块的公共接口
 */

// 获取请假列表
export function listLeave(query) {
  return request({
    url: '/api/leave/list',
    method: 'get',
    params: query
  })
}

// 获取请假详情
export function getLeave(id) {
  return request({
    url: '/api/leave/' + id,
    method: 'get'
  })
}

// 补全查课生成的待补充请假并提交审批
export function updateSupplementLeave(id, data) {
  return request({
    url: '/api/leave/' + id + '/supplement',
    method: 'put',
    data: data
  })
}

// 审批请假
export function approvalLeave(data) {
  return request({
    url: '/api/leave/approval',
    method: 'put',
    data: data
  })
}

// 获取我的请假列表（学生端）
export function getMyLeaves(query) {
  return request({
    url: '/api/leave/myLeaves',
    method: 'get',
    params: query
  })
}

// 获取待审批的请假列表
export function getPendingLeaves() {
  return request({
    url: '/api/leave/pending',
    method: 'get'
  })
}

// 销假（学生本人或教师代为销假）
export function returnLeave(data) {
  return request({
    url: '/api/leave/return',
    method: 'put',
    data: data
  })
}

