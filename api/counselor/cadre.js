import request from '@/utils/request'

// 当前账号可办理的学生干部任职审批
export function listCadreApprovals(query) {
  return request({
    url: '/api/mini/cadre/approvals',
    method: 'get',
    params: query
  })
}

// 干部任职审批流转记录
export function getCadreApprovalLogs(id) {
  return request({
    url: '/api/mini/cadre/approvals/' + id + '/logs',
    method: 'get'
  })
}

// 审批通过
export function approveCadreApproval(id, opinion) {
  return request({
    url: '/api/mini/cadre/approvals/' + id + '/approve',
    method: 'put',
    data: { opinion }
  })
}

// 审批驳回
export function rejectCadreApproval(id, reason) {
  return request({
    url: '/api/mini/cadre/approvals/' + id + '/reject',
    method: 'put',
    data: { reason }
  })
}
