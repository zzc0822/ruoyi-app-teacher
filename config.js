// 应用全局配置
module.exports = {
  // 后端服务协议，部署 HTTPS 时改为 'https'
  protocol: 'https',
  // 后端服务主机，可以是 IP 或域名
  // host: 'localhost',
  host: 'ry.mytbu.cn',
  // 后端服务端口号（HTTPS 默认 443）
  port: 443,
  // API 路径前缀（Nginx 代理路径）
  apiPrefix: '/prod-api',
  // 自动拼接完整 baseUrl（兼容旧代码直接读取 config.baseUrl）
  get baseUrl() {
    return `${this.protocol}://${this.host}${this.apiPrefix}`
  },
  // 应用信息
  appInfo: {
    // 应用名称
    name: "ruoyi-app",
    // 应用版本
    version: "1.2.16",
    // 应用logo
    logo: "/static/logo.png",
    // 官方网站
    site_url: "http://ruoyi.vip",
    // 政策协议
    agreements: [{
        title: "隐私政策",
        url: "https://ruoyi.vip/protocol.html"
      },
      {
        title: "用户服务协议",
        url: "https://ruoyi.vip/protocol.html"
      }
    ]
  }
}
