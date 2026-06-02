import config from '@/config'
import storage from '@/utils/storage'
import constant from '@/utils/constant'
import { isHttp, isEmpty } from "@/utils/validate"
import { login, logout, getInfo, wxLogin, wxBind, unbindWx } from '@/api/login'
import { getToken, setToken, removeToken } from '@/utils/auth'
import defAva from '@/static/images/profile.jpg'

const baseUrl = config.baseUrl

const user = {
  state: {
    token: getToken(),
    id: storage.get(constant.id),
    name: storage.get(constant.name),
    avatar: storage.get(constant.avatar),
    roles: storage.get(constant.roles),
    permissions: storage.get(constant.permissions)
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_ID: (state, id) => {
      state.id = id
      storage.set(constant.id, id)
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
		  if (res.roles && res.roles.length > 0) {
            commit('SET_ROLES', res.roles)
            commit('SET_PERMISSIONS', res.permissions)
          } else {
            commit('SET_ROLES', ['ROLE_DEFAULT'])
          }
          commit('SET_ID', userid)
          commit('SET_NAME', username)
          commit('SET_AVATAR', avatar)
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
            wxBind(loginRes.code, userInfo.username.trim(), userInfo.password).then(res => {
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
    }
  }
}

export default user
