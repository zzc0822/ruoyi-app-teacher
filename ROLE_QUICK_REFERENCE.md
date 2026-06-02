# 角色判断系统 - 快速参考

## 🎯 角色规则

| 角色 | roleName | roleKey | 类型标识 |
|------|----------|---------|---------|
| 书记 | 包含"书记" | 包含"secretary" | `secretary` |
| 辅导员 | 包含"辅导员" | 包含"counselor" | `counselor` |
| 管理员 | 包含"管理员" | 包含"admin" | `admin` |
| 教师 | - | - | `teacher` |

---

## 📦 导入

```javascript
// 基础函数
import { isSecretary, isCounselor, isAdmin, isTeacher, getRoleType, getRoleDisplayName } from '@/utils/role'

// 高级工具
import { roleMixin, createRoleComputed, createRoleGuard } from '@/utils/roleSystem'
```

---

## ⚡ 最简用法

### 方法1：Mixin（推荐）

```vue
<script>
import { roleMixin } from '@/utils/roleSystem'

export default {
  mixins: [roleMixin],
  async onLoad() {
    await this.checkRole()
  }
}
</script>

<template>
  <view v-if="isSecretaryRole">书记内容</view>
  <view v-if="roleType === 'counselor'">辅导员内容</view>
</template>
```

### 方法2：函数调用

```vue
<script>
import { isSecretary, getRoleType } from '@/utils/role'

export default {
  computed: {
    isSecretaryRole() {
      const roles = this.$store.state.user.roles || []
      return isSecretary(roles)
    },
    roleType() {
      const roles = this.$store.state.user.roles || []
      return getRoleType(roles)
    }
  }
}
</script>
```

---

## 🔧 常用函数

```javascript
// 判断角色
isSecretary(roles)     // 是否书记
isCounselor(roles)     // 是否辅导员
isAdmin(roles)         // 是否管理员
isTeacher(roles)       // 是否教师

// 获取类型
getRoleType(roles)         // 'secretary' | 'counselor' | 'admin' | 'teacher'
getRoleDisplayName(roles)  // '书记' | '辅导员' | '管理员' | '教师'
```

---

## 🛡️ 权限控制

```javascript
import { createRoleGuard } from '@/utils/roleSystem'

onLoad() {
  const guard = createRoleGuard(this, ['secretary', 'admin'])
  
  if (!guard.isAllowed) {
    uni.showToast({ title: '无权限', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
}
```

---

## 📊 优先级

多角色时，`getRoleType()` 返回优先级：
1. 书记
2. 辅导员
3. 管理员
4. 教师

---

## 📁 文件位置

- `/utils/role.js` - 基础判断函数
- `/utils/roleSystem.js` - 高级系统（Mixin、Guard）
- `/ROLE_SYSTEM_GUIDE.md` - 完整文档
