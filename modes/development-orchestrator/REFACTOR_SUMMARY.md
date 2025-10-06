# SDD 流程深度重构总结

## 重构日期
2025-10-06

## 重构目标

根据项目制定者的要求，对 SDD (Spec-Driven Development) 流程进行深度审查和重构，重点解决以下问题：

1. ✅ Mode 文件纯粹作为配置文件，定义每个 mode 的指令和角色
2. ✅ Mode 之间完全隔离，无法读取彼此的指令
3. ✅ 提供多模式架构，减少 orchestrator 负担，允许用户配置不同 LLM
4. ✅ 全程 LLM 驱动，人类仅在需要时参与 clarify 或决策
5. ✅ 使用自然语言指令，而非机械化的 schema 解析
6. ✅ 明确项目定位：制定 SDD 流程并提供 LLM 实施方案
7. ✅ Orchestrator 作为人类沟通窗口和流程协调者
8. ✅ 单线程执行模型，通过 attempt_completion 一次性通信

## 架构变更

### 原有架构（单模式）
- **文件**: `custom_mode.yaml`
- **结构**: Orchestrator → Code Mode
- **特点**: 简单，所有工具操作由 Code Mode 执行

### 新增架构（多模式）
- **文件**: `custom_mode.beta.yaml`
- **结构**: Orchestrator → 专门化 Modes
- **专门 Modes**:
  - `sdd-kickoff-beta` (Phase 0) - 需求收集与初始化
  - `sdd-spec-architect-beta` (Phases 1-3) - 规格、澄清、规划
  - `sdd-implementer-beta` (Phases 4, 6) - 任务与实施
  - `sdd-analyst-auditor-beta` (Phase 5) - 分析与审计
  - `sdd-release-manager-beta` (Phase 7) - 发布与归档
  - `sdd-retro-curator-beta` (Phase 8) - 回顾与学习

## 核心设计原则

### 1. Mode 隔离性
- **完全隔离**: 每个 mode 独立运行，无法访问其他 mode 的指令
- **单向通信**: 只能通过 `attempt_completion` 向 orchestrator 回传
- **无隐式状态**: 所有状态存储在 workspace artifacts，而非 session 内存

### 2. 单线程执行模型
```
Orchestrator (准备 brief)
    ↓ new_task
Delegated Mode (执行任务)
    ↓ attempt_completion
Orchestrator (接收结果，决定下一步)
```

- Orchestrator 在委派后暂停
- Delegated mode 完成后必须用 attempt_completion 回传
- 一次只有一个 delegated task 活跃

### 3. 人类沟通策略

**Orchestrator 作为主要窗口**:
- 解释每个阶段的进展
- 向人类报告成果、风险、决策需求
- 使用简单、清晰的语言（非技术术语）

**人类参与时机**:
- Phase 2 澄清无法自行解答的问题
- Phase 7 发布前的最终批准
- Constitution 需要新增或修改原则
- 高风险操作需要确认

### 4. Brief 完整性要求

每个 `new_task` 必须包含：
- `PHASE`: 当前阶段编号
- `SUBPHASE`: 具体子阶段
- `WORKSPACE`: 工作区路径
- `TRACK`: full 或 rapid
- `GOAL`: 具体目标
- `INPUTS`: 需要读取的文件
- `OUTPUTS`: 需要创建/更新的文件
- `VALIDATION`: 退出标准和证据位置
- `CONTEXT`: 进度摘要和历史决策

**禁止**: 模糊指令、缺失字段、假设 mode 能推断信息

### 5. 阻塞处理机制

Delegated mode 遇到问题时必须明确回报：

- `STATUS=Blocked, REASON=MissingBriefFields` → Brief 不完整
- `STATUS=Blocked, REASON=HALT` → Constitution 缺失/需更新
- `STATUS=Blocked, REASON=PolicyViolation` → 违反政策或需要上游修复
- `STATUS=Blocked, REASON=OutOfOrder` → Phase 顺序错误

**严格禁止**:
- 自动回退或猜测
- 假设缺失信息
- 在阻塞状态下修改仓库

## Model 配置

### Mode 专业化设计

每个 mode 针对特定 phases 和计算需求：
- Orchestrator → 流程协调（仅 MCP）
- Kickoff → 初始化和验证
- Spec/Architect → 需求、规划、架构（思考密集）
- Analyst → 分析、一致性检查（思考密集）
- Implementer → 任务分解、TDD 实施（代码密集）
- Release → 发布流程、验证
- Retro → 文档、回顾

### 用户配置能力

**关键理解**：MODEL 选择是用户在运行时配置的，不是 orchestrator 决定的。

Multi-mode 架构允许用户：
- 为每个 mode 配置不同的 LLM（在运行时环境中配置，不在此 repo）
- 根据 phase 特性选择合适的模型
- 在质量和成本间平衡

## 工具权限模型

通过 `groups` 字段定义每个 mode 的工具权限：

- `development-orchestrator-beta`: `mcp`
- `sdd-kickoff-beta`: `mcp`, `read`, `edit`, `command`
- `sdd-spec-architect-beta`: `mcp`, `read`, `edit`
- `sdd-implementer-beta`: `mcp`, `read`, `edit`, `command`, `browser`
- `sdd-analyst-auditor-beta`: `mcp`, `read`, `edit`, `command`
- `sdd-release-manager-beta`: `mcp`, `read`, `edit`, `command`, `browser`
- `sdd-retro-curator-beta`: `mcp`, `read`, `edit`

**关键理解**：Config 文件的 `groups` 字段已经定义了权限，无需在指令中重复"禁止使用XXX"

## 语言设计改进

### 自然语言优先

**之前** (Schema 思维):
```yaml
parameters:
  required: [workspace_id, phase, track]
  optional: [notes]
```

**现在** (自然指引):
```yaml
你负责 Phase 0 的所有工作：
1. 验证 Constitution
2. 工作区初始化
3. 轨道选择
4. Retrospective 检索（可选）
```

### LLM 友好原则

- ✅ 直接说明要做什么，不需要"禁止"列表（config 已定义权限）
- ✅ 用自然语言描述职责和流程
- ✅ 提供上下文和理由，帮助 LLM 理解意图
- ✅ 用例子说明，而非抽象规则
- ✅ LLM 输出就是给用户看的，不需要"人类报告"这种分层概念

## 文档结构

### 维护的文件
1. **development.md** - 人类可读的流程手册（政策源头）
2. **custom_mode.yaml** - 单模式实现
3. **custom_mode.beta.yaml** - 多模式实现（本次新增）
4. **README.md** - 团队共识与架构概览（已更新）

### 同步协议
1. 先更新 `development.md`（政策变更）
2. 镜像到 `custom_mode.yaml`
3. 镜像到 `custom_mode.beta.yaml`（包含专门化指令）
4. 验证对齐性
5. 必要时更新 README

## 关键改进点

### 1. 认知负担分配
- **之前**: Orchestrator 承担所有阶段的细节
- **现在**: 每个专门 mode 处理其领域，orchestrator 专注协调

### 2. 沟通质量
- **之前**: 技术性报告
- **现在**:
  - 阶段进展清晰
  - 成果摘要
  - 影响分析
  - 风险识别
  - 证据链接

### 3. 错误处理
- **之前**: 模糊的失败处理
- **现在**: 明确的阻塞类型和恢复路径

### 4. 灵活性
- **之前**: 单一 LLM 处理所有任务
- **现在**: 用户可为不同 mode 配置不同 LLM（在运行时环境配置）

## 使用场景

### 何时用单模式 (custom_mode.yaml)
- 简单项目
- 预算有限
- 不需要专门优化
- 快速原型

### 何时用多模式 (custom_mode.beta.yaml)
- 复杂项目
- 需要质量优化
- 希望成本控制（不同 phase 用不同 tier）
- 大规模团队协作

## 验证清单

在使用新架构前，确认：

- [ ] 所有 mode 的指令清晰、自包含
- [ ] Brief 格式在 orchestrator 中明确定义
- [ ] 阻塞处理路径完整
- [ ] 人类沟通格式一致
- [ ] 工具权限符合最小权限原则
- [ ] Model tier 路由符合项目需求
- [ ] Constitution 治理流程清晰
- [ ] Merge gates 完整定义

## 后续建议

1. **实战测试**: 在真实项目中测试多模式流程
2. **收集反馈**: 记录 orchestrator 和各 mode 的表现
3. **持续优化**: 基于实际使用调整 tier 路由和指令
4. **文档更新**: 根据使用经验补充最佳实践
5. **知识积累**: 在 retrospective.md 中记录学习

## 核心理解纠正

### 关键认知转变

1. **MODEL 配置不是 orchestrator 的责任**
   - 用户在运行时环境配置每个 mode 使用的 LLM
   - Orchestrator 只负责委派任务，不决定用什么模型
   
2. **Config 即权限定义**
   - `groups` 字段已经明确了工具权限
   - 指令中无需重复"禁止使用XXX"
   
3. **LLM 输出就是给用户看的**
   - 不需要"人类报告"这种分层
   - 所有输出本来就是为了让用户理解

## 总结

这次重构建立了：
1. ✅ **清晰的架构**: 单模式和多模式两种选择
2. ✅ **完全隔离**: Mode 之间无法互访
3. ✅ **清晰沟通**: Orchestrator 作为协调窗口
4. ✅ **灵活配置**: 用户可为不同 mode 配置不同 LLM（运行时）
5. ✅ **自然指令**: 直接说明职责，不用 schema 或"禁止"列表
6. ✅ **严格流程**: 明确的阻塞处理和质量门禁
7. ✅ **单线程模型**: 清晰的控制流

项目现在具备了生产就绪的 SDD 流程定义和两种 LLM 实施方案。