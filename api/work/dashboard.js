import request from '@/utils/request'

// 教师工作台聚合数据：统计、待办、学生总数与金句
export function getWorkDashboard() {
  return request({
    url: '/api/work/dashboard',
    method: 'get'
  })
}
