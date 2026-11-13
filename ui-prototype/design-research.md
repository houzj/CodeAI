# Desktop Coding Agent UI 研究记录

## 研究对象

- [OpenCode](https://github.com/anomalyco/opencode) 作为当前 fork 基础
- [Cline](https://github.com/cline/cline) 作为桌面、IDE 和 CLI 共用智能体
- [Continue](https://github.com/continuedev/continue) 作为多模式、多模型和可配置 agent 参考
- [Aider](https://github.com/Aider-AI/aider) 作为代码库上下文、Git 和验证流程参考
- Roo Code 作为模式和多智能体设计参考，但项目已于 2026 年 5 月归档，不作为实现基础

## 高价值交互模式

### OpenCode

- 桌面应用、CLI 和多 provider 能力已经在同一产品体系内。
- `build` 和 `plan` 是清晰的工作模式，适合把“只分析”和“执行修改”分开。
- Provider、model、custom endpoint 和 provider package 都有独立配置入口。

### Cline

- Plan 和 Act 分离，用户可以先审阅计划，再允许执行。
- 文件编辑和命令执行都提供人机确认。
- Checkpoint 和可回退变更降低了自动修改代码的风险。
- 模型供应商范围广，桌面端和 IDE 端共用 agent core。

### Continue

- Chat、Edit、Agent 和 Autocomplete 是不同工作意图，入口清晰。
- Agent 模式可以读取文件、编辑代码和运行命令。
- 模型、规则、工具和 agent 配置可组合，适合多模型产品。

### Aider

- 代码库地图让智能体先建立项目全局认识。
- Git commit、diff、lint 和 test 形成完整的修改验证闭环。
- 模型选择和代码工作流相对独立，说明模型应该属于会话配置而不是全局设置。

## 对本产品的 UI 决策

1. **模型属于会话**。每个 session 保存 `providerId`、`modelId`、`endpointProfileId` 和能力快照。切换 session 时同步切换模型。
2. **模型选择放在会话头部**。全局顶部只保留项目、账户和应用级操作。模型按钮明确标注 `This session`。
3. **侧边栏显示会话模型**。每个会话标题下面显示 provider 和 model，避免用户误以为所有会话共用一个模型。
4. **第一版只提供 Plan 和 Build**。Plan 只读并生成步骤，Build 允许编辑和执行，Review 等模式后续加入。
5. **审批状态出现在对话流中**。右侧面板用于上下文和汇总，不能成为唯一的审批入口。
6. **Diff、命令输出和测试结果是同一条任务时间线**。用户可以按步骤回看和定位失败点。
7. **Provider 设置独立于对话**。在设置页配置 provider，在会话中选择已配置的模型。
8. **右侧面板可折叠**。默认展示当前 session 的模型、workspace、权限和变更文件，避免压缩主对话区。

## 对当前原型的修正

- 会话列表增加 provider/model 副标题。
- 会话头部增加 `This session · model saved with conversation`。
- 切换会话时同步切换模型、provider 和右侧上下文。
- 切换模型后只更新当前会话，并把选择写回当前 session 的展示状态。
- 后续增加 Plan/Build 切换和基于 checkpoint 的回退入口。

## 第一版暂缓内容

- 多智能体团队视图
- 自动模型路由
- 每条消息独立模型覆盖
- 复杂的 token、价格和性能分析
- 云端会话同步
- 面向企业的审批策略编排

