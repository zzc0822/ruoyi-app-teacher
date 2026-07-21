import request from '@/utils/request'

// 获取我的班级列表
export function getMyClasses() {
  return request({ url: '/counselor/class-awareness/myClasses', method: 'get' })
}
// 开始答题
export function startQuiz(data) {
  return request({ url: '/counselor/class-awareness/start', method: 'post', params: data })
}
// 提交答案
export function submitQuiz(data) {
  return request({ url: '/counselor/class-awareness/submit', method: 'post', data })
}
// 答题详情(含正确答案)
export function getDetail(awarenessId) {
  return request({ url: '/counselor/class-awareness/detail/' + awarenessId, method: 'get' })
}
// 我的答题记录
export function listRecords(query) {
  return request({ url: '/counselor/class-awareness/records', method: 'get', params: query })
}
// 竞赛排名
export function getRankList(compId) {
  return request({ url: '/counselor/class-awareness/rank/' + compId, method: 'get' })
}
