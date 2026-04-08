# AI Chat Module

一个基于 tRPC + Prisma + Vercel AI SDK 的模块化聊天系统，支持 Agent 配置、工具系统和流式响应。

## 特性

- ✅ **完整的聊天功能**: 消息收发、历史记录、流式响应
- ✅ **Agent 管理**: 支持多 Agent 配置、系统预设和用户自定义
- ✅ **工具系统**: 插件化的工具注册表，支持任意扩展
- ✅ **事件溯源**: Interaction-based 架构，完整记录所有交互
- ✅ **类型安全**: 基于 tRPC 的端到端类型安全
- ✅ **现代化 UI**: React 19 + TailwindCSS，支持推理过程显示

## 技术栈

- **前端**: React 19 + Next.js 15 + TailwindCSS
- **后端**: Next.js API Routes + tRPC v11
- **数据库**: Prisma + PostgreSQL
- **AI SDK**: Vercel AI SDK (@ai-sdk/react)
- **状态管理**: TanStack Query (React Query)

## 快速开始

详见 [集成指南](./config/INTEGRATION.md)

## 目录结构

```
src/modules/ai-chat/
├── database/              # 数据库 Schema 模板
├── server/
│   ├── api/              # 流式聊天 API
│   ├── routers/          # tRPC Routers
│   ├── services/         # 业务逻辑层
│   ├── tools/            # 工具注册表
│   └── lib/              # 工具函数
├── components/           # React 组件
├── types/                # 类型定义
└── config/               # 配置与文档
```

## 核心概念

### Conversation & Interaction

采用 Event Sourcing 模式，所有用户消息和 AI 响应都存储为 Interaction 记录。Conversation 作为会话容器，Interaction 记录所有事件。

### Agent

AI 代理配置，包含模型、指令、工具列表等。支持用户自定义和系统预设两种模式。

### Tool Registry

插件化的工具系统，核心模块只提供注册表和类型定义。具体工具由宿主项目注册。

## 文档

- [集成指南](./config/INTEGRATION.md) - 如何集成到你的项目
- [插件开发](./config/PLUGIN_DEV.md) - 如何开发自定义工具和渲染器
- [数据库说明](./database/README.md) - 数据库表结构说明

## License

MIT

