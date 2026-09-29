import request from '@/utils/request'

/**
 * 辅导员课表管理 API（移动端专用）
 */

/**
 * 获取辅导员所带班级的课表数据
 * @returns {Promise}
 */
export function getCounselorSchedule() {
  return request({
    url: '/api/counselor/schedule/my',
    method: 'get'
  })
}

/**
 * 根据班级代码和日期查询课表
 * @param {string} bjdm - 班级代码
 * @param {string} date - 日期 yyyy-MM-dd
 * @returns {Promise}
 */
export function getClassSchedule(bjdm, date) {
  return request({
    url: '/integration/classSchedule/class',
    method: 'get',
    params: {
      semester: null, // 使用最新学期
      bjdm: bjdm,
      checkDate: date
    }
  })
}

/**
 * 获取调课记录
 * @param {string} dateRange - 日期范围，格式：startDate,endDate
 * @returns {Promise}
 */
export function getAdjustList(dateRange) {
  return request({
    url: '/stumanage/schedule/adjust/list',
    method: 'get',
    params: {
      dateRange: dateRange
    }
  })
}
