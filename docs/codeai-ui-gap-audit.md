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

生产桌面路由已切换到 `CodeAIRunCenter`：任务和结果默认显示，Runtime 详情默认折叠；移动端暂时保留原时间线以避免破坏窄屏交互。

### 3. Composer 必须是稳定的底部工作区

Composer 需要始终固定在中间区底部，使用真实 prompt、interrupt、model selection 和输入状态。工具详情、变更和审批展开时不能推动 Composer 跳动。

现有 Composer 仍由 OpenCode 生产组件提供，下一步只调整其布局容器和模型选择位置，不复制一套新的输入状态机。

### 4. Artifact 不是常驻抽屉

右侧区域必须由真实文件、预览、变更或日志 Tab 驱动：没有活动 Tab 时隐藏，有 Tab 时显示，并且可以独立关闭、恢复和全屏。

现有 SideRegion 已经具备无 Tab 自动隐藏和独立切换能力，生产冒烟已验证预览 Tab 的显示、隐藏和恢复。全屏及文件级 Tab 仍需补验证。

### 5. 品牌泄露不能只修窗口标题

Splash、错误页、远程连接页、Provider 图标、Provider 标签和安装后的 CLI 资源都属于用户可见启动链路。品牌修正必须同时覆盖：

- CodeAI Splash 和错误页
- CodeAI 远程连接入口
- CodeAI Provider/Model 标签
- 安装包中的 `CodeAI.exe` 和 `resources/opencode-cli.exe`

内部协议、包名、兼容命令和路径可以继续使用 OpenCode 名称，但不能把它们直接当作产品品牌展示。

## 当前生产结构

```text
Session Route
└── CodeAIWorkspaceFrame
    ├── Project / Worktree / Session navigator
    └── SessionScreenView
        ├── CodeAI Session Context
        ├── CodeAI Run Center（桌面）
        ├── 原生 Timeline（移动端兼容）
        ├── 真实 Composer
        └── SideRegion Artifact workbench
```

## 后续改造顺序

1. 完成 Project、Worktree、Session 的选中态、折叠态和跨 Session 切换验证。
2. 在 Run Center 中补齐审批操作和变更入口，保持默认折叠。
3. 调整 Composer 外层布局，确保模型选择器、发送按钮和输入区符合 Codex 交互。
4. 补齐 Artifact 文件级 Tab、全屏和恢复状态。
5. 用全新安装包完成一次真实任务闭环，再决定是否结束第一版目标。

## Codex 风格一致性硬约束

这些约束优先于静态截图的像素相似度。任何新增 UI 如果违反其中一条，视为生产壳回退：

- 桌面中间区不能以聊天气泡时间线作为主布局。
- 左侧只表达 Project → Worktree → Session 层级，不重复堆叠最近会话和全局设置。
- Run Center 默认只显示 Task、当前状态、Result 和 Composer。
- Tool、Approval、Changes 默认折叠；Approval 展开后必须调用真实 Permission API。
- Composer 固定在中间区底部，模型选择属于 Composer 发送区的一部分。
- Artifact 右侧没有活动 Tab 时隐藏；打开后可以独立关闭、恢复和全屏。
- 用户可见启动链路、错误页、连接页、Provider 标签和安装包必须使用 CodeAI 品牌。

OpenCode 只保留为 Runtime、ServerSDK、协议和插件兼容层，不再决定桌面产品的主视觉结构。
