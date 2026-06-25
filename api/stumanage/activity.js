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

// 创建活动
export function addActivity(data) {
  return request({
    url: '/api/activity',
    method: 'post',
    data: data
  })
}

// 修改活动
export function updateActivity(data) {
  return request({
    url: '/api/activity',
    method: 'put',
    data: data
  })
}

// 删除活动
export function delActivity(ids) {
  return request({
    url: '/api/activity/' + ids,
    method: 'delete'
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

// 批量安排学生
export function batchArrange(activityId, data) {
  return request({
    url: '/api/activity/' + activityId + '/batch',
    method: 'post',
    data: data
  })
}

// 更新学生参与状态
export function updateStudentStatus(studentId, status) {
  return request({
    url: '/api/activity/student/status',
    method: 'put',
    params: { studentId, status }
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
