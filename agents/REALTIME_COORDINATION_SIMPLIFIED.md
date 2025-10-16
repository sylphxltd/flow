# Real-Time Agent Coordination Protocol

## Agent Hierarchy
- **Primary Agent**: Orchestrator (manages SPARC phases, delegates parallel work)
- **Subagents**: Core agents (researcher, planner, coder, tester, reviewer)

## Communication Rules

### Primary Agent (Orchestrator)
- Manages sequential SPARC phases (1→2→3→4→5)
- Within each phase: calls MULTIPLE subagents SIMULTANEOUSLY
- WAITS for ALL subagents in current phase to complete
- Does NOT coordinate subagents - they coordinate themselves via memory
- Moves to next phase only after current phase fully complete

### Subagents (Core Agents)
- Work in PARALLEL with other subagents within the same phase
- Use MEMORY extensively to coordinate with phase teammates
- Report individual completion to orchestrator
- Continue coordinating with phase teammates via memory throughout execution

## Phase-Based Concurrency

### Phase Execution Pattern:
```
ORCHESTRATOR: "Starting Phase X"
ORCHESTRATOR → Multiple Subagents: [Parallel tasks]
[ALL SUBAGENTS WORK TOGETHER VIA MEMORY]
[WAIT FOR ALL COMPLETION REPORTS]
ORCHESTRATOR: "Phase X complete - starting Phase X+1"
```

## Subagent Memory Coordination

### When to Use Memory (Subagents Only)
1. **Before Starting Task**: Check what other subagents are doing
2. **During Task**: Every 30 seconds, check for relevant updates
3. **When Blocked**: Immediately broadcast need for help
4. **After Completion**: Broadcast results to other subagents

### Memory Communication Protocol

#### Reading Memory (Always First)
```
Before any work:
1. Check shared namespace for project status
2. Check relevant subagent namespaces for their work
3. Search for conflicts with your planned work
```

#### Writing Memory (Broadcast Updates)
```
Key events to broadcast:
- "Starting: [task description]"
- "Progress: [task] at [X]%"
- "Blocked: [problem] - need [help type]"
- "Completed: [task] with [results]"
```

#### Memory Namespaces
- `shared`: Project-wide status and announcements
- `researcher`: Research findings and analysis
- `planner`: Task breakdowns and plans
- `coder`: Implementation status and technical decisions
- `tester`: Test results and coverage reports
- `reviewer`: Review findings and quality issues

## Conflict Prevention

### Before Starting Work
Always check:
1. Is anyone else working on the same files?
2. Are there dependencies I need to wait for?
3. Are there any recent decisions that affect my work?

### If Conflict Detected
1. Stop work immediately
2. Broadcast conflict to shared namespace
3. Wait for resolution or coordination
4. Do NOT proceed until conflict resolved

## Task Completion Flow

### Subagent Completion Report
When finishing a task:
1. Write detailed results to your namespace
2. Write summary to shared namespace
3. Report completion to primary agent
4. Continue monitoring for questions from other subagents

### Primary Agent Handoff
Primary agent receives completion report and:
1. Reviews results
2. Plans next task
3. Calls appropriate subagent
4. Waits for completion

## Example Workflow

### Phase 3 (Architecture) - Parallel Execution
```
ORCHESTRATOR: "Starting Phase 3 - Architecture"
ORCHESTRATOR → Coder: "Build frontend components"
ORCHESTRATOR → Coder: "Build backend APIs"  
ORCHESTRATOR → Coder: "Setup infrastructure"
ORCHESTRATOR → Reviewer: "Review architecture"
ORCHESTRATOR → Tester: "Prepare integration tests"
ORCHESTRATOR: [WAITS FOR ALL]
```

### Subagents Coordinate During Phase
```
Coder-Frontend → Memory: "Starting React components, using TypeScript"
Coder-Backend → Memory: "Starting Node.js APIs, need frontend API contracts"
Reviewer → Memory: "Reviewing architecture - suggest using microservices pattern"
Tester → Memory: "Preparing tests - need API documentation from backend"
Coder-Frontend → Memory: "API contracts ready in memory"
Coder-Backend → Memory: "Thanks, implementing APIs now"
```

### Phase Completion
```
Coder-Frontend → Primary: "Frontend complete"
Coder-Backend → Primary: "Backend complete"
Coder-Infrastructure → Primary: "Infrastructure ready"
Reviewer → Primary: "Architecture approved"
Tester → Primary: "Tests prepared"
ORCHESTRATOR: "Phase 3 complete - all deliverables met"
ORCHESTRATOR: "Starting Phase 4 - Refinement"
```

## Key Principles

1. **Primary Agent Direction**: Only primary agent initiates work
2. **Subagent Autonomy**: Subagents coordinate among themselves during work
3. **Memory Bridge**: Memory is ONLY for subagent-to-subagent communication
4. **Clear Reporting**: Subagents always report completion back to primary
5. **No Parallel Primary Work**: Primary agent waits during subagent execution

This ensures clear hierarchy while enabling efficient subagent coordination.