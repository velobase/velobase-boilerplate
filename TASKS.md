# 核心聊天实现任务（无 Guest / 无测试）

目标：主页即聊天，仅支持登录用户，聚焦“会话侧边栏 + 聊天区 + 流式消息保存”。
时间：2 天（高优先级）

—

## A. 路由与页面外壳（P0）
1) 主页即聊天
- “/” 渲染聊天主界面，包含左侧会话栏 + 右侧聊天区
- “/chat” 永久重定向到 “/”（兼容旧链接）

2) 布局
- 左：`ConversationSidebar`（会话列表、新建、重命名、删除）
- 右：`ChatPanelNew`（消息列表 + 输入框）

改动点：
- 新建 `src/app/page.tsx`（SSR 获取默认 userAgentId，渲染 ChatPanelNew）
- `src/app/chat/page.tsx` 改为重定向到 “/” 或删除

—

## B. 会话与消息数据流（P0）
1) 会话生命周期
- 新建会话：前端先调 `api.conversation.create()` 获取 `conversationId`
- URL 同步：`?conversationId=...`（已用 `useConversation` 实现）
- 进入会话：右侧加载 `conversation.get`（包含 UI messages）

2) 消息发送与保存
- 前端：`useChat` → POST `/api/chat`
- 请求体：`{ message, id: conversationId, userAgentId, projectId? }`
- 后端：
  - 从 `userAgentId` 取到 `UserAgent` → 合并模型/指令
  - 调用 LLM 流式返回
  - onFinish 中将新增消息持久化到 `Interaction`（已改为带 `userAgentId`）

现状校对：
- `src/server/api/routers/conversation.ts` 已提供 `create/list/get/updateTitle/delete`
- `src/modules/ai-chat/server/api/route.ts` 已按 `userAgentId` 查询 `UserAgent` 并保存交互
- `src/modules/ai-chat/components/chat/chat-panel-new.tsx` 已发送 `userAgentId`

—

## C. 侧边栏（P0）
新建组件：`src/components/conversation-sidebar.tsx`
- 顶部：Logo + New Chat
- 列表：按更新时间倒序（今日 / 本周 / 更早 可选）
- 操作：
  - 点击项 → 切换 `conversationId`（URL 同步）
  - Rename → 调 `conversation.updateTitle`
  - Delete → 调 `conversation.delete` 并回到空态/新建
- 空态：无会话时提示新建

数据接口：
- `conversation.list({ limit })`
- `conversation.updateTitle({ conversationId, title })`
- `conversation.delete({ conversationId })`

—

## D. ChatPanel 行为（P0）
- 进入时：若 URL 中有 `conversationId` → 通过 `conversation.get` 预加载 messages 并 `setMessages`
- 发送时：若无 `conversationId`，先调 `conversation.create`，拿到 ID 再 `useChat` 发送
- 流程内：保持现有 `useChat` + `DefaultChatTransport`，依赖后端 `/api/chat` 持续保存
- 错误显示：沿用现有 `ErrorMessage` 组件（无需新增逻辑）

—

## E. 默认 Agent（P0）
首次登录（或无安装记录）自动安装系统默认 Agent，并设为默认：
- 位置：NextAuth `signIn` 回调或首次进入首页的 server 端逻辑
- 逻辑：若 `userAgent.count == 0` → 安装 `agent_general_assistant` 并设 `isDefault=true`
- 首页 SSR：读取 `api.userAgent.list()` → 取默认项的 `id` 作为 `userAgentId`

—

## F. 清理与一致性（P0）
- Header 所有“Chat”链接指向 “/”，移除无关入口
- 删除（或重定向）废弃页面：`/agents` 已删，`/chat` 重定向
- `ai-chat` 模块仅保留：UI、hooks、/api/chat 路由与服务；tRPC 路由在 `src/server/api/routers` 统一管理

—

## 交付验收（核心、无测试）
- 打开 “/” 即加载聊天界面
- 左侧展示会话列表，可新建/重命名/删除/切换
- 右侧能发送、流式接收、保存消息
- 刷新后通过 `conversationId` 正确还原会话
- 首次登录自动具备默认 Agent，能立即对话

—

## 任务清单（执行顺序）
1) 新建首页并重定向 `/chat` → `/`
2) 搭建 `ConversationSidebar` 组件与交互
3) ChatPanel：确认先创建会话再发送消息的流程
4) `/api/chat` 校对：`userAgentId` 流程与保存无误
5) 首页 SSR：取默认 `userAgentId` 并渲染
6) 登录回调：无安装时自动安装默认 Agent
7) Header 与冗余页面清理

---

## 已知问题与修正方案（核心聊天）

1) 未登录首页重定向可能导致循环重定向（P0）
- 问题：`src/app/page.tsx` 在无 session 时 `redirect('/?signin=1')`，会再次触发同样逻辑，形成循环。
- 影响：访客永远无法进入页面触发登录 UI。
- 修正思路：
  - 方案A：去掉 SSR 重定向，直接渲染页面，客户端弹出登录 Modal（推荐）。
  - 方案B：改为跳转 NextAuth 官方登录页 `/api/auth/signin?callbackUrl=/`。

2) 默认 Agent 安装的兜底缺失（P0）
- 问题：`page.tsx` 在无 UserAgent 时仅显示“Installing default agent...”，未触发安装；`signIn` 回调只在登录发生时执行。
- 影响：老用户若无 UserAgent，会卡在占位 UI。
- 修正思路：
  - 首页 SSR 增加兜底：检测为空则直接创建 `agent_general_assistant` 的 `UserAgent` 并设为默认；失败时回退到任意 `isSystem=true` 的 Agent。
  - 捕获并忽略唯一键冲突（并发或重复安装）。

3) 默认 Agent 强依赖硬编码 ID（P1）
- 问题：`agent_general_assistant` 必须存在；若种子数据未落库或被禁用，自动安装会失败。
- 修正思路：
  - 安装前优先按 ID 获取；失败时回退到第一条 `isSystem=true AND enabled=true` 的 Agent。

4) 登录回调自动安装的幂等与异常处理（P1）
- 问题：`signIn` 回调每次登录都可能触发查询；并发下可能唯一键冲突。
- 修正思路：
  - 先查 `count`，再 `create`；捕获 `P2002` 唯一键错误后忽略。
  - 记录一次性标记（如 user.metadata.hasDefaultInstalled）可选。

5) 导航一致性（P2）
- 问题：Header 链接已指向 `/`，但仍保留 `/marketplace` 入口，页面未确认是否存在。
- 修正思路：
  - 若暂不提供市场页，隐藏该入口；或保留占位页以免 404。

6) 会话创建路径的单一来源（P2）
- 现状：前端先调 `conversation.create`，后续消息通过 `/api/chat`；路由本身也支持无 ID 自动创建（已关闭访客，不冲突）。
- 建议：保持前端单一路径“先创建再发送”，避免双路径引入边界状态。

7) 安全配置（P2）
- 观察：NextAuth `sessionToken` cookie `secure` 目前为 `false`（即便生产环境）。
- 风险：生产下非 HTTPS 传输风险。
- 修正思路：生产环境设为 `true`，若有反代需求，结合 `trust proxy` 与同站策略调整。

> 以上修正均不需要引入 guest 模式与测试用例，保持“仅登录用户可用”的核心方案。处理顺序建议：1 → 2 → 3/4 → 5/6 → 7。


---

## 游客一条回复后需登录（UI/UX 设计升级）

### 目标
- 游客可发送首条消息并收到一次 AI 回复；之后需登录才能继续。
- 不打断首条体验；二次交互时明确提示登录。

### 动线
1) 访客进入 `/` → 可输入并发送第1条消息。
2) 收到首条 AI 回复后：
   - 输入区显示“登录以继续”的盖层（遮罩 + CTA）。
   - 右上角同步弹出轻提示（Toast）。
3) 游客再次点击输入框或尝试发送 → 弹出登录对话框（或跳转登录页）。
4) 登录完成回到同一会话（保留 `conversationId`），CTA 消失，输入可用。

### 关键 UI 元素
- 输入区盖层（Gate Overlay）
  - 文案：Sign in to continue chatting
  - 说明：Your first reply is free. Sign in to keep going.
  - 按钮：Sign in（主）/ Later（次）
- 轻提示（Toast）
  - 触发：首条回复结束时
  - 行为：点击 Sign in 打开登录
- 顶部登录入口
  - Header 右侧始终有 “Sign in” 按钮（未登录）

### 组件改动（前端）
- ChatPanelNew（仅 UI 设计）
  - 在 `status === "idle" | "done"` 且“游客且已收到>=1条 AI 回复”时，显示输入区盖层；禁用发送。
  - 盖层包含 CTA 与说明；支持 Later 关闭，但下一次点击仍提示登录。
- ConversationSidebar
  - 游客仍可浏览“本会话”但不展示会话列表（或显示空态）。
  - New Chat 按钮允许创建新会话并再次获取首条回复（可配置：默认允许）。

### 文案与状态
- 首条前空态建议：示例问题三条，鼓励开聊。
- 首条后：展示 Toast + 盖层，允许复制已生成内容。
- 错误态：登录失败时 Toast 提示；继续显示盖层。

### 交互细节
- 登录方式：
  - 方案A：弹出登录 Modal（更顺畅）
  - 方案B：跳转 `/api/auth/signin?callbackUrl=/?conversationId=...`（实现简单）
- 返回定位：优先带回当前 `conversationId`，滚动保持在底部。
- 无默认 Agent：登录回调/SSR 兜底自动安装（已在核心方案中覆盖）。

### 可配策略
- 是否允许“新建会话”再次获得1次免费回复（默认允许，可配置为关闭）。
- Toast 展示时长与样式；盖层是否可关闭（关闭后下一次输入仍提示登录）。

### 现状差异与实施提示（非必须立即落地）
- 现状首页未登录会直接跳登录页。若采用本设计：
  - 需允许未登录进入 `/` 并发送首条消息（放宽 SSR 重定向）。
  - 前端记录“已收到首条回复”的状态（会话级/本地存储）。
  - 后端如需强校验，可在第二次请求时返回 401 并附带提示码，前端弹登录。


---

## Phase 6: 游客一条回复后需登录（实现任务，P0｜预计 1 天）

### 6.1 放宽首页认证拦截（允许游客进入）
- 目标：未登录用户可进入“/”，完成首条发送与一次 AI 回复的体验。
- 步骤：
  1) 移除 `src/app/page.tsx` 中的登录重定向逻辑（仅在本 Phase 生效）。
  2) 未登录时渲染 `ChatPanelNew`，以系统默认 Agent（`agent_general_assistant`）运行，传 `agentId`（非 `userAgentId`）。
  3) 顶部 Header 保留“Sign in”入口。
- 验收：未登录访问“/”可看到聊天界面并可发送首条消息。

### 6.2 ChatPanel 输入区盖层（Gate Overlay）
- 目标：收到首条 AI 回复后，显示“登录以继续”的覆盖层，禁用输入。
- 步骤：
  1) 在 `ChatPanelNew` 内部新增本地状态 `hasReceivedFirstReply`（会话级，可用 `useRef`/`useState`）。
  2) 在 `onFinish` 首次收到 assistant 消息时设为 true。
  3) 当 `!session && hasReceivedFirstReply` 时，渲染盖层（文案与 CTA 见 6.4）。
- 验收：游客首次回复后，输入区被遮罩，仍可滚动历史、复制内容。

### 6.3 首条回复完成的 Toast CTA
- 目标：在首条回复完成时给予轻提示，鼓励登录。
- 步骤：
  1) 使用现有 `sonner`/Toast 组件，在 `onFinish` 首次触发时显示。
  2) Toast 内容：
     - Title: Sign in to continue
     - Desc: Your first reply is free. Sign in to keep chatting.
     - Action: Sign in（触发 6.4 登录流程）
- 验收：首条回复后出现 Toast；登录后不再出现。

### 6.4 登录流程与回跳
- 目标：提供无打断的登录入口与完整回跳。
- 步骤（二选一）：
  A) Modal：打开登录弹窗（如既有登录 Modal），登录完成后关闭并刷新当前会话。
  B) 跳转：`/api/auth/signin?callbackUrl=/?conversationId=...`
- 细节：
  - 盖层按钮、Toast 按钮与 Header 的 “Sign in” 指向相同登录流程。
  - 回跳保留 `conversationId`，返回后恢复到会话底部。
- 验收：点击任一登录入口，登录完成回到原会话，可继续输入。

### 6.5 后端二次交互校验（轻后盾，必要时）
- 目标：防止绕开前端限制；第二次交互需登录。
- 步骤：
  1) 在 `/api/chat` 中，当无 session 时允许第一条 user 消息，第二次返回 401/403 并携带 `code: "NEED_LOGIN"`。
  2) 计数实现（任选其一）：
     - Cookie 标记：`fgc_chat_trial=1`（首次回复后设置，二次检测）
     - Conversation metadata：访客会话写入 `trialUsed=true`（需要游客持久化策略）
  3) 前端在收到该错误码后弹出登录。
- 验收：游客第二次尝试发送时被拦截并引导登录。

### 6.6 侧边栏游客态
- 目标：游客仅聚焦当前会话，不展示用户会话列表。
- 步骤：
  1) `ConversationSidebar` 在未登录时显示空态卡片：Sign in to save and sync。
  2) 可选：允许“New Chat”重新获得一次首条体验（与 6.5 配套策略保持一致）。
- 验收：未登录仅见空态与登录 CTA；已登录显示真实会话列表。

### 6.7 配置与文案
- 目标：可控的策略与统一文案。
- 步骤：
  1) 配置开关：`ALLOW_GUEST_FIRST_REPLY=true/false`、`ALLOW_GUEST_NEWCHAT_REPEAT=true/false`。
  2) 文案集中管理：盖层/Toast/空态文案放入常量文件，便于 i18n。
- 验收：可通过环境变量快速调整策略；文案统一、可维护。

### 6.8 验收标准（本 Phase）
- 未登录可获得一次完整首条对话体验。
- 首条后显示盖层与 Toast，引导登录。
- 第二次交互被统一拦截并提示登录（前端或后端兜底至少一处生效）。
- 登录后回到原会话并可继续聊天。
- 侧边栏游客态与登录态展示一致且清晰。

