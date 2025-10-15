# SDD (Structured Development & Delivery) Agents

This directory contains the agent definitions for the SDD workflow system.

## Structure

```
agents/
├── sdd/                    # All SDD workflow agent definitions
│   ├── development-orchestrator.md
│   ├── sdd-constitution.md
│   ├── sdd-specify.md
│   ├── sdd-clarify.md
│   ├── sdd-plan.md
│   ├── sdd-task.md
│   ├── sdd-analyze.md
│   ├── sdd-implement.md
│   └── sdd-release.md
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
- **sdd-constitution.md**: Handles project-wide policies and constitutional requirements
- **sdd-specify.md**: Creates detailed specifications with measurable acceptance criteria
- **sdd-clarify.md**: Resolves ambiguities through Q&A and applies updates to specifications
- **sdd-plan.md**: Creates comprehensive implementation plans with architecture and testing strategies
- **sdd-task.md**: Breaks down specifications into granular, testable implementation tasks
- **sdd-analyze.md**: Validates implementation completeness and quality against requirements
- **sdd-implement.md**: Executes tasks using strict TDD methodology (Red-Green-Refactor)
- **sdd-release.md**: Manages release preparation and deployment verification

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