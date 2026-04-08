# AI Chat Module - 插件开发指南

本指南介绍如何为 AI Chat 模块开发自定义工具和 UI 渲染器。

## 工具系统架构

工具系统基于插件化的注册表模式：

1. **Tool Registry**: 核心注册表，管理所有工具
2. **Tool Factory**: 工具工厂函数，根据上下文创建工具实例
3. **Tool Context**: 传递给工具的上下文信息（userId, projectId 等）

## 开发自定义工具

### 1. 基础工具

创建一个简单的工具：

```typescript
// src/server/tools/example-tool.ts
import { toolRegistry } from "@/server/api/tools";
import { tool } from "ai";
import { z } from "zod";

toolRegistry.register({
  name: "echo_tool",
  description: "回显工具，返回输入的文本",
  category: "general",
  factory: (context) => ({
    echo: tool({
      description: "回显输入的文本",
      parameters: z.object({
        text: z.string().describe("要回显的文本"),
      }),
      execute: async ({ text }) => {
        return {
          success: true,
          echoed: text,
          userId: context?.userId, // 可以访问上下文
        };
      },
    }),
  }),
});
```

### 2. 访问数据库

在工具中访问数据库：

```typescript
import { db } from "@/server/db";

toolRegistry.register({
  name: "document_tools",
  description: "文档操作工具集",
  category: "document",
  factory: (context) => ({
    list_documents: tool({
      description: "列出项目的所有文档",
      parameters: z.object({}),
      execute: async () => {
        // 使用上下文中的 projectId
        const docs = await db.document.findMany({
          where: {
            projectId: context?.projectId as string,
            userId: context?.userId as string,
          },
          orderBy: { createdAt: "desc" },
        });

        return {
          success: true,
          documents: docs.map(d => ({
            id: d.id,
            title: d.title,
            createdAt: d.createdAt,
          })),
        };
      },
    }),

    create_document: tool({
      description: "创建新文档",
      parameters: z.object({
        title: z.string().describe("文档标题"),
        content: z.string().describe("文档内容（Markdown）"),
      }),
      execute: async ({ title, content }) => {
        const doc = await db.document.create({
          data: {
            title,
            content,
            projectId: context?.projectId as string,
            userId: context?.userId as string,
          },
        });

        return {
          success: true,
          document: {
            id: doc.id,
            title: doc.title,
          },
        };
      },
    }),
  }),
});
```

### 3. 工具集（多个工具）

一个工具注册可以返回多个工具：

```typescript
toolRegistry.register({
  name: "image_tools",
  description: "图片生成和编辑工具集",
  category: "image",
  factory: (context) => ({
    generate_image: tool({
      // 生成图片工具
    }),
    edit_image: tool({
      // 编辑图片工具
    }),
    list_images: tool({
      // 列出图片工具
    }),
  }),
});
```

### 4. 异步操作和队列

对于耗时操作，建议使用队列：

```typescript
import { imageQueue } from "@/server/queues";

toolRegistry.register({
  name: "video_tools",
  description: "视频生成工具（异步）",
  factory: (context) => ({
    generate_video: tool({
      description: "生成视频（异步任务）",
      parameters: z.object({
        prompt: z.string(),
      }),
      execute: async ({ prompt }) => {
        // 添加到队列
        const job = await videoQueue.add("generate", {
          prompt,
          userId: context?.userId,
          projectId: context?.projectId,
        });

        return {
          success: true,
          jobId: job.id,
          status: "processing",
          message: "视频生成已开始，请稍候...",
        };
      },
    }),
  }),
});
```

## 自定义 UI 渲染器

### 1. 基础渲染器

为工具调用结果创建自定义 UI：

```typescript
// src/components/tool-renderers/document-renderer.tsx
import { registerToolRenderer } from "@/modules/ai-chat/components";

registerToolRenderer("list_documents", ({ data }) => {
  const output = data.output as { documents: Array<{ id: string; title: string }> };

  if (data.state !== "output-available") {
    return <div>正在加载文档...</div>;
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold mb-2">文档列表</h3>
      <ul className="space-y-2">
        {output.documents.map((doc) => (
          <li key={doc.id} className="text-sm">
            📄 {doc.title}
          </li>
        ))}
      </ul>
    </div>
  );
});
```

### 2. 处理不同状态

工具调用有多个状态，需要分别处理：

```typescript
registerToolRenderer("generate_image", ({ data }) => {
  switch (data.state) {
    case "input-available":
      return <div>准备生成图片...</div>;

    case "executing":
      return (
        <div className="flex items-center gap-2">
          <Spinner />
          <span>正在生成图片...</span>
        </div>
      );

    case "output-available": {
      const output = data.output as { imageUrl: string };
      return (
        <div className="rounded-lg overflow-hidden">
          <img src={output.imageUrl} alt="Generated" className="w-full" />
        </div>
      );
    }

    case "error":
      return (
        <div className="text-red-500">
          生成失败: {data.error}
        </div>
      );
  }
});
```

### 3. 交互式渲染器

渲染器可以包含交互功能：

```typescript
registerToolRenderer("generate_image", ({ data }) => {
  const [expanded, setExpanded] = useState(false);

  if (data.state !== "output-available") return null;

  const output = data.output as {
    imageUrl: string;
    prompt: string;
    model: string;
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <img
        src={output.imageUrl}
        alt="Generated"
        className="w-full cursor-pointer"
        onClick={() => setExpanded(true)}
      />

      {expanded && (
        <div className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            <strong>Prompt:</strong> {output.prompt}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Model:</strong> {output.model}
          </p>
          <Button onClick={() => setExpanded(false)} size="sm">
            收起
          </Button>
        </div>
      )}
    </div>
  );
});
```

## 工具开发最佳实践

### 1. 参数验证

使用 Zod 进行严格的参数验证：

```typescript
parameters: z.object({
  title: z.string().min(1).max(100).describe("文档标题（1-100字符）"),
  content: z.string().min(10).describe("文档内容（至少10字符）"),
  tags: z.array(z.string()).optional().describe("标签列表（可选）"),
})
```

### 2. 错误处理

工具应该捕获并返回友好的错误信息：

```typescript
execute: async ({ title, content }) => {
  try {
    const doc = await db.document.create({
      data: { title, content, ... },
    });
    return { success: true, document: doc };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建文档失败",
    };
  }
}
```

### 3. 返回结构化数据

工具返回值应该是结构化的，便于渲染器处理：

```typescript
// ✅ 好的返回格式
return {
  success: true,
  document: {
    id: doc.id,
    title: doc.title,
    url: `/documents/${doc.id}`,
  },
};

// ❌ 不好的返回格式
return `文档创建成功: ${doc.title}`;
```

### 4. 上下文使用

合理使用上下文信息，确保数据隔离：

```typescript
factory: (context) => {
  // 在工具创建时验证上下文
  if (!context?.userId) {
    throw new Error("User context required");
  }

  return {
    my_tool: tool({
      execute: async () => {
        // 始终使用 context 中的 userId，而不是参数中的
        const data = await db.data.findMany({
          where: { userId: context.userId },
        });
        return { success: true, data };
      },
    }),
  };
}
```

## 注册工具

在项目启动时注册所有工具：

```typescript
// src/server/tools/index.ts
import "@/server/tools/document-tools";
import "@/server/tools/image-tools";
import "@/server/tools/video-tools";

// 工具会在导入时自动注册到 toolRegistry
```

在 Agent 配置中启用工具：

```typescript
const agent = await db.agent.create({
  data: {
    name: "文档助手",
    instructions: "你是一个专业的文档助手...",
    tools: ["document_tools"], // 启用文档工具
  },
});
```

## 调试技巧

### 1. 查看工具调用日志

在 API route 中会自动记录工具调用：

```
🔧 Tool completed: { toolName: 'create_document', result: { success: true, ... } }
```

### 2. 测试工具

可以直接测试工具工厂：

```typescript
import { toolRegistry } from "@/server/api/tools";

const factory = toolRegistry.get("document_tools");
const tools = factory({
  userId: "test-user",
  projectId: "test-project",
});

const result = await tools.list_documents.execute({});
console.log(result);
```

## 示例：完整的工具开发流程

完整示例请参考项目中的 `src/server/api/tools/document-tools.ts`。

