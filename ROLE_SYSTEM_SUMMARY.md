# 统一角色判断系统 - 设计总结

## 🎉 已完成的工作

### 1. 核心角色判断函数 (`/utils/role.js`)

✅ **统一判断规则：**
- 书记：`roleName` 包含 "书记" 或 `roleKey` 包含 "secretary"
- 辅导员：`roleName` 包含 "辅导员" 或 `roleKey` 包含 "counselor"
- 管理员：`roleName` 包含 "管理员" 或 `roleKey` 包含 "admin"
- 教师：既不是书记、也不是辅导员、也不是管理员

✅ **导出函数：**
```javascript
isSecretary(roles)        // 判断是否书记
isCounselor(roles)        // 判断是否辅导员（新增）
isAdmin(roles)            // 判断是否管理员
isTeacher(roles)          // 判断是否教师
getRoleType(roles)        // 获取角色类型标识
getRoleDisplayName(roles) // 获取角色显示名称（新增）
```

---

### 2. 高级角色系统 (`/utils/roleSystem.js`)

✅ **Vue Mixin：**
```javascript
import { roleMixin } from '@/utils/roleSystem'

export default {
  mixins: [roleMixin],
  async onLoad() {
    await this.checkRole()
    // 现在可以使用：
    // - this.isSecretaryRole
    // - this.isAdminRole
    // - this.isTeacherRole
    // - this.roleType
    // - this.userRoles
  }
}
```

✅ **Computed Properties：**
```javascript
import { createRoleComputed } from '@/utils/roleSystem'

export default {
  computed: {
    ...createRoleComputed()
  }
}
```

✅ **角色守卫（权限控制）：**
```javascript
import { createRoleGuard } from '@/utils/roleSystem'

const guard = createRoleGuard(this, ['secretary', 'admin'])
if (!guard.isAllowed) {
  // 无权限处理
}
```

✅ **辅助函数：**
- `getUserRoles(vm)` - 获取用户角色
- `ensureUserInfoLoaded(vm)` - 确保用户信息已加载

---

## 📊 角色数据格式支持

系统自动支持三种格式：

```javascript
// 格式1：字符串数组
["college_secretary"]

// 格式2：对象数组
[{ roleKey: "college_secretary", roleName: "学院书记" }]

// 格式3：混合格式
["college_secretary", { roleKey: "counselor", roleName: "辅导员" }]
```

---

## 🎯 使用场景

### 场景1：视图差异化显示

```vue
<template>
  <view>
    <!-- 书记视图 -->
    <view v-if="isSecretaryRole">
      <text>辅导员查课统计</text>
    </view>
    
    <!-- 辅导员视图 -->
    <view v-if="roleType === 'counselor'">
      <text>我的学生</text>
    </view>
    
    <!-- 管理员视图 -->
    <view v-if="isAdminRole">
      <text>系统管理</text>
    </view>
  </view>
</template>
```

### 场景2：页面访问权限控制

```javascript
onLoad() {
  const guard = createRoleGuard(this, ['secretary', 'admin'])
  
  if (!guard.isAllowed) {
    uni.showModal({
      title: '权限不足',
      content: '此页面仅书记和管理员可访问',
      showCancel: false,
      success: () => uni.navigateBack()
    })
  }
}
```

### 场景3：动态角色标签

```vue
<template>
  <text class="role-tag">{{ roleDisplayName }}</text>
</template>

<script>
import { getRoleDisplayName } from '@/utils/role'

export default {
  computed: {
    roleDisplayName() {
      const roles = this.$store.state.user.roles || []
      return getRoleDisplayName(roles)
    }
  }
}
</script>
```

---

## 📁 文件清单

| 文件 | 用途 | 说明 |
|------|------|------|
| `/utils/role.js` | 基础函数 | 角色判断核心逻辑 |
| `/utils/roleSystem.js` | 高级系统 | Mixin、Computed、Guard |
| `/ROLE_SYSTEM_GUIDE.md` | 完整文档 | 详细使用指南 |
| `/ROLE_QUICK_REFERENCE.md` | 快速参考 | 常用API速查 |

---

## 🚀 推荐用法

### 新页面开发（推荐 Mixin）

```vue
<script>
import { roleMixin } from '@/utils/roleSystem'

export default {
  mixins: [roleMixin],
  
  async onLoad() {
    await this.checkRole()
    
    if (this.isSecretaryRole) {
      this.loadSecretaryData()
    } else if (this.roleType === 'counselor') {
      this.loadCounselorData()
    }
  }
}
</script>

<template>
  <view>
    <view v-if="isSecretaryRole">书记内容</view>
    <view v-if="roleType === 'counselor'">辅导员内容</view>
  </view>
</template>
```

### 简单页面（直接导入）

```vue
<script>
import { isSecretary, getRoleType } from '@/utils/role'

export default {
  computed: {
    isSecretaryRole() {
      const roles = this.$store.state.user.roles || []
      return isSecretary(roles)
    }
  }
}
</script>
```

---

## ⚠️ 注意事项

### 1. 优先级规则

`getRoleType()` 返回角色的优先级：
1. 书记 (`secretary`)
2. 辅导员 (`counselor`)
3. 管理员 (`admin`)
4. 教师 (`teacher`)

### 2. 异步加载

如果用户信息可能未加载完成：

```javascript
async onLoad() {
  await this.checkRole()  // 自动加载用户信息
  // 安全使用角色属性
}
```

### 3. 性能优化

频繁判断角色时，建议缓存结果：

```javascript
data() {
  return {
    cachedRoleType: ''
  }
},

async onLoad() {
  await this.checkRole()
  this.cachedRoleType = this.roleType
}
```

---

## 🧪 测试检查清单

- [x] 书记角色判断正确
- [x] 辅导员角色判断正确（新增）
- [x] 管理员角色判断正确
- [x] 教师角色判断正确
- [x] 支持字符串格式角色
- [x] 支持对象格式角色
- [x] 支持混合格式角色
- [x] 多角色优先级正确
- [x] 空角色数组不报错
- [x] Vue Mixin 工作正常
- [x] Computed Properties 响应式
- [x] 角色守卫权限控制

---

## 📈 优势对比

### 旧方式（每个页面自己实现）

```javascript
// ❌ 重复代码，逻辑不一致
checkRole() {
  const roles = this.$store.state.user.roles
  this.isSecretaryRole = roles.some(role => {
    if (typeof role === 'object') {
      return role.roleKey === 'college_secretary'
    }
    return role === 'college_secretary'
  })
}
```

**问题：**
- ❌ 代码重复
- ❌ 逻辑可能不一致
- ❌ 维护困难
- ❌ 新增角色需要修改所有页面

### 新方式（统一系统）

```javascript
// ✅ 一行搞定，逻辑统一
import { roleMixin } from '@/utils/roleSystem'

export default {
  mixins: [roleMixin],
  async onLoad() {
    await this.checkRole()
  }
}
```

**优势：**
- ✅ 代码复用
- ✅ 逻辑统一
- ✅ 易于维护
- ✅ 新增角色只需修改一处

---

## 🎯 下一步建议

### 1. 全局安装（可选）

在 `main.js` 中安装到 Vue 原型：

```javascript
import RoleSystem from '@/utils/roleSystem'

Vue.use(RoleSystem)
```

然后所有页面可以直接使用：

```javascript
this.$role.isSecretary(roles)
this.$role.getRoleType(roles)
```

### 2. 迁移现有页面

逐步将现有页面的角色判断改为使用统一系统：

**查课列表页** (`pages/work/classcheck/index.vue`)
**查课新增页** (`pages/work/classcheck/add.vue`)

已在使用统一函数，无需修改。

### 3. 添加日志控制

生产环境可以关闭角色判断日志：

```javascript
// role.js
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG && isMatch) {
  console.log('[角色判断] 匹配到角色:', roleName, roleKey)
}
```

---

## ✅ 总结

**已创建：**
- ✅ 统一的角色判断规则
- ✅ 完整的工具函数库
- ✅ Vue Mixin 和 Computed 支持
- ✅ 角色守卫（权限控制）
- ✅ 详细的使用文档
- ✅ 快速参考卡片

**角色判断系统已完全统一，可以在整个小程序中使用！** 🎉
