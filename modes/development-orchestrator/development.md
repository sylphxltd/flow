# Development Workflow Manual

## Scope
Use this manual for every engineering initiative, regardless of size or urgency. It defines a single Spec Driven Development (SDD) lifecycle to coordinate intake, planning, execution, validation, and release. Following the steps in this document ensures traceability, reproducibility, and high quality without relying on automation, generated templates, or slash commands.

**Covered initiative types:** `feature`, `bugfix`, `modify`, `refactor`, `hotfix`, `deprecate`. Classify every request into one of these six labels so the orchestrator can load the matching playbook and artifact pairings. All of them still traverse Phase 0 through Phase 7 in order; the only latitude is whether the **Rapid** track is justified for lower-risk work.

## Core Principles
- **Spec Driven Development first**: Every change moves through the SDD phases in order. Do not begin coding before Phase 3 artifacts are approved.
- **Test Driven Development is non-negotiable**: Red → Green → Refactor governs every code change, including hotfixes (tests may follow within 48 hours but must exist).
- **Evidence or it did not happen**: Store logs, metrics, screenshots, and outputs under the workspace `artifacts/` directory; reference them from commits and documents.
- **Traceable commitments**: Each decision, assumption, and sign-off lives in the workspace files. Update upstream documents when downstream work reveals new information.
- **Small, reversible steps**: Design for incremental delivery, short feedback loops, and safe rollbacks.
- **Shared understanding**: Documents must be self-contained so any reviewer can understand context without external references.

## Workspace Protocol

### Directory naming and layout
All initiatives live under `initiatives/<YYYYMMDD-HHMM>-<type>-<name>/`. Placing the timestamp first keeps directories chronologically sorted, making it easy to locate the latest work. Use UTC for the timestamp, keep the type prefix from the list below, and choose a concise kebab-case name that reflects the goal (e.g., `initiatives/20251002-1400-bugfix-login-crash/`). Every artifact, log, and piece of evidence for that change stays inside this folder for the entire lifecycle.

- Type prefixes:
  - `feature` – net new capability.
  - `bugfix` – defect with known regression risk.
  - `modify` – enhancement to an existing capability.
  - `refactor` – internal quality improvement, behavior preserved.
  - `hotfix` – emergency remediation for live incidents.
  - `deprecate` – staged removal of functionality.

If another label better communicates your portfolio structure, document the altered convention at the top of the workspace README and apply it consistently.

Inside the workspace, keep this skeleton:

- Root markdown files for each SDD phase.
- `artifacts/` folder with meaningful subdirectories (see below).
- Optional `notes/` or `spikes/` folders for exploratory findings that support the main artifacts.

### Branch initialization
1. From `main`, create a feature branch using the same timestamped slug as the workspace directory:
   ``git checkout -b <YYYYMMDD-HHMM>-<type>-<name>`` (e.g., `20251002-1400-bugfix-login-crash`).
   Always include the 12-digit UTC timestamp (with `-` between date and time) to guarantee uniqueness across parallel work.
2. Run `git status` to ensure the new branch is clean before committing artifacts.
3. Update the branch description (if your tooling supports it) with a one-line summary and link to the workspace path.

### Standard artifact checklist
Create each file manually using the outlines below. Copy the headings directly; do not rely on external templates.

1. `spec.md`
   - Context and background.
   - Problem statement or opportunity.
   - Objectives (measurable outcomes).
   - Non-goals.
   - Personas / affected users.
   - Success metrics.
   - Constraints and assumptions.
   - Initial acceptance criteria (AC).
   - Glossary.
   - Open questions.
   - Sign-off block with ISO timestamp and actor label in the form `Agent: <agent-name> (<model-id>)` (e.g., `Agent: Kilocode (gpt-5-codex)`).
2. `clarifications.md`
   - Introduction (link back to `spec.md`).
   - Question table with columns: `id`, `question`, `answer`, `source`, `decision`, `follow_up`, `status`, `answered_at`.
   - Risk watchlist with owner, likelihood, impact, mitigation.
   - Summary of updates applied to other artifacts.
   - Sign-off block.
3. `plan.md`
   - Architecture overview (components, responsibilities).
   - Data flow narrative and diagram (Mermaid text diagram accepted).
   - Technology selections with rationale.
   - Integration points and failure handling.
   - Validation mapping for each acceptance criterion.
   - Risk matrix and contingency plan.
   - Effort estimates and sequencing notes.
   - Git strategy and branching considerations.
   - Sign-off block.
4. `tasks.md`
   - Markdown checklist where each entry begins `- [ ] TXXX — title` and includes indented metadata lines for `Depends on`, `Owner`, `Exit criteria`, `Evidence`, and optional `Notes`.
   - Mark parallelizable items by appending `[P]` inside the title (e.g., `- [ ] T003 [P] — …`).
   - Update entries immediately when work finishes by flipping `[ ]` to `[x]`, filling the evidence path, and recording the completion timestamp inside the metadata.
   - Maintain a change-log section at the bottom documenting scope adjustments with ISO timestamps.
   - Sign-off block.
5. `analysis.md`
   - Summary of cross-artifact checks.
   - Findings table with severity (Critical/High/Medium/Low), location, description, recommended action.
   - Experiments and simulations (inputs, outputs, insights).
   - Coverage summary mapping ACs to tasks/tests.
   - Decisions taken or deferred.
   - Sign-off block.
6. `implementation.md`
   - Journal of executed tasks (start/end, branch details, blockers).
   - TDD log (test names, status, notes).
   - Evidence references (file paths under `artifacts/`).
   - Retrospective and follow-up actions.
   - Final validation checklist.
   - Sign-off block.
7. `review-log.md`
   - Table with columns: `phase`, `actor`, `timestamp`, `status`, `notes`.
   - Record the executing agent in the actor column using `Agent: <agent-name> (<model-id>)` (e.g., `Agent: Kilocode (gpt-5-codex)`). Capture status values such as `Completed`, `Blocked`, or `Deferred`; leave no row blank once the phase closes.
8. `artifacts/`
   - `artifacts/tests/` for automated and manual test outputs.
   - `artifacts/metrics/` for performance, error-rate, or sizing baselines.
   - `artifacts/diagrams/` for architectural or sequence diagrams.
   - `artifacts/regressions/` for failing cases captured during bug triage.
   - Any other folders needed for logs, screenshots, or datasets referenced by the workspace.
   - Include a README in `artifacts/` describing contents and capture dates.
9. Type-specific supplements (create only the ones relevant to the change):
   - `bug-report.md` (Reproduction steps, Current vs Expected Behavior, Environment, Severity, Root Cause) plus the failing regression test captured before the fix.
   - `modification-spec.md` (Baseline reference, Added/Modified/Removed, Backward compatibility) together with `impact-analysis.md` (dependencies, integrations, compatibility notes).
   - `refactor-spec.md` (Code smells, Target state, Risk level, Metrics to capture) paired with `baseline-metrics.md` (pre-change performance/quality baselines).
   - `hotfix.md` (Incident timeline, Severity P0–P2, Immediate mitigation, Communication log, rollback) plus `post-mortem.md` completed within 48 hours.
   - `deprecation-plan.md` (Warnings/Disabled/Removed phases, Migration path, Communication strategy) alongside `dependency-analysis.md` (consumers, mitigation owners, retirement checkpoints).

### Workspace operating rules
- Do not mix scopes; open a new workspace whenever objectives change materially.
- Keep documents current—update earlier phases when new information emerges.
- Mirror every decision across artifacts; stale information must be corrected immediately.
- Close open questions before exiting Phase 3 unless explicitly deferred with risk acknowledgement.
- Commit artifacts before making code changes so reviewers can follow the narrative chronologically.

### Subtask delegation protocol
When using the orchestrator mode to open a `new_task`, always provide a structured brief so the Code Mode agent understands the full context:
1. **Context** — One paragraph summarising current phase, workspace path, and relevant prior decisions or files.
2. **Objective** — Bullet list of concrete goals for the subtask (e.g., “Populate clarifications table with three questions focused on data model”).
3. **Inputs** — Explicit file paths and snippets (if needed) the subtask must read before acting.
4. **Actions** — Ordered checklist of steps to follow, including required tooling (e.g., `read_file`, `apply_diff`), validation expectations, and TDD requirements.
5. **Deliverables** — Enumerate files to create or update, formatting rules, and how evidence should be stored under `artifacts/`.
6. **Completion report** — Specify the status flags the subtask must report in `attempt_completion` (e.g., `PHASE=2/7`, `CLARIFICATIONS_OPEN=2`, `TASKS_UPDATED=T001,T002`), plus any follow-up instructions.

The brief should be self-contained, reference the `initiatives/<timestamp>-<type>-<name>/` directory, and forbid assumptions that aren’t stated. Never delegate ambiguous work.

## Workflow Tracks
Select the execution track during Phase 0 and record it in `review-log.md` so every downstream artifact knows the expected depth of work.

| Track | When to use | Phase coverage | Mandatory outputs |
| ----- | ------------ | -------------- | ----------------- |
| **Full SDD** | Feature delivery, high/critical bugfix, major modify, high-risk refactor, hotfix, deprecate, or whenever uncertainty is high | Phases 0–7 executed explicitly and sequentially | All core artifacts described in each phase plus type-specific supplements (e.g., bug-report.md, impact-analysis.md, baseline-metrics.md, hotfix.md/postmortem.md, dependency-analysis.md) |
| **Rapid** | Low/medium-risk tweaks (e.g., cosmetic bugfix, copy update, small config change) where full discovery is disproportionate | Phase 0 recorded, Phase 1/2 condensed into minimal artefacts, Phase 3/5 optionally marked `N/A` with justification, Phase 4/6/7 executed normally | Minimal artefacts per type (see Type Playbooks) such as bug-report.md + regression test, lightweight change log, updated tasks/implementation notes. Any skipped phase must be marked `N/A (Rapid Track)` in `review-log.md` with rationale. |

Guidelines:
- Default to **Full SDD** unless a Rapid justification is documented.
- Rapid track still requires regression tests, constitution compliance, and release checks; it only trims discovery/analysis depth.
- Switching from Rapid → Full midstream is allowed when new risks appear; update `review-log.md` to reflect the new track.
- Severity-to-track guardrail: Critical/High issues (e.g., production outages, security breaches) automatically use **Full SDD**; Medium issues default to Full unless Rapid is justified with documented risk containment; Low issues may use Rapid only when rollback is trivial and evidence capture remains intact.
- Bugfixes still traverse all eight phases. Rapid merely condenses discovery/analysis artifacts; it never removes regression tests or constitution checks (Phases 1, 3, and 6 must explicitly cite applicable clauses in either track).

## Git Discipline
- **Branching**: One branch per workspace. Use `git fetch` and `git rebase origin/main` regularly to minimize drift, but avoid force pushes after sharing work.

### Sign-off convention
- Wherever a document prompts for a sign-off name, record the executing agent identifier as `Agent: <agent-name> (<model-id>)` (for example, `Agent: Kilocode (gpt-5-codex)`).
- Record timestamps in ISO 8601 UTC.
- If a human reviewer later approves the phase, append a new line with their name and timestamp; otherwise the automated entry stands alone.

### Constitution governance
- The project constitution resides at `governance/constitution.md`. It defines non-negotiable principles (e.g., strong typing, security posture, observability baselines). The document must contain a `version` field (semantic version or dated tag) and a short changelog so downstream workflows can reference the version without looking up commit hashes.
- Phase 0 must read the constitution, confirm the version/hash, and halt the SDD workflow if the document is missing or outdated until it is authored or refreshed.
- When a new initiative requires additional principles, follow the Constitution Authoring Flow before proceeding:
  1. Analyse existing artifacts (previous workspaces, audit findings, incident reports) to infer required rules.
  2. Draft proposed clauses in a temporary note and highlight uncertainties.
  3. Ask the user targeted questions to confirm new or updated principles.
  4. Update `governance/constitution.md`, bump the version metadata, and append a changelog entry (ensure version changes are staged before the same commit to avoid extra follow-up commits).
  5. Log the constitution update in `review-log.md` Phase 0 with `Actor: <agent-name> (<model-id>)`, timestamp, and the new constitution version.
- Every downstream phase must reference the constitution:
  - **Phase 1** embeds applicable clauses in `Constraints` / `Success Metrics`.
  - **Phase 2** raises clarification questions for any ambiguous or missing constitutional coverage.
  - **Phase 3** maps each clause to design decisions or records justified exceptions with follow-up tasks.
  - **Phase 6** verifies each implementation slice against the clauses; if a violation occurs, flag the task as blocked and loop back through clarification/plan adjustments before continuing.
- **Milestone commits**: Keep the history lean by bundling related phases. Standard cadence:
  1. **Optional `init`** — only if the skeleton itself required non-trivial setup; otherwise keep changes staged.
  2. **`docs`** — single commit that lands completed Phases 1–3 together (spec, clarifications, plan). Do not push partial documents.
  3. **`execution-plan`** — commit once Phases 4–5 (tasks checklist + analysis) are both ready; they should share the same change-set.
  4. **`implementation` slices** — each slice covers a coherent set of tasks (usually one user-facing capability). Include Red → Green → Refactor in the same commit.
  5. **`release`** — final housekeeping after Phase 7 (status updates, documentation polish) immediately before PR merge. Before cutting this commit, stage outstanding documentation updates—at minimum `review-log.md`, `implementation.md`, badges, and evidence links—so the release commit encapsulates the full Phase 7 record rather than leaving a stray documentation-only change.
  Local scratch commits are fine while working, but squash or amend them before sharing the branch.
- **Implementation commits**: Preserve the Red → Green → Refactor order inside a single commit whenever practical. Include the failing test, the fix, and the follow-up refactor in one logical change-set to avoid noisy history while still proving TDD discipline.
- **Commit message format**: `<type>(<scope>): <description>`. Examples:
  - `feature(auth): add specify-phase spec.md`
  - `bugfix(login): add failing regression test for null session`
  - `refactor(cache): extract eviction policy and add metrics`
  Include references to evidence paths when applicable: “See artifacts/tests/login-regression.json”.
- **Diff hygiene**: Review `git diff` before each commit to confirm only intentional files change. Remove generated artifacts that should not be versioned.
- **Pull requests**: Open a PR only after Phase 6 completes. The description must link to each workspace document and summarize validation evidence. Set reviewers (self-review allowed when human review not available) and note outstanding risks.
- **Merge policy**: All tests must pass locally and in CI. Achieve ≥95 % coverage on touched code. Default to **squash merge** so the `release` commit becomes the single entry on `main` (or use rebase merge when milestone commits need to remain separate but still linear). Tag release candidates with semantic versions when delivering user-facing changes.
- **Hotfix shortcut**: For true emergencies, keep the branch short-lived, document the expedited timeline in `hotfix-incident.md` and `implementation.md`, merge as soon as the fix is validated, and follow up with test backfills and post-mortem within 48 hours.

## Test Driven Development Guarantee
- Always begin with the failing test that expresses the target behavior or regression. Place the test under the appropriate suite and save raw failure output inside `artifacts/tests/`.
- Make the minimal change required to pass the test, commit the passing state, then refactor while keeping the test suite green. Refactoring commits must not change observable behavior.
- Expand coverage to include negative, edge, and concurrency scenarios. Document any remaining gaps in `analysis.md` with mitigation plans.
- Record manual testing scripts or exploratory findings and store them alongside automated outputs. Provide reproducible instructions so others can rerun the validation.
- If a bug or missing requirement is uncovered outside the workspace scope, log it in `analysis.md`, create a new workspace, and reference the tracking identifier in your notes.

## Spec Driven Development Lifecycle
Each phase must be completed in order. Do not skip ahead; reopen earlier phases when material changes occur.

### Phase 0 — Intake & Kickoff
**Objective:** Capture the request, align with project governance, choose the workflow track, and prepare the workspace.

1. Read the project constitution at `governance/constitution.md`. If it is missing, pause and create/update it (see Constitution Governance above) before continuing. When authoring or updating the constitution, bump its version and update the changelog before making the single commit that introduces the change so no follow-up commits are needed.
2. Collect the original request text verbatim in a `README` or within `spec.md`’s context section.
3. Determine the change type using the prefixes enumerated above and assess risk/impact.
4. Select the workflow track (Full SDD vs Rapid). Default to Full unless a Rapid justification is documented (e.g., low-risk cosmetic fix). Record the choice and rationale in `review-log.md`.
5. Create the workspace directory and initialize the branch using the identical timestamped name: ``git checkout -b <type>-<YYYYMMDDHHMM>-<name>``.
6. Create empty versions of all standard artifacts with headings in place (include type-specific supplements where relevant).
7. Add initial entries to `review-log.md` for Phase 0 noting `Actor: <agent-name> (<model-id>)`, `Status: Completed`, the selected track, and the constitution version applied.
8. Commit the skeleton with message `<type>(init): bootstrap workspace for <name>` (only if scaffolding required non-trivial setup).

**Outputs:** Workspace folder, branch, empty artifacts ready for content, constitution alignment and track recorded.

### Phase 1 — Specify (`spec.md`)
**Objective:** Define the problem/opportunity and success criteria.

1. Populate all sections listed in the artifact checklist with concrete, testable statements.
2. Quantify objectives and success metrics; include baseline measurements if available.
3. Identify personas, stakeholders, and touchpoints.
4. Explicitly state non-goals to prevent scope creep.
5. Reference the constitution by listing applicable clauses in `Constraints` or `Success Metrics`, and highlight any potential gaps for later clarification.
6. List initial open questions requiring clarification.
6. Update `review-log.md` for Phase 1 (actor `Agent: <agent-name> (<model-id>)`, status `Completed`) and sign off in `spec.md` using the same label.
7. Commit with `<type>(spec): document scope and objectives`.

**Outputs:** Completed specification, sign-off recorded.

### Phase 2 — Clarify (`clarifications.md`)
**Objective:** Resolve ambiguities before planning.

1. Review `spec.md` and the governing principles referenced from `governance/constitution.md`. Assemble a prioritized queue of targeted questions covering functional scope, data model, UX, non-functional requirements, integrations, edge cases, constraints, and constitutional compliance gaps.
2. Work through questions in batches of up to five before reassessing impact, ensuring each one is high leverage rather than flooding the workflow with noise.
3. Populate the question table with pending items and assign owners (default to yourself unless a stakeholder must answer).
4. Resolve questions using existing artifacts, domain knowledge, or additional research whenever possible; only escalate to the user or other stakeholders when information is genuinely missing. Record the answer source and timestamp.
5. Update `spec.md` immediately after each resolution; keep both documents in sync.
6. Maintain a risk watchlist capturing newly surfaced uncertainties.
7. When all critical questions are answered or formally deferred, sign off the clarifications document with the executing agent label and log Phase 2 in `review-log.md` (actor `Agent: <agent-name> (<model-id>)`, status `Completed`).
8. Commit with `<type>(clarify): resolve open questions and sync spec`.

**Outputs:** Resolved question table, updated spec, risk watchlist.

### Phase 3 — Plan (`plan.md`)
**Objective:** Produce the technical blueprint with detailed codebase analysis.

1. Analyze the existing codebase: Identify affected files, modules, classes, functions, and dependencies. Document current implementation details, data flows, and integration points relevant to the change.
2. Summarize architectural decisions, including diagrams (ASCII or Mermaid) describing component interactions and how they integrate with existing code.
3. Detail data models, contracts, and external dependencies, specifying how they align or conflict with current structures.
4. Map each acceptance criterion to specific validation methods (unit test, integration test, manual scenario), referencing existing test suites where applicable.
5. Create a risk matrix with likelihood, impact, mitigation, and owner. Include rollback and contingency plans based on codebase analysis.
6. Outline the implementation approach, guardrails, and sequencing of major themes, mapping each constitution clause to specific design decisions or recording justified exceptions with follow-up tasks.
7. Document branching, environment, and deployment considerations, including any required infrastructure changes.
8. Sign off and update `review-log.md` for Phase 3 (actor `Agent: <agent-name> (<model-id>)`, status `Completed`).
9. Commit with `<type>(plan): establish architecture and validation strategy`.

**Outputs:** Complete plan document referencing the spec and clarifications.

### Phase 4 — Tasks (`tasks.md`)
**Objective:** Break the plan into executable steps with specific file and modification details.

1. Structure `tasks.md` as a Markdown checklist so progress is instantly visible. Each item must follow this shape:
   ```
   - [ ] T001 — Red test for login flow
     - Depends on: none
     - Owner: you
     - Exit criteria: failing test recorded in artifacts/tests/login-red.txt
     - Evidence: artifacts/tests/login-red.txt
     - Notes: optional context (e.g., prerequisites, concurrency hints)
   ```
   Indent metadata beneath the checkbox. Use `[ ]` for open work and `[x]` (lowercase) the moment a task is completed.
2. Translate plan elements and acceptance criteria into atomic tasks, directly referencing the codebase analysis from `plan.md`. Each task must specify affected files, modules, classes, or functions, and describe the exact changes required (e.g., "Modify function X in file Y to add parameter Z and update logic for condition W").
3. Capture dependencies explicitly in the metadata. Mark parallelizable tasks by appending `[P]` inside the title: `- [ ] T003 [P] — …`.
4. Prepend test-writing tasks before implementation tasks for the same area to enforce TDD sequencing.
5. Define measurable exit criteria inside the metadata, include evidence placeholders that point to future artifacts, and only add effort notes when they help scheduling parallel work.
6. Reserve ID ranges for future discoveries instead of renumbering existing tasks (e.g., leave `T010` blank if skipping).
7. Update the checklist immediately after finishing any task—flip `[ ]` to `[x]`, supply the actual evidence path, and note the completion timestamp in the metadata.
8. Maintain a brief change log section at the bottom for status updates or scope adjustments with ISO timestamps.
9. Sign off and log Phase 4 completion in `review-log.md` (actor `Agent: <agent-name> (<model-id>)`, status `Completed`).
10. Commit with `<type>(tasks): publish execution plan`.

**Outputs:** Dependency-ordered checklist ready for execution.

### Phase 5 — Analyze (`analysis.md` + `artifacts/`)
**Objective:** Validate readiness and surface risks before coding.

1. Perform cross-artifact checks:
   - Requirements vs. tasks coverage.
   - Non-functional requirements vs. planned validation.
   - Terminology consistency.
   - Duplicate or conflicting statements.
2. Record findings in a severity table and document recommended actions.
3. Conduct experiments, spikes, or simulations required to de-risk the plan. Store raw outputs under `artifacts/` and summarize results in `analysis.md`.
4. Update earlier artifacts if adjustments are necessary; note the updates and timestamp them.
5. Sign off Phase 5 in `analysis.md` and `review-log.md` (actor `Agent: <agent-name> (<model-id>)`, status `Completed`).
6. Commit with `<type>(analysis): capture readiness assessment`.

**Outputs:** Analysis report, supporting artifacts, updated upstream documents.

### Phase 6 — Implement & Validate (`implementation.md`)
**Objective:** Execute tasks, write code, and prove correctness.

1. Follow the task order. Before starting each task, record the timestamp and intent in the journal section.
2. For each implementation unit:
   - Write or update tests (Red).
   - Implement the minimal code change (Green).
   - Refactor for maintainability (Refactor).
   - Confirm the slice complies with all relevant constitution clauses. If any principle is violated, mark the task as blocked, open the necessary clarification or plan adjustment, and resume only after resolving the gap.
3. Capture test results, metrics, and screenshots in `artifacts/`; reference them from the journal, noting the constitution clauses validated.
4. Update `tasks.md` immediately after finishing a task: flip the relevant checkbox to `[x]`, fill in the evidence path, add the completion timestamp within the metadata, and list the constitution clauses covered.
5. Log blockers or deviations in `implementation.md` and provide mitigation steps.
6. Maintain a running summary of code changes, linking to relevant commits.
7. Run the full test suite before finalizing the phase.
8. Sign off Phase 6 in `review-log.md` (actor `Agent: <agent-name> (<model-id>)`, status `Completed`).
9. Commit with `<type>(implement): complete tasks and validations`.

**Outputs:** Code changes, validated tasks, implementation journal, evidence.

### Phase 7 — Release & Archive
**Objective:** Deliver the change safely and preserve history.

1. **Obtain user approval**: After Phase 6 completes, pause and request explicit user review and approval of all artifacts, tests, and implementation evidence before proceeding. Do not advance to Phase 7 without confirmation.
2. Review all documents to confirm they reflect final decisions and outcomes.
3. Prepare the pull request referencing the workspace path, tests performed, metrics gathered, and outstanding risks (if any).
4. Obtain required approvals (self-review permitted where external reviewers are unavailable but must still be logged).
5. Merge once CI passes and acceptance criteria are demonstrably met. Use squash or rebase merges for cleanliness.
6. Tag releases if the change is user-facing or otherwise significant.
7. Mark the workspace as `Completed` in `review-log.md` by logging a final entry (`actor = Agent: <agent-name> (<model-id>)`, `status = Completed`) and optionally add a badge in `spec.md`. Do not move or duplicate the folder—the entire history remains in `initiatives/<timestamp>-<type>-<name>/`.
8. Record final audit notes in `review-log.md`, including merge commit hash, release tag (if any), and completion status.
9. Close or transfer any follow-up tasks noted in the retrospective.

**Outputs:** Merged code, archived workspace, documented release.

## Change-Type Playbooks
Use these playbooks to tailor the lifecycle while preserving all phases.

### Feature (Net New Capability)
- Emphasize discovery in Phase 1 by detailing user journeys and success metrics.
- During planning, design module boundaries and contracts from the ground up; prototype risky UX flows in Phase 5.
- Tasks should start with scaffolding tests that define expected behaviors before implementation.
- In analysis, verify telemetry and logging requirements to ensure observability from day one.

### Bugfix
- Maintain the severity scale: Critical (crash/data loss), High (core feature broken), Medium (major annoyance), Low (cosmetic).
- Produce `bug-report.md` with reproduction steps, environment, severity, and explicit root cause; store evidence under `artifacts/regressions/`.
- Phase 2 confirms the defect scope, guardrails, and constitution clauses impacted.
- The first Phase 4 task is the failing regression test committed before any fix.
- Implementation commits must follow failing test → fix → refactor, keeping the regression test in the suite permanently.

### Modify (Enhancement)
- Link to the originating feature workspace/spec and document the behavior delta inside `modification-spec.md`.
- Produce `impact-analysis.md` detailing dependent endpoints, schemas, integrations, and compatibility constraints.
- Plan backward compatibility checks, migration steps, documentation updates, and telemetry adjustments.
- Tasks must cover documentation, contract, and client library updates alongside validation of integrations.
- Analysis confirms prior acceptance criteria remain satisfied and cites mitigation for any incompatibility.

### Refactor
- Capture code smells, scope, and goals inside `refactor-spec.md`.
- Record pre-change baselines in `baseline-metrics.md` under `artifacts/metrics/` (performance, error rates, footprint).
- Divide work into safe slices with tests guarding behavior and reference clause compliance.
- Implementation journal must prove no behavior change and include before/after metrics for each slice.
- Roll back any slice that degrades tracked metrics by more than 5 %.

### Hotfix
- Document incident timeline, severity (P0/P1/P2), mitigation, and rollback inside `hotfix.md`, citing constitution clauses at risk.
- Compress Phases 1–3 for rapid assessment but record every decision and assumption explicitly.
- Implement the minimal fix quickly; backfill regression tests and validation evidence within 48 hours.
- Deliver `post-mortem.md` inside 48 hours covering root cause, timeline, preventative measures, and evidence of regression coverage.
- Merge promptly once stable, then schedule follow-up workspaces for preventative improvements if needed.

### Deprecate
- Capture rationale, usage patterns, and affected personas in `spec.md`, then formalize the schedule in `deprecation-plan.md`.
- Maintain `dependency-analysis.md` cataloguing consumers, mitigation owners, readiness checkpoints, and rollback paths.
- Plan three stages with timelines:
  1. **Warnings** — announcements, communication plan, documentation updates.
  2. **Disabled** — feature off by default (with rollback option), validation of alternatives, migration guidance.
  3. **Removed** — code/data removal after verifying all consumers have transitioned.
- Tasks group work by stage with communication deliverables, migration validation, and dependency sign-offs.
- Analysis reviews dependency coverage and blocks removal until every consumer has an approved migration path.

## Evidence Management & Auditing
- Every artifact referenced in documentation or commits must exist and be versioned. Use relative paths when citing evidence.
- Maintain quarterly audits by sampling 10 % of workspaces to verify adherence to this manual. Record findings in a centralized audit log.
- Post-merge, update shared knowledge bases or runbooks with lessons learned. Cite the workspace path for future reference.
- Treat this document as the constitution: changes require agreement, documented rationale, and propagation to all workspaces going forward.