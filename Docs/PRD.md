# LOOM 智能体平台 PRD

> Version 1.0 | 基于 2026-1-Stage2 项目要求

---

## 1. 产品概述

**产品名称**：LOOM 智能体平台
**项目类型**：全栈 Web 应用（演示版）
**核心价值**：轻量级、高保真的 Coze 智能体平台，支持可视化工作流编排、知识库 RAG 检索和智能问答 Agent，无需复杂编码。
**目标用户**：AI 应用开发者、智能体学习者、原型验证团队

---

## 2. 系统架构

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
│              │   State Store    │                        │
│              │ (Pinia/Context) │                        │
│              └────────┬────────┘                        │
└────────────────────────┼────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┼────────────────────────────────┐
│                      Backend (NestJS)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Workflow Svc│  │ Knowledge Svc│  │   Agent Svc     │  │
│  │ - JSON Parser│  │ - Text Extract│  │ - LLM Gateway  │  │
│  │ - Node Sched│  │ - Vector Store│  │ - RAG Pipeline │  │
│  │ - Branch Log│  │ - Hybrid Ret │  │ - Session Mgmt  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘  │
│         │               │                    │          │
│         └───────────────┼────────────────────┘          │
│                         │                               │
│                  ┌──────▼──────┐                        │
│                  │   SQLite    │                        │
│                  │  Database   │                        │
│                  └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
                         │
                  ┌──────▼──────┐
                  │  LLM API    │
                  │ (External)  │
                  └─────────────┘
```

---

## 3. 功能模块详细需求

### 3.1 可视化工作流编排 (FlowCanvas)

**功能描述**：拖拽式画布，支持节点连接、配置、执行状态实时推送

#### 3.1.1 画布功能
| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 拖拽节点 | 从左侧节点列表拖入画布 | P0 |
| SVG 连线 | 节点间用 SVG 贝塞尔曲线连接 | P0 |
| 节点移动 | 拖拽节点自由定位 | P0 |
| 画布缩放 | 滚轮缩放 + 平移 | P1 |
| 节点删除 | 选中节点按 Delete 删除 | P0 |
| 连线删除 | 点击连线选中后删除 | P1 |

#### 3.1.2 节点类型
| 节点类型 | 描述 | 配置参数 |
|----------|------|----------|
| **Trigger (触发器)** | 工作流入口节点 | 触发方式 (手动/定时/Webhook) |
| **LLM Action** | 调用大模型 | 模型选择、System Prompt、Temperature |
| **Knowledge Action** | 知识库检索 | 检索数量 (top-k)、相似度阈值 |
| **Branch (分支)** | 条件分支 | 条件表达式 (IF/ELSE) |
| **Output (输出)** | 结束节点 | 输出格式 |

#### 3.1.3 JSON 序列化
```json
{
  "workflow": {
    "id": "wf_xxx",
    "name": "问答工作流",
    "nodes": [
      {
        "id": "node_1",
        "type": "trigger",
        "position": {"x": 100, "y": 200},
        "config": {"triggerType": "manual"}
      },
      {
        "id": "node_2",
        "type": "knowledge",
        "position": {"x": 300, "y": 200},
        "config": {"topK": 5, "threshold": 0.7}
      }
    ],
    "edges": [
      {"source": "node_1", "target": "node_2", "sourceHandle": "out", "targetHandle": "in"}
    ]
  }
}
```

#### 3.1.4 执行引擎
- **拓扑排序**：基于边的依赖关系确定执行顺序
- **状态推送**：SSE (Server-Sent Events) 实时推送节点执行状态
- **日志输出**：每个节点的输入/输出/耗时记录

---

### 3.2 知识库管理 (KnowledgeBaseManager)

**功能描述**：上传 TXT/Markdown 文件，自动分片、索引、支持混合检索

#### 3.2.1 文件管理
| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 文件上传 | 支持 .txt, .md 文件 | P0 |
| 文件列表 | 展示已上传文件及状态 | P0 |
| 文件删除 | 删除已上传文件 | P1 |
| 文档数量统计 | 展示总文档数 | P1 |

#### 3.2.2 文档处理 (后端)
```
上传文件 → 文本提取 → 清洗(去噪音) → 分片(chunk) → 向量化存储
```

| 处理阶段 | 描述 |
|----------|------|
| 文本提取 | 解析 TXT/MD 内容 |
| 清洗 | 去除特殊字符、空白规范化 |
| 分片 | 按固定长度/段落分块 (chunk_size=500, overlap=50) |
| 向量化 | 生成 embedding 向量 (Mock 或实际调用) |

#### 3.2.3 混合检索
| 检索方式 | 描述 |
|----------|------|
| **Keyword Search** | BM25 或 TF-IDF 关键词匹配 |
| **Semantic Search** | 向量相似度 (cosine similarity) |
| **Hybrid** | 加权融合：0.5 * keyword + 0.5 * semantic |

#### 3.2.4 知识库 API
```
POST   /api/knowledge/upload     # 上传文件
GET    /api/knowledge/files     # 获取文件列表
DELETE /api/knowledge/files/:id # 删除文件
POST   /api/knowledge/search    # 混合检索
```

---

### 3.3 智能问答 Agent (ChatWidget)

**功能描述**：多轮对话 Agent，支持 RAG 注入、答案可溯源

#### 3.3.1 对话功能
| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 消息发送 | 用户输入触发 AI 回复 | P0 |
| 多轮对话 | 维护 session 历史上下文 | P0 |
| 流式输出 |打字机效果，实时显示 AI 输出 | P1 |
| 加载状态 | AI 处理中显示 loading | P0 |

#### 3.3.2 System Prompt 动态构建
```
System Prompt = [Role] + [Task Description] + [Context from RAG] + [Constraints]
```
- **Role**：你是一个专业的智能助手
- **Task**：根据提供的上下文回答用户问题
- **Context**：注入 RAG 检索到的知识片段
- **Constraints**：如果无法找到答案，请如实说明

#### 3.3.3 答案溯源
| 溯源信息 | 描述 |
|----------|------|
| 知识库 ID | 引用了哪个文档/片段 |
| 节点 ID | 使用了哪个工作流节点 |
| 相似度分数 | 检索结果的置信度 |

#### 3.3.4 Agent API
```
POST   /api/agent/chat          # 发送消息
GET    /api/agent/sessions/:id  # 获取会话历史
POST   /api/agent/sessions      # 创建新会话
```

---

## 4. API 协议规范

### 4.1 工作流 API
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/workflows | 获取所有工作流 |
| POST | /api/workflows | 创建工作流 |
| GET | /api/workflows/:id | 获取单个工作流 |
| PUT | /api/workflows/:id | 更新工作流 |
| DELETE | /api/workflows/:id | 删除工作流 |
| POST | /api/workflows/:id/execute | 执行工作流 |
| GET | /api/workflows/:id/logs | 获取执行日志 |

### 4.2 知识库 API
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/knowledge/files | 获取文件列表 |
| POST | /api/knowledge/upload | 上传文件 |
| DELETE | /api/knowledge/files/:id | 删除文件 |
| POST | /api/knowledge/search | 检索 |

### 4.3 Agent API
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/agent/chat | 发送对话消息 |
| GET | /api/agent/sessions | 获取会话列表 |
| GET | /api/agent/sessions/:id | 获取会话详情 |

### 4.4 错误响应格式
```json
{
  "code": 400,
  "message": "Invalid request",
  "data": null
}
```

---

## 5. 数据模型

### 5.1 数据库表结构 (SQLite)

```sql
-- 工作流表
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  graph_json TEXT NOT NULL,  -- JSON serialized graph
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 工作流执行日志表
CREATE TABLE workflow_logs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  node_id TEXT,
  status TEXT,  -- pending, running, success, failed
  input_data TEXT,
  output_data TEXT,
  error TEXT,
  started_at DATETIME,
  completed_at DATETIME
);

-- 知识库文档表
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  chunks TEXT NOT NULL,  -- JSON array of chunks
  embeddings TEXT,  -- JSON array of vectors (mock)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent 会话表
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- user / assistant
  content TEXT NOT NULL,
  metadata TEXT,  -- JSON: source_doc_ids, node_ids
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. 技术选型

### 6.1 前端
| 技术 | 用途 |
|------|------|
| Vue 3 (Composition API) | 框架 |
| TypeScript | 类型安全 |
| Pinia | 状态管理 |
| Vue Flow | 工作流画布 |
| SSE | 实时状态推送 |

### 6.2 后端
| 技术 | 用途 |
|------|------|
| NestJS | Web 框架 |
| SQLite + better-sqlite3 | 数据库 |
| TypeORM / Prisma | ORM |

### 6.3 LLM 集成
- 支持 OpenAI GPT 系列 API
- 支持 Claude API
- 流式输出 (Streaming)

---

## 7. 验收标准

### 7.1 功能验收
| 功能 | 验收条件 |
|------|----------|
| 工作流创建 | 可拖拽节点、连线、保存 |
| 工作流执行 | 点击执行，节点状态实时更新，日志可查 |
| 文件上传 | 上传 txt/md 文件，解析后出现在列表 |
| 知识检索 | 搜索关键词，返回相关文档片段 |
| 问答对话 | 发送问题，AI 基于知识库回答 |
| 答案溯源 | AI 回复显示引用来源 |

### 7.2 冷启动验证
- [ ] 数据库预置测试数据
- [ ] LLM API Key 已配置
- [ ] RAG Pipeline 可正常工作

### 7.3 交付物
- [ ] 可运行的演示 Demo
- [ ] 完整的核心链路可用 (拖拽→执行，上传→问答)

---

## 8. 开发里程碑

| 阶段 | 任务 | 目标 |
|------|------|------|
| M1 | 项目框架搭建 | 前后端骨架、Docker 环境 |
| M2 | 工作流编排 | FlowCanvas 组件、CRUD API、执行引擎 |
| M3 | 知识库管理 | 文件上传、分片、检索 API |
| M4 | 问答 Agent | ChatWidget、Session 管理、RAG 注入 |
| M5 | 集成测试 | 端到端联调、冷启动验证 |
| M6 | 文档与交付 | README、演示视频 |

---

## 9. 附录

### 9.1 参考资料
- Coze 平台设计理念
- Vue Flow 官方文档
- RAG (Retrieval-Augmented Generation) 架构

### 9.2 术语表
| 术语 | 定义 |
|------|------|
| RAG | Retrieval-Augmented Generation，结合检索与生成的 AI 架构 |
| 工作流 | Workflow，由节点和边组成的有向无环图 (DAG) |
| 节点 | Node，工作流中的基本执行单元 |
| 边 | Edge，节点间的数据流向连接 |
| Chunk | 文档分片，知识库中的最小检索单元 |

---

*本文档基于 2026-1-Stage2 项目要求生成*
