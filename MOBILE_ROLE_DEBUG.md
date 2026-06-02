# 手机预览角色识别失败 - 诊断与修复

## 🐛 问题现象

- ✅ 开发者工具：书记角色正常显示
- ❌ 手机预览：不是书记角色

---

## 🔍 问题根因分析

### 可能原因1：手机预览时 GetInfo 未调用

**问题：**
```javascript
// store/modules/user.js
state: {
  roles: storage.get(constant.roles),  // 从本地存储读取
}
```

如果手机预览时：
1. 登录成功，获取了 token
2. 但没有调用 `GetInfo` 获取角色信息
3. 本地存储中没有 `user_roles`
4. 导致 `roles = []` 或 `roles = ['ROLE_DEFAULT']`

---

### 可能原因2：手机缓存未清除

**问题：**
- 开发者工具清除缓存后重新编译
- 但手机端缓存未清除
- 使用的是旧的角色数据

---

### 可能原因3：网络请求失败

**问题：**
- 手机访问后端 API 地址不正确
- 后端服务未监听局域网 IP
- 导致 `GetInfo` 请求失败

---

## ✅ 诊断步骤

### 步骤1：添加详细调试日志

在查课页面添加完整的诊断信息：

```javascript
// pages/work/classcheck/index.vue 或 add.vue
onLoad() {
  console.log('========== 角色诊断信息 ==========')
  
  // 1. 检查 store
  console.log('1. Store 状态:')
  console.log('   token:', this.$store.state.user.token)
  console.log('   roles:', this.$store.state.user.roles)
  console.log('   roles 类型:', typeof this.$store.state.user.roles)
  console.log('   roles 长度:', this.$store.state.user.roles?.length)
  
  // 2. 检查本地存储
  console.log('2. 本地存储:')
  try {
    const storedRoles = uni.getStorageSync('user_roles')
    console.log('   user_roles:', storedRoles)
    console.log('   user_roles 类型:', typeof storedRoles)
  } catch (e) {
    console.error('   读取失败:', e)
  }
  
  // 3. 检查角色判断
  const roles = this.$store.state.user.roles || []
  console.log('3. 角色判断:')
  console.log('   原始 roles:', roles)
  console.log('   是否为书记:', this.isSecretaryRole)
  
  console.log('=====================================')
}
```

---

### 步骤2：检查网络请求

在手机开发者工具中查看 Network：

```
1. 打开调试器
2. 切换到 Network 标签
3. 查看是否有 getInfo 请求
4. 检查请求状态码（应该是 200）
5. 检查响应数据中的 roles 字段
```

**正常响应示例：**
```json
{
  "code": 200,
  "msg": "操作成功",
  "user": {
    "userId": 1,
    "userName": "书记账号"
  },
  "roles": [
    {
      "roleId": 1,
      "roleName": "学院书记",
      "roleKey": "college_secretary"
    }
  ],
  "permissions": ["*:*:*"]
}
```

---

### 步骤3：检查后端服务配置

确认后端服务允许局域网访问：

**application.yml：**
```yaml
server:
  address: 0.0.0.0  # 必须配置，允许局域网访问
  port: 8080
```

**检查方法：**
```bash
# 在电脑上执行
curl http://你的电脑IP:8080/getInfo
```

---

## 🛠️ 修复方案

### 方案1：确保 GetInfo 被调用

修改 `permission.js`，在已登录但未获取用户信息时自动调用：

```javascript
import { getToken } from '@/utils/auth'

// 在页面跳转时检查
list.forEach(item => {
  uni.addInterceptor(item, {
    invoke(to) {
      if (getToken()) {
        // 已登录，检查是否有用户信息
        const store = getApp().$store
        if (store && store.state && store.state.user) {
          const hasToken = !!store.state.user.token
          const hasRoles = store.state.user.roles && store.state.user.roles.length > 0
          
          // 有 token 但没有 roles，说明 GetInfo 未调用
          if (hasToken && !hasRoles) {
            console.log('[权限拦截] 检测到未获取用户信息，调用 GetInfo')
            store.dispatch('GetInfo').catch(err => {
              console.error('[权限拦截] GetInfo 失败:', err)
            })
          }
        }
        
        return true
      } else {
        // 未登录逻辑...
      }
    }
  })
})
```

---

### 方案2：在 App.vue 中确保加载

修改 `App.vue` 的 `onLaunch`：

```javascript
export default {
  onLaunch() {
    const store = this.$store
    const token = store.state.user.token
    
    if (token) {
      const hasRoles = store.state.user.roles && store.state.user.roles.length > 0
      
      if (!hasRoles) {
        console.log('[App] 检测到已登录但未获取用户信息，调用 GetInfo')
        store.dispatch('GetInfo').then(() => {
          console.log('[App] GetInfo 成功，角色:', store.state.user.roles)
        }).catch(err => {
          console.error('[App] GetInfo 失败:', err)
        })
      }
    }
  }
}
```

---

### 方案3：手动触发 GetInfo

在查课页面添加手动刷新按钮：

```vue
<template>
  <view>
    <!-- 调试按钮 -->
    <button v-if="debugMode" @click="refreshUserInfo">
      刷新用户信息
    </button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      debugMode: true  // 调试模式
    }
  },
  
  methods: {
    async refreshUserInfo() {
      try {
        uni.showLoading({ title: '刷新中...' })
        
        await this.$store.dispatch('GetInfo')
        
        console.log('[刷新] 用户信息已更新')
        console.log('[刷新] roles:', this.$store.state.user.roles)
        
        // 重新检查角色
        await this.checkRole()
        
        uni.showToast({ title: '刷新成功', icon: 'success' })
      } catch (err) {
        console.error('[刷新] 失败:', err)
        uni.showToast({ title: '刷新失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>
```

---

## 📱 手机测试步骤

### 1. 完全清除缓存

**方法1：小程序开发者工具**
```
工具 → 清除缓存 → 清除全部缓存
```

**方法2：手机端**
```
微信 → 发现 → 小程序 → 长按小程序 → 删除
重新扫码进入
```

### 2. 重新登录

```
1. 退出登录
2. 重新输入书记账号密码
3. 查看控制台日志
```

### 3. 查看诊断信息

应该看到：
```
[App] 检测到已登录但未获取用户信息，调用 GetInfo
[App] GetInfo 成功，角色: [{roleName: '学院书记', roleKey: 'college_secretary'}]
[角色系统] 角色检查完成: {isSecretary: true, roleType: 'secretary'}
```

---

## 🔧 快速诊断脚本

创建一个临时诊断页面 `/pages/debug/role.vue`：

```vue
<template>
  <view class="debug-page">
    <view class="section">
      <text class="title">Store 状态</text>
      <text>Token: {{ token }}</text>
      <text>Roles: {{ roles }}</text>
      <text>Roles 类型: {{ rolesType }}</text>
    </view>
    
    <view class="section">
      <text class="title">本地存储</text>
      <text>user_roles: {{ storedRoles }}</text>
    </view>
    
    <view class="section">
      <text class="title">角色判断</text>
      <text>isSecretary: {{ isSecretary }}</text>
      <text>roleType: {{ roleType }}</text>
    </view>
    
    <button @click="refresh">刷新用户信息</button>
    <button @click="clearCache">清除缓存并重新登录</button>
  </view>
</template>

<script>
import { isSecretary, getRoleType } from '@/utils/role'

export default {
  computed: {
    token() {
      return this.$store.state.user.token || '无'
    },
    roles() {
      return JSON.stringify(this.$store.state.user.roles)
    },
    rolesType() {
      return typeof this.$store.state.user.roles
    },
    storedRoles() {
      try {
        return JSON.stringify(uni.getStorageSync('user_roles'))
      } catch (e) {
        return '读取失败'
      }
    },
    isSecretary() {
      const roles = this.$store.state.user.roles || []
      return isSecretary(roles)
    },
    roleType() {
      const roles = this.$store.state.user.roles || []
      return getRoleType(roles)
    }
  },
  
  methods: {
    async refresh() {
      try {
        await this.$store.dispatch('GetInfo')
        uni.showToast({ title: '刷新成功', icon: 'success' })
        this.$forceUpdate()
      } catch (err) {
        uni.showToast({ title: '刷新失败', icon: 'none' })
      }
    },
    
    clearCache() {
      uni.clearStorageSync()
      uni.reLaunch({ url: '/pages/login' })
    }
  }
}
</script>

<style>
.debug-page {
  padding: 20rpx;
}
.section {
  background: #f5f5f5;
  padding: 20rpx;
  margin-bottom: 20rpx;
  border-radius: 8rpx;
}
.title {
  font-weight: bold;
  font-size: 32rpx;
  margin-bottom: 10rpx;
}
</style>
```

---

## ✅ 预期结果

修复后，手机预览应该看到：

```
[查课页面] 从store获取角色: [{roleName: '学院书记', roleKey: 'college_secretary'}]
[查课页面] 是否为书记: true
[角色判断] 匹配到书记角色: 学院书记 college_secretary
```

**书记视图正常显示！**

---

## 📞 如果还是不行

请提供以下信息：

1. **控制台完整日志**（从 App onLaunch 到页面 onLoad）
2. **Network 面板截图**（查看 getInfo 请求）
3. **诊断页面截图**（如果有创建）
4. **后端服务 IP 配置**（application.yml 中的 server.address）
