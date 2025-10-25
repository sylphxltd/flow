# Agent Benchmark Tasks

This directory contains benchmark tasks for testing the different agent designs.

## Usage

### Basic Usage
```bash
# Test all agents with a task
sylphx-flow benchmark --task user-management-system.md

# Test specific agents
sylphx-flow benchmark --task user-management-system.md --agents "craftsman,practitioner"

# Add context information
sylphx-flow benchmark --task user-management-system.md --context team-context.md

# Custom output directory
sylphx-flow benchmark --task user-management-system.md --output ./my-benchmark-results

# Save evaluation reports to project directory
sylphx-flow benchmark --task user-management-system.md --report ./benchmark-results

# Control concurrency and rate limiting
sylphx-flow benchmark --task user-management-system.md --concurrency 2 --delay 10

# Sequential execution (rate limiting)
sylphx-flow benchmark --task user-management-system.md --concurrency 1

# Skip automatic evaluation
sylphx-flow benchmark --task user-management-system.md --no-evaluate
```

## Available Agents

1. **craftsman**: Idealistic craftsman with principles-based approach
2. **practitioner**: Pragmatic practitioner with business-focused approach
3. **craftsman-reflective**: Idealistic craftsman with reflective questioning
4. **practitioner-reflective**: Pragmatic practitioner with contextual decision-making

## Task Structure

Each task should include:
- Clear functional requirements
- Technical constraints
- Business context
- Success criteria
- Deliverables

## Rate Limiting and Performance

The tool includes built-in rate limiting to avoid API issues:

### Default Behavior (Safe)
- **Concurrency**: 1 (sequential execution)
- **Delay**: 5 seconds between agents
- **Retries**: 3 attempts per agent (exponential backoff)

### Customizing Performance

```bash
# Fast parallel execution (higher risk of rate limits)
sylphx-flow benchmark --task user-management-system.md --concurrency 4 --delay 2

# Moderate parallel execution
sylphx-flow benchmark --task user-management-system.md --concurrency 2 --delay 5

# Very safe sequential execution
sylphx-flow benchmark --task user-management-system.md --concurrency 1 --delay 10

# Custom delay between agents
sylphx-flow benchmark --task user-management-system.md --delay 15
```

### Error Handling
- **Automatic retries** on API failures
- **Exponential backoff**: 2s, 4s, 8s between retries
- **Partial failure tolerance**: Continues with other agents if one fails
- **Detailed error logging**: All failures are logged for analysis

## Output Structure

```
/tmp/agent-benchmark/                                    # Temporary working directory
├── task-definition.txt
├── context-info.txt (if provided)
├── craftsman/
│   ├── [All code files created by craftsman agent]
│   ├── execution-log.txt
│   └── execution-error.txt (if failed)
├── practitioner/
│   ├── [All code files created by practitioner agent]
│   ├── execution-log.txt
│   └── execution-error.txt (if failed)
├── craftsman-reflective/
│   ├── [All code files created by craftsman-reflective agent]
│   ├── execution-log.txt
│   └── execution-error.txt (if failed)
├── practitioner-reflective/
│   ├── [All code files created by practitioner-reflective agent]
│   ├── execution-log.txt
│   └── execution-error.txt (if failed)
├── evaluation-report.md                                 # LLM evaluation report
└── summary.txt                                          # File summary

./benchmark-results/                                   # Project directory (if --report used)
├── evaluation-report.md                                 # Copy of LLM evaluation report
└── summary.txt                                          # Copy of file summary
```

**Important**:
- Agents create code in their respective `/tmp` directories, not in your main codebase
- Use `--report <directory>` to save evaluation reports to your project
- `/tmp` files are temporary and will be cleaned up by system

## Evaluation

The benchmark includes automatic evaluation using another LLM instance that:

1. Analyzes code quality, architecture, and functionality
2. Scores each agent on multiple dimensions (1-10 scale)
3. Provides detailed comparison and insights
4. Recommends best use cases for each approach

## Creating New Tasks

To create a new benchmark task:

1. Create a `.md` file in this directory
2. Include clear requirements and constraints
3. Add business context if applicable
4. Test the task with all agents

Example task structure:
```markdown
# Task: [Task Name]

## Requirements
- [List of functional requirements]
- [Technical requirements]
- [Business requirements]

## Constraints
- [Technology limitations]
- [Time/budget constraints]
- [Team context]

## Deliverables
- [Expected outputs]
- [Documentation requirements]
- [Testing requirements]
```