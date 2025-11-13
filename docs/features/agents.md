# AI Agents - Specialized Experts

Sylphx Flow includes production-ready AI agents, each an expert in their domain. Instead of a single generic AI that tries to do everything, Flow provides specialized agents optimized for specific workflows.

## Available Agents

### 🔨 Coder

**Primary Purpose:** Feature implementation and bug fixes

**Best For:**
- Building new features from scratch
- Implementing user stories
- Fixing bugs and issues
- Refactoring existing code
- Writing production code

**Expertise:**
- Full-stack development
- Multiple languages and frameworks
- Design patterns and best practices
- Performance optimization
- Clean code principles

**Example Usage:**
```bash
# Default agent - no flag needed
sylphx-flow "implement user authentication"

# Explicit coder
sylphx-flow "add password reset feature" --agent coder

# Bug fixes
sylphx-flow "fix memory leak in data processing" --agent coder
```

---

### 🔍 Reviewer

**Primary Purpose:** Code review and security analysis

**Best For:**
- Pre-merge code reviews
- Security audits
- Performance analysis
- Code quality checks
- Architecture reviews

**Expertise:**
- Security vulnerabilities (OWASP Top 10)
- Code smells and anti-patterns
- Performance bottlenecks
- Best practice violations
- Accessibility issues

**Example Usage:**
```bash
# Review current changes
sylphx-flow "review my latest changes" --agent reviewer

# Security audit
sylphx-flow "check for security vulnerabilities" --agent reviewer

# Performance review
sylphx-flow "analyze performance bottlenecks" --agent reviewer
```

**What Reviewer Checks:**
- ✅ Security vulnerabilities
- ✅ Code quality issues
- ✅ Performance problems
- ✅ Best practice violations
- ✅ Test coverage gaps
- ✅ Documentation completeness

---

### ✍️ Writer

**Primary Purpose:** Documentation and technical writing

**Best For:**
- API documentation
- README files
- Code comments
- Technical guides
- Architecture documentation

**Expertise:**
- Clear, concise technical writing
- API reference documentation
- Tutorial creation
- README optimization
- Inline code documentation

**Example Usage:**
```bash
# Generate API docs
sylphx-flow "document all API endpoints" --agent writer

# Update README
sylphx-flow "improve README with usage examples" --agent writer

# Add code comments
sylphx-flow "add JSDoc comments to utils" --agent writer
```

**Documentation Standards:**
- Clear and concise language
- Code examples for all features
- Proper formatting (Markdown, JSDoc, etc.)
- Beginner-friendly explanations
- Complete API references

---

### 🎯 Orchestrator

**Primary Purpose:** Complex multi-step tasks and coordination

**Best For:**
- Large-scale refactoring
- Architecture changes
- Multi-component features
- System design
- Complex migrations

**Expertise:**
- Breaking down complex tasks
- Coordinating multiple changes
- System architecture
- Dependency management
- Risk assessment

**Example Usage:**
```bash
# Architecture changes
sylphx-flow "migrate from REST to GraphQL" --agent orchestrator

# Large refactoring
sylphx-flow "refactor authentication system" --agent orchestrator

# Complex features
sylphx-flow "implement real-time notifications across app" --agent orchestrator
```

**Orchestrator's Approach:**
1. **Analyze** - Understand the full scope
2. **Plan** - Break down into steps
3. **Execute** - Implement systematically
4. **Verify** - Test each component
5. **Integrate** - Ensure everything works together

---

## Choosing the Right Agent

| Task Type | Recommended Agent | Why |
|-----------|------------------|-----|
| New feature | Coder | Optimized for implementation |
| Bug fix | Coder | Fast, focused fixes |
| Code review | Reviewer | Security and quality expertise |
| Pre-merge check | Reviewer | Catches issues before merge |
| Documentation | Writer | Clear technical writing |
| README update | Writer | User-focused content |
| Architecture change | Orchestrator | Handles complexity |
| System refactor | Orchestrator | Coordinates multiple changes |

## Agent Configuration

### Default Agent

The default agent is **Coder** - optimized for most common tasks:

```bash
# These are equivalent
sylphx-flow "implement login"
sylphx-flow "implement login" --agent coder
```

### Setting Default Agent

Flow remembers your agent preference:

```bash
# Use reviewer once
sylphx-flow "check security" --agent reviewer

# Next time, Flow remembers (if you want)
# Or specify agent each time for clarity
```

### Configuration File

Your agent preferences are stored in `.sylphx-flow/settings.json`:

```json
{
  "defaultAgent": "coder",
  "lastUsedAgent": "reviewer"
}
```

## How Agents Work

### 1. Specialized Prompting

Each agent has a unique system prompt optimized for its role:

- **Coder**: "You are an expert software engineer..."
- **Reviewer**: "You are a senior code reviewer..."
- **Writer**: "You are a technical documentation expert..."
- **Orchestrator**: "You are a software architect..."

### 2. Domain-Specific Rules

Each agent follows different rules:

```typescript
// Coder rules
- Focus on clean, working code
- Write comprehensive tests
- Optimize for performance

// Reviewer rules
- Be thorough and critical
- Check security first
- Suggest improvements

// Writer rules
- Be clear and concise
- Provide examples
- Assume beginner level

// Orchestrator rules
- Think systemically
- Plan before acting
- Consider all dependencies
```

### 3. Tool Access

All agents have access to the same tools (MCP servers, codebase search, etc.), but use them differently:

- **Coder**: Uses codebase search to find implementation patterns
- **Reviewer**: Uses codebase search to find similar code to review
- **Writer**: Uses codebase search to understand what to document
- **Orchestrator**: Uses codebase search to understand system architecture

## Advanced Usage

### Chaining Agents

Use different agents in sequence for complex workflows:

```bash
# 1. Implement feature
sylphx-flow "implement OAuth login" --agent coder

# 2. Review implementation
sylphx-flow "review OAuth implementation" --agent reviewer

# 3. Document it
sylphx-flow "document OAuth flow" --agent writer
```

### Loop Mode with Agents

Combine agents with loop mode:

```bash
# Continuous code review
sylphx-flow "review all PRs" --agent reviewer --loop --target claude-code

# Continuous documentation updates
sylphx-flow "keep docs in sync with code" --agent writer --loop --target claude-code
```

## Best Practices

### ✅ Do

- Use **Coder** for 80% of tasks (it's the default for a reason)
- Use **Reviewer** before merging important changes
- Use **Writer** for all documentation tasks
- Use **Orchestrator** for complex, multi-step work

### ❌ Don't

- Don't use Orchestrator for simple tasks (overkill)
- Don't use Coder for reviews (Reviewer is specialized)
- Don't use Writer for code (Coder is better)
- Don't mix agents in the same command (use sequential commands instead)

## Customizing Agents

### Adding Custom Agents

You can define custom agents in `.sylphx-flow/agents/`:

```typescript
// .sylphx-flow/agents/custom-agent.ts
export default {
  name: "Database Expert",
  description: "Specialized in database optimization",
  systemPrompt: "You are a database expert...",
  rules: ["Always use indexes", "Optimize queries"]
}
```

Then use it:
```bash
sylphx-flow "optimize database queries" --agent database-expert
```

### Syncing Agent Updates

Keep your agents up-to-date with Flow's latest improvements:

```bash
# Sync all agents
sylphx-flow --sync

# Sync specific platform
sylphx-flow --sync --target claude-code
```

## Troubleshooting

### Agent Not Found

```bash
Error: Agent 'xyz' not found
```

**Solution:**
1. Check spelling: `--agent coder` (not `--agent code`)
2. List available agents: `sylphx-flow --list-agents`
3. Use default agent (omit `--agent` flag)

### Wrong Agent Behavior

If an agent isn't performing as expected:

1. **Verify agent**: `sylphx-flow --list-agents`
2. **Check task match**: Make sure task fits agent's specialty
3. **Try different agent**: Sometimes Orchestrator works better than Coder
4. **Check rules**: Ensure agent rules haven't been modified

## Learn More

- [Rules System](/guide/rules) - How agents follow best practices
- [Loop Mode](/features/loop-mode) - Continuous agent execution
- [MCP Integration](/guide/mcp) - Extended agent capabilities
