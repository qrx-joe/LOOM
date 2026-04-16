
# 贡献指南

感谢您对 LOOM 项目的关注！我们欢迎所有形式的贡献。

## 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议，请通过 [GitHub Issues](https://github.com/yourusername/loom/issues) 提交：

1. 搜索现有 issues，避免重复
2. 使用清晰的标题描述问题
3. 提供详细的复现步骤
4. 附上相关的错误日志或截图

### 提交代码

1. Fork 本仓库
2. 创建您的功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循现有的代码风格
- 所有 API 返回使用统一的 DTO 格式
- 关键逻辑需要添加注释说明
- 遵循单一职责原则

### 开发流程

```bash
# 1. 安装依赖
npm run install:all

# 2. 启动开发服务器
npm start

# 3. 运行测试（后端）
cd backend && npm run test

# 4. 代码检查
cd backend && npm run lint
```

## 行为准则

- 尊重所有参与者
- 接受建设性批评
- 关注对社区最有利的事情

## 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。
