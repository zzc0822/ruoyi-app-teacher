---
kind: logging_system
name: 日志系统 — 基于 console 与 uni.showToast 的轻量级前端输出
category: logging_system
scope:
    - '**'
source_files:
    - utils/request.js
    - utils/common.js
    - components/ad-banner/ad-banner.vue
    - components/ad-feed/ad-feed.vue
    - components/ad-popup/ad-popup.vue
    - mixins/pagination.js
    - plugins/modal.js
    - api/ad.js
---

本仓库为 uni-app 教师端小程序，未引入任何第三方日志框架（如 log4j、winston、bunyan、pino 等），也未建立统一的 logger 模块或结构化日志规范。当前“日志”能力由以下两部分构成：

1. 开发调试输出
- 全项目直接使用原生 `console.log / console.error` 进行调试输出，散落在广告组件（ad-banner.vue、ad-feed.vue、ad-popup.vue）、分页 mixin（mixins/pagination.js）、插件（plugins/modal.js）以及测试脚本（test-config-driven.js）中。
- 没有集中封装的 `logger` 工具，也没有按级别（info/warn/error/debug）分类的策略。

2. 用户可见提示（非服务端日志）
- 所有面向用户的交互反馈统一通过 `uni.showToast / uni.showModal / uni.showLoading / uni.hideLoading` 呈现，并在 `utils/common.js` 中暴露了 `toast()` 和 `showConfirm()` 两个薄封装函数，供 `utils/request.js` 及业务页面复用。
- HTTP 请求错误在 `utils/request.js` 中被统一捕获并转换为中文提示文本，再调用 `toast(message)` 展示；登录态失效时自动触发登出并跳转 `/pages/login`。

3. 埋点/上报（仅业务事件，非通用日志）
- 广告模块提供 `api/ad.js` 中的 `reportShow / reportClick / batchReportShow` 三个接口用于上报广告曝光与点击，属于业务埋点而非通用日志系统。

结论：该仓库不存在跨模块的统一日志系统，开发者应遵循现有模式——调试用 `console.*`，用户反馈走 `utils/common.js` 的 `toast/showConfirm`，网络异常集中在 `utils/request.js` 处理。若需引入结构化日志或远程收集，应在 utils 层新建独立 logger 模块并在 request 拦截器中统一注入上下文字段。