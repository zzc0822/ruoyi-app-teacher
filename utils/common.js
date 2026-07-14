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

// 日期格式化
export function parseTime(time, pattern) {
  if (arguments.length === 0 || !time) {
    return null
  }
  const format = pattern || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if ((typeof time === 'string') && (/^[0-9]+$/.test(time))) {
      time = parseInt(time)
    } else if (typeof time === 'string') {
      time = time.replace(new RegExp(/-/gm), '/').replace('T', ' ').replace(new RegExp(/\.[\d]{3}/gm), '')
    }
    if ((typeof time === 'number') && (time.toString().length === 10)) {
      time = time * 1000
    }
    date = new Date(time)
  }
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key) => {
    let value = formatObj[key]
    // Note: getDay() returns 0 on Sunday
    if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value] }
    if (result.length > 0 && value < 10) {
      value = '0' + value
    }
    return value || 0
  })
  return time_str
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

/**
 * 班级名称生成简称
 * 规则：保留年份、专业简称、层级、类型、班号
 * 例：'22软件工程技术本1班' → '22软工本1班'
 */
const MAJOR_ABBR_MAP = {
  '软件工程技术': '软工',
  '网络工程技术': '网工',
  '数字媒体技术': '数媒',
  '计算机应用技术': '计应',
  '动漫制作技术': '动漫',
  '软件技术': '软技',
  '大数据技术': '大数据',
  '人工智能技术': 'AI',
  '云计算技术': '云计',
  '信息安全技术': '信安',
  '物联网应用技术': '物联',
  '卓越工程师': '卓越',
  '软件精英': '软英',
  '软件卓越': '软卓'
}

export function getClassShortName(className) {
  if (!className) return ''
  // 尝试匹配完整格式：22软件工程技术本1班
  const match = className.match(/^(\d{2})(.+?)([本专]?)([A-Z]?)(\d+)班$/)
  if (match) {
    const [, year, major, level, type, num] = match
    // 查找专业简称
    let abbr = major
    for (const [full, short] of Object.entries(MAJOR_ABBR_MAP)) {
      if (major === full || major.startsWith(full)) {
        abbr = short
        break
      }
    }
    return year + abbr + level + type + num + '班'
  }
  // 无法匹配则返回原名
  return className
}