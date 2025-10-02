# Development Workflows

## Scope
Apply this document to every engineering initiative, regardless of size or urgency. It governs how teams coordinate planning, testing, and delivery using Spec Driven Development (SDD). All changes must follow structured phases to ensure traceability, quality, and minimal technical debt.

## Directory Convention
- Every initiative gets a dedicated workspace at `specs/<time>-<feature-name>/` (UTC timestamp `YYYYMMDD-HHMM` + concise kebab-case feature label, e.g., `specs/20251002-1400-user-auth-fix/`).
- Keep artifacts human-reviewable and version-controlled. Store supporting evidence under `artifacts/` with descriptive filenames (e.g., `artifacts/regression-test-output.json`).
- Never reuse a workspace across changes; create a fresh directory if scope or objectives shift materially.
- For change types like bugfix or hotfix, prefix the directory accordingly (e.g., `specs/bugfix-<time>-<issue>` or `specs/hotfix-<time>-<incident>`).

## Git and Commit Policies
- **Branching**: Create a feature branch from `main` for each workspace: `git checkout -b <feature-name>`. Name branches descriptively (e.g., `feature/user-auth-enhance` or `bugfix/login-crash`).
- **Commit Frequency**: Commit after each SDD phase completion or task milestone. Use descriptive messages following the format: `<type>(<scope>): <description>` (e.g., `fix(login): resolve null pointer in auth handler` or `feat(billing): add invoice generation task`).
  - Commit early and often during implementation: After writing tests (Red phase), after making them pass (Green), and after refactoring.
  - Include evidence links in commit messages (e.g., "See artifacts/regression-test.json for failing output").
- **Pull Requests (PRs)**: Never merge directly to `main`. Create a PR per workspace at the end of Phase 6 (Implement). PRs must include:
  - Links to all phase documents and artifacts.
  - Reviewer sign-off (at least one reviewer).
  - Automated checks: Tests must pass, coverage >=95% for changed code.
- **Merges**: Squash commits into logical units before merging. Tag releases with semantic versioning (e.g., `v1.2.0`). Use `git rebase` for clean history during development, but avoid force-pushing shared branches.
- **Hotfix Exception**: For hotfixes, use a short-lived branch and expedited PR (e.g., on-call reviewer). Merge immediately after fix, but follow up with a full PR for post-mortem and backfills.
- **Deprecation Stages**: Commit warnings/disables to feature branches first, test thoroughly, then merge to `main`. Removal commits must reference the full deprecation plan.

## Global Controls
- No code merges to `main` until the workspace documents all completed SDD phases, acceptance criteria (AC), and evidence (e.g., tests, metrics).
- Update upstream documents (e.g., spec.md) if downstream phases reveal changes; log revisions with timestamps and rationale.
- Each phase requires explicit sign-off: owner, reviewer(s), timestamp in the phase file (e.g., at the top of spec.md).
- Integrate Test Driven Development (TDD) throughout: Always write failing tests before code changes (Red → Green → Refactor).
- Use artifacts/ for all evidence: Test outputs, metrics baselines, diagrams, logs. Ensure files are committed to the repo.

## Spec Driven Development (SDD)
Follow these phases sequentially for all initiatives. Each phase produces a dedicated Markdown file in the workspace.

### Phase 1 — Specify (`spec.md`)
- **Structure**: Include sections: `Context` (background), `Problem Statement` (what's broken or missing), `Objectives` (desired outcomes), `Non-Goals` (out of scope), `Personas` (affected users), `Success Metrics` (quantifiable KPIs, e.g., "Reduce login time by 50%"), `Constraints` (tech, time, budget), `Initial AC` (testable criteria, e.g., "User can login with email/password"), `Glossary` (key terms), `Open Questions` (initial uncertainties).
- **Guidelines**: Keep concise and actionable. Link metrics to tools (e.g., performance traces). End with sign-off.
- **Output**: Commit spec.md to the feature branch after sign-off.

### Phase 2 — Clarify (`clarifications.md`)
- **Structure**: Use a table for questions: Columns — `id` (unique, e.g., Q1), `question`, `owner`, `asked_at` (ISO timestamp), `response`, `decision` (yes/no/pending), `follow_up` (next steps), `status` (open/resolved).
- **Guidelines**: Address all Open Questions from spec.md. Escalate blockers with due dates and tags (e.g., @reviewer). Mirror resolutions back to spec.md and commit updates.
- **Additional**: Add a "Risk Watchlist" subsection for potential issues (e.g., "Dependency on external API may fail").
- **Output**: Commit after all questions resolved and spec.md updated.

### Phase 3 — Plan (`plan.md`)
- **Structure**: Include architecture decisions, sequence diagrams (text-based or linked images), data flows, integration points, risk matrix (likelihood/impact), rollback plan.
- **Guidelines**: For each AC, specify validation method (e.g., unit test, E2E script) and owner. Outline git branches and commit plan. Estimate effort per task.
- **Output**: Commit plan.md after sign-off. Use it to guide task breakdown.

### Phase 4 — Tasks (`tasks.md`)
- **Structure**: Table with atomic tasks: Columns — `task_id` (e.g., T1), `description`, `depends_on` (task_ids or none), `owner`, `estimate` (hours/points), `status` (Todo/In Progress/Blocked/Done), `exit_criteria` (e.g., "Test passes and code reviewed"), `git_commit` (reference after completion).
- **Guidelines**: Link tasks to ACs and spec sections. Transition statuses with timestamps and notes (e.g., "Blocked: Awaiting API response, 2025-10-02T14:00Z"). Never delete rows; archive completed ones.
- **Output**: Commit incrementally as tasks progress. Final commit after all tasks marked Done.

### Phase 5 — Analyze (`analysis.md` + `artifacts/`)
- **Structure**: Log experiments, data sources, results. Summarize findings; store raw data in artifacts/ (e.g., `artifacts/performance-baseline.json`).
- **Guidelines**: Tie analyses to tasks or risks (e.g., "A/B test validates AC1"). If results change assumptions, update prior phases (spec/plan/tasks) and commit diffs.
- **Output**: Commit after key analyses; use to inform implementation.

### Phase 6 — Implement (`implementation.md`)
- **Structure**: Journal of execution: Per-task logs with start/end times, branch refs, blockers. Include TDD evidence (test files, coverage reports). End with retrospective (lessons, follow-ups, debt).
- **Guidelines**: Follow tasks.md sequence strictly. For each task:
  - Write tests first (TDD Red phase).
  - Implement to pass tests (Green).
  - Refactor for cleanliness.
  - Commit after each cycle with evidence.
- Attach artifacts proving ACs met (e.g., test runs, screenshots). Close with sign-off and PR creation.
- **Output**: Commit implementation.md and code changes. Merge via PR only after full evidence.

## Test Driven Development (TDD)
- Mandatory across all phases, especially Implement.
- Cycle: Red (write failing test reproducing issue or spec), Green (minimal code to pass), Refactor (improve without breaking).
- Aim for 100% coverage on changed code, including edges/negatives. Store manual test plans in `artifacts/tests/`.
- If tests uncover out-of-scope issues, open a new workspace.

## Change-Type Playbooks
Tailor SDD phases to the change type. All still require a workspace and git policies.

### Bugfix
- **Workflow**: Tight scope around the defect. Phases 1-3 minimal (focus on reproduction steps in spec.md).
- **Key Rule**: Write regression test first (Red: must fail on current code). Commit test, then fix (Green), refactor.
- **Artifacts**: Store failing test output in `artifacts/regressions/`. Document root cause and prevention in implementation.md.
- **Git**: Commit test separately, then fix. PR must include the permanent regression test.
- **When to Skip**: None; even small fixes need spec and test.

### Modify (Feature Enhancement)
- **Workflow**: Extend existing spec or new workspace if substantial. Run full Phases 1-6.
- **Key Rule**: Automatically generate impact analysis in Phase 5 (Analyze): Scan affected code (endpoints, DB schemas, UIs) using tools like static analysis or dependency graphs. Document in analysis.md: Changes to APIs, data, permissions, migrations.
- **Guidelines**: Update ACs for new behaviors. Validate with canary tests or metrics.
- **Git**: Commit impact analysis as a milestone. PR requires proof of no regressions.

### Refactor
- **Workflow**: Full SDD, but emphasize analysis and testing.
- **Key Rule**: In Phase 5, capture baseline metrics (performance, errors, bundle size) in `artifacts/metrics-baseline/`. Refactor in small slices (per task), re-run metrics/tests after each. Rollback if degradation > threshold (e.g., 5% slowdown).
- **Guidelines**: Maintain functional parity; sequence to avoid breaking production. Document rationale and ownership shifts.
- **Git**: Commit baselines first, then per-slice changes with metric diffs. Final PR compares end-state to baseline.

### Hotfix
- **Workflow**: Emergency workspace (`hotfix-<time>-<incident>`). Abbreviate Phases 1-3 (spec.md within 1 hour: incident details, blast radius, mitigation). Skip Analyze if no time; focus on Implement.
- **Key Rule**: Fix production issue first (minimal code), allow post-fix testing (backfill within 48 hours). Deliver post-mortem in implementation.md: Root cause, timeline, prevention.
- **Guidelines**: On-call approval for expedited PR. No waivers on git policies, but async reviews OK.
- **Git**: Short-lived branch; merge immediately post-fix. Follow-up PR for tests/post-mortem.

### Deprecate
- **Workflow**: Full SDD across 3 stages, each in its own workspace or phased commits.
- **Stages**:
  1. **Warnings**: Announce deprecation (e.g., logs, docs, API headers). Update spec.md with timeline (e.g., 30 days).
  2. **Disabled**: Toggle off via feature flag; retain code for rollback. Test alternatives.
  3. **Removed**: Delete code/data after validation.
- **Key Rule**: In Phase 5, generate dependency analysis matrix (impacted services, contracts, teams) in analysis.md. Include migration guides.
- **Guidelines**: Communicate at each stage (release notes, notifications). Validate compliance (data retention) before removal.
- **Git**: Stage commits per phase (e.g., `deprecate(warnings): add sunset headers`). Archive removed code in a tag if needed.

## Compliance and Auditing
- Each workspace needs `review-log.md`: Table of approvals (phase, owner, reviewer, timestamp).
- Archive completed workspaces to `/archives/<year>/<month>/` post-merge; set read-only.
- Quarterly audits: Sample 10% of workspaces for SDD adherence, TDD coverage, git compliance. Report gaps and enforce retrospectives.