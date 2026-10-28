import request from '@/utils/request'

// 毕业班论文进度汇总
export function getGraduationSummary(graduateYear) {
  return request({
    url: '/stumanage/graduation/thesis/summary',
    method: 'get',
    params: { graduateYear }
  })
}

// 当前账号视野内的毕业生台账
export function listGraduationStudents(query) {
  return request({
    url: '/stumanage/graduation/thesis/students',
    method: 'get',
    params: query
  })
}

// 辅导员带班学生的论文阶段进度
export function getGraduationProgress(graduateYear) {
  return request({
    url: '/stumanage/graduation/thesis/counselor-progress',
    method: 'get',
    params: { graduateYear }
  })
}

// 当前账号负责学生的毕业去向
export function listGraduationDirections(query) {
  return request({
    url: '/stumanage/graduation/thesis/my-student-directions',
    method: 'get',
    params: query
  })
}
