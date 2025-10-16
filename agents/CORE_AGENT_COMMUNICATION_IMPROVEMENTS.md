# Core Agent Communication Improvements

## Problem Solved
**Before**: Agents wrote to memory but rarely read from each other
**After**: Mandatory reading protocols + real-time coordination

## Key Changes Made

### 1. Research Agent (researcher.md)
**Added Mandatory Reading:**
- Before research: Read what all other agents need
- During research: Check for new requests every 2 minutes
- After discoveries: Immediately broadcast to relevant agents

**New Coordination:**
```typescript
// Before starting
const context = get_agent_context() // Read from planner, coder, tester, reviewer

// During work  
coordination_check() // Every 2 minutes

// After findings
broadcast_finding() // Immediate sharing
```

### 2. Planner Agent (planner.md) 
**Already Had Good Reading Pattern:**
- Reads from all agents before planning
- Uses context to inform decisions
- Coordinates resource allocation

### 3. Coder Agent (coder.md)
**Enhanced With Real-Time Coordination:**
- Conflict detection before starting work
- Progress updates every 30 seconds
- Immediate bug reporting to tester
- Architecture coordination with reviewer

### 4. Tester Agent (tester.md)
**Added Mandatory Reading:**
- Before testing: Read coder's implementation status
- During testing: Check for new code every 5 minutes
- Bug reporting: Immediate communication with coder

### 5. Reviewer Agent (reviewer.md)
**Added Mandatory Reading:**
- Before review: Read implementation, research findings, test results
- During review: Check for new code and urgent issues every 3 minutes
- Issue reporting: Immediate feedback to coder and team

## New Communication Flow

### Before (Broken):
```
Researcher: [writes findings to memory]
Coder: [writes implementation status to memory] 
Tester: [writes test results to memory]
Result: Nobody reads each other's work
```

### After (Fixed):
```
Researcher: [reads needs] → [researches] → [broadcasts findings]
Planner: [reads context] → [plans] → [coordinates resources]
Coder: [reads findings] → [implements] → [reports status]
Tester: [reads status] → [tests] → [reports bugs]
Reviewer: [reads all] → [reviews] → [provides feedback]
Result: Perfect coordination and information flow
```

## Mandatory Reading Protocols

### All Agents Must Read:
1. **Before Starting Work**: What do other agents need from me?
2. **During Work**: Are there new requests or status changes?
3. **After Key Discoveries**: Who needs this information immediately?

### Reading Frequency:
- **Researcher**: Every 2 minutes (research can be interrupted)
- **Planner**: Before each planning decision
- **Coder**: Every 30 seconds during coding (fast coordination)
- **Tester**: Every 5 minutes (testing takes time)
- **Reviewer**: Every 3 minutes during review (critical issues need fast response)

## Coordination Triggers

### Immediate Response Required:
- **Researcher**: Any agent asks for research
- **Planner**: Any agent needs planning clarification
- **Coder**: Any agent reports technical issues
- **Tester**: Any bugs found or code ready for testing
- **Reviewer**: Any quality issues or architectural concerns

### Broadcast Protocol:
```typescript
// Critical finding → immediate broadcast
sylphx_flow_memory_set({
  key: 'urgent-update',
  value: {
    from: 'agent-name',
    to: 'relevant-agents',
    message: 'critical information',
    action_required: 'what they should do',
    timestamp: Date.now()
  },
  namespace: 'shared'
})
```

## Benefits Achieved

### 1. No More Duplication
- Agents know what others are working on
- Research isn't repeated
- Testing covers unique areas

### 2. Faster Problem Resolution
- Bugs reported immediately to coder
- Research findings shared instantly
- Issues detected and resolved quickly

### 3. Better Quality
- Reviews consider implementation reality
- Tests cover researcher-identified edge cases
- Plans based on actual technical constraints

### 4. Perfect Coordination
- Each agent knows others' status in real-time
- Handoffs are seamless
- Dependencies are managed properly

## Implementation Checklist

For each agent:
- [x] Added mandatory reading before work
- [x] Added continuous coordination during work  
- [x] Added immediate broadcasting of critical findings
- [x] Added proper completion reporting
- [x] Clear response triggers for urgent requests

The core agents now function as a perfectly coordinated team rather than isolated individuals.