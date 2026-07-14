import request from '@/utils/request'

// 教师点名提交
export function submitRollCall(data) {
  return request({
    url: '/stumanage/classcheck/teacher/rollcall',
    method: 'post',
    data: data
  })
}

// 教师点名状态查询
export function getCheckStatus(bjdm, checkDate, lessonNo) {
  return request({
    url: '/stumanage/classcheck/teacher/checkStatus',
    method: 'get',
    params: { bjdm, checkDate, lessonNo }
  })
}

// 获取班级学生名单
export function getClassStudents(bjdm) {
  return request({
    url: '/stumanage/classcheck/classStudents',
    method: 'get',
    params: { bjdm }
  })
}

// 获取请假学生名单
export function getLeaveStudents(bjdm, checkDate) {
  return request({
    url: '/stumanage/classcheck/leaveStudents',
    method: 'get',
    params: { bjdm, checkDate }
  })
}

// 获取教师本学期班级列表
export function getTeacherClasses() {
  return request({
    url: '/stumanage/classcheck/teacher/classes',
    method: 'get'
  })
}

// 获取教师考勤报表
export function getTeacherReport(params) {
  return request({
    url: '/stumanage/classcheck/teacher/report',
    method: 'get',
    params: params
  })
}

// 获取教师考勤报表-网格视图（按学生+周次）
export function getTeacherReportGrid(bjdm) {
  return request({
    url: '/stumanage/classcheck/teacher/report/grid',
    method: 'get',
    params: { bjdm }
  })
}
