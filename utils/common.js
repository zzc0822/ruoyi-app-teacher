/**
* 显示消息提示框
* @param content 提示的标题
*/
export function toast(content) {
  uni.showToast({
    icon: 'none',
    title: content
  })
}

/**
* 显示模态弹窗
* @param content 提示的标题
*/
export function showConfirm(content) {
  return new Promise((resolve, reject) => {
    uni.showModal({
      title: '提示',
      content: content,
      cancelText: '取消',
      confirmText: '确定',
      success: function(res) {
        resolve(res)
      }
    })
  })
}

/**
* 参数处理
* @param params 参数
*/
export function tansParams(params) {
  let result = ''
  for (const propName of Object.keys(params)) {
    const value = params[propName]
    var part = encodeURIComponent(propName) + "="
    if (value !== null && value !== "" && typeof (value) !== "undefined") {
      if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
          if (value[key] !== null && value[key] !== "" && typeof (value[key]) !== 'undefined') {
            let params = propName + '[' + key + ']'
            var subPart = encodeURIComponent(params) + "="
            result += subPart + encodeURIComponent(value[key]) + "&"
          }
        }
      } else {
        result += part + encodeURIComponent(value) + "&"
      }
    }
  }
  return result
}

/**
 * 打开地图选择位置
 * @param options uni.chooseLocation 的额外参数
 * @returns Promise<{name, address, latitude, longitude}>
 */
export function chooseLocation(options = {}) {
  return new Promise((resolve, reject) => {
    uni.chooseLocation({
      ...options,
      success: (res) => {
        resolve(res)
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          uni.showToast({ title: '请授权定位权限', icon: 'none' })
        } else if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消，无需提示
        } else {
          uni.showToast({ title: '定位失败，请手动输入', icon: 'none' })
        }
        reject(err)
      }
    })
  })
}