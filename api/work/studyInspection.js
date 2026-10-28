import request from '@/utils/request'

/**
 * 微信小程序教师端学风检查。
 * 权限和数据范围均由服务端按当前登录账号收口。
 */

export function listStudyInspectionPoints() {
  return request({
    url: '/api/teacher/study-inspection/points',
    method: 'get'
  })
}

export function lookupStudyInspectionStudent(xh) {
  return request({
    url: '/api/teacher/study-inspection/student/' + encodeURIComponent(xh),
    method: 'get'
  })
}

export function addStudyInspection(data) {
  return request({
    url: '/api/teacher/study-inspection',
    method: 'post',
    data
  })
}

export function listStudyInspectionViolations(query) {
  return request({
    url: '/api/teacher/study-inspection/violations',
    method: 'get',
    params: query
  })
}

export function getStudyInspectionViolation(id) {
  return request({
    url: '/api/teacher/study-inspection/violations/' + id,
    method: 'get'
  })
}

export function getStudyInspectionSummary(query) {
  return request({
    url: '/api/teacher/study-inspection/summary',
    method: 'get',
    params: query
  })
}
