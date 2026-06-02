import request from '@/utils/request'

// 查询待办列表
export function listTodo() {
  return request({
    url: '/api/mini/todo/list',
    method: 'get'
  })
}

// 获取未读待办数量
export function getUnreadCount() {
  return request({
    url: '/api/mini/todo/unreadCount',
    method: 'get'
  })
}

// 新增待办
export function addTodo(data) {
  return request({
    url: '/api/mini/todo',
    method: 'post',
    data: data
  })
}

// 删除待办
export function delTodo(id) {
  return request({
    url: '/api/mini/todo/delete/' + id,
    method: 'post'
  })
}

// 标记已读
export function markRead(id) {
  return request({
    url: '/api/mini/todo/read/' + id,
    method: 'post'
  })
}
