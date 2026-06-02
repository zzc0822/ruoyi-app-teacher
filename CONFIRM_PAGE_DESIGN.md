# 辅导员查课确认界面设计文档

## 📋 业务场景分析

### 场景1：辅导员该节已查课
**触发条件：** 辅导员在同一节课已有查课记录

**处理流程：**
1. 系统自动比对书记和辅导员的查课数据
2. 显示比对结果（书记统计 vs 辅导员统计）
3. 计算差异：`absentDiff = 辅导员未到 - 书记未到`
4. 辅导员填写差异说明
5. 提交确认

**界面展示：**
```
┌─ 书记查课记录 ────────────┐
│ 班级：计算机2101          │
│ 日期：2026-03-15          │
│ 节次：第3节               │
│ 查课人：郑志材（书记）    │
├─ 书记统计 ────────────────┤
│ 应到:45  实到:42          │
│ 请假:3   未到:3           │
├─ 您该节已查课 ℹ️          │
│ 系统已自动比对数据         │
│ 请核对差异并填写说明       │
├─ 数据比对 ────────────────┤
│ 书记统计未到    3人       │
│ 我的统计未到    2人       │
│ 差异           -1人       │
├─ 差异说明 ────────────────┤
│ [ 请说明数据差异原因... ] │
│                    0/200  │
└───────────────────────────┘
```

---

### 场景2：辅导员该节未查课
**触发条件：** 辅导员在同一节课没有查课记录

**处理流程：**
1. 提供两种操作方式选择
2. **方式A：提交缺勤名单**
   - 显示班级学生列表
   - 点击标记学生状态（迟到/早退/旷课）
   - 自动统计缺勤人数
3. **方式B：填写未查课说明**
   - 填写文本说明未查课原因
4. 提交确认

**界面展示：**
```
┌─ 书记查课记录 ────────────┐
│ 班级：计算机2101          │
│ 日期：2026-03-15          │
│ 节次：第3节               │
│ 查课人：郑志材（书记）    │
├─ 书记统计 ────────────────┤
│ 应到:45  实到:42          │
│ 请假:3   未到:3           │
├─ 您该节未查课 ⚠️          │
│ 请提交缺勤学生名单         │
│ 或填写未查课说明           │
├─ 选择操作方式 ────────────┤
│ ┌──────┐  ┌──────┐       │
│ │📝    │  │📄    │       │
│ │提交  │  │填写  │       │
│ │缺勤  │  │未查  │       │
│ │名单  │  │课说明│       │
│ └──────┘  └──────┘       │
├─ 缺勤学生名单（选择后显示）│
│ 张三[迟]  李四[到]        │
│ 王五[旷]  赵六[到]        │
│ ...                       │
│ 迟到:1  早退:0  旷课:1   │
└───────────────────────────┘
```

---

### 场景3：有未登记的请假人员
**触发条件：** 发现有学生在请假系统中获批，但未登记到班级请假记录中

**处理流程：**
1. 优先显示未登记请假人员列表
2. 辅导员逐个登记请假人员
3. 登记完成后，才能继续后续操作
4. 系统自动更新请假人数和实到人数

**界面展示：**
```
┌─ 书记查课记录 ────────────┐
│ 班级：计算机2101          │
│ ...                       │
├─ 🚨 有未登记的请假人员    │
│ 共2人，请先登记请假        │
│ ┌─────────────────────┐   │
│ │ 张三  病假：感冒发烧 │   │
│ │         [登记]       │   │
│ ├─────────────────────┤   │
│ │ 李四  事假：家庭事务 │   │
│ │         [登记]       │   │
│ └─────────────────────┘   │
└───────────────────────────┘
```

---

## 🎯 核心功能设计

### 1. 场景判断逻辑

```javascript
checkScene() {
  // 1. 查询辅导员该节是否已查课
  const hasCounselorCheck = checkCounselorExists(bjdm, checkDate, lessonNo)
  
  if (hasCounselorCheck) {
    this.scene = 'counselor_checked'
    this.loadCounselorCheckData()
  } else {
    this.scene = 'counselor_not_checked'
    this.loadStudents()
  }
  
  // 2. 检查未登记请假人员
  this.checkUnregisteredLeaves()
}
```

### 2. 数据比对逻辑

```javascript
// 书记查课数据
const secretaryData = {
  totalStudents: 45,
  presentCount: 42,
  leaveCount: 3,
  absentCount: 3  // 未到人数
}

// 辅导员查课数据
const counselorData = {
  totalStudents: 45,
  presentCount: 43,
  leaveCount: 3,
  absentCount: 2  // 未到人数（迟到1 + 旷课1）
}

// 计算差异
const absentDiff = counselorData.absentCount - secretaryData.absentCount
// = 2 - 3 = -1 （辅导员比书记少1人未到）
```

### 3. 学生状态标记

```javascript
// 点击循环：到课(0) → 迟到(1) → 早退(2) → 旷课(3) → 到课(0)
onStuClick(stu) {
  const cur = this.clickMap[stu.xh] || 0
  const next = (cur + 1) % 4
  this.$set(this.clickMap, stu.xh, next)
}

// 统计各类缺勤人数
lateCount = clickMap中值为1的数量
earlyCount = clickMap中值为2的数量
truantCount = clickMap中值为3的数量
```

### 4. 未登记请假检测

```javascript
checkUnregisteredLeaves() {
  // 1. 获取请假系统中的请假记录
  const leaveRecords = getLeaveList(bjdm, checkDate)
  
  // 2. 获取查课记录中的请假名单
  const checkLeaveList = getCheckLeaveList(checkId)
  
  // 3. 比对找出未登记的请假人员
  this.unregisteredLeaves = leaveRecords.filter(leave => {
    return !checkLeaveList.some(item => item.xh === leave.xh)
  })
}
```

---

## 📊 状态流转图

```
辅导员点击待办事项
    ↓
加载查课信息
    ↓
判断场景
    ├─ 辅导员已查课 → 显示比对结果 → 填写差异说明 → 提交
    └─ 辅导员未查课 → 选择操作方式
                      ├─ 提交缺勤名单 → 标记学生状态 → 提交
                      └─ 填写未查课说明 → 填写文本 → 提交
    ↓
检查未登记请假人员
    ├─ 有未登记 → 显示列表 → 逐个登记 → 继续操作
    └─ 无未登记 → 直接操作
    ↓
提交确认
    ↓
后端处理
    ├─ 更新查课记录
    ├─ 计算差异
    ├─ 更新待办状态
    └─ (如有异常) 通知书记
```

---

## 🔧 API 接口设计

### 1. 查询待确认列表
```
GET /api/mini/classcheck/pendingConfirm
参数：
  - jsid: 辅导员ID
返回：
  {
    code: 200,
    rows: [
      {
        id: 查课ID,
        bjmc: 班级名称,
        checkDate: 查课日期,
        lessonNo: 节次,
        checkerName: 书记姓名,
        totalStudents: 应到,
        presentCount: 实到,
        leaveCount: 请假,
        absentCount: 未到
      }
    ]
  }
```

### 2. 查询辅导员是否已查课
```
GET /api/mini/classcheck/checkCounselorExists
参数：
  - bjdm: 班级代码
  - checkDate: 查课日期
  - lessonNo: 节次
返回：
  {
    code: 200,
    data: {
      exists: true/false,
      checkId: 查课记录ID（如果存在）
    }
  }
```

### 3. 查询未登记请假人员
```
GET /api/mini/classcheck/unregisteredLeaves
参数：
  - checkId: 查课记录ID
  - bjdm: 班级代码
  - checkDate: 查课日期
返回：
  {
    code: 200,
    data: [
      {
        xh: 学号,
        xsname: 姓名,
        leaveReason: 请假原因,
        startTime: 开始时间,
        endTime: 结束时间
      }
    ]
  }
```

### 4. 登记请假人员
```
POST /api/mini/classcheck/registerLeave
参数：
  {
    checkId: 查课记录ID,
    xh: 学号,
    leaveReason: 请假原因
  }
返回：
  {
    code: 200,
    msg: "登记成功"
  }
```

### 5. 提交确认
```
PUT /api/mini/classcheck/confirm/{id}
参数：
  {
    remark: 说明文本,
    detailList: [
      {
        xh: 学号,
        xsname: 姓名,
        absentType: late/early_leave/truant
      }
    ]
  }
返回：
  {
    code: 200,
    msg: "确认成功"
  }
```

---

## ⚠️ 注意事项

### 1. 操作顺序控制
- **必须先处理未登记请假人员**，才能进行后续操作
- 未登记列表清空后，`canProceed = true`

### 2. 数据一致性
- 登记请假后，自动更新：
  - `leaveCount` 增加
  - `presentCount` 减少
  - `absentCount` 重新计算

### 3. 提交验证
```javascript
// 场景1：已查课
if (scene === 'counselor_checked' && !remark) {
  showToast('请填写差异说明')
  return
}

// 场景2：未查课
if (scene === 'counselor_not_checked') {
  if (!showAbsentForm && !showRemarkOnly) {
    showToast('请选择操作方式')
    return
  }
  if (showAbsentForm && 缺勤人数 === 0) {
    showToast('请标记缺勤学生')
    return
  }
  if (showRemarkOnly && !remark) {
    showToast('请填写未查课说明')
    return
  }
}
```

### 4. 用户体验
- 学生状态标记：点击循环切换（到课→迟到→早退→旷课→到课）
- 实时统计：标记后立即更新迟到/早退/旷课人数
- 输入限制：说明文本最多200字
- 防重复提交：提交中禁用按钮

---

## 📱 响应式设计

### 学生网格布局
```scss
.student-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  // 4列
  gap: 16rpx;
}

// 小屏幕适配
@media (max-width: 375px) {
  grid-template-columns: repeat(3, 1fr);  // 3列
}
```

### 卡片样式
- 统一圆角：12rpx / 16rpx
- 统一间距：20rpx
- 统一阴影：轻微阴影或无边框

---

## 🎨 颜色规范

### 状态颜色
- **到课**：`#e8f5e9`（浅绿）+ `#c8e6c9`（边框）
- **迟到**：`#fff8e1`（浅黄）+ `#ffe082`（边框）
- **早退**：`#fff3e0`（浅橙）+ `#ffcc80`（边框）
- **旷课**：`#ffebee`（浅红）+ `#ef9a9a`（边框）

### 提示颜色
- **信息提示**：`#e3f2fd`（蓝色背景）
- **警告提示**：`#fff3e0`（橙色背景）
- **危险提示**：`#ffebee`（红色背景）

### 统计颜色
- **应到**：`#333`（黑色）
- **实到**：`#4caf50`（绿色）
- **请假**：`#2196f3`（蓝色）
- **未到**：`#f44336`（红色）

---

**辅导员确认界面设计完成！下一步：实现后端API接口。** 🚀
