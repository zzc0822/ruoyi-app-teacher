import request from '@/utils/request'

/**
 * 谈话管理公共API（移动端）
 * 使用ruoyi-api模块的公共接口
 */

// 获取谈话记录列表
export function listTalk(query) {
  return request({
    url: '/api/talk/list',
    method: 'get',
    params: query
  })
}

// 获取谈话记录详情
export function getTalk(id) {
  return request({
    url: '/api/talk/' + id,
    method: 'get'
  })
}

// 新增谈话记录
export function addTalk(data) {
  return request({
    url: '/api/talk',
    method: 'post',
    data: data
  })
}

// 修改谈话记录
export function updateTalk(data) {
  return request({
    url: '/api/talk',
    method: 'put',
    data: data
  })
}

// 删除谈话记录
export function deleteTalk(ids) {
  return request({
    url: '/api/talk/' + ids,
    method: 'delete'
  })
}

// 获取我的学生列表（支持学号/姓名模糊搜索）
export function getMyStudents(keyword) {
  const params = {}
  if (/^\d+$/.test(keyword)) {
    params.xh = keyword
  } else {
    params.studentName = keyword
  }
  return request({
    url: '/api/mini/stuinfo/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 20, ...params }
  })
}

// 获取待跟进的谈话记录
export function getPendingTalks() {
  return request({
    url: '/api/talk/pending',
    method: 'get'
  })
}

// 查询某次查课自动生成且未结束的谈话计划
export function getTalkByCheck(checkId) {
  return request({
    url: '/api/talk/byCheck',
    method: 'get',
    params: { checkId }
  })
}

// 获取违纪学生列表
export function getViolationStudents(checkDate, bjdm) {
  return request({
    url: '/api/talk/violationStudents',
    method: 'get',
    params: { checkDate, bjdm }
  })
}

// 获取限时谈话配置
export function getDeadlineConfig() {
  return request({
    url: '/api/talk/deadlineConfig',
    method: 'get'
  })
}

// 共享候选：本次谈话对象所在班级的现任班主任
export function getShareCandidates(talkId) {
  return request({
    url: '/api/talk/shareCandidates/' + talkId,
    method: 'get'
  })
}

// 某条谈话的有效共享名单
export function getTalkShares(talkId) {
  return request({
    url: '/api/talk/share/' + talkId,
    method: 'get'
  })
}

// 把整条谈话记录共享给指定班主任
export function shareTalk(talkId, toTeacherIds) {
  return request({
    url: '/api/talk/share',
    method: 'post',
    data: { talkId, toTeacherIds }
  })
}

// 撤销对某班主任的共享
export function revokeTalkShare(talkId, toTeacherId) {
  return request({
    url: '/api/talk/share/' + talkId + '/' + toTeacherId,
    method: 'delete'
  })
}
