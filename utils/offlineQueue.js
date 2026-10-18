import request from '@/utils/request'
import { uploadFileTo } from '@/utils/upload'
import { getToken } from '@/utils/auth'

const STORAGE_KEY = 'offline_request_queue_v1'
const MAX_ITEMS = 100
const RETRY_BASE_MS = 15000
const RETRY_MAX_MS = 5 * 60 * 1000

let flushing = false
let retryTimer = null
let initialized = false

function readQueue() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function writeQueue(list) {
  const safe = (list || [])
    .filter(item => item && item.localId)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(-MAX_ITEMS)
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(safe))
  uni.$emit && uni.$emit('offlineQueueChanged')
  return safe
}

function randomPart() {
  return Math.random().toString(36).slice(2, 10)
}

export function makeClientRequestId(prefix = 'REQ') {
  return String(prefix).toUpperCase() + '-' + Date.now().toString(36) + '-'
    + randomPart().toUpperCase()
}

function stableValue(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(stableValue)
  if (typeof value !== 'object') return value
  const out = {}
  Object.keys(value).sort().forEach(key => {
    out[key] = stableValue(value[key])
  })
  return out
}

export function fingerprintRequest(requestConfig = {}) {
  const seed = JSON.stringify(stableValue({
    url: requestConfig.url,
    method: (requestConfig.method || 'get').toLowerCase(),
    data: requestConfig.data || null
  }))
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return 'fp_' + Math.abs(hash)
}

export function isNetworkFailure(error) {
  if (!error) return false
  if (error.network === true) return true
  const message = String(error.message || error.errMsg || error || '')
  return message.indexOf('连接异常') > -1
    || message.indexOf('超时') > -1
    || message.indexOf('timeout') > -1
    || message.indexOf('Network') > -1
    || message.indexOf('网络') > -1
    || message.indexOf('会话') > -1
    || message.indexOf('登录状态') > -1
}

function toUploadResult(upload) {
  return {
    runtimePath: upload.localPath,
    uploadUrl: upload.uploadUrl || '/common/upload',
    field: upload.field || 'file',
    formData: upload.formData || {},
    pathPrefix: upload.pathPrefix || '',
    defaults: upload.defaults || {},
    uploaded: !!upload.uploaded,
    response: upload.response || null
  }
}

function setByPath(target, path, value) {
  if (!target || !path) return
  const parts = []
  path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean).forEach(p => parts.push(p))
  let cursor = target
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (cursor[key] === undefined || cursor[key] === null) {
      cursor[key] = /^\d+$/.test(parts[i + 1]) ? [] : {}
    }
    cursor = cursor[key]
  }
  cursor[parts[parts.length - 1]] = value
}

function getByPath(source, path) {
  if (!source || !path) return undefined
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
    .reduce((value, key) => value == null ? undefined : value[key], source)
}

function applyUploadResponse(item, upload) {
  const result = upload.response || {}
  const root = result.data || result
  const prefix = upload.pathPrefix || ''
  const mapping = {
    fileName: ['fileName', 'originalFilename', 'newFileName'],
    filePath: ['filePath', 'url', 'fileName'],
    fileSize: ['fileSize', 'size'],
    fileType: ['fileType', 'mimeType'],
    mediaType: ['mediaType'],
    exifData: ['exifData']
  }
  Object.keys(mapping).forEach(targetKey => {
    let value = undefined
    for (const sourceKey of mapping[targetKey]) {
      value = getByPath(root, sourceKey)
      if (value !== undefined && value !== null) break
    }
    if ((value === undefined || value === null || value === '') && upload.defaults) {
      value = upload.defaults[targetKey]
    }
    if (value !== undefined) {
      setByPath(item.data, prefix ? prefix + '.' + targetKey : targetKey, value)
    }
  })
}

function saveLocalFile(path) {
  if (!path || typeof uni.saveFile !== 'function') return Promise.resolve(path)
  if (/^(https?:|\/profile|wxfile:\/\/usr)/.test(path)) return Promise.resolve(path)
  return new Promise(resolve => {
    uni.saveFile({
      tempFilePath: path,
      success: res => resolve(res.savedFilePath || path),
      fail: () => resolve(path)
    })
  })
}

async function persistUploads(uploads) {
  const result = []
  for (const raw of uploads || []) {
    const upload = toUploadResult(raw)
    upload.localPath = await saveLocalFile(upload.localPath)
    result.push(upload)
  }
  return result
}

/**
 * 入队。返回 { duplicate, item }，不抛网络异常。
 */
export async function enqueueRequest(options) {
  const list = readQueue()
  const config = options.request || {}
  const data = config.data == null ? null : JSON.parse(JSON.stringify(config.data))
  if (data && options.clientRequestId && !data.clientRequestId) {
    data.clientRequestId = options.clientRequestId
  }
  const normalized = {
    localId: makeClientRequestId('QUEUE'),
    businessType: options.businessType || 'offline_request',
    title: options.title || '待同步业务',
    request: {
      url: config.url,
      method: config.method || 'post',
      data
    },
    uploads: await persistUploads(options.uploads),
    createdAt: Date.now(),
    retryCount: 0,
    nextRetryAt: 0,
    status: 'pending',
    lastError: ''
  }
  normalized.fingerprint = options.fingerprint || fingerprintRequest(normalized.request)
  const duplicate = list.find(item => item.fingerprint === normalized.fingerprint
    && item.status !== 'done')
  if (duplicate) {
    return { duplicate: true, item: duplicate }
  }
  list.push(normalized)
  writeQueue(list)
  uni.$emit && uni.$emit('offlineQueueEnqueued', normalized)
  return { duplicate: false, item: normalized }
}

function retryDelay(retryCount) {
  return Math.min(RETRY_BASE_MS * Math.pow(2, Math.max(0, retryCount - 1)), RETRY_MAX_MS)
}

function scheduleFlush(delay) {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    retryTimer = null
    flushOfflineQueue()
  }, delay)
}

async function processItem(item) {
  for (const upload of item.uploads || []) {
    if (upload.uploaded) {
      applyUploadResponse(item, upload)
      continue
    }
    const result = await uploadFileTo(upload.uploadUrl, upload.runtimePath, upload.formData, {
      silent: true,
      timeout: 30000,
      name: upload.field || 'file'
    })
    upload.response = result
    upload.uploaded = true
    applyUploadResponse(item, upload)
  }
  await request({
    url: item.request.url,
    method: item.request.method || 'post',
    data: item.request.data,
    silent: true,
    timeout: 30000
  })
}

export async function flushOfflineQueue() {
  if (flushing || !getToken()) return { synced: 0, pending: readQueue().length, failed: 0 }
  flushing = true
  let synced = 0
  try {
    let list = readQueue()
    for (const item of list) {
      if (item.status !== 'pending') continue
      if (item.nextRetryAt && item.nextRetryAt > Date.now()) continue
      try {
        await processItem(item)
        list = list.filter(x => x.localId !== item.localId)
        synced++
        writeQueue(list)
        uni.$emit && uni.$emit('offlineQueueSynced', item)
        uni.$emit && uni.$emit('refreshHomeData')
      } catch (error) {
        if (isNetworkFailure(error)) {
          item.status = 'pending'
          item.retryCount = (item.retryCount || 0) + 1
          item.nextRetryAt = Date.now() + retryDelay(item.retryCount)
        } else {
          item.status = 'failed'
        }
        item.lastError = String(error.message || error.msg || error || '同步失败').slice(0, 300)
        writeQueue(list)
        uni.$emit && uni.$emit('offlineQueueItemFailed', item)
      }
    }
  } finally {
    flushing = false
    const remaining = readQueue()
    const pending = remaining.filter(item => item.status === 'pending')
    if (pending.length) {
      const next = Math.min.apply(null, pending.map(item => item.nextRetryAt || Date.now()))
      scheduleFlush(Math.max(1000, next - Date.now()))
    }
  }
  const remaining = readQueue()
  return {
    synced,
    pending: remaining.filter(item => item.status === 'pending').length,
    failed: remaining.filter(item => item.status === 'failed').length
  }
}

export function getOfflineQueue() {
  return readQueue()
}

export function getOfflineSummary() {
  const list = readQueue()
  return {
    total: list.length,
    pending: list.filter(item => item.status === 'pending').length,
    failed: list.filter(item => item.status === 'failed').length,
    items: list
  }
}

export function retryOfflineItem(localId) {
  const list = readQueue()
  const item = list.find(x => x.localId === localId)
  if (!item) return
  item.status = 'pending'
  item.nextRetryAt = 0
  item.lastError = ''
  writeQueue(list)
  flushOfflineQueue()
}

export function retryAllOfflineItems() {
  const list = readQueue()
  list.forEach(item => {
    if (item.status === 'failed') {
      item.status = 'pending'
      item.nextRetryAt = 0
      item.lastError = ''
    }
  })
  writeQueue(list)
  flushOfflineQueue()
}

export function discardOfflineItem(localId) {
  writeQueue(readQueue().filter(item => item.localId !== localId))
}

export function initOfflineQueue() {
  if (initialized) return
  initialized = true
  if (uni.onNetworkStatusChange) {
    uni.onNetworkStatusChange(res => {
      if (res.isConnected) flushOfflineQueue()
    })
  }
  setInterval(() => {
    if (getOfflineSummary().pending > 0) flushOfflineQueue()
  }, 60000)
  flushOfflineQueue()
}
