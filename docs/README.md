# Optimized Modular AI Development Rules

This repository serves as the core hub for prompt engineering guidelines, delivering self-contained rule files for AI agents to produce consistent, high-quality code. Select and compose rules modularly to fit project requirements, ensuring ethical, efficient development.

## Core Objectives
Design rules to enable AI agents in generating scalable, maintainable code across stacks. Key principles:
- **Modularity**: Build each file as an independent unit—apply standalone or combine without conflicts.
- **Composability**: Mix rules for custom project needs (e.g., React + TypeScript for web apps).
- **Tool Agnosticism**: Focus on patterns, not specific tools; adapt to user preferences.
- **Self-Containment**: Ensure every file stands alone—no cross-references required.

## Rule Design Principles
Craft rules following these imperatives to ensure AI usability and extensibility. Validate new rules against the quality checklist below.

### Structure and Scope
- Define precise globs at the file start (e.g., `*.tsx` for React components) to target specific patterns.
- State clear scope in the intro: Outline purpose, boundaries, and applicability (e.g., "Applies to frontend routing in SPAs").
- Eliminate dependencies: No references to other files—keep fully self-contained.
- Treat as guidelines: Provide flexible best practices, not rigid mandates; include "adapt as needed" notes.

### Content and Patterns
- Maintain framework agnosticism: Use general principles (e.g., "Separate concerns") applicable across React/Svelte/Flutter.
- Stay technology neutral: Recommend patterns over tools (e.g., "Use code-first schema builders" instead of "Use Pothos").
- Emphasize patterns: Detail "how-to" with examples (e.g., "For state management: Create a hook that subscribes to a store and unsubscribes on unmount").
- Incorporate context: Specify triggers (e.g., "Apply immutability in reducers for concurrent updates").

### AI Optimization
- Write for AI parsing: Use imperative bullets, short sentences, and code snippets for direct application.
- Example: In a testing rule: "Write failing test first: `expect(add(2,2)).toBe(5)`; then implement `function add(a,b){return a+b;}`; refactor for edge cases."

### Quality and Maintenance Standards
- Ensure self-contained readability: Test by reading the file in isolation—does it guide full implementation?
- Include targeted examples: Add code snippets for complex patterns (e.g., 5-10 lines max, with before/after).
- Build progressively: Start with basics (e.g., "Define props"), advance to edges (e.g., "Handle async errors with AbortSignal").
- Design for longevity: Focus on timeless principles (e.g., SRP) over fleeting trends; review annually for relevance.

## Usage Guide

### Quick Installation
Sync rules to your AI agent's directory with one command. Auto-detects environment; supports dry-run for preview.

```bash
# Recommended: Auto-sync
npx github:sylphxltd/rules

# Specify agent
npx github:sylphxltd/rules --agent=cursor    # Targets .cursor/rules/*.mdc (YAML frontmatter)
npx github:sylphxltd/rules --agent=kilocode  # Targets .kilocode/rules/*.md (plain Markdown)
npx github:sylphxltd/rules --agent=roocode   # Targets .roo/rules/*.md (plain Markdown)

# Dry-run preview
npx github:sylphxltd/rules --dry-run
```

Post-sync: Restart agent; verify rules load without errors.

## Rule Categories
Select categories based on project stack. Apply General always; add others as needed. Each file is standalone—compose for your context.

### Essential (Apply Universally)
- **`serena-integration.mdc`**: Integrate Serena MCP tools for task automation (e.g., file reads, command execution).
- **`general.mdc`**: Core practices for security (e.g., parameterized queries), performance (e.g., lazy loading), and quality (e.g., SRP).
- **`testing.mdc`**: Enforce TDD with 100% coverage across unit/E2E; use Vitest/Playwright.

### Language-Focused
- **`typescript.mdc`**: Strict typing rules (e.g., infer types, forbid `any`); apply if using TS/JS.

### Framework-Focused
- **`react.mdc`**: Component patterns, hooks, signals for state (e.g., useSignal for reactivity); for React apps.
- **`sveltekit.mdc`**: Routing, stores, Svelte 5 runes; for SvelteKit projects.
- **`flutter.mdc`**: Widget trees, state management with signals; for mobile Flutter apps.

### Tool-Focused
- **`biome.mdc`**: Linting/formatting configs; enforce in CI for consistency.
- **`pandacss.mdc`**: Type-safe CSS utilities; integrate with TS for styled props.
- **`drizzle.mdc`**: Schema migrations, queries; use for relational DBs.
- **`id-generation.mdc`**: UUID v7 for IDs; apply to entities/sessions.
- **`redis.mdc`**: Streams/PubSub patterns; for caching/notifications.
- **`trpc.mdc`**: End-to-end typesafe APIs; for RPC-style backends.
- **`zustand.mdc`**: Minimal state stores; for React global state.

### Specialized
- **`planning-first.mdc`**: Step-by-step planning with risks/AC before execution.
- **`ai-sdk-integration.mdc`**: Streaming responses, tool calls for AI features.


## Maintenance and Contributions
Maintain rules through regular reviews; contribute via PRs following this process.

### Sync Tool Extension
Extend the npx sync tool for new AI agents modularly:
1. Edit `scripts/sync-rules.js`: Add to `AGENT_CONFIGS` object with keys: name, dir (e.g., '.newagent/rules'), ext ('.md' or '.mdc'), yamlFrontmatter (true/false).
2. Test: Run `npx github:sylphxltd/rules --agent=newagent --dry-run`.
3. Auto-handles: Detection, YAML processing, validation.

Supported agents:
- **Cursor**: `.cursor/rules/*.mdc` (YAML frontmatter for metadata).
- **Kilocode**: `.kilocode/rules/*.md` (plain Markdown).
- **RooCode**: `.roo/rules/*.md` (plain Markdown).

### Adding/Updating Rules
Follow this sequence to ensure quality:
1. **Assess Need**: Confirm it fills a gap (e.g., new framework pattern); check for overlaps.
2. **Define Scope**: Set precise globs (e.g., `src/**/*.tsx`); outline boundaries in intro.
3. **Keep Neutral**: Use patterns over tools (e.g., "Implement lazy queries" not "Use React.lazy").
4. **Ensure Self-Containment**: Write standalone—no external refs; include all examples.
5. **Validate Integration**: Compose with 2-3 existing rules; test AI application (e.g., generate sample code).

### Quality Checklist
- [ ] Descriptive title; no fluff intro.
- [ ] Globs target exact patterns.
- [ ] Tool-agnostic, pattern-driven content.
- [ ] No inter-file dependencies.
- [ ] Standalone comprehension.
- [ ] AI-optimized: Concise imperatives, actionable steps.
- [ ] No emojis/formatting distractions.
- [ ] "How-to" focus with practical examples.
- [ ] Examples: Brief, code-inclusive.
- [ ] Future-proof: Timeless principles.

## Next Steps
- Review [Rule File Format](link-to-format) for structure.
- Explore [Installation Scripts](link-to-scripts) for customization.
- See [Contributing Guidelines](link-to-contrib) for PR process.

## Further Reading

- Rule File Format - Understanding rule file structure
- Installation Scripts - Automated rule installation and management
- Contributing Guidelines - How to contribute new rules