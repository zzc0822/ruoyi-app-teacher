import request from '@/utils/request'

// 获取案例列表
export function getCaseList(query) {
  return request({ url: '/counselor/case/published', method: 'get', params: query })
}
// 获取案例详情
export function getCaseDetail(caseId) {
  return request({ url: '/counselor/case/' + caseId, method: 'get' })
}
// 提交案例分析（四维度）
export function submitCaseAnalysis(data) {
  return request({ url: '/counselor/analysis', method: 'post', data })
}
// 我的案例分析列表
export function getMyAnalysisList() {
  return request({ url: '/counselor/analysis/myList', method: 'get' })
}
// 提交谈心谈话记录
export function submitTalkRecord(data) {
  return request({ url: '/counselor/talk', method: 'post', data })
}
// 我的谈心谈话记录列表
export function getMyTalkList() {
  return request({ url: '/counselor/talk/myList', method: 'get' })
}
