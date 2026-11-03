import request from '@/utils/request'

// 获取最新功能更新（启动弹窗使用）
export function getLatestFeatureTimeline(limit = 5) {
  return request({
    url: '/system/featureTimeline/latest',
    method: 'get',
    params: { limit },
    silent: true
  })
}
