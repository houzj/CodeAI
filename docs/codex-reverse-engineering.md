# Codex Windows 桌面应用逆向分析

## 范围

目标是分析 Codex Windows 桌面应用的 Electron 结构、主进程与 preload、项目和会话状态、Composer、审批、变更、产物以及 Codex Runtime 边界，为 CodeAI 的产品层和 Runtime Adapter 提供证据。

分析对象来自本机 Codex MSIX 更新包：

```text
C:\Users\Administrator\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\windows-updates\prepared.msix
```

提取分析目录：`E:\CodeAI\.cache\codex-rea`。

## 已确认事实

### Electron 包结构

MSIX 的 `app` 目录包含：

```text
Codex.exe
ChatGPT.exe
resources/app.asar
resources/app.asar.unpacked/
resources/codex.exe
resources/codex-code-mode-host.exe
resources/codex-command-runner.exe
resources/codex-windows-sandbox-service.exe
resources/codex-windows-sandbox-setup.exe
```

`app.asar/package.json` 声明：

```text
productName: Codex
version: 26.1106.51428
main: .vite/build/early-bootstrap.js
codexWindowsPackageIdentity: OpenAI.Codex
codexWindowsPackagePublisher: CN=50BDFD77-8903-4850-9FFE-6E8522F64D5B
codexWindowsAppContainedCore: 1
```

### 入口文件

```text
.vite/build/early-bootstrap.js
.vite/build/preload.js
.vite/build/browser-page-preload.js
.vite/build/sandbox-preload.js
.vite/build/experian-verification-preload.js
webview/index.html
```

### 领域和状态线索

入口 bundle 中观察到以下状态和领域名：

```text
PROJECT_APPEARANCES
SIDEBAR_PROJECT_THREAD_ORDERS
WORKTREE_DEFAULT_CREATION_PREFERENCE
WORKTREE_REPOSITORY_PREFERENCES
WORKTREE_UPSTREAM_REFRESH_MODE
WORKTREE_CONFIRM_BEFORE_DELETE
WORKTREE_AUTO_CLEANUP_ENABLED
WORKTREE_KEEP_COUNT
composerEnterBehavior
projectlessThreadIds
activeSession
worktreeRoot
```

这些静态名称表明 Codex 把项目、Worktree、Session、无项目会话、Composer 和 Worktree 生命周期作为独立状态管理。

### 审批和产物线索

```text
exec_approval_request
apply_patch_approval_request
guardian_approval
ARTIFACT_ANNOTATION
ARTIFACT_COMMENT
fileChange
changes
```

这些对象与 CodeAI 计划中的 Run、Approval、ChangeSet 和 Artifact 对应。

### 模型和 Composer 线索

静态入口中观察到：

```text
defaultModel
modelProvider
modelProviders
modelPreferences
providerModelFallback
supportedReasoningEfforts
enabledReasoningEfforts
defaultReasoningEffort
reasoningEffort
reasoningEffortUpdates
showUltraInModelPickerSlider
composerEnterBehavior
composerPlainTextMode
composer.togglePlanMode
```

这些名称支持以下实现判断：模型选择至少包含 Provider、Model 和 Reasoning Effort 三层状态，Reasoning Effort 有能力列表、默认值和运行时更新事件，Composer 还保存 Enter 行为、纯文本模式和 Plan 模式。

### Runtime 和任务事件线索

入口中还观察到：

```text
runtime
runtimes
runtimeWorkspaceRoots
model_prompt_sha256
model_context_window
model_reasoning_effort
model_reasoning_summary
agent_reasoning_delta
agent_reasoning_section_break
sessionConfigured
sessionCompleted
sessionEnded
sessionUpdated
startSession
finishSessionSegment
finishHandoffSessionSegment
thread-queued-followups-changed
thread-stream-state-changed
thread-stream-following-changed
```

CodeAI 的 `Session` 应保存 Runtime 引用和 Workspace Root。`Run` 或执行段应保存模型快照、上下文窗口、推理强度和提示哈希，确保会话恢复后可以解释当时使用的模型配置。

### Runtime 事件注册表

在 `early-bootstrap.js` 的 App Server 兼容层中发现了显式事件注册表。它不是 UI 文案，而是客户端认可的 Runtime 通知类型，覆盖范围比日志摘要更完整：

```text
thread/started
thread/readState/changed
thread/section/changed
thread/name/updated
thread/attachment/updated
thread/queue/changed
thread/environment/connected
thread/environment/disconnected
thread/settings/updated
thread/tokenUsage/updated
turn/started
turn/completed
turn/diff/updated
turn/plan/updated
item/started
item/completed
item/agentMessage/delta
item/plan/delta
item/commandExecution/outputDelta
item/commandExecution/terminalInteraction
item/fileChange/outputDelta
item/fileChange/patchUpdated
item/mcpToolCall/progress
item/reasoning/summaryTextDelta
item/reasoning/summaryPartAdded
item/reasoning/textDelta
item/autoApprovalReview/started
item/autoApprovalReview/completed
autoApprovalReview/strictReviewRequired
serverRequest/resolved
project/changed
fs/changed
mcpServer/startupStatus/updated
mcpServer/event/stream/notification
model/rerouted
model/verification
windowsSandbox/setupCompleted
```

同一注册表还保留了旧版兼容事件名：

```text
codex/event/session_configured
codex/event/task_started
codex/event/agent_reasoning
codex/event/agent_message
codex/event/task_complete
codex/event/mcp_tool_call_begin
codex/event/mcp_tool_call_end
codex/event/exec_command_begin
codex/event/exec_command_end
codex/event/exec_command_output_delta
codex/event/exec_approval_request
codex/event/apply_patch_approval_request
codex/event/turn_diff
codex/event/agent_reasoning_delta
codex/event/agent_reasoning_section_break
codex/event/agent_message_delta
codex/event/stream_error
codex/event/turn_aborted
codex/event/plan_delta
codex/event/plan_update
codex/event/patch_apply_begin
codex/event/patch_apply_end
codex/event/item_started
codex/event/item_completed
```

这确认了 Codex 的“对话”底层实际上是 `Thread → Turn → Item` 三级事件模型：Turn 负责一次执行段，Item 负责消息、命令、文件变更、MCP 工具和推理片段。审批、差异、计划和沙箱状态都是独立事件，不应被编码成聊天气泡。CodeAI 的事件投影应以这三级模型为基础，同时在 Adapter 层兼容 OpenCode 当前的事件命名。

### Thread 控制面方法

同一兼容层声明了 Thread/Turn 控制方法集合：

```text
thread/start
thread/read
thread/resume
thread/stop
thread/archive
thread/unarchive
thread/name/set
thread/settings/update
thread/items/list
thread/inject_items
thread/queue/add
thread/queue/list
thread/queue/update
thread/queue/delete
thread/queue/reorder
turn/start
turn/steer
turn/interrupt
turn/addUserMessage
```

这组方法说明“正在运行的会话里继续输入”不是重新创建聊天，而是通过 queue、steer 或 interrupt 改变当前 Thread 的执行状态。CodeAI Composer 需要根据 Run 状态选择新 Turn、steer、排队或中断，而不是始终追加普通消息。

### Runtime 二进制字段线索

对随 MSIX 分发的 `resources/codex.exe` 和本机 Runtime `codex.exe` 做字符串交叉校验，两个版本都包含同一组事件和领域字段。当前能确认字段名存在，但不能仅凭字符串恢复完整结构：

```text
threadId
turnId
itemId
requestId
command
cwd
processId
exitCode
aggregatedOutput
filePath
patch
changes
permissionProfile
approvalPolicy
sandboxPolicy
modelProvider
reasoningEffort
functionCallOutput
commandExecution
tool_call_started
tool_call_completed
contextCompaction
enteredReviewMode
shortDescription
structuredContent
```

这组字段与事件注册表可以形成 CodeAI 的最小事件载荷方向：命令 Item 至少需要命令、工作目录、进程和退出结果；文件变更 Item 至少需要文件路径、补丁或变更摘要；审批事件需要权限配置和沙箱策略快照；模型事件需要 Provider、模型和推理强度；工具结果需要结构化输出。精确的可选字段、枚举和嵌套结构仍需通过可控请求的 JSON-RPC 通信或官方协议源确认，不能把字符串扫描当成完整 schema。

### 官方协议交叉验证

OpenAI 的公开 App Server 文档与本机逆向结果一致：客户端通过 stdin/stdout 发送 newline-delimited JSON，先 `initialize`，再 `thread/start` 和 `turn/start`；客户端显示 `item/agentMessage/delta`，并以 `turn/completed` 的状态判断成功、失败或中断。`model/list` 可用于填充模型选择器，但返回的是目录，不等于用户一定有权限调用该模型。官方事件文档进一步明确了增量事件的关联键：每个事件有 `event_id`，同一持久化 Item 通过 `item_id` 关联，文本增量使用 `output_index`、`content_index` 和 `delta`，完成事件携带完整 `text`；`requires_action` 则要求应用读取 `required_actions` 并完成外部动作。官方文档还明确说明 App Server 负责保持会话、流式事件、工具调用、沙箱和审批，而应用负责连接、生命周期和用户体验。

- [Codex app-server – Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [Codex as a platform: build on the open agent harness](https://developers.openai.com/blog/codex-as-a-platform)
- [Automatic review and approvals](https://developers.openai.com/api/docs/guides/agents-api/sessions/approvals)
- [Events and items](https://developers.openai.com/api/docs/guides/agents-api/sessions/events)

官方资料列出的审批范围包括 Shell/终端输入、文件变更、额外文件系统或网络权限以及 MCP 工具调用；这与本机入口中的 `exec_approval_request`、`apply_patch_approval_request` 和 `serverRequest/resolved` 相互印证。官方资料没有公开 Windows 桌面端的全部私有 payload，因此 CodeAI 仍需以本机事件采集和 OpenCode 的公开协议作为实现依据。

### REA 入口图分析结果

对提取出的 `.vite/build/early-bootstrap.js` 做了单文件 REA 语义分析，避免再次扫描整个 772 MB 的 `app.asar`：

```text
evidence: ev_dfd502c05f744dcf3735656e01a46c07667fe25f50f78156ff78fe36284f0399
artifact: E:\CodeAI\.cache\codex-rea\entry-src
parsed JavaScript files: 1
visited AST nodes: 130,372
findings: 710
modules: 347
parse failures: 0
```

分析确认入口中存在事件注册、子进程创建、配置读取、请求构造、资源生命周期和 CommonJS/ESM 绑定候选。由于入口是压缩 bundle，动态属性、调用目标和未选中的 4 个 preload 文件仍被标记为 unknown；这属于分析覆盖边界，不能解释为“没有 IPC 或没有窗口”。本报告的 IPC 结论因此继续以直接字符串证据、preload 提取和运行日志三者交叉验证为准。

## 运行日志证据

Codex 本地日志位于：

```text
C:\Users\Administrator\AppData\Local\Codex\Logs\2026\11\13
```

日志显示 App Server 通过本地 `stdio` transport 与桌面端连接。观察到的请求方法包括：

```text
config/read
configRequirements/read
model/list
thread/list
thread/queue/list
thread/turns/list
thread/readState/update
thread/attachment/list
turn/start
turn/steer
permissionProfile/list
fs/getMetadata
fs/readDirectory
fs/unwatch
hooks/list
app/installed
app/read
mcpServerStatus/list
```

日志中还出现了这些运行时事实：

```text
derivedApprovalPolicy=on-request
derivedActivePermissionProfile=:workspace
derivedSandboxPolicy={type: workspaceWrite, networkAccess: false}
requestRuntimeWorkspaceRootCount=0
```

这证明 Codex 的桌面层通过 App Server API 管理 Thread 和 Turn，文件系统访问通过 `fs/*` 方法，模型目录通过 `model/list` 获取，权限配置通过 `permissionProfile/list` 获取。Composer 发送任务时产生 `turn/start`，后续输入通过 `turn/steer` 进入已有执行流。

Git 运行日志显示桌面端启动 Git repository watcher，并对 Worktree 执行 `git status`、`git rev-parse`、`git config --worktree` 和忽略目录扫描。Codex 的 Worktree 路径形态包括：

```text
C:\Users\Administrator\.codex\worktrees\<worktree-name>\<project>
```

这为 CodeAI 的 Git Runtime Adapter 提供了运行时证据。Worktree 管理需要同时维护路径、Git 元数据、忽略目录状态和会话归属。

### 一次实际 Turn 的事件顺序

当前 Codex 日志记录了一条可验证的执行链：

```text
host-app-server-manager: turn-start config resolved
AppServerConnection: turn/start
AppServerConnection: fs/getMetadata
AppServerConnection: fs/readDirectory
AppServerConnection: hooks/list
AppServerConnection: permissionProfile/list
AppServerConnection: config/read
AppServerConnection: thread/turns/list
AppServerConnection: thread/queue/list
AppServerConnection: thread/readState/update
AppServerConnection: turn/steer
AppServerConnection: fs/unwatch
AppServerConnection: app-server transport stop
```

日志还记录了 `model/list`、`mcpServerStatus/list`、`app/installed` 和 `app/read`。这说明一次 Turn 不是单个模型请求，而是由 Thread 状态、文件索引、Hook、权限、配置和工具服务共同驱动的执行过程。

Codex 当前日志中的执行配置是：

```text
approvalPolicy: on-request
permissionProfile: :workspace
sandbox: workspaceWrite
networkAccess: false
```

### CodeAI 的执行状态机

基于这些运行证据，CodeAI 的第一版执行状态可以定义为：

```text
SessionReady
  → TurnStarted
  → WorkspaceScanned
  → PermissionsResolved
  → ModelResolved
  → ToolExecution
  → ApprovalRequired
  → ChangesProjected
  → TurnCompleted
```

每个状态都应由运行事件驱动，文件扫描、审批、模型解析和变更投影都不能隐藏在聊天消息渲染逻辑中。

### IPC 线索

```text
codex_desktop:connect-app-host
codex_desktop:connect-git-worker
codex_desktop:git-worker-port
codex_desktop:get-initial-sidebar-bootstrap
codex_desktop:get-build-flavor
codex_desktop:get-system-theme-variant
codex_desktop:system-theme-variant-updated
codex_desktop:show-context-menu
codex_desktop:start-file-drag
codex_desktop:start-link-drag
codex_desktop:message-for-view
codex_desktop:message-from-view
codex_desktop:chunked-message-ack
```

这说明桌面主进程、App Host、Git Worker、渲染页面和浏览器/WebView 之间存在明确的 IPC 边界。

入口 preload 的进一步静态扫描补充了这些边界：

```text
codex_desktop:get-sentry-init-options
codex_desktop:take-initial-switch-status
codex_desktop:get-fast-mode-rollout-metrics
codex_desktop:trigger-sentry-test
codex_desktop:worker
codex_desktop:browser-sidebar-runtime-message
codex_desktop:browser-page-event
codex_desktop:get-browser-webmcp-policy
codex_desktop:get-browser-annotation-api-policy
codex_desktop:mcp-app-sandbox-guest-message
codex_desktop:mcp-app-sandbox-host-message
codex_desktop:remote-hosted-pip-video-frame
```

`early-bootstrap.js` 和 `preload.js` 都声明了 Git Worker 与 App Host 的连接入口；`browser-page-preload.js` 单独声明了浏览器侧边栏、页面事件和 WebMCP 策略入口；`sandbox-preload.js` 声明了 MCP App 沙箱 guest/host 消息入口。CodeAI 的桌面壳应把这些通道分成 `agent-host`、`git-worker`、`browser-surface` 和 `mcp-sandbox` 四组，避免在 Renderer 里混用 Electron IPC。

### App Server 响应信封

桌面日志中的 `AppServerConnection` 响应记录都带有统一路由字段：

```text
method
requestId=<method>:<uuid>
conversationId=<thread id or null>
durationMs
queueWaitMs
errorCode
hadPending
hadInternalHandler
originWebcontentsId
broadcastFallback
targetDestroyed
```

其中 `conversationId` 只在 Thread 相关请求或 `turn/steer` 等会话操作中出现，模型目录、配置、权限、Hook 和 MCP 状态查询通常是全局请求。`errorCode=-32603` 会出现在单个 `fs/getMetadata` 失败项上，但同一批目录扫描仍可继续，说明文件树读取采用逐项容错而不是整批失败。CodeAI 的 Protocol 层应保留 `requestId`、`sessionId`、排队耗时、执行耗时和可恢复错误字段，UI 再将它们投影成 Run/Tool Event 状态。

### Runtime 分发和进程边界

桌面日志还记录了 Runtime 安装配置：运行时以独立 bundle 发布，包含 Windows x64、Windows ARM64、macOS 和 Linux 平台包，并通过 `codex-primary-runtime` 目录名和 digest 选择版本。桌面进程同时维护本地 App Server、`codex-code-mode-host`、命令执行器和 Windows sandbox service。由此可确认：Electron 桌面壳不是 Agent Runtime 本身，而是 Runtime 的版本选择、进程编排、权限确认和 UI 投影层。

CodeAI 第一版应采用同样的边界：

```text
Electron Main
  ├─ AgentRuntimeAdapter  → OpenCode Server / Session Runner
  ├─ GitRuntimeAdapter    → Git watcher / Worktree operations
  ├─ ToolHostAdapter      → command, filesystem, MCP tools
  └─ PermissionBroker     → approval policy and sandbox profile
Renderer
  └─ typed projections     → Project / Worktree / Session / Run / ChangeSet / Artifact
```

## 逆向分析目标与验收标准

本轮分析的目标不是复制 Codex 的私有实现，而是确认 CodeAI 所需的产品边界和事件契约。完成标准分为三层：

1. **结构层**：能从 MSIX/Electron 入口确认主进程、preload、浏览器侧边栏、Git Worker、MCP 沙箱和 Runtime 进程边界。
2. **行为层**：能从运行日志确认 Project、Worktree、Session、Turn、Model、Permission、Tool、Change 和 Artifact 的创建、更新、完成、失败和恢复信号。
3. **落地层**：每个确认的行为都能映射到 CodeAI 的类型化投影、OpenCode Runtime Adapter、桌面 IPC 和 UI 任务，并且不把 Codex 私有 key 直接暴露为公共协议。

当前结构层已完成；行为层已确认 Thread/Turn、模型、文件扫描、Hook、权限、Git watcher、MCP 状态和 Runtime 配置，审批/工具/变更/Artifact 的具体 payload 仍需用可控的真实操作补采；落地层已形成初版映射表，下一步进入 CodeAI 的 Adapter 和事件投影实现。

## CodeAI 映射

| Codex 观察项 | CodeAI 对象或模块 | 实现含义 |
| --- | --- | --- |
| `PROJECT_APPEARANCES` | `Project` projection | 项目外观和侧边栏展示状态独立持久化 |
| `SIDEBAR_PROJECT_THREAD_ORDERS` | `Project` + `Session` read model | 项目下会话顺序由投影保存，不能只按全局最近会话排序 |
| `WORKTREE_*` | `WorktreePolicy`、`Worktree` | Worktree 创建、上游刷新、清理和删除确认是独立策略 |
| `projectlessThreadIds` | `Session.projectRef?` | 会话可以暂时没有项目归属，不能强制所有会话挂在项目下 |
| `activeSession` | `SessionRuntimeState` | 当前活动会话属于窗口状态，不等同于持久化会话本体 |
| `composerEnterBehavior` | `ComposerPreferences` | Enter 行为属于用户偏好，发送和换行不能写死在渲染组件里 |
| `exec_approval_request` | `ApprovalRequest` | 命令执行审批必须成为 Run 事件流的一部分 |
| `apply_patch_approval_request` | `ApprovalRequest` | 文件变更审批需要和命令审批共享审批模型 |
| `ARTIFACT_ANNOTATION`、`ARTIFACT_COMMENT` | `ArtifactInteraction` | 右侧产物视图支持针对文件或预览内容的批注事件 |
| `fileChange`、`changes` | `ChangeSet` | 变更区是会话产物和 Git 状态的投影，不是聊天消息附件 |
| `codex_desktop:connect-git-worker` | `GitRuntimeAdapter` | Git 操作应通过独立运行时边界进入产品层 |
| `codex_desktop:connect-app-host` | `AgentRuntimeAdapter` | Agent Runtime 与 Electron Renderer 之间通过 Host 边界通信 |

CodeAI 第一版应按这些对象实现，而不是把 Codex 的内部 key 直接暴露给 UI。UI 使用 `Project`、`Worktree`、`Session`、`Run`、`ApprovalRequest`、`ChangeSet` 和 `Artifact` 的类型化投影，OpenCode Runtime 通过适配器产生同一套投影。

## REA 状态

REA MCP 已注册到当前 Codex：

```text
Codex registration: aligned
REA skill: version 62
```

全量 `app.asar` 语义图约包含 10,000 个 JavaScript 文件，曾触发 450 秒分析超时和 Evidence 容量上限。后续采用入口、模块和功能分段分析，避免一次性提交整个包。

REA 的 Electron runtime capture 已对实际安装目录和工作区副本分别尝试。WindowsApps 目录受到系统保护，工作区副本又依赖 MSIX 的包身份，当前启动钩子都未能完成启动。这个结果只说明当前 capture 环境无法启动该发行包，不代表 Codex 应用本身无法运行。静态入口分析仍然可用。

## 待验证问题

- Project、Worktree、Session 在运行时的创建和切换顺序
- Composer 的 Enter、Shift+Enter、Plan 和模型选择行为
- 模型选择器的状态来源和会话级持久化字段
- Run、Tool Event、Approval、Change 和 Artifact 的具体 payload 以及事件顺序
- `codex.exe` 与桌面 App Host 的 JSON-RPC 方法参数
- Git Worker 与 Worktree 创建、清理和上游刷新之间的边界
- 右侧文件预览 Tab 与 Artifact 生命周期的显示条件

## 后续分析顺序

1. **可控行为采集**：在单独测试项目中依次执行新建项目、创建 Worktree、新建会话、发送命令、触发审批、拒绝/批准、修改文件、打开文件预览和切换模型；每个动作保存对应日志时间窗。
2. **payload 解析**：针对每个动作抽取 JSON-RPC 请求/响应和 AppServerConnection 路由信封，建立事件字段表；遇到只记录摘要的日志，标记为“已确认事件名、未确认 payload”。
3. **Runtime 对照**：用 OpenCode 的 Session/Run/Permission/Tool/Change 现有模型逐项对照，确定哪些能力直接复用，哪些需要 CodeAI projection 或 adapter。
4. **产品落地**：先实现 `AgentRuntimeAdapter`、`GitRuntimeAdapter`、`PermissionBroker` 和 `SessionProjection`，再接入三栏 UI；所有 UI 状态来自投影事件，不直接读取 Electron 私有状态。
5. **验收**：至少覆盖正常完成、工具失败、审批暂停、用户拒绝、Turn steer、会话恢复、Worktree 删除确认和右侧文件 Tab 自动显示/隐藏八条路径。
