# LOOM Frontend

LOOM 前端应用 —— 基于 Vue 3 + TypeScript + Vite 构建的可视化 AI 工作流编排界面。

## 技术栈

- **Vue 3.5+** — 响应式前端框架
- **TypeScript 5.7+** — 类型安全
- **Vite** — 快速构建工具
- **Pinia 3** — 状态管理
- **Vue Router 4** — 路由管理
- **@vue-flow/core** — 工作流可视化画布
- **Lucide Vue** — 图标库

## 项目结构

```
frontend/
├── src/
│   ├── components/           # 业务组件
│   │   ├── FlowCanvas.vue         # 工作流编辑器主组件
│   │   ├── FlowCanvas/            # 编辑器子组件
│   │   ├── CustomNodes.vue        # 自定义节点渲染
│   │   ├── WorkflowList.vue       # 工作流列表
│   │   ├── KnowledgeBaseManager.vue
│   │   ├── ChatWidget.vue
│   │   └── ErrorToast.vue
│   ├── router/               # 路由配置
│   ├── store/                # Pinia 状态管理
│   ├── composables/          # 组合式函数
│   ├── types/                # 类型定义
│   ├── utils/                # 工具函数
│   ├── config/               # 配置文件
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

## 可用脚本

```bash
npm run dev         # 启动开发服务器 (http://localhost:5173)
npm run build       # 构建生产版本
npm run preview     # 预览生产构建
npm run lint        # 运行 ESLint 并自动修复
npm run test        # 运行 Vitest 测试
```

## 开发说明

- 所有组件使用 `<script setup>` 语法
- 状态管理统一使用 Pinia，store 文件位于 `src/store/`
- API 基础地址配置在 `src/config/api.ts`
- 工作流节点类型定义在 `src/types/workflow.ts`
