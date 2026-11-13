# OpenCode Fork 第一版任务清单

> 产品级系统总设计见 [docs/product-architecture.md](../docs/product-architecture.md)。以下清单先完成基础模块和接口，再进入 UI。

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

## 逆向分析推进（2026-11-13）

- [x] R1：提取 Codex Windows MSIX、`app.asar`、Electron 入口和运行时组件清单。
- [x] R2：确认 Project、Worktree、Session、Composer、Model、Permission、Artifact 和 Change 的静态状态线索。
- [x] R3：确认 App Server 的 stdio 边界、Thread/Turn/Model/FS/Hook/Permission/MCP 方法和一次 Turn 的调用顺序。
- [x] R4：确认 Git watcher、独立 Runtime bundle、App Host、Git Worker、浏览器侧边栏和 MCP 沙箱 IPC 边界。
- [x] R5：建立 Codex 观察项到 CodeAI 类型化投影和 Runtime Adapter 的映射。
- [x] R6a：从运行日志补采 `mcpServer/tool/call` 和 `mcpServer/elicitation/request` 的路由信封与接受响应。
- [ ] R6b：在可控测试项目中补采命令执行、审批、文件变更、预览 Tab 和模型切换的 payload。
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

## Checkpoint: 第一版完成

- [ ] Windows 安装包可以从全新环境启动
- [ ] 至少两个 provider 可以执行代码任务
- [ ] 会话可以恢复，diff 和测试结果可查看
- [ ] 权限拒绝、网络错误和模型错误有清晰反馈
- [ ] 发布包没有测试密钥和开发配置
