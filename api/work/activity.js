import request from '@/utils/request'

/**
 * 活动管理公共API（教师端小程序）
 */

// 获取活动列表
export function listActivity(query) {
  return request({
    url: '/api/activity/list',
    method: 'get',
    params: query
  })
}

// 获取活动详情
export function getActivity(id) {
  return request({
    url: '/api/activity/' + id,
    method: 'get'
  })
}

// 获取活动学生列表
export function listActivityStudents(activityId, query) {
  return request({
    url: '/api/activity/' + activityId + '/students',
    method: 'get',
    params: query
  })
}

// 获取活动积分阶段说明
export function getActivityPhases(activityId) {
  return request({
    url: '/api/activity/' + activityId + '/phases',
    method: 'get'
  })
}

// 按维度统计活动
export function getActivityStat() {
  return request({
    url: '/api/activity/stat',
    method: 'get'
  })
}
