# Agent Framework - Orchestrated AI Development

The **Agent Framework** provides specialized AI agents that work together to handle complex development tasks through orchestration and delegation.

## 🤖 What is the Agent Framework?

A system of specialized AI agents, each with specific expertise:
- **Orchestrator** - Coordinates complex tasks and delegates to specialists
- **Coder** - Implements code with test-first approach
- **Reviewer** - Reviews code for quality, security, and best practices
- **Writer** - Creates documentation and technical writing

## ✨ Key Features

- **🎯 Specialization** - Each agent is expert in their domain
- **🔄 Coordination** - Orchestrator breaks down and delegates tasks
- **✅ Quality Assurance** - Built-in review and validation
- **📝 Documentation** - Automatic documentation generation
- **🧠 Context-Aware** - Agents use knowledge base and codebase search
- **⚡ Efficient** - Right agent for the right task

## 🛠️ Using Agents via CLI

### Basic Usage
```bash
# Use default agent (coder)
npx github:sylphxltd/flow run "implement user authentication"

# Specify agent explicitly
npx github:sylphxltd/flow run "review this code" --agent reviewer
npx github:sylphxltd/flow run "write API documentation" --agent writer
npx github:sylphxltd/flow run "implement OAuth with tests" --agent orchestrator
```

### Agent Selection
```bash
# Orchestrator - Complex multi-step tasks
flow run "build complete authentication system" --agent orchestrator

# Coder - Implementation tasks
flow run "add password reset functionality" --agent coder

# Reviewer - Code review tasks
flow run "review for security vulnerabilities" --agent reviewer

# Writer - Documentation tasks
flow run "document the API endpoints" --agent writer
```

## 🤖 Agent Profiles

### Orchestrator
**Role**: Task coordination and agent delegation

**Specialization**:
- Breaking down complex tasks into subtasks
- Identifying dependencies and sequencing
- Delegating to specialist agents
- Synthesizing results into coherent response

**Core Rules**:
1. **Never Do Work**: Delegate all concrete work to specialists
2. **Decompose Complex Tasks**: Break into clear subtasks
3. **Synthesize Results**: Combine agent outputs coherently

**When to Use**:
- Complex features requiring multiple specialists
- Tasks involving code + tests + documentation
- Workflows with multiple steps and dependencies
- Coordinating between different concerns

**Example Workflow**:
```
User: "Implement OAuth authentication"
  ↓
Orchestrator:
  1. Delegate to Coder: "Implement OAuth flow"
  2. Delegate to Reviewer: "Review security"
  3. Delegate to Writer: "Document OAuth setup"
  ↓
Orchestrator synthesizes all results
  ↓
Complete OAuth implementation with tests and docs
```

**Usage**:
```bash
flow run "implement complete user management system" --agent orchestrator
flow run "refactor authentication with tests and docs" --agent orchestrator
flow run "build payment integration end-to-end" --agent orchestrator
```

### Coder
**Role**: Code implementation and execution

**Specialization**:
- Writing production-quality code
- Test-driven development
- Immediate refactoring
- Security-conscious implementation

**Core Rules**:
1. **Verify Always**: Run tests after every change
2. **Search Before Build**: Research before implementing
3. **Complete Now**: No TODOs, finish fully

**Execution Modes**:
- **Investigation**: Understand problem and constraints
- **Design**: Plan architecture and integration
- **Implementation**: Write tests, implement, refactor
- **Validation**: Verify security and performance

**When to Use**:
- Implementing new features
- Writing or modifying code
- Bug fixes
- Refactoring

**Usage**:
```bash
flow run "add email verification to registration" --agent coder
flow run "implement caching for API responses" --agent coder
flow run "fix the authentication bug" --agent coder
```

### Reviewer
**Role**: Code review and quality assurance

**Specialization**:
- Security analysis
- Performance review
- Best practices validation
- Architecture assessment

**Review Focus**:
- **Security**: Vulnerabilities, input validation, auth issues
- **Performance**: Bottlenecks, optimization opportunities
- **Quality**: Code structure, maintainability, testing
- **Standards**: Following team conventions and best practices

**When to Use**:
- Reviewing pull requests
- Security audits
- Performance analysis
- Code quality checks

**Usage**:
```bash
flow run "review this PR for security issues" --agent reviewer
flow run "analyze performance bottlenecks" --agent reviewer
flow run "check code quality and best practices" --agent reviewer
```

### Writer
**Role**: Documentation and technical writing

**Specialization**:
- API documentation
- README files
- Technical guides
- Code comments

**Writing Focus**:
- **Clarity**: Easy to understand
- **Completeness**: All necessary information
- **Examples**: Practical code examples
- **Structure**: Well-organized content

**When to Use**:
- Creating documentation
- Writing guides
- Documenting APIs
- Updating README files

**Usage**:
```bash
flow run "document the REST API endpoints" --agent writer
flow run "write a guide for new contributors" --agent writer
flow run "create README for this package" --agent writer
```

## 🔄 Agent Workflows

### Simple Task (Single Agent)
```
User Request
     ↓
Single Agent (e.g., Coder)
     ↓
Result
```

**Example**:
```bash
flow run "add input validation" --agent coder
```

### Complex Task (Orchestrator + Specialists)
```
User Request
     ↓
Orchestrator
     ↓
├── Coder: Implement
├── Reviewer: Review
└── Writer: Document
     ↓
Orchestrator synthesizes
     ↓
Complete Result
```

**Example**:
```bash
flow run "implement user authentication system" --agent orchestrator
```

### Iterative Task (Multiple Rounds)
```
User Request
     ↓
Coder: Initial implementation
     ↓
Reviewer: Finds issues
     ↓
Coder: Fixes issues
     ↓
Writer: Documents
     ↓
Final Result
```

**Example**:
```bash
flow run "build payment gateway with security review" --agent orchestrator
```

## 🎯 Use Cases

### 1. Feature Development
**Scenario**: Implement complete user registration

```bash
flow run "implement user registration with validation" --agent orchestrator
```

**Agent Workflow**:
1. Orchestrator analyzes requirements
2. Coder implements registration logic
3. Reviewer checks security
4. Coder fixes any issues
5. Writer documents the API
6. Orchestrator delivers complete feature

### 2. Code Review
**Scenario**: Review pull request for security

```bash
flow run "review PR #123 for security vulnerabilities" --agent reviewer
```

**Reviewer Actions**:
- Analyzes code for common vulnerabilities
- Checks input validation
- Reviews authentication/authorization
- Examines error handling
- Provides detailed report

### 3. Documentation
**Scenario**: Document API endpoints

```bash
flow run "document all user management endpoints" --agent writer
```

**Writer Actions**:
- Analyzes API endpoints
- Generates OpenAPI/Swagger docs
- Creates usage examples
- Writes integration guide

### 4. Refactoring
**Scenario**: Refactor authentication system

```bash
flow run "refactor auth system for better security" --agent orchestrator
```

**Agent Workflow**:
1. Coder searches existing implementation
2. Coder refactors with improvements
3. Reviewer validates security
4. Writer updates documentation
5. Orchestrator ensures everything works

## 🧠 How Agents Use Tools

### Knowledge Base Integration
All agents automatically use knowledge base:

```javascript
// Agent internally calls before implementation
knowledge_search("authentication best practices")
knowledge_get("/universal/security")
```

**Benefits**:
- Follow established patterns
- Apply best practices
- Maintain consistency
- Learn from curated guidelines

### Codebase Search Integration
Agents search existing code before implementing:

```javascript
// Agent internally searches codebase
codebase_search("existing authentication implementation")
codebase_search("similar validation logic")
```

**Benefits**:
- Follow existing patterns
- Maintain consistency
- Avoid duplicating code
- Learn from existing implementation

### Combined Intelligence
```
User Request
     ↓
Agent searches:
  1. knowledge_search("best practices")
  2. codebase_search("existing patterns")
     ↓
Agent implements with:
  - Best practices from knowledge base
  - Patterns from existing codebase
  - Specialist expertise
     ↓
High-quality result
```

## ⚙️ Configuration

### Agent Files Location
```
assets/agents/
├── orchestrator.md   # Orchestrator rules
├── coder.md          # Coder rules
├── reviewer.md       # Reviewer rules
└── writer.md         # Writer rules
```

### Agent Settings
Each agent has:
- **Name**: Identifier for selection
- **Description**: What the agent does
- **Mode**: When agent can be used (primary/both)
- **Temperature**: Creativity level (0.3 for deterministic)
- **Instructions**: Detailed rules and guidelines

### Installation
```bash
# Initialize project with agents
flow init

# Agents are copied to:
# - .claude/agents/ (for Claude Code)
# - .kilocode/agents/ (for Kilocode)
```

## 🎯 Agent Selection Guide

### Use Orchestrator When:
- ✅ Task requires multiple specialists
- ✅ Complex workflow with dependencies
- ✅ Need code + tests + documentation
- ✅ Coordinating different concerns

### Use Coder When:
- ✅ Implementing features
- ✅ Writing or modifying code
- ✅ Bug fixes
- ✅ Refactoring code

### Use Reviewer When:
- ✅ Reviewing pull requests
- ✅ Security audits
- ✅ Performance analysis
- ✅ Quality checks

### Use Writer When:
- ✅ Creating documentation
- ✅ Writing guides
- ✅ API documentation
- ✅ README files

## 🚀 Advanced Usage

### Chaining Agents Manually
```bash
# Step 1: Implement
flow run "implement authentication" --agent coder

# Step 2: Review
flow run "review authentication implementation" --agent reviewer

# Step 3: Document
flow run "document authentication API" --agent writer
```

### Using with MCP Tools
Agents automatically use MCP tools when available:
- `knowledge_search` - Search guidelines
- `knowledge_get` - Get specific docs
- `codebase_search` - Search code
- `time_*` - Time utilities

### Custom Prompts
```bash
# Detailed instructions
flow run "implement OAuth 2.0 with PKCE flow, include tests and error handling" --agent coder

# Context-specific
flow run "review for OWASP Top 10 vulnerabilities" --agent reviewer

# Format-specific
flow run "create OpenAPI 3.0 specification" --agent writer
```

## 📊 Agent Performance

### Coder
- **Implementation Speed**: Fast for simple tasks, methodical for complex
- **Quality**: High (test-first, immediate refactoring)
- **Best For**: Feature implementation, bug fixes

### Reviewer
- **Review Speed**: Thorough and systematic
- **Quality**: Comprehensive analysis
- **Best For**: Security, performance, quality checks

### Writer
- **Writing Speed**: Fast and clear
- **Quality**: Professional documentation
- **Best For**: Documentation, guides, API specs

### Orchestrator
- **Coordination**: Excellent task breakdown
- **Quality**: Synthesized from specialists
- **Best For**: Complex multi-agent tasks

## 🐛 Troubleshooting

### Agent Not Available
```bash
# Check agents are installed
ls .claude/agents/

# Reinstall agents
flow init --skip-hooks --skip-mcp
```

### Wrong Agent Selected
```bash
# Explicitly specify agent
flow run "your task" --agent orchestrator

# Check agent description
cat .claude/agents/orchestrator.md
```

### Agent Not Using Tools
```bash
# Verify MCP server is running
flow mcp start

# Check tools are enabled
flow knowledge status
flow codebase status
```

## 🎯 Pro Tips

### For Best Results
- Be specific in your requests
- Provide context and constraints
- Use orchestrator for complex tasks
- Let agents search before implementing
- Trust agent expertise

### Prompt Examples
```bash
# ✅ Good: Specific and clear
flow run "add JWT authentication with refresh tokens" --agent coder

# ❌ Poor: Too vague
flow run "fix auth" --agent coder

# ✅ Good: Clear requirements
flow run "review for SQL injection and XSS vulnerabilities" --agent reviewer

# ❌ Poor: Unclear goal
flow run "check code" --agent reviewer
```

### Orchestrator Tips
- Use for features requiring multiple steps
- Let orchestrator decide which specialists to use
- Provide complete requirements upfront
- Review synthesized results

## 📚 Next Steps

- **[Knowledge Base](Knowledge-Base)** - Guidelines agents use
- **[Codebase Search](Codebase-Search)** - How agents search code
- **[CLI Commands](CLI-Commands)** - Complete command reference
- **[MCP Integration](MCP-Integration)** - Connect AI tools

---

*Last Updated: 2025-10-30 | [Edit this page](https://github.com/sylphxltd/flow/wiki/Agent-Framework) | [Report Issues](https://github.com/sylphxltd/flow/issues)*
