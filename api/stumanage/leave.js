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

// 提交请假申请
export function applyLeave(data) {
  return request({
    url: '/api/leave/apply',
    method: 'post',
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

// 获取请假扣分提示（学生端提交前展示）
export function getLeaveScoreHint(query) {
  return request({
    url: '/api/leave/scoreHint',
    method: 'get',
    params: query
  })
}
