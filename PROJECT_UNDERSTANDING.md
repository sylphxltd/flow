# Sylphx Flow - Complete Project Understanding

## Overview

**Sylphx Flow** is an AI-powered development platform built on the MEP (Minimal Effective Prompt) architecture. It reduces developer prompt engineering overhead by automatically providing context to AI from your codebase, knowledge base, and environment.

**Core Philosophy**: Stop writing long prompts. AI adapts to you.

## Key Innovations

### 1. MEP (Minimal Effective Prompt) Architecture

Traditional approach requires 500+ word prompts with full context. Sylphx Flow requires 3-10 words.

**How it works:**
- Automatically detects your tech stack
- Searches your codebase for patterns
- Applies curated best practices
- Knows your environment and current time
- Synthesizes context-aware responses

### 2. StarCoder2 Tokenization

First production platform using StarCoder2 for code search:
- Semantic code search across 70+ languages
- Works in any human language (English, Chinese, Japanese, etc.)
- Finds code by what it does, not what it's named
- TF-IDF powered with world-class tokenization

### 3. Dual Search System

**TF-IDF Search (Default)**:
- No API key required
- Fast statistical relevance
- StarCoder2 tokenization
- <100ms search times

**Vector Search (Optional)**:
- Requires OpenAI-compatible API key
- Higher quality semantic search
- LanceDB vector database
- Automatic upgrade when API key detected

### 4. Curated Knowledge Base

**Why curated only:**
- ✅ Professionally maintained
- ✅ Always up-to-date
- ✅ Quality guaranteed
- ✅ Zero maintenance burden
- ✅ Fast (<100ms)

**No custom knowledge**: Your project patterns are in your codebase (use codebase search).

## Architecture

### Project Structure

```
src/
├── index.ts                  # Entry point
├── cli.ts                    # Commander.js CLI
├── ui/                       # Ink-based TUI
│   ├── App.tsx               # Main React component
│   ├── screens/              # Chat, Logs, ModelSelection, etc.
│   ├── components/           # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand state management
│   └── commands/             # UI command definitions
├── commands/                 # CLI command implementations
│   ├── init-command.ts       # Project initialization
│   ├── run-command.ts        # AI task execution
│   ├── code-command.ts       # Interactive chat
│   ├── mcp-command.ts        # MCP server management
│   ├── codebase-command.ts   # Codebase operations
│   ├── knowledge-command.ts  # Knowledge base operations
│   └── functional/           # Pure functional logic
├── core/                     # Core business logic
│   ├── ai-sdk.ts             # AI provider orchestration
│   ├── agent-manager.ts      # Agent system
│   ├── session-service.ts    # Session management
│   ├── rule-manager.ts       # Rule system
│   ├── functional/           # FP utilities
│   │   ├── result.ts         # Result<T, E> monad
│   │   ├── option.ts         # Option<T> monad
│   │   ├── either.ts         # Either<L, R> monad
│   │   ├── pipe.ts           # Function composition
│   │   └── async.ts          # Async operations
│   └── interfaces/           # Core interfaces
├── domains/                  # Domain-Driven Design
│   ├── knowledge/            # Knowledge base domain
│   ├── codebase/             # Codebase search domain
│   └── utilities/            # Utility tools (time, system)
├── services/                 # Service layer
│   ├── search/               # Search implementations
│   │   ├── tfidf.ts          # TF-IDF search
│   │   ├── semantic-search.ts # Vector search
│   │   ├── codebase-indexer.ts
│   │   ├── knowledge-indexer.ts
│   │   └── embeddings.ts     # Embedding generation
│   └── storage/              # Storage adapters
│       ├── memory-storage.ts # Conversation storage
│       ├── cache-storage.ts  # Cache layer
│       └── vector-storage.ts # Vector DB (LanceDB)
├── providers/                # AI provider implementations
│   ├── anthropic-provider.ts # Claude
│   ├── openai-provider.ts    # GPT models
│   ├── google-provider.ts    # Gemini
│   ├── openrouter-provider.ts
│   ├── claude-code-provider.ts # Custom Claude Code
│   └── streaming-xml-parser.ts
├── tools/                    # Tool registry
│   ├── filesystem.ts         # read, write, edit, glob
│   ├── bash-manager.ts       # Shell execution
│   ├── search.ts             # grep, semantic search
│   └── interaction.ts        # ask, updateTodos
├── db/                       # Database layer
│   ├── memory-db.ts          # Drizzle ORM + LibSQL
│   ├── cache-db.ts           # Fast caching
│   └── schema.ts             # Database schemas
├── utils/                    # Utility functions
├── types/                    # TypeScript definitions
└── targets/                  # Integration targets
    ├── claude-code.ts        # Claude Code integration
    └── opencode.ts           # Future integrations

assets/
├── agents/                   # Agent definitions (Markdown)
│   ├── coder.md              # Feature implementation
│   ├── orchestrator.md       # Task coordination
│   ├── reviewer.md           # Code review
│   └── writer.md             # Documentation
├── knowledge/                # Curated knowledge base
│   ├── stacks/               # Tech stack guides
│   ├── universal/            # Universal best practices
│   └── guides/               # Development guides
├── slash-commands/           # Command definitions
└── rules/                    # Core rules

models/
└── starcoder2/               # Pre-downloaded tokenizer
    ├── tokenizer.json
    ├── vocab.json
    └── merges.txt
```

### Key Architectural Patterns

#### 1. Functional Core, Imperative Shell

**Pure functional core:**
```typescript
// Core logic is pure functions
src/core/functional/
  - Result<T, E>: Error handling without exceptions
  - Option<T>: Nullable values
  - Either<L, R>: Branching logic
  - Pipe: Function composition
```

**Benefits:**
- Testable (no side effects)
- Composable (functions combine naturally)
- Predictable (same input = same output)
- Parallelizable (no shared state)

#### 2. Domain-Driven Design

**Domains:**
- **Knowledge**: Curated best practices, search, indexing
- **Codebase**: Project code, semantic search, TF-IDF
- **Utilities**: System tools, time, environment hooks

**Benefits:**
- Clear boundaries
- Independent evolution
- Easy to test
- Maintainable

#### 3. Layered Architecture

```
UI Layer (Ink + React)
  ↓
CLI Layer (Commander.js)
  ↓
Command Layer (Business logic)
  ↓
Core Layer (AI orchestration, agents)
  ↓
Service Layer (Search, storage, memory)
  ↓
Provider Layer (AI APIs)
  ↓
Tool Layer (Filesystem, bash, search)
  ↓
Database Layer (Drizzle ORM)
```

#### 4. Plugin System

Extensible via MCP (Model Context Protocol):
- Standard tool integration
- Server/client architecture
- JSON-RPC communication
- Custom plugins possible

## Technology Stack

### Core Technologies

| Category | Technology | Purpose |
|----------|-----------|----------|
| **Runtime** | Node.js/Bun | JavaScript execution |
| **Language** | TypeScript | Type safety |
| **CLI** | Commander.js | Command-line interface |
| **TUI** | Ink (React) | Terminal user interface |
| **State** | Zustand | Global state management |
| **Build** | esbuild | Fast bundling |
| **Tests** | Vitest | Unit/integration testing |
| **Lint** | Biome | Fast linting/formatting |

### AI/ML Stack

| Technology | Purpose |
|-----------|----------|
| Vercel AI SDK | AI orchestration |
| @ai-sdk/* | Provider adapters |
| @huggingface/transformers | StarCoder2 tokenizer |
| @lancedb/lancedb | Vector database |

### Database Stack

| Database | Purpose |
|----------|----------|
| LibSQL | Conversation/memory storage |
| LanceDB | Vector embeddings (optional) |
| Drizzle ORM | Database abstraction |

### Supported AI Providers

- ✅ **Anthropic** (Claude 3.5, Claude 3 Opus/Sonnet)
- ✅ **OpenAI** (GPT-4, GPT-4 Turbo, GPT-3.5)
- ✅ **Google** (Gemini Pro, Gemini Ultra)
- ✅ **OpenRouter** (All models)
- ✅ **Claude Code** (Custom provider)
- ✅ **ZAI** (Custom provider)

## CLI Commands

### Core Commands

```bash
# Initialize project
sylphx-flow init

# Run AI task (direct)
sylphx-flow run "implement authentication"
sylphx-flow run "review code" --agent reviewer
sylphx-flow run "write docs" --agent writer

# Run AI task (interactive)
sylphx-flow run
> implement feature X
> add tests
> optimize performance

# Interactive chat
sylphx-flow code

# Knowledge base
sylphx-flow knowledge search "react patterns"
sylphx-flow knowledge get "/stacks/react-app"

# Codebase operations
sylphx-flow codebase search "authentication logic"
sylphx-flow codebase reindex

# MCP server
sylphx-flow mcp install        # Install MCP config
sylphx-flow mcp uninstall      # Remove MCP config
sylphx-flow mcp status         # Show server status
```

### Available Agents

| Agent | Purpose | Use Case |
|-------|---------|----------|
| **coder** | Feature implementation | Default, builds features with tests |
| **orchestrator** | Multi-step coordination | Complex tasks requiring planning |
| **reviewer** | Code review | Security, performance, quality checks |
| **writer** | Documentation | Technical writing, README generation |

## Tool System

### Available Tools

#### Filesystem Tools
```typescript
read(file_path, offset?, limit?)     // Read file contents
write(file_path, content)            // Write file
edit(file_path, old, new, all?)      // Find/replace
glob(pattern, path?)                  // Search files by pattern
```

#### Search Tools
```typescript
grep(pattern, path?, options)        // Regex search in files
codebase_search(query, limit?)       // Semantic codebase search
knowledge_search(query, limit?)      // Search knowledge base
```

#### Bash Tools
```typescript
bash(command, options)               // Execute shell command
bash-output(bash_id)                 // Get background process output
kill-bash(bash_id)                   // Kill background process
```

#### Interaction Tools
```typescript
ask(question, options, multiSelect?) // Ask user multiple choice
updateTodos(todos)                   // Update task list
```

## Development Workflow

### Setup

```bash
# Clone repository
git clone https://github.com/sylphxltd/flow.git
cd flow

# Install dependencies (Bun recommended)
bun install
# or: npm install

# Run tests
bun test

# Build
bun run build

# Run development mode
bun run dev
```

### Testing

```bash
# Run all tests
bun test

# Run with UI
bun test:ui

# Run specific test
bun test path/to/test.test.ts

# Coverage
bun test:coverage
```

### Code Quality

```bash
# Lint
bun run lint

# Fix linting issues
bun run lint:fix

# Format
bun run format

# Type check
bun run type-check
```

## Configuration

### Project Initialization

When you run `sylphx-flow init`, it creates:

```
.sylphx-flow/
├── settings.json            # Project settings
├── memory.db                # Conversation storage
└── cache.db                 # Search cache

.claude/                     # Claude Code integration
├── settings.json            # Claude settings
└── mcp.json                 # MCP server config
```

### Settings File Structure

```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "apiKey": "sk-...",
  "baseUrl": "https://api.anthropic.com",
  "rules": ["/assets/rules/core.md"],
  "codebaseIndexed": true,
  "knowledgeIndexed": true
}
```

## Performance Characteristics

### Search Performance

| Operation | TF-IDF | Vector |
|-----------|--------|--------|
| **First search** | <100ms | ~500ms |
| **Cached search** | <50ms | <100ms |
| **Index build** | ~2s | ~30s |
| **Memory usage** | Low | Medium |
| **API calls** | 0 | 1 per search |

### Token Usage

**StarCoder2 Tokenization Benefits:**
- 30-50% fewer tokens than GPT tokenizer for code
- Better semantic understanding
- Consistent across languages
- No API calls for tokenization

## Security Considerations

### API Key Management
- Stored in `.sylphx-flow/settings.json` (gitignored)
- Environment variables supported
- Never logged or transmitted

### File System Access
- Respects `.gitignore` patterns
- No access outside project directory
- Explicit confirmation for destructive operations

### Code Execution
- Bash commands run in user context
- No privilege escalation
- Output sanitized

## Extensibility

### Adding Custom Agents

Agents are Markdown files in `assets/agents/`:

```markdown
# Agent Name

## Purpose
Your agent's purpose

## Instructions
1. Step-by-step instructions
2. How to accomplish tasks
3. When to use which tools

## Examples
Example interactions
```

### Adding Custom Tools

Tools follow MCP protocol:

```typescript
export const customTool = {
  name: 'custom_tool',
  description: 'What it does',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter' }
    },
    required: ['param']
  },
  handler: async (args) => {
    // Implementation
    return result;
  }
};
```

### Plugin System

Create plugins implementing `MCPPlugin` interface:

```typescript
export class CustomPlugin implements MCPPlugin {
  name = 'custom-plugin';
  version = '1.0.0';
  
  async initialize() {
    // Setup
  }
  
  getTools() {
    return [customTool1, customTool2];
  }
  
  getResources() {
    return [customResource];
  }
}
```

## Comparison with Alternatives

### vs. Traditional AI Tools (Cursor, Copilot, etc.)

| Feature | Sylphx Flow | Traditional |
|---------|-------------|-------------|
| **Prompt length** | 3-10 words | 100-500 words |
| **Context management** | Automatic | Manual |
| **Codebase awareness** | Built-in search | Copy/paste |
| **Best practices** | Curated knowledge | User provides |
| **Multi-language** | 70+ languages | Limited |
| **Tokenization** | StarCoder2 | GPT/Claude |
| **Search mode** | TF-IDF or Vector | N/A |
| **Offline capable** | TF-IDF yes | No |
| **Learning curve** | Minutes | Hours/Days |

### vs. LangChain/LlamaIndex

| Feature | Sylphx Flow | LangChain/LlamaIndex |
|---------|-------------|----------------------|
| **Purpose** | Development workflow | General RAG |
| **Setup time** | 30 seconds | Hours |
| **Code focus** | StarCoder2 | Generic embeddings |
| **UI** | Beautiful TUI | DIY |
| **Tools** | Built-in | DIY |
| **Agents** | Pre-built | DIY |
| **Learning curve** | Low | High |

## Roadmap

### Near-term (Q1 2025)
- [ ] More knowledge domains (DevOps, mobile, ML)
- [ ] Offline vector search (local embeddings)
- [ ] Custom agent creation UI
- [ ] Team collaboration features

### Mid-term (Q2 2025)
- [ ] IDE plugins (VSCode, IntelliJ)
- [ ] Real-time learning from commits
- [ ] Multi-repository support
- [ ] Agent marketplace

### Long-term (Q3-Q4 2025)
- [ ] Visual agent builder
- [ ] Collaborative sessions
- [ ] Enterprise features
- [ ] Cloud sync

## Contributing

### Areas for Contribution

1. **Knowledge Base**: Add curated guides for more tech stacks
2. **Agents**: Create specialized agents for specific tasks
3. **Tools**: Add new tool integrations
4. **Providers**: Support more AI providers
5. **Tests**: Improve test coverage
6. **Documentation**: Improve guides and examples
7. **Performance**: Optimize search and indexing

### Development Guidelines

1. **Functional First**: Prefer pure functions
2. **Type Safety**: Use TypeScript strictly
3. **Test Coverage**: Write tests for new features
4. **Documentation**: Update docs with changes
5. **Performance**: Profile before optimizing

## License

MIT License - See LICENSE file for details.

## Acknowledgments

- **StarCoder2** by BigCode for tokenization
- **MCP Protocol** by Anthropic for tool integration
- **Claude** by Anthropic for AI capabilities
- Open source community for libraries and inspiration

---

**Last Updated**: 2025-11-02
**Version**: 0.2.2
**Status**: Production Ready
