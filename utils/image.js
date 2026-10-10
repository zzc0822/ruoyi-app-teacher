import config from '@/config'

/**
 * 库里存的是相对路径（/profile/upload/...），小程序端要拼上 baseUrl 才能显示；
 * 历史数据里混有完整 URL，遇到 http/data 前缀直接返回。
 */
export function resolveImg(path) {
  if (!path) return ''
  const url = String(path)
  if (url.indexOf('http') === 0 || url.indexOf('data:') === 0) return url
  if (url.indexOf('/profile') === 0) return config.baseUrl + url
  return config.baseUrl + '/profile/' + url
}

/**
 * 照片字段兼容三种存法：JSON 数组、逗号分隔串、单个路径
 */
export function parsePhotoList(raw) {
  if (!raw) return []
  let list = []
  try {
    const parsed = JSON.parse(raw)
    list = Array.isArray(parsed) ? parsed : [String(parsed)]
  } catch (e) {
    list = String(raw).split(',')
  }
  return list.filter(u => u)
}

/**
 * 多个照片字段合并成一组可显示 URL，按原值去重
 */
export function mergePhotoFields(...fields) {
  const seen = {}
  return fields
    .reduce((all, f) => all.concat(parsePhotoList(f)), [])
    .filter(u => {
      if (seen[u]) return false
      seen[u] = true
      return true
    })
    .map(resolveImg)
}
