<template>
  <view class="container">
    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view 
        v-for="(tab, index) in tabs" 
        :key="index"
        :class="['tab-item', currentTab === index ? 'active' : '']"
        @click="switchTab(index)"
      >
        <text>{{ tab.name }}</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-scroll">
      <view class="form-container">
        <uni-forms ref="form" :model="teacher" labelWidth="80px" labelAlign="right">
          
          <!-- Tab 1: 基本信息 -->
          <view v-show="currentTab === 0" class="tab-content">
            <uni-forms-item label="工号" name="gh">
              <uni-easyinput v-model="teacher.gh" disabled placeholder="工号" />
            </uni-forms-item>
            <uni-forms-item label="姓名" name="xm">
              <uni-easyinput v-model="teacher.xm" disabled placeholder="姓名" />
            </uni-forms-item>
            <uni-forms-item label="性别" name="xb">
              <uni-data-select v-model="teacher.xb" :localdata="dict.xb" />
            </uni-forms-item>
            <uni-forms-item label="出生日期" name="csrqStr">
              <uni-easyinput v-model="teacher.csrqStr" disabled placeholder="出生日期" />
            </uni-forms-item>
            <uni-forms-item label="身份证号" name="sfzh">
              <uni-easyinput v-model="teacher.sfzh" disabled placeholder="身份证号" />
            </uni-forms-item>
          </view>

          <!-- Tab 2: 学历职务 -->
          <view v-show="currentTab === 1" class="tab-content">
            <uni-forms-item label="学历" name="xl">
              <uni-data-select v-model="teacher.xl" :localdata="dict.xl" />
            </uni-forms-item>
            <uni-forms-item label="学位" name="xw">
              <uni-data-select v-model="teacher.xw" :localdata="dict.xw" />
            </uni-forms-item>
            <uni-forms-item label="专业技术职务" name="zyjszc">
              <uni-data-select v-model="teacher.zyjszc" :localdata="dict.zyjszc" />
            </uni-forms-item>
            <uni-forms-item label="行政职务" name="xzdw">
              <uni-easyinput v-model="teacher.xzdwName" disabled placeholder="行政职务" />
            </uni-forms-item>
            <uni-forms-item label="所属学院" name="xyname">
              <uni-easyinput v-model="teacher.xyname" disabled placeholder="所属学院" />
            </uni-forms-item>
            <uni-forms-item label="所属专业" name="zyname">
              <uni-easyinput v-model="teacher.zyname" disabled placeholder="所属专业" />
            </uni-forms-item>
            <uni-forms-item label="研究方向" name="yjfx">
              <uni-easyinput v-model="teacher.yjfx" placeholder="请输入研究方向" />
            </uni-forms-item>
          </view>

          <!-- Tab 3: 联系方式 -->
          <view v-show="currentTab === 2" class="tab-content">
            <uni-forms-item label="联系电话" name="lxdh">
              <uni-easyinput v-model="teacher.lxdh" type="number" maxlength="11" placeholder="请输入联系电话" />
            </uni-forms-item>
            <uni-forms-item label="电子邮箱" name="dzyx">
              <uni-easyinput v-model="teacher.dzyx" type="text" placeholder="请输入电子邮箱" />
            </uni-forms-item>
            <uni-forms-item label="办公地址" name="bzdz">
              <uni-easyinput v-model="teacher.bzdz" placeholder="请输入办公地址" />
            </uni-forms-item>
            <uni-forms-item label="通讯地址" name="txdz">
              <uni-easyinput v-model="teacher.txdz" placeholder="请输入通讯地址" />
            </uni-forms-item>
          </view>

          <!-- Tab 4: 其他信息 -->
          <view v-show="currentTab === 3" class="tab-content">
            <uni-forms-item label="入职时间" name="rzsJStr">
              <uni-easyinput v-model="teacher.rzsJStr" disabled placeholder="入职时间" />
            </uni-forms-item>
            <uni-forms-item label="离职时间" name="lzsjStr">
              <uni-easyinput v-model="teacher.lzsjStr" disabled placeholder="离职时间" />
            </uni-forms-item>
            <uni-forms-item label="状态" name="zt">
              <uni-data-select v-model="teacher.zt" :localdata="dict.zt" />
            </uni-forms-item>
            <uni-forms-item label="教师简介" name="jsjj">
              <uni-easyinput v-model="teacher.jsjj" type="textarea" placeholder="请输入教师简介" :maxlength="500" autoHeight />
            </uni-forms-item>
            <uni-forms-item label="教务系统密码" name="jwmm">
              <uni-easyinput v-model="teacher.jwmm" type="text" placeholder="请输入教务系统密码" />
            </uni-forms-item>
          </view>

        </uni-forms>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <button type="primary" @click="submit" class="submit-btn">保存修改</button>
    </view>
  </view>
</template>

<script>
import { getTeacherinfoByUserId, updateMyTeacherinfo, getRoleList } from '@/api/stumanage/teacherinfo'

export default {
  data() {
    return {
      currentTab: 0,
      tabs: [
        { name: '基本信息' },
        { name: '学历职务' },
        { name: '联系方式' },
        { name: '其他信息' }
      ],
      teacher: {
        jsid: null,
        gh: '',
        xm: '',
        xb: '',
        sfzh: '',
        csrq: '',
        csrqStr: '',
        xl: '',
        xw: '',
        zyjszc: '',
        xzdw: '',
        xzdwName: '',  // 行政职务中文名称
        xyname: '',
        zyname: '',
        yjfx: '',
        lxdh: '',
        dzyx: '',
        bzdz: '',
        txdz: '',
        rzsJ: '',
        rzsJStr: '',
        lzsj: '',
        lzsjStr: '',
        zt: '',
        jsjj: '',
        jwmm: ''
      },
      // 角色列表（从系统获取）
      roleList: [],
      // 字典数据（对应系统字典）
      dict: {
        xb: [  // 性别
          { text: '男', value: '0' },
          { text: '女', value: '1' },
          { text: '未知', value: '2' }
        ],
        xl: [  // 学历
          { text: '博士研究生', value: '3' },
          { text: '硕士研究生', value: '2' },
          { text: '本科', value: '1' },
          { text: '其他', value: '0' }
        ],
        xw: [  // 学位
          { text: '博士', value: '3' },
          { text: '硕士', value: '2' },
          { text: '学士', value: '1' },
          { text: '无', value: '0' }
        ],
        zyjszc: [  // 专业技术职务
          { text: '正高级', value: '4' },
          { text: '副高级', value: '3' },
          { text: '中级', value: '2' },
          { text: '初级', value: '1' },
          { text: '无', value: '0' }
        ],
        zt: [  // 状态
          { text: '在职', value: '0' },
          { text: '离职', value: '1' },
          { text: '退休', value: '2' }
        ]
      }
    }
  },
  onLoad() {
    this.loadRoleList()
    this.getTeacherInfo()
  },
  methods: {
    // 加载角色列表
    loadRoleList() {
      getRoleList().then(res => {
        const roles = res.data || []
        if (roles.length > 0) {
          // 如果成功获取，使用系统数据
          this.roleList = roles
        }
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    // 切换 Tab
    switchTab(index) {
      this.currentTab = index
    },
    // 加载教师信息
    getTeacherInfo() {
      const userId = this.$store.state.user.id
      if (!userId) {
        this.$modal.msgError('用户未登录')
        return
      }
      
      getTeacherinfoByUserId(userId).then(res => {
        if (res.data) {
          this.teacher = res.data
          // 格式化日期
          if (this.teacher.csrq) {
            this.teacher.csrqStr = this.formatDate(this.teacher.csrq)
          }
          if (this.teacher.rzsJ) {
            this.teacher.rzsJStr = this.formatDate(this.teacher.rzsJ)
          }
          if (this.teacher.lzsj) {
            this.teacher.lzsjStr = this.formatDate(this.teacher.lzsj)
          }
          // 等待角色列表加载完成后再转换行政职务
          this.waitForRolesAndConvert()
        }
      }).catch(err => {
        this.$modal.msgError('加载教师信息失败')
      })
    },
    // 等待角色列表加载完成后再转换行政职务
    waitForRolesAndConvert() {
      // 如果角色列表已经加载，直接转换
      if (this.roleList.length > 0) {
        this.teacher.xzdwName = this.convertXzdwToName(this.teacher.xzdw)
        return
      }
      
      // 否则等待500ms后重试（最多重试5次）
      let retryCount = 0
      const maxRetry = 5
      const checkInterval = setInterval(() => {
        retryCount++
        if (this.roleList.length > 0 || retryCount >= maxRetry) {
          clearInterval(checkInterval)
          this.teacher.xzdwName = this.convertXzdwToName(this.teacher.xzdw)
        }
      }, 500)
    },
    // 转换行政职务ID为中文名称
    convertXzdwToName(xzdw) {
      if (!xzdw) return ''
      // xzdw 可能是 "1,2,3" 这样的格式
      const ids = xzdw.split(',').map(id => id.trim())
      
      const names = ids.map(id => {
        // 使用 == 而不是 ===，兼容字符串和数字比较
        const role = this.roleList.find(r => r.roleId == id)
        return role ? role.roleName : id
      })
      return names.join('、')
    },
    // 格式化日期
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    // 提交保存
    submit() {
      uni.showModal({
        title: '提示',
        content: '确定要保存修改吗？',
        success: (res) => {
          if (res.confirm) {
            // 提交所有字段，包括主键
            const submitData = {
              jsid: this.teacher.jsid,  // 主键
              gh: this.teacher.gh,      // 工号
              xm: this.teacher.xm,      // 姓名
              xb: this.teacher.xb,      // 性别
              sfzh: this.teacher.sfzh,  // 身份证号
              xl: this.teacher.xl,      // 学历
              xw: this.teacher.xw,      // 学位
              zyjszc: this.teacher.zyjszc,  // 专业技术职务
              // xzdw 不提交（只读）
              xyname: this.teacher.xyname,  // 所属学院
              zyname: this.teacher.zyname,  // 所属专业
              yjfx: this.teacher.yjfx,      // 研究方向
              lxdh: this.teacher.lxdh,      // 联系电话
              dzyx: this.teacher.dzyx,      // 电子邮箱
              bzdz: this.teacher.bzdz,      // 办公地址
              txdz: this.teacher.txdz,      // 通讯地址
              zt: this.teacher.zt,          // 状态
              jsjj: this.teacher.jsjj,      // 教师简介
              jwmm: this.teacher.jwmm       // 教务系统密码
            }
            
            uni.showLoading({ title: '保存中...' })
            
            updateMyTeacherinfo(submitData).then(response => {
              uni.hideLoading()
              this.$modal.msgSuccess('保存成功')
              // 重新加载数据，不返回
              this.getTeacherInfo()
            }).catch(err => {
              uni.hideLoading()
              this.$modal.msgError('保存失败: ' + (err.msg || err.message || '未知错误'))
            })
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
page {
  background-color: #f5f6f7;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6f7;
}

/* Tab 切换栏 */
.tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
  transition: all 0.3s;
  
  &.active {
    color: #2979ff;
    font-weight: 600;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 6rpx;
      background: #2979ff;
      border-radius: 3rpx;
    }
  }
}

/* 内容滚动区域 */
.content-scroll {
  flex: 1;
  overflow-y: auto;
}

.form-container {
  padding: 20rpx;
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
}

.tab-content {
  // 紧凑间距
  ::v-deep .uni-forms-item {
    margin-bottom: 24rpx !important;
  }
  
  ::v-deep .uni-forms-item__label {
    font-size: 28rpx !important;
  }
  
  ::v-deep .uni-easyinput__content {
    font-size: 28rpx !important;
  }
}

/* 底部按钮栏 */
.bottom-bar {
  background: #fff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #e5e5e5;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #2979ff, #1e88e5);
  border: none;
  
  &:active {
    opacity: 0.8;
  }
}
</style>
