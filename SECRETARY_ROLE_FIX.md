# 书记角色视图不显示问题修复

## 🐛 问题描述

书记重新登录后，查课记录和新增查课页面都没有显示书记角色视图。

---

## 🔍 问题根因

**角色判断逻辑不一致**

### 问题位置

1. **index.vue（查课列表页）**
   - ✅ 使用了统一的 `isSecretary(roles)` 函数
   - ✅ 有多重fallback机制

2. **add.vue（查课新增页）**
   - ❌ 自己实现了角色判断逻辑
   - ❌ 只支持 `college_secretary` 角色标识
   - ❌ 不支持对象格式的 roleKey 和 roleName

### 原始代码（add.vue）

```javascript
// 判断是否为书记角色
this.isSecretaryRole = roles.some(role => {
  if (typeof role === 'object') {
    return role.roleKey === 'college_secretary' || role.roleName === '书记'
  }
  if (typeof role === 'string') {
    return role === 'college_secretary'
  }
  return false
})
```

**问题：**
- 只判断 `college_secretary`，不支持其他书记角色变体
- 不支持模糊匹配（如"党务主管"、"副书记"等）
- 与 index.vue 的判断逻辑不一致

---

## ✅ 修复方案

### 统一使用项目角色判断函数

**修改文件：** `/Users/zzc/IdeaProjects/RuoYi-App/pages/work/classcheck/add.vue`

#### 1. 导入 isSecretary 函数

```javascript
import { isSecretary } from '@/utils/role'
```

#### 2. 使用统一函数判断

```javascript
// 使用项目统一的角色判断函数
this.isSecretaryRole = isSecretary(roles)
```

---

## 📋 isSecretary 函数逻辑

**文件：** `/Users/zzc/IdeaProjects/RuoYi-App/utils/role.js`

```javascript
export function isSecretary(roles) {
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
    
    const isMatch = roleName.includes('书记') || 
           roleName.includes('党务') ||
           roleName.includes('主管') ||
           roleKey.includes('secretary') ||
           roleKey.includes('shuji') ||
           roleKey.includes('dangwu')
    
    return isMatch
  })
}
```

**支持的角色标识：**

| 类型 | 匹配规则 | 示例 |
|------|---------|------|
| roleName 包含 | '书记'、'党务'、'主管' | "学院书记"、"党务主管" |
| roleKey 包含 | 'secretary'、'shuji'、'dangwu' | "college_secretary"、"party_secretary" |
| 格式支持 | 字符串、对象 | `"college_secretary"` 或 `{roleKey: '...', roleName: '...'}` |

---

## 🧪 测试步骤

### 1. 清除缓存并重新登录

```
小程序开发者工具 → 清除缓存 → 重新编译
```

### 2. 使用书记账号登录

确认控制台输出：

```javascript
[查课页面] 从this.$store.state获取角色: [...]
[查课页面] 最终用户角色: [...]
[查课页面] 是否为书记: true
```

### 3. 检查查课列表页（index.vue）

应该看到：
- ✅ "辅导员查课统计" 卡片显示
- ✅ 条形图或热力图正常渲染
- ✅ 查课记录列表正常显示

### 4. 检查查课新增页（add.vue）

应该看到：
- ✅ 专业和年级筛选器显示
- ✅ 实到人数输入框显示（选择班级后）
- ✅ 请假学生列表显示
- ❌ 学生名单网格不显示（与辅导员不同）

---

## 📊 调试日志

### index.vue 调试信息

```javascript
[查课页面] ========== 调试信息 ==========
[查课页面] user_roles: [...]
[查课页面] user_id: xxx
[查课页面] user_name: xxx
[查课页面] this.$store.state.user: {...}
[查课页面] this.$store.state.user.roles: [...]
[查课页面] this.$store.getters.roles: [...]
[查课页面] 所有存储键: [...]
[查课页面] ======================================
```

### add.vue 调试信息

```javascript
[查课新增] ========== onLoad ==========
[查课新增] 开始检查角色
[查课新增] store: {...}
[查课新增] 从store获取角色: [...]
[查课新增] 是否为书记角色: true
[查课新增] isSecretaryRole: true
```

---

## 🔧 其他可能的问题

### 问题1：store 中没有 roles

**症状：**
```
[查课页面] this.$store.state.user.roles: undefined
```

**原因：**
- GetInfo 接口未调用或失败
- 登录流程未完成

**解决：**
```javascript
// ensureUserInfoLoaded 方法会自动检测并调用 GetInfo
this.ensureUserInfoLoaded()
```

### 问题2：roles 是空数组

**症状：**
```
[查课页面] 最终用户角色: []
[查课页面] 是否为书记: false
```

**原因：**
- 数据库中用户没有分配书记角色
- 角色配置错误

**解决：**
1. 检查数据库 `sys_user_role` 表
2. 确认用户关联的角色 ID
3. 检查 `sys_role` 表中角色的 `role_key` 字段

```sql
SELECT u.user_id, u.user_name, r.role_id, r.role_key, r.role_name
FROM sys_user u
LEFT JOIN sys_user_role ur ON u.user_id = ur.user_id
LEFT JOIN sys_role r ON ur.role_id = r.role_id
WHERE u.user_name = '书记账号';
```

### 问题3：角色格式不一致

**症状：**
- store 中 roles 是字符串数组：`["college_secretary"]`
- 或者 roles 是对象数组：`[{roleKey: 'college_secretary', roleName: '书记'}]`

**解决：**
- `isSecretary` 函数已支持两种格式
- 无需额外处理

---

## ✅ 修复完成

**修改文件：**
- `/Users/zzc/IdeaProjects/RuoYi-App/pages/work/classcheck/add.vue`

**修改内容：**
- ✅ 导入 `isSecretary` 函数
- ✅ 使用统一的角色判断逻辑
- ✅ 支持多种角色标识格式

**预期效果：**
- 书记角色登录后，查课列表页和新增页都能正确显示书记视图
- 角色判断逻辑统一，避免不一致问题
- 支持模糊匹配，提高兼容性

---

## 🚀 下一步

1. **清除小程序缓存并重新编译**
2. **使用书记账号重新登录**
3. **检查控制台日志，确认角色识别成功**
4. **测试查课列表页和新增页的书记视图**
5. **如有问题，提供控制台日志截图**
