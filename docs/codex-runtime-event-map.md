# Codex Runtime → CodeAI 事件映射

本文把 Codex Electron 入口和 Runtime 二进制中确认的事件名，映射到 CodeAI 的领域投影。它描述的是产品边界，不把 Codex 私有事件名直接暴露为公共协议。

## 事件分层

| Codex 事件组 | CodeAI 投影 | 主要字段方向 | UI 用途 |
| --- | --- | --- | --- |
| `thread/started`, `thread/settings/updated`, `thread/readState/changed` | `SessionProjection` | `threadId`, project/worktree assignment, settings, read state | 会话树、恢复、未读状态 |
| `thread/queue/changed`, `turn/steer`, `turn/interrupt` | `SessionInboxProjection` | queue item id, delivery mode, cancellation | 输入框发送、排队、Steer、停止 |
| `turn/started`, `turn/completed`, `turn/diff/updated`, `turn/plan/updated` | `RunProjection` | `turnId`, status, model snapshot, diff summary, plan | 当前任务、运行状态、计划 |
| `item/started`, `item/completed` | `RunItemProjection` | `itemId`, item kind, status, timestamps | Run 时间线 |
| `item/commandExecution/outputDelta`, `item/commandExecution/terminalInteraction` | `ToolExecutionProjection` | command, cwd, process id, output delta, exit code | 工具详情、命令输出 |
| `item/fileChange/outputDelta`, `item/fileChange/patchUpdated` | `ChangeSetProjection` | file path, patch, change summary | Changes、审批前预览 |
| `item/mcpToolCall/progress`, `mcpServer/*` | `McpToolProjection` | server id, tool name, progress, startup status | MCP 工具详情和错误 |
| `item/reasoning/*`, `item/agentMessage/delta`, `item/plan/delta` | `AssistantOutputProjection` | delta, summary part, plan step | 中间区任务说明和最终输出 |
| `item/autoApprovalReview/*`, `autoApprovalReview/strictReviewRequired`, `serverRequest/resolved` | `ApprovalProjection` | approval request id, policy, reviewer, resolution | 审批卡片、暂停/继续 |
| `model/rerouted`, `model/verification`, `modelProvider/authRecovery*` | `ModelRuntimeProjection` | provider, model, reasoning effort, verification/auth state | 模型选择器和错误反馈 |
| `fs/changed`, `project/changed` | `WorkspaceProjection` | root, path, change kind | 文件树、项目状态、预览 Tab |
| `windowsSandbox/setupCompleted`, `permissionProfile/list` | `PermissionProjection` | profile, approval policy, sandbox policy | 权限状态和安全提示 |

## 控制面映射

| Codex 方法 | CodeAI 操作 | 约束 |
| --- | --- | --- |
| `thread/start` | `Session.start` | 创建 Session，不直接创建 UI 聊天气泡 |
| `thread/resume` | `Session.resume` | 恢复已有 Session 和未完成 Run |
| `thread/queue/add` | `Session.prompt`（queued） | 持久化 inbox 后再唤醒执行器 |
| `turn/start` | `Run.start` | 固化模型、权限和工作区快照 |
| `turn/steer` | `Session.prompt`（steer） | 只在安全边界改变当前执行流 |
| `turn/interrupt` | `Run.interrupt` | 释放活动执行 claim，保留恢复信息 |
| `thread/inject_items` | `Session.injectSystemItems` | 仅供系统/迁移/外部事件，不作为普通用户输入 |
| `thread/items/list` / `thread/turns/list` | `Session.readModel` | 读取投影，不重放 UI 私有状态 |

## 当前证据等级

- **已确认**：事件名、控制方法、Thread/Turn/Item 分层、Runtime/IPC 边界、审批/文件变更/工具/模型/沙箱事件的存在。
- **部分确认**：二进制字符串中的字段方向，包括 `threadId`、`turnId`、`itemId`、`command`、`cwd`、`processId`、`exitCode`、`filePath`、`patch`、`permissionProfile`、`approvalPolicy`、`sandboxPolicy`、`modelProvider`、`reasoningEffort`。
- **新增部分确认**：审批/变更相关字段标签包括 `approval_id`、`approval_mode`、`approvalId`、`parsedCmd`、`fileChanges`、`grantRoot`、`changeType`、`paths`、`reason`、`summary`、`conversationId`、`threadId`、`turnId`、`modelProvider`、`model`、`effort`、`sandboxPolicy` 和 `multiAgentMode`。
- **待确认**：每个通知的完整 JSON payload、可选字段、枚举值、事件重放顺序和跨版本兼容策略。

公开事件资料还给出了增量消息的通用关联方式：事件自身有 `event_id`，持久化 Item 使用 `item_id`，内容片段使用 `output_index` 和 `content_index`，增量字段为 `delta`，完成字段为完整 `text`。CodeAI 的 `RunItemProjection` 应保留这些游标和关联键，避免多个并行工具或文本片段互相覆盖。

## CodeAI 实现顺序

1. 先定义 `SessionInbox`、`Run`、`RunItem`、`ApprovalRequest`、`ChangeSet` 和 `Artifact` 的 Schema。
2. 在 OpenCode Runtime Adapter 中把现有事件归一化到上述投影，不让 UI 依赖 Codex 私有事件名。
3. 实现 command/fileChange/MCP 三类 Tool Item 的增量输出和终态折叠。
4. 实现审批请求的暂停、批准、拒绝、超时和恢复。
5. 用可控测试任务捕获真实 payload 后，再补充精确 Schema 和兼容测试。
