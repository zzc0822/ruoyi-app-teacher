import request from '@/utils/request'

export function getTrainingOverview() {
  return request({ url: '/api/counselor/training/overview', method: 'get' })
}

export function getTrainingRecords(teacherId, category) {
  return request({
    url: '/api/counselor/training/records',
    method: 'get',
    params: { teacherId, category }
  })
}

export function getAvailableCompetitions() {
  return request({ url: '/counselor/competition/available', method: 'get' })
}
