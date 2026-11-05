// 应用全局配置
module.exports = {
  // 后端服务协议，部署 HTTPS 时改为 'https'
  protocol: 'http',
  // 后端服务主机，可以是 IP 或域名
  // host: 'localhost',
  host: 'localhost:8080',
  // 后端服务端口号（HTTPS 默认 443）
  port: 8080,
  // API 路径前缀（Nginx 代理路径）
  apiPrefix: '',
  // 自动拼接完整 baseUrl（兼容旧代码直接读取 config.baseUrl）
  get baseUrl() {
    return `${this.protocol}://${this.host}${this.apiPrefix}`
  },
  // 应用信息
  appInfo: {
    // 应用名称
    name: "智慧学工教师端",
    // 应用版本
    version: "1.2.19",
    // 应用logo
    logo: "/static/logo.png",
    // 政策协议
    agreements: [{
        title: "隐私政策",
        path: "/pages/sub-mine/privacy/index"
      },
      {
        title: "用户服务协议",
        path: "/pages/sub-mine/agreement/index"
      }
    ]
  }
}
