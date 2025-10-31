# Codebase Search - Semantic Code Discovery

The **Codebase Search** system provides AI assistants with semantic search capabilities across your entire codebase using **StarCoder2 tokenization + TF-IDF** for intelligent code understanding.

## 🔍 What is Codebase Search?

A semantic search system that understands code by meaning, not just by keywords:
- **StarCoder2 Tokenization** - World-class code tokenization (70+ languages)
- **TF-IDF Statistical Ranking** - Proven relevance scoring
- **Intelligent Indexing** - Automatic codebase scanning and indexing
- **Context-Aware** - Understands code semantically through tokenization
- **Real-time Updates** - Can reindex as code changes
- **Multi-Language** - Works with 70+ programming languages

## ✨ Key Features

- **🧠 Semantic Understanding** - Find code by what it does, not what it's called
- **⚡ Fast Search** - TF-IDF statistical search in milliseconds
- **📊 Relevance Ranking** - Results ranked by TF-IDF + semantic tokens
- **🔄 Auto-Indexing** - Keeps search index up-to-date
- **🎯 Precise Results** - Find exact code sections, not entire files
- **🌐 70+ Languages** - StarCoder2 understands TypeScript, JavaScript, Python, Go, Rust, and 65+ more
- **🆓 No API Needed** - Runs locally, no external dependencies

## 🛠️ CLI Commands

### Search Codebase
```bash
# Basic search
npx @sylphx/flow codebase search "authentication logic"

# Limit results
npx @sylphx/flow codebase search "api endpoints" --limit 10

# Include more content
npx @sylphx/flow codebase search "database queries" --include-content

# JSON output for scripting
npx @sylphx/flow codebase search "user validation" --output json
```

### Reindex Codebase
```bash
# Full reindex
npx @sylphx/flow codebase reindex

# Reindex with progress
npx @sylphx/flow codebase reindex --verbose
```

### Check Status
```bash
# View indexing status
npx @sylphx/flow codebase status
```

## 🔌 MCP Tools for AI Assistants

When the MCP server is running, AI assistants can use these tools:

### `codebase_search`
Search the codebase semantically.

**Parameters:**
- `query` (required): Search query describing what to find
- `limit` (optional): Maximum results (default: 10)
- `include_content` (optional): Include full code content (default: true)

**Example:**
```javascript
// AI assistant internally calls:
codebase_search({
  query: "user authentication implementation",
  limit: 10,
  include_content: true
})
```

**Response:**
```json
{
  "results": [
    {
      "file": "src/auth/user-auth.ts",
      "chunk": "export function authenticateUser(credentials) { ... }",
      "score": 0.92,
      "line_start": 45,
      "line_end": 67,
      "metadata": {
        "language": "typescript",
        "size": 523
      }
    }
  ],
  "total": 5,
  "query": "user authentication implementation"
}
```

### `codebase_reindex`
Trigger a full codebase reindex.

**Parameters:**
- None

**Example:**
```javascript
// AI assistant internally calls:
codebase_reindex()
```

### `codebase_status`
Get current indexing status.

**Parameters:**
- None

**Example:**
```javascript
// AI assistant internally calls:
codebase_status()
```

## 🎯 Search Examples

### Finding Authentication Code
```bash
# Traditional keyword search (limited)
grep -r "login" src/

# Semantic search (powerful)
flow codebase search "user login and authentication"
```

**Finds:**
- Login functions
- Auth middleware
- Token validation
- Session management
- Related security code

### Discovering API Endpoints
```bash
# Describe what you're looking for
flow codebase search "REST API endpoints for user management"
```

**Finds:**
- Route definitions
- Controller methods
- Request handlers
- Validation logic
- Response formatting

### Locating Database Queries
```bash
# Search by purpose, not syntax
flow codebase search "database queries for user data"
```

**Finds:**
- SQL queries
- ORM queries
- Database utilities
- Query builders
- Data access layers

### Understanding Error Handling
```bash
# Find error handling patterns
flow codebase search "error handling and exception management"
```

**Finds:**
- Try-catch blocks
- Error middleware
- Custom error classes
- Error logging
- Recovery logic

## 🔧 How It Works

### Initial Indexing
```
1. Scan project directory
   ↓
2. Filter files (ignore node_modules, .git, etc.)
   ↓
3. Read source files
   ↓
4. Tokenize with StarCoder2 (70+ languages)
   ↓
5. Calculate TF-IDF scores
   ↓
6. Store in .sylphx-flow/codebase.db
   ↓
7. Ready for fast TF-IDF search
```

### Search Process
```
1. User/AI searches: "authentication logic"
   ↓
2. Query tokenized with StarCoder2
   ↓
3. TF-IDF statistical search
   ↓
4. Cosine similarity ranking
   ↓
5. Results ranked by relevance score
   ↓
6. Code sections returned with context
```

### File Filtering
**Indexed:**
- Source code files (.ts, .js, .py, .go, .rs, etc.)
- Configuration files (.json, .yaml, .toml)
- Documentation (.md)

**Ignored:**
- Dependencies (node_modules, vendor, etc.)
- Build artifacts (dist, build, target, etc.)
- Version control (.git, .svn)
- Binary files
- Media files

## 🎯 Use Cases

### 1. Code Discovery
**Scenario**: New developer needs to understand authentication

```bash
# Find all authentication-related code
flow codebase search "authentication and authorization"

# Find specific implementation
flow codebase search "JWT token validation"
```

**Result**: AI assistant or developer quickly finds relevant code.

### 2. Feature Implementation
**Scenario**: Implementing similar feature to existing one

```bash
# Find existing implementation
flow codebase search "payment processing workflow"

# Study the patterns
flow codebase search "error handling in payment code"
```

**Result**: Consistent implementation following existing patterns.

### 3. Code Review
**Scenario**: Reviewing security-critical code

```bash
# Find all input validation
flow codebase search "user input validation and sanitization"

# Find authentication checks
flow codebase search "authentication middleware"
```

**Result**: Comprehensive security review.

### 4. Refactoring
**Scenario**: Refactoring authentication system

```bash
# Find all authentication code
flow codebase search "user authentication logic"

# Find related code
flow codebase search "session management"
flow codebase search "token generation"
```

**Result**: Complete understanding of authentication system.

### 5. AI-Assisted Development
**Scenario**: AI agent implementing a feature

```bash
# AI searches for similar code
flow run "implement user registration" --agent coder

# AI internally calls:
# codebase_search("user registration implementation")
# codebase_search("form validation patterns")
# codebase_search("database user creation")
```

**Result**: AI implements feature following existing patterns.

## ⚙️ Configuration

### Environment Variables
```bash
# Codebase search uses TF-IDF (primary method)
# No API key required for basic functionality

# Optional: Future support for OpenAI-compatible vector embeddings
# OPENAI_API_KEY=your-key-here  # Not yet implemented for codebase

# Note: Knowledge base supports optional vector embeddings
# Codebase search currently uses TF-IDF only (fast and accurate)
```

### MCP Server Options
```bash
# Start with codebase search enabled (default)
flow mcp start

# Disable codebase search
flow mcp start --disable-codebase
```

### Indexing Configuration

**File Extensions Indexed:**
```typescript
// Source code
.ts, .tsx, .js, .jsx, .py, .go, .rs, .java, .cpp, .c, .h

// Configuration
.json, .yaml, .yml, .toml, .ini

// Documentation
.md, .mdx, .txt

// Markup & Styles
.html, .css, .scss, .sass
```

**Ignored Patterns:**
```
node_modules/
dist/
build/
target/
.git/
.next/
__pycache__/
*.min.js
*.bundle.js
```

## 📊 Codebase Statistics

```bash
# View indexing status and statistics
flow codebase status
```

**Example Output:**
```
📊 Codebase Search Status
=========================
Status: ✅ Indexed and ready

Index Statistics:
  • Total files: 347
  • Indexed files: 285
  • Skipped files: 62
  • Total chunks: 1,847
  • Vector dimensions: 1536

Languages:
  • TypeScript: 215 files
  • JavaScript: 45 files
  • JSON: 18 files
  • Markdown: 7 files

Database:
  • Size: 12.4 MB
  • Last indexed: 2025-10-30 18:45:00
  • Index age: 15 minutes

📍 Database: .sylphx-flow/codebase.db
```

## 🚀 Performance

### Indexing Speed
- **Small projects** (<100 files): 10-30 seconds
- **Medium projects** (100-500 files): 30-90 seconds
- **Large projects** (500-2000 files): 2-5 minutes
- **Very large projects** (2000+ files): 5-15 minutes

### Search Speed
- **Cold search**: ~200-300ms
- **Warm search**: ~50-100ms
- **Large codebase**: ~100-200ms

### Optimization Tips

```bash
# Reindex during low usage
flow codebase reindex

# Limit search results for speed
flow codebase search "query" --limit 5

# Use specific queries for better results
flow codebase search "specific implementation detail"

# Clean old index before reindexing
rm .sylphx-flow/codebase.db
flow codebase reindex
```

## 🔍 Search Best Practices

### Effective Queries

**✅ Good Queries:**
```bash
# Specific and descriptive
flow codebase search "user authentication with JWT tokens"
flow codebase search "API error handling middleware"
flow codebase search "database connection pooling"
flow codebase search "React component lazy loading"

# Focused on intent
flow codebase search "validate email addresses"
flow codebase search "handle file uploads"
flow codebase search "parse JSON configuration"
```

**❌ Poor Queries:**
```bash
# Too vague
flow codebase search "code"
flow codebase search "function"

# Too broad
flow codebase search "all user code"

# Just keywords
flow codebase search "auth"
```

### Query Strategies

**1. Describe the Purpose:**
```bash
flow codebase search "code that processes payment transactions"
```

**2. Specify the Context:**
```bash
flow codebase search "React hooks for managing form state"
```

**3. Include Related Concepts:**
```bash
flow codebase search "authentication middleware with session validation"
```

**4. Use Natural Language:**
```bash
flow codebase search "how are user permissions checked"
```

## 🐛 Troubleshooting

### No Search Results

**Problem**: Search returns no results

**Solutions:**
```bash
# Check if codebase is indexed
flow codebase status

# Reindex the codebase
flow codebase reindex

# Try broader search query
flow codebase search "broader term"

# Verify database exists
ls -la .sylphx-flow/codebase.db
```

### Slow Indexing

**Problem**: Indexing takes too long

**Solutions:**
```bash
# Check file count
flow codebase status

# Verify .gitignore is being respected
# Large directories should be ignored

# Consider selective indexing
# Add patterns to .gitignore
```

### Out of Date Results

**Problem**: Search returns old code

**Solutions:**
```bash
# Reindex to update
flow codebase reindex

# Set up automatic reindexing
# (Consider adding to git hooks)

# Verify last index time
flow codebase status
```

### Search Not Working

**Problem**: Search returns no results or fails

**Solutions:**
```bash
# Check if codebase is indexed
flow codebase status

# Reindex if needed
flow codebase reindex

# Verify database exists
ls -la .sylphx-flow/codebase.db

# Test with simpler query
flow codebase search "function"

# Note: No API key needed - uses local StarCoder2 tokenization
```

## 🎯 Advanced Usage

### Combining with Knowledge Base
```bash
# Search knowledge for patterns
flow knowledge search "authentication patterns"

# Then search codebase for implementations
flow codebase search "authentication implementation"

# Compare and identify gaps
```

### Using with AI Agents
```bash
# Agent automatically uses codebase search
flow run "refactor authentication system" --agent coder

# Agent will internally:
# 1. codebase_search("authentication implementation")
# 2. knowledge_search("authentication best practices")
# 3. Implement refactoring
```

### Scripting with JSON Output
```bash
# Get results as JSON
flow codebase search "api endpoints" --output json > results.json

# Process with jq
flow codebase search "auth" --output json | jq '.results[].file'

# Integrate with other tools
```

## 🔄 Maintenance

### Regular Reindexing
```bash
# After significant code changes
flow codebase reindex

# After pulling updates
git pull && flow codebase reindex

# Scheduled (via cron)
0 */6 * * * cd /path/to/project && flow codebase reindex
```

### Index Management
```bash
# Check index size
du -sh .sylphx-flow/codebase.db

# Clean and rebuild
rm .sylphx-flow/codebase.db
flow codebase reindex

# Backup index (optional)
cp .sylphx-flow/codebase.db backup/codebase-$(date +%Y%m%d).db
```

## 📈 Index Size Examples

| Project Size | Files | Chunks | Index Size |
|--------------|-------|---------|------------|
| Small | 50-100 | ~500 | ~2-3 MB |
| Medium | 100-500 | ~2,000 | ~8-12 MB |
| Large | 500-2000 | ~8,000 | ~30-50 MB |
| Very Large | 2000+ | ~20,000+ | ~80-150 MB |

## 🎯 Pro Tips

### For AI Assistants
- Search codebase before implementing new features
- Use search to understand existing patterns
- Combine with knowledge base for best practices
- Verify assumptions with code search

### For Developers
- Use semantic search for code discovery
- Find similar implementations before coding
- Discover undocumented features
- Understand legacy code quickly

### For Teams
- Onboard new developers faster
- Maintain consistency across codebase
- Document patterns through code examples
- Share knowledge through searchable code

### For Code Review
- Find all instances of a pattern
- Verify consistent implementation
- Discover edge cases
- Check for similar bugs

## 📚 Next Steps

- **[Knowledge Base](Knowledge-Base)** - Search development guidelines
- **[Agent Framework](Agent-Framework)** - Use agents with codebase search
- **[MCP Integration](MCP-Integration)** - Connect AI tools
- **[CLI Commands](CLI-Commands)** - Complete command reference

---

*Last Updated: 2025-10-30 | [Edit this page](https://github.com/sylphxltd/flow/wiki/Codebase-Search) | [Report Issues](https://github.com/sylphxltd/flow/issues)*
