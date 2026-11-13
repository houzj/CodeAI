# CodeAI 长目标执行模型

Codex 的“目标运行一天以上”不是把一个 HTTP 请求挂住，而是把目标拆成可恢复的持久化执行单元。

## 对象关系

`Goal → Plan → Run → Step → ToolEvent / Approval / Change / Checkpoint`

- **Goal**：用户想完成的结果、所属 Project/Worktree、当前状态和最后一次心跳。
- **Plan**：可变的步骤图；步骤完成后可以追加、重排或阻塞，不把完整计划塞进一次 prompt。
- **Run**：一次可恢复执行尝试，记录 runtime、模型、权限策略、沙盒位置和 checkpoint。
- **Step**：一次模型调用或工具阶段，结束后写入不可变事件。
- **Checkpoint**：上下文摘要、工具状态、未决审批、Git 基线和恢复游标。

## 必须具备的闭环

1. **后台调度**：应用关闭后由 Server/Worker 继续运行；桌面端只订阅状态。
2. **心跳与租约**：Run 有 lease、attempt、heartbeat 和恢复原因，进程崩溃后可以接管。
3. **权限持久化**：批准范围绑定到 Project/Worktree/Tool，不能只存在于前端弹窗。
4. **沙盒持久化**：每个 Run 明确工作目录、外部目录、网络策略和隔离能力；不把 OpenCode worktree 冒充 OS 沙盒。
5. **上下文压缩**：压缩是独立事件，保存摘要和原始消息边界，恢复时从 checkpoint 继续。
6. **Git 检查点**：每个关键步骤记录 HEAD、未提交变更和生成文件；恢复前先检测漂移。
7. **可观察性**：目标页显示当前步骤、阻塞原因、最后心跳、耗时、变更和下一步，而不是只显示“运行中”。

## OpenCode 复用边界

可以直接复用 Session、SessionExecution、Permission、Compaction、Shell/Tool 事件和 Git/Worktree API。Goal、Plan、Schedule、Checkpoint、lease/recovery 需要在 Schema、Server、Client 和桌面 UI 中新增契约。第一版应先做 `Goal` 和 `Plan` 的只读投影，再接入后台恢复，避免用前端定时器伪造长任务。

## 沙盒结论

Codex Cloud 的环境运行在 OpenAI 管理的计算机上，每个任务拥有独立工作区；Codex 本地模式则使用本机的沙盒实现。CodeAI 不应把两者混为一个能力：

- Local Worker：使用 OpenCode Worktree 作为文件边界，再叠加 Windows 原生沙盒或 WSL/容器隔离。
- Remote Worker：在公司服务器上的容器/VM 中运行，桌面只订阅状态和审批。
- Hybrid：Goal 在远程 Worker 持久运行，用户可以从桌面切换到任意 Session 继续操作。

官方资料：

- https://help.openai.com/en/articles/20001545-using-codex-cloud
- https://openai.com/index/building-codex-windows-sandbox/
- https://developers.openai.com/api/docs/guides/agents-api/environments/self-hosted

## UI 约束

- 侧边栏显示 Project → Worktree → Goal/Session 层级；Goal 与 Session 是两个不同对象。
- 中间时间线显示当前 Run 的连续事件，目标状态固定在顶部但不遮挡正文。
- 右侧 Artifact/Changes 区独立显示文件和预览，最后一个 Tab 关闭后自动隐藏。
- 任何阻塞（审批、权限、网络、失败、等待定时）都必须能从时间线跳到处理入口。
