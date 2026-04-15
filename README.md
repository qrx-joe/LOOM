# LOOM - AI 工作流编排平台

> 轻量级、高保真的 AI 智能体平台，支持可视化工作流编排、知识库 RAG 检索和智能问答

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-green.svg)](https://vuejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0+-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-UNLICENSED-yellow.svg)]()

---

## 🎯 项目简介

**LOOM** 是一个可视化的 AI 工作流编排工具，让你像搭积木一样构建 AI 应用。无需复杂编码，通过拖拽节点即可实现智能问答、知识库检索等功能。

### 核心特性

- 🎨 **可视化工作流编排** - 拖拽式节点编辑器，支持 5 种节点类型（开始、AI 回答、知识检索、条件分支、结束）
- 📚 **知识库 RAG 检索** - 支持 PDF、Word、Markdown、TXT 文档上传，自动分片、向量化存储和混合检索
- 🤖 **AI 对话** - 集成 DeepSeek 等大模型，支持流式输出和多轮对话
- ⚡ **实时执行** - SSE 流式推送执行状态和日志
- 🔄 **撤销重做** - 最多 50 步历史记录
- 📱 **响应式设计** - 现代化的 UI 界面

---

## 🏗️ 系统架构

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

## 🛠️ 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | Vue 3 + TypeScript | 现代化响应式框架，Composition API |
| **构建工具** | Vite | 快速开发和构建 |
| **状态管理** | Pinia | Vue 官方推荐状态管理方案 |
| **工作流可视化** | @vue-flow/core | Vue 工作流编辑器 |
| **UI 组件** | Lucide Vue | 图标库 |
| **后端框架** | NestJS + TypeScript | 企业级 Node.js 框架 |
| **ORM** | TypeORM | 支持多种数据库 |
| **数据库** | SQLite (开发) / PostgreSQL (生产) | 轻量与性能兼顾 |
| **AI 调用** | OpenAI SDK | 兼容多家国内大模型 |
| **文档解析** | pdf-parse, mammoth | PDF、Word、Markdown 和 TXT 解析 |

---

## 📦 项目结构

```
loom/
├── backend/                    # NestJS 后端
│   ├── src/
│   │   ├── app.module.ts       # 根模块
│   │   ├── workflow/           # 工作流模块
│   │   │   ├── executor.service.ts    # 工作流执行引擎
│   │   │   ├── workflow.controller.ts
│   │   │   └── workflow.service.ts
│   │   ├── knowledge/          # 知识库模块
│   │   │   ├── services/       # 各服务组件
│   │   │   │   ├── knowledge-base.service.ts
│   │   │   │   ├── document-processor.service.ts
│   │   │   │   ├── chunking.service.ts
│   │   │   │   ├── embedding.service.ts
│   │   │   │   └── search.service.ts
│   │   │   └── entities/       # 数据库实体
│   │   ├── chat/               # 聊天会话模块
│   │   └── seeder/             # 数据初始化
│   └── loom.db                 # SQLite 数据库
│
├── frontend/                   # Vue3 前端
│   ├── src/
│   │   ├── components/         # 业务组件
│   │   │   ├── FlowCanvas.vue       # 工作流编辑器
│   │   │   ├── KnowledgeBaseManager.vue
│   │   │   ├── ChatWidget.vue
│   │   │   └── WorkflowList.vue
│   │   ├── views/              # 页面视图
│   │   ├── store/              # Pinia 状态管理
│   │   ├── composables/        # 组合式函数
│   │   └── config/api.ts       # API 配置
│   └── package.json
│
├── Docs/                       # 项目文档
│   ├── PRD.md                  # 产品需求文档
│   ├── 项目架构说明.md          # 架构详解
│   ├── 快速入门指南.md          # 使用指南
│   ├── API文档.md              # API 文档
│   └── CLAUDE.md               # Claude Code 项目约束
│
├── docker-compose.yml          # PostgreSQL + pgvector 配置
├── start.bat                   # Windows 一键启动脚本
└── package.json                # 根项目配置
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** 18+ （推荐 20+）
- **npm** 9+ 或 **yarn**

### 安装启动

#### 方式一：一键启动（Windows）

```bash
# 在项目根目录执行
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

## 📖 使用指南

### 创建工作流

1. 点击「新建工作流」
2. 从左侧工具栏拖拽节点到画布
3. 连接节点构建流程
4. 配置每个节点的参数
5. 点击「运行」测试

### 使用知识库

1. 进入「知识库」页面
2. 创建知识库
3. 上传文档（PDF/Word/Markdown/TXT）
4. 等待文档处理完成
5. 在工作流中选择知识检索节点并配置知识库

### 节点类型

| 节点 | 描述 | 用途 |
|------|------|------|
| **开始** | 工作流入口 | 接收用户输入 |
| **AI 回答** | 调用大模型 | 生成 AI 回复 |
| **知识检索** | 从知识库搜索 | RAG 检索 |
| **条件分支** | IF/ELSE 判断 | 流程控制 |
| **结束** | 工作流出口 | 输出结果 |

详细使用指南请参考 [快速入门指南](./Docs/快速入门指南.md)

---

## 📚 文档

- [产品需求文档 (PRD)](./Docs/PRD.md) - 产品功能详细说明
- [项目架构说明](./Docs/项目架构说明.md) - 技术架构和模块设计
- [快速入门指南](./Docs/快速入门指南.md) - 新手教程
- [API 文档](./Docs/API文档.md) - 接口定义
- [开发指南](./Docs/开发指南.md) - 开发规范

---

## ⚙️ 配置说明

### 环境变量

在项目根目录创建 `.env` 文件：

```env
# LLM API 配置
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat

# 数据库配置（可选，默认使用 SQLite）
DB_TYPE=sqlite
DB_DATABASE=loom.db

# PostgreSQL 配置（生产环境）
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
# DB_DATABASE=loom
```

### 使用 PostgreSQL（可选）

```bash
# 启动 PostgreSQL + pgvector
docker-compose up -d
```

---

## 🧪 开发

### 代码规范

- 使用 TypeScript 严格模式
- 所有 API 返回使用统一的 DTO 格式
- 注释丰富，关键逻辑需说明
- 遵循单一职责原则

### 项目脚本

```bash
# 根目录
npm run install:all    # 安装所有依赖
npm run dev:backend    # 启动后端开发服务器
npm run dev:frontend   # 启动前端开发服务器
npm start              # 同时启动前后端

# backend 目录
npm run start:dev      # 开发模式
npm run build          # 构建生产版本
npm run test           # 运行测试
npm run lint           # 代码检查

# frontend 目录
npm run dev            # 开发服务器
npm run build          # 构建生产版本
npm run preview        # 预览生产构建
```

---

## 🆚 与 Dify/Coze 对比

| 功能 | LOOM | Dify | Coze |
|------|------|------|------|
| 工作流编排 | ✅ 基础 | ✅ 完整 | ✅ 完整 |
| 知识库 RAG | ✅ 完整 | ✅ 完整 | ✅ 完整 |
| 可视化编辑 | ✅ 完整 | ✅ 完整 | ✅ 完整 |
| 流式输出 | ✅ | ✅ | ✅ |
| 循环节点 | ❌ | ✅ | ✅ |
| HTTP 请求节点 | ❌ | ✅ | ✅ |
| 多用户系统 | ❌ | ✅ | ✅ |
| 代码节点 | ❌ | ✅ | ✅ |
| 部署复杂度 | 低 | 中 | 高 |

**适用场景：**
- ✅ 学习工作流引擎和 RAG 原理
- ✅ 个人 AI 助手搭建
- ✅ 产品原型快速验证
- ❌ 企业生产环境（缺少多租户、权限管理等）

---

## 🗺️ 路线图

- [x] 可视化工作流编排
- [x] 知识库 RAG 检索
- [x] AI 对话和流式输出
- [x] 条件分支
- [ ] HTTP 请求节点
- [ ] 循环节点
- [ ] 变量管理
- [ ] 多用户系统
- [ ] 统计监控

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

## 📄 许可证

UNLICENSED - 本项目仅供学习和参考使用

---

## 🙏 致谢

- [Vue Flow](https://vueflow.dev/) - 工作流可视化组件
- [NestJS](https://nestjs.com/) - 后端框架
- [DeepSeek](https://deepseek.com/) - 大模型支持

---

<p align="center">Made with ❤️ by LOOM Team</p>
