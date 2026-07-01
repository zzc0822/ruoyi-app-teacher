import request from '@/utils/request'

export default {
    // ===== 学生端 =====
    // 我的党员档案（含政治面貌、支部、培养人、介绍人等）
    myInfo() {
        return request({ url: '/api/party/myInfo', method: 'get' })
    },
    // 我的发展进度
    progress() {
        return request({ url: '/api/party/progress', method: 'get' })
    },
    // 我的支部/组织信息
    myBranch() {
        return request({ url: '/api/party/myBranch', method: 'get' })
    },
    // 我的思想汇报列表
    myThoughtReports() {
        return request({ url: '/api/party/thoughtReport/list', method: 'get' })
    },
    // 提交思想汇报
    submitThoughtReport(data) {
        return request({ url: '/api/party/thoughtReport', method: 'post', data: data })
    },
    // 提交入党申请书
    submitApplication(data) {
        return request({ url: '/api/party/application', method: 'post', data: data })
    },
    // 查看我的入党申请书
    myApplication() {
        return request({ url: '/api/party/application', method: 'get' })
    },
    // 我的培训记录
    myTraining() {
        return request({ url: '/api/party/training/my', method: 'get' })
    },
    // 我的党费记录
    myFees() {
        return request({ url: '/api/party/fee/my', method: 'get' })
    },

    // ===== 书记/辅导员端 =====
    // 支部统计概览
    branchStats(branchId) {
        return request({ url: '/api/party/branch/stats', method: 'get', params: { branchId } })
    },
    // 支部党员列表
    branchMembers(query) {
        return request({ url: '/api/party/branch/members', method: 'get', params: query })
    },
    // 党员详情
    memberDetail(memberId) {
        return request({ url: '/api/party/member/' + memberId, method: 'get' })
    }
}
