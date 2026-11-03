import { parseTime } from '@/utils/common'
import { getWatermarkAddress } from '@/api/work/watermark'

/** 科技蓝强调色，后台可覆盖 */
const DEFAULT_ACCENT_COLOR = '#2F7BFF'

/** 星期名称 */
const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六']

function toFlag(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  return (value === true || value === 1 || value === '1' || value === 'true') ? '1' : '0'
}

function normalizeExtraLines(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map(item => String(item == null ? '' : item).trim()).filter(Boolean)
  }
  return String(value).split(/\r?\n/).map(item => item.trim()).filter(Boolean)
}

function normalizeAccentColor(value) {
  const color = String(value || '').trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : DEFAULT_ACCENT_COLOR
}

/**
 * 统一水印配置入口。
 * 优先级：业务端显式参数 > 后台场景配置 > 组件/渲染默认值。
 *
 * @param {object|null} sceneConfig 后台场景配置
 * @param {boolean|object|null} watermark 业务端传参：
 *   false 强制关闭；true 强制开启；对象覆盖显示内容；null/undefined 完全跟随后台
 * @returns {object} 归一化后的水印配置
 */
export function resolveWatermarkConfig(sceneConfig, watermark) {
  const base = Object.assign({}, sceneConfig || {})
  const hasSceneConfig = !!(sceneConfig && typeof sceneConfig === 'object')

  if (watermark === false) {
    return Object.assign(base, { enabled: '0' })
  }

  if (watermark && typeof watermark === 'object') {
    Object.keys(watermark).forEach(key => {
      if (watermark[key] !== undefined && watermark[key] !== null) {
        base[key] = watermark[key]
      }
    })
    if (!hasSceneConfig && base.enabled === undefined) {
      base.enabled = '1'
    }
  }

  if (watermark === true) {
    base.enabled = '1'
  }

  const title = base.title || base.sceneName || ''
  return Object.assign(base, {
    enabled: toFlag(base.enabled, '0'),
    showScene: toFlag(base.showScene, '1'),
    showTime: toFlag(base.showTime, '1'),
    showWeek: toFlag(base.showWeek, '1'),
    showLocation: toFlag(base.showLocation, '1'),
    showAddress: toFlag(base.showAddress, '1'),
    title: String(title || '').trim(),
    customText: base.customText == null ? '' : String(base.customText),
    extraLines: normalizeExtraLines(base.extraLines),
    accentColor: normalizeAccentColor(base.accentColor)
  })
}

/**
 * 获取当前GPS定位
 * @returns Promise<{latitude, longitude, altitude, accuracy}|null>
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
 * 逆地理编码成功时显示地址，失败时先用业务地点兜底；坐标只画在定位行
 * @param {object} config 水印配置
 * @param {string} fallbackAddress 地址解析失败时的业务地点兜底
 * @param {boolean|object|null} [options] 业务端临时覆盖项，语义同 resolveWatermarkConfig 的 watermark
 * @returns Promise<{ready: boolean, message: string, captureInfo: object|null}>
 */
export async function prepareCapture(config, fallbackAddress, options) {
  const effective = resolveWatermarkConfig(config, options)
  if (effective.enabled !== '1') {
    return { ready: true, message: '', captureInfo: null }
  }
  const needLocation = effective.showLocation === '1' || effective.showAddress === '1'
  const location = needLocation ? await getLocation() : null
  if (needLocation && !location) {
    return { ready: false, message: '未获取到定位信息，请开放定位权限后重试', captureInfo: null }
  }
  let address = ''
  let addressSource = ''
  if (effective.showAddress === '1') {
    if (location) {
      try {
        const res = await getWatermarkAddress(location.latitude, location.longitude)
        // 兼容旧版后端把地址放在 msg 字段的响应
        address = (res && (res.data || (res.msg !== '操作成功' ? res.msg : ''))) || ''
        if (address) addressSource = 'regeo'
      } catch (e) {
        address = ''
      }
    }
    if (!address) {
      address = fallbackAddress || ''
      if (address) addressSource = 'fallback'
    }
    if (!address && location) {
      address = formatCoordinateAddress(location)
      addressSource = 'coordinate'
    }
    if (!address) {
      return { ready: false, message: '未确定水印地址，请重新定位或补充地点信息后重试', captureInfo: null }
    }
  }

  const now = new Date()
  const time = parseTime(now, '{y}-{m}-{d} {h}:{i}:{s} 星期{a}')
  const parts = splitTimeText(time)
  return {
    ready: true,
    message: '',
    captureInfo: Object.assign({}, location, {
      address: address,
      addressSource: addressSource,
      addressResolved: addressSource === 'regeo',
      time: time,
      clockText: parts.clock,
      dateText: parts.date,
      weekText: parts.week
    })
  }
}

function formatCoordinateAddress(location) {
  const latitude = Number(location.latitude).toFixed(6)
  const longitude = Number(location.longitude).toFixed(6)
  return '定位坐标：北纬' + latitude + '，东经' + longitude + '（地图地址未解析）'
}

function splitTimeText(value) {
  const text = String(value || '')
  const match = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日]?\s*(\d{1,2}):(\d{2})/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const hour = String(Number(match[4])).padStart(2, '0')
    const minute = String(Number(match[5])).padStart(2, '0')
    const weekMatch = text.match(/星期([一二三四五六日天])/)
    const weekText = weekMatch
      ? '星期' + weekMatch[1]
      : '星期' + WEEK_NAMES[new Date(year, month - 1, day).getDay()]
    return {
      clock: hour + ':' + minute,
      date: year + '年' + String(month).padStart(2, '0') + '月' + String(day).padStart(2, '0') + '日',
      week: weekText
    }
  }
  const now = new Date()
  return {
    clock: parseTime(now, '{h}:{i}'),
    date: parseTime(now, '{y}年{m}月{d}日'),
    week: '星期' + WEEK_NAMES[now.getDay()]
  }
}

/**
 * 在照片上绘制水印相机风格的水印（科技蓝）
 *
 * @param {string} filePath 原图临时路径
 * @param {object} config 后台水印配置
 * @param {object|null} captureInfo 拍照前确认的取证信息
 * @param {object} [scope] 自定义组件实例；canvas 声明在组件内时必传
 * @param {string} [canvasId] 画布 id
 * @param {boolean|object|null} [options] 业务端临时覆盖项，语义同 resolveWatermarkConfig 的 watermark
 * @returns Promise<string> 水印后的图片临时路径
 */
export function addWatermark(filePath, config, captureInfo, scope, canvasId = 'watermarkCanvas', options) {
  return new Promise((resolve) => {
    const effective = resolveWatermarkConfig(config, options)
    if (effective.enabled !== '1') {
      resolve(filePath)
      return
    }

    uni.getImageInfo({
      src: filePath,
      success: (imgInfo) => {
        // 取证信息保持清晰即可，过大的 Canvas 会明显拖慢手机端绘制。
        const maxSide = 1600
        let drawW = imgInfo.width
        let drawH = imgInfo.height
        if (drawW > maxSide || drawH > maxSide) {
          const scale = maxSide / Math.max(drawW, drawH)
          drawW = Math.round(drawW * scale)
          drawH = Math.round(drawH * scale)
        }
        _doDrawWatermark(canvasId, drawW, drawH, filePath, effective, captureInfo, resolve, scope)
      },
      fail: () => {
        resolve(filePath)
      }
    })
  })
}

function _doDrawWatermark(canvasId, drawW, drawH, filePath, config, captureInfo, resolve, scope) {
  // canvas 在自定义组件内时必须带上组件实例，页面内则不能带，否则小程序找不到画布
  const ctx = scope ? uni.createCanvasContext(canvasId, scope) : uni.createCanvasContext(canvasId)
  ctx.drawImage(filePath, 0, 0, drawW, drawH)

  const layout = buildWatermarkLayout(ctx, drawW, drawH, config, captureInfo)
  if (!layout.rows.length) {
    ctx.draw(false, () => _exportCanvas(canvasId, drawW, drawH, resolve, filePath, scope))
    return
  }

  drawBackdrop(ctx, drawW, drawH, layout)
  drawAccentBar(ctx, layout)
  drawRows(ctx, layout)

  ctx.draw(false, () => _exportCanvas(canvasId, drawW, drawH, resolve, filePath, scope))
}

function buildWatermarkLayout(ctx, drawW, drawH, config, captureInfo) {
  const padding = Math.max(20, Math.round(drawW * 0.035))
  const left = padding
  const accentWidth = Math.max(5, Math.round(drawW * 0.006))
  const accentGap = Math.max(10, Math.round(drawW * 0.012))
  const textLeft = left + accentWidth + accentGap
  const maxTextWidth = drawW - textLeft - padding
  const titleSize = Math.max(18, Math.min(34, Math.round(drawW * 0.032)))
  const clockSize = Math.max(42, Math.min(96, Math.round(drawW * 0.086)))
  const bodySize = Math.max(17, Math.min(30, Math.round(drawW * 0.028)))
  const smallSize = Math.max(15, Math.min(26, Math.round(drawW * 0.024)))
  const rows = []

  const timeParts = splitTimeText(captureInfo && captureInfo.time)
  const clockText = (captureInfo && captureInfo.clockText) || timeParts.clock
  const dateText = (captureInfo && captureInfo.dateText) || timeParts.date
  const weekText = (captureInfo && captureInfo.weekText) || timeParts.week

  if (config.showScene === '1' && config.title) {
    ctx.setFontSize(titleSize)
    const titleWidth = Math.min(ctx.measureText(config.title).width, maxTextWidth - titleSize * 1.5)
    rows.push({
      type: 'title',
      text: config.title,
      size: titleSize,
      height: Math.round(titleSize * 1.7),
      pillWidth: Math.min(maxTextWidth, Math.round(titleWidth + titleSize * 1.5)),
      pillHeight: Math.round(titleSize * 1.55)
    })
  }

  if (config.showTime === '1') {
    rows.push({ type: 'clock', text: clockText, size: clockSize, height: Math.round(clockSize * 1.12) })
    const dateLine = config.showWeek === '1' ? dateText + '  ' + weekText : dateText
    rows.push({ type: 'date', text: dateLine, size: bodySize, height: Math.round(bodySize * 1.55) })
  }

  const addressSource = captureInfo && captureInfo.addressSource
  const address = captureInfo && captureInfo.address && addressSource !== 'coordinate'
    ? captureInfo.address : ''
  if (config.showAddress === '1' && address) {
    ctx.setFontSize(bodySize)
    const addressLines = wrapText(ctx, address, maxTextWidth - bodySize * 1.3, 2)
    rows.push({
      type: 'address',
      lines: addressLines,
      size: bodySize,
      height: Math.round(bodySize * 1.45) * addressLines.length
    })
  }

  if (config.showLocation === '1') {
    let locationText = '定位信息获取失败'
    if (captureInfo && captureInfo.latitude != null && captureInfo.longitude != null) {
      const lat = Number(captureInfo.latitude).toFixed(6)
      const lng = Number(captureInfo.longitude).toFixed(6)
      locationText = '经纬度 ' + lat + ', ' + lng
      if (captureInfo.accuracy) {
        locationText += '  ±' + Math.round(captureInfo.accuracy) + 'm'
      }
    }
    rows.push({ type: 'meta', text: locationText, size: smallSize, height: Math.round(smallSize * 1.5) })
  }

  const extras = []
  if (config.customText && config.customText.trim()) {
    extras.push(config.customText.trim())
  }
  ;(config.extraLines || []).forEach(line => {
    if (line && line.trim()) extras.push(line.trim())
  })
  extras.forEach(text => {
    ctx.setFontSize(smallSize)
    wrapText(ctx, text, maxTextWidth, 2).forEach((line, index) => {
      rows.push({
        type: index === 0 ? 'extra' : 'meta',
        text: line,
        size: smallSize,
        height: Math.round(smallSize * 1.45)
      })
    })
  })

  const rowGap = Math.max(4, Math.round(bodySize * 0.18))
  const contentHeight = rows.reduce((sum, row) => sum + row.height, 0) + rowGap * Math.max(0, rows.length - 1)
  const blockBottom = drawH - Math.round(padding * 0.9)
  const blockTop = Math.max(padding, blockBottom - contentHeight - padding)
  const blockHeight = blockBottom - blockTop

  return {
    drawW,
    drawH,
    padding,
    left,
    textLeft,
    accentWidth,
    maxTextWidth,
    rows,
    rowGap,
    blockTop,
    blockBottom,
    blockHeight,
    accentColor: config.accentColor
  }
}

function drawBackdrop(ctx, drawW, drawH, layout) {
  const scrimTop = Math.max(0, layout.blockTop - layout.padding * 2)
  const gradient = ctx.createLinearGradient ? ctx.createLinearGradient(0, scrimTop, 0, drawH) : null
  if (gradient && gradient.addColorStop) {
    gradient.addColorStop(0, 'rgba(3, 12, 30, 0)')
    gradient.addColorStop(0.45, 'rgba(3, 12, 30, 0.38)')
    gradient.addColorStop(1, 'rgba(3, 12, 30, 0.86)')
    ctx.setFillStyle(gradient)
  } else {
    ctx.setFillStyle('rgba(3, 12, 30, 0.62)')
  }
  ctx.fillRect(0, scrimTop, drawW, drawH - scrimTop)

  // 科技蓝侧光，让水印区域和照片有层次
  const glow = ctx.createLinearGradient
    ? ctx.createLinearGradient(0, layout.blockTop, drawW * 0.55, layout.blockTop)
    : null
  if (glow && glow.addColorStop) {
    glow.addColorStop(0, hexToRgba(layout.accentColor, 0.18))
    glow.addColorStop(1, 'rgba(47, 123, 255, 0)')
    ctx.setFillStyle(glow)
    ctx.fillRect(0, layout.blockTop - layout.padding, drawW * 0.62, layout.blockHeight + layout.padding * 2)
  }
}

function drawAccentBar(ctx, layout) {
  const barTop = layout.blockTop + layout.padding * 0.35
  const barHeight = Math.max(layout.accentWidth * 2, layout.blockHeight - layout.padding * 0.7)
  roundRect(ctx, layout.left, barTop, layout.accentWidth, barHeight, layout.accentWidth / 2)
  ctx.setFillStyle(layout.accentColor)
  ctx.fill()
}

function drawRows(ctx, layout) {
  let y = layout.blockTop + layout.padding
  if (ctx.setShadow) {
    ctx.setShadow(0, 2, 6, 'rgba(0, 0, 0, 0.45)')
  }

  layout.rows.forEach(row => {
    if (row.type === 'title') {
      const pillY = y + Math.max(0, (row.height - row.pillHeight) / 2)
      roundRect(ctx, layout.textLeft, pillY, row.pillWidth, row.pillHeight, row.pillHeight / 2)
      ctx.setFillStyle(layout.accentColor)
      ctx.fill()
      ctx.setFontSize(row.size)
      ctx.setFillStyle('#FFFFFF')
      if (ctx.setFontWeight) ctx.setFontWeight('bold')
      if (ctx.setTextBaseline) ctx.setTextBaseline('middle')
      ctx.fillText(ellipsizeIfNeeded(ctx, row.text, row.pillWidth - row.size * 1.2),
        layout.textLeft + row.size * 0.75, pillY + row.pillHeight / 2)
      if (ctx.setTextBaseline) ctx.setTextBaseline('alphabetic')
    } else if (row.type === 'clock') {
      ctx.setFontSize(row.size)
      ctx.setFillStyle('#FFFFFF')
      if (ctx.setFontWeight) ctx.setFontWeight('bold')
      ctx.fillText(row.text, layout.textLeft, y + row.size)
    } else if (row.type === 'date') {
      ctx.setFontSize(row.size)
      ctx.setFillStyle('rgba(255, 255, 255, 0.86)')
      if (ctx.setFontWeight) ctx.setFontWeight('normal')
      ctx.fillText(row.text, layout.textLeft, y + row.size)
    } else if (row.type === 'address') {
      const iconSize = Math.round(row.size * 0.82)
      const iconX = layout.textLeft + iconSize / 2
      const iconY = y + row.size * 0.78
      drawLocationPin(ctx, iconX, iconY, iconSize, layout.accentColor)
      ctx.setFontSize(row.size)
      ctx.setFillStyle('#FFFFFF')
      if (ctx.setFontWeight) ctx.setFontWeight('normal')
      row.lines.forEach((line, index) => {
        ctx.fillText(line, layout.textLeft + iconSize * 1.35, y + row.size + index * row.size * 1.45)
      })
    } else {
      ctx.setFontSize(row.size)
      ctx.setFillStyle(row.type === 'extra' ? 'rgba(230, 240, 255, 0.92)' : 'rgba(214, 226, 245, 0.72)')
      if (ctx.setFontWeight) ctx.setFontWeight('normal')
      ctx.fillText(row.text, layout.textLeft, y + row.size)
    }
    y += row.height + layout.rowGap
  })

  if (ctx.setShadow) {
    ctx.setShadow(0, 0, 0, 'rgba(0, 0, 0, 0)')
  }
}

function drawLocationPin(ctx, x, y, size, color) {
  const radius = size * 0.32
  const top = y - size * 0.22
  ctx.beginPath()
  ctx.moveTo(x, y + size * 0.46)
  ctx.bezierCurveTo(x - size * 0.48, y - size * 0.08, x - size * 0.42, top - radius, x, top - radius)
  ctx.bezierCurveTo(x + size * 0.42, top - radius, x + size * 0.48, y - size * 0.08, x, y + size * 0.46)
  ctx.closePath()
  ctx.setFillStyle(color)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, top - radius * 0.1, radius * 0.36, 0, Math.PI * 2)
  ctx.setFillStyle('#FFFFFF')
  ctx.fill()
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const chars = Array.from(String(text || ''))
  if (!chars.length) return []
  const lines = []
  let current = ''
  for (let i = 0; i < chars.length; i++) {
    const test = current + chars[i]
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current)
      current = chars[i]
      if (lines.length >= maxLines) {
        const remaining = current + chars.slice(i + 1).join('')
        lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1] + remaining, maxWidth)
        return lines
      }
    } else {
      current = test
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
}

function ellipsize(ctx, text, maxWidth) {
  let value = text
  while (value.length > 1 && ctx.measureText(value + '…').width > maxWidth) {
    value = value.slice(0, -1)
  }
  return value + '…'
}

function ellipsizeIfNeeded(ctx, text, maxWidth) {
  if (!maxWidth || ctx.measureText(text).width <= maxWidth) return text
  return ellipsize(ctx, text, maxWidth)
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arc(x + width - r, y + r, r, -Math.PI / 2, 0)
  ctx.lineTo(x + width, y + height - r)
  ctx.arc(x + width - r, y + height - r, r, 0, Math.PI / 2)
  ctx.lineTo(x + r, y + height)
  ctx.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  ctx.closePath()
}

function hexToRgba(color, alpha) {
  let hex = String(color || '').replace('#', '')
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return 'rgba(47, 123, 255, ' + alpha + ')'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')'
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
    quality: 0.82,
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
