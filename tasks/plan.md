# OpenCode Fork 第一版开发计划

> 计划已升级为产品级路线。系统边界、控制面、执行面、权限、审计、可靠性和评估要求以 [docs/product-architecture.md](../docs/product-architecture.md) 为准。本文的桌面和多模型任务属于客户端落地轨道，不能替代产品级系统设计。

## Overview

基于 `anomalyco/opencode` 构建一个可独立发布的桌面代码智能体。第一版优先完成 Windows 桌面应用和多模型接入，保留 OpenCode 已有的 Agent Loop、文件操作、命令执行、会话和权限能力。模型接入先覆盖 OpenAI-compatible API、Anthropic 原生 API 和本地 Ollama/LM Studio 端点。第一版暂不建设云端账号、团队协作、计费、远程执行和模型市场。

## UI 基线冻结

当前 `ui-prototype/product.html` 作为第一版交互基线，后续实现以领域对象和状态机为准，不再继续堆叠展示性卡片。

- 全局导航、项目、Worktree、会话和设置分层；项目树表达 `Project → Worktree → Session`。
- 中间区以 `Task → Run status → Composer` 为主，工具步骤、命令输出、Changes 和 Approval 默认折叠，点击 Run 标题展开。
- Composer 是连续的圆角输入面板，没有内部横向分割线；输入区自动调整高度，默认最小高度 62px，最大高度 180px。
- `Enter` 发送，`Shift+Enter` 换行；模型选择固定在发送按钮左侧，弹出面板支持模型、推理强度和自定义模型。
- 自定义模型配置必须包含 Provider、Base URL、Model ID、API Key、连接测试和保存状态。
- 右侧 Artifacts 是独立持久工作区，默认隐藏；无活动 Tab 时不占布局，有 Files/Changes/Preview/Logs 时按需显示，可独立关闭或全屏。
- 产物入口不预置空的四类 Tab：会话事件产生文件、变更、预览或日志后才创建对应入口，并自动切换到新产物；打开多个文件时以文件为粒度创建预览 Tab，关闭后回到最近活动 Tab。
- 左侧项目导航与右侧 Artifacts 独立控制显示/隐藏，不能互相覆盖中间区。
- 视觉验收优先参考 Codex/Cursor 类代码智能体的 Composer：单一输入面、底部轻量控制带、模型紧邻发送按钮。

官方资料校验：OpenAI 文档说明桌面端可在聊天旁预览生成的文档、演示文稿、表格、PDF 和 HTML，并支持预览/源视图切换；Git 项目中的变更面板按仓库状态自动显示变更，而不是只显示智能体最后一轮修改。实现时以“产物事件驱动显示、Git 状态驱动 Changes、文件 tab 驱动预览”为准。

## Architecture Decisions

- **保留 OpenCode 的 Electron 桌面层**。仓库已有 `packages/desktop`，第一版不引入 Tauri，避免同时更换桌面运行时和业务框架。
- **沿用 OpenCode 的 monorepo 分层**。桌面壳使用 `packages/desktop`，主界面使用 `packages/app`，共享组件使用 `packages/ui`，会话界面使用 `packages/session-ui`，服务端使用 `packages/server`，模型协议使用 `packages/llm` 与 `packages/schema`。
- **模型配置从 Agent Loop 中隔离**。统一保存 provider、model、endpoint、认证方式和能力声明，Agent Loop 只依赖规范化的 LLM 请求和事件。
- **第一版使用本地优先模式**。项目目录、会话、模型配置和密钥均在本机处理，远程 API 只接收发送给模型的请求。
- **上游同步优先于大规模重写**。保留 `upstream` remote，把品牌、设置页、provider 配置和桌面体验放在产品层，减少后续合并成本。
- **Windows 先行，保持跨平台构建**。验收先以 Windows 安装包和 Windows 本地工作区为准，同时保留 macOS/Linux 的打包入口。

## 第一版用户流程

1. 用户启动桌面应用。
2. 用户选择一个本地项目目录。
3. 用户在设置页添加 provider 和模型。
4. 用户点击连接测试，看到明确的成功或失败原因。
5. 用户创建会话并提出代码任务。
6. 智能体读取项目、调用工具、请求必要的操作确认。
7. 用户查看文件变更、命令输出和测试结果。
8. 用户重新打开应用后可以继续之前的会话。

## 目标项目结构

以下结构描述 fork 后需要维护的边界，实际文件名以 checkout 后的上游代码为准。

```text
opencode/
├── packages/
│   ├── desktop/                 # Electron 主进程、窗口、系统菜单、打包
│   ├── app/                     # 桌面端主界面、路由、设置和会话页面
│   ├── ui/                      # 可复用 UI 组件、主题、交互状态
│   ├── session-ui/              # 会话消息、工具调用、diff 和审批界面
│   ├── server/                  # 本地服务、会话 API、工作区和事件流
│   ├── llm/                     # 规范化 LLM 请求、响应、流式事件和 provider adapter
│   ├── schema/                  # provider、model、session、tool、permission 数据契约
│   ├── opencode/                # Agent 核心和工具执行逻辑
│   └── plugin/                  # provider/plugin 扩展边界
├── sdks/                        # 保留上游 SDK，后续再决定是否暴露自己的 SDK
├── docs/                        # 产品配置、provider 接入和开发文档
├── tasks/                       # 本项目计划和任务清单
└── product/                    # 建议新增，存放品牌、默认配置和产品级能力开关
    ├── branding/
    ├── defaults/
    └── feature-flags/
```

## 首先需要改的模块

### `packages/desktop`

- 替换应用名称、图标、窗口标题和安装包元数据。
- 确认 Windows 开发启动、生产打包和自动更新入口。
- 处理本地服务启动、退出和崩溃重连。
- 约束 Electron 主进程与渲染进程之间的 IPC 边界。

### `packages/app`

- 调整首页和首次启动流程。
- 增加 workspace 选择和最近项目入口。
- 增加 provider 设置页、模型选择器和连接测试反馈。
- 保留并改造会话、计划、工具调用、审批和 diff 展示。

### `packages/session-ui` 与 `packages/ui`

- 统一消息、工具调用、错误、审批和测试结果的视觉状态。
- 增加 provider/model 标识和当前会话模型切换。
- 补充空状态、加载状态、失败状态和重试入口。

### `packages/llm`

- 复核 OpenAI-compatible、Anthropic、Ollama 和 LM Studio 的请求适配。
- 明确流式事件、tool call、usage、错误和取消请求的统一格式。
- 补充 provider 能力声明，例如是否支持工具调用、视觉输入、reasoning 和上下文上限。

### `packages/schema`

- 固化 provider、model、credential reference、session 和 connection test 的数据结构。
- 给配置增加版本号和迁移入口，避免后续字段变化破坏已有用户配置。

### `packages/server` 与 `packages/opencode`

- 保持 Agent Loop 的核心行为。
- 增加 provider 配置读取、连接测试、模型目录刷新和会话级模型选择。
- 检查工作区路径、命令执行权限、审批事件和进程生命周期。

### `packages/plugin`

- 优先使用现有 provider/plugin 扩展点。
- 将独有 provider、内部网关和产品级工具做成可独立测试的插件。
- 暂时不修改核心工具协议来支持单个供应商的特殊字段。

## Task List

### Phase 1: Fork 基线和构建

#### Task 1: 建立 fork 和上游同步边界

**Description:** 创建产品 fork，保留 `upstream` remote，记录当前上游 commit、许可证和构建要求，建立产品分支和变更目录。

**Acceptance criteria:**
- [ ] `upstream` remote 指向 `anomalyco/opencode`。
- [ ] 产品分支可以独立提交并能从上游拉取更新。
- [ ] README 明确产品与 OpenCode 上游的关系和 MIT 许可证信息。

**Verification:**
- [ ] 执行 `git remote -v` 和基础 lint/build 命令。
- [ ] 检查未引入未授权的上游品牌资产。

**Dependencies:** None

**Files likely touched:** `README.md`, `CONTRIBUTING.md`, `product/`, Git metadata

**Estimated scope:** Small

#### Task 2: 跑通桌面开发和打包基线

**Description:** 在 Windows 上启动 OpenCode Desktop，验证 Electron 主进程、本地服务和渲染端的连接，生成一个可安装的开发版安装包。

**Acceptance criteria:**
- [ ] `packages/desktop` 可以启动开发模式。
- [ ] 应用可以打开主界面并连接本地服务。
- [ ] 可以生成 Windows 安装包并启动。

**Verification:**
- [ ] 执行上游 desktop README 中的 `bun install`、`bun dev`、`bun run build && bun run package`。
- [ ] 手动启动安装包并创建一个空会话。

**Dependencies:** Task 1

**Files likely touched:** `packages/desktop/`, 根目录构建配置

**Estimated scope:** Medium

### Checkpoint: 基线

- [ ] 桌面应用可以启动。
- [ ] 安装包可以生成并打开。
- [ ] 上游测试和构建没有因为产品改动失败。

### Phase 2: 产品壳和本地工作区

#### Task 3: 完成品牌和首次启动流程

**Description:** 替换应用名称、图标和默认主题，增加首次启动时的 workspace 选择，并让用户可以从最近项目进入。

**Acceptance criteria:**
- [ ] 安装包、窗口标题、菜单和启动页使用产品名称。
- [ ] 首次启动可选择本地目录。
- [ ] 最近使用的目录可以重新打开。

**Verification:**
- [ ] 清空本地测试配置后启动应用，完成首次启动流程。
- [ ] 重启应用，确认最近项目记录正确。

**Dependencies:** Task 2

**Files likely touched:** `packages/desktop/`, `packages/app/`, `packages/ui/`, `product/branding/`

**Estimated scope:** Medium

#### Task 4: 验证工作区、权限和命令执行

**Description:** 用一个真实项目验证文件读取、搜索、编辑、命令执行、审批和取消操作，明确第一版默认权限策略。

**Acceptance criteria:**
- [ ] 智能体只能在用户选择的工作区内修改文件。
- [ ] 需要确认的命令会在界面展示并等待用户决定。
- [ ] 取消任务后子进程和流式请求可以结束。

**Verification:**
- [ ] 手动完成一个“修改代码并运行测试”的任务。
- [ ] 测试拒绝命令、取消任务和测试失败三种路径。

**Dependencies:** Task 2, Task 3

**Files likely touched:** `packages/server/`, `packages/opencode/`, `packages/session-ui/`, `packages/app/`

**Estimated scope:** Large，实施时拆成权限和生命周期两个子任务

### Phase 3: 多模型接入

#### Task 5: 固化 provider 和 model 数据契约

**Description:** 以现有 schema 和 LLM 核心为基础，明确 provider、model、凭据引用、API 类型、endpoint、能力和上下文上限的数据结构。

**Acceptance criteria:**
- [ ] 一个配置可以描述 OpenAI-compatible provider。
- [ ] 一个配置可以描述 Anthropic provider。
- [ ] 配置中不保存明文密钥，只保存安全存储引用或环境变量引用。
- [ ] 配置结构有版本字段和迁移入口。

**Verification:**
- [ ] 为配置读写和迁移添加单元测试。
- [ ] 用无效 endpoint、缺少模型 ID 和缺少凭据覆盖校验错误。

**Dependencies:** Task 2

**Files likely touched:** `packages/schema/`, `packages/llm/`, `packages/server/`

**Estimated scope:** Medium

#### Task 6: 完成 provider 设置和连接测试

**Description:** 在桌面设置页增加 provider 表单、模型表单和连接测试，支持用户添加自定义 endpoint。

**Acceptance criteria:**
- [ ] 用户可以添加、编辑、删除 provider。
- [ ] 用户可以配置 API 类型、Base URL、模型 ID 和凭据。
- [ ] 连接测试返回可理解的成功、认证失败、模型不存在、工具调用不兼容和网络错误。

**Verification:**
- [ ] 使用一个 OpenAI-compatible 端点完成连接测试。
- [ ] 使用 Ollama 或 LM Studio 本地端点完成连接测试。
- [ ] 使用错误 key 和错误 URL确认错误显示。

**Dependencies:** Task 5

**Files likely touched:** `packages/app/`, `packages/ui/`, `packages/server/`, `packages/schema/`

**Estimated scope:** Large，实施时拆成配置表单和连接测试两个子任务

#### Task 7: 完成会话级模型选择和流式事件适配

**Description:** 允许用户在新会话和已有会话中选择模型，统一文本流、tool call、tool result、usage、错误和取消事件。

**Acceptance criteria:**
- [ ] 新会话可以选择已配置的 provider/model。
- [ ] 会话中显示当前模型，并支持安全切换。
- [ ] OpenAI-compatible 和 Anthropic 流式响应都能驱动同一套会话 UI。
- [ ] tool call 事件可以继续驱动现有工具执行流程。

**Verification:**
- [ ] 分别使用两个 provider 完成同一项代码任务。
- [ ] 测试流式中断、工具调用失败和模型返回格式错误。

**Dependencies:** Task 5, Task 6

**Files likely touched:** `packages/llm/`, `packages/opencode/`, `packages/session-ui/`, `packages/app/`

**Estimated scope:** Large，实施时拆成 provider 适配和会话选择两个子任务

### Checkpoint: 多模型闭环

- [ ] 至少两个不同 provider 可以完成同一项代码任务。
- [ ] 工具调用和审批在两个 provider 上行为一致。
- [ ] provider 错误不会破坏会话状态。

### Phase 4: 会话、diff 和发布质量

#### Task 8: 完成会话恢复和本地配置持久化

**Description:** 保存会话、工作区、选择的模型和用户设置，支持应用重启后继续会话。

**Acceptance criteria:**
- [ ] 应用重启后能看到历史会话。
- [ ] 会话恢复后可以继续发送任务。
- [ ] 删除 provider 或 workspace 后不会破坏历史会话的展示。

**Verification:**
- [ ] 完成任务、关闭应用、重启并继续任务。
- [ ] 测试配置迁移和损坏数据的恢复提示。

**Dependencies:** Task 3, Task 7

**Files likely touched:** `packages/server/`, `packages/schema/`, `packages/app/`, `packages/session-ui/`

**Estimated scope:** Medium

#### Task 9: 完成 diff、测试结果和任务总结

**Description:** 让用户能从会话中查看变更文件、命令输出、测试结果和最终总结，形成代码任务的闭环。

**Acceptance criteria:**
- [ ] 用户可以按文件查看 diff。
- [ ] 命令输出和测试结果按步骤展示。
- [ ] 任务结束时显示修改文件、测试状态和失败原因。

**Verification:**
- [ ] 完成一个包含修改、测试失败和修复的完整任务。
- [ ] 手动检查大输出、空 diff 和二进制文件的显示行为。

**Dependencies:** Task 4, Task 7

**Files likely touched:** `packages/session-ui/`, `packages/ui/`, `packages/app/`, `packages/server/`

**Estimated scope:** Medium

#### Task 10: 发布前验证和文档

**Description:** 建立 Windows 安装包的冒烟测试、provider 接入文档、隐私说明和故障排查流程。

**Acceptance criteria:**
- [ ] 全新机器或干净用户目录可以安装并启动。
- [ ] 文档覆盖自定义 provider、密钥存储、工作区权限和日志位置。
- [ ] 发布包不包含测试 key、开发 endpoint 或内部调试配置。

**Verification:**
- [ ] 执行单元测试、类型检查、构建和桌面 E2E 冒烟测试。
- [ ] 在 Windows 上从安装到完成一次代码任务。

**Dependencies:** Task 8, Task 9

**Files likely touched:** `packages/desktop/`, `packages/app/`, `docs/`, CI 配置

**Estimated scope:** Medium

### Checkpoint: 第一版完成

- [ ] Windows 安装包可以从全新环境启动。
- [ ] 至少两个 provider 可以执行代码任务。
- [ ] 会话可以恢复，diff 和测试结果可查看。
- [ ] 权限拒绝、网络错误和模型错误都有可理解的反馈。
- [ ] 没有遗留测试密钥和开发配置。

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 上游变更频繁 | High | 固定一个可验证的上游基线，保持 `upstream` remote，每个产品特性单独提交 |
| provider 行为差异 | High | 通过 `packages/llm` 规范化事件和能力，给每个 provider 做契约测试 |
| 桌面端与本地服务生命周期不一致 | High | 先定义启动、重启、退出和取消协议，再做 UI 入口 |
| 明文密钥泄露 | High | 使用现有 OS 安全存储能力，日志和错误中统一脱敏 |
| 大范围修改核心 Agent | High | 优先使用 provider、plugin、schema 和 UI 扩展点，核心修改必须附回归测试 |
| 打包后路径和权限变化 | Medium | 在开发模式和安装包中分别运行工作区、命令执行和 provider 冒烟测试 |

## Open Questions

- 第一版是否只支持 Windows，还是同时发布 macOS/Linux 安装包。
- 第一批默认 provider 是否确定为 OpenAI-compatible、Anthropic 和 Ollama。
- 产品是否需要登录账号，还是先完全本地运行。
- 是否允许用户配置任意 Base URL，还是先限制为白名单 provider。
- 是否需要把 OpenCode 的 CLI 和 VS Code SDK 一并保留在第一版。

## Codex Runtime 接入增量计划

v4 原型已经验证了桌面宿主的空间关系，但原型里的运行记录仍是静态示例。下一阶段只把真实 Runtime 接入到投影层，再逐步替换 UI 数据源，避免视觉层直接依赖底层事件细节。

### Slice A: Session 事件投影

- [x] 新增 `CodexActivityState`，以 Session ID 为边界维护运行状态、工具步骤、审批请求和产物入口。
- [x] 将 `session.execution.*`、`session.tool.*`、`permission.*`、`filesystem.changed` 和消息流事件映射为稳定的 UI 状态。
- [x] 为投影 reducer 添加事件顺序、重复事件和跨 Session 隔离测试。

**完成标准：** 给定真实 `OpenCodeEvent` 序列，可以还原当前 Run 状态和待审批项；不新增协议字段。

### Slice B: 真实 Session/Project 数据源

- [ ] 用现有 `ServerSDK` 的 project/session/workspace 查询替换 v4 中的静态项目和会话数据。
- [ ] 用当前会话模型和权限状态替换右侧 Context 示例。
- [ ] 让 Composer 提交直接调用现有 Session prompt/interrupt API。

**完成标准：** 从真实项目进入会话后，左侧层级、中间标题和 Composer 上下文来自同一个 ServerSDK。

### Slice C: Artifacts 按事件和 Tab 驱动

- [ ] 文件、变更、预览和日志只在真实产物出现后创建入口。
- [ ] 打开文件创建文件级 Tab，右侧工作区无活动 Tab 时自动隐藏。
- [ ] 保留独立关闭、恢复和全屏状态，不占用中间会话布局。

### Checkpoint: Runtime 第一条闭环

- [ ] 真实 Session 可以提交一条 prompt。
- [ ] UI 能显示 execution、tool、permission 和文件变化事件。
- [ ] 右侧工作区能由产物事件显示/隐藏，隐藏后中间区域自动扩展。
- [ ] `packages/app` 类型检查和针对性测试通过。

