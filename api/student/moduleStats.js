import request from '@/utils/request'

/**
 * 获取综合统计数据（所有模块汇总）
 * @param {Object} params - 查询参数
 * @param {string} params.academicYear - 学年（外宿统计用，可选）
 * @param {string} params.checkDate - 查课日期（可选）
 */
export function getModuleOverview(params) {
  return request({
    url: '/api/mini/moduleStats/overview',
    method: 'get',
    params: params || {}
  })
}

/**
 * 获取按辅导员分组的统计数据
 * @param {string} module - 模块名称（vehicle/offcampus/classCheck/leave/talk/activity）
 * @param {Object} params - 查询参数
 * @param {string} params.academicYear - 学年（外宿统计用，可选）
 * @param {string} params.checkDate - 查课日期（可选）
 */
export function getModuleStatsByCounselor(module, params) {
  return request({
    url: '/api/mini/moduleStats/byCounselor',
    method: 'get',
    params: { module, ...params }
  })
}
