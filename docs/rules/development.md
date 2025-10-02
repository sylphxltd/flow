# Development Workflows

## Scope
Follow this document for every engineering initiative, regardless of size or urgency. It defines a standardized Spec Driven Development (SDD) process to coordinate planning, analysis, implementation, and delivery. Ensure traceability, quality, and minimal technical debt through sequential phases. Human oversight is optional for review and final approval.

## Directory Convention
Create a dedicated workspace for each initiative at `specs/<time>-<feature-name>/` (UTC timestamp `YYYYMMDD-HHMM` + concise kebab-case feature label, e.g., `specs/20251002-1400-user-auth-fix/`).
Keep all artifacts human-reviewable and version-controlled. Store supporting evidence under `artifacts/` with descriptive filenames (e.g., `artifacts/regression-test-output.json`).
Never reuse a workspace across changes; create a fresh directory if scope or objectives shift materially.
For change types like bugfix or hotfix, prefix the directory accordingly (e.g., `specs/bugfix-<time>-<issue>` or `specs/hotfix-<time>-<incident>`).

## Git and Commit Policies
Manage all Git operations to maintain a clean, traceable history.
- **Branching**: Create a feature branch from `main` for each workspace: `git checkout -b <feature-name>`. Name branches descriptively (e.g., `feature/user-auth-enhance` or `bugfix/login-crash`).
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
Execute these phases sequentially for all initiatives. Produce a dedicated Markdown file in the workspace for each phase. Analyze prior phases to inform the next.

### Phase 1 — Specify (`spec.md`)
Generate the initial specification to define the problem and goals clearly.
- Populate sections: `Context` (background and triggers), `Problem Statement` (what's broken or missing), `Objectives` (desired outcomes), `Non-Goals` (explicitly out of scope), `Personas` (affected users/roles), `Success Metrics` (quantifiable KPIs, e.g., "Reduce login time by 50%"), `Constraints` (tech, time, budget limits), `Initial AC` (testable criteria, e.g., "User can login with email/password"), `Glossary` (key terms and definitions), `Open Questions` (initial uncertainties).
- Ensure content is concise, actionable, and testable. Quantify metrics where possible (e.g., link to expected telemetry).
- End with a sign-off section: Log your approval and timestamp.
- Guidelines: Keep prose focused on executable details; avoid vague language.
- Output: Commit spec.md to the feature branch after generation.

### Phase 2 — Clarify (`clarifications.md`)
Identify and resolve ambiguities in the spec to prevent downstream errors.
- Scan spec.md using this taxonomy: Functional Scope, Data Model, UX Flows, Non-Functional Attributes, Edge Cases, Constraints, Terminology.
- Generate a table for questions: Columns — `id` (unique, e.g., Q1), `question` (targeted, e.g., multiple-choice with 2-5 options or short-answer <=5 words), `owner` (yourself), `asked_at` (ISO timestamp), `response` (resolve based on context or user input if provided), `decision` (yes/no/pending), `follow_up` (next steps), `status` (open/resolved).
- Limit to max 5 high-impact questions, prioritized by impact (e.g., security or data model first). Resolve sequentially using available context.
- Address all Open Questions from spec.md. For each resolution, mirror updates back to spec.md (e.g., add details to AC or Glossary) and commit the change.
- Add a "Risk Watchlist" subsection for potential issues (e.g., "API dependency may introduce latency").
- If no critical ambiguities, note "Fully clarified" and proceed.
- Guidelines: Ensure questions reduce rework risk; validate resolutions for consistency.
- Output: Commit clarifications.md and updated spec.md after all questions resolved.

### Phase 3 — Plan (`plan.md`)
Design the technical blueprint based on the clarified spec.
- Generate sections: Architecture decisions (e.g., stack choices), sequence diagrams (text-based Mermaid syntax), data flows, integration points, risk matrix (likelihood/impact table), rollback plan.
- For each AC from spec.md, specify validation method (e.g., unit test, E2E script) and owner (yourself).
- Outline git branches, commit plan, and effort estimates per high-level task.
- Incorporate clarifications and watchlist risks; flag any new open questions for re-clarification.
- End with sign-off.
- Guidelines: Ensure plan is feasible and aligns with constraints; use diagrams for clarity.
- Output: Commit plan.md after generation.

### Phase 4 — Tasks (`tasks.md`)
Break the plan into executable, dependency-ordered units.
- Create a table of atomic tasks: Columns — `task_id` (e.g., T1), `description` (specific, executable steps), `depends_on` (task_ids or none), `owner` (yourself), `estimate` (hours/points), `status` (Todo/In Progress/Blocked/Done), `exit_criteria` (e.g., "Test passes and code reviewed"), `git_commit` (reference after completion).
- Derive tasks from plan.md and spec.md ACs (e.g., one task per entity, endpoint, or integration).
- Order by dependencies: Setup → Tests (TDD) → Core → Integration → Polish. Mark parallelizable tasks with [P] (e.g., independent tests).
- Link tasks to ACs and spec sections. Transition statuses with timestamps and notes (e.g., "Done: 2025-10-02T14:00Z, test coverage 98%").
- Never delete rows; archive completed ones at the end.
- End with sign-off.
- Guidelines: Make tasks specific enough for direct execution; include file paths and TDD cycles.
- Output: Commit tasks.md incrementally as statuses update.

### Phase 5 — Analyze (`analysis.md` + `artifacts/`)
Perform consistency checks and experiments to validate assumptions.
- Conduct a read-only cross-artifact scan (spec.md, plan.md, tasks.md): Detect duplications, ambiguities, coverage gaps (e.g., ACs without tasks), inconsistencies (e.g., terminology drift), using a severity table (CRITICAL/HIGH/MEDIUM/LOW).
- Log experiments: Design tests for risks/metrics, simulate data sources/outcomes, summarize in analysis.md; store raw "data" (e.g., mock outputs) in artifacts/.
- Tie analyses to tasks/risks (e.g., "Coverage gap in security AC → add T5"). If issues found, update prior phases (e.g., add tasks) and commit diffs.
- Generate a coverage summary table (e.g., | Requirement | Has Task? | Notes |) and metrics (e.g., coverage %).
- For change types: Generate impact analysis (modify), baseline metrics (refactor), dependency matrix (deprecate).
- End with sign-off; flag any CRITICAL issues to halt progression.
- Guidelines: Prioritize high-impact gaps; suggest remediations without auto-editing.
- Output: Commit analysis.md and artifacts after scans/experiments.

### Phase 6 — Implement (`implementation.md`)
Execute tasks to build and verify the feature.
- Follow tasks.md sequence: For each task, log start/end times, branch refs, blockers in a journal.
- Apply TDD: Write failing tests (Red), implement to pass (Green), refactor for quality.
- Attach evidence to prove ACs met (e.g., test outputs, mock screenshots/metrics in artifacts/).
- Update tasks.md statuses with [X] for completed; commit code after each TDD cycle.
- End with retrospective: Lessons learned, follow-ups, unresolved debt.
- Create PR with all links; log sign-off.
- Guidelines: Ensure parity with plan; halt on failures and log for review.
- Output: Commit implementation.md, code changes, and merge via PR after full validation.

## Test Driven Development (TDD)
Mandate TDD in all phases, especially Implement:
- Cycle: Red (write failing test for issue/spec), Green (minimal code to pass), Refactor (improve without breaking).
- Aim for 100% coverage on changed code, including edges/negatives. Store manual test plans in `artifacts/tests/`.
- If tests uncover out-of-scope issues, open a new workspace.

## Change-Type Playbooks
Tailor SDD phases to the change type, executing abbreviated or focused workflows as needed. All require a workspace and Git policies.

### Bugfix
- Workflow: Tight scope on defect. Phases 1-3 minimal (spec.md focuses on reproduction).
- Key Action: Write regression test first (Red: fails on current code). Commit test, then fix (Green), refactor.
- Artifacts: Store failing output in `artifacts/regressions/`. Log root cause/prevention in implementation.md.
- Git: Commit test separately, then fix. PR includes permanent regression test.

### Modify (Feature Enhancement)
- Workflow: Extend existing spec or new workspace. Full Phases 1-6.
- Key Action: In Phase 5, generate impact analysis: Scan affected areas (endpoints, schemas, UIs) and document in analysis.md (changes to APIs, data, permissions, migrations).
- Guidelines: Update ACs; validate with mock canary tests.
- Git: Commit analysis as milestone. PR proves no regressions.

### Refactor
- Workflow: Full SDD, emphasizing analysis/testing.
- Key Action: In Phase 5, capture baseline metrics (performance, errors, size) in `artifacts/metrics-baseline/`. Refactor in slices (per task), re-run metrics/tests after each. Rollback if >5% degradation.
- Guidelines: Maintain parity; document rationale/ownership shifts.
- Git: Commit baselines first, then slices with diffs. Final PR compares to baseline.

### Hotfix
- Workflow: Emergency workspace (`hotfix-<time>-<incident>`). Abbreviate Phases 1-3 (spec.md in ~1 hour: incident, radius, mitigation). Skip Analyze if urgent; focus Implement.
- Key Action: Fix issue first (minimal code), backfill tests within 48 hours. Deliver post-mortem in implementation.md: Root cause, timeline, prevention.
- Guidelines: Simulate on-call approval; async reviews OK.
- Git: Short-lived branch; merge post-fix. Follow-up PR for tests/post-mortem.

### Deprecate
- Workflow: Full SDD across 3 stages, each with phased commits.
- Stages:
  1. **Warnings**: Announce (logs/docs/flags). Update spec.md with timeline (e.g., 30 days).
  2. **Disabled**: Toggle off (feature flag); retain code for rollback. Test alternatives.
  3. **Removed**: Delete code/data after validation.
- Key Action: In Phase 5, generate dependency matrix (services, contracts, teams) in analysis.md. Include migration guides.
- Guidelines: "Communicate" via notes; validate compliance before removal.
- Git: Commit per stage (e.g., `deprecate(warnings): add sunset headers`). Archive removed code in tag.

## Compliance and Auditing
- Create `review-log.md` per workspace: Table of approvals (phase, owner, reviewer, timestamp).
- Post-merge, archive workspaces to `/archives/<year>/<month>/`; set read-only.
- Perform quarterly audits: Scan 10% of workspaces for SDD adherence, TDD coverage, Git compliance. Generate report with gaps and retrospectives.