# Forge Desktop Agent 系统设计

## 1. 产品定位

Forge 是一个本地优先的桌面代码智能体。它把代码仓库、模型、工具、权限、验证和会话统一到一个可恢复的任务系统中。

第一版的核心价值是让用户能够在一个本地工作区内完成以下闭环：

```text
选择工作区
→ 选择会话模型
→ 描述任务
→ 智能体规划
→ 用户批准操作
→ 读取、修改和运行项目
→ 查看 diff 和测试结果
→ 继续修复或回退
```

桌面界面只是这个系统的一个客户端。Agent Runtime、模型接入、工具执行和持久化必须有自己的接口，避免未来加入 CLI、IDE 插件、远程运行器时重写核心逻辑。

## 2. 设计约束

- **本地优先**。项目文件、会话事件、diff 和配置默认保留在用户设备上。
- **会话拥有模型**。模型选择属于 Session，不能只作为全局设置。
- **运行拥有快照**。每次 Agent Run 保存模型、工具策略、工作区和提示配置的有效快照，保证任务可复现。
- **工具有策略**。模型只能通过 Tool Runtime 访问文件和命令，所有动作先经过 Policy Engine。
- **事件可恢复**。会话由事件和产物组成，界面断开或应用重启后可以继续观察和恢复。
- **供应商可替换**。Agent Loop 依赖规范化的 Model Provider 接口，不依赖具体供应商 SDK。
- **功能可延迟实现**。所有未来能力先拥有明确的入口、数据结构和空状态，实施可以按优先级推进。

## 3. 核心对象模型

```text
Workspace
└── Project
    ├── Rules
    ├── Context Sources
    └── Worktrees / Locations
        └── Worktree
            ├── branch
            ├── directory
            └── Sessions
                └── Session
                    ├── sessionModel
                    ├── mode
                    ├── permissionProfile
                    ├── Runs
                    │   └── RunSnapshot
                    └── Artifacts
```

### Workspace

表示本地可访问的工作区。它包含根路径、信任状态、索引状态、默认规则和允许的工具范围。

### Project

表示工作区中的一个代码项目。它保存项目识别信息、Git 状态、语言统计和项目级规则。

### Session

表示用户与智能体的一段持续对话。Session 必须保存：

```ts
type Session = {
  id: string
  projectId: string
  title: string
  modelRef: { providerId: string; modelId: string }
  mode: "plan" | "build" | "review"
  permissionProfileId: string
  contextPolicyId: string
  createdAt: string
  updatedAt: string
}
```

切换 Session 时，模型、模式、权限和上下文策略一起切换。模型选择器只修改当前 Session。

### Run

表示 Session 中的一次可执行任务。Run 是状态机，不等同于一条消息。

```text
queued → planning → waiting_for_approval → executing
       → verifying → completed
       → failed | cancelled | paused
```

Run 保存不可变的 `RunSnapshot`，包括模型、provider endpoint、权限策略、工具版本、工作区 commit 和上下文摘要。

### Event

表示 Run 的可观察变化。第一版至少支持：

```text
run.started
plan.created
assistant.text.delta
tool.requested
approval.requested
approval.resolved
tool.started
tool.output
file.changed
verification.started
verification.finished
run.completed
run.failed
```

### Artifact

表示运行产生的可查看结果，包括 diff、命令输出、测试报告、日志、截图和最终总结。

## 4. 运行时结构

```text
┌──────────────────────────────────────────────────────────┐
│ Electron Desktop Shell                                   │
│  Window · Menu · Tray · Update · Secure IPC              │
└───────────────────────┬──────────────────────────────────┘
                        │ local IPC / HTTP event stream
┌───────────────────────▼──────────────────────────────────┐
│ Local Runtime                                             │
│  Session Manager · Run Manager · Event Store              │
│  Workspace Manager · Policy Engine · Artifact Store        │
└───────────────┬───────────────────────┬──────────────────┘
                │                       │
┌───────────────▼──────────────┐ ┌──────▼─────────────────┐
│ Agent Orchestrator            │ │ Tool Runtime            │
│ plan · act · observe · retry  │ │ files · shell · git     │
│ compact · cancel · resume     │ │ search · browser · MCP  │
└───────────────┬──────────────┘ └──────────┬───────────────┘
                │                           │
┌───────────────▼──────────────┐ ┌──────────▼──────────────┐
│ Model Gateway                 │ │ Verification Pipeline    │
│ normalized request/events     │ │ test · lint · typecheck  │
│ provider adapters             │ │ build · review           │
└───────────────┬──────────────┘ └─────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ OpenAI · Anthropic · Google · OpenRouter · Ollama · Custom │
└───────────────────────────────────────────────────────────┘
```

## 5. 深模块和接口边界

### Session Manager

**Interface**

```ts
create(input): Session
get(id): Session
list(projectId): Session[]
updatePreferences(id, patch): Session
appendEvent(id, event): void
streamEvents(id, cursor): AsyncIterable<Event>
```

它隐藏数据库、事件游标、会话标题生成和恢复逻辑。UI 只需要知道 Session 和 Event。

### Agent Orchestrator

**Interface**

```ts
start(input: RunInput): RunHandle
resume(runId): RunHandle
cancel(runId): void
approve(requestId, decision): void
```

它负责规划、工具调用、观察、重试、上下文压缩和停止条件。它不直接读写文件，也不直接持有 provider SDK。

### Model Gateway

**Interface**

```ts
listModels(providerRef): ModelDescriptor[]
validate(providerRef): ConnectionResult
stream(request): AsyncIterable<ModelEvent>
cancel(requestId): void
```

Adapters 负责把 OpenAI Responses、OpenAI Chat Completions、Anthropic Messages、Gemini、Ollama 和自定义端点转换成统一的 Model Event。

### Tool Runtime

**Interface**

```ts
describe(): ToolDescriptor[]
execute(call, executionContext): ToolResult
cancel(callId): void
```

Tool Runtime 不自行决定是否允许执行。它接收 Policy Engine 已经批准的执行上下文。

### Policy Engine

**Interface**

```ts
evaluate(action, context): "allow" | "ask" | "deny"
resolve(requestId, decision): void
explain(action): PolicyExplanation
```

第一版策略范围：工作区读写、Shell、网络请求、Git 写操作、外部 MCP。策略结果必须能在 UI 中解释。

### Context Manager

**Interface**

```ts
collect(request): ContextBundle
estimate(bundle): TokenEstimate
compact(sessionId): ContextBundle
pin(source): void
```

它负责项目规则、代码搜索、Git diff、用户选中的文件和历史摘要。Agent Loop 不直接拼接上下文。

## 6. UI 信息架构

```text
Application Shell
├── Workspace switcher
├── Sessions
│   ├── Session timeline
│   ├── Plan / Build / Review mode
│   ├── Session model
│   ├── Context inspector
│   ├── Changes and artifacts
│   └── Approval queue
├── Runs
│   ├── Active runs
│   ├── History
│   └── Run details
├── Models & Providers
│   ├── Provider catalog
│   ├── Credentials
│   ├── Model capabilities
│   └── Connection tests
├── Tools & MCP
│   ├── Built-in tools
│   ├── MCP servers
│   ├── Plugin packages
│   └── Tool permissions
├── Context & Rules
│   ├── Project rules
│   ├── Skills
│   ├── Pinned files
│   └── Index status
└── Settings
    ├── Appearance
    ├── Runtime
    ├── Security
    ├── Storage
    ├── Logs
    └── Updates
```

所有入口都要有真实的空状态。空状态需要说明数据来源、下一步操作和当前未实现部分，避免用一页聊天界面承载所有能力。

## 7. 会话模型设计

每个 Session 独立保存：

```text
Session A → OpenAI-compatible / coder-large
Session B → Anthropic / coding-pro
Session C → Ollama / qwen3-coder
```

模型选择器显示在当前 Session 头部。侧边栏显示会话的 provider/model 副标题。Provider 设置在应用级页面完成，Session 只选择已配置的模型。

第一版不做每条消息单独覆盖模型。后续可以加入 `message.modelOverride`，但它必须明确展示在消息旁边，并写入 Run Snapshot。

## 8. 第一版范围和占位

### 具体实现

- Electron 桌面壳
- Workspace 选择
- Session 创建、恢复和删除
- Session 级模型选择
- OpenAI-compatible provider
- Anthropic provider
- Ollama 或 LM Studio provider
- Plan / Build 两种模式
- 文件读取、搜索、编辑、Shell、Git diff
- 审批、取消、重试
- 流式事件时间线
- Diff、命令输出、测试结果
- 本地会话和配置存储

### 设计占位

- Review 模式
- Runs 页面
- MCP 管理
- Plugin 管理
- Skills 和项目规则
- Context Indexer
- Memory
- 多模型路由
- 自动验证策略
- 云端同步
- 账号和团队空间
- 更新通道和崩溃诊断

占位功能必须拥有导航项、数据结构、空状态和扩展接口。功能未实现时不显示假数据，不把占位按钮伪装成已完成能力。

## 9. 从 OpenCode fork 的映射

```text
packages/desktop     → Electron Desktop Shell
packages/app         → Application Shell 和 Session UI
packages/session-ui  → Timeline、Plan、Tool、Approval、Artifact
packages/ui          → 设计系统和共享组件
packages/server      → Local Runtime、Session Manager、Run Manager
packages/opencode    → Agent Orchestrator、Tools、Policies
packages/llm         → Model Gateway 和 Provider Adapters
packages/schema      → Domain Objects、Events、Config Schemas
packages/plugin      → Provider、Tool、MCP、Skill 扩展
```

第一批改动集中在 `packages/desktop`、`packages/app`、`packages/session-ui`、`packages/server`、`packages/llm` 和 `packages/schema`。`packages/opencode` 只有在确认现有 Agent Loop 无法承载 Run 状态、审批或恢复时才修改。

## 10. 设计验证标准

- 用户能看出当前处于哪个 Workspace、Session、Run 和 Mode。
- 用户能看出当前 Session 使用哪个 provider 和 model。
- 用户能看到智能体下一步要做什么，并能在工具执行前决定是否批准。
- 用户能从同一条时间线查看计划、工具、diff、测试和失败原因。
- 应用重启后能恢复 Session 和未完成 Run 的状态。
- 任意 provider 失败不会破坏 Agent Loop 和 Session 数据。
- 未实现能力有明确占位，不产生虚假成功状态。

