# Development Workflows

## Scope
Follow this document for every engineering initiative, regardless of size or urgency. It defines a standardized Spec Driven Development (SDD) process to coordinate planning, analysis, implementation, and delivery. Ensure traceability, quality, and minimal technical debt through sequential phases. Human oversight is optional for review and final approval.

## Directory Convention
Create a dedicated workspace for each initiative at `workspaces/<type>-<time>-<name>/` (where `<type>` is the change type prefix, `<time>` is UTC timestamp `YYYYMMDD-HHMM`, and `<name>` is concise kebab-case label, e.g., `workspaces/bugfix-20251002-1400-login-crash/`).
- **Type Prefixes** (mandatory for uniformity):
  - General/New Feature: `feature`
  - Bugfix: `bugfix`
  - Modify (Enhancement): `modify`
  - Refactor: `refactor`
  - Hotfix: `hotfix`
  - Deprecate: `deprecate`
- If type is ambiguous from description, default to `feature` and note in spec.md for clarification.
Keep all artifacts human-reviewable and version-controlled. Store supporting evidence under `artifacts/` with descriptive filenames (e.g., `artifacts/regression-test-output.json`).
Never reuse a workspace across changes; create a fresh directory if scope or objectives shift materially.

## Workspace Creation
Initiate a workspace at the start of any engineering initiative, triggered by a user description or request (e.g., "Fix login bug" → infer bugfix type).
- **Trigger and Type Inference**: Analyze the request to determine type (e.g., keywords like "fix bug/crash" → bugfix; "enhance/add" → modify/feature; "remove/sunset" → deprecate; "optimize/restructure" → refactor; "emergency/outage" → hotfix). If unclear, default to `feature` and resolve in Phase 2.
- **Creation Steps**:
  1. Create the folder `workspaces/<type>-<time>-<name>/`.
  2. Initialize Git branch: `git checkout -b <type>-<name>` (e.g., `bugfix-login-crash`).
  3. Create initial files based on type (tailored skeletons to speed up phases):
     - All types: `spec.md` (basic template with Context, Problem Statement, Initial AC placeholders); `review-log.md` (empty approvals table with Phase 1 entry).
     - Bugfix: Add `bug-report.md` (sections for reproduction steps, severity assessment: Critical/High/Medium/Low based on impact like crash vs. workaround).
     - Modify: Add `modification-spec.md` (sections for "What's Changing?" – Added/Modified/Removed; baseline link to original feature).
     - Refactor: Add `refactor-spec.md` (sections for Motivation/code smells, Proposed Improvements, Risk Level: High/Medium/Low).
     - Hotfix: Add `hotfix-incident.md` (sections for Timeline, Severity P0-P2, Immediate Impact; note expedited process).
     - Deprecate: Add `deprecation-plan.md` (3-phase outline: Warnings/Disabled/Removed; rationale, Migration Path placeholders).
     - Feature (default): Just core spec.md.
  4. Commit the initial structure: `<type>(init): create workspace for <name>` with evidence note if applicable.
- **Guidelines**: Keep initial files minimal but type-specific to guide phases; if interactive clarification needed (e.g., select from existing features for modify/deprecate), note in Open Questions and resolve in Phase 2.

## Git and Commit Policies
Manage all Git operations to maintain a clean, traceable history.
- **Branching**: Create a feature branch from `main` for each workspace: `git checkout -b <type>-<name>`. Name branches descriptively (e.g., `modify-auth-enhance` or `hotfix-outage-fix`).
- **Commit Frequency**: Commit after each SDD phase completion or task milestone. Use commit messages in the format: `<type>(<scope>): <description>` (e.g., `fix(login): resolve null pointer in auth handler` or `feat(billing): add invoice generation task`).
  - During implementation, commit after TDD cycles: After writing tests (Red phase), after making them pass (Green), and after refactoring.
  - Include evidence links in commit messages (e.g., "See artifacts/regression-test.json for failing output").
- **Pull Requests (PRs)**: Create a PR per workspace at the end of Phase 6 (Implement). Include:
  - Links to all phase documents and artifacts.
  - Sign-off (log in review-log.md; human review optional).
  - Checks: Tests must pass, coverage >=95% for changed code.
- **Merges**: Squash commits into logical units before merging to `main`. Tag releases with semantic versioning (e.g., `v1.2.0`). Use `git rebase` for clean history during development but avoid force-pushing shared branches.
- **Hotfix Exception**: Use a short-lived branch and create an expedited PR (e.g., on-call approval). Merge immediately after the fix but follow up with a PR for post-mortem and backfills.
- **Deprecation Stages**: Commit warnings/disables to feature branches first, test thoroughly, then merge to `main`. Removal commits reference the full deprecation plan.

## Global Controls
Enforce these rules across all workflows:
- No merges to `main` until the workspace documents all completed SDD phases, acceptance criteria (AC), and evidence (e.g., tests, metrics).
- Update upstream documents (e.g., spec.md) if downstream phases reveal changes; log revisions with timestamps and rationale.
- Each phase requires explicit sign-off: Log owner (yourself), reviewer (self or human if specified), and timestamp in the phase file (e.g., at the top of spec.md).
- Integrate Test Driven Development (TDD) throughout: Always write failing tests before code changes (Red → Green → Refactor).
- Use `artifacts/` for all evidence: Test outputs, metrics baselines, diagrams, logs. Commit all files to the repo.

## Spec Driven Development (SDD)
Execute these phases sequentially for all initiatives. Produce a dedicated Markdown file in the workspace for each phase. Analyze prior phases to inform the next. Use type-specific initial files to populate early phases.

### Phase 1 — Specify (`spec.md`)
Generate the initial specification to define the problem and goals clearly, building on any type-specific initial file (e.g., bug-report.md for bugfix).
- Populate sections: `Context` (background and triggers), `Problem Statement` (what's broken or missing), `Objectives` (desired outcomes), `Non-Goals` (explicitly out of scope), `Personas` (affected users/roles), `Success Metrics` (quantifiable KPIs, e.g., "Reduce login time by 50%"), `Constraints` (tech, time, budget limits), `Initial AC` (testable criteria, e.g., "User can login with email/password"), `Glossary` (key terms and definitions), `Open Questions` (initial uncertainties).
- For type-specific: Bugfix/Refactor – emphasize reproduction/behavior preservation; Modify/Deprecate – include baseline reference or rationale.
- Ensure content is concise, actionable, and testable. Quantify metrics where possible (e.g., link to expected telemetry).
- End with a sign-off section: Log your approval and timestamp.
- Guidelines: Keep prose focused on executable details; avoid vague language. If type requires (e.g., hotfix severity P0-P2), assess upfront.
- Output: Commit spec.md (and type-specific file) to the feature branch after generation.

### Phase 2 — Clarify (`clarifications.md`)
Identify and resolve ambiguities in the spec to prevent downstream errors.
- Scan spec.md using this taxonomy: Functional Scope, Data Model, UX Flows, Non-Functional Attributes, Edge Cases, Constraints, Terminology.
- Generate a table for questions: Columns — `id` (unique, e.g., Q1), `question` (targeted, e.g., multiple-choice with 2-5 options or short-answer <=5 words), `owner` (yourself), `asked_at` (ISO timestamp), `response` (resolve based on context or user input if provided), `decision` (yes/no/pending), `follow_up` (next steps), `status` (open/resolved).
- Limit to max 5 high-impact questions, prioritized by impact (e.g., security or data model first). Resolve sequentially using available context. For modify/deprecate, clarify feature selection if not specified (e.g., "Which existing feature? Options: A - auth, B - billing").
- Address all Open Questions from spec.md. For each resolution, mirror updates back to spec.md (e.g., add details to AC or Glossary) and commit the change.
- Add a "Risk Watchlist" subsection for potential issues (e.g., "API dependency may introduce latency").
- If no critical ambiguities, note "Fully clarified" and proceed.
- Guidelines: Ensure questions reduce rework risk; validate resolutions for consistency. For hotfix, limit to 1-2 urgent questions.
- Output: Commit clarifications.md and updated spec.md after all questions resolved.

### Phase 3 — Plan (`plan.md`)
Design the technical blueprint based on the clarified spec.
- Generate sections: Architecture decisions (e.g., stack choices), sequence diagrams (text-based Mermaid syntax), data flows, integration points, risk matrix (likelihood/impact table), rollback plan.
- For each AC from spec.md, specify validation method (e.g., unit test, E2E script) and owner (yourself).
- Outline git branches, commit plan, and effort estimates per high-level task. For deprecate, outline 3-phase timeline (e.g., Warnings: 30 days comms).
- Incorporate clarifications and watchlist risks; flag any new open questions for re-clarification.
- End with sign-off.
- Guidelines: Ensure plan is feasible and aligns with constraints; use diagrams for clarity. For refactor, include behavior preservation checklist.
- Output: Commit plan.md after generation.

### Phase 4 — Tasks (`tasks.md`)
Break the plan into executable, dependency-ordered units.
- Create a table of atomic tasks: Columns — `task_id` (e.g., T1), `description` (specific, executable steps), `depends_on` (task_ids or none), `owner` (yourself), `estimate` (hours/points), `status` (Todo/In Progress/Blocked/Done), `exit_criteria` (e.g., "Test passes and code reviewed"), `git_commit` (reference after completion).
- Derive tasks from plan.md and spec.md ACs (e.g., one task per entity, endpoint, or integration). Tailor to type: Bugfix – test-first fix tasks; Modify – impact update tasks; Deprecate – phased tasks (Phase 1 Warnings, etc.); Refactor – slice-by-slice with metrics checks; Hotfix – minimal fix + post-mortem.
- Order by dependencies: Setup → Tests (TDD) → Core → Integration → Polish. Mark parallelizable tasks with [P] (e.g., independent tests).
- Link tasks to ACs and spec sections. Transition statuses with timestamps and notes (e.g., "Done: 20251002T14:00Z, test coverage 98%").
- Never delete rows; archive completed ones at the end.
- End with sign-off.
- Guidelines: Make tasks specific enough for direct execution; include file paths and TDD cycles. For hotfix, prioritize immediate fix tasks.
- Output: Commit tasks.md incrementally as statuses update.

### Phase 5 — Analyze (`analysis.md` + `artifacts/`)
Perform consistency checks and experiments to validate assumptions.
- Conduct a read-only cross-artifact scan (spec.md, plan.md, tasks.md): Detect duplications, ambiguities, coverage gaps (e.g., ACs without tasks), inconsistencies (e.g., terminology drift), using a severity table (CRITICAL/HIGH/MEDIUM/LOW).
- Log experiments: Design tests for risks/metrics, simulate data sources/outcomes, summarize in analysis.md; store raw "data" (e.g., mock outputs) in artifacts/.
- Tie analyses to tasks/risks (e.g., "Coverage gap in security AC → add T5"). If issues found, update prior phases (e.g., add tasks) and commit diffs.
- Generate a coverage summary table (e.g., | Requirement | Has Task? | Notes |) and metrics (e.g., coverage %).
- Type-specific: Modify – generate impact analysis (affected files/contracts, backward compat); Refactor – capture baseline metrics (performance/errors/size) in `artifacts/metrics-baseline/`; Deprecate – dependency matrix (impacted code/services/users, migration paths); Bugfix/Hotfix – root cause preliminary.
- End with sign-off; flag any CRITICAL issues to halt progression.
- Guidelines: Prioritize high-impact gaps; suggest remediations without auto-editing.
- Output: Commit analysis.md and artifacts after scans/experiments.

### Phase 6 — Implement (`implementation.md`)
Execute tasks to build and verify the feature.
- Follow tasks.md sequence: For each task, log start/end times, branch refs, blockers in a journal.
- Apply TDD: Write failing tests (Red), implement to pass (Green), refactor for quality. For hotfix, add tests post-fix (within 48 hours).
- Attach evidence to prove ACs met (e.g., test outputs, mock screenshots/metrics in artifacts/).
- Update tasks.md statuses with [X] for completed; commit code after each TDD cycle.
- End with retrospective: Lessons learned, follow-ups, unresolved debt. For hotfix, include post-mortem (root cause, timeline, prevention); for deprecate, validate each phase.
- Create PR with all links; log sign-off.
- Guidelines: Ensure parity with plan; halt on failures and log for review. For refactor, re-verify behaviors post-slice.
- Output: Commit implementation.md, code changes, and merge via PR after full validation.

## Test Driven Development (TDD)
Mandate TDD in all phases, especially Implement:
- Cycle: Red (write failing test for issue/spec), Green (minimal code to pass), Refactor (improve without breaking).
- Aim for 100% coverage on changed code, including edges/negatives. Store manual test plans in `artifacts/tests/`.
- If tests uncover out-of-scope issues, open a new workspace. Hotfix exception: Tests post-deployment, but mandatory backfill.

## Change-Type Playbooks
Tailor SDD phases to the change type, using type-specific initial files and abbreviated/focused workflows as needed. All require a workspace and Git policies.

### Bugfix
- Workflow: Tight scope on defect. Phases 1-3 minimal (use bug-report.md for reproduction/severity).
- Key Action: Write regression test first (Red: fails on current code). Commit test, then fix (Green), refactor.
- Artifacts: Store failing output in `artifacts/regressions/`. Log root cause/prevention in implementation.md.
- Git: Commit test separately, then fix. PR includes permanent regression test.

### Modify (Feature Enhancement)
- Workflow: Extend existing spec or new workspace (use modification-spec.md for changes baseline). Full Phases 1-6.
- Key Action: In Phase 2, clarify feature selection if needed; Phase 5, generate impact analysis: Scan affected areas (endpoints, schemas, UIs, contracts) and document in analysis.md (Added/Modified/Removed, backward compat, tests to update).
- Guidelines: Update ACs; validate with mock canary tests. If modifying existing, reference original workspace.
- Git: Commit analysis as milestone. PR proves no regressions.

### Refactor
- Workflow: Full SDD, emphasizing analysis/testing (use refactor-spec.md for motivation/risks).
- Key Action: In Phase 1, assess code smells; Phase 5, capture baseline metrics (performance, errors, size, behaviors) in `artifacts/metrics-baseline/` and behavioral-snapshot.md (inputs/outputs checklist). Refactor in slices (per task), re-run metrics/tests after each. Rollback if >5% degradation.
- Guidelines: Maintain parity; document rationale/ownership shifts. Verify behaviors preserved.
- Git: Commit baselines first, then slices with diffs. Final PR compares to baseline.

### Hotfix
- Workflow: Emergency workspace (use hotfix-incident.md for timeline/severity P0-P2). Abbreviate Phases 1-3 (~1 hour: incident, radius, mitigation). Skip Analyze if urgent; focus Implement.
- Key Action: Fix issue first (minimal code), backfill tests within 48 hours. Deliver post-mortem in implementation.md: Root cause, timeline, prevention, impact assessment.
- Guidelines: Expedited sign-offs; async reviews OK. Notify stakeholders conceptually via notes.
- Git: Short-lived branch; merge post-fix. Follow-up PR for tests/post-mortem.

### Deprecate
- Workflow: Full SDD across 3 stages (use deprecation-plan.md for phased outline). Each stage as sub-workspace or phased commits.
- Stages:
  1. **Warnings**: Announce (logs/docs/flags, comms plan). Update spec.md with timeline (e.g., 30-90 days).
  2. **Disabled**: Toggle off (feature flag, opt-in); retain code for rollback. Test alternatives/migration.
  3. **Removed**: Delete code/data after validation/compliance check.
- Key Action: In Phase 2, clarify affected users/dependencies; Phase 5, generate dependency matrix (code/services/contracts/teams, risks, migration guides) in analysis.md.
- Guidelines: Emphasize user comms/migration at each stage; assess business impact. Multi-month process.
- Git: Commit per stage (e.g., `deprecate(warnings): add sunset headers`). Archive removed code in tag.

## Compliance and Auditing
- Create `review-log.md` per workspace: Table of approvals (phase, owner, reviewer, timestamp).
- Post-merge, archive workspaces to `/archives/<year>/<month>/`; set read-only.
- Perform quarterly audits: Scan 10% of workspaces for SDD adherence, TDD coverage, Git compliance. Generate report with gaps and retrospectives.