import request from '@/utils/request'

// 查询班级列表
export function listClassinfo(query) {
  return request({
    url: '/stumanage/bjdmb/list',
    method: 'get',
    params: query
  })
}

// 查询班级详细
export function getClassinfo(bjid) {
  return request({
    url: '/stumanage/bjdmb/' + bjid,
    method: 'get'
  })
}
