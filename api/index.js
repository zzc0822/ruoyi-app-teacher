/**
 * 教师端小程序 API 统一入口
 * 按业务域组织，便于维护和查找
 */

// 认证模块（登录/注册/微信绑定）
export * as auth from './auth'

// 学生管理模块（学生信息/统计）
export * as student from './student'

// 日常工作模块（课表/查课/请假/谈话/待办）
export * as work from './work'

// 学生事务模块（外宿/车辆/班主任/附件）
export * as affair from './affair'

// 党务管理模块
export * as party from './party'

// 校园信息模块（信息墙/广告/角色配置）
export * as campus from './campus'

// 系统模块（用户/字典）
export * as system from './system'
