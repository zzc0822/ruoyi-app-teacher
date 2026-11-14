import request from '@/utils/request'

// 心理健康工作台：按当前角色返回测评、访谈、追踪待办和辅导员进度
export function getPsychWorkbench() {
  return request({
    url: '/psych/workbench/overview',
    method: 'get'
  })
}

// 学院/学校视野的辅导员心理工作进度
export function listPsychCounselors(params) {
  return request({
    url: '/psych/workbench/counselors',
    method: 'get',
    params: params || {}
  })
}

// 按人按次二次校验，返回单个学生明文身份并写入心理访问留痕
export function revealPsychIdentity(data) {
  return request({
    url: '/psych/privacy/reveal',
    method: 'post',
    data: data
  })
}
