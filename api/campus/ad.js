import request from '@/utils/request'

/**
 * 获取广告列表
 * @param {String} position - 广告位置（banner/feed/popup/footer）
 */
export function getAdList(position) {
  return request({
    url: '/api/ad/getList',
    method: 'get',
    params: { position }
  })
}

/**
 * 上报广告展示
 * @param {Number} adId - 广告ID
 */
export function reportShow(adId) {
  return request({
    url: '/api/ad/reportShow',
    method: 'post',
    params: { adId }
  })
}

/**
 * 上报广告点击
 * @param {Number} adId - 广告ID
 */
export function reportClick(adId) {
  return request({
    url: '/api/ad/reportClick',
    method: 'post',
    params: { adId }
  })
}

/**
 * 批量上报广告展示
 * @param {Array} adIds - 广告ID列表
 */
export function batchReportShow(adIds) {
  return request({
    url: '/api/ad/batchReportShow',
    method: 'post',
    data: adIds
  })
}
