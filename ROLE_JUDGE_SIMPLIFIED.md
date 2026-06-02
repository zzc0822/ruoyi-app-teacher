# 书记角色判断逻辑统一简化

## 📋 修改说明

统一简化书记角色判断逻辑，只保留两个核心关键词。

---

## 🎯 统一后的判断规则

### 关键词规则

| 字段 | 关键词 | 示例 | 匹配规则 |
|------|--------|------|---------|
| **roleName** | `书记` | "学院书记"、"书记"、"党委副书记" | `roleName.includes('书记')` |
| **roleKey** | `secretary` | "college_secretary"、"party_secretary" | `roleKey.includes('secretary')` |

### 移除的关键词

❌ 不再支持：
- `roleName`: "党务"、"主管"
- `roleKey`: "shuji"、"dangwu"

---

## ✅ 修改的文件

### 1. `/Users/zzc/IdeaProjects/RuoYi-App/utils/role.js`

**修改前：**
```javascript
const isMatch = roleName.includes('书记') || 
       roleName.includes('党务') ||
       roleName.includes('主管') ||
       roleKey.includes('secretary') ||
       roleKey.includes('shuji') ||
       roleKey.includes('dangwu')
```

**修改后：**
```javascript
// 统一判断：roleName包含"书记" 或 roleKey包含"secretary"
const isMatch = roleName.includes('书记') || roleKey.includes('secretary')
```

### 2. `/Users/zzc/IdeaProjects/RuoYi-App/pages/work/classcheck/index.vue`

**修改前：**
```javascript
// 使用项目统一的角色判断函数（统一使用college_secretary）
this.isSecretaryRole = isSecretary(roles)

// 额外检查：如果isSecretary失败，直接检查roleKey
if (!this.isSecretaryRole && roles.length > 0) {
  this.isSecretaryRole = roles.some(role => {
    // 支持对象格式
    if (typeof role === 'object') {
      return role.roleKey === 'college_secretary' || role.roleName === '书记'
    }
    // 支持字符串格式
    if (typeof role === 'string') {
      return role === 'college_secretary'
    }
    return false
  })
}
```

**修改后：**
```javascript
// 使用项目统一的角色判断函数
this.isSecretaryRole = isSecretary(roles)
```

### 3. `/Users/zzc/IdeaProjects/RuoYi-App/pages/work/classcheck/add.vue`

**已在之前修改：**
```javascript
import { isSecretary } from '@/utils/role'

// 使用项目统一的角色判断函数
this.isSecretaryRole = isSecretary(roles)
```

---

## 📊 判断逻辑说明

### isSecretary 函数完整实现

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
      // 字符串格式："college_secretary"
      roleKey = role.toLowerCase()
      roleName = role  // 保持原始大小写
    } else if (typeof role === 'object') {
      // 对象格式：{ roleName: '学院书记', roleKey: 'college_secretary' }
      roleName = role.roleName || ''
      roleKey = (role.roleKey || '').toLowerCase()
    }
    
    // 统一判断：roleName包含"书记" 或 roleKey包含"secretary"
    const isMatch = roleName.includes('书记') || roleKey.includes('secretary')
    
    // 调试日志
    if (isMatch) {
      console.log('[角色判断] 匹配到书记角色:', roleName, roleKey)
    }
    
    return isMatch
  })
}
```

---

## 🧪 测试用例

### ✅ 应该匹配的情况

| roleName | roleKey | 是否匹配 | 原因 |
|----------|---------|---------|------|
| "学院书记" | "college_secretary" | ✅ | roleName包含"书记" |
| "书记" | "secretary" | ✅ | 两者都匹配 |
| "党委副书记" | "deputy_secretary" | ✅ | roleName包含"书记" |
| "辅导员" | "college_secretary" | ✅ | roleKey包含"secretary" |
| "" | "party_secretary" | ✅ | roleKey包含"secretary" |

### ❌ 不应该匹配的情况

| roleName | roleKey | 是否匹配 | 原因 |
|----------|---------|---------|------|
| "党务主管" | "party_admin" | ❌ | 不包含关键词 |
| "辅导员" | "counselor" | ❌ | 不包含关键词 |
| "院长" | "dean" | ❌ | 不包含关键词 |
| "教师" | "teacher" | ❌ | 不包含关键词 |

---

## 📝 角色数据格式支持

### 格式1：字符串数组

```javascript
roles = ["college_secretary", "counselor"]
// ✅ 匹配：roleKey包含"secretary"
```

### 格式2：对象数组

```javascript
roles = [
  { roleKey: "college_secretary", roleName: "学院书记" },
  { roleKey: "counselor", roleName: "辅导员" }
]
// ✅ 匹配：roleName包含"书记" 且 roleKey包含"secretary"
```

### 格式3：混合格式

```javascript
roles = [
  "college_secretary",
  { roleKey: "counselor", roleName: "辅导员" }
]
// ✅ 匹配：第一个元素roleKey包含"secretary"
```

---

## 🔧 数据库配置

### sys_role 表配置示例

```sql
-- 书记角色配置
INSERT INTO sys_role (role_name, role_key, status) 
VALUES ('学院书记', 'college_secretary', '0');

-- 验证配置
SELECT role_id, role_name, role_key 
FROM sys_role 
WHERE role_key LIKE '%secretary%' OR role_name LIKE '%书记%';
```

### 用户角色关联

```sql
-- 查看用户的角色
SELECT u.user_id, u.user_name, r.role_name, r.role_key
FROM sys_user u
JOIN sys_user_role ur ON u.user_id = ur.user_id
JOIN sys_role r ON ur.role_id = r.role_id
WHERE u.user_name = '书记账号';
```

---

## ✅ 修改完成

**修改文件：**
1. ✅ `/Users/zzc/IdeaProjects/RuoYi-App/utils/role.js` - 简化判断逻辑
2. ✅ `/Users/zzc/IdeaProjects/RuoYi-App/pages/work/classcheck/index.vue` - 移除额外检查
3. ✅ `/Users/zzc/IdeaProjects/RuoYi-App/pages/work/classcheck/add.vue` - 使用统一函数

**统一规则：**
- ✅ `roleName` 只匹配：**书记**
- ✅ `roleKey` 只匹配：**secretary**
- ✅ 支持字符串和对象两种格式
- ✅ 所有书记相关页面使用统一判断逻辑

---

## 🚀 测试步骤

1. **清除小程序缓存并重新编译**
2. **使用书记账号重新登录**（roleName="学院书记", roleKey="college_secretary"）
3. **查看控制台日志**：
   ```
   [角色判断] 匹配到书记角色: 学院书记 college_secretary
   [查课页面] 是否为书记: true
   [查课新增] 是否为书记角色: true
   ```
4. **检查页面显示**：
   - ✅ 查课列表页显示"辅导员查课统计"
   - ✅ 查课新增页显示专业和年级筛选器

**书记角色判断逻辑已统一简化！** 🎉
