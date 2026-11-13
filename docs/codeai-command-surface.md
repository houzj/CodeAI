# CodeAI command surface

Codex 的优势不只是会话渲染，而是把“会话操作”做成稳定的命令面：命令可以从输入框、会话菜单、快捷键和命令搜索进入，动作结果仍回到当前 Session 的时间线。CodeAI 不把 OpenCode 现有 slash command 当成全部能力，而是分成三层。

## 现有 Runtime 能力

这些能力可以直接复用 OpenCode 的 Server API 或命令目录，不新增第二套执行循环：

- 模型和 Provider 选择、连接测试
- MCP、插件、技能和命令目录
- Session 搜索、归档、恢复、导出和删除
- Session 分支/复制、移动到 Project/Worktree
- 中断当前执行、重新运行、继续执行
- 上下文压缩（由 Runtime 负责，UI 只显示状态和触发入口）
- Permission 请求、一次性批准、拒绝和永久规则
- Git 状态、变更预览、提交前检查和 Worktree 切换

## CodeAI 产品层能力

这些能力需要在 Server/Schema/Client/桌面 UI 之间建立稳定契约，不能只在菜单里做假入口：

| 能力 | UI 入口 | 持久化对象 | Runtime 边界 |
| --- | --- | --- | --- |
| 目标 | Session 顶部目标条、项目概览 | `goal` | 目标状态由 Run 事件推进 |
| 计划 | 计划面板、计划步骤、执行进度 | `plan` / `plan_item` | 每个步骤映射到 Run 或工具事件 |
| 定时任务 | 项目级任务列表、下一次运行时间 | `schedule` | 服务端调度，Session 负责执行记录 |
| 侧边聊天 | Session 菜单中的独立线程 | 子 Session | 复用同一 Project/Worktree 上下文 |
| 代码审查 | 变更卡片、审查命令、审查结果 | `review` | 只读 Run，禁止隐式写入 |
| 上下文管理 | 压缩状态、上下文用量、继续/重试 | `compaction` | Runtime 生成压缩摘要并保留可追溯标记 |

## 交互约束

1. 命令执行必须进入当前 Session 的时间线，不能弹出一套独立聊天窗口。
2. 命令菜单只负责选择和参数收集；真正执行统一走 Server/Runtime API。
3. 破坏性命令（删除、写入、网络、提交、推送）必须复用同一套 Permission/Approval 状态。
4. 目标、计划、定时任务是 Project/Worktree 级对象；Session 只显示当前快照和执行记录。
5. 所有命令都要有悬停说明、快捷键提示、禁用原因和失败反馈；没有 Runtime 能力时显示“暂未支持”，不能伪装成功。

## 当前落地顺序

1. 使用现有 `command.list` 和 Composer 命令搜索，补齐 Session 搜索、归档、移动、压缩和复制入口。
2. 把 Goals/Plans/Schedules 的 Schema 和 Server API 设计为实验性接口，先做只读投影和占位 UI。
3. 将命令结果统一投影到生产 `MessageTimeline`，包括工具事件、审批、变更和压缩状态。
4. 再实现持久化执行和恢复，最后接入通知、后台运行和 Windows 调度。
