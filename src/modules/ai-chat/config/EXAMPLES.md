# AI Chat Module - 使用示例

本文档提供了各种使用场景的代码示例。

## 基础示例

### 1. 最简单的聊天页面

```typescript
// src/app/chat/page.tsx
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { ChatPanelNew } from "@/modules/ai-chat/components/chat/chat-panel-new";
import { api } from "@/trpc/server";

export default async function ChatPage() {
  // 检查认证
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 获取默认 Agent
  const agent = await api.agent.getDefault();

  return (
    <div className="h-screen">
      <ChatPanelNew
        agentId={agent.id}
        api="/api/agentchat"
      />
    </div>
  );
}
```

### 2. 带初始问题的聊天页面

```typescript
export default async function ChatPage() {
  const session = await auth();
  const agent = await api.agent.getDefault();

  return (
    <ChatPanelNew
      agentId={agent.id}
      api="/api/agentchat"
      initialQuestions={[
        "你好，我是 AI 助手",
        "有什么可以帮助你的？",
        "让我们开始对话吧！",
      ]}
    />
  );
}
```

### 3. 带自定义上下文的聊天

```typescript
export default async function ProjectChatPage({ 
  params 
}: { 
  params: { projectId: string } 
}) {
  const session = await auth();
  const agent = await api.agent.getDefault();

  return (
    <ChatPanelNew
      agentId={agent.id}
      api="/api/agentchat"
      // 传递业务上下文
      context={{ 
        projectId: params.projectId,
        mode: "project_chat",
      }}
    />
  );
}
```

## 高级示例

### 4. 客户端聊天页面（Agent 切换）

```typescript
"use client";

import { useState } from "react";
import { ChatPanelNew } from "@/modules/ai-chat/components/chat/chat-panel-new";
import { api } from "@/trpc/react";
import { Select } from "@/components/ui/select";

export default function ChatPage() {
  const [agentId, setAgentId] = useState<string>("");
  const { data: agents = [] } = api.agent.list.useQuery();

  return (
    <div className="h-screen flex flex-col">
      {/* Agent Selector */}
      <div className="p-4 border-b">
        <Select value={agentId} onValueChange={setAgentId}>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Chat */}
      <div className="flex-1">
        {agentId && (
          <ChatPanelNew
            agentId={agentId}
            api="/api/agentchat"
          />
        )}
      </div>
    </div>
  );
}
```

### 5. 带会话历史的聊天页面

```typescript
"use client";

import { useState } from "react";
import { ChatPanelNew } from "@/modules/ai-chat/components/chat/chat-panel-new";
import { api } from "@/trpc/react";

export default function ChatWithHistoryPage() {
  const [conversationId, setConversationId] = useState<string>();
  const [agentId, setAgentId] = useState<string>("");

  const { data: conversations = [] } = api.conversation.list.useQuery({
    limit: 20,
  });

  const handleNewChat = () => {
    setConversationId(undefined);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - History */}
      <div className="w-64 border-r overflow-y-auto p-4">
        <button onClick={handleNewChat}>New Chat</button>
        
        <div className="space-y-2 mt-4">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setConversationId(conv.id)}
              className={conversationId === conv.id ? 'active' : ''}
            >
              {conv.title || 'New Conversation'}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        <ChatPanelNew
          key={conversationId ?? 'new'}
          id={conversationId}
          agentId={agentId}
          api="/api/agentchat"
          onNewChat={handleNewChat}
        />
      </div>
    </div>
  );
}
```

### 6. 工具结果回调

```typescript
export default function ChatWithToolsPage() {
  const handleToolResult = (toolName: string, result: unknown) => {
    console.log('Tool executed:', toolName, result);
    
    // 根据工具执行结果做相应处理
    if (toolName === 'create_document') {
      // 刷新文档列表
      refetchDocuments();
    } else if (toolName === 'generate_image') {
      // 刷新图片画廊
      refetchImages();
    }
  };

  return (
    <ChatPanelNew
      agentId={agentId}
      api="/api/agentchat"
      onToolResult={handleToolResult}
    />
  );
}
```

### 7. 多窗格布局（文档 + 聊天）

```typescript
export default function DocumentChatPage({ 
  params 
}: { 
  params: { projectId: string } 
}) {
  const [selectedDocument, setSelectedDocument] = useState<Document>();
  const { data: documents = [] } = api.project.getDocuments.useQuery({
    projectId: params.projectId,
  });

  return (
    <div className="flex h-screen">
      {/* Document Sidebar */}
      <div className="w-80 border-r">
        <DocumentList
          documents={documents}
          onSelect={setSelectedDocument}
        />
      </div>

      {/* Document Viewer */}
      <div className="flex-1 border-r">
        <DocumentViewer document={selectedDocument} />
      </div>

      {/* Chat Panel */}
      <div className="w-96">
        <ChatPanelNew
          agentId={agentId}
          api="/api/agentchat"
          context={{ 
            projectId: params.projectId,
            documentId: selectedDocument?.id,
          }}
        />
      </div>
    </div>
  );
}
```

## 组件 Props 说明

### ChatPanelNew Props

```typescript
interface ChatPanelNewProps {
  // 必需
  agentId: string;                    // Agent ID
  
  // 可选
  id?: string;                        // 会话 ID（用于加载历史）
  initialMessages?: UIMessage[];      // 初始消息
  api?: string;                       // API 路径（默认 /api/agentchat）
  className?: string;                 // 自定义 CSS 类
  
  // 上下文
  context?: Record<string, unknown>;  // 业务上下文（传递给后端）
  
  // 回调
  onToolResult?: (toolName: string, result: unknown) => void;
  onNewChat?: () => void;
  
  // UI
  initialQuestions?: string[];        // 初始快捷问题
  
  // Agent 选择（如果需要在组件内切换）
  agents?: Agent[];
  selectedAgentId?: string;
  onAgentSelect?: (agentId: string) => void;
  isLoadingAgents?: boolean;
}
```

## 常见场景

### 场景 1: 纯聊天应用

使用简单的服务端页面 + ChatPanel，无需额外配置。

```typescript
// src/app/chat/page.tsx
export default async function ChatPage() {
  const agent = await api.agent.getDefault();
  return <ChatPanelNew agentId={agent.id} />;
}
```

### 场景 2: 项目知识库聊天

传递 projectId 作为上下文，工具可以访问项目文档。

```typescript
<ChatPanelNew
  agentId={agent.id}
  context={{ projectId }}
  onToolResult={(name, result) => {
    if (name === 'create_document') {
      refetchDocuments();
    }
  }}
/>
```

### 场景 3: 客服系统

使用会话历史 + Agent 切换。

```typescript
<ChatPanelNew
  id={conversationId}
  agentId={selectedAgentId}
  context={{ 
    customerId,
    ticketId,
  }}
/>
```

### 场景 4: 代码助手

传递代码上下文，使用特定的编程 Agent。

```typescript
<ChatPanelNew
  agentId={codingAgentId}
  context={{ 
    repository,
    currentFile,
    language: 'typescript',
  }}
/>
```

## 样式自定义

### 自定义高度

```typescript
<div className="h-[600px]">
  <ChatPanelNew agentId={agentId} />
</div>
```

### 自定义宽度

```typescript
<div className="max-w-4xl mx-auto">
  <ChatPanelNew agentId={agentId} />
</div>
```

### 自定义主题

使用 TailwindCSS 的 dark 模式：

```typescript
<div className="dark">
  <ChatPanelNew agentId={agentId} />
</div>
```

## 完整示例项目

查看当前项目中的实际使用：

- **基础聊天**: `src/app/chat/page.tsx`
- **高级聊天**: `src/app/chat/advanced/page.tsx`
- **项目聊天**: `src/app/projects/[projectId]/page.tsx`
- **知识库聊天**: `src/components/knowledge-chat/KnowledgeChatLayout.tsx`

## 下一步

- 阅读 [集成指南](./INTEGRATION.md) 了解如何集成到新项目
- 阅读 [插件开发](./PLUGIN_DEV.md) 了解如何开发自定义工具
- 查看源码了解更多细节

