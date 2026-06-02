/**
 * 角色判断工具函数
 * 用于根据用户角色显示不同的界面和功能
 * 
 * 统一角色判断规则：
 * - 书记：roleName包含"书记" 或 roleKey包含"secretary"
 * - 管理员：roleName包含"管理员" 或 roleKey包含"admin"
 * - 辅导员：roleName包含"辅导员" 或 roleKey包含"counselor"
 */

/**
 * 判断是否为书记角色
 * @param {Array} roles - 用户角色列表（可能是字符串数组或对象数组）
 * @returns {Boolean}
 */
export function isSecretary(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  
  return roles.some(role => {
    let roleName = ''
    let roleKey = ''
    
    // 支持字符串数组和对象数组
    if (typeof role === 'string') {
      // 字符串格式："college_secretary"
      roleKey = role.toLowerCase()
      roleName = role
    } else if (typeof role === 'object') {
      // 对象格式：{ roleName: '学院书记', roleKey: 'college_secretary' }
      roleName = role.roleName || ''
      roleKey = (role.roleKey || '').toLowerCase()
    }
    
    // 统一判断：roleName包含"书记" 或 roleKey包含"secretary"
    const isMatch = roleName.includes('书记') || roleKey.includes('secretary')
    
    return isMatch
  })
}

/**
 * 判断是否为管理员角色
 * @param {Array} roles - 用户角色列表（可能是字符串数组或对象数组）
 * @returns {Boolean}
 */
export function isAdmin(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  
  return roles.some(role => {
    let roleName = ''
    let roleKey = ''
    
    // 支持字符串数组和对象数组
    if (typeof role === 'string') {
      roleKey = role.toLowerCase()
      roleName = role.toLowerCase()
    } else if (typeof role === 'object') {
      roleName = (role.roleName || '').toLowerCase()
      roleKey = (role.roleKey || '').toLowerCase()
    }
    
    return roleName.includes('admin') || 
           roleKey.includes('admin') ||
           roleName.includes('管理员')
  })
}

/**
 * 判断是否为辅导员角色
 * @param {Array} roles - 用户角色列表（可能是字符串数组或对象数组）
 * @returns {Boolean}
 */
export function isCounselor(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  
  return roles.some(role => {
    let roleName = ''
    let roleKey = ''
    
    // 支持字符串数组和对象数组
    if (typeof role === 'string') {
      roleKey = role.toLowerCase()
      roleName = role
    } else if (typeof role === 'object') {
      roleName = role.roleName || ''
      roleKey = (role.roleKey || '').toLowerCase()
    }
    
    // 统一判断：roleName包含"辅导员" 或 roleKey包含"counselor"
    return roleName.includes('辅导员') || roleKey.includes('counselor')
  })
}

/**
 * 判断是否为普通教师角色
 * @param {Array} roles - 用户角色列表
 * @returns {Boolean}
 */
export function isTeacher(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  
  // 不是书记、不是管理员、不是辅导员，就是普通教师
  return !isSecretary(roles) && !isAdmin(roles) && !isCounselor(roles)
}

/**
 * 获取角色类型标识
 * @param {Array} roles - 用户角色列表
 * @returns {String} - 'secretary' | 'counselor' | 'admin' | 'teacher'
 */
export function getRoleType(roles) {
  if (isSecretary(roles)) {
    return 'secretary'
  }
  if (isCounselor(roles)) {
    return 'counselor'
  }
  if (isAdmin(roles)) {
    return 'admin'
  }
  return 'teacher'
}

/**
 * 获取角色显示名称
 * @param {Array} roles - 用户角色列表
 * @returns {String} - 角色显示名称
 */
export function getRoleDisplayName(roles) {
  const type = getRoleType(roles)
  const roleMap = {
    'secretary': '书记',
    'counselor': '辅导员',
    'admin': '管理员',
    'teacher': '教师'
  }
  return roleMap[type] || '用户'
}
