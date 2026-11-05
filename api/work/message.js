import request from '@/utils/request'

// 当前用户站内信列表
export function listMessages(params) {
  return request({
    url: '/api/message/list',
    method: 'get',
    params
  })
}

// 当前用户未读消息数
export function getUnreadCount() {
  return request({
    url: '/api/message/unreadCount',
    method: 'get'
  })
}

// 标记单条已读
export function markMessageRead(id) {
  return request({
    url: '/api/message/read/' + id,
    method: 'put'
  })
}

// 全部标记已读
export function markAllMessagesRead() {
  return request({
    url: '/api/message/readAll',
    method: 'put'
  })
}
