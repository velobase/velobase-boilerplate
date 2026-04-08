# AI Chat Module - 集成指南

本指南介绍如何将 AI Chat 模块集成到你的 Next.js + tRPC 项目中。

## 前置条件

确保你的项目已安装以下依赖：

- Next.js 15+
- React 19+
- tRPC v11+
- Prisma
- Vercel AI SDK (@ai-sdk/react, ai)
- TanStack Query (@tanstack/react-query)

## 集成步骤

### 1. 复制模块文件

将整个 `src/modules/ai-chat` 目录复制到你的项目中。

```bash
cp -r src/modules/ai-chat /your-project/src/modules/
```

### 2. 集成数据库

#### 2.1 复制 Schema

打开 `src/modules/ai-chat/database/schema.prisma.example`，将其中的模型定义复制到你项目的 `prisma/schema.prisma` 中。

#### 2.2 添加 User 关系

在你的 User 模型中添加关系字段：

```prisma
model User {
  // ... 你的现有字段
  conversations Conversation[]
  agents        Agent[]
}
```

#### 2.3 运行迁移

```bash
pnpm db:generate
# 或者
pnpm prisma migrate dev --name add_ai_chat_tables
```

### 3. 集成 tRPC Routers

在你的 tRPC AppRouter 中挂载聊天模块的 routers：

```typescript
// src/server/api/root.ts
import { conversationRouter } from "@/modules/ai-chat/server/routers/conversation";
import { agentRouter } from "@/modules/ai-chat/server/routers/agent";

export const appRouter = createTRPCRouter({
  // ... 你的现有 routers
  conversation: conversationRouter,
  agent: agentRouter,
});
```

### 4. 创建聊天 API Route

创建 `src/app/api/chat/route.ts`（或任意路径）：

```typescript
// src/app/api/chat/route.ts
export { POST } from "@/modules/ai-chat/server/api/route";
```

### 5. 使用聊天组件

在你的页面中使用 ChatPanel 组件：

```typescript
// src/app/chat/page.tsx
import { ChatPanelNew } from "@/modules/ai-chat/components";

export default function ChatPage() {
  return (
    <div className="h-screen">
      <ChatPanelNew
        agentId="your-agent-id"
        api="/api/chat"
        // 可选：传递业务上下文
        context={{ projectId: "xxx" }}
      />
    </div>
  );
}
```

### 6. 注册业务工具（可选）

如果你需要自定义工具，在项目启动时注册：

```typescript
// src/server/tools/index.ts
import { toolRegistry } from "@/server/api/tools";
import { tool } from "ai";
import { z } from "zod";

toolRegistry.register({
  name: "document_tools",
  description: "文档操作工具",
  category: "document",
  factory: (context) => ({
    list_documents: tool({
      description: "列出所有文档",
      parameters: z.object({}),
      execute: async () => {
        // 使用 context.projectId 等上下文信息
        const docs = await db.document.findMany({
          where: { projectId: context?.projectId },
        });
        return { documents: docs };
      },
    }),
  }),
});
```

### 7. 配置环境变量

确保你的 `.env` 文件中包含必要的 API Keys：

```env
# OpenRouter API Key (或其他 LLM 提供商)
OPENROUTER_API_KEY=xxx

# 数据库连接
DATABASE_URL=xxx
```

## 高级配置

### 自定义工具渲染器

如果你想自定义工具调用结果的 UI 显示：

```typescript
// src/components/tool-renderers/document-renderer.tsx
import { registerToolRenderer } from "@/modules/ai-chat/components";

registerToolRenderer("list_documents", ({ data }) => {
  return (
    <div>
      <h3>文档列表</h3>
      {/* 自定义 UI */}
    </div>
  );
});
```

### 扩展 Conversation Metadata

通过 metadata 字段传递业务数据：

```typescript
// 创建会话时
const conversation = await api.conversation.create.mutate({
  title: "新会话",
  metadata: {
    projectId: "xxx",
    teamId: "yyy",
  },
});
```

在工具中访问：

```typescript
factory: (context) => {
  const projectId = context?.projectId; // 从 metadata 中读取
  // ...
}
```

## 常见问题

### Q: 如何切换 LLM 模型？

A: 在 Agent 配置中修改 `model` 字段。支持 OpenRouter 的所有模型。

### Q: 如何实现文件上传？

A: ChatPanel 支持文件上传，文件会作为 message parts 发送到后端。你需要实现 `processFileAttachments` 函数来处理文件。

### Q: 如何实现多租户隔离？

A: 通过 Conversation.metadata 存储租户信息，在工具和 API 中根据上下文过滤数据。

## 示例页面

本项目包含了多个示例页面，展示不同的使用场景：

- **基础聊天**: `src/app/chat/page.tsx` - 最简单的聊天页面
- **高级聊天**: `src/app/chat/advanced/page.tsx` - 带 Agent 切换和会话历史
- **项目聊天**: `src/app/projects/[projectId]/page.tsx` - 带业务上下文的完整应用

访问路径：
- 基础聊天: `/chat`
- 高级聊天: `/chat/advanced`
- 项目聊天: `/projects/{projectId}`

## 下一步

- 阅读 [使用示例](./EXAMPLES.md) 查看更多代码示例
- 阅读 [插件开发指南](./PLUGIN_DEV.md) 了解如何开发自定义工具
- 查看源码中的注释了解详细实现
- 参考现有项目的工具实现作为示例

