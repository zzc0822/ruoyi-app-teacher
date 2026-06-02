/**
 * 统一角色判断系统
 * 用于整个小程序的角色识别和权限控制
 * 
 * 使用方法：
 * 1. 单个页面使用：import { isSecretary, isAdmin } from '@/utils/role'
 * 2. Vue Mixin 使用：mixins: [roleMixin]
 * 3. 计算属性使用：computed: { ...roleComputed }
 */

import { isSecretary, isAdmin, isTeacher, getRoleType } from './role'

/**
 * 角色配置常量
 */
export const ROLE_CONFIG = {
  // 书记角色关键词
  SECRETARY: {
    nameKeyword: '书记',
    keyKeyword: 'secretary'
  },
  // 管理员角色关键词
  ADMIN: {
    nameKeyword: '管理员',
    keyKeyword: 'admin'
  },
  // 辅导员角色关键词（预留）
  COUNSELOR: {
    nameKeyword: '辅导员',
    keyKeyword: 'counselor'
  }
}

/**
 * 从 store 获取用户角色
 * @param {Object} vm - Vue 实例 (this)
 * @returns {Array} 角色数组
 */
export function getUserRoles(vm) {
  if (!vm || !vm.$store) {
    console.warn('[角色系统] 无法获取 store')
    return []
  }
  
  const store = vm.$store
  
  // 方式1：从 store.state.user.roles 获取
  if (store.state && store.state.user && store.state.user.roles) {
    return store.state.user.roles
  }
  
  // 方式2：从 store.getters.roles 获取
  if (store.getters && store.getters.roles) {
    return store.getters.roles
  }
  
  // 方式3：从本地存储获取（备用）
  try {
    const roles = uni.getStorageSync('user_roles')
    if (roles) {
      return Array.isArray(roles) ? roles : []
    }
  } catch (e) {
    console.error('[角色系统] 获取本地存储角色失败:', e)
  }
  
  return []
}

/**
 * 确保用户信息已加载
 * @param {Object} vm - Vue 实例 (this)
 * @returns {Promise}
 */
export async function ensureUserInfoLoaded(vm) {
  if (!vm || !vm.$store) {
    console.warn('[角色系统] 无法获取 store')
    return Promise.reject('Store not available')
  }
  
  const store = vm.$store
  
  // 如果有 token 但没有 roles，调用 GetInfo
  if (store.state && store.state.user) {
    const hasToken = !!store.state.user.token
    const hasRoles = store.state.user.roles && store.state.user.roles.length > 0
    
    if (hasToken && !hasRoles) {
      console.log('[角色系统] 检测到有 token 但无 roles，调用 GetInfo...')
      try {
        await store.dispatch('GetInfo')
        console.log('[角色系统] GetInfo 成功')
        return Promise.resolve()
      } catch (err) {
        console.error('[角色系统] GetInfo 失败:', err)
        return Promise.reject(err)
      }
    }
  }
  
  return Promise.resolve()
}

/**
 * Vue Mixin - 角色判断
 * 在页面中混入此 mixin 即可获得 isSecretaryRole 等计算属性
 * 
 * 使用示例：
 * export default {
 *   mixins: [roleMixin],
 *   onLoad() {
 *     this.checkRole() // 检查角色
 *   }
 * }
 */
export const roleMixin = {
  data() {
    return {
      isSecretaryRole: false,  // 是否为书记角色
      isAdminRole: false,      // 是否为管理员角色
      isTeacherRole: false,    // 是否为普通教师角色
      roleType: '',            // 角色类型：'secretary' | 'admin' | 'teacher'
      userRoles: []            // 用户角色列表
    }
  },
  
  methods: {
    /**
     * 检查并设置用户角色
     * @param {Boolean} autoLoad - 是否自动加载用户信息（默认 true）
     */
    async checkRole(autoLoad = true) {
      try {
        // 确保用户信息已加载
        if (autoLoad) {
          await ensureUserInfoLoaded(this)
        }
        
        // 获取角色
        this.userRoles = getUserRoles(this)
        
        // 判断角色
        this.isSecretaryRole = isSecretary(this.userRoles)
        this.isAdminRole = isAdmin(this.userRoles)
        this.isTeacherRole = isTeacher(this.userRoles)
        this.roleType = getRoleType(this.userRoles)
        
        console.log('[角色系统] 角色检查完成:', {
          roles: this.userRoles,
          isSecretary: this.isSecretaryRole,
          isAdmin: this.isAdminRole,
          isTeacher: this.isTeacherRole,
          roleType: this.roleType
        })
        
        return {
          isSecretaryRole: this.isSecretaryRole,
          isAdminRole: this.isAdminRole,
          isTeacherRole: this.isTeacherRole,
          roleType: this.roleType
        }
      } catch (err) {
        console.error('[角色系统] 角色检查失败:', err)
        return {
          isSecretaryRole: false,
          isAdminRole: false,
          isTeacherRole: false,
          roleType: 'teacher'
        }
      }
    }
  }
}

/**
 * Vue Computed Properties - 角色判断
 * 在 computed 中展开即可获得响应式角色属性
 * 
 * 使用示例：
 * import { createRoleComputed } from '@/utils/roleSystem'
 * 
 * export default {
 *   computed: {
 *     ...createRoleComputed()
 *   }
 * }
 */
export function createRoleComputed() {
  return {
    isSecretaryRole() {
      const roles = getUserRoles(this)
      return isSecretary(roles)
    },
    isAdminRole() {
      const roles = getUserRoles(this)
      return isAdmin(roles)
    },
    isTeacherRole() {
      const roles = getUserRoles(this)
      return isTeacher(roles)
    },
    roleType() {
      const roles = getUserRoles(this)
      return getRoleType(roles)
    },
    userRoles() {
      return getUserRoles(this)
    }
  }
}

/**
 * 创建角色守卫
 * 用于页面访问权限控制
 * 
 * 使用示例：
 * import { createRoleGuard } from '@/utils/roleSystem'
 * 
 * export default {
 *   onLoad() {
 *     const guard = createRoleGuard(this, ['secretary', 'admin'])
 *     if (!guard.isAllowed) {
 *       uni.showToast({ title: '无权限访问', icon: 'none' })
 *       setTimeout(() => uni.navigateBack(), 1500)
 *     }
 *   }
 * }
 */
export function createRoleGuard(vm, allowedRoles = []) {
  const roles = getUserRoles(vm)
  const roleType = getRoleType(roles)
  
  const isAllowed = allowedRoles.includes(roleType) || allowedRoles.includes('*')
  
  return {
    isAllowed,
    roleType,
    roles
  }
}

/**
 * 全局角色工具对象
 * 可以直接在页面中使用 this.$role.xxx
 */
export const RoleUtil = {
  // 原始函数
  isSecretary,
  isAdmin,
  isTeacher,
  getRoleType,
  
  // 辅助函数
  getUserRoles,
  ensureUserInfoLoaded,
  createRoleGuard,
  
  // 配置
  ROLE_CONFIG,
  
  // Mixin 和 Computed
  roleMixin,
  createRoleComputed
}

/**
 * 安装到 Vue 原型
 * 在 main.js 中调用：Vue.use(RoleSystem)
 */
export function install(Vue) {
  Vue.prototype.$role = RoleUtil
  
  console.log('[角色系统] 已安装到 Vue 原型')
}

/**
 * 默认导出
 */
export default {
  install,
  RoleUtil,
  isSecretary,
  isAdmin,
  isTeacher,
  getRoleType,
  roleMixin,
  createRoleComputed,
  createRoleGuard,
  getUserRoles,
  ensureUserInfoLoaded,
  ROLE_CONFIG
}
