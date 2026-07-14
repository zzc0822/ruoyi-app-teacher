import request from '@/utils/request'

/**
 * 车辆登记API（移动端）
 */

// 获取车辆登记列表
export function listVehicle(query) {
  return request({
    url: '/api/vehicle/list',
    method: 'get',
    params: query
  })
}

// 获取车辆登记详情
export function getVehicle(id) {
  return request({
    url: '/api/vehicle/' + id,
    method: 'get'
  })
}

// 新增车辆登记
export function addVehicle(data) {
  return request({
    url: '/api/vehicle',
    method: 'post',
    data: data
  })
}

// 辅导员现场核实
export function verifyVehicle(data) {
  return request({
    url: '/api/vehicle/verify',
    method: 'put',
    data: data
  })
}

// 删除车辆登记
export function delVehicle(id) {
  return request({
    url: '/api/vehicle/' + id,
    method: 'delete'
  })
}
