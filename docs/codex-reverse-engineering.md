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

- Codex 主窗口和 WebView 的实际窗口层级
- Project、Worktree、Session 在运行时的创建和切换顺序
- Composer 的 Enter、Shift+Enter、Plan 和模型选择行为
- 模型选择器的状态来源和会话级持久化字段
- Run、Tool Event、Approval、Change 和 Artifact 的事件顺序
- `codex.exe` 与桌面 App Host 的通信协议
- Git Worker 与 Worktree 创建、清理和上游刷新之间的边界
- 右侧 Files、Changes、Preview、Logs 的显示条件和 Tab 生命周期

## 后续分析顺序

1. 通过 REA Electron runtime capture 获取主进程、窗口、preload 和 IPC 事件。
2. 捕获新建会话、打开项目、切换 Worktree 和发送任务的事件序列。
3. 捕获打开文件、查看变更、审批命令和切换模型的事件序列。
4. 把事件映射到 CodeAI 的标准 `Project`、`Worktree`、`Session`、`Run`、`Approval`、`ChangeSet` 和 `Artifact`。
5. 将确认后的映射转成 CodeAI 的 Runtime Adapter 和 UI 实现任务。
