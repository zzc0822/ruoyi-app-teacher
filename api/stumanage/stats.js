import request from '@/utils/request'

/**
 * 获取学院统计汇总数据
 * @param {string} xydm - 学院代码
 */
export function getCollegeSummary(xydm) {
  return request({
    url: '/api/mini/stats/summary',
    method: 'get',
    params: { xydm }
  })
}

/**
 * 获取按专业统计的数据
 * @param {string} xydm - 学院代码
 */
export function getStatsByMajor(xydm) {
  return request({
    url: '/api/mini/stats/byMajor',
    method: 'get',
    params: { xydm }
  })
}

/**
 * 获取按辅导员统计的数据
 * @param {string} xydm - 学院代码
 */
export function getStatsByCounselor(xydm) {
  return request({
    url: '/api/mini/stats/byCounselor',
    method: 'get',
    params: { xydm }
  })
}
