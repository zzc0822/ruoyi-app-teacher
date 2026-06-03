import request from '@/utils/request'

// 查询谈话记录列表
export function listTalk(query) {
  return request({
    url: '/api/mini/talk/list',
    method: 'get',
    params: query
  })
}

// 查询谈话记录详细
export function getTalk(id) {
  return request({
    url: '/api/mini/talk/' + id,
    method: 'get'
  })
}

// 新增谈话记录
export function addTalk(data) {
  return request({
    url: '/api/mini/talk',
    method: 'post',
    data: data
  })
}

// 修改谈话记录
export function updateTalk(data) {
  return request({
    url: '/api/mini/talk',
    method: 'put',
    data: data
  })
}

// 删除谈话记录
export function delTalk(ids) {
  return request({
    url: '/api/mini/talk/delete',
    method: 'post',
    data: ids
  })
}

// 获取待谈话记录
export function getPendingTalks() {
  return request({
    url: '/api/mini/talk/pending',
    method: 'get'
  })
}

// 获取我的学生
export function getMyStudents(keyword) {
  return request({
    url: '/api/mini/talk/myStudents',
    method: 'get',
    params: { keyword }
  })
}

// 获取谈话附件列表
export function getTalkAttachments(talkId) {
  return request({
    url: '/api/mini/talk/attachment/' + talkId,
    method: 'get'
  })
}

// 删除谈话附件
export function deleteTalkAttachment(id) {
  return request({
    url: '/api/mini/talk/attachment/delete/' + id,
    method: 'post'
  })
}

// 获取谈话统计数据
export function getTalkStats() {
  return request({
    url: '/api/mini/talk/stats',
    method: 'get'
  })
}

// 获取违纪学生列表（用于谈话对象选择）
export function getViolationStudents() {
  return request({
    url: '/api/mini/talk/violationStudents',
    method: 'get'
  })
}
