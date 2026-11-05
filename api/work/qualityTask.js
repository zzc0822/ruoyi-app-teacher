import request from '@/utils/request'

// 指派给本人的数据质量整改任务
export function listMyQualityTasks() {
  return request({
    url: '/analysis/quality/my-tasks',
    method: 'get'
  })
}

// 任务详情，含处理记录
export function getMyQualityTask(taskId) {
  return request({
    url: '/analysis/quality/my-task',
    method: 'get',
    params: { taskId }
  })
}

// 任务涉及的学生明细
export function listMyTaskStudents(params) {
  return request({
    url: '/analysis/quality/my-task-students',
    method: 'get',
    params
  })
}

// 推进整改状态
export function changeMyTaskStatus(data) {
  return request({
    url: '/analysis/quality/my-task/status',
    method: 'put',
    data
  })
}
