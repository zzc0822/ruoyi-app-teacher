import request from '@/utils/request'

/**
 * 按学院+年级查询招生计划专业列表（数据更准确，来源于招生计划表）
 * @param {string} xydm - 学院代码（可选）
 * @param {string} nj   - 年级，如 '2023'（可选，不传则返回该学院所有有招生计划的专业）
 * @returns 专业列表，字段：zydm（专业代码）、zyname（专业名称）
 */
export function getMajorList(xydm, nj) {
  return request({
    url: '/api/college/majorList',
    method: 'get',
    params: { xydm, nj }
  })
}

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
