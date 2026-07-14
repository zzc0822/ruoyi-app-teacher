---
kind: external_dependency
name: RuoYi-Vue 后端框架
slug: ruoyi-vue
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

本项目为 RuoYi-App 移动端，配套的后端服务基于 RuoYi-Vue 框架。移动端的 API 请求通过 Nginx 代理到后端的 /prod-api 路径，所有业务接口（如待办、统计、学生管理等）均由该后端提供。项目配置中 host 指向 ry.mytbu.cn，使用 HTTPS 协议。