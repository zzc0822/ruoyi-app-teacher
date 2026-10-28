export function getDefaultGraduationYear(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return month >= 8 ? year + 1 : year
}
