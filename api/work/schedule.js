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
 * 获取指定日期的校历信息（周次、学期、节假日等）
 * @param {string} date - 日期 yyyy-MM-dd，默认今天
 */
export function getWeekInfo(date) {
  return request({
    url: '/api/classschedule/weekInfo',
    method: 'get',
    params: date ? { date } : {}
  })
}

/**
 * 获取当天的所有班级课表（书记专用）
 * @param {number} weekday - 星期几（1-7）
 * @param {string} semester - 学期（如 2025-2026-1）
 * @param {number} weekNumber - 周次（1-20）
 */
export function getTodaySchedules(weekday, semester, weekNumber) {
  const params = { weekday }
  if (semester) params.semester = semester
  if (weekNumber) params.weekNumber = weekNumber
  return request({
    url: '/api/classschedule/today',
    method: 'get',
    params
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
