/**
 * 校历动态上课规则
 *
 * dayType: 0=教学日 / 1=周末休息 / 2=法定节假日 / 3=假期
 * 调休上课日（如「国庆节调课(上10月7日)」）仍为 dayType=0，
 * 从 holidayName 中解析被调日期的星期，课表按被调日期上课。
 */

export function parseMakeupWeekday(day) {
  const text = (day && day.holidayName) || ''
  const match = text.match(/(?:上|补上|补)\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (!match) return 0
  const calDate = String((day && day.calDate) || '')
  const year = Number(calDate.substring(0, 4)) || new Date().getFullYear()
  const month = Number(match[1])
  const date = Number(match[2])
  if (!month || !date) return 0
  const target = new Date(year, month - 1, date)
  const weekday = target.getDay()
  return weekday === 0 ? 7 : weekday
}

export function resolveCalendarRule(day) {
  if (!day) return null
  const dayType = day.dayType == null ? '' : String(day.dayType)
  const isHoliday = Number(day.isHoliday) === 1
  const weekday = Number(day.weekday) || 0
  const holidayName = day.holidayName || ''
  const makeupWeekday = parseMakeupWeekday(day)

  if (isHoliday || dayType === '2' || dayType === '3') {
    return {
      isTeachingDay: false,
      effectiveWeekday: 0,
      holidayName,
      isMakeup: false
    }
  }

  if (dayType === '1' && !makeupWeekday) {
    return {
      isTeachingDay: false,
      effectiveWeekday: 0,
      holidayName: '',
      isMakeup: false
    }
  }

  return {
    isTeachingDay: true,
    effectiveWeekday: makeupWeekday || weekday,
    holidayName,
    isMakeup: !!makeupWeekday || (weekday >= 6 && dayType === '0')
  }
}
