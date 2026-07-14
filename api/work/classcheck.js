import request from '@/utils/request'

/**
 * 查课管理公共API（移动端）
 * 使用ruoyi-api模块的公共接口
 */

// 获取查课列表
export function listClassCheck(query) {
  return request({
    url: '/api/classcheck/list',
    method: 'get',
    params: query
  })
}

// 获取查课详情
export function getClassCheck(id) {
  return request({
    url: '/api/classcheck/' + id,
    method: 'get'
  })
}

// 新增查课记录
export function addClassCheck(data) {
  return request({
    url: '/api/classcheck',
    method: 'post',
    data: data
  })
}

// 修改查课记录
export function updateClassCheck(data) {
  return request({
    url: '/api/classcheck',
    method: 'put',
    data: data
  })
}

// 获取班级学生列表
export function getClassStudents(bjdm) {
  return request({
    url: '/api/classcheck/classStudents',
    method: 'get',
    params: { bjdm }
  })
}

// 获取我的班级列表（当前登录用户）
export function getMyClasses() {
  return request({
    url: '/api/classtree/myClasses',
    method: 'get'
  })
}

// 获取查课统计数据
export function getClassCheckStats() {
  return request({
    url: '/api/classcheck/stats',
    method: 'get'
  })
}

// 获取某班级某日期的请假学生列表
export function getLeaveStudents(bjdm, checkDate) {
  return request({
    url: '/stumanage/classcheck/leaveStudents',
    method: 'get',
    params: { bjdm, checkDate }
  })
}
