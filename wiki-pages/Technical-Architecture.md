# Technical Architecture

Deep dive into Sylphx Flow's technical implementation, focusing on **Starcode embeddings**, **functional architecture**, and **MCP integration**.

## 🌟 Starcode Embeddings - The Core Innovation

### What is Starcode?

**Starcode** is a state-of-the-art code embedding model that transforms code into semantic vectors for understanding and search.

**Key Properties:**
- 🌍 **70+ Programming Languages** - From TypeScript to Assembly
- 🗣️ **Natural Language Support** - English, Chinese, Japanese, etc.
- 🎯 **Semantic Understanding** - Understands what code *does*, not just what it *says*
- ⚡ **High Performance** - Fast embedding generation
- 🎨 **Context-Aware** - Understands code structure and relationships

### Why Starcode?

#### Comparison with Alternatives

| Feature | Starcode | OpenAI Embeddings | CodeBERT | UnixCoder |
|---------|----------|-------------------|----------|-----------|
| **Languages** | 70+ | Limited | ~10 | ~5 |
| **NL + Code** | ✅ Hybrid | Separate | ✅ Hybrid | Limited |
| **Code Structure** | ✅ Deep | Surface | ✅ Deep | Medium |
| **Performance** | Fast | API latency | Fast | Medium |
| **Cost** | Open source | Per token | Open source | Open source |
| **Context Size** | 2048 | 8192 | 512 | 512 |

**Why Sylphx Flow chose Starcode:**
1. **70+ language support** - True polyglot search
2. **Hybrid NL+Code** - Search in any language, find any code
3. **Open source** - No API costs, runs locally
4. **Optimized for code** - Better than general-purpose embeddings

### First Production Implementation

**Sylphx Flow is the first production system to implement:**

1. **Starcode at scale** - Indexing entire codebases
2. **Hybrid search** - Natural language + code simultaneously
3. **Real-time indexing** - Fast reindexing for code changes
4. **Cross-language understanding** - Search concepts across languages

### Technical Details

#### Embedding Generation

```typescript
// Starcode embedding pipeline
class StarcodeEmbeddings {
  async embed(code: string): Promise<number[]> {
    // 1. Tokenization (code-aware)
    const tokens = this.tokenize(code);

    // 2. Generate embeddings (1536 dimensions)
    const embedding = await this.model.encode(tokens);

    // 3. Normalize for similarity search
    return this.normalize(embedding);
  }

  private tokenize(code: string): Token[] {
    // Code-aware tokenization
    // Understands: functions, classes, variables, comments
    // Preserves: structure, syntax, semantic meaning
  }
}
```

#### Vector Search

```typescript
// Semantic similarity search
class VectorSearch {
  async search(query: string, limit: number = 10) {
    // 1. Embed the query
    const queryVector = await this.embeddings.embed(query);

    // 2. Cosine similarity search in vector database
    const results = await this.vectorDB.similaritySearch(
      queryVector,
      limit,
      threshold: 0.7  // Minimum similarity score
    );

    // 3. Rank by relevance
    return this.rankResults(results);
  }
}
```

#### Chunking Strategy

```typescript
// Smart code chunking
class CodeChunker {
  chunk(code: string): Chunk[] {
    // Parse code into semantic units
    const ast = this.parse(code);

    // Chunk by:
    // - Function definitions
    // - Class definitions
    // - Import statements
    // - Comment blocks
    // - Logical sections

    return this.ast.extractSemanticUnits();
  }
}
```

### 70+ Language Support

#### Supported Languages

**Tier 1 (Full Support):**
```
TypeScript, JavaScript, Python, Java, C++, C#, Go, Rust,
Ruby, PHP, Swift, Kotlin, Scala, Dart, R
```

**Tier 2 (Strong Support):**
```
Haskell, OCaml, Erlang, Elixir, Clojure, F#, Julia, Lua,
Perl, Shell, PowerShell, Groovy, Objective-C
```

**Tier 3 (Basic Support):**
```
Assembly, COBOL, Fortran, Ada, Lisp, Scheme, Prolog,
SQL, HTML, CSS, YAML, JSON, XML, Markdown, ...
```

**Plus 40+ more languages!**

#### Cross-Language Understanding

```typescript
// Example: Search for authentication across languages

// Query in ANY natural language
flow codebase search "user authentication logic"  // English
flow codebase search "用戶認證邏輯"              // Chinese
flow codebase search "ユーザー認証ロジック"      // Japanese

// All find the same code in multiple programming languages:

// TypeScript
function authenticateUser(credentials: Credentials) {
  // ...
}

// Python
def authenticate_user(credentials):
    # ...

// Go
func AuthenticateUser(creds Credentials) error {
    // ...
}

// Java
public User authenticateUser(Credentials credentials) {
    // ...
}

// All matched semantically, not by keywords!
```

### Hybrid Natural Language + Code Search

#### How It Works

```typescript
// Hybrid search architecture
class HybridSearch {
  async search(query: string) {
    // 1. Determine query type
    const type = this.analyzeQuery(query);

    if (type === 'natural_language') {
      // Search using NL understanding
      return this.searchByMeaning(query);
    } else if (type === 'code_pattern') {
      // Search using code structure
      return this.searchByStructure(query);
    } else {
      // Hybrid: combine both approaches
      const nlResults = await this.searchByMeaning(query);
      const codeResults = await this.searchByStructure(query);
      return this.mergeResults(nlResults, codeResults);
    }
  }
}
```

#### Example Searches

```typescript
// Natural language queries in different languages
"code that handles user login"         // English
"處理用戶登入的代碼"                   // Chinese
"ユーザーログインを処理するコード"     // Japanese
"código que maneja el login"           // Spanish

// All find the same authentication code!

// Code pattern queries
"async function authenticate"
"class AuthService extends"
"def authenticate_user"

// Technical concept queries
"JWT token generation"
"password hashing with bcrypt"
"OAuth 2.0 flow implementation"

// All work seamlessly with Starcode!
```

## 🏗️ Functional Architecture

### Why Functional Programming?

Sylphx Flow is built on **pure functional programming principles** for several key reasons:

#### 1. **Natural Tool Composition**

```typescript
// MCP tools = Pure functions
// Easy to compose

// Sequential composition
const result = await pipe(
  knowledge_search,
  codebase_search,
  synthesize
)("authentication");

// Parallel composition
const [knowledge, code, time] = await Promise.all([
  knowledge_search("auth"),
  codebase_search("auth"),
  time_get_current()
]);

// Conditional composition
const result = query.includes("security")
  ? await compose(knowledge_search, security_check)
  : await knowledge_search(query);
```

#### 2. **Predictable and Testable**

```typescript
// Pure function = Same input → Same output
test('knowledge_search is pure', () => {
  const result1 = knowledge_search('react');
  const result2 = knowledge_search('react');

  expect(result1).toEqual(result2);
  // No mocks needed!
});

// Easy to test edge cases
test('handles empty results', () => {
  const result = knowledge_search('nonexistent');
  expect(result).toEqual([]);
});
```

#### 3. **Parallel Execution**

```typescript
// No shared state = Safe parallelization
async function handleComplexQuery(query: string) {
  // All execute in parallel
  const results = await Promise.all([
    knowledge_search(query),
    codebase_search(query),
    time_get_current(),
    sysinfo_get()
  ]);

  // No race conditions, no locks needed
  return synthesize(results);
}
```

#### 4. **Agent Orchestration**

```typescript
// Agents as pure functions
type Agent = (task: Task, context: Context) => Result;

// Orchestrator composes agents
class Orchestrator {
  async execute(task: Task) {
    const context = await this.buildContext();

    // Compose agents functionally
    return await pipe(
      (t) => this.coderAgent(t, context),
      (r) => this.reviewerAgent(r, context),
      (r) => this.writerAgent(r, context)
    )(task);
  }
}
```

### Core Principles

#### 1. Composition over Inheritance

```typescript
// ❌ Bad: Inheritance hierarchy
class BaseSearch {
  search() { }
}

class KnowledgeSearch extends BaseSearch {
  search() { /* override */ }
}

class CodebaseSearch extends BaseSearch {
  search() { /* override */ }
}

// ✅ Good: Function composition
const createSearch = (embedFn, dbFn) => async (query) => {
  const embedding = await embedFn(query);
  return await dbFn(embedding);
};

const knowledgeSearch = createSearch(
  embedKnowledge,
  searchKnowledgeDB
);

const codebaseSearch = createSearch(
  embedCode,
  searchCodebaseDB
);
```

#### 2. Pure Functions

```typescript
// ✅ Pure: No side effects
function knowledge_search(query: string): Promise<Result[]> {
  // Only depends on input
  // Always returns same result for same input
  // No mutations, no external state
}

// ❌ Impure: Has side effects
let cache = {};
function impure_search(query: string) {
  if (cache[query]) return cache[query];
  const result = search(query);
  cache[query] = result;  // Side effect!
  return result;
}
```

#### 3. Immutable Data

```typescript
// ✅ Immutable transformations
const addResult = (results: Result[], newResult: Result) => [
  ...results,
  newResult
];

const filterResults = (results: Result[], predicate) =>
  results.filter(predicate);

// ❌ Mutable operations
const addResult = (results, newResult) => {
  results.push(newResult);  // Mutation!
  return results;
};
```

#### 4. Declarative over Imperative

```typescript
// ✅ Declarative: What, not how
const results = await pipe(
  knowledge_search,
  filter(relevantOnly),
  map(formatResult),
  take(5)
)("authentication");

// ❌ Imperative: How, step by step
const results = [];
const searchResults = await knowledge_search("authentication");
for (let i = 0; i < searchResults.length; i++) {
  if (isRelevant(searchResults[i])) {
    results.push(formatResult(searchResults[i]));
    if (results.length >= 5) break;
  }
}
```

### Functional Patterns Used

#### 1. Pipeline Pattern

```typescript
// Data flows through transformations
const processQuery = pipe(
  normalize,
  tokenize,
  embed,
  search,
  rank,
  format
);

const result = await processQuery(userQuery);
```

#### 2. Composition Pattern

```typescript
// Compose small functions into larger ones
const searchWithContext = compose(
  synthesize,
  parallel([
    knowledge_search,
    codebase_search,
    getSystemContext
  ])
);
```

#### 3. Higher-Order Functions

```typescript
// Functions that operate on functions
const withCache = (fn) => {
  const cache = new Map();
  return async (input) => {
    if (cache.has(input)) return cache.get(input);
    const result = await fn(input);
    cache.set(input, result);
    return result;
  };
};

const cachedSearch = withCache(knowledge_search);
```

#### 4. Monadic Error Handling

```typescript
// Result type for explicit error handling
type Result<T, E> = Ok<T> | Err<E>;

const search = async (query: string): Promise<Result<Data[], Error>> => {
  try {
    const data = await performSearch(query);
    return Ok(data);
  } catch (error) {
    return Err(error);
  }
};

// Chain operations safely
const result = await search("query")
  .then(map(formatResult))
  .then(filter(relevantOnly));
```

## 🔌 MCP Integration Architecture

### MCP Server Structure

```typescript
// Modular plugin architecture
class MCPServer {
  plugins: Plugin[] = [
    new KnowledgePlugin(),
    new CodebasePlugin(),
    new TimePlugin()
  ];

  async handleRequest(request: MCPRequest) {
    // Route to appropriate plugin
    const plugin = this.findPlugin(request.tool);
    return await plugin.execute(request);
  }
}
```

### Plugin System

```typescript
// Each domain = one plugin
interface Plugin {
  name: string;
  tools: Tool[];
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

class KnowledgePlugin implements Plugin {
  name = "knowledge";

  tools = [
    {
      name: "knowledge_search",
      description: "Search curated guidelines",
      inputSchema: knowledgeSearchSchema,
      handler: this.search.bind(this)
    },
    {
      name: "knowledge_get",
      description: "Get specific document",
      inputSchema: knowledgeGetSchema,
      handler: this.get.bind(this)
    }
  ];

  async search(params: SearchParams) {
    // Pure function implementation
    return await this.storage.search(params.query);
  }
}
```

### Storage Layer

```typescript
// Unified storage interface
interface UnifiedStorage {
  search(query: string): Promise<Result[]>;
  get(key: string): Promise<Data | null>;
  set(key: string, data: Data): Promise<void>;
  delete(key: string): Promise<void>;
}

// Implementations for different domains
class KnowledgeStorage implements UnifiedStorage {
  // Uses Starcode embeddings
  // Stores in vector database
}

class CodebaseStorage implements UnifiedStorage {
  // Uses Starcode embeddings
  // Stores in vector database
  // Monitors file changes
}
```

## 📊 Performance Characteristics

### Embedding Performance

```typescript
// Starcode embedding generation
const performance = {
  singleFile: "10-50ms",        // Average TypeScript file
  largeFile: "50-200ms",        // 1000+ lines
  batchProcessing: "100-500ms", // 10 files
  fullIndex: "1-5 minutes"      // 1000 files
};
```

### Search Performance

```typescript
// Vector similarity search
const searchPerformance = {
  coldSearch: "100-300ms",    // First search
  warmSearch: "20-50ms",      // Subsequent searches
  complexQuery: "50-100ms",   // Multi-term queries
  largDatabase: "100-200ms"   // 10,000+ entries
};
```

### Scalability

```typescript
// Performance at scale
const scalability = {
  files: {
    small: "< 100 files: <1s",
    medium: "100-1,000 files: 1-5s",
    large: "1,000-10,000 files: 10-60s",
    xlarge: "10,000+ files: 1-5 min"
  },
  memory: {
    small: "~50MB",
    medium: "~200MB",
    large: "~500MB",
    xlarge: "~1-2GB"
  }
};
```

## 🎯 Design Trade-offs

### Trade-off: Starcode vs OpenAI Embeddings

**Chose Starcode:**
- ✅ 70+ languages vs limited
- ✅ Code-optimized vs general-purpose
- ✅ Local/free vs API/cost
- ✅ Fast vs latency
- ❌ 1536 dims vs 3072 dims (less capacity)

### Trade-off: Curated vs Custom Knowledge

**Chose Curated:**
- ✅ Quality guaranteed
- ✅ Zero maintenance
- ✅ Optimized performance
- ❌ Less flexibility
- **Mitigation:** Use codebase search for project-specific patterns

### Trade-off: Functional vs OOP

**Chose Functional:**
- ✅ Easy composition
- ✅ Easy testing
- ✅ Easy parallelization
- ❌ Steeper learning curve
- **Mitigation:** Clear patterns and examples

## 📚 Next Steps

Learn more about the implementation:

- **[MEP Design Philosophy](MEP-Design-Philosophy)** - Design principles
- **[Codebase Search](Codebase-Search)** - Using Starcode in practice
- **[Knowledge Base](Knowledge-Base)** - Curated guidelines system
- **[Agent Framework](Agent-Framework)** - Functional agent composition

---

*Last Updated: 2025-10-30 | [Edit this page](https://github.com/sylphxltd/flow/wiki/Technical-Architecture) | [Report Issues](https://github.com/sylphxltd/flow/issues)*
