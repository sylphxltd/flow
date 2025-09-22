# Modular AI Development Rules

This repository provides modular development rules for AI development agents. Each rule file is self-contained and can be used independently or combined based on project needs.

## Project Objective

Provides modular development rules that AI agents use to generate consistent, high-quality code across different projects and technology stacks.

Rules are designed to be:
- Modular: Each rule file is independent and can be used separately
- Composable: Different projects can combine different sets of rules
- Tool-Agnostic: Rules don't enforce specific tools, allowing flexibility
- Self-Contained: Each file can be understood without external references

## Rule Creation Principles

### Core Philosophy
- Modularity First: Each rule file must be completely independent and self-contained
- Tool Compatibility: Rules guide usage patterns but don't mandate specific tools
- Composable Design: Rules should work together without conflicts
- AI-Friendly: Written specifically for AI development agents to understand and apply

### File Structure Rules
- Precise Globs: Each file specifies exact file patterns it applies to
- Clear Scope: Description clearly defines the file's purpose and boundaries
- No Dependencies: Files don't reference or depend on other rule files
- Guideline Focus: Rules are guidelines, not hard requirements

### Content Guidelines
- Framework Agnostic: General principles work across different frameworks
- Technology Neutral: Avoid specifying concrete tools unless absolutely necessary
- Pattern Based: Focus on patterns and best practices, not implementations
- Context Aware: Rules consider when and how to apply patterns

### Writing Rules
- **AI-First**: Rules are written for AI development agents, not humans
- **Concise**: Write key points directly, no unnecessary explanations
- **Practical**: Each rule provides actionable implementation guidance
- **No Emojis**: Remove all emojis and decorative formatting
- **Pattern Focus**: Teach "how to" implement correctly, not "why"
- **Tool Agnostic**: Guide patterns but don't mandate specific tools
- **Modular**: Each file must be usable independently
- **Self-Contained**: No references to other rule files

### Quality Standards
- Self-Contained Reading: Each file can be read and understood independently
- Clear Examples: Rules include practical examples when helpful
- Progressive Enhancement: Rules work from basic to advanced use cases
- Future Proof: Rules remain relevant as technologies evolve

## Quick Start

### One-Click Installation
```bash
# Install to project with one command
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/quick-install.sh | bash
```

### Using npm
```bash
# Install to project
npm create @sylphxltd/rules@latest

# Or clone manually
git clone https://github.com/sylphxltd/rules.git .cursor/rules
```

## Rule Categories

### General (Always Apply)
- **`serena-integration.mdc`** - Serena MCP tool integration for all development tasks
- **`general.mdc`** - Universal development practices, testing, security, performance, code quality
- **`general.mdc`** - Universal development practices, testing, security, performance, code quality

### Language Specific
- **`typescript.mdc`** - TypeScript language rules (if using TS)

### Framework Specific
- **`react.mdc`** - React framework rules + signals patterns (if using React)
- **`sveltekit.mdc`** - SvelteKit framework rules + Svelte 5 runes (if using SvelteKit)
- **`flutter.mdc`** - Flutter framework rules + signals/state management (if using Flutter)

### Tool Specific
- **`biome.mdc`** - Biome linter/formatter rules (if using Biome)
- **`pandacss.mdc`** - PandaCSS type-safe styling rules (if using PandaCSS)
- **`drizzle.mdc`** - Drizzle ORM rules (if using Drizzle)
- **`id-generation.mdc`** - ID generation strategies and best practices (if using databases/Redis)
- **`redis.mdc`** - Redis usage guidelines and reactive streams patterns (if using Redis)
- **`trpc.mdc`** - tRPC rules (if using tRPC)
- **`zustand.mdc`** - Zustand state management rules (if using Zustand)

### Special Purpose
- **`planning-first.mdc`** - Tool-driven planning methodology
- **`ai-sdk-integration.mdc`** - AI SDK streaming and tool patterns


## Installation Options

### Automated Installation Script
```bash
# Download complete installation script
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/install-rules.sh -o install-rules.sh
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

## Quick Selection Guide

### For Any Project
```bash
serena-integration.mdc  # Activate and use Serena for all tasks
general.mdc
```

```bash
general.mdc
```

### For React Projects
```bash
general.mdc
react.mdc          # React framework + signals
typescript.mdc     # (if using TS)
```

### For SvelteKit Projects
```bash
general.mdc
sveltekit.mdc      # SvelteKit framework + runes
typescript.mdc     # (if using TS)
```

### For Flutter Projects
```bash
general.mdc
flutter.mdc        # Flutter framework + signals
```

### For Next.js Full Stack
```bash
general.mdc
nextjs.mdc          # Next.js + recommended type-safe tools
typescript.mdc      # TypeScript language rules
biome.mdc           # Linting and formatting
pandacss.mdc        # Type-safe CSS
drizzle.mdc         # Type-safe database
trpc.mdc            # Type-safe API
zustand.mdc         # Type-safe state
```

### For SvelteKit Full Stack
```bash
general.mdc
sveltekit.mdc       # SvelteKit + recommended type-safe tools
typescript.mdc      # TypeScript language rules
biome.mdc           # Linting and formatting
pandacss.mdc        # Type-safe CSS
drizzle.mdc         # Type-safe database
trpc.mdc            # Type-safe API
```

## Rule Priority System

- Essential - Always apply to all projects
- Framework - Apply based on framework used
- Tool - Apply based on specific tools used

## Usage Tips

1. Start Simple - Begin with general.mdc
2. Add Framework - Include your framework-specific rules
3. Layer Tools - Add additional tool-specific rules as needed
4. Mix & Match - Combine framework + tools based on your project needs

## Simple Commands

### Quick Installation Commands
```bash
# Next.js project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/install-rules.sh | bash -s -- --nextjs

# SvelteKit project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/install-rules.sh | bash -s -- --sveltekit

# React project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/install-rules.sh | bash -s -- --react

# Flutter project
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/install-rules.sh | bash -s -- --flutter

# Minimal installation (any project)
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/install-rules.sh | bash -s -- --minimal
```

### One-Click Installation
```bash
# Auto-detect project type and install appropriate rules
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/quick-install.sh | bash
```

### Update Rules
```bash
# Update installed rules
cd .cursor/rules && git pull origin main
```

## Maintenance & Contribution

### Rule Maintenance Principles
- Regular Review: Rules should be reviewed and updated as technologies evolve
- Self-Contained: Each rule file remains independently understandable
- Modular Updates: Changes to one file don't break others
- AI Compatibility: Rules remain compatible with AI development workflows

### Adding New Rules
1. Assess Need: Ensure the rule addresses a genuine development need
2. Check Scope: Define precise globs and ensure no overlap with existing files
3. Tool Agnostic: Avoid mandating specific tools unless absolutely necessary
4. Self-Contained: New files must be completely understandable on their own
5. Test Integration: Verify the rule works with existing combinations

### Rule Quality Checklist
- File has clear, descriptive title (no unnecessary introduction text)
- Precise globs defined for applicable file patterns
- Content is tool-agnostic and pattern-focused
- No dependencies on other rule files
- Can be understood without external context
- Written for AI agents: concise, practical, actionable
- No emojis or decorative formatting
- Each rule teaches "how to" implement correctly
- Examples are practical and helpful when included
- Rules remain relevant as technologies evolve

## Further Reading

- Rule File Format - Understanding rule file structure
- Installation Scripts - Automated rule installation and management
- Contributing Guidelines - How to contribute new rules