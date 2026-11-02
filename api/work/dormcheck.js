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
 * 点名时可以在每张床上顺手标内务（等级+问题项+照片），但那是**轻标记只留痕**，
 * 不产生分数；问题项候选借用 check 线的 hygiene 标准，记分与整改仍归 check 线。
 */

/* ==================== 宿舍索引与在住名单 ==================== */

// 宿舍工作台概况：住宿人数、今日巡查、整改待办、异常汇总
export function getDormWorkbenchOverview(query) {
  return request({
    url: '/api/teacher/dorm/workbench/overview',
    method: 'get',
    params: query
  })
}

// 工作台房间卡片：最近得分、今日巡查状态、未闭环异常
export function listDormWorkbenchRooms(query) {
  return request({
    url: '/api/teacher/dorm/workbench/rooms',
    method: 'get',
    params: query
  })
}

// 视野内住宿概况：在住人数、占房数、楼栋数与男女分布
export function getDormOverview(query) {
  return request({
    url: '/api/teacher/dorm/overview',
    method: 'get',
    params: query
  })
}

// 房间在住名单：混合宿舍视野外床位由后端脱敏
export function getRoomStudents(roomId) {
  return request({
    url: '/api/teacher/dorm/room/' + roomId + '/students',
    method: 'get'
  })
}

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

// 获取后端随机下发的指定手势：15分钟内有效，一张点名单只能使用一次
export function getNightGestureChallenge() {
  return request({
    url: '/api/teacher/dorm/night/gestureChallenge',
    method: 'post'
  })
}

// 按本次点名房间所属楼栋校验 GPS 是否在允许范围内
export function verifyNightLocation(data) {
  return request({
    url: '/api/teacher/dorm/night/location/verify',
    method: 'post',
    data: data
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

// 内务问题项候选：点名线标内务时借用的「内务卫生」启用标准（category=hygiene，只留痕不计分）
export function listHouseworkItems() {
  return request({
    url: '/api/teacher/dorm/check/item/enabled',
    method: 'get',
    params: { category: 'hygiene' }
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

// 确认/忽略学生干部检查产生的「待确认整改建议」
export function confirmRectify(data) {
  return request({
    url: '/api/teacher/dorm/check/rectify/confirm',
    method: 'put',
    data: data
  })
}

/* ==================== 现场巡查评分 ==================== */

// 当日巡查批次：同一辅导员当天复用，避免每查一间房建一条批次
export function ensureDailyCheckTask() {
  return request({
    url: '/api/teacher/dorm/check/task/daily',
    method: 'post'
  })
}

// 当日批次内的房间清单：带本批次已录状态与上次得分
export function listCheckRooms(query) {
  return request({
    url: '/api/teacher/dorm/check/rooms',
    method: 'get',
    params: query
  })
}

// 启用的检查标准：按检查类型/类别收窄
export function listEnabledCheckItems(query) {
  return request({
    url: '/api/teacher/dorm/check/item/enabled',
    method: 'get',
    params: query
  })
}

// 保存检查单：扣分明细、违禁品与整改要求一并提交
export function saveCheckRecord(data) {
  return request({
    url: '/api/teacher/dorm/check/record',
    method: 'post',
    data: data
  })
}

// 检查单详情
export function getCheckRecord(recordId) {
  return request({
    url: '/api/teacher/dorm/check/record/' + recordId,
    method: 'get'
  })
}

// 历史检查记录：传 roomId 即看某间宿舍的历次检查
export function listCheckRecords(query) {
  return request({
    url: '/api/teacher/dorm/check/record/list',
    method: 'get',
    params: query
  })
}

/* ==================== 宿舍异常台账 ==================== */

export function listDormIssues(query) {
  return request({
    url: '/api/teacher/dorm/issue/list',
    method: 'get',
    params: query
  })
}

export function getDormIssueSummary(query) {
  return request({
    url: '/api/teacher/dorm/issue/summary',
    method: 'get',
    params: query
  })
}

export function getDormIssue(issueId) {
  return request({
    url: '/api/teacher/dorm/issue/' + issueId,
    method: 'get'
  })
}

export function addDormIssue(data) {
  return request({
    url: '/api/teacher/dorm/issue',
    method: 'post',
    data: data
  })
}

export function updateDormIssue(data) {
  return request({
    url: '/api/teacher/dorm/issue',
    method: 'put',
    data: data
  })
}
