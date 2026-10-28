<template>
  <view class="mine-container">
    <view class="profile-section">
      <view class="profile-card">
        <image
          v-if="teacherPhoto"
          :src="teacherPhoto"
          class="teacher-avatar"
          mode="aspectFill"
          @click="handleToAvatar"
          @error="teacherPhoto = ''"
        />
        <view v-else class="avatar-placeholder" @click="handleToAvatar">
          <uni-icons type="person-filled" size="42" color="#0f766e" />
        </view>

        <view v-if="!teacherName" class="login-tip" @click="handleToLogin">
          点击登录
        </view>
        <view v-else class="user-info" @click="handleToInfo">
          <view class="name-row">
            <text class="teacher-name">{{ teacherName }}</text>
            <text v-if="teacherCollege" class="teacher-college">{{ teacherCollege }}</text>
          </view>
          <view
            class="role-row"
            :class="{ 'role-row-expanded': rolesExpanded }"
            @click.stop="toggleRoles"
          >
            <text class="role-label">当前角色</text>
            <view class="role-values">
              <text
                v-for="roleName in visibleRoleNames"
                :key="roleName"
                class="role-value"
              >
                {{ roleName }}
              </text>
            </view>
            <view v-if="hasOtherRoles" class="role-toggle">
              <uni-icons
                :type="rolesExpanded ? 'top' : 'bottom'"
                size="12"
                color="#0f766e"
              />
            </view>
          </view>
        </view>

        <view class="header-action" @click="handleToInfo">
          <text>资料</text>
          <uni-icons type="right" size="14" color="#64748b" />
        </view>
      </view>
    </view>

    <view class="content-section">
      <view class="menu-section">
        <text class="section-title">账号资料</text>
        <view class="menu-list">
          <view class="list-cell" @click="handleToInfo">
            <view class="menu-item-box">
              <view class="menu-icon">
                <uni-icons type="person" size="20" color="#0f766e" />
              </view>
              <text class="menu-text">个人信息</text>
            </view>
            <uni-icons type="right" size="15" color="#cbd5e1" />
          </view>
          <view class="list-cell" @click="handleToEditInfo">
            <view class="menu-item-box">
              <view class="menu-icon">
                <uni-icons type="compose" size="20" color="#0f766e" />
              </view>
              <text class="menu-text">编辑资料</text>
            </view>
            <uni-icons type="right" size="15" color="#cbd5e1" />
          </view>
          <view class="list-cell" @click="handleToParty">
            <view class="menu-item-box">
              <view class="menu-icon">
                <uni-icons type="star-filled" size="20" color="#0f766e" />
              </view>
              <text class="menu-text">我的党务</text>
            </view>
            <uni-icons type="right" size="15" color="#cbd5e1" />
          </view>
        </view>
      </view>

      <view class="menu-section">
        <text class="section-title">服务与设置</text>
        <view class="menu-list">
          <view class="list-cell" @click="handleHelp">
            <view class="menu-item-box">
              <view class="menu-icon">
                <uni-icons type="help" size="20" color="#0f766e" />
              </view>
              <text class="menu-text">常见问题</text>
            </view>
            <uni-icons type="right" size="15" color="#cbd5e1" />
          </view>
          <view class="list-cell" @click="handleAbout">
            <view class="menu-item-box">
              <view class="menu-icon">
                <uni-icons type="info" size="20" color="#0f766e" />
              </view>
              <text class="menu-text">关于我们</text>
            </view>
            <uni-icons type="right" size="15" color="#cbd5e1" />
          </view>
          <view class="list-cell" @click="handleToSetting">
            <view class="menu-item-box">
              <view class="menu-icon">
                <uni-icons type="gear" size="20" color="#0f766e" />
              </view>
              <text class="menu-text">应用设置</text>
            </view>
            <uni-icons type="right" size="15" color="#cbd5e1" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getCurrentRole, getTeacherinfoByUserId, getMyRoles } from '@/api/work/teacherinfo'
import config from '@/config'

export default {
  data() {
    return {
      teacherInfo: null,
      teacherName: '',
      teacherCollege: '',
      teacherRole: '',
      teacherPhoto: '',
      roleList: [],
      roleNames: [],
      rolesExpanded: false
    }
  },
  computed: {
    avatar() {
      return this.$store.state.user.avatar
    },
    hasOtherRoles() {
      return this.roleNames.length > 1
    },
    visibleRoleNames() {
      if (this.rolesExpanded) {
        return this.roleNames
      }
      return this.teacherRole ? [this.teacherRole] : []
    }
  },
  onShow() {
    uni.$on('refreshMinePage', this.loadProfileData)
    this.loadProfileData()
  },
  onHide() {
    uni.$off('refreshMinePage', this.loadProfileData)
  },
  methods: {
    async loadProfileData() {
      if (!this.$store.state.user.id) {
        try {
          await this.$store.dispatch('GetInfo')
        } catch (e) {
          return
        }
      }

      const [teacherRes, roleRes, currentRoleRes] = await Promise.all([
        getTeacherinfoByUserId(this.$store.state.user.id).catch(() => null),
        getMyRoles().catch(() => null),
        getCurrentRole().catch(() => null)
      ])
      this.teacherInfo = teacherRes && teacherRes.data ? teacherRes.data : null
      this.roleList = roleRes && Array.isArray(roleRes.data) ? roleRes.data : []
      this.currentRole = currentRoleRes && currentRoleRes.data ? currentRoleRes.data : null
      this.applyProfile()
    },
    applyProfile() {
      const teacher = this.teacherInfo || {}
      this.teacherName = teacher.teacherName || ''
      this.teacherCollege = teacher.collegeName || ''
      this.teacherPhoto = teacher.photo ? config.baseUrl + '/profile' + teacher.photo : ''

      this.teacherRole = this.currentRole && this.currentRole.roleName
        ? this.currentRole.roleName
        : ''
      const allRoleNames = this.roleList
        .map(role => role.roleName)
        .filter(Boolean)
      this.roleNames = allRoleNames
    },
    toggleRoles() {
      if (this.hasOtherRoles) {
        this.rolesExpanded = !this.rolesExpanded
      }
    },
    handleToInfo() {
      this.$tab.navigateTo('/pages/sub-mine/info/index')
    },
    handleToEditInfo() {
      this.$tab.navigateTo('/pages/sub-mine/info/edit')
    },
    handleToSetting() {
      this.$tab.navigateTo('/pages/sub-mine/setting/index')
    },
    handleToLogin() {
      this.$tab.reLaunch('/pages/login')
    },
    handleToAvatar() {
      this.$tab.navigateTo('/pages/sub-mine/avatar/index')
    },
    handleHelp() {
      this.$tab.navigateTo('/pages/sub-mine/help/index')
    },
    handleAbout() {
      this.$tab.navigateTo('/pages/sub-mine/about/index')
    },
    handleToParty() {
      this.$tab.navigateTo('/pages/sub-mine/party/index')
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background-color: #f4f7f9;
}

.mine-container {
  min-height: 100vh;
  padding: 0 24rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #f4f7f9;
}

.profile-section {
  position: relative;
  height: 280rpx;
  box-sizing: border-box;
  margin: 0 -24rpx;
  padding: 88rpx 24rpx 0;
}

.profile-section::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 280rpx;
  background: #155e75;
  content: '';
}

.profile-card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24rpx;
  height: 288rpx;
  padding: 40rpx 32rpx;
  box-sizing: border-box;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 12rpx 30rpx rgba(8, 47, 58, 0.18);
}

.teacher-avatar,
.avatar-placeholder {
  width: 144rpx;
  height: 144rpx;
  flex: 0 0 144rpx;
  border-radius: 16rpx;
}

.teacher-avatar {
  background: #e8f5f4;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5f4;
  border: 1rpx solid #cce7e4;
}

.login-tip {
  flex: 1;
  color: #0f766e;
  font-size: 30rpx;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  min-width: 0;
}

.teacher-name {
  min-width: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacher-college {
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 16rpx;
  min-width: 0;
  cursor: pointer;
}

.role-label {
  flex: 0 0 auto;
  color: #94a3b8;
  font-size: 22rpx;
  line-height: 36rpx;
}

.role-values {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8rpx;
  min-width: 0;
}

.role-value {
  padding: 5rpx 14rpx;
  border-radius: 8rpx;
  background: #e6fffb;
  color: #0f766e;
  font-size: 23rpx;
  font-weight: 600;
  line-height: 26rpx;
}

.role-toggle {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32rpx;
  height: 36rpx;
}

.header-action {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: #94a3b8;
  font-size: 23rpx;
}

.content-section {
  margin-top: 124rpx;
}

.menu-section + .menu-section {
  margin-top: 32rpx;
}

.section-title {
  display: block;
  margin: 0 8rpx 14rpx;
  color: #0f766e;
  font-size: 24rpx;
  font-weight: 600;
}

.menu-list {
  overflow: hidden;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid #dce9e9;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.list-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 104rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
}

.list-cell + .list-cell {
  border-top: 1rpx solid #edf2f7;
}

.list-cell:active {
  background: #eff8f7;
}

.menu-item-box {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #e8f5f4;
}

.menu-text {
  color: #1e293b;
  font-size: 28rpx;
}
</style>
