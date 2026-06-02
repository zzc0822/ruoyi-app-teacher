/**
 * 角色视图配置管理
 * 从数据库动态加载角色对应的视图配置
 */

import request from '@/utils/request'

// 本地缓存
const configCache = {}

/**
 * 获取当前用户的角色视图配置
 * @param {String} pageKey - 页面标识（如：stuinfo, work_index）
 * @returns {Object} 视图配置
 */
export async function getRoleViewConfig(pageKey) {
  try {
    // 先从缓存获取
    const cacheKey = `${pageKey}`
    if (configCache[cacheKey]) {
      return configCache[cacheKey]
    }
    
    // 从后端加载
    const config = await fetchRoleViewConfig(pageKey)
    
    // 缓存配置
    if (config) {
      configCache[cacheKey] = config
    }
    
    return config
  } catch (error) {
    // 加载失败时返回默认配置
    return getDefaultConfig(pageKey)
  }
}

/**
 * 从后端获取角色视图配置
 */
async function fetchRoleViewConfig(pageKey) {
  try {
    const res = await request({
      url: `/api/role-view-config/${pageKey}`,
      method: 'get'
    })
    
    // 后端返回的数据结构：res.data 是完整响应，res.data.data 是配置数据
    if (res.code === 200 && res.data) {
      // 如果 res.data 包含 config_json，解析它
      if (res.data.config_json) {
        const config = JSON.parse(res.data.config_json)
        return config
      }
      
      // 否则直接返回 res.data（后端已经将config_json的字段合并到data中）
      return res.data
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * 获取默认配置（后端不可用时使用）
 */
function getDefaultConfig(pageKey) {
  const defaults = {
    stuinfo: {
      viewType: 'class_list',
      showSidebar: true,
      sidebarExpanded: true,
      showClassList: true,
      showStudentList: true,
      showLeaveInfo: true,
      searchEnabled: true,
      searchTypes: ['student'],
      detailPopup: true
    },
    work_index: {
      viewType: 'default',
      showSummaryCards: false,
      showCommonFuncs: true,
      showStudentSection: true
    }
  }
  
  return defaults[pageKey] || {}
}

/**
 * 清除配置缓存
 */
export function clearConfigCache() {
  Object.keys(configCache).forEach(key => {
    delete configCache[key]
  })
}

/**
 * 预加载常用页面配置
 */
export async function preloadConfigs() {
  const pages = ['stuinfo', 'work_index', 'leave', 'classcheck', 'talk', 'todo']
  
  const promises = pages.map(pageKey => {
    return getRoleViewConfig(pageKey)
  })
  
  return Promise.all(promises)
}
