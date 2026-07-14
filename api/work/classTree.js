import request from '@/utils/request'

/**
 * 班级树公共API（移动端）
 * 使用ruoyi-api模块的公共接口
 */

// 根据用户角色获取学院-班级树结构
export function getClassTreeByRole() {
  return request({
    url: '/api/classtree/treeByRole',
    method: 'get'
  })
}

// 获取我的班级列表
export function getMyClasses() {
  return request({
    url: '/api/classtree/myClasses',
    method: 'get'
  })
}

// 获取班级学生列表
export function getClassStudents(bjdm) {
  return request({
    url: '/api/classtree/classStudents',
    method: 'get',
    params: { bjdm }
  })
}
