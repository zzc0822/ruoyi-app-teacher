import upload from '@/utils/upload'

/**
 * 上传附件（使用附件配置）
 * @param {Object} data 
 * @param {string} data.businessType - 业务类型（teacher_photo/student_photo等）
 * @param {string} data.filePath - 文件路径
 * @param {string} data.fileName - 文件名（可选）
 */
export function uploadAttachment(data) {
  return upload({
    url: '/api/attachment/upload',  // 调用小程序专用接口
    name: 'file',
    filePath: data.filePath,
    formData: {
      businessType: data.businessType,
      fileName: data.fileName || ''
    }
  })
}

/**
 * 上传教师证件照
 * @param {string} filePath - 文件路径
 */
export function uploadTeacherPhoto(filePath) {
  return uploadAttachment({
    businessType: 'teacher_photo',
    filePath: filePath
  })
}

/**
 * 上传学生证件照
 * @param {string} filePath - 文件路径
 */
export function uploadStudentPhoto(filePath) {
  return uploadAttachment({
    businessType: 'student_photo',
    filePath: filePath
  })
}
