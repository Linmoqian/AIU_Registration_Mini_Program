AIU报名小程序

一个基于微信小程序云开发的协会招新报名系统，集成了报名管理、录取查询、AI助手等功能。

## 项目简介

本小程序为AIU协会（人工智能联盟）设计，提供完整的招新报名流程管理，包括学生报名、管理员审核、录取查询等功能，并集成Dify AI助手提供智能问答服务。

## 核心功能

### 1. 了解协会（首页）
- 展示协会基本信息
- 提供公众号二维码和官网链接
- 集成AI聊天机器人（点击展开）
- 隐藏彩蛋：连续点击Logo 8次进入管理员登录

### 2. 报名系统
- **表单字段**：
  - 基本信息：姓名、手机号、微信号、出生日期、性别、政治面貌
  - 学业信息：学院、年级、专业/班级
  - 志愿选择：第一志愿、第二志愿（运营部/外联部/创智部/宣传部）、是否服从调剂
  - 个人材料：个人简介、其他说明、头像上传
- **功能特性**：
  - 本地草稿自动保存
  - 表单验证（手机号格式、必填项检查）
  - 重复提交自动覆盖旧数据（基于openid去重）
  - 头像上传至云存储
  - 左右滑动切换页面

### 3. 录取查询
- 三阶段进度条：未报名 → 面试 → 录取结果
- 实时查询录取状态（基于openid）
- 显示录取部门或拒绝原因
- 支持下拉刷新

### 4. AI助手
- 集成Dify聊天机器人
- 流式响应（SSE）
- 美观的聊天界面
- 支持多轮对话
- AI头像居中显示

### 5. 管理员后台
- **访问方式**：在"了解协会"页面连续点击Logo 8次
- **密码保护**：默认密码 `1433223`
- **功能模块**：
  - 查看所有报名学生列表
  - 按志愿部门筛选
  - 按录取状态筛选（面试中/已录取/已拒绝）
  - 搜索功能（姓名/手机号）
  - 点击学生查看详细信息（含头像）
  - 录取/拒绝操作（指定录取部门）

## 技术架构

### 前端技术
- **框架**：微信小程序原生开发
- **UI组件**：
  - Picker（日期/性别/志愿选择）
  - Switch（服从调剂）
  - Scroll-view（聊天消息列表）
  - 自定义TabBar
- **本地存储**：wx.Storage（表单草稿）
- **手势交互**：左右滑动切换页面

### 后端技术
- **云开发**：腾讯云微信小程序云开发
- **云函数**：`quickstartFunctions`（统一入口）
- **云数据库**：
  - `signup`：学生报名数据（含openid、status、志愿等）
  - `admissions`：管理员录取决策
- **云存储**：头像图片、小程序码
- **第三方API**：Dify AI（聊天机器人）
- 后续目标：重新设计后端，使用MySQL

### 云函数接口

#### 小程序调用接口
- `getOpenId`：获取用户openid
- `signupSubmit`：提交/更新报名（upsert）
- `signupGetStatus`：查询个人录取状态
- `adminUpsertAdmission`：管理员录取/拒绝操作
- `difyChat`：AI聊天（云端代理）
- `createApplications`：创建报名集合
- `getMiniProgramCode`：生成小程序码

#### HTTP接口（供外部网站调用）
- `POST /api/signup`：网站报名接口（按手机号去重）
- `GET /api/status?mobile=xxx`：查询录取状态
- `POST /api/admissions`：管理员录取接口（需Token认证）

### 数据库设计

#### signup 集合（报名数据）
```javascript
{
  _id: "自动生成",
  openid: "用户openid",
  name: "姓名",
  mobile: "手机号",
  wechat: "微信号",
  birth: "出生日期",
  gender: "性别",
  political: "政治面貌",
  college: "学院",
  grade: "年级",
  majorClass: "专业/班级",
  firstChoice: "第一志愿",
  secondChoice: "第二志愿",
  adjustable: true/false,
  intro: "个人简介",
  other: "其他说明",
  avatarUrl: "头像云存储fileID",
  status: "interview/admitted/rejected",
  createdAt: "创建时间",
  updatedAt: "更新时间"
}
```

#### admissions 集合（录取决策）
```javascript
{
  _id: "自动生成",
  openid: "用户openid",
  name: "姓名",
  mobile: "手机号",
  status: "admitted/rejected/interview",
  department: "录取部门",
  createdAt: "创建时间",
  updatedAt: "更新时间"
}
```

## 环境配置

### 云函数环境变量

在云开发控制台配置以下环境变量：

```bash
# Dify AI配置
DIFY_API_BASE=https://api.dify.ai
DIFY_API_KEY=your_dify_api_key
DIFY_APP_ID=your_dify_app_id

# 管理员权限配置
ADMIN_OPENIDS=openid1,openid2,openid3  # 管理员openid列表（逗号分隔）
ADMIN_TOKEN=your_secure_token          # HTTP接口认证Token
```

### 小程序配置

1. **云环境ID**：在 `miniprogram/app.js` 中配置
```javascript
env: "cloud1-2g8fmz4264601283"  // 替换为你的云环境ID
```

2. **Dify配置**：在 `miniprogram/app.js` 中配置
```javascript
globalData: {
  dify: {
    apiBase: "https://api.dify.ai/v1",
    apiKey: "your_dify_api_key"
  }
}
```

## 部署指南

### 1. 克隆项目
```bash
git clone <repository_url>
cd AIU报名小程序
```

### 2. 开通云开发
- 在微信开发者工具中打开项目
- 点击"云开发"按钮，开通云开发服务
- 创建云环境并记录环境ID

### 3. 部署云函数
```bash
# 右键 cloudfunctions/quickstartFunctions 文件夹
# 选择"上传并部署：云端安装依赖"
```

或使用命令行：
```bash
cd cloudfunctions/quickstartFunctions
npm install
# 在开发者工具中右键上传
```

### 4. 配置环境变量
- 进入云开发控制台
- 选择"云函数" → "quickstartFunctions" → "配置"
- 添加环境变量（见上文"云函数环境变量"）

### 5. 配置HTTP触发
- 云开发控制台 → 云函数 → quickstartFunctions
- 开启"HTTP触发"
- 记录触发路径（供外部网站调用）

### 6. 上传图片资源
将以下图片上传到 `miniprogram/images/` 目录：
- `AIU会标.png`：协会Logo
- `报名.png`、`录取查询.png`、`了解协会.png`：功能图标
- `tab/` 目录：底部导航栏图标（普通+激活状态）
- `official_qr.png`：公众号二维码

### 7. 编译运行
- 在微信开发者工具中点击"编译"
- 真机预览或上传体验版

## 项目结构

```
AIU报名小程序/
├── cloudfunctions/              # 云函数
│   └── quickstartFunctions/     # 统一云函数入口
│       ├── index.js             # 主逻辑
│       ├── package.json         # 依赖配置
│       └── config.json          # 云函数配置
├── miniprogram/                 # 小程序前端
│   ├── app.js                   # 全局配置
│   ├── app.json                 # 页面路由、tabBar配置
│   ├── app.wxss                 # 全局样式
│   ├── pages/
│   │   ├── about/               # 了解协会页
│   │   ├── apply/               # 报名页
│   │   ├── query/               # 录取查询页
│   │   ├── chat/                # AI助手页
│   │   └── admin/               # 管理员后台
│   │       ├── login.js         # 登录页
│   │       ├── index.js         # 学生列表页
│   │       └── detail.js        # 学生详情页
│   └── images/                  # 图片资源
├── README.md                    # 项目说明
└── project.config.json          # 项目配置
```

## 使用说明

### 学生端

1. **首次使用**：
   - 打开小程序，进入"了解协会"页面
   - 点击"报名"进入报名表单
   - 填写完整信息后提交

2. **查询录取**：
   - 点击底部"录取查询"
   - 自动显示当前录取状态
   - 下拉刷新获取最新状态

3. **AI咨询**：
   - 点击底部"AI助手"
   - 输入问题获取智能回答

### 管理员端

1. **登录**：
   - 在"了解协会"页面连续点击Logo 8次
   - 输入密码 `1433223`

2. **审核报名**：
   - 查看学生列表
   - 使用筛选/搜索功能定位学生
   - 点击学生查看详情
   - 点击"录取"或"拒绝"按钮

3. **批量操作**：
   - 使用部门筛选查看特定志愿
   - 逐个审核并录取

## 注意事项

1. **权限配置**：
   - 管理员openid需提前配置到环境变量
   - HTTP接口需配置Token防止未授权访问

2. **数据安全**：
   - 学生数据仅管理员可见
   - 云函数自动鉴权（基于openid）
   - 敏感操作需二次确认

3. **性能优化**：
   - 图片上传前自动压缩
   - 列表数据分页加载（默认50条）
   - 聊天记录本地缓存

4. **兼容性**：
   - 支持微信基础库 2.10.0+
   - 需开启云开发权限
   - 建议使用最新版微信客户端

## 常见问题

### Q1: 云函数调用失败？
- 检查云环境ID是否正确
- 确认云函数已成功部署
- 查看云函数日志排查错误

### Q2: AI助手无响应？
- 检查Dify环境变量配置
- 确认API Key有效
- 查看网络请求是否成功

### Q3: 管理员无法登录？
- 确认openid已添加到ADMIN_OPENIDS
- 检查密码是否正确（默认1433223）
- 清除缓存后重试

### Q4: 重复提交数据未覆盖？
- 已实现基于openid的upsert逻辑
- 检查云函数signupSubmit是否正常
- 查看数据库是否有重复记录

## 技术支持

- **微信云开发文档**：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- **Dify文档**：https://docs.dify.ai/
- 开发人员微信：clf3047076929（有需要可直接询问）

## 开发人员

第六届AIU创智部部长陈林峰

## 许可证

本项目仅供AIU协会内部使用。

## 计划改动

1.完善管理员界面，方便录取

2.内嵌网页（需要https，AIU的网站目前仍是http）

3.完成企业验证，才能上线小程序。
=======
# AIU_Registration_Mini_Program
AIU报名小程序
>>>>>>> dcfb0923e0fd26a99e71ec87c03eb1e6f6e32c61
