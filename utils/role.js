/**
 * 角色判断工具函数
 * 用于根据用户角色显示不同的界面和功能
 * 
 * 统一角色判断规则：
 * - 学院书记：roleName包含"书记" 或 roleKey包含"secretary"，但不包含党支部书记
 * - 管理员：roleName包含"管理员" 或 roleKey包含"admin"
 * - 辅导员：roleName包含"辅导员" 或 roleKey包含"counselor"
 * - 班主任：roleName包含"班主任" 或 roleKey包含"headteacher"
 * - 党务干部：roleName包含"党务干部" 或 roleKey包含"party_cadre"
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
    
    const isBranchSecretary = (roleName.includes('支部') && roleName.includes('书记'))
      || (roleKey.includes('branch') && roleKey.includes('secretary'))

    // 学院书记与党支部书记分开识别，避免党支部书记被误判为学院级管理者。
    const isMatch = !isBranchSecretary
      && (roleName.includes('书记') || roleKey.includes('secretary'))
    
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
 * 判断是否为党务干部角色
 * @param {Array} roles - 用户角色列表（可能是字符串数组或对象数组）
 * @returns {Boolean}
 */
export function isPartyCadre(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }

  return roles.some(role => {
    let roleName = ''
    let roleKey = ''

    if (typeof role === 'string') {
      roleKey = role.toLowerCase()
      roleName = role
    } else if (typeof role === 'object') {
      roleName = role.roleName || ''
      roleKey = (role.roleKey || '').toLowerCase()
    }

    return roleName.includes('党务干部') || roleKey.includes('party_cadre')
  })
}

/**
 * 判断是否为班主任角色
 * @param {Array} roles - 用户角色列表（可能是字符串数组或对象数组）
 * @returns {Boolean}
 */
export function isHeadteacher(roles) {
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
    
    // 统一判断：roleName包含"班主任" 或 roleKey包含"headteacher"
    return roleName.includes('班主任') || roleKey.includes('headteacher')
  })
}

/**
 * 判断是否为普通教师角色（互斥逻辑：不具有任何特殊角色时才是教师）
 * @param {Array} roles - 用户角色列表
 * @returns {Boolean}
 */
export function isTeacher(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  
  // 不是书记、不是管理员、不是辅导员、不是班主任、不是党务干部，就是普通教师
  return !isSecretary(roles) && !isAdmin(roles) && !isCounselor(roles) && !isHeadteacher(roles) && !isPartyCadre(roles)
}

/**
 * 判断是否拥有教师角色（非互斥：只要角色列表中包含 teacher 角色键即可）
 * 用于判断是否应显示教学管理模块，即使同时拥有书记等其他角色
 * @param {Array} roles - 用户角色列表
 * @returns {Boolean}
 */
export function hasTeacherRole(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  
  return roles.some(role => {
    let roleKey = ''
    if (typeof role === 'string') {
      roleKey = role.toLowerCase()
    } else if (typeof role === 'object') {
      roleKey = (role.roleKey || '').toLowerCase()
    }
    return roleKey === 'teacher'
  })
}

/**
 * 判断是否为党支部书记（精确匹配，不含总支书记）
 * @param {Array} roles - 用户角色列表
 * @returns {Boolean}
 */
export function isBranchSecretary(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  return roles.some(role => {
    let roleName = ''
    let roleKey = ''
    if (typeof role === 'string') {
      roleKey = role.toLowerCase()
      roleName = role
    } else if (typeof role === 'object') {
      roleName = role.roleName || ''
      roleKey = (role.roleKey || '').toLowerCase()
    }
    return (roleName.includes('支部') && roleName.includes('书记'))
      || (roleKey.includes('branch') && roleKey.includes('secretary'))
  })
}

/**
 * 判断是否为学院总支书记（不含党支部书记）
 * @param {Array} roles - 用户角色列表
 * @returns {Boolean}
 */
export function isTopSecretary(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  return roles.some(role => {
    let roleName = ''
    let roleKey = ''
    if (typeof role === 'string') {
      roleKey = role.toLowerCase()
      roleName = role
    } else if (typeof role === 'object') {
      roleName = role.roleName || ''
      roleKey = (role.roleKey || '').toLowerCase()
    }
    const isBranchSecretary = (roleName.includes('支部') && roleName.includes('书记'))
      || (roleKey.includes('branch') && roleKey.includes('secretary'))
    return !isBranchSecretary && (
      roleKey === 'secretary'
      || roleKey === 'college_secretary'
      || roleName.includes('党总支书记')
      || roleName.includes('学院书记')
      || roleName.includes('党委书记')
    )
  })
}

/**
 * 获取角色类型标识（仅返回优先级最高的一个）
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
  if (isHeadteacher(roles)) {
    return 'headteacher'
  }
  if (isPartyCadre(roles)) {
    return 'partyCadre'
  }
  if (isAdmin(roles)) {
    return 'admin'
  }
  return 'teacher'
}

/**
 * 获取所有匹配的角色类型数组（支持多角色）
 * @param {Array} roles - 用户角色列表
 * @returns {Array<String>} - ['secretary', 'counselor', ...] 可能包含多个
 */
export function getRoleTypes(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return ['teacher']
  }
  const types = []
  if (isSecretary(roles)) types.push('secretary')
  if (isCounselor(roles)) types.push('counselor')
  if (isHeadteacher(roles)) types.push('headteacher')
  if (isPartyCadre(roles)) types.push('partyCadre')
  if (isAdmin(roles)) types.push('admin')
  if (types.length === 0) types.push('teacher')
  return types
}
