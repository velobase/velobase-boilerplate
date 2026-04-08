# AI Chat Module - Database

## 数据库集成说明

本模块需要三张核心表：Conversation、Interaction、Agent。

### 集成步骤

1. 打开 `schema.prisma.example` 文件
2. 将其中的模型定义复制到你项目的 `prisma/schema.prisma` 文件中
3. 确保你的 User 模型中添加了关系字段：
   ```prisma
   model User {
     conversations Conversation[]
     agents        Agent[]
   }
   ```
4. 运行数据库迁移：
   ```bash
   pnpm db:generate
   ```

### 表结构说明

#### Conversation（会话）
- 存储用户的聊天会话
- `metadata` 字段可存储业务上下文（如 projectId）
- 支持按用户和时间查询

#### Interaction（交互）
- 采用 Event Sourcing 模式存储所有交互
- `type` 字段标识交互类型（user_message、ai_message 等）
- `parts` 字段存储 Vercel AI SDK 的 UIMessage 格式
- `correlationId` 用于关联相关交互（如文档处理关联到用户消息）

#### Agent（AI 代理）
- 存储 AI 代理的配置（模型、指令、工具）
- 支持用户自定义和系统预设两种模式
- `tools` 数组存储工具名称，由工具注册表动态解析

### 扩展性设计

所有 JSON 字段都支持自由扩展，无需修改表结构即可适配新的业务需求。

