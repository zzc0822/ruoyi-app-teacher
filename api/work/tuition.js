import request from '@/utils/request'

// 欠费批次：保留学校最近两期，移动端默认展示当期
export function getTuitionBatches() {
  return request({
    url: '/stumanage/tuition/batches',
    method: 'get'
  })
}

// 学院/辅导员视野欠费概览
export function getTuitionOverview(params) {
  return request({
    url: '/stumanage/tuition/overview',
    method: 'get',
    params: params || {}
  })
}

// 辅导员推进：仅学院级账号返回名单
export function listTuitionCounselors(params) {
  return request({
    url: '/stumanage/tuition/counselors',
    method: 'get',
    params: params || {}
  })
}

// 欠费学生分页列表
export function listTuitionRecords(params) {
  return request({
    url: '/stumanage/tuition/records',
    method: 'get',
    params: params || {}
  })
}

export function getTuitionRecord(id) {
  return request({
    url: '/stumanage/tuition/records/' + id,
    method: 'get'
  })
}

export function getTuitionTimeline(id) {
  return request({
    url: '/stumanage/tuition/records/' + id + '/timeline',
    method: 'get'
  })
}
