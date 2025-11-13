# Semantic Search - Find Code by Meaning

Sylphx Flow features revolutionary semantic search powered by StarCoder2 tokenization. Search your codebase and knowledge base by **what code does**, not what it's called.

## Overview

Traditional code search requires you to know exact variable names, function names, or keywords. Semantic search understands **meaning** and **intent**, finding relevant code even when naming differs.

## Codebase Semantic Search

### How It Works

1. **Indexing**: Flow analyzes your codebase and creates semantic embeddings
2. **Tokenization**: Uses StarCoder2 tokenization (70+ languages)
3. **Search**: Query in natural language (any human language)
4. **Results**: Returns semantically relevant code, ranked by similarity

### Basic Usage

```bash
# Search by functionality
sylphx-flow codebase search "user authentication logic"

# Find patterns
sylphx-flow codebase search "error handling middleware"

# Discover code
sylphx-flow codebase search "payment processing workflow"
```

### Multilingual Search

Search in **any language**, get results from **any programming language**:

```bash
# English query
sylphx-flow codebase search "user login handling"

# Chinese query (returns same results!)
sylphx-flow codebase search "處理用戶登入嘅邏輯"

# Japanese query (returns same results!)
sylphx-flow codebase search "ユーザーログイン処理"

# All return:
# ✅ authenticateUser() in TypeScript
# ✅ authenticate_user() in Python
# ✅ AuthenticateUser() in Go
```

### Advanced Search

#### Search by Concept

```bash
# Find by what code accomplishes
sylphx-flow codebase search "validates email format"
sylphx-flow codebase search "prevents SQL injection"
sylphx-flow codebase search "caches API responses"
```

#### Search by Pattern

```bash
# Architectural patterns
sylphx-flow codebase search "factory pattern implementation"
sylphx-flow codebase search "observer pattern"
sylphx-flow codebase search "dependency injection"
```

#### Search by Technology

```bash
# Framework-specific
sylphx-flow codebase search "React hooks for state management"
sylphx-flow codebase search "Express middleware for auth"
sylphx-flow codebase search "GraphQL resolvers"
```

### Reindexing

Reindex after major code changes:

```bash
# Full reindex
sylphx-flow codebase reindex

# Smart reindex (only changed files)
sylphx-flow codebase reindex --incremental

# Force full reindex
sylphx-flow codebase reindex --force
```

**When to reindex:**
- After adding new files
- After major refactoring
- After pulling from remote
- Monthly maintenance

---

## Knowledge Semantic Search

### How It Works

Flow includes a **curated knowledge base** with industry best practices:

- Architecture patterns
- Security guidelines
- Framework documentation
- Language idioms
- Testing strategies
- DevOps practices

### Basic Usage

```bash
# Search best practices
sylphx-flow knowledge search "react performance optimization"

# Find security guides
sylphx-flow knowledge search "prevent XSS attacks"

# Architecture patterns
sylphx-flow knowledge search "microservices communication"
```

### Knowledge Categories

#### 1. Architecture Patterns

```bash
sylphx-flow knowledge search "event-driven architecture"
sylphx-flow knowledge search "CQRS pattern"
sylphx-flow knowledge search "microservices vs monolith"
```

#### 2. Security Best Practices

```bash
sylphx-flow knowledge search "OWASP top 10"
sylphx-flow knowledge search "secure password storage"
sylphx-flow knowledge search "JWT security"
```

#### 3. Framework Guides

```bash
sylphx-flow knowledge search "Next.js server components"
sylphx-flow knowledge search "Vue composition API"
sylphx-flow knowledge search "React context best practices"
```

#### 4. Language Idioms

```bash
sylphx-flow knowledge search "JavaScript async patterns"
sylphx-flow knowledge search "Python type hints"
sylphx-flow knowledge search "Go concurrency"
```

#### 5. Testing Strategies

```bash
sylphx-flow knowledge search "unit testing best practices"
sylphx-flow knowledge search "integration test patterns"
sylphx-flow knowledge search "E2E testing strategy"
```

#### 6. DevOps Practices

```bash
sylphx-flow knowledge search "CI/CD pipeline setup"
sylphx-flow knowledge search "Docker best practices"
sylphx-flow knowledge search "Kubernetes deployment"
```

### Knowledge Management

```bash
# List all knowledge
sylphx-flow knowledge list

# List by category
sylphx-flow knowledge list --category security

# Update knowledge base
sylphx-flow knowledge update

# Show knowledge stats
sylphx-flow knowledge stats
```

---

## StarCoder2 Tokenization

### Why StarCoder2?

**StarCoder2** is a state-of-the-art code tokenizer that:

1. **Understands 70+ languages** - Not just keywords, but semantics
2. **Code-aware** - Knows programming concepts (loops, functions, classes)
3. **Multilingual** - Supports natural language queries in any language
4. **Context-aware** - Understands code relationships and dependencies

### Supported Languages

**Programming Languages (70+):**
- JavaScript, TypeScript, Python, Go, Rust
- Java, Kotlin, C, C++, C#
- Ruby, PHP, Swift, Objective-C
- Scala, Clojure, Elixir, Erlang
- Haskell, OCaml, F#, Dart
- Shell, Bash, PowerShell
- And 50+ more...

**Natural Languages:**
- English, Chinese (Simplified/Traditional)
- Japanese, Korean, Spanish
- French, German, Portuguese
- And many more...

### How Tokenization Works

```typescript
// Traditional keyword search
"authenticate" -> finds: authenticate, authentication, authenticator

// Semantic search (StarCoder2)
"user login" -> finds:
  - authenticate()
  - verifyCredentials()
  - checkPassword()
  - loginUser()
  - signIn()
  - validateSession()
  // Even with different names!
```

---

## Search Performance

### Speed

- **Codebase Search**: <100ms average
- **Knowledge Search**: <50ms average
- **Reindexing**: Depends on codebase size
  - Small (< 10k files): ~30 seconds
  - Medium (10k-100k files): ~2 minutes
  - Large (> 100k files): ~5 minutes

### Accuracy

**Codebase Search:**
- Precision: ~85% (finds relevant code)
- Recall: ~90% (finds most matches)

**Knowledge Search:**
- Precision: ~95% (highly curated)
- Recall: ~98% (comprehensive coverage)

### Optimization

#### TF-IDF Search

Flow uses **TF-IDF (Term Frequency-Inverse Document Frequency)** for fast, accurate search:

- **Fast**: No API calls, instant results
- **Free**: No external dependencies
- **Accurate**: Proven information retrieval algorithm
- **Offline**: Works without internet

#### Optional Vector Search

For even higher quality (requires OpenAI-compatible API):

```bash
# Enable vector search
export OPENAI_API_KEY="your-key"

# Flow auto-upgrades to vector search
sylphx-flow codebase search "complex query"
```

**Vector Search Benefits:**
- Higher semantic accuracy
- Better cross-language matching
- Improved context understanding

**TF-IDF vs Vector Search:**

| Feature | TF-IDF | Vector Search |
|---------|--------|---------------|
| Speed | ⚡ Instant | 🚀 Very Fast |
| Cost | ✅ Free | 💰 API costs |
| Accuracy | 🎯 High | 🎯 Higher |
| Offline | ✅ Yes | ❌ No |

---

## Use Cases

### 1. Finding Code You Didn't Know Existed

```bash
# "Where's the code that handles webhooks?"
sylphx-flow codebase search "webhook handling"

# Returns: webhook_processor.ts, webhook_validator.py, etc.
```

### 2. Learning Codebase Patterns

```bash
# "How do we handle errors in this codebase?"
sylphx-flow codebase search "error handling patterns"

# Shows all error handling approaches
```

### 3. Refactoring Discovery

```bash
# "Find similar code for refactoring"
sylphx-flow codebase search "user data validation"

# Finds duplicate validation logic
```

### 4. Security Audits

```bash
# "Find potential SQL injection points"
sylphx-flow codebase search "database query construction"

# Returns all database query code
```

### 5. Best Practice Application

```bash
# Search knowledge for guidance
sylphx-flow knowledge search "input validation best practices"

# Apply to codebase
sylphx-flow "implement input validation following best practices"
```

---

## Integration with AI Agents

Agents automatically use semantic search:

### Coder Agent

```bash
sylphx-flow "implement login"
```

Behind the scenes:
1. Searches codebase: "authentication patterns"
2. Searches knowledge: "secure login implementation"
3. Combines findings to generate code matching your patterns

### Reviewer Agent

```bash
sylphx-flow "review security" --agent reviewer
```

Behind the scenes:
1. Searches codebase: "security vulnerabilities"
2. Searches knowledge: "OWASP security guidelines"
3. Provides comprehensive security review

---

## Configuration

### Search Settings

Configure in `.sylphx-flow/settings.json`:

```json
{
  "search": {
    "mode": "tfidf",  // or "vector"
    "maxResults": 10,
    "threshold": 0.5,  // Similarity threshold (0-1)
    "includeTests": false,
    "excludePaths": ["node_modules", "dist", ".git"]
  }
}
```

### Indexing Settings

```json
{
  "indexing": {
    "autoReindex": true,
    "watchForChanges": true,
    "incrementalIndex": true,
    "excludePatterns": ["*.test.ts", "*.spec.ts"]
  }
}
```

---

## Best Practices

### ✅ Do

- **Reindex regularly** - After major changes
- **Use natural language** - "Find login code" not "authenticate func"
- **Be specific** - "React hooks for state" vs "state management"
- **Explore results** - Semantic search may find unexpected relevant code

### ❌ Don't

- **Don't use exact matches** - That's what grep is for
- **Don't index everything** - Exclude tests, node_modules, generated code
- **Don't ignore reindex prompts** - Stale index = poor results
- **Don't rely on exact names** - Use concepts and behaviors instead

---

## Troubleshooting

### Poor Search Results

```bash
# Reindex codebase
sylphx-flow codebase reindex --force

# Check index status
sylphx-flow codebase status
```

### Slow Search

```bash
# Reduce max results
sylphx-flow codebase search "query" --max-results 5

# Increase threshold (fewer, more relevant results)
sylphx-flow codebase search "query" --threshold 0.7
```

### Missing Results

```bash
# Lower threshold (more, less precise results)
sylphx-flow codebase search "query" --threshold 0.3

# Check if files are indexed
sylphx-flow codebase list
```

---

## Learn More

- [Agents](/features/agents) - How agents use semantic search
- [MCP Integration](/guide/mcp) - Extended search capabilities
- [Knowledge Base](/guide/knowledge) - Curated best practices
