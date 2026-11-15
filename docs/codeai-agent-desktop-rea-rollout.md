# CodeAI 目标驱动落地计划

## 目标

把 OpenCode Runtime 变成 CodeAI 的真实工作底座，并用 Codex 的运行证据校准产品壳。交付对象是可持续运行的 Project → Worktree → Session → Run 工作区，不是静态 HTML 模拟页面。

## 证据闭环

每个目标都必须保留三类证据。

1. **结构证据**由 REA 读取已安装桌面包、Electron 页面和 Runtime 入口，记录真实模块、事件、路由和品牌字符串。
2. **行为证据**由 agent-desktop 启动 CodeAI，创建临时项目和会话，执行一次操作后重新 snapshot、screenshot 和读取日志。
3. **实现证据**来自源码变更、类型检查、构建产物和可复现的探针脚本。

截图只用于校准空间关系和视觉细节。行为、字段和生命周期以 REA 与 agent-desktop 的运行结果为准。

## 目标清单

### G0：品牌与运行边界清零

- 清点源码、资源、ASAR、安装包、错误页、连接页、菜单、CLI 帮助和日志中的旧品牌。
- 允许内部兼容标识存在于协议和目录映射中，但用户可见文本、窗口标题、安装包、命令帮助和错误反馈必须使用 CodeAI。
- 建立发布前品牌扫描，输出命中路径、上下文和允许清单。
- 验收证据是 REA `audit_release_exposure`、安装目录扫描、agent-desktop 启动截图和窗口树。

### G1：Project → Worktree → Session 真实层级

- 左侧项目侧栏是唯一的会话切换入口，顶部不再渲染会话 Tab。
- Project、Worktree、Session 全部来自 ServerSDK，切换后 URL、订阅、Composer、Run 和 Artifact 状态同步变化。
- 项目和会话悬停卡片只显示可由 Runtime 证明的信息，例如目录、会话数量、最近更新时间和当前工作树。
- 探针流程创建两个临时项目、每个项目两个会话，逐个 hover 并读取截图和无障碍树。

### G2：Run 中心与连续输入

- 一条用户任务形成一个 durable prompt admission，运行过程投影成 Task、Run 状态、工具步骤、审批、变更和结果。
- 输入框在运行中仍可接收连续消息，steer 与 queued prompt 遵循 Session inbox 规则，不用停止当前 Run 才能发送。
- 停止、取消、失败、重试、恢复和应用重启都能收敛到明确终态。
- 探针发送连续两条消息，读取 inbox、事件流、UI 状态和最终 Session history，验证顺序、幂等和跨会话隔离。

### G3：沙盒、权限、审核和 Git

- 保留 OpenCode 本地执行能力，在 CodeAI 层增加明确的 PermissionBroker、工作区边界、命令风险分级和一次性审批。
- Git 操作以当前 Worktree 为边界，状态、diff、提交、分支和回滚都通过 Runtime/Git Worker 取得真实结果。
- 审批卡片必须能显示命令、目录、风险和结果。拒绝后 Run 可继续或安全终止。
- 本地沙盒不宣称等同云端隔离。产品文案明确本地权限边界和可见审计记录。
- 探针覆盖读取、写入、危险命令、Git diff、提交失败、取消和恢复。

### G4：Artifact 工作区

- 文件、Changes、Preview、Logs 只由真实产物创建 Tab。
- 没有活动 Tab 时右侧区域不存在，Composer 与会话正文获得完整可用空间。
- Tab 状态绑定 Session，切换会话不串内容。打开、关闭、恢复和全屏都有可观察状态。
- 探针生成 HTML、修改文件、打开预览、关闭最后一个 Tab，并用 agent-desktop 截图和 AX 树确认四个状态。

### G5：模型与 Runtime 连接

- 模型选择属于 Session，显示在 Composer 控制区，不重复占用会话 Header。
- Provider、Base URL、模型 ID、连接测试和错误脱敏由真实配置链路提供。
- Runtime 连接失败显示 CodeAI 错误页，不能泄露上游品牌、内部路径或开发端口凭据。
- 探针在正常连接、401、服务未启动、进程重启和恢复后分别采集状态。

### G6：Windows 交付

- 通过源码构建桌面包，不直接验证旧安装目录。
- 首次启动、项目创建、会话创建、运行、审批、Git 变更、预览、关闭和重启全部用固化脚本完成。
- 发布门禁包含品牌扫描、安装包启动、Runtime 连接、Project/Session 层级、无顶部 Tab、连续输入和 Artifact 隐藏。

## 探针工具约定

- `scripts/verification/Invoke-CodeAIAgentDesktop.ps1` 是 Windows 操作入口。每个动作重新获取窗口和 snapshot，不复用过期 ref。
- `Smoke` 是结构门禁。后续增加 `ProjectSession`, `HoverProject`, `HoverSession`, `ContinuousPrompt`, `ArtifactLifecycle` 和 `BrandScan` 动作。
- REA 证据保存到 `docs/evidence/` 或 `.cache/rea/`，记录 Evidence ID、目标摘要、限制和采集时间。
- 探针失败要输出当前窗口、Runtime 地址、进程号、最后一次截图和日志路径，便于修复后重跑。

## 执行顺序

1. G0 清理并固化品牌扫描。
2. G1 完成真实项目层级、侧栏切换和悬停卡片。
3. G2 完成 Run/inbox/连续输入和恢复。
4. G3 完成权限、审核、沙盒边界和 Git Worker 验证。
5. G4 完成 Artifact 生命周期和右侧空间收敛。
6. G5 完成模型级配置和连接错误闭环。
7. G6 重新构建、安装并使用 agent-desktop 执行完整冒烟。

## 完成定义

只有同时满足以下条件才算完成。

- UI 入口来自真实 Project/Worktree/Session 数据。
- 运行状态、审批、变更、Git 和 Artifact 来自真实 Runtime 事件。
- 连续输入、取消、恢复和重启后状态可解释且不串会话。
- agent-desktop 能从干净启动完成一次完整探针流程。
- REA 证据与截图可以回溯每个关键行为。
- 安装包、窗口、菜单、错误页、连接页和 CLI 的用户可见文本没有品牌泄露。
