# MCP Integration - Extended Capabilities

Model Context Protocol (MCP) is an open standard that allows AI agents to access external tools and services. Sylphx Flow integrates with MCP servers to give agents superpowers beyond code generation.

## What is MCP?

**Model Context Protocol (MCP)** is a protocol that enables:
- **Tool Access**: AI agents can use specialized tools
- **Data Sources**: Access to external data and APIs
- **Service Integration**: Connection to various services
- **Extensibility**: Add new capabilities without changing core code

Think of MCP as **plugins for AI agents**.

---

## Pre-configured MCP Servers

Flow comes with battle-tested MCP servers:

### 1. Playwright

Browser automation and testing:

**Capabilities:**
- Automated browser testing
- Web scraping and data extraction
- E2E test automation
- Visual regression testing
- Cross-browser testing

**Use Cases:**
```bash
# Automated testing
sylphx-flow "create E2E tests for authentication flow"
# ✅ Generates Playwright test suite

# Web scraping
sylphx-flow "extract product data from this website"
# ✅ Uses Playwright for dynamic content

# Visual testing
sylphx-flow "add screenshot tests for dashboard"
# ✅ Creates visual regression tests
```

**Configuration:**
```json
// .sylphx-flow/mcp-servers.json
{
  "playwright": {
    "enabled": true,
    "browsers": ["chromium", "firefox", "webkit"]
  }
}
```

---

### 2. Web Search Prime

Real-time internet information access:

**Capabilities:**
- Search the web for current information
- Get latest documentation
- Find code examples
- Research best practices

**Use Cases:**
```bash
# AI automatically uses web search when needed
sylphx-flow "implement authentication using latest Next.js 15 patterns"
# ✅ Searches for Next.js 15 auth documentation

sylphx-flow "fix this bug with latest library version"
# ✅ Searches for known issues and solutions
```

**Configuration:**
```json
// .sylphx-flow/mcp-servers.json
{
  "web-search-prime": {
    "enabled": true,
    "apiKey": "auto",  // Uses MCP credentials
    "maxResults": 5
  }
}
```

---

### 3. Z.AI Vision & Video Analysis

Advanced image and video understanding:

**Capabilities:**
- Analyze screenshots and UI designs
- Understand video content
- Extract text from images (OCR)
- Generate code from UI designs

**Use Cases:**
```bash
# Analyze design and generate code
sylphx-flow "replicate this design" --attach design.png

# Video analysis
sylphx-flow "document what happens in this demo video" --attach demo.mp4

# OCR and data extraction
sylphx-flow "extract data from this screenshot" --attach screenshot.png
```

**Supported Formats:**
- Images: PNG, JPG, JPEG (max 5MB)
- Videos: MP4, MOV, M4V (max 8MB)

---

### 4. Code Indexing Server

Semantic code understanding and navigation:

**Capabilities:**
- Index codebase for semantic search
- Understand code relationships
- Navigate code dependencies
- Find usage patterns

**Automatically Used:**
```bash
# AI uses code indexing behind the scenes
sylphx-flow "refactor authentication to use OAuth"
# ✅ Finds all auth-related code
# ✅ Understands relationships
# ✅ Safe refactoring
```

---

### 5. File Operations Server

Advanced file manipulation:

**Capabilities:**
- Bulk file operations
- Smart file searching
- Template generation
- File transformations

**Examples:**
```bash
# Batch file operations
sylphx-flow "rename all .js files to .ts"

# Smart file generation
sylphx-flow "create component structure for UserProfile"
# ✅ Creates: component, test, styles, types
```

---

### 6. Git Operations Server

Repository management:

**Capabilities:**
- Advanced git operations
- Branch management
- Commit analysis
- PR creation and review

**Examples:**
```bash
# Complex git operations
sylphx-flow "create feature branch and PR for auth changes"

# Commit history analysis
sylphx-flow "analyze commits affecting authentication"
```

---

## How MCP Works with Flow

### Automatic Discovery

Flow automatically discovers available MCP servers:

```bash
# List available MCP servers
sylphx-flow --list-mcp-servers

# Output:
# ✅ playwright (active)
# ✅ web-search-prime (active)
# ✅ zai-vision (active)
# ✅ code-indexing (active)
# ✅ file-operations (active)
# ✅ git-operations (active)
```

### Automatic Integration

Agents use MCP servers automatically when needed:

```typescript
// You type:
sylphx-flow "implement OAuth login"

// Behind the scenes:
1. Code Indexing: Find existing auth patterns
2. Web Search: Get latest OAuth best practices
3. Playwright: Test authentication flow
4. Knowledge Base: Security guidelines
5. File Operations: Create necessary files
6. Git Operations: Create feature branch

// You get: Complete, secure implementation
```

### Explicit MCP Usage

You can also explicitly request MCP tools:

```bash
# Force web search
sylphx-flow "implement X" --use-web-search

# Force vision analysis
sylphx-flow "replicate design" --attach image.png --use-vision

# Disable specific MCP
sylphx-flow "task" --disable-mcp web-search
```

---

## Installing MCP Servers

### During Setup

MCP servers are automatically installed:

```bash
# First time setup
sylphx-flow --init-only

# Auto-installs:
# ✅ playwright
# ✅ web-search-prime
# ✅ zai-vision
# ✅ code-indexing
# ✅ file-operations
# ✅ git-operations
```

### Manual Installation

Install specific MCP servers:

```bash
# Install single server
sylphx-flow mcp install web-search-prime

# Install multiple
sylphx-flow mcp install web-search-prime zai-vision

# Reinstall all
sylphx-flow mcp install --all
```

### Custom MCP Servers

Add third-party or custom MCP servers:

```bash
# Add custom server
sylphx-flow mcp add custom-server --url https://example.com/mcp

# Configure
sylphx-flow mcp configure custom-server
```

**Custom Server Configuration:**
```json
// .sylphx-flow/mcp-servers.json
{
  "custom-server": {
    "enabled": true,
    "url": "https://example.com/mcp",
    "apiKey": "${CUSTOM_API_KEY}",
    "timeout": 30000
  }
}
```

---

## MCP Server Management

### Enable/Disable Servers

```bash
# Disable server
sylphx-flow mcp disable web-search

# Enable server
sylphx-flow mcp enable web-search

# Status
sylphx-flow mcp status
```

### Update Servers

```bash
# Update single server
sylphx-flow mcp update web-search-prime

# Update all
sylphx-flow mcp update --all

# Check for updates
sylphx-flow mcp check-updates
```

### Remove Servers

```bash
# Remove server
sylphx-flow mcp remove custom-server

# Remove all unused
sylphx-flow mcp cleanup
```

---

## MCP Configuration

### Global Settings

```json
// .sylphx-flow/settings.json
{
  "mcp": {
    "enabled": true,
    "autoInstall": true,
    "autoUpdate": false,
    "timeout": 30000,
    "retries": 3
  }
}
```

### Per-Server Settings

```json
// .sylphx-flow/mcp-servers.json
{
  "web-search-prime": {
    "enabled": true,
    "priority": 1,  // Higher = used first
    "maxResults": 5,
    "timeout": 10000
  },
  "zai-vision": {
    "enabled": true,
    "priority": 2,
    "maxFileSize": "5MB"
  }
}
```

### Environment Variables

```bash
# MCP credentials
export MCP_WEB_SEARCH_API_KEY="your-key"
export MCP_CUSTOM_SERVER_URL="https://example.com"

# Per-project config
export SYLPHX_MCP_CONFIG="./.sylphx-flow/mcp-servers.json"
```

---

## Use Cases

### 1. Current Information

```bash
# Latest framework features
sylphx-flow "use latest React 19 features"
# ✅ Web search finds React 19 docs
# ✅ Implements using new APIs

# Current best practices
sylphx-flow "implement auth with current best practices"
# ✅ Searches for 2025 security guidelines
```

### 2. Design to Code

```bash
# UI replication
sylphx-flow "replicate this design" --attach figma-export.png
# ✅ Vision analyzes layout
# ✅ Generates component code
# ✅ Matches design exactly

# Video documentation
sylphx-flow "document user flow from this video" --attach demo.mp4
# ✅ Analyzes video
# ✅ Creates step-by-step documentation
```

### 3. Codebase Navigation

```bash
# Complex refactoring
sylphx-flow "refactor payment system to use Stripe"
# ✅ Finds all payment code
# ✅ Understands dependencies
# ✅ Safe, comprehensive refactor

# Code discovery
sylphx-flow "where is user authentication handled?"
# ✅ Semantic code search
# ✅ Shows all auth-related code
```

### 4. Advanced Git Operations

```bash
# Complex workflows
sylphx-flow "create release branch from develop"
# ✅ Git operations server handles it

# Commit analysis
sylphx-flow "analyze changes since last release"
# ✅ Detailed change analysis
```

---

## MCP Security

### API Key Management

```bash
# Secure key storage
sylphx-flow mcp set-key web-search-prime
# Prompts for key, stores encrypted

# Environment variables (recommended)
export MCP_WEB_SEARCH_KEY="your-key"

# Never commit keys
echo ".sylphx-flow/keys.json" >> .gitignore
```

### Permissions

Control what MCP servers can access:

```json
// .sylphx-flow/mcp-permissions.json
{
  "web-search-prime": {
    "allowNetworkAccess": true,
    "allowFileAccess": false,
    "allowGitAccess": false
  },
  "file-operations": {
    "allowNetworkAccess": false,
    "allowFileAccess": true,
    "allowedPaths": ["src/**", "tests/**"]
  }
}
```

### Audit Logging

```bash
# Enable MCP audit logs
sylphx-flow mcp audit enable

# View logs
sylphx-flow mcp audit logs

# Export audit trail
sylphx-flow mcp audit export --format json
```

---

## Developing MCP Servers

### MCP Server Structure

```typescript
// my-mcp-server.ts
export default {
  name: "my-server",
  version: "1.0.0",
  description: "Custom MCP server",

  // Available tools
  tools: {
    myTool: {
      description: "Does something useful",
      parameters: {
        input: { type: "string", required: true }
      },
      handler: async (params) => {
        // Tool implementation
        return { result: "success" };
      }
    }
  },

  // Initialize
  initialize: async (config) => {
    // Setup code
  }
};
```

### Publishing MCP Servers

```bash
# Package server
npm pack

# Publish to registry
npm publish

# Share with community
sylphx-flow mcp submit my-server
```

---

## Performance

### MCP Call Optimization

```json
{
  "mcp": {
    "cache": {
      "enabled": true,
      "ttl": 3600  // 1 hour
    },
    "parallel": {
      "enabled": true,
      "maxConcurrent": 3
    }
  }
}
```

### Monitoring

```bash
# MCP performance stats
sylphx-flow mcp stats

# Output:
# web-search-prime: 45 calls, avg 230ms
# zai-vision: 12 calls, avg 890ms
# code-indexing: 128 calls, avg 45ms
```

---

## Troubleshooting

### MCP Server Not Found

```bash
# Reinstall server
sylphx-flow mcp install web-search-prime --force

# Check installation
sylphx-flow --list-mcp-servers
```

### MCP Call Failures

```bash
# Enable debug logging
export SYLPHX_MCP_DEBUG=true

# View detailed errors
sylphx-flow mcp logs --level debug

# Test server connection
sylphx-flow mcp test web-search-prime
```

### Slow MCP Performance

```bash
# Enable caching
sylphx-flow mcp cache enable

# Reduce timeout
sylphx-flow mcp configure web-search --timeout 5000

# Check network
sylphx-flow mcp diagnose network
```

---

## Best Practices

### ✅ Do

- **Enable caching** - Faster repeated operations
- **Set timeouts** - Prevent hanging
- **Monitor usage** - Track MCP call patterns
- **Secure API keys** - Use environment variables

### ❌ Don't

- **Don't commit API keys** - Security risk
- **Don't enable all servers** - Performance impact
- **Don't ignore errors** - Check MCP logs
- **Don't use untrusted servers** - Security risk

---

## Learn More

- [Agents](/features/agents) - How agents use MCP
- [Semantic Search](/features/semantic-search) - Code indexing MCP
- [Security](/guide/security) - MCP security best practices
