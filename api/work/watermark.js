import request from '@/utils/request'

/**
 * 逆地理编码：由拍照定位坐标获取水印地址
 */
export function getWatermarkAddress(lat, lng) {
  return request({
    url: '/api/watermark/address',
    method: 'get',
    params: { lat: lat, lng: lng }
  })
}

/**
 * 获取指定场景的水印配置
 * @param {string} sceneCode 场景编码
 */
export function getWatermarkConfig(sceneCode) {
  return request({
    url: '/api/watermark/config/' + sceneCode,
    method: 'get'
  })
}

/**
 * 获取所有启用的水印配置
 */
export function getAllWatermarkConfig() {
  return request({
    url: '/api/watermark/config/all',
    method: 'get'
  })
}
