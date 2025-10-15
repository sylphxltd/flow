# SDD (Structured Development & Delivery) Agents

This directory contains the agent definitions for the SDD workflow system.

## Structure

```
agents/
├── sdd/                    # All SDD workflow agent definitions
│   ├── development-orchestrator.md
│   ├── constitution.md
│   ├── specify.md
│   ├── clarify.md
│   ├── plan.md
│   ├── task.md
│   ├── analyze.md
│   ├── implement.md
│   └── release.md
├── core/                   # Core specialized agents
│   ├── coder.md            # Code implementation specialist
│   ├── planner.md          # Strategic planning specialist
│   ├── researcher.md       # Research and analysis specialist
│   ├── reviewer.md         # Code review and quality assurance specialist
│   └── tester.md           # Comprehensive testing and quality assurance specialist
├── archived/               # Archived configuration files
│   ├── custom_mode.v2.yaml
│   ├── custom_mode.v3.yaml
│   └── custom_mode.v4.yaml
├── README.md               # This file
└── IMPROVEMENTS.md         # Development improvements log
```

## Agent Descriptions

### Core Orchestrator
- **development-orchestrator.md**: Main orchestrator that manages the 7-phase SDD workflow through expert delegation

### SDD Phase Agents
- **constitution.md**: Handles project-wide policies and constitutional requirements
- **specify.md**: Creates detailed specifications with measurable acceptance criteria
- **clarify.md**: Resolves ambiguities through Q&A and applies updates to specifications
- **plan.md**: Creates comprehensive implementation plans with architecture and testing strategies
- **task.md**: Breaks down specifications into granular, testable implementation tasks
- **analyze.md**: Validates implementation completeness and quality against requirements
- **implement.md**: Executes tasks using strict TDD methodology (Red-Green-Refactor)
- **release.md**: Manages release preparation and deployment verification

### Core Specialized Agents
- **core/coder.md**: Senior software engineer specialized in writing clean, maintainable, and efficient code following best practices and design patterns
- **core/planner.md**: Strategic planning specialist responsible for breaking down complex tasks into manageable components and creating actionable execution plans
- **core/researcher.md**: Deep research and information gathering specialist focused on code analysis, pattern recognition, and knowledge synthesis
- **core/reviewer.md**: Code review and quality assurance specialist responsible for ensuring code quality, security, and maintainability
- **core/tester.md**: Comprehensive testing and quality assurance specialist focused on ensuring code quality through testing strategies and validation techniques

## Usage

These agents are installed and managed through the `rules` CLI tool:

```bash
# Install all agents
rules install

# Install with merge mode (single file)
rules install --merge

# Dry run to see what would be installed
rules install --dry-run
```

## Workflow Overview

The SDD workflow follows a strict 7-phase sequence:

1. **Constitution** - Establish project-wide policies and standards
2. **Specify** - Create detailed specifications with acceptance criteria
3. **Clarify** - Resolve ambiguities and refine requirements
4. **Plan** - Design architecture and create implementation strategy
5. **Task** - Break down into granular, testable tasks
6. **Implement** - Execute using TDD methodology
7. **Release** - Prepare and validate deployment

Each phase is handled by a specialized agent, with the development orchestrator managing the overall workflow and delegation between phases.

## Archived Files

The `archived/` directory contains previous configuration files that have been replaced by the current agent-based structure. These are kept for historical reference but are no longer used in the active workflow.