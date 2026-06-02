import request from '@/utils/request'

// 获取工作台统计数据
export function getWorkStats() {
  return request({
    url: '/api/work-stats/summary',
    method: 'get'
  })
}
