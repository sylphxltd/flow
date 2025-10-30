# Knowledge Base - Curated Development Guidelines

The **Knowledge Base** is Sylphx Flow's curated collection of development guidelines, best practices, and architectural patterns that AI assistants can search and reference.

## 🧠 What is the Knowledge Base?

A structured repository of development knowledge organized into categories:
- **Stacks**: Framework-specific patterns (React, Next.js, Node.js)
- **Guides**: Architecture and design guidelines
- **Universal**: Cross-cutting concerns (security, performance, testing, deployment)
- **Data**: Database patterns and best practices

## 🎯 Curated Only - By Design

**Sylphx Flow intentionally does NOT support custom knowledge base.**

### Why Curated Only?

This design decision aligns with the **MEP (Minimal Effective Prompt)** philosophy:

#### 1. **Quality Over Flexibility**
```
✅ Every guideline is professionally curated and verified
✅ Content consistency and accuracy guaranteed
✅ No outdated or incorrect information
✅ Maintained by experts

vs.

❌ Custom knowledge = User maintains quality
❌ Potential for outdated info
❌ Inconsistent guidelines
❌ Maintenance burden
```

#### 2. **Zero Maintenance**
```bash
# With curated knowledge:
npx github:sylphxltd/flow init  # Auto-updates to latest

# With custom knowledge (if supported):
flow knowledge add my-guide.md
flow knowledge update my-guide.md
flow knowledge validate my-guide.md
# Constant maintenance required
```

#### 3. **Optimized Performance**
```typescript
// Fixed knowledge base = Optimized search
const performance = {
  searchTime: "<100ms",     // TF-IDF search (primary)
  indexSize: "Fixed",       // Known size, optimized storage
  cacheStrategy: "Perfect", // Can pre-cache everything
  vectorSearch: "Optional"  // OpenAI embeddings if API key provided
};

// Custom knowledge = Variable performance
const customPerformance = {
  searchTime: "100-500ms",  // Dynamic index
  indexSize: "Variable",    // Unknown size
  cacheStrategy: "Complex"  // Hard to optimize
};
```

#### 4. **Reduces Cognitive Load**
```typescript
// Without custom knowledge:
User: "implement auth"
AI: [Uses curated best practices]
// No decisions needed

// With custom knowledge:
User: "implement auth"
User: "Which guideline should I use?"
User: "Should I add my own patterns?"
User: "How do I organize custom knowledge?"
// Increases complexity
```

### What About Project-Specific Patterns?

**Use Codebase Search Instead!**

```bash
# Your project's patterns are already in your code
flow codebase search "our authentication pattern"

# Advantages:
✅ Always up-to-date (syncs with code)
✅ Real implementation examples
✅ No extra maintenance
✅ Actual patterns you use
```

**Example Workflow:**

```bash
# 1. Search curated knowledge for best practices
flow knowledge search "authentication security"
# Returns: JWT best practices, security guidelines

# 2. Search your codebase for your implementation
flow codebase search "authentication implementation"
# Returns: YOUR actual auth code

# 3. AI combines both:
#    - Best practices from knowledge base
#    - Your existing patterns from codebase
#    = Perfect implementation!
```

### Benefits of Curated-Only

| Aspect | Curated Only | Custom Support |
|--------|--------------|----------------|
| **Quality** | Guaranteed | User-dependent |
| **Maintenance** | Zero | High |
| **Performance** | <100ms | Variable |
| **Cognitive Load** | Minimal | Higher |
| **Updates** | Automatic | Manual |
| **Consistency** | Always | Depends |

### When You Might Want "Custom" Knowledge

**Scenario 1: Company-specific conventions**
```bash
# Solution: Document in your codebase
# src/docs/conventions.md or comments in code
# AI finds via codebase search
```

**Scenario 2: Internal best practices**
```bash
# Solution: Codify as actual code patterns
# AI learns from your codebase
```

**Scenario 3: Domain-specific knowledge**
```bash
# Solution: Add to your code as comments/docs
# Use codebase search to find it
```

## ✨ Key Features

- **🔍 Semantic Search** - Find guidelines by meaning, not just keywords
- **📋 Curated Content** - Hand-selected best practices
- **🎯 Context-Aware** - Content tailored for AI consumption
- **⚡ Fast Access** - Vector-indexed for instant retrieval
- **🔄 Always Updated** - Content indexed and ready to use

## 🛠️ CLI Commands

### Search Knowledge Base
```bash
# Basic search
npx github:sylphxltd/flow knowledge search "react hooks patterns"

# Include content in results
npx github:sylphxltd/flow knowledge search "nextjs routing" --include-content

# Limit results
npx github:sylphxltd/flow knowledge search "security best practices" --limit 5

# JSON output for scripting
npx github:sylphxltd/flow knowledge search "testing strategies" --output json
```

### Get Specific Document
```bash
# Retrieve by URI
npx github:sylphxltd/flow knowledge get "/stacks/react-app"
npx github:sylphxltd/flow knowledge get "/guides/saas-template"
npx github:sylphxltd/flow knowledge get "/universal/security"
```

### List All Resources
```bash
# List all available knowledge
npx github:sylphxltd/flow knowledge list

# Filter by category
npx github:sylphxltd/flow knowledge list --category stacks

# JSON output
npx github:sylphxltd/flow knowledge list --output json
```

### Check Status
```bash
# View knowledge base status
npx github:sylphxltd/flow knowledge status
```

## 🔌 MCP Tools for AI Assistants

When the MCP server is running, AI assistants can use these tools:

### `knowledge_search`
Search the knowledge base semantically.

**Parameters:**
- `query` (required): Search query
- `limit` (optional): Maximum results (default: 5)
- `include_content` (optional): Include full content (default: false)

**Example:**
```javascript
// AI assistant internally calls:
knowledge_search({
  query: "react component patterns",
  limit: 5,
  include_content: true
})
```

### `knowledge_get`
Retrieve a specific knowledge document by URI.

**Parameters:**
- `uri` (required): Document URI (e.g., "/stacks/react-app")

**Example:**
```javascript
// AI assistant internally calls:
knowledge_get({
  uri: "/stacks/react-app"
})
```

### `knowledge_list`
List all available knowledge resources.

**Parameters:**
- `category` (optional): Filter by category

**Example:**
```javascript
// AI assistant internally calls:
knowledge_list({
  category: "stacks"
})
```

## 📚 Content Organization

### Stacks (Framework-Specific)

#### React App (`/stacks/react-app`)
- Component patterns and best practices
- Hooks usage and custom hooks
- State management strategies
- Performance optimization
- Testing React components

#### Next.js App (`/stacks/nextjs-app`)
- App Router patterns
- Server Components vs Client Components
- Data fetching strategies
- Routing and navigation
- Deployment optimization

#### Node.js API (`/stacks/node-api`)
- Express.js patterns
- Middleware architecture
- Error handling
- Authentication & authorization
- API design best practices

### Guides (Architecture & Design)

#### SaaS Template (`/guides/saas-template`)
- Multi-tenant architecture
- Subscription management
- Role-based access control
- Data isolation strategies
- Scaling considerations

#### Tech Stack (`/guides/tech-stack`)
- Technology selection frameworks
- Trade-off analysis
- Integration patterns
- Migration strategies

#### UI/UX (`/guides/ui-ux`)
- Design system patterns
- Accessibility (WCAG)
- Responsive design
- User experience best practices

### Universal (Cross-Cutting Concerns)

#### Security (`/universal/security`)
- Authentication strategies (JWT, OAuth, sessions)
- Authorization patterns (RBAC, ABAC)
- Input validation and sanitization
- SQL injection prevention
- XSS and CSRF protection
- Secure password handling
- API security

#### Performance (`/universal/performance`)
- Optimization strategies
- Caching patterns (client, server, CDN)
- Database query optimization
- Asset optimization
- Lazy loading
- Monitoring and profiling

#### Testing (`/universal/testing`)
- Test-driven development (TDD)
- Unit testing strategies
- Integration testing
- End-to-end testing
- Test coverage goals
- Mocking and stubbing

#### Deployment (`/universal/deployment`)
- CI/CD pipelines
- Infrastructure as code
- Container orchestration
- Blue-green deployments
- Rollback strategies
- Monitoring and alerting

### Data (Database Patterns)

#### SQL (`/data/sql`)
- Query optimization
- Indexing strategies
- Migration patterns
- Transaction management
- N+1 query prevention
- Database normalization

## 🎯 Use Cases

### 1. Learning Framework Patterns
**Scenario**: Developer wants to learn Next.js App Router patterns

```bash
# Search for Next.js patterns
flow knowledge search "nextjs app router patterns"

# Get the full Next.js guide
flow knowledge get "/stacks/nextjs-app"
```

**Result**: AI assistant provides curated patterns and best practices.

### 2. Security Review
**Scenario**: Need to implement authentication securely

```bash
# Search security guidelines
flow knowledge search "authentication security best practices"

# Get detailed security guide
flow knowledge get "/universal/security"
```

**Result**: AI follows established security patterns.

### 3. Architecture Decisions
**Scenario**: Building a SaaS application

```bash
# Get SaaS architecture patterns
flow knowledge get "/guides/saas-template"

# Search for multi-tenant patterns
flow knowledge search "multi-tenant architecture"
```

**Result**: AI suggests proven architectural patterns.

### 4. Code Review with Context
**Scenario**: Reviewing React code for best practices

```bash
# AI automatically searches relevant guidelines
flow run "review this component for best practices" --agent reviewer

# AI internally calls:
# knowledge_search("react component best practices")
```

**Result**: Code review based on curated guidelines.

## 🔧 How It Works

### Indexing Process
```
1. Knowledge files in assets/knowledge/
   ↓
2. Parsed and chunked into sections
   ↓
3. StarCoder2 tokenization + TF-IDF indexing (primary)
   ↓
4. Optional: OpenAI vector embeddings (if API key provided)
   ↓
5. Stored in .sylphx-flow/knowledge.db
   ↓
6. Ready for semantic search
```

### Search Process
```
1. User/AI searches: "react hooks patterns"
   ↓
2. StarCoder2 tokenization
   ↓
3. TF-IDF statistical search (primary method)
   ↓
4. Optional: Vector similarity search (if embeddings available)
   ↓
5. Results ranked by relevance
   ↓
6. Top results returned with metadata
```

## ⚙️ Configuration

### Environment Variables
```bash
# Optional: For vector embeddings (enhances search quality)
# Works without API key using TF-IDF search
OPENAI_API_KEY=your-api-key-here

# Optional: Custom embedding model (only if OPENAI_API_KEY is set)
EMBEDDING_MODEL=text-embedding-3-small

# Optional: OpenAI-compatible endpoint (Azure OpenAI, etc.)
OPENAI_BASE_URL=https://api.openai.com/v1

# Hybrid Search Architecture:
# - Primary: TF-IDF (always available, no API key needed)
# - Enhancement: Vector embeddings (optional, if API key provided)
```

### MCP Server Options
```bash
# Start with knowledge tools enabled (default)
flow mcp start

# Disable knowledge tools
flow mcp start --disable-knowledge
```

## 📊 Knowledge Base Statistics

```bash
# View status and statistics
flow knowledge status
```

**Example Output:**
```
📊 Knowledge Base Status
========================
Status: ✅ Indexed and ready

Resources:
  • Stacks: 3 documents
  • Guides: 3 documents
  • Universal: 4 documents
  • Data: 1 document
  • Total: 11 documents

Index:
  • Search method: TF-IDF (primary) + Vector (optional)
  • TF-IDF index: 247 chunks
  • Vector embeddings: Available (if OpenAI API key set)
  • Database size: 1.2 MB
  • Last indexed: 2025-10-30 19:00:00

📍 Database: .sylphx-flow/knowledge.db
```

## 🔍 Search Tips

### Effective Queries
```bash
# ✅ Good: Specific and descriptive
flow knowledge search "react custom hooks patterns"
flow knowledge search "nextjs server component data fetching"
flow knowledge search "sql query optimization indexing"

# ❌ Poor: Too vague
flow knowledge search "react"
flow knowledge search "code"
flow knowledge search "help"
```

### Using Categories
```bash
# Search within a specific stack
flow knowledge search "component patterns" --category stacks

# Find architectural guidance
flow knowledge search "scalability" --category guides

# Look for security best practices
flow knowledge search "authentication" --category universal
```

## 🚀 Extending the Knowledge Base

### Adding Custom Knowledge

1. **Create markdown file** in `assets/knowledge/`:
```markdown
# Custom Pattern

## Overview
Your custom pattern description...

## Best Practices
- Practice 1
- Practice 2

## Examples
...
```

2. **Rebuild the index**:
```bash
# Knowledge base automatically reindexes on MCP start
flow mcp start
```

3. **Verify**:
```bash
flow knowledge list
flow knowledge search "custom pattern"
```

### Knowledge File Format

```markdown
# Title

## Section 1
Content that will be indexed...

## Section 2
More content...

### Subsection
Nested content is supported...
```

**Best Practices:**
- Use clear headings
- Write for AI consumption
- Include practical examples
- Keep sections focused
- Use code blocks for examples

## 🐛 Troubleshooting

### Knowledge Not Found
```bash
# Check if indexed
flow knowledge status

# Verify database exists
ls -la .sylphx-flow/knowledge.db

# Restart MCP server to reindex
flow mcp start
```

### Search Returns No Results
```bash
# Check if query is too specific
flow knowledge search "broad topic"

# List all available resources
flow knowledge list

# Try different search terms
flow knowledge search "alternative keywords"
```

### Search Not Working
```bash
# Check if indexed
flow knowledge status

# Verify database exists
ls -la .sylphx-flow/knowledge.db

# Restart to reindex
flow init

# Note: Search works without OPENAI_API_KEY (uses TF-IDF)
# Vector embeddings are optional enhancements
```

## 📈 Performance

### Search Speed
- **Cold start**: ~100-300ms (first search)
- **Warm cache**: ~20-50ms (subsequent searches, TF-IDF)
- **With vector embeddings**: +100-200ms per query (optional)

### Database Size
- **Base knowledge (TF-IDF)**: ~1-2 MB
- **Vector embeddings (optional)**: +4 KB per chunk (~1 MB extra)
- **Total with embeddings**: ~2-3 MB

### Optimization Tips
```bash
# Use --limit to reduce result size
flow knowledge search "query" --limit 3

# Avoid --include-content unless needed
flow knowledge search "query"  # Metadata only

# Reindex periodically for performance
rm .sylphx-flow/knowledge.db
flow mcp start
```

## 🎯 Pro Tips

### For AI Assistants
- Search before implementing to find patterns
- Reference guidelines during code review
- Use knowledge for architectural decisions
- Combine with codebase search for context

### For Developers
- Add project-specific patterns to knowledge base
- Use knowledge search for onboarding
- Reference during code review
- Keep knowledge updated with team learnings

### For Teams
- Standardize on knowledge base guidelines
- Add team conventions to knowledge
- Use as single source of truth
- Regular knowledge review and updates

## 📚 Next Steps

- **[Codebase Search](Codebase-Search)** - Search your actual code
- **[Agent Framework](Agent-Framework)** - Use agents with knowledge
- **[MCP Integration](MCP-Integration)** - Connect AI tools
- **[CLI Commands](CLI-Commands)** - Complete command reference

---

*Last Updated: 2025-10-30 | [Edit this page](https://github.com/sylphxltd/flow/wiki/Knowledge-Base) | [Report Issues](https://github.com/sylphxltd/flow/issues)*
