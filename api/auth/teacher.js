import request from '@/utils/request'

// 教师手机号一键绑定
export function teacherPhoneBind(phoneCode, loginCode) {
  return request({
    url: '/api/auth/teacherPhoneBind',
    headers: { isToken: false },
    method: 'post',
    data: { phoneCode, loginCode }
  })
}
