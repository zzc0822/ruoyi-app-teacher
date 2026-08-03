<template>
  <view class="mine-container" :style="{height: `${windowHeight}px`}">
    <!--顶部个人信息栏-->
    <view class="header-section">
      <view class="header-content">
        <!-- 教师照片（有照片时显示） -->
        <image v-if="teacherPhoto" @click="handleToAvatar" :src="teacherPhoto" class="teacher-avatar" mode="aspectFill" @error="teacherPhoto = ''"></image>
        <!-- 教师照片（无照片时显示占位符，也可点击） -->
        <view v-else @click="handleToAvatar" class="avatar-placeholder">
          <uni-icons type="person" size="48" color="#999"></uni-icons>
        </view>
        
        <!-- 用户信息 -->
        <view v-if="!teacherName" @click="handleToLogin" class="login-tip">
          点击登录
        </view>
        <view v-if="teacherName" @click="handleToInfo" class="user-info">
          <view class="teacher-name">
            <text>{{ teacherName }}</text>
            <text v-if="teacherCollege" class="teacher-college-inline"> · {{ teacherCollege }}</text>
          </view>
          <view class="teacher-title" v-if="teacherTitle">
            <text class="title-text">{{ teacherTitle }}</text>
          </view>
        </view>
      </view>
      <view @click="handleToInfo" class="header-right">
        <text>详细信息</text>
        <uni-icons type="right" size="16" color="rgba(255,255,255,0.8)"></uni-icons>
      </view>
    </view>

    <view class="content-section">
      <view class="menu-list">
        <view class="list-cell list-cell-arrow" @click="handleToParty">
          <view class="menu-item-box">
            <view class="iconfont icon-aixin menu-icon" style="color: #c62828;"></view>
            <view>我的党务</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleToEditInfo">
          <view class="menu-item-box">
            <view class="iconfont icon-user menu-icon"></view>
            <view>编辑资料</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleHelp">
          <view class="menu-item-box">
            <view class="iconfont icon-help menu-icon"></view>
            <view>常见问题</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleAbout">
          <view class="menu-item-box">
            <view class="iconfont icon-aixin menu-icon"></view>
            <view>关于我们</view>
          </view>
        </view>
        <view class="list-cell list-cell-arrow" @click="handleToSetting">
          <view class="menu-item-box">
            <view class="iconfont icon-setting menu-icon"></view>
            <view>应用设置</view>
          </view>
        </view>
      </view>

    </view>
  </view>
</template>

<script>
import { getTeacherinfoByUserId, getRoleList } from '@/api/work/teacherinfo'
import config from '@/config'

export default {
  data() {
    return {
      // 教师信息
      teacherInfo: null,
      teacherName: '',
      teacherCollege: '',
      teacherTitle: '',
      teacherPhoto: '',
      // 角色列表
      roleList: []
    }
  },
  computed: {
    avatar() {
      return this.$store.state.user.avatar
    },
    windowHeight() {
      return uni.getSystemInfoSync().windowHeight - 50
    }
  },
  onShow() {
    // 监听头像刷新事件
    uni.$on('refreshMinePage', this.loadTeacherInfo)
    
    // 确保用户信息已加载
    if (!this.$store.state.user.id) {
      this.$store.dispatch('GetInfo').then(() => {
        this.loadRoleList()
        this.loadTeacherInfo()
      }).catch(err => {
        // 获取失败静默处理
      })
    } else {
      this.loadRoleList()
      this.loadTeacherInfo()
    }
  },
  onHide() {
    // 移除事件监听
    uni.$off('refreshMinePage', this.loadTeacherInfo)
  },
  methods: {
    // 截断文本，超过指定长度显示省略号
    truncateText(text, maxLength) {
      if (!text) return ''
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    },
    
    // 加载角色列表
    loadRoleList() {
      getRoleList().then(res => {
        this.roleList = res.data || []
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    // 转换行政职务ID为中文名称
    convertXzdwToName(xzdw) {
      if (!xzdw) return ''
      const ids = xzdw.split(',').map(id => id.trim())
      const names = ids.map(id => {
        const role = this.roleList.find(r => r.roleId == id)
        return role ? role.roleName : id
      })
      return names.join('、')
    },
    // 加载教师信息
    loadTeacherInfo() {
      // 从 store 获取 userId
      const userId = this.$store.state.user.id
      
      if (!userId) {
        return
      }
      
      getTeacherinfoByUserId(userId).then(res => {
        this.teacherInfo = res.data
        if (this.teacherInfo) {
          // 教师姓名
          this.teacherName = this.teacherInfo.teacherName || ''
          // 学院名称
          this.teacherCollege = this.teacherInfo.collegeName || ''
          // 职务（优先显示行政职务，其次显示专业技术职务）
          const xzdw = this.teacherInfo.xzdw || ''
          const zyjszc = this.teacherInfo.zyjszc || ''
          
          // 如果角色列表已加载，转换行政职务为中文
          if (this.roleList.length > 0) {
            this.teacherTitle = this.convertXzdwToName(xzdw) || zyjszc || ''
          } else {
            // 否则等待角色列表加载
            this.waitForRolesAndSetTitle(xzdw, zyjszc)
          }
          
          // 教师照片
          if (this.teacherInfo.photo) {
            this.teacherPhoto = config.baseUrl + '/profile' + this.teacherInfo.photo

          }
        }
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    // 等待角色列表加载后设置职务
    waitForRolesAndSetTitle(xzdw, zyjszc) {
      let retryCount = 0
      const maxRetry = 5
      const checkInterval = setInterval(() => {
        retryCount++
        if (this.roleList.length > 0 || retryCount >= maxRetry) {
          clearInterval(checkInterval)
          this.teacherTitle = this.convertXzdwToName(xzdw) || zyjszc || ''
        }
      }, 500)
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
    background-color: #f5f6f7;
  }

  .mine-container {
    width: 100%;
    height: 100%;

    .header-section {
      padding: 50px 20px 50px;
      background: linear-gradient(135deg, #2979ff, #1e88e5);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      // 方形头像
      .teacher-avatar {
        width: 80px;
        height: 80px;
        border-radius: 12px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: #fff;
      }

      .avatar-placeholder {
        width: 80px;
        height: 80px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .login-tip {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.9);
      }

      .user-info {
        flex: 1;

        .teacher-name {
          font-size: 20px;
          font-weight: bold;
          line-height: 32px;
          color: #fff;
          display: flex;
          align-items: center;
          
          .teacher-college-inline {
            font-size: 15px;
            font-weight: normal;
            color: rgba(255, 255, 255, 0.85);
          }
        }

        .teacher-title {
          font-size: 16px;
          line-height: 26px;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 6px;
          display: flex;
          align-items: center;
          
          .title-text {
            font-size: 17px;
            font-weight: 500;
            color: #fff;
          }
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        margin-top: 32px;
      }
    }

    .content-section {
      position: relative;
      top: -50px;
    }
  }
</style>
