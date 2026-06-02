import request from '@/utils/request'

// 查询请假申请列表
export function listLeave(query) {
  return request({
    url: '/api/leave/list',
    method: 'get',
    params: query
  })
}

// 查询请假申请详细
export function getLeave(id) {
  return request({
    url: '/api/leave/' + id,
    method: 'get'
  })
}

// 新增请假申请
export function addLeave(data) {
  return request({
    url: '/api/leave',
    method: 'post',
    data: data
  })
}

// 修改请假申请
export function updateLeave(data) {
  return request({
    url: '/api/leave',
    method: 'put',
    data: data
  })
}

// 审批请假申请
export function approvalLeave(data) {
  return request({
    url: '/api/leave/approval',
    method: 'put',
    data: data
  })
}

// 删除请假申请
export function delLeave(ids) {
  return request({
    url: '/api/leave/' + ids,
    method: 'delete'
  })
}

// 保存请假附件记录
export function saveLeaveAttachments(leaveId, fileList) {
  return request({
    url: '/api/attachment',
    method: 'post',
    data: { businessId: leaveId, category: 'leave', fileList: fileList }
  })
}
