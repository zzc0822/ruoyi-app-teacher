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
