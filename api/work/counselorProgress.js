import request from '@/utils/request'

// 辅导员工作进展：学院级账号返回学院名单，带班账号返回本人数据
export function getCounselorWorkProgress() {
  return request({
    url: '/api/work/counselor-progress',
    method: 'get'
  })
}
