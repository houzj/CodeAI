# CodeAI 多会话协作协议

Codex 风格的多会话协作不是复制多个聊天窗口，而是让一个目标下的多个 Session 共享 Project/Worktree 边界，并通过持久化消息传递结果。

## 会话角色

- **Coordinator Session**：维护目标、计划和验收条件，不直接吞掉所有工具输出。
- **Worker Session**：负责一个明确的代码、测试、审查或调研子任务。
- **Reviewer Session**：只读检查变更、测试结果和权限风险。
- **Observer Session**：显示长期运行状态、日志和阻塞原因。

每个子会话仍然是正常 Session，拥有自己的模型、上下文、工具事件和审批记录；它通过 `parentID`、Project、Worktree 和 Goal ID 建立关系。

## 消息协议

消息必须是可持久化的控制事件，而不是把一段文本偷偷拼进 prompt：

```text
task.assigned
task.progress
artifact.ready
review.requested
approval.blocked
task.completed
task.failed
task.cancelled
```

每条消息至少包含：`messageID`、`goalID`、`sourceSessionID`、`targetSessionID`、`type`、`payload`、`causationID`、`createdAt` 和 `delivery`。消费端需要幂等，重复投递不能重复执行工具或改变计划状态。

## 共享与隔离

- Session 默认共享 Project/Worktree 的只读上下文，但每个 Worker 可以使用独立 Worktree。
- Worker 的写入、网络、外部目录和 Git 操作仍由自己的 Policy/Approval 决定。
- Coordinator 只能通过 Artifact、Change、TestResult 和结构化消息读取 Worker 结果，不直接读取 Worker 的内存状态。
- 需要跨会话写入时必须产生显式 `change.apply.requested`，由 Coordinator 或用户批准后执行。

## UI 表现

- Project → Worktree → Goal 下显示相关 Sessions，但不把子会话混入普通最近会话。
- 主 Session 时间线显示任务分派、子会话进度、产物和审查结果的摘要；点击后打开对应 Session。
- 运行中的 Worker 使用轻量状态行显示，不在主区复制完整聊天气泡。
- 悬停显示来源 Session、目标 Session、Worktree、模型、权限模式、最后心跳和打开入口。

## Runtime 落地

OpenCode 已有 Session、`parentID`、事件流和执行协调器可以作为底层。CodeAI 仍需要增加 durable inbox、消息投影、任务租约、子任务恢复和跨 Worker 的 Artifact/Change 引用。桌面端不能把多会话协作实现成前端信号或临时内存数组。
