# Sylphx Flow Architecture Documentation

## 📋 Overview

Sylphx Flow follows a **Domain-Based Architecture** pattern with clear separation of concerns and shared infrastructure services.

## 🏗️ Directory Structure

```
src/
├── agents/                           # 🤖 AI Agent definitions
│   ├── core/master-craftsman.md     # Master Craftsman agent
│   └── specialized/                  # Specialized agents
│       └── prompt-engineer.md
│
├── domains/                          # 🏗️ Business domains
│   ├── workspace/                    # 📋 Workspace management
│   │   ├── reasoning/               # Reasoning tools & frameworks
│   │   │   ├── frameworks/          # Framework definitions (9 total)
│   │   │   ├── tools.ts             # reasoning_start/analyze/conclude
│   │   │   └── framework-registry.ts
│   │   ├── tasks/                   # Task management (TODO)
│   │   └── documents/               # File operations (TODO)
│   │
│   ├── codebase/                    # 💻 Code analysis tools
│   │   └── tools.ts                 # Code search and analysis
│   │
│   ├── knowledge/                   # 📚 Knowledge management
│   │   ├── tools.ts                 # Knowledge operations
│   │   ├── resources.ts             # Knowledge definitions
│   │   └── indexer.ts               # Knowledge indexing
│   │
│   └── utilities/                   # ⚙️ General utilities
│       └── time/tools.ts            # Time/date operations
│
├── services/                        # 🔧 Shared services
│   ├── search/                      # 🔍 Unified search infrastructure
│   │   ├── search-service.ts        # Core semantic search
│   │   ├── indexer.ts               # Unified indexing
│   │   ├── embeddings-provider.ts   # Embedding generation
│   │   └── index.ts                 # Service exports
│   ├── storage/                     # 💾 Data persistence (TODO)
│   └── cache/                       # ⚡ Caching layer (TODO)
│
├── infrastructure/                  # 🌐 External integrations
│   ├── mcp/                         # MCP server (TODO)
│   └── external-apis/               # Third-party services (TODO)
│
└── interfaces/                      # 🎛️ User interfaces
    ├── cli/                         # CLI commands (TODO)
    └── mcp-server.ts                # MCP server setup
```

## 🎯 Core Principles

### 1. Domain Separation
- **Workspace Domain**: Task management, reasoning, and collaboration
- **Codebase Domain**: Code analysis, search, and navigation
- **Knowledge Domain**: Documentation, guides, and reference materials
- **Utilities Domain**: General-purpose tools and helpers

### 2. Shared Infrastructure
- **Search Service**: Unified semantic search across all domains
- **Indexer Service**: Centralized indexing for all content types
- **Embeddings Provider**: Unified embedding generation

### 3. Clear Boundaries
- **Business Logic**: Lives in domains
- **Infrastructure**: Lives in services
- **External Interfaces**: Lives in infrastructure

## 🔧 Services Architecture

### Search Service
```typescript
// Cross-domain search with unified interface
const searchService = getSearchService();
const results = await searchService.search("React patterns", {
  domain: 'codebase',
  limit: 10,
  include_content: true
});
```

### Embeddings Service
```typescript
// Centralized embedding generation
const embeddingsProvider = createEmbeddingsProvider({
  provider: 'auto',
  batchSize: 10
});
const embeddings = await embeddingsProvider.generateEmbeddings(texts);
```

### Indexer Service
```typescript
// Unified indexing for all content types
const indexerService = getIndexerService();
await indexerService.buildIndex('knowledge', {
  includeVectorIndex: true,
  batchSize: 10
});
```

## 🧠 Reasoning Frameworks

### Available Frameworks (9 total)

**Strategic (2):**
- `swot-analysis` - Strategic planning and market positioning
- `risk-assessment` - Risk identification and mitigation

**Analytical (4):**
- `first-principles` - Break down problems to fundamentals
- `root-cause-analysis` - 5 Whys technique
- `cause-effect-analysis` - Fishbone diagram analysis
- `systems-thinking` - Complex system dynamics

**Technical (1):**
- `decision-matrix` - Multi-criteria decision making

**Creative (2):**
- `six-thinking-hats` - Structured brainstorming
- `design-thinking` - User-centered innovation

### Usage Workflow
```bash
# 1. Discover frameworks
reasoning_frameworks category="analytical"

# 2. Start reasoning session
reasoning_start \
  title="Architecture Decision" \
  framework="first-principles" \
  problem_description="Should we use microservices?"

# 3. Work through sections
reasoning_analyze section="Problem Deconstruction" analysis="..."
reasoning_analyze section="Fundamental Truths" analysis="..."

# 4. Conclude with decisions
reasoning_conclude \
  conclusions="Monolith is better for current scale" \
  recommendations=["Start with monolith", "Plan migration path"]
```

## 📦 Build Process

### Build Script
```bash
npm run build
```

### What gets built:
1. **Bundle**: TypeScript → JavaScript (Bun build)
2. **Assets**: Copy static assets
3. **Agents**: Copy agent definitions
4. **Domains**: Copy domain code and frameworks
5. **Services**: Copy shared services

### Production Structure
```
dist/
├── assets/agents/          # Agent definitions
├── agents/                 # Agent definitions (copy)
├── domains/                # Domain code (copy)
├── services/               # Shared services (copy)
└── index.js                # Main bundle
```

## 🔄 Migration from Legacy Structure

### Before
```
src/
├── tools/                   # Mixed domain tools
├── frameworks/              # Frameworks (confusing name)
└── utils/                   # Mixed utilities

assets/
├── agents/                  # Agent definitions
└── knowledge/               # Knowledge data
```

### After
```
src/
├── domains/                 # Clear domain separation
├── services/                # Shared infrastructure
└── agents/                  # Agent definitions
```

### Benefits of New Structure
1. **Clear Domain Boundaries**: Each domain has specific responsibilities
2. **Shared Infrastructure**: Common services reused across domains
3. **Better Maintainability**: Related code grouped together
4. **Scalable Architecture**: Easy to add new domains and services
5. **Type Safety**: Strong typing across domain boundaries

## 🧪 Testing Strategy

### Domain Testing
- Each domain should have its own test suite
- Domain tests should mock shared services
- Test business logic independently

### Service Testing
- Shared services should have comprehensive unit tests
- Integration tests for cross-service interactions
- Performance tests for search and indexing

### End-to-End Testing
- MCP tool integration tests
- CLI command tests
- Full workflow tests

## 🚀 Future Enhancements

### Planned Domains
- **Monitoring Domain**: Metrics, logging, and observability
- **CI/CD Domain**: Build and deployment automation
- **Security Domain**: Security scanning and compliance

### Planned Services
- **Cache Service**: Redis-based caching layer
- **Storage Service**: Abstracted database operations
- **Notification Service**: Event-driven notifications

### Planned Features
- **Hot-reload**: Development-time hot module replacement
- **Plugin System**: Extensible plugin architecture
- **API Layer**: REST/GraphQL API for external integration

## 📚 Development Guidelines

### Adding New Domains
1. Create domain directory under `src/domains/`
2. Define domain-specific interfaces and types
3. Implement domain business logic
4. Add domain to build process
5. Write comprehensive tests

### Adding New Services
1. Create service directory under `src/services/`
2. Define service interface and types
3. Implement with dependency injection
4. Add service exports in index.ts
5. Document service usage patterns

### Adding New Reasoning Frameworks
1. Create JSON definition in `src/domains/workspace/frameworks/`
2. Follow framework schema structure
3. Include comprehensive metadata and examples
4. Test framework integration
5. Update documentation