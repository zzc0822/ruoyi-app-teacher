<template>
  <view class="help-container">
    <view v-for="(item, findex) in list" :key="findex" :title="item.title" class="list-title">
      <view class="text-title">
        <view :class="item.icon"></view>{{ item.title }}
      </view>
      <view class="childList">
        <view v-for="(child, zindex) in item.childList" :key="zindex" class="question" hover-class="hover"
          @click="handleText(child)">
          <view class="text-item">{{ child.title }}</view>
          <view class="line" v-if="zindex !== item.childList.length - 1"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        list: [{
            icon: 'iconfont icon-user',
            title: '账号与登录',
            childList: [{
              title: '如何登录系统？',
              content: '使用本人工号或手机号及密码登录。已绑定微信的教师，也可以使用手机号快捷登录。'
            }, {
              title: '忘记密码怎么办？',
              content: '请联系学校学生工作部门或系统管理员重置密码。'
            }, {
              title: '如何修改登录密码？',
              content: '请点击[我的] - [应用设置] - [修改密码]即可修改登录密码'
            }]
          },
          {
            icon: 'iconfont icon-help',
            title: '业务使用',
            childList: [{
              title: '如何查看所带学生？',
              content: '请进入[工作台] - [我的学生]查看。可查看的学生范围由你的角色和带班关系决定。'
            }, {
              title: '为什么有些功能看不到？',
              content: '系统按照角色和岗位权限开放功能。如确需使用某项功能，请联系系统管理员调整权限。'
            }]
          },
          {
            icon: 'iconfont icon-setting',
            title: '权限与安全',
            childList: [{
              title: '拍照或定位无法使用？',
              content: '请在微信或手机系统设置中允许本小程序使用相机、相册和位置权限。如仍无法使用，请联系系统管理员。'
            }, {
              title: '如何保护学生信息？',
              content: '请仅在履行岗位职责所必需的范围内查询和使用学生信息，不得截屏、外传或向无关人员提供。'
            }, {
              title: '如何反馈系统问题？',
              content: '请联系学校学生工作部门或系统管理员，并说明出现问题的时间、所在页面和具体操作。'
            }]
          }
        ]
      }
    },
    methods: {
      handleText(item) {
        this.$tab.navigateTo(`/pages/common/textview/index?title=${item.title}&content=${item.content}`)
      }
    }
  }
</script>

<style lang="scss" scoped>
  page {
    background-color: #f8f8f8;
  }

  .help-container {
    margin-bottom: 100rpx;
    padding: 30rpx;
  }

  .list-title {
    margin-bottom: 30rpx;
  }

  .childList {
    background: #ffffff;
    box-shadow: 0px 0px 10rpx rgba(193, 193, 193, 0.2);
    border-radius: 16rpx;
    margin-top: 10rpx;
  }

  .line {
    width: 100%;
    height: 1rpx;
    background-color: #F5F5F5;
  }

  .text-title {
    color: #303133;
    font-size: 32rpx;
    font-weight: bold;
    margin-left: 10rpx;

    .iconfont {
      font-size: 16px;
      margin-right: 10rpx;
    }
  }

  .text-item {
    font-size: 28rpx;
    padding: 24rpx;
  }

  .question {
    color: #606266;
    font-size: 28rpx;
  }
</style>
