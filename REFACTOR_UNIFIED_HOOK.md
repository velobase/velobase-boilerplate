# 🎯 统一 Hook 重构 - 参考 Vercel AI SDK

## 📋 概述

本次重构将原本分散在 3 个 hooks 中的聊天功能整合为 1 个统一的 `useAgentChat` hook，参考了 Vercel AI SDK 的 `useChat` 设计哲学。

## 🔄 重构前后对比

### 之前（3 个 Hooks）

```tsx
// 需要使用 3 个不同的 hooks
const { messages, isStreaming } = useConversation(conversationId);
const { sendMessage, submitLock } = useAgentActions(conversationId);
const { approve, reject } = useApprovalActions({ conversationId, agentId });

// 需要手动协调多个 hooks
await sendMessage(content, agentId, conversationId, attachments);
await approve(index);
await reject(index, reason);
```

**问题：**
- 用户需要理解 3 个不同的 hooks
- 需要手动传递 `conversationId`、`agentId` 到多个地方
- 状态管理分散，难以维护
- 不符合 Vercel "单一入口" 的设计理念

### 之后（1 个 Hook）✨

```tsx
// ✨ 只需要一个 hook
const chat = useAgentChat({ 
  conversationId, 
  agentId,
  resume: true,
  onError: (error) => console.error(error),
  onFinish: () => console.log('Done'),
});

// 简单直接的 API
await chat.sendMessage(content, attachments);
await chat.approveToolCall(index);
await chat.rejectToolCall(index, reason);

// 访问状态
chat.messages
chat.isLoading
chat.isStreaming
chat.submitLock
```

**优势：**
- ✅ 单一入口点，简单易用
- ✅ 自动处理所有内部协调
- ✅ 更好的类型安全
- ✅ 符合 Vercel AI SDK 的设计模式

## 📁 文件结构

### ✨ 新增文件

```
src/components/agentchat/hooks/
  └── use-agent-chat.ts      # 统一的 Agent Chat Hook (新)
```

### ❌ 已删除文件

以下旧 hooks 已被删除，功能已整合到 `useAgentChat` 中：

```
src/components/agentchat/hooks/
  ├── use-agent-actions.ts      # ❌ 已删除
  ├── use-chat-stream.ts        # ❌ 已删除
  ├── use-conversation.ts       # ❌ 已删除
  └── use-approval-actions.ts   # ❌ 已删除
```

### 🔄 更新文件

```
src/components/agentchat/
  ├── chat-panel.tsx           # 更新为使用 useAgentChat
  └── index.ts                  # 更新导出 useAgentChat
```

## 🎨 API 设计

### useAgentChat Options

```typescript
interface UseAgentChatOptions {
  conversationId: string | null;  // 会话 ID，null 表示新会话
  agentId: string | null;          // Agent ID
  resume?: boolean;                // 是否自动恢复流（默认 true）
  onError?: (error: Error) => void;
  onFinish?: () => void;
}
```

### useAgentChat Return

```typescript
interface UseAgentChatReturn {
  // === 状态 ===
  messages: Message[];           // 消息列表
  isLoading: boolean;            // 是否正在加载历史
  isStreaming: boolean;          // 是否正在流式响应
  error: Error | null;           // 错误状态
  submitLock: boolean;           // 是否正在提交

  // === 操作 ===
  sendMessage: (content: string, attachments?: UploadedFile[]) => Promise<void>;
  approveToolCall: (interruptionIndex: number) => Promise<void>;
  rejectToolCall: (interruptionIndex: number, reason?: string) => Promise<void>;
  createNewConversation: () => void;
  deleteConversation: (conversationId: string) => void;
  stop: () => void;               // 停止当前生成
  reload: () => void;             // 重新加载历史
}
```

## 🔧 内部实现

### 架构设计

```
useAgentChat
  ├─ 1. 历史消息加载 (来自 useConversation)
  │   └─ api.chat.listMessages.useQuery
  │
  ├─ 2. 自动恢复流 (来自 useChatStream)
  │   └─ EventSource → GET /api/chat/[id]/stream
  │
  ├─ 3. 发送消息 (来自 useAgentActions)
  │   ├─ 新会话：创建 + 发送
  │   └─ 现有会话：直接发送
  │   └─ POST /api/chat/send → 读取 SSE 流
  │
  ├─ 4. 工具调用批准/拒绝 (来自 useApprovalActions)
  │   ├─ POST /api/chat/approve
  │   └─ POST /api/chat/reject
  │
  └─ 5. 流管理
      ├─ bufferRef + requestAnimationFrame (批量更新)
      ├─ EventSource (自动恢复)
      ├─ AbortController (取消请求)
      └─ Cleanup (unmount 时清理)
```

### 关键特性

1. **批量更新优化**
   - 使用 `bufferRef` + `requestAnimationFrame` 批量更新 UI
   - 减少不必要的重渲染

2. **自动恢复**
   - 页面刷新时自动通过 EventSource 恢复流
   - 基于 `resumable-stream` 实现

3. **统一错误处理**
   - 集中式的错误捕获和回调
   - 用户友好的错误提示

4. **清理机制**
   - unmount 时自动关闭 EventSource
   - 取消正在进行的请求
   - 清理缓冲区

## 📊 对比 Vercel AI SDK

| 特性 | Vercel useChat | 我们的 useAgentChat |
|------|---------------|-------------------|
| **单一入口** | ✅ | ✅ |
| **自动恢复** | ✅ (resumable-stream) | ✅ (resumable-stream) |
| **流式响应** | ✅ (SSE) | ✅ (SSE) |
| **消息历史** | ✅ | ✅ |
| **工具调用** | ✅ | ✅ (approve/reject) |
| **错误处理** | ✅ | ✅ |
| **停止生成** | ✅ | ✅ |

## 🚀 使用示例

### 基本使用

```tsx
function ChatPanel({ agentId }: { agentId: string }) {
  const searchParams = useSearchParams();
  const conversationId = searchParams?.get("conversationId") ?? null;

  const chat = useAgentChat({
    conversationId,
    agentId,
    resume: true,
  });

  return (
    <div>
      <MessageList messages={chat.messages} />
      <ChatInput
        onSubmit={(text) => chat.sendMessage(text)}
        disabled={chat.submitLock || chat.isStreaming}
      />
    </div>
  );
}
```

### 高级使用（带工具调用）

```tsx
const chat = useAgentChat({
  conversationId,
  agentId,
  resume: true,
  onError: (error) => {
    toast.error(`Error: ${error.message}`);
  },
  onFinish: () => {
    toast.success('Response complete');
  },
});

// 发送消息
await chat.sendMessage('Hello', attachments);

// 批准工具调用
await chat.approveToolCall(0);

// 拒绝工具调用
await chat.rejectToolCall(0, 'Not safe');

// 停止生成
chat.stop();

// 重新加载历史
chat.reload();
```

## ✅ 测试清单

- [ ] 新会话发送消息
- [ ] 现有会话发送消息
- [ ] 带附件发送消息
- [ ] 页面刷新后自动恢复流
- [ ] 工具调用批准
- [ ] 工具调用拒绝
- [ ] 停止生成
- [ ] 错误处理
- [ ] 重新加载历史
- [ ] 创建新会话
- [ ] 删除会话

## 📝 迁移指南

### 从旧代码迁移

**Before:**
```tsx
const { messages, isStreaming } = useConversation(conversationId);
const { sendMessage, submitLock } = useAgentActions(conversationId);
const { approve, reject } = useApprovalActions({ conversationId, agentId });

await sendMessage(content, agentId, conversationId, attachments);
```

**After:**
```tsx
const chat = useAgentChat({ conversationId, agentId });

await chat.sendMessage(content, attachments);
```

## 🎓 设计原则

1. **简单性** - 单一入口，易于理解
2. **一致性** - 与 Vercel AI SDK 保持一致
3. **封装性** - 隐藏内部复杂度
4. **可扩展性** - 易于添加新功能
5. **类型安全** - 完整的 TypeScript 支持

## 🔗 相关文档

- [Vercel AI SDK - useChat](https://sdk.vercel.ai/docs/api-reference/use-chat)
- [Resumable Stream 实现](./src/server/lib/resumable-stream/README.md)
- [Chat API Routes](./src/app/api/chat/README.md)

## 📅 更新日期

2025-01-17

---

**总结：** 这次重构将我们的 hooks 设计从"多个分散的 hooks"简化为"单一统一的 hook"，显著提升了开发体验和代码可维护性，同时与业界最佳实践（Vercel AI SDK）保持一致。

