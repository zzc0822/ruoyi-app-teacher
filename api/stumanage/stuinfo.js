import request from '@/utils/request'

// 查询学生信息列表
export function listStuinfo(query) {
  return request({
    url: '/api/mini/stuinfo/list',
    method: 'get',
    params: query
  })
}

// 查询学生信息详细
export function getStuinfo(xh) {
  return request({
    url: '/api/mini/stuinfo/' + xh,
    method: 'get'
  })
}

// 获取学院-班级树结构
export function getCollegeClassTree() {
  return request({
    url: '/api/mini/stuinfo/collegeClassTree',
    method: 'get'
  })
}

// 根据角色获取学院-班级树结构
export function getCollegeClassTreeByRole() {
  return request({
    url: '/api/mini/stuinfo/collegeClassTreeByRole',
    method: 'get'
  })
}
