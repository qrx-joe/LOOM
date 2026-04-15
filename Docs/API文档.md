# LOOM API 文档

## 基础信息

- **基础 URL**: `http://localhost:3001`
- **Content-Type**: `application/json`

---

## 工作流 API

### 1. 获取所有工作流

```http
GET /workflows
```

**响应示例**：
```json
[
  {
    "id": "628c8146-8a00-4d6a-9440-6ff64638c8b9",
    "name": "智能问答工作流",
    "nodes": [
      {
        "id": "start-1",
        "type": "START",
        "label": "开始",
        "position": { "x": 100, "y": 200 },
        "data": {}
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "start-1",
        "target": "ai-1"
      }
    ],
    "createdAt": "2026-04-10T05:00:53.000Z"
  }
]
```

---

### 2. 获取单个工作流

```http
GET /workflows/{id}
```

**参数**：
- `id` (path): 工作流 ID

**响应示例**：
```json
{
  "id": "628c8146-8a00-4d6a-9440-6ff64638c8b9",
  "name": "智能问答工作流",
  "nodes": [...],
  "edges": [...],
  "createdAt": "2026-04-10T05:00:53.000Z"
}
```

---

### 3. 创建工作流

```http
POST /workflows
```

**请求体**：
```json
{
  "name": "我的工作流",
  "nodes": [
    {
      "id": "start-1",
      "type": "START",
      "label": "开始",
      "position": { "x": 100, "y": 200 },
      "data": {}
    },
    {
      "id": "ai-1",
      "type": "AI_AGENT",
      "label": "AI 回答",
      "position": { "x": 300, "y": 200 },
      "data": {
        "nodeType": "AI_AGENT",
        "prompt": "请回答：{{START_INPUT}}",
        "model": "deepseek-ai/DeepSeek-V3",
        "temperature": 0.7
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "start-1",
      "target": "ai-1"
    }
  ]
}
```

**响应示例**：
```json
{
  "id": "xxx",
  "name": "我的工作流",
  "nodes": [...],
  "edges": [...],
  "createdAt": "2026-04-10T05:00:53.000Z"
}
```

---

### 4. 更新工作流

```http
PUT /workflows/{id}
```

**参数**：
- `id` (path): 工作流 ID

**请求体**：同创建工作流

**响应示例**：更新后的工作流对象

---

### 5. 删除工作流

```http
DELETE /workflows/{id}
```

**参数**：
- `id` (path): 工作流 ID

**响应示例**：
```json
{
  "raw": [],
  "affected": 1
}
```

---

### 6. 运行工作流

```http
POST /workflows/{id}/run
```

**参数**：
- `id` (path): 工作流 ID

**请求体**：
```json
{
  "input": "用户输入的问题"
}
```

**响应示例**：
```json
[
  {
    "nodeId": "start-1",
    "status": "COMPLETED",
    "input": {},
    "output": {},
    "startTime": 1234567890,
    "endTime": 1234567891
  },
  {
    "nodeId": "knowledge-1",
    "status": "COMPLETED",
    "input": {},
    "output": {
      "fragments": [
        {
          "id": "xxx",
          "content": "文档片段内容",
          "score": 0.85,
          "documentName": "文档名称"
        }
      ]
    },
    "startTime": 1234567891,
    "endTime": 1234567892
  },
  {
    "nodeId": "ai-1",
    "status": "COMPLETED",
    "input": {},
    "output": {
      "text": "AI生成的回答"
    },
    "startTime": 1234567892,
    "endTime": 1234567895
  }
]
```

---

### 7. 获取工作流执行日志

```http
GET /workflows/{id}/logs
```

**参数**：
- `id` (path): 工作流 ID

**响应示例**：
```json
[
  {
    "id": "xxx",
    "workflowId": "xxx",
    "nodeId": "knowledge-1",
    "status": "COMPLETED",
    "inputData": {},
    "outputData": {
      "fragments": [...]
    },
    "error": null,
    "startedAt": "2026-04-10T06:28:39.000Z",
    "completedAt": "2026-04-10T06:28:42.413Z"
  }
]
```

---

## 知识库 API

### 1. 获取所有知识库

```http
GET /knowledge/bases
```

**响应示例**：
```json
[
  {
    "id": "0734abcf-cd8d-4144-99ab-0e693b81af06",
    "name": "经济学",
    "description": "经济学知识库",
    "documents": [
      {
        "id": "xxx",
        "name": "考研真题.docx",
        "processingStatus": "completed",
        "progress": 100,
        "createdAt": "2026-04-10T03:36:05.000Z"
      }
    ],
    "createdAt": "2026-04-10T03:36:00.000Z"
  }
]
```

---

### 2. 获取单个知识库

```http
GET /knowledge/bases/{id}
```

**参数**：
- `id` (path): 知识库 ID

---

### 3. 创建知识库

```http
POST /knowledge/bases
```

**请求体**：
```json
{
  "name": "产品手册",
  "description": "公司产品文档"
}
```

---

### 4. 更新知识库

```http
PUT /knowledge/bases/{id}
```

**请求体**：
```json
{
  "name": "新产品手册",
  "description": "更新后的描述"
}
```

---

### 5. 删除知识库

```http
DELETE /knowledge/bases/{id}
```

---

### 6. 上传文档

```http
POST /knowledge/bases/{kbId}/upload
Content-Type: multipart/form-data
```

**参数**：
- `kbId` (path): 知识库 ID
- `file` (file): 文档文件（PDF、DOCX、TXT）

**响应示例**：
```json
{
  "id": "xxx",
  "name": "文档名称.pdf",
  "processingStatus": "pending",
  "progress": 0,
  "createdAt": "2026-04-10T03:36:05.000Z"
}
```

---

### 7. 获取文档状态

```http
GET /knowledge/documents/{docId}/status
```

**响应示例**：
```json
{
  "id": "xxx",
  "name": "文档.pdf",
  "processingStatus": "completed",
  "progress": 100,
  "errorMessage": null
}
```

**处理状态说明**：
- `pending`: 等待处理
- `parsing`: 解析文档中
- `chunking`: 文本分片中
- `embedding`: 生成向量中
- `completed`: 处理完成
- `failed`: 处理失败

---

### 8. 搜索知识库

```http
POST /knowledge/search
```

**请求体**：
```json
{
  "kbId": "知识库ID",
  "query": "搜索关键词"
}
```

**响应示例**：
```json
{
  "results": [
    {
      "chunkId": "xxx",
      "content": "匹配的文档内容",
      "score": 0.85,
      "keywordScore": 0.7,
      "vectorScore": 0.9,
      "documentName": "文档名称"
    }
  ],
  "query": "搜索关键词",
  "total": 10
}
```

---

## 聊天 API

### 1. 获取所有会话

```http
GET /chat/sessions
```

**响应示例**：
```json
[
  {
    "id": "xxx",
    "workflowId": "xxx",
    "title": "会话标题",
    "messages": [...],
    "createdAt": "2026-04-10T05:00:53.000Z"
  }
]
```

---

### 2. 创建会话

```http
POST /chat/sessions
```

**请求体**：
```json
{
  "workflowId": "工作流ID"
}
```

---

### 3. 发送消息

```http
POST /chat/sessions/{sessionId}/messages
```

**请求体**：
```json
{
  "content": "用户消息内容"
}
```

**响应示例**：
```json
{
  "id": "xxx",
  "role": "assistant",
  "content": "AI回复内容",
  "sources": [...],
  "createdAt": "2026-04-10T05:00:53.000Z"
}
```

---

## 数据模型

### 工作流节点类型

```typescript
enum NodeType {
  START = 'START',                    // 开始节点
  AI_AGENT = 'AI_AGENT',              // AI 回答节点
  KNOWLEDGE_RETRIEVAL = 'KNOWLEDGE_RETRIEVAL',  // 知识检索节点
  CONDITION = 'CONDITION',            // 条件节点
  END = 'END',                        // 结束节点
}
```

### 节点数据结构

```typescript
interface NodeData {
  id: string;                          // 节点唯一ID
  type: NodeType;                      // 节点类型
  label: string;                       // 显示名称
  position: { x: number; y: number };  // 画布位置
  data: {                              // 节点配置
    // AI 节点
    prompt?: string;
    model?: string;
    temperature?: number;

    // 知识检索节点
    kbId?: string;
    query?: string;

    // 条件节点
    expression?: string;
  };
}
```

### 边数据结构

```typescript
interface EdgeData {
  id: string;          // 边唯一ID
  source: string;      // 源节点ID
  target: string;      // 目标节点ID
  condition?: string;  // 条件（可选）
}
```

---

## 错误处理

### 错误响应格式

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

### 常见错误码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 | 请求参数错误 | 缺少必填字段、格式不正确 |
| 404 | 资源不存在 | ID 错误、已被删除 |
| 500 | 服务器内部错误 | 数据库连接失败、执行异常 |

---

## 调用示例

### 使用 curl

```bash
# 获取工作流列表
curl http://localhost:3001/workflows

# 创建工作流
curl -X POST http://localhost:3001/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试工作流",
    "nodes": [...],
    "edges": [...]
  }'

# 运行工作流
curl -X POST http://localhost:3001/workflows/{id}/run \
  -H "Content-Type: application/json" \
  -d '{"input": "测试输入"}'

# 搜索知识库
curl -X POST http://localhost:3001/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "kbId": "知识库ID",
    "query": "搜索关键词"
  }'
```

### 使用 JavaScript/fetch

```javascript
// 运行工作流
const response = await fetch('http://localhost:3001/workflows/xxx/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input: '用户输入'
  }),
});

const result = await response.json();
console.log(result);
```

---

*文档版本：v1.0*
*最后更新：2026-04-10*
