# MCP Codebase Search

A standalone Model Context Protocol (MCP) server providing intelligent codebase search using TF-IDF (Term Frequency-Inverse Document Frequency).

## Features

- 🔍 **Intelligent Search** - TF-IDF based ranking for relevant results
- 📁 **.gitignore Support** - Respects your .gitignore patterns automatically
- 🚀 **Fast Indexing** - In-memory indexing with progress tracking
- 🎯 **Code-Aware** - Understands camelCase, snake_case, and code syntax
- 🔧 **Configurable** - Filter by file extensions, paths, and more
- 💾 **Lightweight** - No external dependencies for indexing

## Installation

### NPM

```bash
npm install -g mcp-codebase-search
```

### From Source

```bash
cd packages/mcp-codebase-search
npm install
npm run build
npm link
```

## Usage

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-codebase-search",
      "args": [
        "--root=/path/to/your/project",
        "--max-size=1048576"
      ]
    }
  }
}
```

### Command Line Options

- `--root=<path>` - Codebase root directory (default: current directory)
- `--max-size=<bytes>` - Maximum file size to index (default: 1048576 = 1MB)
- `--no-auto-index` - Disable automatic indexing on startup

### Examples

```bash
# Index current directory
mcp-codebase-search

# Index specific directory
mcp-codebase-search --root=/path/to/project

# Index with custom max file size (2MB)
mcp-codebase-search --root=/path/to/project --max-size=2097152

# Start without auto-indexing
mcp-codebase-search --no-auto-index
```

## MCP Tool: `codebase_search`

Search your codebase for implementations, functions, classes, or any code-related content.

### Parameters

- `query` (required): Search query - use natural language, function names, or technical terms
- `limit` (optional): Maximum number of results (default: 10)
- `include_content` (optional): Include code snippets in results (default: true)
- `file_extensions` (optional): Filter by file extensions (e.g., `[".ts", ".tsx"]`)
- `path_filter` (optional): Filter by path pattern (e.g., `"src/components"`)
- `exclude_paths` (optional): Exclude paths (e.g., `["node_modules", "dist"]`)

### Example Search

```json
{
  "query": "user authentication",
  "limit": 5,
  "file_extensions": [".ts", ".tsx"],
  "path_filter": "src",
  "exclude_paths": ["tests", "node_modules"]
}
```

### Response Format

```markdown
# 🔍 Codebase Search Results

**Query:** "user authentication"
**Results:** 3 / 1234 files

## 1. `src/auth/login.ts`

- **Score:** 0.8765
- **Language:** TypeScript
- **Size:** 12.34 KB
- **Matched Terms:** user, authentication, login

**Snippet:**
```
15: export async function authenticateUser(credentials: UserCredentials) {
16:   const user = await findUserByEmail(credentials.email);
17:   return verifyPassword(user, credentials.password);
```

---
```

## How It Works

### TF-IDF Indexing

1. **Scanning** - Recursively scans codebase respecting .gitignore
2. **Tokenization** - Extracts identifiers, keywords, and meaningful terms
3. **TF-IDF Calculation** - Calculates term frequency and inverse document frequency
4. **Vector Storage** - Stores document vectors for fast cosine similarity search

### Search Ranking

Results are ranked using:
- **Cosine Similarity** - Measures angle between query and document vectors
- **Exact Match Boost** - 1.5x boost for exact term matches
- **Phrase Match Boost** - 2.0x boost when all query terms are found

## Supported File Types

### Source Code
- TypeScript/JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`)
- Python (`.py`)
- Java (`.java`)
- Go (`.go`)
- Rust (`.rs`)
- C/C++ (`.c`, `.cpp`, `.h`, `.hpp`)
- C# (`.cs`)
- Ruby (`.rb`)
- PHP (`.php`)
- Swift (`.swift`)
- Kotlin (`.kt`)

### Configuration & Data
- JSON (`.json`)
- YAML (`.yaml`, `.yml`)
- TOML (`.toml`)
- XML (`.xml`)

### Documentation
- Markdown (`.md`)
- Text (`.txt`)

### Scripts
- Shell (`.sh`, `.bash`, `.zsh`)
- SQL (`.sql`)

## Default Ignored Patterns

The following patterns are automatically ignored:
- `node_modules`
- `.git`, `.svn`, `.hg`
- `.DS_Store`, `.idea`, `.vscode`
- `dist`, `build`, `coverage`
- `.cache`, `tmp`, `temp`
- `*.log`

Plus any patterns in your `.gitignore` file.

## Performance

- **Indexing Speed**: ~1000-2000 files/second (depending on file size)
- **Search Speed**: <100ms for most queries
- **Memory Usage**: ~1-2 MB per 1000 files indexed

## Best Practices

1. **Search Before Coding**: Use codebase search BEFORE writing new code to find existing patterns
2. **Use Specific Queries**: More specific queries yield better results
3. **Filter Appropriately**: Use `file_extensions` and `path_filter` to narrow results
4. **Review Snippets**: Check code snippets to understand context before reading full files

## Limitations

- Maximum file size: Configurable (default 1MB)
- Binary files are automatically skipped
- Very large codebases (>100k files) may take longer to index
- Search is case-insensitive
- No regex support in queries (use natural language instead)

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npm run type-check
```

### Clean

```bash
npm run clean
```

## Architecture

```
mcp-codebase-search/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/
│   │   └── codebase-search.ts # MCP tool registration
│   ├── services/
│   │   ├── indexer.ts        # Codebase indexing
│   │   └── tfidf.ts          # TF-IDF implementation
│   ├── storage/
│   │   └── memory.ts         # In-memory storage
│   └── utils/
│       └── file-scanner.ts   # File scanning utilities
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues and questions:
- GitHub Issues: https://github.com/sylphxltd/flow/issues
- Repository: https://github.com/sylphxltd/flow

## Related Projects

- [Sylphx Flow](https://github.com/sylphxltd/flow) - AI-powered development workflow automation
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification

---

Made with ❤️ by Sylphx
