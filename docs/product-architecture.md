# Forge 产品级架构方案

## 目标

Forge 面向长期自用和公司内部使用。它需要支持个人本地运行，也需要在后续接入组织、用户、权限、集中配置和远程执行。第一版可以只实现本地模式，但接口和数据模型不能把未来的团队模式锁死。

OpenCode 作为桌面客户端、会话界面和 Agent 能力的起点。产品级能力通过清晰的模块接口补齐，避免把所有逻辑继续堆进一个桌面窗口。

## 运行模式

### Local Mode

```text
Forge Desktop
├── Local Runtime
├── Local SQLite
├── Local Secret Store
└── User-selected Workspace
```

适合个人使用和早期开发。模型请求直接从本机发送到供应商或企业网关。

### Internal Mode

```text
Forge Desktop
    │ HTTPS / WebSocket
    ▼
Control Plane
    ├── Identity and Organization
    ├── Project and Policy
    ├── Provider Registry
    ├── Run Scheduler
    ├── Audit and Usage
    └── Artifact Metadata
    │
    ├── Execution Worker
    ├── Secret Broker
    └── Object Storage
```

适合公司内部使用。用户身份、项目权限、模型配置和审计记录由控制面管理，代码执行在受控的本地或远程 Worker 中完成。

### Hybrid Mode

代码和工具仍在本地工作区运行，控制面负责用户、策略、模型路由和审计。这是公司内部落地时的优先模式，能保留本地代码访问能力，也能集中管理模型和权限。

## 系统分层

### Desktop Client

负责窗口、导航、会话界面、设置、通知、系统菜单和安全 IPC。它不直接实现 Agent Loop，也不直接操作任意文件。

### Control Plane

负责组织、用户、项目、策略、provider、模型目录、运行记录、审计和用量。Local Mode 可以用本地实现，Internal Mode 切换为远程实现。

### Execution Plane

负责实际运行 Agent Run。它拥有工作区、工具、Shell、Git 和验证命令。每个 Run 使用独立的权限、环境和取消句柄。

### Model Plane

负责供应商适配、模型目录、能力声明、路由、重试、限流、健康状态和成本记录。Agent Orchestrator 只依赖规范化的模型接口。

### Data Plane

负责配置、事件、会话、快照、diff、日志和产物。

Local Mode 的起步实现可以使用 SQLite 和本地文件。Internal Mode 再替换为 PostgreSQL、对象存储和队列。

## 产品级领域对象

```text
Organization
├── User
├── Role
├── Project
│   ├── Workspace
│   ├── PolicySet
│   ├── ProviderBinding
│   └── RuleSet
├── Session
│   ├── SessionModel
│   ├── Messages
│   └── Runs
│       ├── RunSnapshot
│       ├── Approval
│       ├── ToolCall
│       ├── Verification
│       └── Artifact
└── AuditEvent
```

### Organization

权限和用量的隔离单位。Local Mode 可以隐含一个本地 Organization，Internal Mode 使用真实组织。

### Project

策略、provider 绑定、项目规则和工作区的归属单位。用户切换项目时，默认模型和权限策略一起切换。

### Session

持续的工作上下文。Session 自己保存 provider、model、mode、权限配置和上下文策略。

### Run

一次可恢复的执行任务。Run 保存模型、工具版本、权限策略、工作区 commit、提示版本和上下文摘要的快照。

### AuditEvent

记录谁在什么时间对哪个项目发起了什么 Run、批准了什么动作、访问了哪些外部系统，以及结果是什么。

## 关键模块和深接口

### Identity Module

```ts
getCurrentUser(): User
listProjects(): Project[]
checkProjectAccess(projectId, action): AccessDecision
```

Local Mode 使用本地用户。Internal Mode 使用 OIDC、SAML 或企业现有身份系统。客户端不自行判断组织权限。

### Secret Module

```ts
createReference(input): SecretReference
resolveForRun(reference, runContext): EphemeralSecret
revoke(reference): void
```

界面只能看到 provider 名称和 key 的部分掩码。模型请求、日志、错误和事件中禁止出现完整 secret。

### Project Module

```ts
openWorkspace(path): WorkspaceHandle
getProjectState(projectId): ProjectState
loadPolicy(projectId): PolicySet
```

负责工作区信任、Git 状态、项目规则、索引状态和路径范围。

### Session Module

```ts
createSession(projectId, input): Session
updateSessionPreferences(sessionId, patch): Session
appendEvent(sessionId, event): void
resumeSession(sessionId): SessionView
```

负责会话恢复和事件游标。UI 不直接写数据库。

### Run Module

```ts
startRun(sessionId, input): RunHandle
approve(approvalId, decision): void
cancel(runId): void
resume(runId): RunHandle
subscribe(runId, cursor): EventStream
```

负责 Run 状态机、幂等、恢复、取消和事件排序。

### Agent Module

```ts
plan(runContext): Plan
act(runContext, step): AgentAction
observe(runContext, result): Observation
decide(observation): NextAction
```

Agent Module 只产生规范化的动作。实际文件、Shell、Git 和 MCP 操作交给 Tool Runtime。

### Provider Module

```ts
listModels(binding): ModelDescriptor[]
testConnection(binding): ConnectionResult
stream(request): AsyncIterable<ModelEvent>
```

Provider Adapter 隐藏各供应商的协议差异，统一 tool call、reasoning、usage、错误、超时和取消。

### Tool Module

```ts
listTools(runContext): ToolDescriptor[]
prepare(call, runContext): ApprovalRequest | PreparedCall
execute(preparedCall): ToolResult
```

Tool Module 负责文件、搜索、Shell、Git、浏览器和 MCP。执行前必须经过 Policy Module。

### Policy Module

```ts
evaluate(action, context): Allow | Ask | Deny
explain(decision): PolicyExplanation
```

策略至少覆盖路径、命令、网络、凭据、Git 写操作、外部 MCP 和远程执行。

### Verification Module

```ts
discover(project): VerificationPlan
run(plan, workspace): VerificationResult
summarize(result): VerificationSummary
```

测试、lint、类型检查和构建都作为 Artifact 进入 Run 时间线。验证失败可以触发下一轮 Agent Action。

## 可靠性设计

- **事件持久化优先**。先写入 Run Event，再向客户端推送，客户端断线后从 cursor 继续。
- **幂等执行**。Run、Approval 和 Tool Call 都有唯一 ID，重复请求不会重复执行危险动作。
- **租约和心跳**。远程 Worker 失联时，Run 标记为可恢复状态，不直接标记成功。
- **取消传播**。取消从 Desktop 到 Control Plane、Run Manager、Model Request 和子进程逐层传播。
- **重试分类**。网络超时、限流和 provider 暂时错误可以重试。用户拒绝、权限拒绝和代码错误不自动重试。
- **版本化快照**。提示模板、工具描述、权限策略、模型配置和项目 commit 都进入 Run Snapshot。
- **数据修复**。事件日志损坏、缓存缺失和 provider 目录不可用时，系统提供降级和恢复入口。

## 安全设计

- 代码工作区、控制面、模型供应商和 MCP 之间采用最小权限。
- API Key 使用操作系统密钥环或内部 Secret Manager，界面和日志只展示引用。
- Shell 命令通过明确的 Policy Decision 执行，不能由渲染进程直接启动任意进程。
- 远程 Worker 使用临时工作区、临时凭据、网络出口策略和资源限制。
- 所有审批、外部访问、文件修改和配置变更写入 Audit Event。
- Provider 请求默认关闭敏感文件自动上传，用户明确选择后才加入上下文。
- 插件和 MCP 服务器有独立权限清单，安装和启用分开处理。

## 观测和评估

### Runtime Observability

- Run 成功率、取消率、恢复率和平均完成时间
- provider 首 token 延迟、总延迟、错误率、重试次数和限流次数
- Tool 调用次数、失败率、执行时间和审批等待时间
- 每次 Run 的 token、费用和上下文压缩次数
- Worker CPU、内存、磁盘、网络和子进程状态

### Evaluation

- 固定任务集覆盖搜索、编辑、测试修复、重构和代码审查
- 每个 provider 的 tool call、patch quality、测试通过率和成本对比
- 记录模型、提示版本、工具版本和仓库 commit，支持回放
- 通过 golden diff、测试结果和人工评分做回归验证

## 部署演进

### Stage 0

OpenCode fork + Electron + Local Runtime + SQLite。只实现单用户，但从第一天使用 Session、Run、Event、Policy 和 Provider 接口。

### Stage 1

增加本地 Control Plane 接口和统一 Secret Module。桌面应用改为通过接口访问 Local Runtime，便于后续替换远程实现。

### Stage 2

增加 Internal Control Plane、组织和用户、项目权限、集中 provider、审计和用量。

### Stage 3

增加远程 Worker、隔离执行、任务队列、对象存储和 Run 恢复。

### Stage 4

增加评估平台、模型路由、预算控制、策略模板和团队共享 Skills。

## OpenCode Fork 策略

- `packages/desktop` 保持 Electron 壳，增加产品品牌、更新和本地 Runtime 管理。
- `packages/app` 负责产品导航、Session、Run、Provider、Policy、Tools、Context 和 Settings 页面。
- `packages/session-ui` 负责 Run 时间线、审批、diff、验证和产物。
- `packages/server` 作为 Local Runtime，之后可以替换为 Control Plane Client。
- `packages/llm` 作为 Model Gateway，新增 provider adapter 和能力声明。
- `packages/schema` 定义领域对象、事件和版本迁移。
- `packages/opencode` 保留 Agent Loop，只有在 Run 恢复、审批或策略无法通过现有接口承载时才修改。
- 新增 `packages/product-core` 或等价目录，承载产品自己的 Identity、Project、Policy、Audit 和 Feature Flag 逻辑。

## 产品级第一版验收

- 用户可以在不同 Session 中使用不同模型，模型选择不会串会话。
- 一个完整 Run 可以被观察、批准、取消、恢复和审计。
- provider 失败、网络中断和 Worker 失联不会丢失 Session 或 Run 状态。
- 所有文件、Shell、Git 和网络动作都经过统一 Tool 和 Policy 接口。
- 用户可以查看完整的 diff、测试结果、命令输出和失败原因。
- 本地模式可以独立运行，后续可以替换为内部 Control Plane，而无需重写 Agent Module。
- Models、Providers、Tools、MCP、Rules、Runs、Audit、Settings 都有正式入口和空状态。
