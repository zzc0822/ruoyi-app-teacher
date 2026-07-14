import request from '@/utils/request'

/**
 * 外宿申请API（移动端）
 */

// 获取外宿申请列表
export function listOffcampus(query) {
  return request({
    url: '/api/offcampus/list',
    method: 'get',
    params: query
  })
}

// 获取外宿申请详情
export function getOffcampus(id) {
  return request({
    url: '/api/offcampus/' + id,
    method: 'get'
  })
}

// 新增外宿申请
export function addOffcampus(data) {
  return request({
    url: '/api/offcampus',
    method: 'post',
    data: data
  })
}

// 辅导员现场核实
export function verifyOffcampus(data) {
  return request({
    url: '/api/offcampus/verify',
    method: 'put',
    data: data
  })
}

// 审批（书记/学生处）
export function approveOffcampus(data) {
  return request({
    url: '/api/offcampus/approve',
    method: 'put',
    data: data
  })
}

// 删除外宿申请
export function delOffcampus(id) {
  return request({
    url: '/api/offcampus/' + id,
    method: 'delete'
  })
}

// 查询学生历史外宿申请记录
export function getOffcampusHistory(xh) {
  return request({
    url: '/api/offcampus/history/' + xh,
    method: 'get'
  })
}
