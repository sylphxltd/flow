# Progress Tracking: {{PROJECT_NAME}}

## 🚨 Recovery Instructions (READ FIRST!)
**If resuming this project:**
1. **STOP** - Read this entire section first
2. **Current State**: You are in **{{CURRENT_PHASE}}**
3. **Last Action**: {{LAST_ACTION_TITLE}} ({{LAST_ACTION_TIME}})
4. **Immediate Next**: {{NEXT_ACTION}}
5. **Do these steps**:
   - [ ] Review tasks.md completion status
   - [ ] Check blockers section below
   - [ ] Execute "Next Action" without asking
   - [ ] Update this file after any action
   - [ ] Continue automatically

## Current State Snapshot
- **Phase**: {{CURRENT_PHASE}}
- **Status**: {{STATUS}}
- **Last Updated**: {{LAST_UPDATED}}
- **Progress**: {{OVERALL_PROGRESS}}% complete

## Phase Status
| Phase | Status | Notes |
|-------|--------|-------|
| 1: SPECIFY & CLARIFY | {{PHASE_1_STATUS}} | |
| 2: RESEARCH & ANALYZE | {{PHASE_2_STATUS}} | |
| 3: PLAN & DESIGN | {{PHASE_3_STATUS}} | |
| 4: TASK BREAKDOWN | {{PHASE_4_STATUS}} | |
| 5: CROSS-CHECK & VALIDATE | {{PHASE_5_STATUS}} | |
| 6: IMPLEMENT | {{PHASE_6_STATUS}} | |
| 7: TEST & REVIEW | {{PHASE_7_STATUS}} | |
| 8: CLEANUP & REFACTOR | {{PHASE_8_STATUS}} | |
| 9: DOCUMENT & FINALIZE | {{PHASE_9_STATUS}} | |
| 10: FINAL QUALITY GATE | {{PHASE_10_STATUS}} | |
| 11: MERGE | {{PHASE_11_STATUS}} | |

## Recent Actions
### {{LAST_ACTION_TIME}} - {{LAST_ACTION_TITLE}}
- **Action**: {{LAST_ACTION_WHAT}}
- **Result**: {{LAST_ACTION_RESULT}}
- **Files**: {{LAST_ACTION_FILES}}
- **Next**: {{LAST_ACTION_NEXT}}

## Current Blockers
{{#if BLOCKER_1_TITLE}}
- **{{BLOCKER_1_PRIORITY}}**: {{BLOCKER_1_TITLE}} - {{BLOCKER_1_DESCRIPTION}} (Owner: {{BLOCKER_1_OWNER}})
{{/if}}
{{#if BLOCKER_2_TITLE}}
- **{{BLOCKER_2_PRIORITY}}**: {{BLOCKER_2_TITLE}} - {{BLOCKER_2_DESCRIPTION}} (Owner: {{BLOCKER_2_OWNER}})
{{/if}}

## Task Progress
- **Wave 1 (Foundation)**: {{WAVE_1_PROGRESS}}% complete
- **Wave 2 (Core Features)**: {{WAVE_2_PROGRESS}}% complete  
- **Wave 3 (Integration)**: {{WAVE_3_PROGRESS}}% complete
- **Overall**: {{OVERALL_PROGRESS}}% complete

## Next Actions
1. **Immediate**: {{NEXT_STEP_1}}
2. **Short-term**: {{NEXT_STEP_2}}
3. **Follow-up**: {{NEXT_STEP_3}}

---
**Last Updated**: {{LAST_UPDATED}}