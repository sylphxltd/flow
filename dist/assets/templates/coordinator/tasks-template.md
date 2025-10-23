# Tasks: (Project name)

(Brief description of implementation approach and wave organization strategy)

## Wave Execution Strategy
(Organize tasks into sequential waves based on dependencies. Each wave contains tasks that can execute in parallel with no conflicts. Determine the number of waves based on project complexity - could be 2, 3, 4, or more waves.)

## Mandatory Per-Task Cleanup
**Before marking any task complete:**
1. Remove TODOs, console.log, debug code
2. Eliminate code duplication
3. Refactor for maintainability
4. Verify code standards compliance

---

## Wave 1: (Wave name based on tasks - e.g., "Foundation", "Setup", "Infrastructure")
- [ ] **[specialist]** (Task description with specific deliverable - e.g., "Setup database schema and migrations")
- [ ] **[specialist]** (Task description with specific deliverable)
- [ ] **[specialist]** (Task description with specific deliverable)

(Add more tasks as needed - all tasks in Wave 1 can execute in parallel)

---

## Wave 2: (Wave name - e.g., "Core Features", "Business Logic") - After Wave 1
- [ ] **[specialist]** (Task description - include dependencies if specific, e.g., "Implement auth API (depends: database)")
- [ ] **[specialist]** (Task description with specific deliverable)

(Add more tasks as needed - all tasks in Wave 2 can execute in parallel)

---

## Wave 3+: (Add more waves as needed based on dependencies)
- [ ] **[specialist]** (Task description with specific deliverable)

(Continue adding waves until all tasks are organized)

---

## Task Modifications
(Document any tactical refinements made during Phase 6 - splits, reorders, merges, or write "None")

Example:
- **Task "Implement auth" [REFINED]**: Split into "Setup JWT", "Create middleware", "Add login endpoint" (reason: too coarse)
- **Task "Deploy API"**: Moved from Wave 2 to Wave 3 (reason: dependency on integration tests discovered)

---

## Test Strategy
(Define testing approach - will be validated in Phase 7)
- **Frameworks**: (e.g., "Jest for unit tests, Playwright for E2E")
- **Coverage**: 80%+ on critical paths (auth, data operations, business logic)
- **Key scenarios**: (List critical test cases)

---

## Progress Summary
- **Wave 1**: __ / __ tasks complete
- **Wave 2**: __ / __ tasks complete
(Add more waves as needed)
- **Total**: __ / __ tasks complete

## Quick Reference
- **Current Wave**: (Which wave is currently executing)
- **Next Task**: (Next task to start)
- **Blockers**: (Any blockers preventing progress, or write "None") 
