# LOOM Backend

LOOM 后端服务 —— 基于 NestJS + TypeScript 构建的 AI 工作流编排 API 服务。

## 技术栈

- **NestJS 11** — 企业级 Node.js 框架
- **TypeScript 5.7+** — 类型安全
- **TypeORM** — ORM 与数据库迁移
- **SQLite** — 开发环境默认数据库
- **PostgreSQL + pgvector** — 生产环境推荐
- **OpenAI SDK** — 大模型 API 调用
- **pdf-parse / mammoth** — PDF 与 Word 文档解析

## 项目结构

```
backend/
├── src/
│   ├── app.module.ts         # 根模块
│   ├── main.ts               # 应用入口
│   ├── workflow/             # 工作流模块
│   │   ├── executor.service.ts      # 工作流执行引擎
│   │   ├── workflow.controller.ts
│   │   ├── workflow.service.ts
│   │   ├── interfaces/              # 类型与 DTO
│   │   └── strategies/              # 执行策略
│   ├── knowledge/            # 知识库模块
│   │   ├── knowledge.controller.ts
│   │   ├── services/
│   │   │   ├── knowledge-base.service.ts
│   │   │   ├── document-processor.service.ts
│   │   │   ├── chunking.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   └── search.service.ts
│   │   └── entities/
│   ├── chat/                 # 聊天会话模块
│   ├── common/               # 通用模块与拦截器
│   └── seeder/               # 数据库初始化数据
├── test/                     # 测试文件
├── loom.db                   # SQLite 数据库文件
├── package.json
├── tsconfig.json
├── nest-cli.json
└── eslint.config.js
```

## 可用脚本

```bash
npm run start:dev   # 开发模式（带热重载）
npm run start:debug # 调试模式
npm run start:prod  # 生产模式
npm run build       # 构建生产版本
npm run test        # 运行单元测试
npm run test:e2e    # 运行端到端测试
npm run test:cov    # 生成测试覆盖率报告
npm run lint        # 运行 ESLint 并自动修复
```

## 环境变量

在项目根目录或 `backend/` 目录下创建 `.env` 文件：

```env
# LLM 配置
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat

# 数据库配置（默认 SQLite）
DB_TYPE=sqlite
DB_DATABASE=loom.db

# PostgreSQL 配置
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres_password
# DB_DATABASE=loom
```

## 核心模块说明

- **workflow** — 工作流 CRUD、执行引擎、SSE 流式日志推送
- **knowledge** — 知识库管理、文档解析、文本分片、向量检索
- **chat** — 会话管理、LLM 网关、流式对话
- **common** — 通用异常过滤器、日志、工具类
- **seeder** — 应用启动时的默认数据注入
