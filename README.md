# Type-Safe Development Rules

Modern, type-safe development practices for Next.js, SvelteKit, React, and Flutter. All recommended tools emphasize type safety and developer experience.

## 🚀 Quick Start

### 一鍵安裝 (推薦)
```bash
# 一鍵安裝到項目
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/quick-install.sh | bash
```

### 使用 npm scripts
```bash
# 安裝到項目
npm create @sylphxltd/rules@latest

# 或手動克隆
git clone https://github.com/sylphxltd/rules.git .cursor/rules
```

## 📁 Rule Categories

### 🌍 General (Always Apply)
- **`general.mdc`** - Universal development practices, testing, security, performance, code quality

### 💻 Language Specific
- **`typescript.mdc`** - TypeScript language rules (if using TS)

### 🏗️ Framework Specific
- **`react.mdc`** - React framework rules + signals patterns (if using React)
- **`sveltekit.mdc`** - SvelteKit framework rules + Svelte 5 runes (if using SvelteKit)
- **`flutter.mdc`** - Flutter framework rules + signals/state management (if using Flutter)

### 🛠️ Tool Specific
- **`biome.mdc`** - Biome linter/formatter rules (if using Biome)
- **`pandacss.mdc`** - PandaCSS type-safe styling rules (if using PandaCSS)
- **`drizzle.mdc`** - Drizzle ORM rules (if using Drizzle)
- **`trpc.mdc`** - tRPC rules (if using tRPC)
- **`zustand.mdc`** - Zustand state management rules (if using Zustand)


## 📦 Installation Options

### 自動安裝腳本
```bash
# 下載完整安裝腳本
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/install-rules.sh -o install-rules.sh
chmod +x install-rules.sh

# 運行安裝
./install-rules.sh --nextjs      # Next.js 項目
./install-rules.sh --sveltekit   # SvelteKit 項目
./install-rules.sh --react       # React 項目
./install-rules.sh --flutter     # Flutter 項目
./install-rules.sh --minimal     # 最小安裝
./install-rules.sh --all         # 安裝所有
./install-rules.sh --interactive # 互動式選擇
./install-rules.sh --update      # 更新規則
```

### 手動安裝
```bash
# 克隆到項目
git clone https://github.com/sylphxltd/rules.git .cursor/rules

# 或只下載特定規則
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/general.mdc -o .cursor/rules/general.mdc
```

## 🎯 Quick Selection Guide

### For Any Project
```bash
🔴 general.mdc
```

### For React Projects
```bash
🔴 general.mdc
🟡 react.mdc          # React framework + signals
🟡 typescript.mdc     # (if using TS)
```

### For SvelteKit Projects
```bash
🔴 general.mdc
🟡 sveltekit.mdc      # SvelteKit framework + runes
🟡 typescript.mdc     # (if using TS)
```

### For Flutter Projects
```bash
🔴 general.mdc
🟡 flutter.mdc        # Flutter framework + signals
```

### For Next.js Full Stack (Type-Safe)
```bash
🔴 general.mdc
🟡 nextjs.mdc          # Next.js + recommended type-safe tools
🟡 typescript.mdc      # TypeScript language rules
🟡 biome.mdc           # Linting and formatting
🟡 pandacss.mdc        # Type-safe CSS
🟡 drizzle.mdc         # Type-safe database
🟡 trpc.mdc            # Type-safe API
🟡 zustand.mdc         # Type-safe state
```

### For SvelteKit Full Stack (Type-Safe)
```bash
🔴 general.mdc
🟡 sveltekit.mdc       # SvelteKit + recommended type-safe tools
🟡 typescript.mdc      # TypeScript language rules
🟡 biome.mdc           # Linting and formatting
🟡 pandacss.mdc        # Type-safe CSS
🟡 drizzle.mdc         # Type-safe database
🟡 trpc.mdc            # Type-safe API
```

## 📋 Rule Priority System

🔴 **Essential** - Always apply to all projects
🟡 **Framework** - Apply based on framework used
🟢 **Tool** - Apply based on specific tools used

## 💡 Usage Tips

1. **Start Simple** - Begin with `general.mdc`
2. **Add Framework** - Include your framework-specific rules (包含推薦的 type-safe 工具)
3. **Layer Tools** - Add additional tool-specific rules as needed
4. **Customize** - Each framework file includes recommended type-safe tools
5. **Mix & Match** - Combine framework + tools based on your project needs

## 💻 Simple Commands

### 快速安裝命令
```bash
# Next.js 項目
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/install-rules.sh | bash -s -- --nextjs

# SvelteKit 項目
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/install-rules.sh | bash -s -- --sveltekit

# React 項目
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/install-rules.sh | bash -s -- --react

# Flutter 項目
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/install-rules.sh | bash -s -- --flutter

# 最小安裝 (任何項目)
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/install-rules.sh | bash -s -- --minimal
```

### 一鍵安裝 (推薦新手)
```bash
# 自動檢測項目類型並安裝合適規則
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/quick-install.sh | bash
```

### 更新規則
```bash
# 更新已安裝的規則
cd .cursor/rules && git pull origin main
```