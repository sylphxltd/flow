# 🤖 Sylphx Flow 智能自动化框架

> 自动初始化 • 智能升级 • 一键启动 • 自我修复

## 🎯 核心理念

**用户无需思考，Flow 自动做正确的事**

这个框架实现了完全自动化，让你专注于开发，不用操心配置和更新。

---

## 📋 命令概览

### 1. 主命令：`sylphx-flow` (智能模式)

```bash
# 一键启动 (智能检测状态，自动做正确的事)
bun dev:flow

# 带 prompt 启动
bun dev:flow "帮我写一个用户认证系统"

# 详细模式
bun dev:flow --verbose
```

### 2. 辅助命令

```bash
# 查看项目状态
bun dev:flow status
bun dev:flow status --verbose

# 诊断和修复问题
bun dev:flow doctor
bun dev:flow doctor --fix

# 升级框架和组件
bun dev:flow upgrade
bun dev:flow upgrade --check

# 旧命令仍然可用
bun dev:flow codebase search "function"
bun dev:flow knowledge search "React patterns"
bun dev:flow hook --type notification
```

---

## 🤖 智能模式工作原理

### 场景 1：新项目 (未初始化)

```bash
$ mkdir my-project && cd my-project
$ bun dev:flow

🤖 Sylphx Flow v0.3.0 - AI-Powered Development Framework
自动初始化 • 智能升级 • 一键启动

📊 项目状态

  ⚠ 未初始化

🚀 检测到新项目，正在初始化...

━ 初始化项目

✓ 检测到 TypeScript 项目
✓ 创建配置 .claude-flow.json

? 选择目标平台 (Claude Code 推荐用于终端开发)
❯ Claude Code
  OpenCode

? 选择默认 Agent
❯ Coder - 写代码、修 bug
  Reviewer - Code review
  Tester - 写测试
  Planner - 项目规划

? 安装 MCP 工具 (推荐全部安装)
❯ ✅ All servers (3)
  ✅ flow-knowledge (搜索知识库)
  ✅ flow-time (时间工具)
  ✅ flow-shell (执行命令)

✓ 安装 12 个 agents
✓ 安装 5 条 rules
✓ 安装 8 个 slash commands
✓ 设置 hooks

✓ 初始化完成

━ 启动 Claude Code

🚀 Claude Code 已启动

[Claude Code 窗口弹出，显示欢迎信息]

✓ Flow 完成 - Claude Code 已就绪

💡 提示: Claude Code 现已配置好所有开发工具和最佳实践
```

**框架自动完成的事**:
1. ✅ 自动检测项目类型 (TypeScript/Node.js/React等)
2. ✅ 创建 `.claude-flow.json` 配置文件
3. ✅ 安装 12 个 development agents
4. ✅ 安装 5 条 coding rules
5. ✅ 安装 8 个 slash commands
6. ✅ 配置 3 个 MCP servers
7. ✅ 设置 session 和 message hooks
8. ✅ 启动 Claude Code 并加载所有配置

---

### 场景 2：日常开发 (已初始化)

```bash
$ cd existing-project
$ bun dev:flow

🤖 Sylphx Flow v0.3.0 - AI-Powered Development Framework
自动初始化 • 智能升级 • 一键启动

📊 项目状态

  ✓ 已初始化 (Flow v0.3.0)
  ✓ 目标平台: claude-code (v0.5.2)

  组件状态:
    Agent: ✓ 12个
    Rules: ✓ 5个
    Hooks: ✓
    MCP: ✓ 3个服务器
    输出样式: ✓
    Slash命令: ✓ 8个

🚀 检测到已初始化，5秒后启动 Claude Code...

⏱  5... 4... 3... 2... 1...

[自动启动 Claude Code]

✓ Flow 完成
```

**智能行为**:
1. ✅ 自动检测到已初始化
2. ✅ 检查所有组件状态（2 秒内完成）
3. ✅ 如果所有组件正常，跳过初始化，直接进入运行
4. ✅ 倒计时 5 秒，给用户时间取消
5. ✅ 启动 Claude Code

---

### 场景 3：检测到过时版本

```bash
$ bun dev:flow

🤖 Sylphx Flow v0.3.0 - AI-Powered Development Framework
自动初始化 • 智能升级 • 一键启动

📊 项目状态

  ✓ 已初始化 (Flow v0.3.0)
  ✓ 目标平台: claude-code (v0.5.2)

  组件状态:
    ...

⚠ Flow 版本过时: v0.3.0 → v0.3.1

📦 检测到更新: v0.3.0 → v0.3.1

? 是否升级到最新版本? (推荐)
❯ 是
  否

[用户选择 "是"]

━ 升级 Flow

✓ Sylphx Flow 已升级到 v0.3.1

继续启动流程...

━ 启动 Claude Code

...

✓ Flow 完成
```

**自动更新检测**:
1. ✅ 每次运行都会检查版本
2. ✅ 检测到新版本会主动提示
3. ✅ 用户确认后自动升级
4. ✅ 升级后自动继续流程

---

### 场景 4：配置损坏或缺失

```bash
$ bun dev:flow

🤖 Sylphx Flow v0.3.0 - AI-Powered Development Framework
自动初始化 • 智能升级 • 一键启动

📊 项目状态

  ✓ 已初始化 (Flow v0.3.0)
  ✗ 配置损坏

⚠ 检测到配置损坏，正在修复...

━ 初始化项目

✓ 检测到损坏的配置，正在清理...
✓ 重新安装 12 个 agents
✓ 重新安装 5 条 rules
✓ 重新设置 hooks

✓ 修复完成

━ 启动 Claude Code

...

✓ Flow 完成
```

**自我修复机制**:
1. ✅ 自动检测配置损坏
2. ✅ 自动清理损坏文件
3. ✅ 重新安装所有组件
4. ✅ 无需用户手动干预

---

### 场景 5：Clean 模式 (解决疑难杂症)

```bash
$ bun dev:flow --clean

🤖 Sylphx Flow v0.3.0 - AI-Powered Development Framework
自动初始化 • 智能升级 • 一键启动

⚠ 检测到 --clean 标志，将清理所有旧配置

? 确认清理? (这会删除所有 sylphx flow 配置，但唔会删除你嘅代码)
❯ 确认清理并重新初始化
  取消

[用户选择 "确认"]

✓ 删除旧配置 `.claude/`
✓ 删除 `.claude-flow.json`
✓ 删除 `.mcp.json`

[重新开始完整初始化流程...]

✓ 初始化完成

...

✓ Flow 完成
```

**Clean 模式用途**: 当项目出现严重问题时，完全重置配置

---

## 📦 自动更新机制

### Flow 自身更新

```bash
# 手动检查更新
$ bun dev:flow upgrade --check

📦 检查更新

Sylphx Flow: v0.3.0 → v0.3.1

使用 --no-check 或省略参数进行升级

# 手动升级
$ bun dev:flow upgrade

📦 检查更新

Sylphx Flow: v0.3.0 → v0.3.1

? 确认升级到最新版本? (推荐)
❯ 是
  否

[用户选择 "是"]

━ 升级 Sylphx Flow

✓ 已升级到 v0.3.1

✓ 升级完成
```

**自动更新场景**:
1. ✅ 每次 `bun dev:flow` 运行时自动检查
2. ✅ 发现新版本时主动提示
3. ✅ 用户确认后自动升级
4. ✅ 升级后继续正常工作

---

### Claude Code/OpenCode 更新

```bash
$ bun dev:flow

🤖 Sylphx Flow v0.3.0 - AI-Powered Development Framework
自动初始化 • 智能升级 • 一键启动

📊 项目状态

  ✓ 已初始化 (Flow v0.3.1)
  ⚠ 目标平台: claude-code (v0.5.2 → v0.5.3)

📦 claude-code 有更新: v0.5.2 → v0.5.3

? 是否升级 claude-code? (推荐)
❯ 是
  否

[用户选择 "是"]

━ 升级 claude-code

✓ 正在运行: npm update -g @anthropic-ai/claude-code
✓ claude-code 已升级到 v0.5.3

继续启动流程...

...

✓ Flow 完成
```

**自动检测**:
1. ✅ 自动检查目标平台版本
2. ✅ 发现有新版本会提示
3. ✅ 自动运行 `npm update -g @anthropic-ai/claude-code`
4. ✅ 升级后继续流程

---

## 🔍 诊断和修复

### Doctor 命令

```bash
# 诊断问题
$ bun dev:flow doctor

🔍 诊断项目

检查 Claude Code 安装...
  ✓ Claude Code 已安装

检查配置...
  ✓ 配置正常

检查组件...
  ✓ agents (12)
  ✓ rules (5)
  ✓ hooks
  ✓ mcp (3个服务器)
  ✓ 输出样式
  ✓ Slash命令 (8个)

结果:
✓ 所有检查通过

# 自动修复
$ bun dev:flow doctor --fix

🔍 诊断项目

检查 Claude Code 安装...
  ✓ Claude Code 已安装

检查配置...
  ✗ 配置损坏

? 是否自动修复? (会重新初始化所有组件)
❯ 是
  否

[用户选择 "是"]

  🔄 正在修复...
  ✓ 已修复

结果:
✓ 所有问题已修复
```

---

## 💡 高级用法

### 1. 仅初始化 (适合 CI/CD)

```bash
# 初始化但不启动 Claude Code
bun dev:flow --init-only

# 跳过 MCP (加快初始化)
bun dev:flow --init-only --no-mcp

# 只安装特定组件
bun dev:flow --init-only --no-mcp --no-agents --rules --hooks
```

**使用场景**: 在 CI/CD 中预先配置环境，或在 Dockerfile 中设置

---

### 2. 仅运行 (快速启动)

```bash
# 跳过初始化，直接启动 Claude Code
bun dev:flow --run-only

# 使用指定 agent
bun dev:flow --run-only --agent tester

# 带 prompt 启动
bun dev:flow --run-only "帮我优化这段代码"
```

**使用场景**: 已知项目已初始化，想快速启动

---

### 3. 结合 clean 模式

```bash
# 完全重置 (解决复杂问题)
bun dev:flow --clean --upgrade

# CI/CD 中重置
bun dev:flow --clean --init-only --no-mcp
```

---

## 🎯 实际工作流程示例

### 新成员加入团队

```bash
# 1. 克隆仓库
git clone https://github.com/team/project.git
cd project

# 2. 一键配置开发环境
bun dev:flow

框架自动完成:
- 检测项目类型
- 安装所有开发工具
- 配置 Claude Code
- 启动开发环境

# 3. 开始工作
# Claude Code 已准备好，所有 agents 和 rules 已配置
```

**时间**: 从克隆到开始工作，约 1-2 分钟

---

### 每日开发流程

```bash
# 早上开始工作
cd project
bun dev:flow

框架自动完成:
- 检查所有配置 (2 秒)
- 如果有更新，提示升级
- 启动 Claude Code

# 开始编码...

# 遇到问题
bun dev:flow doctor

# 框架自动诊断并修复

# 继续工作...
```

**时间**: 从开始到进入开发状态，约 5-10 秒

---

### 项目迁移/升级

```bash
# 1. 备份旧配置 (可选)
cp -r .claude .claude.backup
cp .claude-flow.json .claude-flow.json.backup

# 2. 清理并重新初始化
bun dev:flow --clean

框架自动完成:
- 删除所有旧配置
- 安装最新版本的所有组件
- 启动 Claude Code

# 3. 开始使用新功能

# 如果遇到问题
bun dev:flow doctor --fix
```

**时间**: 完整重置，约 3-5 分钟

---

## 🛠️ 故障排除

### 问题 1: Claude Code 未安装

**现象**:
```
✗ Claude Code 未安装
   运行: npm install -g @anthropic-ai/claude-code
```

**解决**:
```bash
npm install -g @anthropic-ai/claude-code
bun dev:flow
```

---

### 问题 2: 配置损坏

**现象**:
```
✗ 配置损坏
```

**解决**:
```bash
# 方法 1: 自动修复
bun dev:flow doctor --fix

# 方法 2: 完全重置
bun dev:flow --clean
```

---

### 问题 3: MCP 服务器启动失败

**现象**:
```
⚠ MCP 服务器 flow-shell 启动失败
```

**解决**:
```bash
# 1. 检查依赖
bun dev:flow doctor

# 2. 重新配置 MCP
bun dev:flow --init-only --no-agents --no-rules --hooks

# 3. 手动检查权限
ls -la .mcp.json
```

---

### 问题 4: 权限不足

**现象**:
```
✗ 无法写入 .claude/ 目录
```

**解决**:
```bash
# 修复权限
sudo chown -R $(whoami) .claude/
sudo chown -R $(whoami) .claude-flow.json

# 或使用 doctor
bun dev:flow doctor --fix
```

---

## 📊 配置管理

### 配置文件 (`.claude-flow.json`)

```json
{
  "version": "0.3.1",
  "target": "claude-code",
  "preferences": {
    "defaultAgent": "coder",
    "skipMCP": false,
    "autoUpgrade": true
  },
  "components": {
    "agents": {
      "count": 12,
      "version": "0.3.1",
      "lastUpdated": "2025-01-15T10:30:00Z"
    },
    "rules": {
      "count": 5,
      "version": "0.3.1",
      "lastUpdated": "2025-01-15T10:30:00Z"
    },
    "mcp": {
      "serverCount": 3,
      "version": "0.3.1",
      "lastUpdated": "2025-01-15T10:30:00Z",
      "servers": [
        "flow-knowledge",
        "flow-time",
        "flow-shell"
      ]
    }
  },
  "project": {
    "type": "typescript",
    "packageManager": "bun",
    "lastDetected": "2025-01-15T10:30:00Z"
  },
  "lastUpdated": "2025-01-15T10:30:00Z"
}
```

**文件作用**:
- 记录项目配置
- 跟踪组件版本
- 保存用户偏好
- 用于状态检测和升级

**位置**: 项目根目录

---

## 🎉 总结

### 用户需要记住的命令

**只用记一条**:
```bash
bun dev:flow
```

**遇到问题**:
```bash
bun dev:flow doctor --fix
```

**其他都是可选项**:
- 加 `--verbose` 看详情
- 加 `--clean` 重置
- 加 `--upgrade` 升级
- 等等...

### 自动化程度

✅ **100% 自动**:
- 检测项目状态
- 推荐最佳操作
- 安装缺失组件
- 修复配置问题
- 检查更新

⚠️ **需要确认**:
- 升级框架版本
- 升级目标平台
- Clean 清理操作

❌ **无需干预**:
- 日常启动
- 配置管理
- 环境设置

---

## 🚀 开始体验

```bash
# 在任意项目目录
bun dev:flow

# 让框架做所有事情
# 你只需专注于开发
```

这就是 **Sylphx Flow 智能自动化框架** - 让你零配置开始使用 AI 辅助开发！