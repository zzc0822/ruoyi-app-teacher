# 统一角色判断系统使用指南

## 📋 系统概述

提供全局统一的角色判断能力，支持整个小程序所有页面的角色识别和权限控制。

---

## 🎯 角色判断规则

| 角色 | roleName 关键词 | roleKey 关键词 | 返回类型 |
|------|----------------|---------------|---------|
| **书记** | `书记` | `secretary` | `'secretary'` |
| **辅导员** | `辅导员` | `counselor` | `'counselor'` |
| **管理员** | `管理员` | `admin` | `'admin'` |
| **教师** | - | - | `'teacher'` |

---

## 🚀 使用方式

### 方式1：直接导入函数（推荐）

**适用场景：** 单个页面只需要判断特定角色

```vue
<script>
import { isSecretary, isCounselor, isAdmin, getRoleType } from '@/utils/role'

export default {
  data() {
    return {
      isSecretaryRole: false
    }
  },
  onLoad() {
    // 获取角色
    const roles = this.$store.state.user.roles || []
    
    // 判断角色
    this.isSecretaryRole = isSecretary(roles)
    
    // 获取角色类型
    const roleType = getRoleType(roles)
    console.log('当前角色类型:', roleType)
  }
}
</script>
```

---

### 方式2：使用 Vue Mixin（推荐）

**适用场景：** 多个页面需要相同的角色判断逻辑

```vue
<script>
import { roleMixin } from '@/utils/roleSystem'

export default {
  mixins: [roleMixin],
  
  onLoad() {
    // 检查角色（自动加载用户信息）
    this.checkRole().then(result => {
      console.log('角色检查结果:', result)
      // result.isSecretaryRole
      // result.isAdminRole
      // result.isTeacherRole
      // result.roleType
    })
  }
}
</script>

<template>
  <view>
    <!-- 书记视图 -->
    <view v-if="isSecretaryRole">
      <text>这是书记专属内容</text>
    </view>
    
    <!-- 辅导员视图 -->
    <view v-if="roleType === 'counselor'">
      <text>这是辅导员专属内容</text>
    </view>
  </view>
</template>
```

---

### 方式3：使用 Computed Properties

**适用场景：** 需要响应式角色属性

```vue
<script>
import { createRoleComputed } from '@/utils/roleSystem'

export default {
  computed: {
    ...createRoleComputed()
  },
  
  methods: {
    doSomething() {
      if (this.isSecretaryRole) {
        // 书记逻辑
      }
      
      console.log('角色类型:', this.roleType)
    }
  }
}
</script>
```

---

### 方式4：全局原型（需要配置 main.js）

**适用场景：** 所有页面都能直接使用

**配置 main.js：**
```javascript
import RoleSystem from '@/utils/roleSystem'

Vue.use(RoleSystem)
```

**页面使用：**
```vue
<script>
export default {
  onLoad() {
    // 直接使用 this.$role
    const roles = this.$role.getUserRoles(this)
    const isSecretary = this.$role.isSecretary(roles)
    const roleType = this.$role.getRoleType(roles)
    
    console.log('是否书记:', isSecretary)
    console.log('角色类型:', roleType)
  }
}
</script>
```

---

## 📚 API 文档

### 基础判断函数

#### `isSecretary(roles)`
判断是否为书记角色

```javascript
import { isSecretary } from '@/utils/role'

const roles = this.$store.state.user.roles
const isSec = isSecretary(roles) // true or false
```

#### `isCounselor(roles)`
判断是否为辅导员角色

```javascript
import { isCounselor } from '@/utils/role'

const isCounsel = isCounselor(roles) // true or false
```

#### `isAdmin(roles)`
判断是否为管理员角色

```javascript
import { isAdmin } from '@/utils/role'

const isAdm = isAdmin(roles) // true or false
```

#### `isTeacher(roles)`
判断是否为普通教师角色

```javascript
import { isTeacher } from '@/utils/role'

const isTch = isTeacher(roles) // true or false
```

---

### 角色类型函数

#### `getRoleType(roles)`
获取角色类型标识

```javascript
import { getRoleType } from '@/utils/role'

const roleType = getRoleType(roles)
// 返回值：'secretary' | 'counselor' | 'admin' | 'teacher'
```

#### `getRoleDisplayName(roles)`
获取角色显示名称

```javascript
import { getRoleDisplayName } from '@/utils/role'

const displayName = getRoleDisplayName(roles)
// 返回值：'书记' | '辅导员' | '管理员' | '教师'
```

---

### 高级工具函数

#### `getUserRoles(vm)`
从 Vue 实例获取用户角色

```javascript
import { getUserRoles } from '@/utils/roleSystem'

const roles = getUserRoles(this)
```

#### `ensureUserInfoLoaded(vm)`
确保用户信息已加载

```javascript
import { ensureUserInfoLoaded } from '@/utils/roleSystem'

async onLoad() {
  await ensureUserInfoLoaded(this)
  // 用户信息已加载完成
}
```

#### `createRoleGuard(vm, allowedRoles)`
创建角色守卫（权限控制）

```javascript
import { createRoleGuard } from '@/utils/roleSystem'

onLoad() {
  const guard = createRoleGuard(this, ['secretary', 'admin'])
  
  if (!guard.isAllowed) {
    uni.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  
  // 有权限，继续执行
}
```

---

## 💡 实战示例

### 示例1：查课页面角色差异化

```vue
<template>
  <view>
    <!-- 书记视图：显示辅导员统计 -->
    <view v-if="isSecretaryRole">
      <text>辅导员查课统计</text>
      <!-- 统计图表 -->
    </view>
    
    <!-- 辅导员视图：显示我的班级 -->
    <view v-if="roleType === 'counselor'">
      <text>我的班级</text>
      <!-- 班级列表 -->
    </view>
  </view>
</template>

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
```

---

### 示例2：页面访问权限控制

```vue
<script>
import { createRoleGuard } from '@/utils/roleSystem'

export default {
  onLoad() {
    // 只允许书记和管理员访问
    const guard = createRoleGuard(this, ['secretary', 'admin'])
    
    if (!guard.isAllowed) {
      uni.showModal({
        title: '权限不足',
        content: '此页面仅书记和管理员可访问',
        showCancel: false,
        success: () => {
          uni.navigateBack()
        }
      })
      return
    }
    
    // 有权限，加载数据
    this.loadData()
  }
}
</script>
```

---

### 示例3：动态显示角色标签

```vue
<template>
  <view class="user-info">
    <text>{{ userName }}</text>
    <text class="role-tag" :class="'role-' + roleType">
      {{ roleDisplayName }}
    </text>
  </view>
</template>

<script>
import { getRoleType, getRoleDisplayName } from '@/utils/role'

export default {
  computed: {
    roleType() {
      const roles = this.$store.state.user.roles || []
      return getRoleType(roles)
    },
    roleDisplayName() {
      const roles = this.$store.state.user.roles || []
      return getRoleDisplayName(roles)
    }
  }
}
</script>

<style>
.role-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.role-secretary {
  background: #ff9800;
  color: #fff;
}

.role-counselor {
  background: #2979ff;
  color: #fff;
}

.role-admin {
  background: #e43d33;
  color: #fff;
}

.role-teacher {
  background: #18bc37;
  color: #fff;
}
</style>
```

---

### 示例4：角色切换调试工具

```vue
<script>
import { roleMixin } from '@/utils/roleSystem'

export default {
  mixins: [roleMixin],
  
  methods: {
    debugRole() {
      console.log('========== 角色调试信息 ==========')
      console.log('用户角色列表:', this.userRoles)
      console.log('是否书记:', this.isSecretaryRole)
      console.log('是否辅导员:', this.userRoles.some(r => 
        typeof r === 'object' ? r.roleName?.includes('辅导员') : false
      ))
      console.log('是否管理员:', this.isAdminRole)
      console.log('是否教师:', this.isTeacherRole)
      console.log('角色类型:', this.roleType)
      console.log('=====================================')
    }
  }
}
</script>
```

---

## ⚠️ 注意事项

### 1. 角色数据格式支持

系统支持三种角色数据格式：

```javascript
// 格式1：字符串数组
roles = ["college_secretary"]

// 格式2：对象数组
roles = [
  { roleKey: "college_secretary", roleName: "学院书记" }
]

// 格式3：混合格式
roles = [
  "college_secretary",
  { roleKey: "counselor", roleName: "辅导员" }
]
```

### 2. 异步加载用户信息

如果用户信息可能未加载完成，使用 `await this.checkRole()`：

```javascript
async onLoad() {
  await this.checkRole()  // 自动加载用户信息
  // 现在可以安全使用 isSecretaryRole 等属性
}
```

### 3. 优先级规则

当用户有多个角色时，`getRoleType()` 按以下优先级返回：

1. 书记 (`secretary`)
2. 辅导员 (`counselor`)
3. 管理员 (`admin`)
4. 教师 (`teacher`)

### 4. 性能优化

如果页面频繁判断角色，建议在 `onLoad` 中一次性判断并缓存：

```javascript
data() {
  return {
    cachedRoleType: ''
  }
},

async onLoad() {
  await this.checkRole()
  this.cachedRoleType = this.roleType  // 缓存
},

methods: {
  doSomething() {
    if (this.cachedRoleType === 'secretary') {
      // 使用缓存，避免重复计算
    }
  }
}
```

---

## 📊 文件结构

```
RuoYi-App/utils/
├── role.js           # 基础角色判断函数
└── roleSystem.js     # 高级角色系统（Mixin、Computed、Guard）
```

---

## 🧪 测试清单

- [ ] 书记角色能正确识别
- [ ] 辅导员角色能正确识别
- [ ] 管理员角色能正确识别
- [ ] 普通教师角色能正确识别
- [ ] 多角色用户返回正确优先级
- [ ] 空角色数组不会报错
- [ ] 字符串格式角色能识别
- [ ] 对象格式角色能识别
- [ ] 混合格式角色能识别
- [ ] 页面访问权限控制正常
- [ ] 角色切换后视图更新

---

## 🚀 迁移指南

### 从旧代码迁移

**旧代码：**
```javascript
// ❌ 每个页面自己实现角色判断
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

**新代码：**
```javascript
// ✅ 使用统一系统
import { roleMixin } from '@/utils/roleSystem'

export default {
  mixins: [roleMixin],
  
  async onLoad() {
    await this.checkRole()  // 一行搞定
  }
}
```

---

**统一角色判断系统已就绪！开始使用吧！** 🎉
