import config from '@/config'
import storage from '@/utils/storage'
import constant from '@/utils/constant'
import { isHttp, isEmpty } from "@/utils/validate"
import { login, logout, getInfo, wxLogin, wxBind, unbindWx, phoneLogin, studentBindLogin, teacherPhoneBind, studentPhoneBind } from '@/api/auth'
import { getToken, setToken, removeToken, setUserId, removeUserId } from '@/utils/auth'
import defAva from '@/static/images/profile.jpg'

const baseUrl = config.baseUrl

const user = {
  state: {
    token: getToken(),
    id: storage.get(constant.id),
    name: storage.get(constant.name),
    avatar: storage.get(constant.avatar),
    roles: storage.get(constant.roles),
    permissions: storage.get(constant.permissions),
    userType: storage.get('user_type') // 用户类型（00-教师/系统用户，其他-非教师）
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_ID: (state, id) => {
      state.id = id
      storage.set(constant.id, id)
      // 同时保存到 auth.js 使用的 key
      setUserId(id)
    },
    SET_NAME: (state, name) => {
      state.name = name
      storage.set(constant.name, name)
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
      storage.set(constant.avatar, avatar)
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
      storage.set(constant.roles, roles)
    },
    SET_PERMISSIONS: (state, permissions) => {
      state.permissions = permissions
      storage.set(constant.permissions, permissions)
    },
    SET_USERTYPE: (state, userType) => {
      state.userType = userType
      storage.set('user_type', userType)
    }
  },

  actions: {
    // 登录
    Login({ commit }, userInfo) {
      const username = userInfo.username.trim()
      const password = userInfo.password
      const code = userInfo.code
      const uuid = userInfo.uuid
      return new Promise((resolve, reject) => {
        login(username, password, code, uuid).then(res => {
          setToken(res.token)
          commit('SET_TOKEN', res.token)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 获取用户信息
    GetInfo({ commit, state }) {
      return new Promise((resolve, reject) => {
        getInfo().then(res => {
          const user = res.user
          let avatar = user.avatar || ""
          if (!isHttp(avatar)) {
            avatar = (isEmpty(avatar)) ? defAva : baseUrl + avatar
          }
          const userid = (isEmpty(user) || isEmpty(user.userId)) ? "" : user.userId
          const username = (isEmpty(user) || isEmpty(user.userName)) ? "" : user.userName
          // 从 user 对象中获取 userType，如果不存在则默认为 '00'（教师）
          const userType = user.userType || '00'
          
          // 验证是否为教师账号
          if (userType !== '00' || (res.roles && res.roles.includes('student'))) {
            removeToken()
            removeUserId()
            storage.clean()
            reject(new Error('账号不存在'))
            return
          }
          
          if (res.roles && res.roles.length > 0) {
            commit('SET_ROLES', res.roles)
            commit('SET_PERMISSIONS', res.permissions)
          } else {
            commit('SET_ROLES', ['ROLE_DEFAULT'])
          }
          commit('SET_ID', userid)
          commit('SET_NAME', username)
          commit('SET_AVATAR', avatar)
          commit('SET_USERTYPE', userType)
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 微信自动登录
    WxLogin({ commit }) {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: (loginRes) => {
            wxLogin(loginRes.code).then(res => {
              setToken(res.token)
              commit('SET_TOKEN', res.token)
              resolve(res)
            }).catch(error => {
              reject(error)
            })
          },
          fail: (err) => {
            reject('微信登录失败: ' + err.errMsg)
          }
        })
      })
    },

    // 微信绑定登录
    WxBind({ commit }, userInfo) {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: (loginRes) => {
            // 对密码进行 trim 处理，避免前后空格导致密码错误
            const cleanPassword = (userInfo.password || '').trim()
            wxBind(loginRes.code, userInfo.username.trim(), cleanPassword).then(res => {
              setToken(res.token)
              commit('SET_TOKEN', res.token)
              if (res.user && res.user.userId) {
                commit('SET_ID', res.user.userId)
                commit('SET_NAME', res.user.userName || '')
                if (res.user.avatar) {
                  commit('SET_AVATAR', res.user.avatar)
                }
              } else {
                // 后端未返回user信息，将在GetInfo中获取
              }
              resolve(res)
            }).catch(error => {
              reject(error)
            })
          },
          fail: (err) => {
            reject('微信登录失败: ' + err.errMsg)
          }
        })
      })
    },

    // 手机号快捷登录
    PhoneLogin({ commit }, data) {
      return new Promise((resolve, reject) => {
        phoneLogin(data.phoneCode, data.loginCode).then(res => {
          setToken(res.token)
          commit('SET_TOKEN', res.token)
          // 如果有用户信息，保存用户ID
          if (res.user && res.user.userId) {
            const userid = res.user.userId
            commit('SET_ID', userid)
            commit('SET_NAME', res.user.userName || '')
            if (res.user.avatar) {
              commit('SET_AVATAR', res.user.avatar)
            }
          }
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 教师手机号绑定
    TeacherPhoneBind({ commit }, data) {
      return new Promise((resolve, reject) => {
        teacherPhoneBind(data.phoneCode, data.loginCode).then(res => {
          setToken(res.token)
          commit('SET_TOKEN', res.token)
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 学生手机号绑定
    PhoneBindStudent({ commit }, data) {
      return new Promise((resolve, reject) => {
        studentPhoneBind(data.phoneCode, data.loginCode).then(res => {
          setToken(res.token)
          commit('SET_TOKEN', res.token)
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 退出系统
    LogOut({ commit, state }) {
      return new Promise((resolve, reject) => {
        logout(state.token).then(() => {
          commit('SET_TOKEN', '')
          commit('SET_ROLES', [])
          commit('SET_PERMISSIONS', [])
          removeToken()
          storage.clean()
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 解除微信绑定
    Unbind({ commit }) {
      return new Promise((resolve, reject) => {
        // 调用后端接口解除绑定
        unbindWx().then(() => {
          // 清除所有本地存储的用户信息
          commit('SET_TOKEN', '')
          commit('SET_ID', '')
          commit('SET_NAME', '')
          commit('SET_AVATAR', '')
          commit('SET_ROLES', [])
          commit('SET_PERMISSIONS', [])
          removeToken()
          storage.clean()
          resolve()
        }).catch(error => {
          // 即使后端失败，也清除本地信息
          commit('SET_TOKEN', '')
          commit('SET_ID', '')
          commit('SET_NAME', '')
          commit('SET_AVATAR', '')
          commit('SET_ROLES', [])
          commit('SET_PERMISSIONS', [])
          removeToken()
          storage.clean()
          resolve()
        })
      })
    },
    
    // 学生绑定登录
    StudentBindLogin({ commit }, data) {
      return new Promise((resolve, reject) => {
        studentBindLogin(data.code, data.studentNo).then(res => {
          setToken(res.token)
          commit('SET_TOKEN', res.token)
          if (res.user && res.user.userId) {
            commit('SET_ID', res.user.userId)
            commit('SET_NAME', res.user.userName || '')
            if (res.user.avatar) {
              commit('SET_AVATAR', res.user.avatar)
            }
          }
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },
  }
}

export default user
