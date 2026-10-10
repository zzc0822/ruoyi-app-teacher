import { parseTime } from '@/utils/common'
import { getWatermarkAddress } from '@/api/work/watermark'

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
 * 拍照前确认水印取证信息：水印时间取确认时刻，水印地址由后端逆地理编码得出
 * 未取到定位或地址时返回 ready=false，由调用方阻断拍照并提示
 * @param {object} config 水印配置
 * @param {string} fallbackAddress 逆地理编码无结果时的地址兜底（如上课地点）
 * @returns Promise<{ready: boolean, message: string, captureInfo: object|null}>
 */
export async function prepareCapture(config, fallbackAddress) {
  if (!config || config.enabled !== '1') {
    return { ready: true, message: '', captureInfo: null }
  }
  const needLocation = config.showLocation === '1' || config.showAddress === '1'
  const location = needLocation ? await getLocation() : null
  if (needLocation && !location) {
    return { ready: false, message: '未获取到定位信息，请开放定位权限后重试', captureInfo: null }
  }
  let address = ''
  if (config.showAddress === '1') {
    if (location) {
      try {
        const res = await getWatermarkAddress(location.latitude, location.longitude)
        address = (res && res.data) || ''
      } catch (e) {
        address = ''
      }
    }
    if (!address) {
      address = fallbackAddress || ''
    }
    if (!address) {
      return { ready: false, message: '未确定水印地址，请重新定位或补充地点信息后重试', captureInfo: null }
    }
  }
  const time = parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s} 星期{a}')
  return { ready: true, message: '', captureInfo: Object.assign({}, location, { address: address, time: time }) }
}

/**
 * 在照片上绘制水印
 * @param {string} filePath 原图临时路径
 * @param {object} config 水印配置 { enabled, showScene, showTime, showLocation, showAddress, sceneName, customText }
 * @param {object|null} captureInfo 拍照前确认的取证信息 { latitude, longitude, altitude, accuracy, address, time }
 * @param {object} [scope] 自定义组件实例；canvas 声明在组件内时必传，小程序才找得到该组件作用域下的 canvas
 * @returns Promise<string> 水印后的图片临时路径
 */
export function addWatermark(filePath, config, captureInfo, scope) {
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
            _doDrawWatermark(canvasId, drawW, drawH, filePath, imgInfo, config, captureInfo, resolve, reject, scope)
          },
          fail: (err) => {
            // canvas可能未就绪，直接尝试绘制
            _doDrawWatermark(canvasId, drawW, drawH, filePath, imgInfo, config, captureInfo, resolve, reject, scope)
          }
        }, scope)
      },
      fail: () => {
        resolve(filePath)
      }
    })
  })
}

function _doDrawWatermark(canvasId, drawW, drawH, filePath, imgInfo, config, captureInfo, resolve, reject, scope) {
  // canvas 在自定义组件内时必须带上组件实例，页面内则不能带，否则小程序找不到画布
  const ctx = scope ? uni.createCanvasContext(canvasId, scope) : uni.createCanvasContext(canvasId)

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

  // 拍照时间（拍照前已确认的时间快照，缺失时取当前时间）
  if (config.showTime === '1') {
    const time = captureInfo && captureInfo.time
      ? captureInfo.time
      : parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s} 星期{a}')
    lines.push({ text: time, size: fontSize, bold: false })
  }

  // GPS坐标
  const location = captureInfo
  if (config.showLocation === '1' && location && location.latitude != null) {
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
  } else if (config.showLocation === '1') {
    lines.push({ text: '定位失败', size: fontSize, bold: false })
  }

  // 地理地址（拍照前由后端逆地理编码确认）
  if (config.showAddress === '1' && captureInfo && captureInfo.address) {
    lines.push({ text: captureInfo.address, size: fontSize, bold: false })
  }

  // 自定义文字
  if (config.customText && config.customText.trim()) {
    lines.push({ text: config.customText.trim(), size: fontSize, bold: false })
  }

  if (lines.length === 0) {
    // 没有需要绘制的内容，导出原图
    ctx.draw(false, () => {
      _exportCanvas(canvasId, drawW, drawH, resolve, filePath, scope)
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
    _exportCanvas(canvasId, drawW, drawH, resolve, filePath, scope)
  })
}

function _exportCanvas(canvasId, drawW, drawH, resolve, fallbackPath, scope) {
  const options = {
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
  }
  // 传第二个参数即按自定义组件作用域找 canvas；页面里的 canvas 必须不传，否则小程序找不到
  if (scope) {
    uni.canvasToTempFilePath(options, scope)
  } else {
    uni.canvasToTempFilePath(options)
  }
}
