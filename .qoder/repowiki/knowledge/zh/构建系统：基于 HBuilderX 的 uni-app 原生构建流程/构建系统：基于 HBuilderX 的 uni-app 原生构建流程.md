---
kind: build_system
name: 构建系统：基于 HBuilderX 的 uni-app 原生构建流程
category: build_system
scope:
    - '**'
---

本仓库为 RuoYi-App 教师端移动端应用，采用 uni-app 框架开发。经全面排查，仓库根目录不存在 Makefile、build.sh、Dockerfile、package.json、webpack.config.js、vite.config.js、tsconfig.json 等任何传统前端/后端构建脚本或 CI 配置文件。项目的构建与打包完全依赖 HBuilderX IDE 提供的 uni-app 原生构建体系：通过 `manifest.json` 配置多端目标（H5、微信小程序、App 等），通过 `pages.json` 管理页面路由与分包策略，通过 `uni_modules/` 机制引入 uView2.0、uni-ui 等第三方组件库，最终由 HBuilderX 在本地完成编译、压缩、资源合并及多端产物输出到 `unpackage/dist/` 目录。仓库中未包含任何自定义构建脚本、CI/CD 流水线、容器化配置或跨平台交叉编译逻辑，因此“构建系统”这一类别在本仓库中不适用。