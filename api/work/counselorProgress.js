import request from '@/utils/request'

// 辅导员工作进展：学院级账号返回学院名单，带班账号返回本人数据
export function getCounselorWorkProgress() {
  return request({
    url: '/api/work/counselor-progress',
    method: 'get'
  })
}

// 辅导员工作进展下钻：指定辅导员 + 统计项的实际记录
export function getCounselorWorkRecords(params) {
  return request({
    url: '/api/work/counselor-progress/records',
    method: 'get',
    params: params || {}
  })
}
