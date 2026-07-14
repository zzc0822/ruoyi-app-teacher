---
kind: frontend_style
name: 前端样式体系：uView + ColorUI + SCSS 变量驱动
category: frontend_style
scope:
    - '**'
source_files:
    - uni.scss
    - uni_modules/uview-ui/theme.scss
    - static/scss/index.scss
    - static/scss/global.scss
    - static/scss/colorui.css
    - App.vue
    - main.js
---

## 1. 系统/方法概述
本教师端 uni-app 采用「主题变量 + 第三方 UI 库 + 全局 CSS 工具类」三层组合的样式方案：
- 主题变量层：通过 `uni.scss` 集中定义 uni-app 内置变量与业务色板，并引入 uView 主题变量，作为全应用设计令牌（Design Tokens）。
- 组件库层：以 uView2.0（`uni_modules/uview-ui`）为主 UI 框架，提供表单、弹窗、导航栏等丰富组件；辅以 ColorUI 提供通用布局与图标能力。
- 全局样式层：在 `static/scss/index.scss` 中聚合全局样式，再于 `App.vue` 统一引入，形成单入口样式装配点。

## 2. 关键文件与包
- 主题与变量
  - `uni.scss`：uni-app 全局 SCSS 变量入口，覆盖颜色、字号、间距、圆角等，并 `@import '@/uni_modules/uview-ui/theme.scss'` 注入 uView 主题。
  - `uni_modules/uview-ui/theme.scss`：uView 主题变量（主色、成功/警告/错误、禁用态等）。
- 全局样式入口
  - `static/scss/index.scss`：聚合 `global.scss`、ColorUI、iconfont 三类全局样式。
  - `static/scss/global.scss`：项目级常用工具类（`.text-center`、`.list-cell`、`.menu-list` 等）。
  - `static/scss/colorui.css`：ColorUI 基础样式与图标字体。
  - `static/font/iconfont.css`：自定义 iconfont 字体。
- 应用启动装配
  - `App.vue`：在 `<style lang="scss">` 中 `@import '@/static/scss/index.scss'`，确保全局样式最先加载。
  - `main.js`：`Vue.use(uView)` 注册 uView 插件，并将部分工具挂载到 `Vue.prototype`。
- 静态资源
  - `static/images/tabbar/*`、`static/logo*.png` 等图片资源按用途分目录管理。

## 3. 架构与约定
- 变量优先，避免硬编码：所有颜色、字号、间距、圆角均从 `uni.scss` 中的 `$uni-*` 或 uView 的 `$u-*` 变量取值，新增样式应优先复用这些变量而非直接写死值。
- 单一全局样式入口：所有全局样式必须经 `static/scss/index.scss` 聚合，再由 `App.vue` 统一引入，禁止在页面 `.vue` 中直接 import 分散的全局样式文件。
- 组件库使用规范：优先使用 uView 组件（如 `u-button`、`u-form`、`u-popup`、`u-navbar` 等），仅在需要通用布局/图标时叠加 ColorUI 的 class（如 `bg-`、`cuIcon-*`）。
- 工具类分层：项目内通用工具类放在 `static/scss/global.scss`，并按语义命名（如 `.list-cell`、`.menu-item-box`），避免在组件内部重复实现相同样式。
- 响应式单位：默认使用 `rpx` / `upx` 适配多端，必要时结合 `uni.scss` 中的尺寸变量保持视觉一致性。
- 图标策略：优先使用 uView 的 `u-icon` 或 ColorUI 的 `cuIcon-*`，自定义图标通过 `static/font/iconfont.css` 引入后以 class 方式使用。

## 4. 开发者应遵循的规则
- 新增/修改主题色时，只改 `uni.scss` 与 `uview-ui/theme.scss` 中的变量，不得在业务组件中硬编码颜色值。
- 全局样式一律放入 `static/scss/*.scss`，并通过 `index.scss` 聚合；页面级样式仅保留当前页面特有的局部样式。
- 列表项、菜单项等通用结构复用 `global.scss` 中的 `.list-cell`、`.menu-list` 等 class，不要自行重写边框、圆角、阴影等细节。
- 使用 uView 组件时，通过 props 控制外观（如 `type`、`size`、`shape`），如需深度定制，优先基于其提供的主题变量扩展，而非覆盖组件样式。
- 图标统一走 `u-icon` 或 ColorUI 图标类，新增图标需同步更新 `static/font/iconfont.css` 并在项目中引用。
- 不要在 `pages.json` 或 `manifest.json` 中配置样式相关字段，所有样式装配集中在 `App.vue` 与 `main.js`。