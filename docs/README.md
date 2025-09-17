# Type-Safe Development Rules

Modern, type-safe development practices for Next.js, SvelteKit, React, and Flutter. All recommended tools emphasize type safety and developer experience.

## 🚀 Quick Start

### One-Click Installation (Recommended)
```bash
# Install to project with one command
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/quick-install.sh | bash
```

### Using npm
```bash
# Install to project
npm create @sylphxltd/rules@latest

# Or clone manually
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

### Automated Installation Script
```bash
# Download complete installation script
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/install-rules.sh -o install-rules.sh
chmod +x install-rules.sh

# Run installation
./install-rules.sh --nextjs      # Next.js project
./install-rules.sh --sveltekit   # SvelteKit project
./install-rules.sh --react       # React project
./install-rules.sh --flutter     # Flutter project
./install-rules.sh --minimal     # Minimal installation
./install-rules.sh --all         # Install all rules
./install-rules.sh --interactive # Interactive selection
./install-rules.sh --update      # Update rules
```

### Manual Installation
```bash
# Clone to project
git clone https://github.com/sylphxltd/rules.git .cursor/rules

# Or download specific rules only
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/rules/general.mdc -o .cursor/rules/docs/rules/general.mdc
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
2. **Add Framework** - Include your framework-specific rules (includes recommended type-safe tools)
3. **Layer Tools** - Add additional tool-specific rules as needed
4. **Customize** - Each framework file includes recommended type-safe tools
5. **Mix & Match** - Combine framework + tools based on your project needs

## 💻 Simple Commands

### Quick Installation Commands
```bash
# Next.js project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/install-rules.sh | bash -s -- --nextjs

# SvelteKit project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/install-rules.sh | bash -s -- --sveltekit

# React project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/install-rules.sh | bash -s -- --react

# Flutter project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/install-rules.sh | bash -s -- --flutter

# Minimal installation (any project)
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/install-rules.sh | bash -s -- --minimal
```

### One-Click Installation (Recommended for Beginners)
```bash
# Auto-detect project type and install appropriate rules
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/docs/scripts/quick-install.sh | bash
```

### Update Rules
```bash
# Update installed rules
cd .cursor/rules/docs && git pull origin main
```