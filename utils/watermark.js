import { parseTime } from '@/utils/common'

/**
 * 获取当前GPS定位
 * @returns Promise<{latitude, longitude, altitude, accuracy, address}|null>
 */
export function getLocation() {
  return new Promise((resolve) => {
    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          altitude: res.altitude || 0,
          accuracy: res.accuracy || 0
        })
      },
      fail: () => {
        resolve(null)
      }
    })
  })
}

/**
 * 在照片上绘制水印
 * @param {string} filePath 原图临时路径
 * @param {object} config 水印配置 { enabled, showScene, showTime, showLocation, showAddress, sceneName, customText }
 * @param {object|null} location getLocation返回的定位对象
 * @returns Promise<string> 水印后的图片临时路径
 */
export function addWatermark(filePath, config, location) {
  return new Promise((resolve, reject) => {
    // 水印未启用，直接返回原图
    if (!config || config.enabled !== '1') {
      resolve(filePath)
      return
    }

    uni.getImageInfo({
      src: filePath,
      success: (imgInfo) => {
        // 限制最大边1920px
        const maxSide = 1920
        let drawW = imgInfo.width
        let drawH = imgInfo.height
        if (drawW > maxSide || drawH > maxSide) {
          const scale = maxSide / Math.max(drawW, drawH)
          drawW = Math.round(drawW * scale)
          drawH = Math.round(drawH * scale)
        }

        const canvasId = 'watermarkCanvas'
        uni.canvasToTempFilePath({
          canvasId: canvasId,
          x: 0,
          y: 0,
          width: drawW,
          height: drawH,
          destWidth: drawW,
          destHeight: drawH,
          fileType: 'jpg',
          quality: 0.85,
          success: () => {
            // 先确保canvas尺寸正确，再绘制
            _doDrawWatermark(canvasId, drawW, drawH, filePath, imgInfo, config, location, resolve, reject)
          },
          fail: (err) => {
            // canvas可能未就绪，直接尝试绘制
            _doDrawWatermark(canvasId, drawW, drawH, filePath, imgInfo, config, location, resolve, reject)
          }
        })
      },
      fail: () => {
        resolve(filePath)
      }
    })
  })
}

function _doDrawWatermark(canvasId, drawW, drawH, filePath, imgInfo, config, location, resolve, reject) {
  const ctx = uni.createCanvasContext(canvasId)

  // 绘制原图
  ctx.drawImage(filePath, 0, 0, drawW, drawH)

  // 构建水印文字行
  const lines = []
  const fontSize = Math.max(14, Math.round(drawW * 0.025))
  const titleSize = Math.max(18, Math.round(drawW * 0.035))
  const padding = Math.max(12, Math.round(drawW * 0.02))
  const lineGap = Math.round(fontSize * 1.6)

  // 场景名称（粗体标题）
  if (config.showScene === '1' && config.sceneName) {
    lines.push({ text: config.sceneName, size: titleSize, bold: true })
  }

  // 拍照时间
  if (config.showTime === '1') {
    const now = parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s} 星期{a}')
    lines.push({ text: now, size: fontSize, bold: false })
  }

  // GPS坐标
  if (config.showLocation === '1' && location) {
    const lat = location.latitude.toFixed(6)
    const lng = location.longitude.toFixed(6)
    let locText = '经度:' + lng + ' 纬度:' + lat
    if (location.altitude) {
      locText += ' 海拔:' + Math.round(location.altitude) + 'm'
    }
    if (location.accuracy) {
      locText += ' 精度:±' + Math.round(location.accuracy) + 'm'
    }
    lines.push({ text: locText, size: fontSize, bold: false })
  } else if (config.showLocation === '1' && !location) {
    lines.push({ text: '定位失败', size: fontSize, bold: false })
  }

  // 自定义文字
  if (config.customText && config.customText.trim()) {
    lines.push({ text: config.customText.trim(), size: fontSize, bold: false })
  }

  if (lines.length === 0) {
    // 没有需要绘制的内容，导出原图
    ctx.draw(false, () => {
      _exportCanvas(canvasId, drawW, drawH, resolve, filePath)
    })
    return
  }

  // 计算水印条高度
  const barHeight = padding * 2 + lines.reduce((sum, l) => sum + l.size + 6, 0) + (lines.length - 1) * (lineGap - fontSize - 6)
  const barY = drawH - barHeight

  // 绘制半透明黑色背景
  ctx.setFillStyle('rgba(0, 0, 0, 0.55)')
  ctx.fillRect(0, barY, drawW, barHeight)

  // 逐行绘制文字
  let textY = barY + padding
  lines.forEach((line) => {
    const actualSize = line.size
    ctx.setFontSize(actualSize)
    ctx.setFillStyle('#FFFFFF')
    if (line.bold) {
      ctx.setFontWeight('bold')
    } else {
      ctx.setFontWeight('normal')
    }
    ctx.fillText(line.text, padding, textY + actualSize)
    textY += actualSize + lineGap - actualSize + 4
  })

  ctx.draw(false, () => {
    _exportCanvas(canvasId, drawW, drawH, resolve, filePath)
  })
}

function _exportCanvas(canvasId, drawW, drawH, resolve, fallbackPath) {
  uni.canvasToTempFilePath({
    canvasId: canvasId,
    x: 0,
    y: 0,
    width: drawW,
    height: drawH,
    destWidth: drawW,
    destHeight: drawH,
    fileType: 'jpg',
    quality: 0.85,
    success: (res) => {
      resolve(res.tempFilePath)
    },
    fail: () => {
      resolve(fallbackPath)
    }
  })
}
