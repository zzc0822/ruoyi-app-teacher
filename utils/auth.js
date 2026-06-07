const TokenKey = 'App-Token'
const UserIdKey = 'App-UserId'

export function getToken() {
  return uni.getStorageSync(TokenKey)
}

export function setToken(token) {
  return uni.setStorageSync(TokenKey, token)
}

export function removeToken() {
  return uni.removeStorageSync(TokenKey)
}

/**
 * 获取用户ID
 * @returns {number|null} 用户ID
 */
export function getUserId() {
  return uni.getStorageSync(UserIdKey)
}

/**
 * 设置用户ID
 * @param {number} userId 用户ID
 */
export function setUserId(userId) {
  return uni.setStorageSync(UserIdKey, userId)
}

/**
 * 移除用户ID
 */
export function removeUserId() {
  return uni.removeStorageSync(UserIdKey)
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
export function isLogin() {
  const token = getToken()
  return token !== '' && token !== null && token !== undefined
}
