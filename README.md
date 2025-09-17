# Type-Safe Development Rules

Modern, type-safe development practices for Next.js, SvelteKit, and Flutter. All recommended tools emphasize type safety and developer experience.

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