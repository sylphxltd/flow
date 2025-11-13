---
layout: home

hero:
  name: "Sylphx Flow"
  text: "AI-Powered Development Automation"
  tagline: Stop writing prompts. Start building software.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sylphxltd/flow

features:
  - icon: 🔄
    title: Loop Mode
    details: Autonomous continuous execution with automatic context preservation. Claude Code supported.
    link: /features/loop-mode

  - icon: 🤖
    title: AI Agents
    details: Specialized agents (Coder, Reviewer, Writer, Orchestrator) each expert in their domain.
    link: /features/agents

  - icon: 📜
    title: Rules System
    details: Built-in best practices - SOLID, security, testing, performance automatically enforced.
    link: /guide/rules

  - icon: 🔍
    title: Semantic Search
    details: Find code by meaning, not names. StarCoder2 tokenization across 70+ languages.
    link: /features/semantic-search

  - icon: 🔌
    title: MCP Integration
    details: Extended capabilities through Model Context Protocol servers (web search, vision, file ops).
    link: /guide/mcp

  - icon: 📝
    title: File Input
    details: Load prompts from files for complex, reusable instructions. No shell escaping issues.
    link: /features/loop-mode

  - icon: 🧠
    title: Smart Configuration
    details: Learns your preferences - default target, agent, provider. Configure once, use forever.
    link: /guide/getting-started

  - icon: 📖
    title: Knowledge Base
    details: Curated best practices - architecture, security, frameworks. Professionally maintained.
    link: /features/semantic-search

  - icon: ⚡
    title: MEP Architecture
    details: Minimal Effective Prompt - AI adapts to you, not the other way around.
    link: /guide/getting-started
---

## Quick Example

```bash
# Continuous autonomous work (Claude Code)
sylphx-flow "process all github issues" --loop --target claude-code

# With wait time for polling
sylphx-flow "check for new commits" --loop 300 --max-runs 20

# Load prompts from files
sylphx-flow "@complex-task.txt"
```

## Why Sylphx Flow?

**90% less prompt. 100% better code.**

Traditional AI coding tools make you work too hard - spending more time writing prompts than code. Sylphx Flow changes that with autonomous agents that understand your codebase, follow your patterns, and work continuously until you tell them to stop.

## What Makes Flow Different?

### 🤖 Specialized AI Agents
Not a single generic AI, but specialized experts:
- **Coder** - Feature implementation and bug fixes
- **Reviewer** - Code review and security analysis
- **Writer** - Documentation and technical writing
- **Orchestrator** - Complex multi-step tasks

[Learn about Agents →](/features/agents)

### 📜 Built-in Best Practices
Every agent automatically follows:
- SOLID principles and clean code
- OWASP security guidelines
- Testing best practices (TDD approach)
- Performance optimization patterns

[Learn about Rules →](/guide/rules)

### 🔍 Semantic Code Search
Find code by **what it does**, not what it's called:
- StarCoder2 tokenization (70+ languages)
- Natural language queries in any language
- True semantic understanding
- Fast (<100ms) search results

[Learn about Semantic Search →](/features/semantic-search)

### 🔌 MCP Server Integration
Extended capabilities through Model Context Protocol:
- **Web Search** - Real-time information
- **Vision Analysis** - Image and video understanding
- **Code Indexing** - Deep codebase navigation
- **File Operations** - Advanced file manipulation

[Learn about MCP →](/guide/mcp)

### 📖 Curated Knowledge Base
Access professionally maintained best practices:
- Architecture patterns (Microservices, Event-driven, CQRS)
- Security guidelines (OWASP, secure coding)
- Framework guides (React, Vue, Next.js, etc.)
- Testing strategies (Unit, Integration, E2E)

**Zero maintenance** - we keep it up-to-date for you.

## Installation

```bash
# Install from npm
npm install -g @sylphx/flow

# Or with bun (recommended)
bun install -g @sylphx/flow

# Start using (auto-initializes on first use)
sylphx-flow "implement authentication"
```

**Links:**
- 📦 [npm Package](https://www.npmjs.com/package/@sylphx/flow)
- 🐙 [GitHub Repository](https://github.com/sylphxltd/flow)
- 🐦 [Twitter/X @SylphxAI](https://x.com/SylphxAI)

[Get Started →](/guide/getting-started)
