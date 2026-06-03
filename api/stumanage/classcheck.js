import request from '@/utils/request'

// 查询查课记录列表
export function listClassCheck(query) {
  return request({
    url: '/api/mini/classcheck/list',
    method: 'get',
    params: query
  })
}

// 查询查课记录详细
export function getClassCheck(id) {
  return request({
    url: '/api/mini/classcheck/' + id,
    method: 'get'
  })
}

// 新增查课记录
export function addClassCheck(data) {
  return request({
    url: '/api/mini/classcheck',
    method: 'post',
    data: data
  })
}

// 修改查课记录
export function updateClassCheck(data) {
  return request({
    url: '/api/mini/classcheck',
    method: 'put',
    data: data
  })
}

// 获取我的班级列表
export function getMyClasses() {
  return request({
    url: '/api/mini/classcheck/myClasses',
    method: 'get'
  })
}

// 获取班级学生列表
export function getClassStudents(bjdm) {
  return request({
    url: '/api/mini/classcheck/classStudents',
    method: 'get',
    params: { bjdm }
  })
}

// 查课周统计
export function getWeeklyStats(query) {
  return request({
    url: '/api/mini/classcheck/weeklyStats',
    method: 'get',
    params: query
  })
}

// 检查重复查课记录
export function checkDuplicate(bjdm, checkDate, lessonNo) {
  return request({
    url: '/api/mini/classcheck/checkDuplicate',
    method: 'get',
    params: { bjdm, checkDate, lessonNo }
  })
}

// 辅导员确认查课记录
export function confirmClassCheck(data) {
  return request({
    url: '/api/mini/classcheck/confirm',
    method: 'post',
    data: data
  })
}

// 获取查课统计数据
export function getClassCheckStats() {
  return request({
    url: '/api/mini/classcheck/stats',
    method: 'get'
  })
}
