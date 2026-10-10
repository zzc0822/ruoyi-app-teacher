import request from '@/utils/request'

/**
 * 宿舍查寝API（移动端-辅导员/书记）
 *
 * 全部走 /api/teacher/dorm/** 这一层：视野由后端 resolveScope 收口（管理员全部、
 * 书记/院长本学院、辅导员带班），移动端不传身份也不传菜单权限串。
 * /dorm/** 与 /stumanage/** 是 PC 管理端接口面，不给小程序用。
 *
 * 两条业务线口径不同、不要混：
 *  night    = 晚寝点名（人在不在：在寝/未归/晚归/请假/外宿），表 fd_dorm_night_check
 *  check    = 内务卫生与安全记分（扣分项挂照片、违禁品、整改），表 dorm_check_*
 * 点名线不记违纪：现场发现违禁品等问题走 check/整改线登记。
 */

/* ==================== 宿舍索引与在住名单 ==================== */

// 楼栋节点（只回视野内有在住学生的楼栋）
export function listDormBuildings(query) {
  return request({
    url: '/api/teacher/dorm/tree/building',
    method: 'get',
    params: query
  })
}

// 楼层节点：传 buildingId
export function listDormFloors(buildingId) {
  return request({
    url: '/api/teacher/dorm/tree/floor',
    method: 'get',
    params: { buildingId }
  })
}

// 房间节点：传 buildingId + floorId，label 形如「101（4/6床）」
export function listDormRooms(buildingId, floorId) {
  return request({
    url: '/api/teacher/dorm/tree/room',
    method: 'get',
    params: { buildingId, floorId }
  })
}

/* ==================== 晚寝点名 ==================== */

// 我的点名单：query 支持 status、buildingName、beginDate/endDate
export function listNightCheck(query) {
  return request({
    url: '/api/teacher/dorm/night/list',
    method: 'get',
    params: query
  })
}

// 点名单详情（含逐床点名明细）
export function getNightCheck(id) {
  return request({
    url: '/api/teacher/dorm/night/' + id,
    method: 'get'
  })
}

/**
 * 点名名册：一批房间的全部床位逐床返回（含空床与外院在住占位床，实名不脱敏）。
 * 在住床带 suggestStatus（leave/offcampus）与 leaveId，供进入页面自动预填。
 * @param {Array} roomIds 房间ID数组
 * @param {String} checkDate yyyy-MM-dd
 */
export function getNightRoster(roomIds, checkDate) {
  return request({
    url: '/api/teacher/dorm/night/roster',
    method: 'get',
    params: { roomIds: (roomIds || []).join(','), checkDate }
  })
}

// 新建点名单：detailList 每项 { roomId, roomNo, bedNo, xh, studentName, bjdm, checkStatus, leaveId }
export function addNightCheck(data) {
  return request({
    url: '/api/teacher/dorm/night',
    method: 'post',
    data: data
  })
}

// 修改点名单：只有草稿可改，已提交的会被后端拒绝（未归学生改走补归）
export function updateNightCheck(data) {
  return request({
    url: '/api/teacher/dorm/night',
    method: 'put',
    data: data
  })
}

// 补归：{ checkId, id: 明细ID, returnTime: 'HH:mm:ss' }，把「未归」改标「晚归」
export function returnLateNightCheck(data) {
  return request({
    url: '/api/teacher/dorm/night/returnLate',
    method: 'post',
    data: data
  })
}

/* ==================== 整改复核 ==================== */

// 整改单列表：query 支持 status、openFlag、keyword、buildingId 等
export function listRectify(query) {
  return request({
    url: '/api/teacher/dorm/check/rectify/list',
    method: 'get',
    params: query
  })
}

// 状态胶囊计数：与列表同条件同视野，不受状态收窄
export function countRectifyStatus(query) {
  return request({
    url: '/api/teacher/dorm/check/rectify/statusCount',
    method: 'get',
    params: query
  })
}

// 整改单详情：含过程时间线与提交照片
export function getRectify(rectifyId) {
  return request({
    url: '/api/teacher/dorm/check/rectify/detail/' + rectifyId,
    method: 'get'
  })
}

// 现场复核：pass=true 归档，false 打回重改
export function recheckRectify(data) {
  return request({
    url: '/api/teacher/dorm/check/rectify/recheck',
    method: 'put',
    data: data
  })
}
