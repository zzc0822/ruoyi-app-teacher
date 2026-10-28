import request from '@/utils/request'

// 当前教师可见范围内的学生档案完整性汇总
export function getCompletenessSummary(query) {
  return request({
    url: '/api/mini/completeness/summary',
    method: 'get',
    params: query
  })
}

// 按缺失项下钻学生名单
export function listCompletenessStudents(query) {
  return request({
    url: '/api/mini/completeness/students',
    method: 'get',
    params: query
  })
}
