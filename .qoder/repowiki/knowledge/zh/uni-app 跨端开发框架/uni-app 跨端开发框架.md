---
kind: external_dependency
name: uni-app 跨端开发框架
slug: uni-app
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
---

项目基于 uni-app v2 版本开发，支持同时编译为 APP、小程序、H5 三种形态。使用条件编译语法（#ifdef MP-WEIXIN）区分不同平台的特定逻辑，如微信环境下的特殊登录流程和权限处理。