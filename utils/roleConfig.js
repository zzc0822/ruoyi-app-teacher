/**
 * 角色视图配置
 * 根据用户角色控制页面和功能显示
 */

export const ROLE_CONFIG = {
  // 教师角色
  teacher: {
    // TabBar配置
    tabBar: [
      {
        pagePath: "pages/index",
        iconPath: "static/images/tabbar/home.png",
        selectedIconPath: "static/images/tabbar/home_.png",
        text: "首页"
      },
      {
        pagePath: "pages/work/index",
        iconPath: "static/images/tabbar/work.png",
        selectedIconPath: "static/images/tabbar/work_.png",
        text: "工作台"
      },
      {
        pagePath: "pages/mine/index",
        iconPath: "static/images/tabbar/mine.png",
        selectedIconPath: "static/images/tabbar/mine_.png",
        text: "我的"
      }
    ],
    // 功能权限
    features: {
      classcheck: true,    // 查课
      leave: true,         // 请假
      todo: true,          // 待办
      talk: true,          // 谈心谈话
      stuinfo: true        // 学生信息
    },
    // 首页路径
    homePage: "/pages/index"
  },
  
  // 学生角色
  student: {
    // TabBar配置
    tabBar: [
      {
        pagePath: "pages/student/tab",
        iconPath: "static/tabBar/home.png",
        selectedIconPath: "static/tabBar/home_active.png",
        text: "校园"
      },
      {
        pagePath: "pages/student/add",
        iconPath: "static/tabBar/add.png",
        selectedIconPath: "static/tabBar/add_active.png",
        text: "发布"
      },
      {
        pagePath: "pages/student/me",
        iconPath: "static/tabBar/mine.png",
        selectedIconPath: "static/tabBar/mine_active.png",
        text: "我的"
      }
    ],
    // 功能权限
    features: {
      publish: true,       // 发布内容
      comment: true,       // 评论
      like: true,          // 点赞
      campus: true         // 校园墙
    },
    // 首页路径
    homePage: "/pages/student/tab"
  }
}

/**
 * 根据角色获取配置
 * @param {Array} roles - 角色列表 ['teacher', 'student']
 * @returns {Object} 合并后的配置
 */
export function getConfigByRoles(roles = []) {
  let config = {
    tabBar: [],
    features: {},
    homePage: null, // 不预设默认值，让角色配置来决定
    roles: []
  }
  
  // 如果没有任何角色，默认学生
  if (!roles || roles.length === 0) {
    roles = ['student']
  }
  
  // 合并所有角色的配置
  roles.forEach(role => {
    const roleConfig = ROLE_CONFIG[role]
    if (roleConfig) {
      // 合并TabBar（去重）
      roleConfig.tabBar.forEach(item => {
        const exists = config.tabBar.find(t => t.pagePath === item.pagePath)
        if (!exists) {
          config.tabBar.push(item)
        }
      })
      
      // 合并功能权限
      Object.assign(config.features, roleConfig.features)
      
      // 使用第一个角色的首页
      if (!config.homePage) {
        config.homePage = roleConfig.homePage
      }
      
      config.roles.push(role)
    }
  })
  
  // 如果最终没有homePage，使用默认值
  if (!config.homePage) {
    config.homePage = "/pages/index"
  }
  
  return config
}

/**
 * 检查是否有指定权限
 * @param {Object} config - 角色配置
 * @param {String} feature - 功能标识
 * @returns {Boolean}
 */
export function hasFeature(config, feature) {
  return config.features[feature] === true
}
