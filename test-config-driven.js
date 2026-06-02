/**
 * 小程序配置驱动测试脚本
 * 在微信开发者工具控制台中执行
 */

// ==========================================
// 测试1：检查基础配置
// ==========================================
function test1_checkConfig() {
  console.group('📋 测试1：检查基础配置')
  
  // 检查baseUrl
  const config = require('/config.js')
  console.log('baseUrl:', config.baseUrl)
  
  if (config.baseUrl === 'http://172.17.201.241:8080') {
    console.log('✅ baseUrl配置正确')
  } else {
    console.error('❌ baseUrl配置错误，应该是 http://172.17.201.241:8080')
  }
  
  console.groupEnd()
}

// ==========================================
// 测试2：测试后端接口
// ==========================================
function test2_testAPI() {
  console.group('🌐 测试2：测试后端接口')
  
  uni.request({
    url: 'http://172.17.201.241:8080/api/role-view-config/stuinfo',
    header: {
      'Authorization': 'Bearer ' + require('/utils/auth.js').getToken()
    },
    success: (res) => {
      console.log('✅ 接口请求成功')
      console.log('响应数据:', res.data)
      
      if (res.data.code === 200) {
        console.log('✅ 返回状态码正确')
        console.log('配置数据:', res.data.data)
      } else {
        console.error('❌ 返回状态码异常:', res.data.code)
      }
    },
    fail: (err) => {
      console.error('❌ 接口请求失败:', err)
      console.log('可能原因：')
      console.log('1. 后端未启动')
      console.log('2. baseUrl配置错误')
      console.log('3. 未勾选"不校验合法域名"')
    }
  })
  
  console.groupEnd()
}

// ==========================================
// 测试3：测试配置加载工具
// ==========================================
async function test3_testConfigLoader() {
  console.group('📦 测试3：测试配置加载工具')
  
  try {
    const { getRoleViewConfig } = require('/utils/roleViewConfig.js')
    
    console.log('开始加载stuinfo配置...')
    const config = await getRoleViewConfig('stuinfo')
    
    if (config) {
      console.log('✅ 配置加载成功')
      console.log('viewType:', config.viewType)
      console.log('完整配置:', config)
      
      if (config.viewType === 'major_stats') {
        console.log('✅ 书记角色配置正确')
      } else if (config.viewType === 'class_list') {
        console.log('✅ 教师角色配置正确')
      } else {
        console.warn('⚠️ 未知的viewType:', config.viewType)
      }
    } else {
      console.warn('⚠️ 配置为空，可能使用了默认配置')
    }
  } catch (error) {
    console.error('❌ 配置加载失败:', error)
  }
  
  console.groupEnd()
}

// ==========================================
// 测试4：测试配置缓存
// ==========================================
async function test4_testCache() {
  console.group('💾 测试4：测试配置缓存')
  
  try {
    const { getRoleViewConfig, clearConfigCache } = require('/utils/roleViewConfig.js')
    
    // 第一次加载（应该请求后端）
    console.log('第一次加载（应该请求后端）...')
    const start1 = Date.now()
    await getRoleViewConfig('stuinfo')
    const time1 = Date.now() - start1
    console.log(`耗时: ${time1}ms`)
    
    // 清除缓存
    console.log('清除缓存...')
    clearConfigCache()
    
    // 第二次加载（应该请求后端）
    console.log('第二次加载（清除缓存后，应该请求后端）...')
    const start2 = Date.now()
    await getRoleViewConfig('stuinfo')
    const time2 = Date.now() - start2
    console.log(`耗时: ${time2}ms`)
    
    // 第三次加载（应该使用缓存）
    console.log('第三次加载（应该使用缓存）...')
    const start3 = Date.now()
    await getRoleViewConfig('stuinfo')
    const time3 = Date.now() - start3
    console.log(`耗时: ${time3}ms`)
    
    if (time3 < time1 && time3 < time2) {
      console.log('✅ 缓存机制正常（第三次明显更快）')
    } else {
      console.log('⚠️ 缓存机制可能未生效')
    }
  } catch (error) {
    console.error('❌ 缓存测试失败:', error)
  }
  
  console.groupEnd()
}

// ==========================================
// 测试5：测试降级机制
// ==========================================
function test5_testFallback() {
  console.group('🔄 测试5：测试降级机制')
  
  try {
    const { getDefaultConfig } = require('/utils/roleViewConfig.js')
    
    // 测试默认配置
    const stuinfoConfig = getDefaultConfig('stuinfo')
    const workIndexConfig = getDefaultConfig('work_index')
    
    console.log('stuinfo默认配置:', stuinfoConfig)
    console.log('work_index默认配置:', workIndexConfig)
    
    if (stuinfoConfig && stuinfoConfig.viewType === 'class_list') {
      console.log('✅ stuinfo默认配置正确')
    } else {
      console.error('❌ stuinfo默认配置错误')
    }
    
    if (workIndexConfig && workIndexConfig.showSummaryCards === false) {
      console.log('✅ work_index默认配置正确')
    } else {
      console.error('❌ work_index默认配置错误')
    }
  } catch (error) {
    console.error('❌ 降级机制测试失败:', error)
  }
  
  console.groupEnd()
}

// ==========================================
// 测试6：查看当前页面状态
// ==========================================
function test6_checkPageState() {
  console.group('📄 测试6：查看当前页面状态')
  
  // 获取当前页面
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  
  console.log('当前页面路径:', currentPage.route)
  console.log('页面数据:', currentPage.data)
  
  if (currentPage.data.viewConfig) {
    console.log('✅ 页面已加载配置')
    console.log('viewConfig:', currentPage.data.viewConfig)
  } else {
    console.log('⚠️ 页面未加载配置或配置字段不同')
  }
  
  if (currentPage.data.isSecretaryRole !== undefined) {
    console.log('isSecretaryRole:', currentPage.data.isSecretaryRole)
  }
  
  console.groupEnd()
}

// ==========================================
// 运行所有测试
// ==========================================
async function runAllTests() {
  console.log('🚀 开始运行所有测试...\n')
  
  // 测试1：基础配置
  test1_checkConfig()
  
  // 测试2：后端接口
  test2_testAPI()
  
  // 等待一下
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 测试3：配置加载
  await test3_testConfigLoader()
  
  // 测试4：缓存机制
  await test4_testCache()
  
  // 测试5：降级机制
  test5_testFallback()
  
  // 测试6：页面状态
  test6_checkPageState()
  
  console.log('\n✅ 所有测试完成！')
  console.log('请查看上方的测试结果')
}

// ==========================================
// 导出函数
// ==========================================
module.exports = {
  test1_checkConfig,
  test2_testAPI,
  test3_testConfigLoader,
  test4_testCache,
  test5_testFallback,
  test6_checkPageState,
  runAllTests
}

// 自动运行所有测试
console.log('📝 在控制台中执行以下命令运行测试：')
console.log('  runAllTests()        - 运行所有测试')
console.log('  test1_checkConfig()  - 测试基础配置')
console.log('  test2_testAPI()      - 测试后端接口')
console.log('  test3_testConfigLoader() - 测试配置加载')
console.log('  test4_testCache()    - 测试缓存机制')
console.log('  test5_testFallback() - 测试降级机制')
console.log('  test6_checkPageState() - 查看页面状态')
console.log('')
console.log('或者直接运行：runAllTests()')
