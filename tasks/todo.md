# OpenCode Fork 第一版任务清单

> 产品级系统总设计见 [docs/product-architecture.md](../docs/product-architecture.md)。以下清单先完成基础模块和接口，再进入 UI。

## 当前目标

**目标：** 把 Codex 风格桌面壳从静态原型推进为 OpenCode Runtime 驱动的产品工作区。

**完成定义：** 用户从真实 Project 进入 Worktree 和 Session，提交一次任务后，中间区能显示真实 Run、工具事件和审批状态；右侧工作区只在真实文件、变更、预览或日志产物出现时显示；隐藏后中间会话自动扩展；应用重启后仍能恢复当前 Session。

## 目标驱动任务

### G1：真实事件能驱动 Codex 工作流状态

- [x] 建立 `CodexActivityState`，按 Session ID 隔离运行状态。
- [x] 投影 execution、tool、permission、文本流、reasoning 流和文件变化事件。
- [x] 通过 `connectCodexActivity` 连接现有 OpenCodeEvent 流。
- [x] 覆盖成功、失败、拒绝、跨 Session 和文件变化测试。

**验收证据：** `packages/app/src/session/codex-activity.test.ts` 通过，`packages/app` typecheck 通过。

### G2：真实 Project → Worktree → Session 替换静态原型数据

- [x] 从 ServerSDK 读取当前项目、工作目录、会话标题和最近会话。
- [x] 中间标题显示真实 Session，运行状态来自 G1 投影。
- [x] 右侧 Context 显示真实模型、Provider、工作区和权限配置。
- [x] 不再从 `codex-v4.html` 读取任何演示数据。

**验收证据：** 在真实本地项目中切换两个 Session，层级、标题和模型信息同步变化。

### G3：Composer 完成真实任务闭环

- [x] Enter 调用现有 Session prompt API。
- [x] Shift+Enter 保留换行行为，发送期间输入框进入运行态。
- [x] 停止按钮调用 Session interrupt API。
- [x] 模型选择使用当前 Session 的模型配置，不修改全局默认值。

**验收证据：** `createActiveComposerAdapter`、`createComposerSubmit` 和 `session/composer/queue` 已连接现有 Session API；仍需在 Windows 安装包中完成一次端到端任务验收。

### G4：右侧工作区由真实产物驱动

- [x] 文件、变更、预览和日志按事件创建 Tab。
- [x] 无活动产物 Tab 时右侧自动隐藏。
- [x] 右上角可以独立关闭、恢复和全屏右侧区域。
- [x] 右侧隐藏时中间会话占满剩余空间。

**验收证据：** `runtime/plugin/side-region.tsx`、`runtime/plugin/panels.tsx` 和 `session/screen.tsx` 已提供动态 Tab、独立 side 状态和空 Tab 自动收起；仍需完成四条产物路径的 Windows 安装包验收。

### G5：Windows 产品闭环

- [x] CodeAI Windows 构建和 x64 打包通过，产物包含 `CodeAI.exe` 和 CodeAI App ID。
- [x] CodeAI 安装包启动后进入真实工作区。
- [ ] 应用重启后恢复项目、Session 和右侧区域状态。
- [ ] 运行、审批、错误和取消状态在安装包中与开发模式一致。
- [x] 完成一次 Windows 冒烟测试并记录日志位置。

**验收证据：** `packages/desktop` typecheck、build、pack 通过；提权 Windows 环境下安装器测试 4/4 通过；CodeAI.exe 实际完成“制作简单网页”任务，执行 Shell、生成 index.html 并打开浏览器预览 Tab，最终 Run 状态回到可发送状态。

## 当前执行顺序

1. G2：接入真实 Project/Worktree/Session 数据。
2. G3：把 Composer 接到 Session prompt/interrupt。
3. G4：接入产物 Tab 和右侧独立布局。
4. G5：安装包冒烟验证。

## 新目标：CodeAI 生产 Shell（2026-11-13）

**目标：** 把真实 `packages/app` 从 OpenCode 原生壳推进为 Codex 风格 CodeAI 工作区。`codex-v4.html` 只作为视觉参考，不作为交付物。

### P1：生产 Workspace Frame

- [x] 接入真实 Session 路由。
- [x] 显示 Project → Worktree → Session 层级。
- [ ] 左侧导航支持 Session 切换并保持 Runtime 状态。
- [ ] 压缩原生 Session Header，建立 CodeAI Workspace Header。

### P2：Run 中心区

- [x] Task / Run Header。
- [x] Tool / Approval / Changes / Reasoning 折叠步骤。
- [ ] 默认聚焦任务和当前运行状态。
- [ ] Composer 固定底部并接入真实 prompt / interrupt / model。

### P3：Artifact 右侧区

- [ ] 产物事件创建文件、Changes、Preview、Logs Tab。
- [ ] 无产物自动隐藏右侧区域。
- [ ] 右侧独立关闭、恢复、全屏。
- [ ] 中间 Run 流和 Composer 状态不被右侧 Tab 打断。

### P4：验证与收敛

- [ ] 生产组件和事件回放测试。
- [ ] Windows 包重新打包并验证品牌和布局。
- [ ] 完成真实项目任务并保存运行证据。
- [ ] 移除交付流程对静态 v4 HTML 的依赖。

**当前下一步：** P2，先把真实 Session 页面中心区改成 Run Header + 折叠事件流。

## 执行记录（2026-11-13）

- OpenCode 基线已落到仓库根目录，基线提交：`fb11429446`。
- Git 远程已关联：`origin=https://github.com/houzj/CodeAI.git`，`upstream=https://github.com/anomalyco/opencode.git`。
- Bun 1.4.4 已安装到本地工具目录，依赖已安装；`.tools/` 已加入忽略规则。
- `packages/desktop` 类型检查通过（3,501 files / 2 projects）。
- `packages/desktop build` 通过。
- Windows x64 便携目录打包通过：`packages/desktop/dist/win-unpacked/`。
- NSIS 安装包已生成：`packages/desktop/dist/opencode-desktop-win-x64.exe`；静默安装到工作区临时目录后，默认 sandbox 启动探测通过。直接运行未安装的便携目录仍受当前沙箱目录 ACL 影响，因此开发/便携验证需优先使用安装包。
- 右侧产物区规则已确定：按当前会话实际生成的文件/预览/变更/日志动态创建入口并自动切换，没有产物时不展示空类别；打开多个文件时按文件创建预览 tab。
- CodeAI 品牌基线已落地：桌面名称、窗口标题、应用 ID、协议、图标、Windows 可执行文件和 NSIS 安装包已替换。
- 品牌验证：桌面类型检查、构建通过；`codeai-desktop-win-x64.exe` 安装包生成并安装，安装目录中的 `CodeAI.exe` 可启动。
- 最新便携包启动探测：`CodeAI.exe` 能打开真实 Composer、项目选择和本地 Runtime；首次探测发现应用层菜单仍显示 OpenCode，已修复桌面菜单、恢复错误、关于页和语音标识并重新构建打包。

## 逆向分析推进（2026-11-13）

- [x] R1：提取 Codex Windows MSIX、`app.asar`、Electron 入口和运行时组件清单。
- [x] R2：确认 Project、Worktree、Session、Composer、Model、Permission、Artifact 和 Change 的静态状态线索。
- [x] R3：确认 App Server 的 stdio 边界、Thread/Turn/Model/FS/Hook/Permission/MCP 方法和一次 Turn 的调用顺序。
- [x] R4：确认 Git watcher、独立 Runtime bundle、App Host、Git Worker、浏览器侧边栏和 MCP 沙箱 IPC 边界。
- [x] R5：建立 Codex 观察项到 CodeAI 类型化投影和 Runtime Adapter 的映射。
- [x] R6a：从运行日志补采 `mcpServer/tool/call` 和 `mcpServer/elicitation/request` 的路由信封与接受响应。
- [x] R6b-结构：确认命令、审批、文件变更、预览 Tab 和模型切换的事件名及 Runtime 字段方向。
- [x] R6b-payload：用 OpenAI Codex App Server 公开协议确认命令执行、文件变更、审批、MCP elicitation 的完整 payload 和重放顺序，并与 Windows 日志交叉验证。
- [ ] R7：将确认后的事件字段固化为 CodeAI Protocol/Schema，并补正常完成、失败、拒绝、取消和恢复用例。
- [ ] R8：按事件投影实现 AgentRuntimeAdapter、GitRuntimeAdapter、PermissionBroker 和 SessionProjection。

详细证据、限制和验收标准见 [docs/codex-reverse-engineering.md](../docs/codex-reverse-engineering.md)。

## Phase 0: 产品级基础

- [ ] 确认 Local、Hybrid、Internal 三种运行模式的接口
- [ ] 定义 Organization、Project、Workspace、Session、Run、Event、Artifact、AuditEvent
- [ ] 定义 Session 级 modelRef、mode、permissionProfile 和 contextPolicy
- [ ] 定义 Run 状态机、事件游标、取消、恢复和幂等规则
- [ ] 定义 Model Gateway、Tool Runtime、Policy Engine、Verification 的接口
- [ ] 定义 Secret、Audit、Observability 和 Evaluation 的占位模块

## Checkpoint: 系统设计

- [ ] 核心对象和状态机已经评审
- [ ] Local Mode 不依赖远程控制面
- [ ] Internal Mode 可以替换 Local Runtime 的实现
- [ ] UI 入口与领域对象一一对应

## Phase 1: Fork 基线和构建

- [x] Task 1: 建立 fork 和上游同步边界
- [x] Task 2: 跑通桌面开发和打包基线（类型检查、构建、Windows x64 便携打包已验证）

## Checkpoint: 基线

- [x] 桌面应用可以在默认 sandbox 下启动（NSIS 安装后已验证）
- [x] Windows x64 便携包和 NSIS 安装包可以生成并打开
- [ ] 上游测试和构建通过

## Phase 2: 产品壳和本地工作区

- [ ] Task 3: 完成品牌和首次启动流程
- [ ] Task 4: 验证工作区、权限和命令执行

## Phase 3: 多模型接入

- [ ] Task 5: 固化 provider 和 model 数据契约
- [ ] Task 6: 完成 provider 设置和连接测试
- [ ] Task 7: 完成会话级模型选择和流式事件适配

## Checkpoint: 多模型闭环

- [ ] 两个 provider 可以完成同一项代码任务
- [ ] 工具调用和审批行为一致
- [ ] provider 错误不会破坏会话状态

## Phase 4: 会话、diff 和发布质量

- [ ] Task 8: 完成会话恢复和本地配置持久化
- [ ] Task 9: 完成 diff、测试结果和任务总结
- [ ] Task 10: 发布前验证和文档

## Codex Runtime 接入（2026-11-13）

- [x] A1：建立 `CodexActivityState` 运行态投影，覆盖 execution、tool、permission、filesystem 和消息流事件。
- [x] A2：补充事件顺序、重复事件、跨 Session 隔离和终态收敛测试。
- [ ] A3：把真实 ServerSDK 的项目、Worktree、Session 和模型信息接入 v4 容器。
- [ ] A4：把 Composer 的提交、停止和审批操作接到现有 Session API。
- [ ] A5：把 Artifacts 改为产物事件和文件 Tab 驱动，并验证右侧独立显示/隐藏。

### Runtime 接入检查点

- [x] 真实 Session prompt 能在 UI 中形成 Run 状态。
- [x] 工具、审批和文件变化不再使用静态示例数据。
- [x] `packages/app` 类型检查和相关测试通过。

## Checkpoint: 第一版完成

- [ ] Windows 安装包可以从全新环境启动
- [ ] 至少两个 provider 可以执行代码任务
- [ ] 会话可以恢复，diff 和测试结果可查看
- [ ] 权限拒绝、网络错误和模型错误有清晰反馈
- [ ] 发布包没有测试密钥和开发配置

## 当前主目标：CodeAI 生产壳 v2（2026-11-13）

目标：将 `packages/app` 从 OpenCode 原生壳推进为真实 Runtime 驱动的 Codex 风格工作区；所有完成项必须有代码、测试或桌面验证证据。

### Task 1：工作区导航真实切换

- [ ] Project → Worktree → Session 层级可切换
- [ ] 切换 Session 后 Run、Composer、事件订阅保持一致
- [ ] 跨 Session 不串 Runtime 状态

### Task 2：Run 中心区

- [x] 默认只显示任务、当前运行状态和 Composer
- [x] Tool、Change、Approval 默认折叠并可展开
- [x] Composer 支持真实 Enter 发送路径，沿用生产编辑器的 Shift+Enter 换行和自适应高度

### Task 3：会话级模型

- [ ] 模型选择器位于 Composer 发送按钮左侧
- [ ] 每个 Session 独立保存 provider/model/reasoning
- [ ] 自定义模型弹窗支持 Provider、Base URL、模型 ID、API Key、连接测试

### Task 4：Artifact 工作区

- [x] 由真实文件/预览/变更/日志产物创建 Tab
- [x] 无活动 Tab 时右侧自动隐藏，中间区自动扩展
- [ ] 右侧支持独立关闭、恢复、全屏和文件级 Tab

### Task 5：Windows 交付

- [x] 最新生产壳完成类型检查和针对性测试
- [x] 重新生成 CodeAI Windows 便携包和 NSIS 安装包
- [ ] 全新安装完成真实项目任务闭环
- [ ] 验证窗口标题、菜单、图标、可执行文件和安装包名称

### Checkpoint A：Task 1–2

- [ ] 真实 Session 可切换
- [ ] Run 中心和 Composer 可用
- [ ] 中间区没有聊天气泡式主布局

### Checkpoint B：Task 3–4

- [ ] 会话级模型配置有效
- [ ] Artifact 右侧按 Tab 自动显示/隐藏
- [ ] 左右区域可独立控制

### Checkpoint C：Task 5

- [ ] Windows 安装包全新环境启动
- [ ] 完成项目、Worktree、Session、Run、审批、变更和预览闭环
- [x] 交付不依赖 `ui-prototype/codex-v4.html`

### 执行记录（2026-11-13，生产包冒烟）

- [x] 最新 `packages/app` 通过类型检查（2,396 files）。
- [x] 最新 Electron 渲染构建通过，生成 CodeAI 便携目录和 NSIS 安装包。
- [x] 启动 `E:\CodeAI\.cache\codeai-prepackaged\CodeAI.exe`，窗口标题为 `CodeAI`。
- [x] 真实新会话完成只读任务：读取项目根目录并返回 `index.html`，未修改文件。
- [x] AX 树确认生产页面包含 `CodeAI → 项目 → 工作区 → 会话` 层级、真实项目目录、真实模型、Run 状态和 Composer。
- [x] 无 Artifact Tab 时右侧区域未出现在生产页面 AX 树中，说明现有 SideRegion 的无 Tab 隐藏规则生效。
- [x] 真实任务打开 `index.html` 后，AX 树出现 `review-panel`、浏览器地址栏和预览 Tab；`Ctrl+Shift+R` 隐藏后 `review-panel` 消失，再次切换恢复同一 Tab。
- [ ] 第二个 Session 的点击切换和右侧全屏/文件级 Tab 仍需下一轮桌面操作验证。

### 执行记录（2026-11-14，启动品牌清理）

- [x] 启动 Splash 已移除 OpenCode logo/Wordmark，改为 CodeAI 文案。
- [x] Desktop host 的可见运行时身份改为 CodeAI。
- [x] Session Runtime Header 将默认 `opencode` provider 显示为 CodeAI，内部协议和兼容层保持不变。
- [x] app/desktop 类型检查和最新桌面渲染构建通过。
- [x] 最新便携包启动窗口标题为 CodeAI，远程 Session 仍可进入真实 Workspace Frame。
- [x] Composer provider label 和远程连接品牌入口不再显示用户可见的 OpenCode/Wordmark。
- [x] 终端验证最新便携目录包含 `CodeAI.exe` 和 `resources/app.asar`，NSIS 包已重新生成：`packages/desktop/dist/codeai-desktop-win-x64.exe`。
- [x] 桌面 Session 中间区切换为真实 `CodeAIRunCenter`：任务和结果默认显示，Runtime 详情折叠，Composer 仍使用真实 prompt/interrupt/model 链路。
- [x] Run Center 的折叠详情接入真实 Permission API，展开后可执行一次性批准。
- [x] 修复安装后 `resources/opencode-cli.exe` 缺失导致的 `spawn ENOENT`；预打包流程现在会自动补齐 CLI 和版本文件。
- [x] 错误页、Provider 图标和连接页不再渲染 OpenCode Logo；错误反馈文案改为 CodeAI。

### 执行记录（2026-11-14，Run Center 收敛）

- [x] 中间区从信息卡布局收敛为任务、状态、结果和折叠运行详情，减少固定边框和视觉噪音。
- [x] 运行详情展开后显示工具步骤、待审批请求、一次性批准操作和变更文件路径。
- [x] `packages/app` 类型检查通过，相关 Runtime/布局测试 13/13 通过。
- [x] `packages/app` Vite 生产构建通过（5,358 modules transformed）。
- [ ] 最新 Run Center 需要在用户本机安装包中完成一次手动视觉冒烟；当前不再自动控制用户桌面。

### 执行记录（2026-11-14，Worktree 层级修复）

- [x] Session 列表按当前 Worktree 过滤，不再把同一 Project 下的会话混在一起。
- [x] 点击 Worktree 优先打开该 Worktree 最近会话；没有会话时才回到首页选择目录。
- [x] 当前生产 app 构建再次通过，PWA 生成 2,801 个 precache 条目。

### 执行记录（2026-11-14，最新 Windows 产物）

- [x] `dist/desktop/app/CodeAI.exe`、`resources/app.asar` 和 `resources/opencode-cli.exe` 已重新生成并存在。
- [x] NSIS 安装包 `dist/desktop/codeai-desktop-win-x64.exe` 已重新生成，大小约 281 MB。
- [x] 打包后已恢复临时版本改写，工作区保持干净。
- [ ] 仍需用户本机手动启动最新安装包，确认视觉效果和项目切换；本环境不再自动控制桌面。

### 执行记录（2026-11-14，跨 Project 切换）

- [x] 跨 Project 点击现在按目标 Project + Worktree 查找最近会话，不再错误复用当前 Session 的 projectID。
- [x] 修复后 `packages/app` 类型检查通过，Session/布局专项测试通过（10/10）。
- [x] 修复后重新生成 NSIS：`dist/desktop/codeai-desktop-win-x64.exe`（约 281 MB）。
- [ ] 仍需用户本机手动启动最新安装包完成视觉冒烟。

### 执行记录（2026-11-14，交付包静态审计）

- [x] 从最新 `resources/app.asar` 解包验证，产物包含 CodeAI、Project、Worktree、Run details 和 `session.run.runtime` 文案。
- [x] 最新 app.asar 未发现 `codex-v4` 或 `ui-prototype/codex-v4` 交付引用。
- [x] 安装包和预打包目录均来自最新 app 构建；未启动用户桌面。

### 执行记录（2026-11-14，用户桌面截图）

- [x] 截图确认 CodeAI 窗口已启动，左侧显示 Project、Worktree、Session 层级。
- [x] 截图确认生产 Run Center 显示任务状态和 Composer，模型选择器位于底部 Composer 控制栏。
- [ ] 截图时任务仍处于 Running 且尚未产生 Runtime steps；需任务结束后再次展开运行详情确认事件。
- [ ] 仍需打开文件/预览，确认 Artifact 右栏出现并在关闭最后一个 Tab 后隐藏。

### 执行记录（2026-11-14，用户桌面运行事件截图）

- [x] 截图确认 Run Center 已接收真实 Runtime 事件：6 个步骤显示 `edit`、`write`、`shell`。
- [x] 已完成步骤显示 `completed`，当前步骤显示 `running`，说明工具事件投影和状态更新生效。
- [ ] 等当前 shell 步骤结束后，再确认最终 Run 状态和 Result。

### 执行记录（2026-11-14，会话中心修正）

- [x] Run Center 现在从 durable Session assistant history 重建已完成的工具步骤和结果，不会在任务结束或重新进入会话后退回 `Idle / 0 steps`。
- [x] 顶部会话上下文移除重复的 Provider/Model 文案；模型选择统一保留在 Composer。
- [x] `packages/app` 类型检查通过，Runtime history projection 测试 4/4 通过。
- [ ] 需要重新生成 Windows 包并补一张任务结束后的 Run Center 截图。

### 执行记录（2026-11-14，会话 Composer 结构重做）

- [x] 移除 `h-0` 浮动 Composer 行，Composer 改为真实的底部布局区域。
- [x] Run Center 不再用额外的 `pb-36` 遮挡补偿，正文滚动区和输入区拥有独立高度。
- [x] `packages/app` 类型检查通过，Runtime history projection 测试 4/4 通过。
- [ ] 需要重新生成 Windows 包，确认会话正文不再被 Composer 覆盖。

### 执行记录（2026-11-14，全局项目侧栏重构）

- [x] Session 路由移除重复的 `CodeAIWorkspaceFrame`，不再在会话页内创建第二棵项目树。
- [x] 新用户默认使用全局 `SidebarOrganized` 的 Project 分组导航。
- [x] 现有运行时/历史投影类型检查通过；设置测试受现有 Bun/Solid `jsxDEV` 环境错误影响。
- [ ] 仍需将全局 Sidebar 的会话拖动归属接到真实 `session.move`。

### 执行记录（2026-11-14，会话移动域操作）

- [x] 全局 Sidebar 会话菜单已接入真实 `session.move`，目标按 Project/Worktree 列出并在服务端确认后同步 Session。
- [ ] 仍需把同一操作接到 Sidebar 的拖放手势，并补充拖动反馈和失败回滚。

### 执行记录（2026-11-14，全局 Sidebar 拖放归属）

- [x] Session 行注册为 draggable，Project 行注册为 droppable。
- [x] 拖动 Session 到 Project 会调用真实 `session.move`，成功后同步 Session，失败显示错误反馈。
- [x] `packages/app` 类型检查通过（2,397 files），Runtime 专项测试通过。

### 执行记录（2026-11-14，Policy 兼容层）

- [x] 新增 `projectCodeAIPolicy`，将 OpenCode Worktree/Permission 映射为 CodeAI 的执行环境、文件范围、命令策略、外部目录策略和审批策略。
- [x] 对 OpenCode 不提供的 OS sandbox、网络和上下文压缩能力明确标记为 `unknown`/`runtime-managed`，不伪装成 Codex 等价能力。
- [x] `packages/app` 类型检查通过（2,397 files），Policy/Runtime 测试 6/6 通过。

### 执行记录（2026-11-14，会话时间线与命令面）

- [x] 桌面会话主区恢复使用生产 `MessageTimeline`，统一承载用户消息、助手正文、工具事件、审批、变更、计划/压缩等真实 Session 记录；移除临时卡片式 `CodeAIRunCenter`，避免继续堆叠玩具化 UI。
- [x] Composer 保持独立底部布局，时间线通过真实 inset 预留空间，正文不会被输入框覆盖。
- [x] 新增 `docs/codeai-command-surface.md`，区分 OpenCode Runtime 已有命令与 CodeAI 需要补齐的目标、计划、定时任务、侧边聊天和代码审查能力。
- [x] `packages/app` 类型检查通过（2,396 files）。
- [ ] 需要在用户本机验证时间线滚动、工具详情展开/收起、审批、计划/压缩事件以及 Composer 的悬停和键盘焦点反馈。

### 执行记录（2026-11-14，长目标执行模型）

- [x] 新增 `docs/codeai-long-running-goals.md`，定义 Goal → Plan → Run → Step → ToolEvent/Approval/Change/Checkpoint 的持久化关系。
- [x] 明确后台调度、心跳租约、恢复、权限持久化、沙盒边界、上下文压缩和 Git 检查点是长目标闭环的基础能力。
- [ ] 基于 OpenCode SessionExecution/Permission/Compaction/Git API 设计 Goal、Plan、Schedule、Checkpoint 的实验性 Schema/Server 契约。

### 执行记录（2026-11-14，多会话协作与沙盒边界）

- [x] 根据 Codex 官方公开资料补充 Local / Remote / Hybrid 三种执行环境边界：Codex Cloud 使用 OpenAI 管理的隔离机器，本地模式仍可使用 Windows 原生或 WSL 沙盒。
- [x] 新增 `docs/codeai-session-collaboration.md`，定义 Coordinator/Worker/Reviewer/Observer 会话角色、持久化消息协议、幂等投递和跨 Worktree 变更审批。
- [ ] 为多会话协作增加 durable inbox、任务租约、子任务恢复和 Artifact/Change 引用的实验性 Server 契约。

### 执行记录（2026-11-14，连续发送）

- [x] 从 OpenCode Composer/Session inbox 实现确认当前底层已支持工作中连续发送：`steer` 立即引导当前 Run，`queue` 排队后续输入，不需要停止当前执行。
- [x] 将连续发送约束写入命令面设计：CodeAI 输入框在运行中不能被禁用，必须显示当前 delivery 状态和队列反馈。
- [ ] 桌面冒烟时验证运行中的 Enter、Shift+Enter、Steer/Queue 切换和队列编辑行为。

### 执行记录（2026-11-14，Project-Worktree-Session 侧栏）

- [x] 全局侧栏将 Project 下的会话按真实 Worktree inventory 和 Session location 分组显示，形成 Project → Worktree → Session 层级。
- [x] Session 打开时使用所属 Worktree directory；拖动和上下文菜单仍调用真实 `session.move`。
- [x] `packages/app` 类型检查通过（2,396 files）。
- [x] 重新执行 Desktop build、Windows unpacked build 和 NSIS 打包，最新安装包已生成。
- [ ] 用户本机仍需验证 Worktree 展开、跨项目拖动、右侧 Artifact 显隐和悬停状态。

### 执行记录（2026-11-14，验证流程调整）

- [x] 确认日常 UI 验证改为 Web 开发服务器优先，不以 Windows 安装包作为前置条件。
- [x] Web 入口 `packages/app/index.html` 和生产路由可由 Vite 开发服务器返回；当前服务地址为 `http://127.0.0.1:3000/`。
- [ ] 继续在网页开发模式验证 Project → Worktree → Session、Run 时间线、Composer 和 Artifact pane 后，再进入 Electron 开发模式。
- [ ] 发布候选版本才重新生成 Windows 安装包并做安装后冒烟。
