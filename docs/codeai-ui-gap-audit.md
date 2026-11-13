# CodeAI 生产 UI 差距审计

日期：2026-11-14

这份审计以 `packages/app` 的真实路由、ServerSDK、Session 事件流和 SideRegion 为准。`ui-prototype/codex-v4.html` 只保留为历史视觉参考，不再作为交互或布局基线。

## 已确认的问题

### 1. 导航层级重复

原型同时展示全局侧栏、Project、Worktree、Session 和最近会话，导致同一个 Session 有多个入口。生产壳应只保留一条清晰层级：

```text
全局导航 → Project → Worktree → Session
```

生产实现已经接入真实 Project、Worktree 和 Session 数据；下一步需要补充选中态、折叠态和跨 Worktree 切换后的状态保持。

### 2. 中间区不应是聊天记录

代码 Agent 的核心对象是 Task、Run、Tool、Approval、Changes 和 Result。聊天消息只能作为结果来源，不能继续承担主布局。

生产桌面路由现在使用真实 `MessageTimeline`：任务、用户输入、助手结果、工具事件、审批、变更、计划和压缩事件都来自 Session history/event stream。临时的卡片式 `CodeAIRunCenter` 已删除，避免用简化卡片替代生产时间线。

### 3. Composer 必须是稳定的底部工作区

Composer 需要始终固定在中间区底部，使用真实 prompt、interrupt、model selection 和输入状态。工具详情、变更和审批展开时不能推动 Composer 跳动。

现有 Composer 仍由 OpenCode 生产组件提供，外层使用真实底部布局和 timeline inset；其 prompt、interrupt、model selection、steer/queue 和输入状态机保持由生产组件管理。

### 4. Artifact 不是常驻抽屉

右侧区域必须由真实文件、预览、变更或日志 Tab 驱动：没有活动 Tab 时隐藏，有 Tab 时显示，并且可以独立关闭、恢复和全屏。

现有 SideRegion 已经具备无 Tab 自动隐藏和独立切换能力，支持文件/预览/日志等插件 Tab、独立关闭、恢复和面板全屏入口。生产包静态审计确认 `session-side-panel` 和 `MessageTimeline` 已进入最新交付；全屏及文件级 Tab 仍需用户手动冒烟验证。

### 5. 品牌泄露不能只修窗口标题

Splash、错误页、远程连接页、Provider 图标、Provider 标签和安装后的 CLI 资源都属于用户可见启动链路。品牌修正必须同时覆盖：

- CodeAI Splash 和错误页
- CodeAI 远程连接入口
- CodeAI Provider/Model 标签
- 安装包中的 `CodeAI.exe` 和 `resources/opencode-cli.exe`

内部协议、包名、兼容命令和路径可以继续使用 OpenCode 名称，但不能把它们直接当作产品品牌展示。

## 当前生产结构

```text
Global Shell
├── Project → Worktree → Session navigator (SidebarOrganized)
└── SessionScreenView
    ├── CodeAI Session Context
    ├── MessageTimeline（桌面和移动端共用生产时间线）
    ├── 真实 Composer（底部布局 + steer/queue）
    └── SideRegion Artifact workbench（独立 Tab/显隐）
```

## 后续改造顺序

1. 完成 Project、Worktree、Session 的选中态、折叠态和跨 Session 切换验证。
2. 在生产 MessageTimeline 中确认审批操作和变更入口保持默认折叠。
3. 调整 Composer 外层布局，确保模型选择器、发送按钮和输入区符合 Codex 交互。
4. 补齐 Artifact 文件级 Tab、全屏和恢复状态。
5. 用全新安装包完成一次真实任务闭环，再决定是否结束第一版目标。

## 验证阶梯

日常 UI 开发不依赖 Windows 安装包。验证顺序固定为：

1. **Web 开发服务器**：在 `packages/app` 运行 `bun run dev --host 0.0.0.0`，验证 Project → Worktree → Session 导航、时间线、Composer、折叠事件和右侧 Artifact pane。桌面内置浏览器优先使用终端显示的 Network 地址；只绑定 `127.0.0.1` 时，隔离浏览器可能无法访问。
2. **Electron 开发模式**：运行 `packages/desktop` 的 `bun run dev`，验证窗口、IPC、内置 CLI 和独立 pane；这一步不生成安装包。
3. **发布构建**：只有发布候选版本才运行 `packages/desktop` 的 `bun run build` / `bun run pack`，检查安装后的资源路径、品牌和 CLI 启动。

安装包不能替代前两层验证；它只封装已经在 Web 和 Electron 开发模式中验证过的源码。

## Codex 风格一致性硬约束

这些约束优先于静态截图的像素相似度。任何新增 UI 如果违反其中一条，视为生产壳回退：

- 桌面中间区不能以普通聊天气泡作为主布局；必须使用包含任务/Run/工具事件/审批/变更的生产时间线。
- 左侧只表达 Project → Worktree → Session 层级，不重复堆叠最近会话和全局设置。
- 时间线默认只显示任务、当前状态、结果和 Composer；工具、审批、变更详情按行折叠。
- Tool、Approval、Changes 默认折叠；Approval 展开后必须调用真实 Permission API。
- Composer 固定在中间区底部，模型选择属于 Composer 发送区的一部分。
- Artifact 右侧没有活动 Tab 时隐藏；打开后可以独立关闭、恢复和全屏。
- 用户可见启动链路、错误页、连接页、Provider 标签和安装包必须使用 CodeAI 品牌。

OpenCode 只保留为 Runtime、ServerSDK、协议和插件兼容层，不再决定桌面产品的主视觉结构。
