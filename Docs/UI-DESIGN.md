# LOOM UI 设计方案

> Version 1.0 | 2026-04-07
>
> 参考: Dify v1.0, Coze, Linear 设计风格

---

## 1. 设计理念

### 1.1 核心原则

| 原则 | 描述 |
|------|------|
| **简洁克制** | 减少视觉噪音，功能优先，装饰为辅 |
| **层次分明** | 通过留白和明度差异区分信息层级 |
| **一致性强** | 统一的设计语言，全局一致性 |
| **专业可信** | 冷色调、低饱和度，传达技术产品可信度 |

### 1.2 设计风格定位

- **Dify**: 蓝灰调 → 学术/技术感
- **Coze**: 紫蓝渐变 → 年轻/活力感
- **Linear**: 深色 → 极简/高效感

**本项目定位**: 介于 Dify 和 Linear 之间，冷灰蓝为主色，强调专业与高效。

---

## 2. 色彩系统

### 2.1 主色板 (Primary Palette)

```css
:root {
  /* 主色 - 冷灰蓝 */
  --primary: #4776F6;              /* 主色调 */
  --primary-hover: #3B5FE0;        /* 悬停态 */
  --primary-active: #3254E5;       /* 按下态 */
  --primary-light: #EEF2FF;        /* 浅色背景 */
  --primary-subtle: #F5F7FF;       /* 极浅背景 */

  /* 辅助色 */
  --secondary: #646B7A;            /* 次要文字 */
  --accent: #10B981;               /* 成功/完成状态 */

  /* 节点状态色 */
  --node-trigger: #10B981;        /* 开始节点 - 绿 */
  --node-llm: #6366F1;            /* AI 节点 - 靛蓝 */
  --node-knowledge: #F59E0B;       /* 知识节点 - 琥珀 */
  --node-branch: #EC4899;          /* 条件节点 - 粉红 */
  --node-end: #EF4444;             /* 结束节点 - 红 */
}
```

### 2.2 中性色板 (Neutral Palette)

```css
:root {
  /* 背景层次 */
  --bg-base: #F7F8FA;             /* 页面底层背景 */
  --bg-surface: #FFFFFF;          /* 卡片/面板背景 */
  --bg-elevated: #FFFFFF;         /* 浮层背景 */
  --bg-hover: #F4F5F7;            /* 悬停背景 */
  --bg-active: #E8EAED;           /* 按下背景 */

  /* 文字层次 */
  --text-primary: #1F2328;        /* 主要文字 */
  --text-secondary: #646B7A;      /* 次要文字 */
  --text-muted: #A2A6B1;          /* 辅助文字 */
  --text-disabled: #C3C8D0;        /* 禁用文字 */

  /* 边框层次 */
  --border-default: #E2E5EA;      /* 默认边框 */
  --border-hover: #C3C8D0;        /* 悬停边框 */
  --border-focus: #4776F6;         /* 聚焦边框 */
  --border-subtle: #F0F1F3;       /* 极淡边框 */

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12);
}
```

### 2.3 语义色 (Semantic Colors)

```css
:root {
  /* 状态 */
  --success: #10B981;
  --success-light: #D1FAE5;
  --warning: #F59E0B;
  --warning-light: #FEF3C7;
  --error: #EF4444;
  --error-light: #FEE2E2;
  --info: #3B82F6;
  --info-light: #DBEAFE;

  /* 运行状态 */
  --status-running: #3B82F6;
  --status-success: #10B981;
  --status-failed: #EF4444;
  --status-pending: #A2A6B1;
}
```

---

## 3. 字体系统

### 3.1 字体栈

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* 字号 */
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 20px;
  --text-3xl: 24px;

  /* 行高 */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### 3.2 字号使用规范

| 场景 | 字号 | 字重 |
|------|------|------|
| 页面标题 | 24px | 600 |
| 区块标题 | 16px | 600 |
| 卡片标题 | 14px | 600 |
| 正文 | 14px | 400 |
| 辅助文字 | 12px | 400 |
| 标签/角标 | 11px | 500 |

---

## 4. 间距系统

### 4.1 基础间距单位

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### 4.2 圆角规范

```css
:root {
  --radius-sm: 4px;      /* 小按钮、标签 */
  --radius-md: 8px;      /* 按钮、输入框 */
  --radius-lg: 12px;      /* 卡片、面板 */
  --radius-xl: 16px;      /* 大面板 */
  --radius-full: 9999px;  /* 圆形 */
}
```

---

## 5. 组件规范

### 5.1 按钮 (Button)

```css
/* 主要按钮 */
.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-primary:active {
  background: var(--primary-active);
  transform: scale(0.98);
}

/* 次要按钮 */
.btn-secondary {
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.btn-secondary:hover {
  border-color: var(--border-hover);
  background: var(--bg-hover);
}

/* 图标按钮 */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

### 5.2 输入框 (Input)

```css
.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input:hover {
  border-color: var(--border-hover);
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.input::placeholder {
  color: var(--text-muted);
}

/* 文本域 */
.textarea {
  min-height: 80px;
  resize: vertical;
}
```

### 5.3 卡片 (Card)

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.card:hover {
  box-shadow: var(--shadow-md);
}
```

### 5.4 标签 (Tag)

```css
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
}

.tag-primary {
  background: var(--primary-light);
  color: var(--primary);
}

.tag-success {
  background: var(--success-light);
  color: var(--success);
}

.tag-warning {
  background: var(--warning-light);
  color: var(--warning);
}

.tag-error {
  background: var(--error-light);
  color: var(--error);
}
```

---

## 6. 布局结构

### 6.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  顶部栏 (Header)  height: 56px                               │
│  ┌───────┬───────────────────────────────┬───────────────┐  │
│  │ Logo  │         导航标签               │   状态指示    │  │
│  └───────┴───────────────────────────────┴───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────────────────────────────────────┐  │
│  │ 节点面板 │  │                                         │  │
│  │  固定    │  │           主工作流画布                    │  │
│  │ 左侧     │  │                                         │  │
│  │ 宽度     │  │                                         │  │
│  │ 200px   │  │                                         │  │
│  │         │  ├─────────────────────────────────────────┤  │
│  │         │  │         底部日志面板 (可折叠)              │  │
│  └─────────┘  └─────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 顶部栏设计

```css
.header {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.header-logo svg {
  width: 24px;
  height: 24px;
  color: var(--primary);
}

.header-nav {
  display: flex;
  gap: var(--space-1);
  margin-left: var(--space-8);
}

.header-nav-item {
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.header-nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.header-nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
}

.header-status {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
}
```

### 6.3 左侧节点面板

```css
.node-panel {
  width: 200px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  gap: var(--space-4);
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.panel-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 var(--space-2);
}

.node-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: grab;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.node-item:hover {
  background: var(--bg-surface);
  border-color: var(--border-default);
  transform: translateY(-1px);
}

.node-item:active {
  cursor: grabbing;
  transform: scale(0.98);
}

.node-item-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
}

.node-item-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}
```

### 6.4 画布区域

```css
.canvas-wrapper {
  flex: 1;
  height: 100%;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
}

.canvas-wrapper :deep(.vue-flow) {
  background: var(--bg-base);
}

.canvas-wrapper :deep(.vue-flow__background) {
  background: var(--bg-base);
}

/* 节点样式 */
.canvas-wrapper :deep(.vue-flow__node) {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s, border-color 0.15s;
}

.canvas-wrapper :deep(.vue-flow__node:hover) {
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

.canvas-wrapper :deep(.vue-flow__node.selected) {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

/* 边样式 */
.canvas-wrapper :deep(.vue-flow__edge-path) {
  stroke: var(--border-default);
  stroke-width: 2;
}

.canvas-wrapper :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--primary);
}
```

### 6.5 底部日志面板

```css
.log-panel {
  position: absolute;
  bottom: 0;
  left: 200px;
  right: 0;
  height: 0;
  background: #1a1a1a;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  transition: height 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-panel.expanded {
  height: 280px;
}

.log-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: #222;
  border-bottom: 1px solid #333;
}

.log-panel-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 500;
}

.log-status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.log-status-indicator.running {
  background: var(--status-running);
  animation: pulse 1.5s infinite;
}

.log-status-indicator.success {
  background: var(--status-success);
}

.log-status-indicator.failed {
  background: var(--status-failed);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.log-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid #252525;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.log-item:last-child {
  border-bottom: none;
}

.log-item-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 6px;
}

.log-item-node {
  color: #888;
  font-weight: 500;
  min-width: 80px;
}

.log-item-message {
  color: #ccc;
  flex: 1;
  word-break: break-all;
}

.log-item-time {
  color: #555;
  font-size: var(--text-xs);
}
```

---

## 7. 工作流节点设计

### 7.1 节点类型标识

| 节点类型 | 颜色 | 图标 |
|----------|------|------|
| 开始 (Trigger) | #10B981 | Play |
| AI 节点 (LLM) | #6366F1 | Bot |
| 知识检索 (Knowledge) | #F59E0B | BookOpen |
| 条件分支 (Branch) | #EC4899 | GitBranch |
| 结束 (End) | #EF4444 | Square |

### 7.2 节点样式

```css
.workflow-node {
  padding: var(--space-3) var(--space-4);
  min-width: 160px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
}

.workflow-node-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.workflow-node-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.workflow-node-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.workflow-node-body {
  font-size: var(--text-xs);
  color: var(--text-muted);
  padding-left: 32px;
}

/* 节点状态 */
.workflow-node.status-running {
  border-color: var(--status-running);
  animation: node-pulse 1.5s infinite;
}

.workflow-node.status-success {
  border-color: var(--status-success);
}

.workflow-node.status-failed {
  border-color: var(--status-failed);
}

@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
}
```

---

## 8. 侧边属性面板

### 8.1 面板结构

```css
.properties-panel {
  width: 320px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.properties-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.properties-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.properties-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.properties-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
```

### 8.2 表单控件

```css
.form-group {
  margin-bottom: var(--space-5);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.form-hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: var(--space-1);
}

/* 选择器 */
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: white;
  cursor: pointer;
  transition: border-color 0.15s;
}

.form-select:focus {
  outline: none;
  border-color: var(--primary);
}

/* 滑块 */
.form-slider {
  width: 100%;
  height: 4px;
  background: var(--border-default);
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

.form-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--primary);
  border-radius: 50%;
  cursor: pointer;
}
```

---

## 9. 过渡动画

### 9.1 全局过渡

```css
:root {
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.4s ease;
}

/* 面板滑入 */
.slide-enter-active,
.slide-leave-active {
  transition: transform var(--transition-normal), opacity var(--transition-normal);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 折叠 */
.collapse-enter-active,
.collapse-leave-active {
  transition: height var(--transition-normal);
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  height: 0;
}
```

---

## 10. 实现优先级

### Phase 1: 设计系统基础
1. 重构 `style.css` - 应用新色彩和字体系统
2. 创建基础组件 (Button, Input, Card)
3. 重构 `App.vue` 布局结构

### Phase 2: 工作流画布优化
1. 重新设计节点面板 (左侧固定)
2. 优化节点样式 (图标替换 emoji)
3. 调整属性面板样式

### Phase 3: 细节打磨
1. 优化日志面板
2. 添加过渡动画
3. 统一交互反馈

---

## 11. 参考资料

- [Dify 官方设计系统](https://dify.ai)
- [Coze 设计风格](https://coze.com)
- [Linear UI](https://linear.app)
- [Tailwind CSS 色彩系统](https://tailwindcss.com/docs/customizing-colors)
- [Lucide Icons](https://lucide.dev)

---

*本文档为 LOOM UI 设计方案，如有调整恕不另行通知*
