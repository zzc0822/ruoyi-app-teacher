import request from '@/utils/request'

const HEADTEACHER_VIEW = { viewScope: 'headteacher' }

/**
 * 班主任管理API（小程序端）
 * 使用ruoyi-api模块的公共接口
 */

// 查看我的班级列表
export function getMyClasses() {
  return request({
    url: '/api/headteacher/myClasses',
    method: 'get'
  })
}

// 查看班级详情（含学生基本信息）
export function getClassDetail(bjid) {
  return request({
    url: '/api/headteacher/classDetail/' + bjid,
    method: 'get'
  })
}

// 查看我的工作记录列表
export function listWorklog(query) {
  return request({
    url: '/api/headteacher/worklog/list',
    method: 'get',
    params: { ...(query || {}), ...HEADTEACHER_VIEW }
  })
}

// 登记表单上下文：本班生效的手册章节 + 班会应到人数（不传 bjid 则取本人第一个现任班级）
export function getWorklogContext(bjid) {
  return request({
    url: '/api/headteacher/worklog/context',
    method: 'get',
    params: bjid ? { bjid, ...HEADTEACHER_VIEW } : { ...HEADTEACHER_VIEW }
  })
}

// 获取工作记录详情
export function getWorklog(id) {
  return request({
    url: '/api/headteacher/worklog/' + id,
    method: 'get',
    params: { ...HEADTEACHER_VIEW }
  })
}

// 提交工作记录
export function addWorklog(data) {
  return request({
    url: '/api/headteacher/worklog',
    method: 'post',
    params: { ...HEADTEACHER_VIEW },
    data: data
  })
}

// 修改工作记录
export function updateWorklog(data) {
  return request({
    url: '/api/headteacher/worklog',
    method: 'put',
    params: { ...HEADTEACHER_VIEW },
    data: data
  })
}

// 删除工作记录
export function deleteWorklog(ids) {
  return request({
    url: '/api/headteacher/worklog/' + ids,
    method: 'delete',
    params: { ...HEADTEACHER_VIEW }
  })
}

// 查看我的工作量完成情况
export function getMyWorkload() {
  return request({
    url: '/api/headteacher/workload/my',
    method: 'get'
  })
}

// 可申请学院列表（本院优先，附空岗班级数）
export function getCollegeOptions() {
  return request({
    url: '/api/headteacher/apply/collegeOptions',
    method: 'get'
  })
}

// 提交班主任申请
export function submitApply(data) {
  return request({
    url: '/api/headteacher/apply',
    method: 'post',
    data: data
  })
}

// 提交前资格自检：{ok, reasons[], teacher:{...}, rule:{...}}
export function getApplyQualification() {
  return request({
    url: '/api/headteacher/apply/qualification',
    method: 'get'
  })
}

// 查看我的申请记录
export function getMyApply() {
  return request({
    url: '/api/headteacher/apply/my',
    method: 'get'
  })
}

// 查看我的工作证明列表
export function getMyCertificates() {
  return request({
    url: '/api/headteacher/certificate/my',
    method: 'get'
  })
}

// 检查是否可以生成工作证明
export function checkCertificate(certYear) {
  return request({
    url: '/api/headteacher/certificate/check/' + certYear,
    method: 'get'
  })
}

// 生成班主任工作证明
export function generateCertificate(certYear) {
  return request({
    url: '/api/headteacher/certificate/generate/' + certYear,
    method: 'post'
  })
}
