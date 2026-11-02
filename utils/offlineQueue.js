import request from '@/utils/request'
import { uploadFileTo } from '@/utils/upload'
import { getToken } from '@/utils/auth'

const STORAGE_KEY = 'offline_request_queue_v1'
const MAX_ITEMS = 100
const RETRY_BASE_MS = 15000
const RETRY_MAX_MS = 5 * 60 * 1000

let flushing = false
let flushPromise = null
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
    data: requestConfig.data || null,
    params: requestConfig.params || null,
    followUps: requestConfig.followUps || null
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

function isRetryableFailure(error) {
  return isNetworkFailure(error) || !!(error && (error.retryable === true || error.transient === true))
}

function toUploadResult(upload) {
  const runtimePath = upload.runtimePath || upload.localPath
  return Object.assign({}, upload, {
    runtimePath,
    localPath: runtimePath,
    uploadUrl: upload.uploadUrl || '/common/upload',
    field: upload.field || 'file',
    formData: upload.formData || {},
    pathPrefix: upload.pathPrefix || '',
    jsonArrayPath: upload.jsonArrayPath || '',
    jsonArrayValue: upload.jsonArrayValue || 'filePath',
    dataPath: upload.dataPath || '',
    dataPathPrefix: upload.dataPathPrefix || '',
    responseFields: upload.responseFields || null,
    defaults: upload.defaults || {},
    uploaded: !!upload.uploaded,
    response: upload.response || null
  })
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

function extractUploadValues(upload) {
  const result = upload.response || {}
  const data = result.data
  const root = data && typeof data === 'object' ? data : result
  const mapping = {
    id: ['attachmentId', 'id'],
    fileName: ['fileName', 'originalFilename', 'newFileName'],
    filePath: ['filePath', 'fileName', 'url'],
    fileSize: ['fileSize', 'size'],
    fileType: ['fileType', 'mimeType'],
    mediaType: ['mediaType'],
    exifData: ['exifData']
  }
  const values = {}
  Object.keys(mapping).forEach(targetKey => {
    let value
    if (targetKey === 'filePath' && typeof data === 'string' && data) {
      value = data
    }
    const configuredFields = upload.responseFields && upload.responseFields[targetKey]
    const sourceKeys = configuredFields
      ? (Array.isArray(configuredFields) ? configuredFields : [configuredFields])
      : mapping[targetKey]
    for (const sourceKey of sourceKeys) {
      if (value !== undefined && value !== null && value !== '') break
      value = getByPath(root, sourceKey)
      if (value !== undefined && value !== null && value !== '') break
    }
    if ((value === undefined || value === null || value === '') && upload.defaults) {
      value = upload.defaults[targetKey]
    }
    values[targetKey] = value
  })
  return values
}

function appendJsonArrayValue(requestData, path, value) {
  if (!requestData || !path || value === undefined || value === null || value === '') return
  let list = []
  const current = getByPath(requestData, path)
  if (Array.isArray(current)) {
    list = current.slice()
  } else if (typeof current === 'string' && current.trim()) {
    try {
      const parsed = JSON.parse(current)
      if (Array.isArray(parsed)) list = parsed.slice()
    } catch (e) {
      list = []
    }
  }
  if (!list.some(item => item === value)) list.push(value)
  setByPath(requestData, path, JSON.stringify(list))
}

function applyUploadResponse(requestData, upload) {
  const values = extractUploadValues(upload)
  if (upload.jsonArrayPath) {
    appendJsonArrayValue(
      requestData,
      upload.jsonArrayPath,
      values[upload.jsonArrayValue || 'filePath']
    )
    return
  }
  if (upload.dataPath) {
    const value = values[upload.jsonArrayValue || 'filePath']
    if (value !== undefined) setByPath(requestData, upload.dataPath, value)
    return
  }
  if (upload.dataPathPrefix) {
    Object.keys(values).forEach(targetKey => {
      const value = values[targetKey]
      if (value !== undefined) {
        setByPath(requestData, upload.dataPathPrefix + '.' + targetKey, value)
      }
    })
    return
  }
  const prefix = upload.pathPrefix || ''
  Object.keys(values).forEach(targetKey => {
    const value = values[targetKey]
    if (value !== undefined) {
      setByPath(requestData, prefix ? prefix + '.' + targetKey : targetKey, value)
    }
  })
}

function persistQueuedItem(item) {
  if (!item || !item.localId) return
  const list = readQueue()
  const index = list.findIndex(entry => entry.localId === item.localId)
  if (index < 0) return
  list[index] = item
  writeQueue(list)
}

function saveLocalFile(path) {
  if (!path || typeof uni.saveFile !== 'function') return Promise.resolve(path)
  const value = String(path)
  const isRemote = /^https?:\/\//.test(value) && !/^https?:\/\/tmp\//.test(value)
  if (isRemote || /^(\/profile|wxfile:\/\/usr)/.test(value)) return Promise.resolve(path)
  return new Promise(resolve => {
    uni.saveFile({
      tempFilePath: path,
      success: res => resolve(res.savedFilePath || path),
      fail: () => resolve(path)
    })
  })
}

function normalizeUploads(uploads) {
  return (uploads || []).filter(Boolean).map(toUploadResult)
}

function normalizeRequest(config = {}) {
  return {
    url: config.url,
    method: config.method || 'post',
    data: config.data == null ? null : JSON.parse(JSON.stringify(config.data)),
    params: config.params ? JSON.parse(JSON.stringify(config.params)) : undefined
  }
}

function normalizeFollowUps(followUps) {
  return (followUps || [])
    .filter(item => item && item.request && item.request.url)
    .map(item => normalizeRequest(item.request))
}

async function persistQueuedUploads(localId) {
  let item = readQueue().find(entry => entry.localId === localId)
  if (!item || item.status !== 'preparing') return
  const uploads = item.uploads || []
  for (const upload of uploads) {
    upload.runtimePath = await saveLocalFile(upload.runtimePath || upload.localPath)
    upload.localPath = upload.runtimePath
  }

  const latest = readQueue()
  const latestItem = latest.find(entry => entry.localId === localId)
  if (!latestItem || latestItem.status !== 'preparing') return
  latestItem.uploads = uploads
  latestItem.filesReady = true
  latestItem.status = 'pending'
  writeQueue(latest)
  flushOfflineQueue()
}

function resumePreparingUploads(list) {
  ;(list || [])
    .filter(item => item && item.status === 'preparing')
    .forEach(item => {
      setTimeout(() => {
        persistQueuedUploads(item.localId)
      }, 0)
    })
}

/**
 * 入队。返回 { duplicate, item }，不抛网络异常。
 */
export async function enqueueRequest(options) {
  const list = readQueue()
  const requestConfig = normalizeRequest(options.request)
  const data = requestConfig.data
  if (data && options.clientRequestId && !data.clientRequestId) {
    data.clientRequestId = options.clientRequestId
  }
  const uploads = normalizeUploads(options.uploads)
  const followUps = normalizeFollowUps(options.followUps)
  const normalized = {
    localId: makeClientRequestId('QUEUE'),
    businessType: options.businessType || 'offline_request',
    title: options.title || '待同步业务',
    skipRequest: !!options.skipRequest,
    dependsOnClientRequestId: options.dependsOnClientRequestId || '',
    request: requestConfig,
    followUps,
    uploads,
    filesReady: uploads.length === 0,
    createdAt: Date.now(),
    retryCount: 0,
    nextRetryAt: 0,
    status: uploads.length ? 'preparing' : 'pending',
    lastError: ''
  }
  normalized.fingerprint = options.fingerprint || fingerprintRequest({
    ...normalized.request,
    followUps: normalized.followUps,
    uploads: normalized.skipRequest
      ? normalized.uploads.map(upload => ({
        localPath: upload.localPath,
        uploadUrl: upload.uploadUrl,
        formData: upload.formData,
        pathPrefix: upload.pathPrefix,
        jsonArrayPath: upload.jsonArrayPath
      }))
      : null
  })
  const duplicate = list.find(item => item.fingerprint === normalized.fingerprint
    && item.status !== 'done')
  if (duplicate) {
    return { duplicate: true, item: duplicate }
  }
  list.push(normalized)
  writeQueue(list)
  uni.$emit && uni.$emit('offlineQueueEnqueued', normalized)
  if (uploads.length) {
    setTimeout(() => {
      persistQueuedUploads(normalized.localId)
    }, 0)
  }
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

function requestClientRequestId(item) {
  const data = item && item.request && item.request.data
  return data && data.clientRequestId ? data.clientRequestId : ''
}

function blockingDependency(item, list) {
  const dependencyId = item && item.dependsOnClientRequestId
  if (!dependencyId) return null
  return (list || []).find(entry => {
    return entry.localId !== item.localId
      && entry.status !== 'done'
      && !entry.skipRequest
      && requestClientRequestId(entry) === dependencyId
  }) || null
}

async function processItem(item) {
  if (blockingDependency(item, readQueue())) {
    const error = new Error('等待查课记录同步后再上传照片')
    error.transient = true
    throw error
  }
  for (const upload of item.uploads || []) {
    if (upload.uploaded) {
      if (!item.skipRequest) applyUploadResponse(item.request.data, upload)
      continue
    }
    const result = await uploadFileTo(upload.uploadUrl, upload.runtimePath, upload.formData, {
      silent: true,
      timeout: 120000,
      name: upload.field || 'file'
    })
    upload.response = result
    upload.uploaded = true
    if (!item.skipRequest) applyUploadResponse(item.request.data, upload)
    persistQueuedItem(item)
  }
  if (!item.skipRequest) {
    await request({
      url: item.request.url,
      method: item.request.method || 'post',
      data: item.request.data,
      params: item.request.params,
      silent: true,
      timeout: 30000
    })
  }
  for (const followUp of item.followUps || []) {
    await request({
      url: followUp.url,
      method: followUp.method || 'put',
      data: followUp.data,
      params: followUp.params,
      silent: true,
      timeout: 30000
    })
  }
}

function pendingCount(list) {
  return (list || []).filter(item => item.status === 'pending' || item.status === 'preparing').length
}

function summarizeQueue(synced) {
  const list = readQueue()
  const problem = list.find(item => item.lastError)
  return {
    synced: synced || 0,
    total: list.length,
    pending: pendingCount(list),
    failed: list.filter(item => item.status === 'failed').length,
    lastError: problem ? problem.lastError : ''
  }
}

// 手动同步不受退避时间限制，并把失败/待持久化事项一并拉起重试。
function resetForManualSync() {
  const list = readQueue()
  list.forEach(item => {
    if (item.status === 'failed' || item.status === 'preparing') {
      item.status = 'pending'
    }
    if (item.status !== 'pending') return
    item.nextRetryAt = 0
    ;(item.uploads || []).forEach(upload => {
      upload.runtimePath = upload.runtimePath || upload.localPath
    })
  })
  writeQueue(list)
}

async function runFlush(manual) {
  let synced = 0
  let list = readQueue()
  for (const item of list) {
    if (item.status !== 'pending') continue
    if (!manual && item.nextRetryAt && item.nextRetryAt > Date.now()) continue
    try {
      await processItem(item)
      list = list.filter(x => x.localId !== item.localId)
      synced++
      writeQueue(list)
      uni.$emit && uni.$emit('offlineQueueSynced', item)
      uni.$emit && uni.$emit('refreshHomeData')
    } catch (error) {
      if (isRetryableFailure(error)) {
        item.status = 'pending'
        item.retryCount = (item.retryCount || 0) + 1
        item.nextRetryAt = Date.now() + retryDelay(item.retryCount)
      } else {
        item.status = 'failed'
      }
      item.lastError = String(error.message || error.msg || error || '同步失败').slice(0, 300)
      writeQueue(list)
      if (item.status === 'failed') {
        uni.$emit && uni.$emit('offlineQueueItemFailed', item)
      }
    }
  }
  return summarizeQueue(synced)
}

export function flushOfflineQueue(options = {}) {
  const manual = options.manual === true
  if (!getToken()) {
    return Promise.resolve(Object.assign(summarizeQueue(0), { needLogin: true }))
  }
  if (flushing) {
    if (!manual) return flushPromise || Promise.resolve(summarizeQueue(0))
    // 正在自动同步时点“立即同步”，等本轮结束后再强制跑一轮。
    return (flushPromise || Promise.resolve()).then(() => flushOfflineQueue(options))
  }
  if (manual) resetForManualSync()
  flushing = true
  flushPromise = runFlush(manual).then(result => {
    const remaining = readQueue()
    const retryable = remaining.filter(item => item.status === 'pending')
    if (retryable.length) {
      const next = Math.min.apply(null, retryable.map(item => item.nextRetryAt || Date.now()))
      scheduleFlush(Math.max(1000, next - Date.now()))
    }
    return result
  }).finally(() => {
    flushing = false
    flushPromise = null
  })
  return flushPromise
}

export function getOfflineQueue() {
  return readQueue()
}

export function getOfflineSummary() {
  const list = readQueue()
  return {
    total: list.length,
    pending: pendingCount(list),
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
  return flushOfflineQueue({ manual: true })
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
  resumePreparingUploads(readQueue())
  flushOfflineQueue()
}
