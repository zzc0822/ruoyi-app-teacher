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

// 班情熟知赛事：微信 openid 已绑定时自动识别辅导员
export function getCompetitionSession(sessionCode) {
  return request({ url: '/counselor/class-awareness/public/session/' + sessionCode, method: 'get', headers: { isToken: false } })
}
export function joinAutoSession(sessionCode) {
  return request({ url: '/counselor/class-awareness/session/join-auto/' + sessionCode, method: 'post' })
}
export function getCompetitionPlayer(playerToken) {
  return request({ url: '/counselor/class-awareness/public/player/' + playerToken, method: 'get', headers: { isToken: false } })
}
export function startCompetitionPlayer(playerToken) {
  return request({ url: '/counselor/class-awareness/public/player/' + playerToken + '/start', method: 'post', headers: { isToken: false } })
}
export function updateCompetitionProgress(playerToken, data) {
  return request({ url: '/counselor/class-awareness/public/player/' + playerToken + '/progress', method: 'put', params: data, headers: { isToken: false } })
}
export function submitCompetitionPlayer(playerToken, data) {
  return request({ url: '/counselor/class-awareness/public/player/' + playerToken + '/submit', method: 'post', data, headers: { isToken: false } })
}
