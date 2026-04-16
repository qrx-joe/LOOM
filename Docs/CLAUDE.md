# CLAUDE.md 项目约束

## 项目特定指令

- 你在任何时候都不需要 `npm run dev`（前端）或 `npm run start:dev`（后端），因为我一般都会保持着前后端的运行。
- 你有权限执行所有 sudo 权限的命令。在你需要 sudo 权限的时候，请让用户提供密码。
- 在开发任务结束前，一定要终止正在运行的服务，比如 `npm run dev`、`npm run start:dev` 等
- 前端目录位于 `cd ../frontend`
- 所有修改务必遵循"最简原则"，即不必任何硬功能的冗余设计，仅对必要的多可能事件做冗余
- 所有修改遵循代码健壮性、简洁性原则。所有模块必须遵循当前代码中已有的设计风格和命名风格，尽量复用已有模块
- 注释丰富
- 日志输出不用太多，但前后端关键地方都需要输出
- 不要做任何的旧代码兼容，不要做向后兼容，这样能让问题暴露出来
- 记得更新项目文档
- 中文回答我的问题
- 对于所有接口的返回，应该使用后端统一定义的 DTO，路径：`src/common/dto/api-response.dto.ts`，进行请求体的构造与返回
- **重要**：当遇到问题时，优先考虑编译错误而不是缓存问题。TypeScript 编译错误必须立即修复。
- **重要**：使用 `axios` 进行 HTTP 请求时，注意处理 CORS 和错误边界
- **重要**：所有数据库实体变更需要同步更新 TypeORM 实体定义

---

## 🎯 核心开发原则（实战总结）

### 🔧 代码修改原则

1. **单一职责原则** - 每个服务、方法只负责一个明确的职责域，避免职责混乱
2. **最简代码原则** - 不做向后兼容，宁愿破坏性更新也要保证代码最简化，删除所有冗余代码
3. **类型严格原则** - 所有 TypeScript 类型必须正确，不使用 any，编译错误必须立即修复
4. **KISS 原则** - 保持简单直接，如果需要解释就是太复杂了
5. **文档置信度原则** - 绝不基于推测写代码，必须基于真实可验证的技术文档。特别是涉及支付、数据库、API 等关键功能时，如果文档置信度不高，必须停止并要求用户提供准确资料

### 📋 任务执行标准流程

1. **修改前说明** - 每次修改任何文件前，必须告诉用户修改原因和遵循的核心原则
2. **完整阅读** - 完整阅读所有相关文件，一行都不能少，识别功能重叠和架构模式
3. **TodoWrite 管理** - 使用 TodoWrite 工具规划和跟踪任务进度，确保不遗漏任务
4. **编译优先** - 每次修改后立即检查编译，TypeScript 编译错误优先于缓存问题
5. **功能检查** - 修改后检查是否有重复功能，遵循单一职责原则

---

## 🏗️ 项目架构速查

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Vue 3.5+ + TypeScript 5.9+ | Composition API |
| 构建工具 | Vite 7.2+ | 快速开发 |
| 状态管理 | Pinia 3.0+ | Vue 官方推荐 |
| 工作流可视化 | @vue-flow/core 1.48+ | 拖拽式编辑器 |
| UI 图标 | lucide-vue-next | 图标库 |
| 后端框架 | NestJS 11.0+ | 企业级 Node.js |
| ORM | TypeORM 0.3.28+ | 数据库映射 |
| 数据库 | SQLite (开发) / PostgreSQL (生产) | 灵活切换 |
| AI SDK | openai 6.18+ | LLM 调用 |

### 目录结构约定

```
backend/src/
├── app.module.ts           # 根模块
├── main.ts                 # 入口文件
├── common/                 # 公共模块
│   ├── dto/               # 数据传输对象
│   │   └── api-response.dto.ts  # 统一响应格式
│   ├── filters/           # 异常过滤器
│   └── interceptors/      # 拦截器
├── workflow/              # 工作流模块
│   ├── entities/          # 实体定义
│   ├── interfaces/        # 类型接口
│   ├── dto/               # DTO
│   ├── workflow.controller.ts
│   ├── workflow.service.ts
│   └── executor.service.ts  # 执行引擎
├── knowledge/             # 知识库模块
│   ├── entities/
│   ├── services/
│   │   ├── knowledge-base.service.ts
│   │   ├── document-processor.service.ts
│   │   ├── chunking.service.ts
│   │   ├── embedding.service.ts
│   │   └── search.service.ts
│   └── knowledge.controller.ts
├── chat/                  # 聊天模块
│   ├── entities/
│   ├── chat.service.ts
│   └── chat.controller.ts
└── seeder/                # 数据初始化

frontend/src/
├── components/            # 业务组件
│   ├── FlowCanvas.vue     # 工作流编辑器
│   ├── KnowledgeBaseManager.vue
│   ├── ChatWidget.vue
│   └── WorkflowList.vue
├── router/                # 路由配置
├── store/                 # Pinia 状态管理
│   ├── workflow.ts
│   └── chat.ts
├── composables/           # 组合式函数
│   └── useDebounce.ts
├── config/
│   └── api.ts            # API 配置
└── types/                # 类型定义
```

---

## 🔌 API 规范

### 统一响应格式

所有 API 返回必须使用 `ApiResponseDto`：

```typescript
// backend/src/common/dto/api-response.dto.ts
export class ApiResponseDto<T> {
  code: number;      // HTTP 状态码
  message: string;   // 提示信息
  data: T;           // 数据
}
```

使用示例：

```typescript
// 成功响应
return new ApiResponseDto({
  code: 200,
  message: '操作成功',
  data: result
});

// 错误响应
return new ApiResponseDto({
  code: 400,
  message: '参数错误',
  data: null
});
```

### API 端点前缀

- 工作流：`/api/workflows`
- 知识库：`/api/knowledge`
- 聊天：`/api/chat`

---

## 🗄️ 数据库规范

### 实体定义规范

```typescript
@Entity('workflows')
export class Workflow {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ type: 'simple-json' })
  nodes: NodeData[];

  @Column({ type: 'simple-json' })
  edges: EdgeData[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 数据类型使用

- **JSON 数据**：使用 `simple-json` 类型
- **日期**：使用 `@CreateDateColumn()` 和 `@UpdateDateColumn()`
- **枚举**：使用 TypeScript 枚举配合 `@Column({ type: 'text' })`

### 数据库操作

- 所有数据库查询必须使用 dhhub 这个 MCP
- 不使用 TypeORM 的 migration 方法，已开启 `synchronize: true`
- 开发时使用 SQLite，生产使用 PostgreSQL

---

## 🎨 前端开发规范

### 组件结构

```vue
<script setup lang="ts">
// 1. imports
import { ref, computed } from 'vue'
import type { Workflow } from '@/types'

// 2. types
interface Props {
  workflowId: string
}

// 3. props & emits
const props = defineProps<Props>()
const emit = defineEmits<{
  update: [data: Workflow]
}>()

// 4. state
const loading = ref(false)

// 5. computed
const displayName = computed(() => props.workflowId.toUpperCase())

// 6. methods
const handleSave = async () => {
  // implementation
}
</script>

<template>
  <!-- template content -->
</template>

<style scoped>
/* scoped styles */
</style>
```

### 状态管理（Pinia）

```typescript
// store/workflow.ts
import { defineStore } from 'pinia'
import type { Workflow } from '@/types'

export const useWorkflowStore = defineStore('workflow', () => {
  // State
  const workflows = ref<Workflow[]>([])
  const currentWorkflow = ref<Workflow | null>(null)
  const loading = ref(false)

  // Getters
  const workflowCount = computed(() => workflows.value.length)

  // Actions
  const fetchWorkflows = async () => {
    loading.value = true
    try {
      const response = await axios.get('/api/workflows')
      workflows.value = response.data.data
    } finally {
      loading.value = false
    }
  }

  return {
    workflows,
    currentWorkflow,
    loading,
    workflowCount,
    fetchWorkflows
  }
})
```

### API 调用

```typescript
// config/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000
})

// 统一错误处理
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)
```

---

## 🔧 工作流引擎规范

### 节点类型

```typescript
enum NodeType {
  INPUT = 'INPUT',                    // 开始节点
  AI_AGENT = 'AI_AGENT',              // AI 节点
  CONDITION = 'CONDITION',            // 条件节点
  KNOWLEDGE_RETRIEVAL = 'KNOWLEDGE_RETRIEVAL',  // 知识检索节点
  HTTP_REQUEST = 'HTTP_REQUEST',      // HTTP 请求节点
  OUTPUT = 'OUTPUT',                  // 结束节点
}
```

### 节点数据结构

```typescript
interface NodeData {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, any>
  }
}

interface EdgeData {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}
```

### 执行上下文

```typescript
interface ExecutionContext {
  workflowId: string
  sessionId: string
  nodeOutputs: Map<string, any>  // 节点输出缓存
  variables: Map<string, any>    // 变量存储
}
```

---

## 📚 知识库规范

### 文档处理流程

```
用户上传文档
    ↓
文档解析 (pdf-parse / mammoth)     # 提取文本
    ↓
文本分片 (ChunkingService)         # 切分成小块
    ↓
生成向量 (EmbeddingService)        # 转换为向量
    ↓
存入数据库                         # 保存片段和向量
```

### 分片策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| fixed | 固定长度切分 | 简单场景 |
| semantic | 按段落分割，保留语义 | 推荐方案 |
| recursive | 递归分割 | 复杂文档 |

默认配置：
- 分片大小：1000 字符
- 重叠长度：200 字符

### 检索算法

采用**混合检索（Hybrid Search）**：

```
最终得分 = 0.3 × BM25分数 + 0.7 × 向量相似度
```

---

## 🔒 代码质量要求

### TypeScript 规范

- **严格模式**：开启 `strict: true`
- **无 any**：不使用 `any` 类型，必须定义接口
- **显式返回类型**：公共方法必须声明返回类型
- **readonly**：不可变数据使用 `readonly`

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类/接口 | PascalCase | `WorkflowService`, `NodeData` |
| 方法/变量 | camelCase | `executeWorkflow`, `nodeCount` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件 | kebab-case | `workflow-service.ts` |
| 枚举 | PascalCase | `NodeType`, `StatusCode` |

### 注释规范

```typescript
/**
 * 执行工作流
 * @param workflowId 工作流ID
 * @param input 用户输入
 * @returns 执行结果
 * @throws 当工作流不存在或执行失败时抛出异常
 */
async execute(workflowId: string, input: any): Promise<ExecutionResult> {
  // 关键逻辑注释
  const workflow = await this.findById(workflowId)
  if (!workflow) {
    throw new NotFoundException('工作流不存在')
  }

  // 拓扑排序执行节点
  const executionOrder = this.topologicalSort(workflow.nodes, workflow.edges)
  // ...
}
```

---

## 🌐 联网信息获取

- 联网信息获取优先使用搜索工具
- 如果搜索结果不全，可以使用用户级 MCP 工具 "puppeteer" 进一步打开检索
- **重要**：使用 Puppeteer 工具时，必须设置大分辨率窗口（如 1920x1080 或更大），以确保能够看到完整的网页内容和详细信息，避免因窗口过小导致重要信息被隐藏或截断

---

## 📝 文档更新要求

每当完成以下类型的修改时，必须同步更新文档：

1. **新增功能** → 更新 PRD.md、快速入门指南
2. **API 变更** → 更新 API文档.md
3. **架构调整** → 更新 项目架构说明.md
4. **配置变更** → 更新 README.md
5. **代码优化** → 更新 代码优化总结.md

---

## ✅ Definition of Done

每个任务完成时必须满足：

- [ ] 代码符合 TypeScript 严格模式，无编译错误
- [ ] 新功能有适当的注释说明
- [ ] 关键路径有日志输出
- [ ] 遵循项目命名规范
- [ ] 不使用 `any` 类型
- [ ] API 使用统一响应格式
- [ ] 无重复功能代码
- [ ] 相关文档已更新

---

## 🚫 Never Do

**绝对禁止：**

- 使用 `--no-verify` 绕过提交钩子
- 禁用测试而不是修复它们
- 提交无法编译的代码
- 未经阅读就修改代码
- 使用 `any` 类型逃避类型检查
- 不做向后兼容的冗余设计

---

## Development Guidelines

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Philosophy

#### Core Beliefs

- **Incremental progress over big bangs** - Small changes that compile and pass tests
- **Learning from existing code** - Study and plan before implementing
- **Pragmatic over dogmatic** - Adapt to project reality
- **Clear intent over clever code** - Be boring and obvious

### Simplicity Means

- Single responsibility per function/class
- Avoid premature abstractions
- No clever tricks - choose the boring solution
- If you need to explain it, it's too complex

## Process

### 1. Planning & Staging

Break complex work into 3-5 stages. Document in `IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]

**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [Specific test cases]
**Status**: [Not Started|In Progress|Complete]
```

- Update status as you progress
- Remove file when all stages are done

### 2. Implementation Flow

1. **Understand** - Study existing patterns in codebase
2. **Test** - Write test first (red)
3. **Implement** - Minimal code to pass (green)
4. **Refactor** - Clean up with tests passing
5. **Commit** - With clear message linking to plan

### 3. When Stuck (After 3 Attempts)

**CRITICAL**: Maximum 3 attempts per issue, then STOP.

1. **Document what failed**:
   - What you tried
   - Specific error messages
   - Why you think it failed

2. **Research alternatives**:
   - Find 2-3 similar implementations
   - Note different approaches used

3. **Question fundamentals**:
   - Is this the right abstraction level?
   - Can this be split into smaller problems?
   - Is there a simpler approach entirely?

4. **Try different angle**:
   - Different library/framework feature?
   - Different architectural pattern?
   - Remove abstraction instead of adding?

## Technical Standards

### Architecture Principles

- **Composition over inheritance** - Use dependency injection
- **Interfaces over singletons** - Enable testing and flexibility
- **Explicit over implicit** - Clear data flow and dependencies
- **Test-driven when possible** - Never disable tests, fix them

### Code Quality

- **Every commit must**:
  - Compile successfully
  - Pass all existing tests
  - Include tests for new functionality
  - Follow project formatting/linting

- **Before committing**:
  - Run formatters/linters
  - Self-review changes
  - Ensure commit message explains "why"

### Error Handling

- Fail fast with descriptive messages
- Include context for debugging
- Handle errors at appropriate level
- Never silently swallow exceptions

## Decision Framework

When multiple valid approaches exist, choose based on:

1. **Testability** - Can I easily test this?
2. **Readability** - Will someone understand this in 6 months?
3. **Consistency** - Does this match project patterns?
4. **Simplicity** - Is this the simplest solution that works?
5. **Reversibility** - How hard to change later?

## Project Integration

### Learning the Codebase

- Find 3 similar features/components
- Identify common patterns and conventions
- Use same libraries/utilities when possible
- Follow existing test patterns

### Tooling

- Use project's existing build system
- Use project's test framework
- Use project's formatter/linter settings
- Don't introduce new tools without strong justification

## Quality Gates

### Definition of Done

- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] No linter/formatter warnings
- [ ] Commit messages are clear
- [ ] Implementation matches plan
- [ ] No TODOs without issue numbers

### Test Guidelines

- Test behavior, not implementation
- One assertion per test when possible
- Clear test names describing scenario
- Use existing test utilities/helpers
- Tests should be deterministic

## Important Reminders

**NEVER**:

- Use `--no-verify` to bypass commit hooks
- Disable tests instead of fixing them
- Commit code that doesn't compile
- Make assumptions - verify with existing code

**ALWAYS**:

- Commit working code incrementally
- Update plan documentation as you go
- Learn from existing implementations
- Stop after 3 failed attempts and reassess

---

*文档版本：v1.1*
*最后更新：2026-04-15*
