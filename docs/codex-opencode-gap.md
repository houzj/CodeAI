# Codex 交互与 OpenCode 底座可达性

Forge 的 UI 可以借鉴 Codex 的任务工作区，但不能假设 OpenCode 已经提供 Codex 的全部执行语义。设计必须先区分产品交互和底座能力。

## 领域映射

```text
Forge Product Task
└── Project
    └── Worktree / Location
        └── Conversation (OpenCode Session)
            └── Run (事件流 + 工具调用 + 产物)
```

OpenCode 的 `Project`、`Session`、`location.directory`、Git Worktree、Tools 和事件流可以承载这套基础关系。Worktree 属于项目，Session 必须绑定实际执行目录；branch 是 Worktree 的属性，不是 Conversation 的属性。

## 能力分层

| 产品能力 | OpenCode 可直接承载 | Forge 需要补充 | 当前不能假装已有 |
| --- | --- | --- | --- |
| Project / Session 层级 | Project、Session、session directory | 产品级项目索引、最近会话、跨 Worktree 归组 | 组织级项目权限 |
| Worktree / branch | Git worktree strategy、worktree create/list/remove | 会话创建前的目标选择、绑定校验、脏工作树提示 | Codex 式完整任务隔离保证 |
| Agent Run | Session 内工具调用和事件 | Run snapshot、取消、恢复、事件聚合、Run 状态机 | 不能把一次普通消息渲染成完整 Run |
| 工具事件 | shell、read、grep、edit、patch 等工具 | 统一事件 schema、折叠视图、重试和审计 | 工具执行的组织级策略中心 |
| 变更 | diff、文件修改、Git 状态 | checkpoint、变更分组、回退、验证结果 | 自动可靠回滚到任意任务节点 |
| 审批 | OpenCode permission / approval 机制 | 产品级策略、审批历史、批量批准、组织策略 | 未实现的审批策略不能只放一个按钮 |
| 多模型 | provider/model 配置和 session model | provider registry、能力矩阵、路由和成本策略 | 自动保证所有模型都支持同一套 tool calling |
| 远程 / 团队 | 插件和 server 扩展点 | Control Plane、Worker、身份和审计 | 第一版本地桌面直接伪装成远程平台 |

## UI 约束

主对话区采用 Run-centric 结构，但每个 UI 状态都必须能映射到底层对象：

```text
Task prompt          → Session 的用户输入
Run header           → 一次 Agent Run 的状态和 snapshot
Plan / tool event    → Run event
Changed files        → Run artifact / diff
Approval request     → Tool permission request
Continue / retry     → 新的 Run 或 Run continuation
```

如果底座只返回普通 Session 消息，界面应显示为“消息事件”，不能伪造已存在的 Run、checkpoint 或可恢复状态。只有 Forge Runtime 持久化了 Run、Event、Artifact 后，才启用对应的高级视图。

## 第一版实现边界

第一版可以真实做到：

1. Project → Worktree → Session 的导航和绑定。
2. 每个 Session 保存自己的 provider、model、mode 和 permission profile。
3. 把 OpenCode 的工具调用、权限请求、文件变更和命令结果归一化成事件流。
4. 用本地 SQLite 保存 Session、Run、Event、Artifact 索引，原始日志仍由 OpenCode runtime 管理。
5. 对 Worktree 创建、删除和 Session location 变更做显式确认和校验。

第一版不应承诺：跨机器 Run 迁移、完整 checkpoint 回滚、组织级策略编排、所有模型等价支持工具调用。这些能力需要 Forge 自己的 Control Plane 或 Execution Plane。

## 设计结论

Codex 的视觉和交互可以作为目标体验；OpenCode 的 Project、Worktree、Session、Tool 和 Permission 能作为底层适配点。中间必须增加 Forge Runtime，而不是让桌面 UI 直接把 OpenCode Session 当成 Codex Task。
