import {
	parseTime
} from '@/utils/common.js'

import {
	resolveImg
} from '@/utils/image.js'

// config 只提供 baseUrl（没有 baseURL），旧写法 baseUrl + avatar 会拼出 undefined/xxx 的坏地址，
// 统一交给 resolveImg 处理 http/data 前缀与 /profile 归一
export function handleCampusUrl(avatar) {
	// 如果 avatar 为空，返回空字符串
	if (!avatar || typeof(avatar) === 'undefined') {
		return ''
	}

	return resolveImg(avatar.trim())
}

// 大致的计算时间差
export function diffTime(startDate, endDate) {
	startDate = new Date(startDate)
	endDate = new Date(endDate)
	// 时间差的毫秒数
	var diff = endDate.getTime() - startDate.getTime()
	// 计算出相差天数
	var days = Math.floor(diff / (24 * 3600 * 1000))
	// 计算出小时数
	var leave1 = diff % (24 * 3600 * 1000) // 计算天数后剩余的毫秒数
	var hours = Math.floor(leave1 / (3600 * 1000))
	// 计算相差分钟数
	var leave2 = leave1 % (3600 * 1000) // 计算小时数后剩余的毫秒数
	var minutes = Math.floor(leave2 / (60 * 1000))
	// 不足 1 分钟统一显示"1分"
	var returnStr = '1分'
	if (minutes > 0) {
		returnStr = minutes + '分'
	}
	if (hours > 0) {
		returnStr = hours + '小时'
	}
	if (days > 0) {
		returnStr = days + '天'
	}
	if (days > 30) {
		returnStr = parseInt(days / 30) + '月'
	}
	return returnStr + "前"
}

//处理时间格式
export function handelTimeFormat(startDate) {
	startDate = parseTime(startDate, "{y}/{m}/{d} {h}:{i}:{s}")
	startDate = new Date(startDate)
	var nowDate = new Date()
	//如果不是今年，则输出2022-01-01 格式时间
	//是今年的则输出大致的时间差
	if (nowDate.getFullYear() == startDate.getFullYear()) {
		return diffTime(startDate, nowDate)
	} else {

		return parseTime(startDate, "{y}-{m}-{d}")
	}


}
