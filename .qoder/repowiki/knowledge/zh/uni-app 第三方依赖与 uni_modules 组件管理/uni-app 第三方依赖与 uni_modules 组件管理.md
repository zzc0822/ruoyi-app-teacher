---
kind: dependency_management
name: uni-app 第三方依赖与 uni_modules 组件管理
category: dependency_management
scope:
    - '**'
source_files:
    - main.js
    - config.js
    - utils/request.js
    - uni_modules/uview-ui/package.json
    - uni_modules/uni-scss/package.json
---

本仓库采用 HBuilderX 的 uni_modules 机制管理第三方依赖，不使用 npm/yarn 包管理器。所有 UI 组件、HTTP 库均以源码形式直接拷贝到 uni_modules/ 目录下，通过模块声明式引入，由 HBuilderX 在编译期自动处理依赖关系。

## 1. 依赖管理机制
- 无 package.json / node_modules：项目根目录不存在 package.json、yarn.lock、pnpm-lock.yaml 等文件，也不存在 node_modules 目录，完全脱离 npm 生态。
- uni_modules 源码级集成：第三方库以完整源码形式存放在 uni_modules/<pkg>/ 下，每个子目录自带独立的 package.json（仅用于 uni_modules 元数据，如 id、version、platforms 兼容性声明），不参与 Node 依赖解析。
- HBuilderX 构建时解析：依赖版本锁定由开发者手动控制——升级即替换 uni_modules/ 下的源码文件，无需运行任何安装命令。

## 2. 核心依赖清单
- uView UI 2.x：位于 uni_modules/uview-ui/，主 UI 框架，包含 100+ 组件及内置 luch-request HTTP 库
- uni-ui 官方组件：位于 uni_modules/ 下的 uni-badge、uni-card、uni-data-select、uni-easyinput、uni-forms、uni-icons、uni-link、uni-list、uni-load-more、uni-notice-bar、uni-popup、uni-title 等
- uni-scss 主题变量：位于 uni_modules/uni-scss/，uni-ui 全局 SCSS 变量与工具函数
- u-ajax（可选）：位于 uni_modules/u-ajax/，基于 uni.request 封装的 axios 风格 HTTP 客户端（未在主流程使用）

## 3. 依赖引入约定
- uView 全局注册：在 main.js 中通过 Vue.use(uView) 一次性注册全部组件，无需逐个 import
- uni-ui 按需引入：各页面或组件内直接 import 对应 uni_modules/uni-xxx/components/... 路径
- HTTP 请求统一入口：业务代码不直接使用 uni.request，而是通过 utils/request.js 封装的 request() 方法，该方法内部调用 uni.request 并注入 Authorization 头、401 自动登录重试、错误码映射等横切逻辑
- 配置集中化：后端地址、协议、端口、API 前缀集中在 config.js，baseUrl 通过 getter 动态拼接，避免硬编码

## 4. 设计决策与约束
- 源码级依赖 = 完全可控：可随意修改第三方组件源码以适应业务需求（例如 uView 的 luch-request 适配器）
- 无锁文件 = 无自动化更新：升级依赖需人工下载新版本源码并替换目录，缺乏 diff 与冲突检测
- 平台兼容性声明：每个 uni_modules/*/package.json 中的 uni_modules.platforms 字段声明了支持的平台（Vue2/Vue3、App、H5、小程序等），由 HBuilderX 在编译时校验
- 无私有仓库/镜像：所有依赖来自公开渠道（GitHub、npm 官网），未配置私有 registry 或代理

## 5. 开发者规范
- 新增第三方组件时，将源码放入 uni_modules/<id>/ 并按 uni_modules 规范编写 package.json（至少包含 id、name、version、uni_modules.platforms）
- 优先使用 utils/request.js 发起网络请求，不要绕过封装直接调用 uni.request
- 后端地址变更只需修改 config.js，禁止在业务代码中硬编码 URL
- 升级依赖后务必在各目标平台（微信小程序、H5、App）验证兼容性，因为 uni_modules 不会自动执行兼容性检查