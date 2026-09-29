import request from '@/utils/request'

export function listSignSession(query) {
  return request({ url: '/stumanage/sign/session/list', method: 'get', params: query })
}

export function getSignSession(sessionId) {
  return request({ url: '/stumanage/sign/session/' + sessionId, method: 'get' })
}

export function addSignSession(data) {
  return request({ url: '/stumanage/sign/session', method: 'post', data })
}

export function updateSignSession(data) {
  return request({ url: '/stumanage/sign/session', method: 'put', data })
}

export function delSignSession(sessionId) {
  return request({ url: '/stumanage/sign/session/' + sessionId, method: 'delete' })
}

export function finishSignSession(sessionId) {
  return request({ url: '/stumanage/sign/session/finish/' + sessionId, method: 'put' })
}

export function cancelSignSession(sessionId) {
  return request({ url: '/stumanage/sign/session/cancel/' + sessionId, method: 'put' })
}

export function confirmSignSession(sessionId) {
  return request({ url: '/stumanage/sign/session/confirm/' + sessionId, method: 'put' })
}

export function rejectSignSession(sessionId) {
  return request({ url: '/stumanage/sign/session/reject/' + sessionId, method: 'put' })
}

export function getSignProgress(sessionId) {
  return request({ url: '/stumanage/sign/session/progress/' + sessionId, method: 'get' })
}

export function getSignStats(sessionId) {
  return request({ url: '/stumanage/sign/stats/' + sessionId, method: 'get' })
}

export function markSignRecord(recordId, signStatus) {
  return request({ url: '/stumanage/sign/record/mark/' + recordId, method: 'put', params: { signStatus } })
}

export function listSignRecord(query) {
  return request({ url: '/stumanage/sign/record/list', method: 'get', params: query })
}
