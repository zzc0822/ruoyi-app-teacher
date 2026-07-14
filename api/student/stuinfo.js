import request from '@/utils/request'

// 查询学生信息列表
export function listStuinfo(query) {
  return request({
    url: '/api/mini/stuinfo/list',
    method: 'get',
    params: query
  })
}

// 获取当前登录学生详细信息（学生端小程序）
export function getMyInfo() {
  return request({
    url: '/api/stuinfo/myInfo',
    method: 'get'
  })
}

// 学生端更新本人联系电话（同步记录历史电话）
export function updateMyPhone(phone) {
  return request({
    url: '/api/stuinfo/updatePhone',
    method: 'post',
    data: { phone }
  })
}

// 查询学生信息详细
export function getStuinfo(xh) {
  return request({
    url: '/api/mini/stuinfo/' + xh,
    method: 'get'
  })
}

// 根据用户ID获取学生信息
export function getStuinfoByUserId(userId) {
  return request({
    url: '/api/mini/stuinfo/byUserId/' + userId,
    method: 'get'
  })
}

// 获取我的学生列表
export function getMyStudents() {
  return request({
    url: '/api/mini/stuinfo/myStudents',
    method: 'get'
  })
}

// 搜索学生（根据角色自动过滤）
export function searchStuinfo(keyword) {
  return request({
    url: '/api/mini/stuinfo/search',
    method: 'get',
    params: { keyword }
  })
}

// 获取学生详情（带是否可查看完整信息标记）
export function getStuinfoDetail(xh) {
  return request({
    url: '/api/mini/stuinfo/detail/' + xh,
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
