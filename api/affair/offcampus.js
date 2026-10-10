import request from '@/utils/request'

/**
 * 外宿申请API（移动端-辅导员/书记）
 *
 * 小程序端一律通过 /api/offcampus/** 访问：该层按角色判定收口视野（管理员全部、
 * 书记/院长本学院、辅导员带班、学生本人），无需 stumanage:offcampus:* 菜单权限。
 * /stumanage/** 是 PC 管理端接口面，不给移动端用。
 */

// 获取外宿申请列表
export function listOffcampus(query) {
  return request({
    url: '/api/offcampus/list',
    method: 'get',
    params: query
  })
}

// 获取外宿申请详情
export function getOffcampus(id) {
  return request({
    url: '/api/offcampus/' + id,
    method: 'get'
  })
}

// 辅导员代学生提交申请（初始状态：待现场核实）
export function addOffcampus(data) {
  return request({
    url: '/api/offcampus',
    method: 'post',
    data: data
  })
}

// 辅导员现场核实
export function verifyOffcampus(data) {
  return request({
    url: '/api/offcampus/verify',
    method: 'put',
    data: data
  })
}

// 审批（书记/学生处）
export function approveOffcampus(data) {
  return request({
    url: '/api/offcampus/approve',
    method: 'put',
    data: data
  })
}

// 删除外宿申请
export function delOffcampus(id) {
  return request({
    url: '/api/offcampus/' + id,
    method: 'delete'
  })
}

// 查询学生历史外宿申请记录
export function getOffcampusHistory(xh) {
  return request({
    url: '/api/offcampus/history/' + xh,
    method: 'get'
  })
}

// 查询学生出勤统计（审批参考）
export function getOffcampusAttendance(xh, query) {
  return request({
    url: '/api/offcampus/attendance/' + xh,
    method: 'get',
    params: query
  })
}

// 外宿期限候选：整学年 + 各学期（取自校历）
export function getOffcampusPeriods(academicYear) {
  return request({
    url: '/api/offcampus/periods',
    method: 'get',
    params: { academicYear: academicYear }
  })
}
