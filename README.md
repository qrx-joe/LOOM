# LOOM - AI 工作流编排与 RAG 知识库平台

> 基于 NestJS + Vue 3 的轻量级 AI 工作流平台：可视化 DAG 拓扑编排、PDF/Word/Markdown 端到端 RAG 检索与 SSE 流式对话

[![Vue 3](https://img.shields.io/badge/Vue-3.5.24-green.svg)](https://vuejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/qrx-joe/loom/actions/workflows/ci.yml/badge.svg)](https://github.com/qrx-joe/loom/actions/workflows/ci.yml)

---

## 项目预览

<table>
  <tr>
    <td align="center" width="33%">
      <img src="./design-mockups/联想截图_20260506185528.png" width="100%" alt="工作流列表页面"><br>
      <b>工作流列表</b><br>
      <sub>卡片式布局，查看节点数与连线数，快速编辑工作流</sub>
    </td>
    <td align="center" width="33%">
      <img src="./design-mockups/联想截图_20260506185443.png" width="100%" alt="工作流编排画布"><br>
      <b>可视化 DAG 编排</b><br>
      <sub>拖拽/点击添加节点、连线配置，右侧属性面板实时编辑</sub>
    </td>
    <td align="center" width="33%">
      <img src="./design-mockups/联想截图_20260506185541.png" width="100%" alt="知识库中心"><br>
      <b>知识库中心</b><br>
      <sub>多知识库管理，支持搜索与创建，文档数量一目了然</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="./design-mockups/联想截图_20260506185554.png" width="100%" alt="知识库文档详情"><br>
      <b>文档管理与上传</b><br>
      <sub>PDF/Word/Markdown 多格式上传，实时查看解析与入库状态</sub>
    </td>
    <td align="center" width="33%">
      <img src="./design-mockups/联想截图_20260506185653.png" width="100%" alt="AI 对话助手"><br>
      <b>AI 对话助手</b><br>
      <sub>基于知识库的 RAG 问答，SSE 流式输出实时响应</sub>
    </td>
    <td align="center" width="33%">
    </td>
  </tr>
</table>

---

## 快速开始

### 环境要求

- **Node.js** 18+（推荐 24+）
- **npm** 9+ 或 **pnpm**
- **LLM API Key**（默认使用 [SiliconFlow](https://siliconflow.cn/)，需提前注册获取）

### 1. 克隆项目

```bash
git clone https://github.com/qrx-joe/loom.git
cd loom
```

### 2. 配置环境变量

**后端**（必需）：

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入你的 API Key
```

`.env` 关键配置项：

| 变量 | 说明 | 必填 |
|------|------|------|
| `DEEPSEEK_API_KEY` | SiliconFlow API Key | ✅ |
| `DATABASE_URL` | PostgreSQL 连接串（默认使用 SQLite，无需配置） | ❌ |

**前端**（可选，默认已适配本地开发）：

```bash
cd ../frontend
cp .env.example .env
# 如需修改后端地址，编辑 VITE_API_BASE_URL
```

### 3. 安装依赖并启动

#### 方式一：一键启动（Windows）

```bash
# 项目根目录
start.bat
```

#### 方式二：分别启动（推荐）

```bash
# 项目根目录
npm run install:all
npm start
```

或手动控制前后端：

```bash
npm run dev:backend   # 后端 http://localhost:3001
npm run dev:frontend  # 前端 http://localhost:5173
```

#### 方式三：手动启动

```bash
# 后端
cd backend && npm install && npm run start:dev

# 前端（另开终端）
cd frontend && npm install && npm run dev
```

### 4. 访问应用

打开浏览器访问：**http://localhost:5173**

> **使用 PostgreSQL？** 先执行 `docker-compose up -d` 启动 pgvector 容器，然后将 `backend/.env` 中的 `DATABASE_URL` 取消注释。

---

## 技术亮点

### 可视化 DAG 工作流编排

基于 Vue Flow 构建节点编辑器，支持拖拽/点击添加节点、连线、属性配置。50 步撤销重做栈降低调试成本，条件分支节点采用策略模式求值，让复杂逻辑修改更安全。

### 拓扑执行引擎

通过拓扑排序 + 循环依赖检测将无效工作流拦截在运行前，SSE 流式推送节点级执行日志，前端实时感知进度，避免"点了运行却不知道卡在哪"的焦虑。

### 端到端 RAG 检索流水线

不依赖现成 RAG 框架，从零搭建：多格式文档解析 → 语义分片 → 向量化存储 → 混合检索（BM25 + 向量相似度）。解决 MIME 类型检测误判和 PDF 跨平台解析差异导致的文档上传失败。

### 类型共享与 API 基础设施

前后端共享 TypeScript 类型层，消除"接口编译通过、运行时挂掉"的隐性成本。统一响应 DTO、全局异常过滤、请求限流、SSE 装饰器封装，减少重复胶水代码。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Vue3)                     │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ FlowCanvas│  │ KnowledgeBase │  │   ChatWidget    │   │
│  │ (工作流)  │  │   Manager     │  │   (问答)        │   │
│  └─────┬────┘  └──────┬───────┘  └────────┬────────┘   │
│        │              │                    │             │
│        └──────────────┼────────────────────┘             │
│                       │                                  │
│              ┌────────▼────────┐                        │
│              │   Pinia Store   │                        │
│              └────────┬────────┘                        │
└────────────────────────┼────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┼────────────────────────────────┐
│                      Backend (NestJS)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Workflow    │  │ Knowledge   │  │   Chat Agent    │  │
│  │ Service     │  │ Service     │  │   Service       │  │
│  │ - Executor  │  │ - Retrieval │  │ - LLM Gateway   │  │
│  │ - Scheduler │  │ - Vector    │  │ - Session Mgmt  │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │          │
│         └────────────────┼───────────────────┘          │
│                          │                               │
│                   ┌──────▼──────┐                        │
│                   │   SQLite    │                        │
│                   │  Database   │                        │
│                   └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
                          │
                   ┌──────▼──────┐
                   │  LLM API    │
                   │ (DeepSeek)  │
                   └─────────────┘
```

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue | 3.5.24 |
| 构建工具 | Vite | 7.2.4 |
| 状态管理 | Pinia | 3.0.4 |
| 路由 | Vue Router | 4.6.4 |
| 工作流可视化 | @vue-flow/core | 1.48.2 |
| UI 图标 | lucide-vue-next | 0.563.0 |
| 后端框架 | NestJS | 11.0.1 |
| ORM | TypeORM | 0.3.28 |
| 数据库 | SQLite3 / PostgreSQL | 5.1.7 / 8.20.0 |
| AI SDK | OpenAI SDK（兼容 DeepSeek API） | 6.18.0 |
| 文档解析 | pdf-parse / mammoth | 2.4.5 / 1.12.0 |
| 语言 | TypeScript | 5.7.3 |
| 测试 | Jest / Vitest | 30.0.0 / 4.1.4 |

---

## 项目结构

```
loom/
├── backend/                    # NestJS 后端
│   ├── src/
│   │   ├── workflow/           # 工作流模块（执行引擎、控制器、服务）
│   │   ├── knowledge/          # 知识库模块（检索、解析、分片、向量化）
│   │   ├── chat/               # 聊天会话模块
│   │   ├── common/             # 通用模块（限流、异常过滤、DTO）
│   │   └── seeder/             # 数据初始化
│   ├── .env.example            # 后端环境变量示例
│   └── loom.db                 # SQLite 数据库
│
├── frontend/                   # Vue3 前端
│   ├── src/
│   │   ├── components/         # 业务组件（FlowCanvas、KnowledgeBaseManager、ChatWidget）
│   │   ├── router/             # 路由配置
│   │   ├── store/              # Pinia 状态管理
│   │   ├── composables/        # 组合式函数
│   │   └── types/              # 类型定义
│   ├── .env.example            # 前端环境变量示例
│   └── package.json
│
├── docker-compose.yml          # PostgreSQL + pgvector 配置
├── start.bat                   # Windows 一键启动脚本
├── design-mockups/             # UI 设计稿
└── Docs/                       # 项目文档
```

---

## 与 Dify/Coze 对比

| 维度 | LOOM | Dify | Coze |
|------|------|------|------|
| 部署复杂度 | **低（本地一键跑通）** | 中 | 高 |
| 核心定位 | **轻量可学习、快速验证** | 企业生产级 | 生态闭环，强运营 |
| 工作流编排 | 基础 DAG | 完整 | 完整 |
| 知识库 RAG | 完整 | 完整 | 完整 |
| 循环节点 | ❌ 规划中 | ✅ | ✅ |
| 多用户系统 | ❌ 规划中 | ✅ | ✅ |
| 代码节点 | ❌ 规划中 | ✅ | ✅ |

**LOOM 更适合：** 学习工作流引擎和 RAG 原理、个人 AI 助手搭建、产品原型快速验证。

---

## 路线图

**工作流引擎**
- [x] 可视化 DAG 编排
- [x] 条件分支节点
- [x] HTTP 请求节点
- [x] 工作流描述
- [ ] 循环节点
- [ ] 变量管理

**RAG 与对话**
- [x] 知识库检索
- [x] AI 对话与 SSE 流式输出

**系统能力**
- [ ] 多用户系统
- [ ] 统计监控

---

## 复盘与反思

### 类型层共享的时机

面对前后端类型不同步导致"编译通过、运行挂掉"的问题，选择了抽离共享类型层而不是各自维护，因为全栈 TS 项目在第一天统一类型，重构成本远低于后期返修。

### 交互假设的验证方式

面对"拖拽添加节点"是否符合直觉的争议，选择了先做出可点击原型验证而不是直接实现完整拖拽，因为实际测试发现点击在复杂工作流中效率更高，避免了一次大规模返工。

### CI 检查的渐进策略

面对遗留项目的质量管控，选择了先非阻塞收集数据、再逐步收紧的策略，而不是一开始就阻塞提交，因为直接启用全部检查会导致提交频繁被打断，反而降低修复意愿。

### 文件上传的防御性检测

面对 MIME 类型检测对 .docx 返回 `application/octet-stream` 的问题，选择了扩展名回退检测作为兜底，因为浏览器 MIME 检测不可信，纯依赖客户端会导致文档解析失败。

### SSE 连接的生命周期管理

面对流式输出在断网或服务端异常时的连接泄露，选择了封装 SSE 装饰器统一管理关闭逻辑，因为流式接口的错误边界比 REST API 更复杂，需要显式状态机。

---

## 文档

- [产品需求文档 (PRD)](./Docs/PRD.md)
- [项目架构说明](./Docs/项目架构说明.md)
- [快速入门指南](./Docs/快速入门指南.md)
- [API 文档](./Docs/API文档.md)
- [开发指南](./Docs/开发指南.md)

---

## 许可证

[MIT](./LICENSE)
