# LOOM - AI 工作流编排与 RAG 知识库平台

> 支持可视化 DAG 编排、多格式文档 RAG 检索和流式对话的轻量级 AI 智能体实验平台

[![Vue 3](https://img.shields.io/badge/Vue-3.5.24-green.svg)](https://vuejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/qrx-joe/loom/actions/workflows/ci.yml/badge.svg)](https://github.com/qrx-joe/loom/actions/workflows/ci.yml)

---

## 项目预览

<p align="center">
  <img src="./design-mockups/vADsk.png" width="32%" alt="工作流列表">
  <img src="./design-mockups/E3Qqz.png" width="32%" alt="知识库管理">
  <img src="./design-mockups/28Pdl.png" width="32%" alt="文档上传与向量化">
</p>

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
| AI SDK | OpenAI SDK | 6.18.0 |
| 文档解析 | pdf-parse / mammoth | 2.4.5 / 1.12.0 |
| 语言 | TypeScript | 5.7.3 |
| 测试 | Jest / Vitest | 30.0.0 / 4.1.4 |

---

## 关键实现

### DAG 工作流执行引擎
设计并实现基于有向无环图的工作流执行引擎，支持拓扑排序执行、循环依赖检测。通过 SSE 流式推送执行状态和节点日志，实现前端实时感知执行进度。

### RAG 知识库检索流水线
从零搭建完整 RAG 链路：PDF / Word / Markdown / TXT 多格式文档解析 → 语义分片 → 向量化存储 → 混合检索。处理过 MIME 类型检测误判和 PDF 解析环境差异等兼容性问题。

### 可视化节点编辑器
基于 Vue Flow 构建工作流编辑器，支持拖拽/点击添加节点、连线、属性配置。实现最多 50 步的撤销重做栈，以及条件分支节点的策略模式求值逻辑。

### API 层基础设施
统一响应 DTO 格式、全局异常过滤、请求限流、SSE 免封装装饰器。前后端 TypeScript 类型共享，减少类型不一致导致的运行时错误。

---

## 学到了什么

### 类型一致性的隐性成本
初期前后端各维护一套类型定义，导致接口变更时经常出现"类型编译通过、运行时挂掉"的问题。后期统一为共享类型后，虽然重构成本高，但消除了整类 bug。**结论：全栈 TypeScript 项目应该在第一天就共享类型层。**

### 交互设计需要尽早验证假设
最初假设"拖拽添加节点"更符合直觉，但实现后发现点击添加在复杂工作流中操作效率更高。从拖拽改为点击的改动说明：**不要凭直觉做交互决策，尽快做出可点击原型验证。**

### CI/CD 的渐进式收紧策略
最初 CI 直接启用全部检查并设为阻塞，导致提交频繁被打断。后来改为先非阻塞运行、逐步修复存量问题、再收紧策略。**教训：遗留项目的代码检查不要一刀切，先收集数据再收紧。**

### 文档解析的兼容性陷阱
PDF 解析在不同 Node.js 版本和操作系统下表现不一致，浏览器 MIME 类型检测对 .docx 等文件经常返回 `application/octet-stream`。**结论：文件上传不能信任客户端 MIME 类型，必须做扩展名回退检测。**

### SSE 流式输出的错误边界
SSE 连接在客户端断网或服务端异常时容易泄露，需要手动管理连接关闭。后来封装了 SSE 装饰器统一处理连接生命周期。**教训：流式接口的错误处理比 REST API 更复杂，需要显式设计连接状态机。**

---

## 快速开始

### 环境要求

- **Node.js** 18+ （推荐 24+）
- **npm** 9+ 或 **pnpm**

### 安装启动

#### 方式一：一键启动（Windows）

```bash
start.bat
```

#### 方式二：分别启动

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 同时启动前后端
npm start

# 或分别启动
npm run dev:backend   # 后端 http://localhost:3001
npm run dev:frontend  # 前端 http://localhost:5173
```

#### 方式三：手动启动

**后端：**
```bash
cd backend
npm install
npm run start:dev
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

### 访问应用

打开浏览器访问：**http://localhost:5173**

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

## 核心特性

- **可视化工作流编排** - 拖拽式节点编辑器，支持 6 种节点类型（开始、AI 回答、知识检索、条件分支、HTTP 请求、结束）
- **工作流描述** - 为工作流添加可编辑的描述，便于管理和理解
- **知识库 RAG 检索** - 支持 PDF、Word、Markdown、TXT 文档上传，自动分片、向量化存储和混合检索
- **AI 对话** - 集成 DeepSeek 等大模型，支持流式输出和多轮对话
- **实时执行** - SSE 流式推送执行状态和日志
- **撤销重做** - 最多 50 步历史记录
- **响应式设计** - 现代化的 UI 界面

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
│   └── loom.db                 # SQLite 数据库
│
├── frontend/                   # Vue3 前端
│   ├── src/
│   │   ├── components/         # 业务组件（FlowCanvas、KnowledgeBaseManager、ChatWidget）
│   │   ├── router/             # 路由配置
│   │   ├── store/              # Pinia 状态管理
│   │   ├── composables/        # 组合式函数
│   │   └── types/              # 类型定义
│   └── package.json
│
├── design-mockups/             # UI 设计稿
├── Docs/                       # 项目文档
└── docker-compose.yml          # PostgreSQL + pgvector 配置
```

---

## 文档

- [产品需求文档 (PRD)](./Docs/PRD.md)
- [项目架构说明](./Docs/项目架构说明.md)
- [快速入门指南](./Docs/快速入门指南.md)
- [API 文档](./Docs/API文档.md)
- [开发指南](./Docs/开发指南.md)

---

## 与 Dify/Coze 对比

| 功能 | LOOM | Dify | Coze |
|------|------|------|------|
| 工作流编排 | 基础 | 完整 | 完整 |
| 知识库 RAG | 完整 | 完整 | 完整 |
| 可视化编辑 | 完整 | 完整 | 完整 |
| 流式输出 | 支持 | 支持 | 支持 |
| HTTP 请求节点 | 支持 | 支持 | 支持 |
| 循环节点 | 不支持 | 支持 | 支持 |
| 多用户系统 | 不支持 | 支持 | 支持 |
| 代码节点 | 不支持 | 支持 | 支持 |
| 部署复杂度 | 低 | 中 | 高 |

**适用场景：** 学习工作流引擎和 RAG 原理、个人 AI 助手搭建、产品原型快速验证。

---

## 路线图

- [x] 可视化工作流编排
- [x] 知识库 RAG 检索
- [x] AI 对话和流式输出
- [x] 条件分支
- [x] HTTP 请求节点
- [x] 工作流描述
- [ ] 循环节点
- [ ] 变量管理
- [ ] 多用户系统
- [ ] 统计监控

---

## 许可证

[MIT](./LICENSE)
