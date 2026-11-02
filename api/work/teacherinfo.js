import request from '@/utils/request'

// 查询教师信息列表
export function listTeacherinfo(query) {
  return request({
    url: '/stumanage/teacherinfo/list',
    method: 'get',
    params: query
  })
}

// 查询教师信息详细
export function getTeacherinfo(jsid) {
  return request({
    url: '/stumanage/teacherinfo/' + jsid,
    method: 'get'
  })
}

// 根据用户ID获取教师信息（小程序专用）
export function getTeacherinfoByUserId(userId) {
  return request({
    url: '/api/teacher/myInfo',
    method: 'get'
  })
}

// 教师修改自己的信息（小程序专用）
export function updateMyTeacherinfo(data) {
  return request({
    url: '/api/teacher/updateMyInfo',
    method: 'put',
    data: data
  })
}

// 获取角色列表（小程序专用）
export function getRoleList() {
  return request({
    url: '/api/teacher/roles',
    method: 'get'
  })
}

// 获取当前登录账号的有效角色（小程序专用）
export function getMyRoles() {
  return request({
    url: '/api/teacher/myRoles',
    method: 'get',
    silent: true
  })
}

// 获取服务端按数据库角色记录选定的当前展示角色
export function getCurrentRole() {
  return request({
    url: '/api/teacher/currentRole',
    method: 'get'
  })
}

// 切换当前角色视图（教师端小程序）
export function switchRole(roleId) {
  return request({
    url: '/api/teacher/switchRole/' + roleId,
    method: 'put'
  })
}

// 删除教师信息
export function delTeacherinfo(jsid) {
  return request({
    url: '/stumanage/teacherinfo/' + jsid,
    method: 'delete'
  })
}
