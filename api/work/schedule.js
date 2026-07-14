import request from '@/utils/request'

/**
 * 查询课表列表
 */
export function listSchedule(query) {
  return request({
    url: '/integration/classSchedule/list',
    method: 'get',
    params: query
  })
}

/**
 * 获取当天的所有班级课表（书记专用）
 * @param {number} weekday - 星期几（1-7）
 */
export function getTodaySchedules(weekday) {
  return request({
    url: '/api/classschedule/today',
    method: 'get',
    params: { weekday }
  })
}

/**
 * 获取我的课表（教师）
 */
export function getMySchedule() {
  return request({
    url: '/integration/classSchedule/my',
    method: 'get'
  })
}

/**
 * 根据日期查询所属学期信息
 */
export function getSemesterByDate(date) {
  return request({
    url: '/integration/classSchedule/my/semesterByDate',
    method: 'get',
    params: { date }
  })
}

/**
 * 获取当前生效的作息时间方案（含每节课的上下课时间）
 * @param {string} checkDate - 查询日期 yyyy-MM-dd
 */
export function getActiveSchedule(checkDate) {
  return request({
    url: '/stumanage/schedule/active',
    method: 'get',
    params: { checkDate }
  })
}
