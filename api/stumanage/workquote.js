import request from '@/utils/request'

/**
 * 随机获取一条学工金句
 * 移动端工作台使用
 */
export function getRandomQuote() {
  return request({
    url: '/api/workquote/random',
    method: 'get'
  })
}
