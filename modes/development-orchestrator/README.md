# Development Orchestrator Assets

This directory contains the two canonical artifacts that must stay in sync:

| File | Purpose |
| ---- | -------- |
| [`development.md`](development.md) | The authoritative Development Workflow Manual. It describes every phase, artifact, and governance rule that any engineering initiative must follow. |
| [`custom_mode.yaml`](custom_mode.yaml) | The orchestrator mode definition that enforces the manual. It explains how the automation should delegate `new_task` subtasks, log progress, and apply the governance rules in practice. |

## How they relate

- **Single source of truth**: `development.md` outlines the rules; `custom_mode.yaml` operationalises them. Whenever you modify the manual (phases, naming, constitution handling, sign-offs, etc.), you must mirror the same behaviour in the mode file.
- **Bi-directional checks**: The orchestrator should never describe behaviour that is absent from the manual. If you add orchestration logic (e.g., constitution flow, naming scheme, commit cadence), ensure the manual contains matching guidance and vice versa.
- **Governance compliance**: Both files reference `governance/constitution.md`. Any update to constitution handling must appear in:
  1. Phase 0 instructions inside `development.md`.
  2. The “Constitution Governance” section in `custom_mode.yaml`.
  3. All downstream phases that reference the constitution (Phases 1/2/3/6).

## Prompt engineering checklist for future edits

When you need to modify these assets, start every session by grounding yourself with the following prompt to ensure consistency:

```
1. Read modes/development-orchestrator/development.md entirely.
2. Read modes/development-orchestrator/custom_mode.yaml entirely.
3. List the change I intend to make (e.g., update naming conventions, adjust constitution flow, tweak commit cadence).
4. For each change, verify that:
   a. The manual describes the behaviour clearly.
   b. The orchestrator mode enforces the same behaviour.
   c. No downstream references contradict the update (phases, playbooks, sign-off sections).
5. After editing, re-open both files to confirm mirrored wording, examples, and paths.
6. Document the relationship change in this README if the linkage between the files changes (e.g., new shared asset or workflow).
```

Keep this README up to date whenever the interaction model between the manual and the orchestrator changes.
## Project stance: LLM-first SDD

This project defines an LLM-first, Spec-Driven Development (SDD) workflow. Humans are optional reviewers; the system is designed so LLM agents can execute the entire lifecycle with auditable artifacts and evidence.

Key tenets
- Orchestrator is flow coordinator, not a decision-maker
  - Zero tool privileges. It never calls tools directly.
  - Guides phases and opens `new_task` briefs; decisions must be recorded in artifacts with sign-offs.
- Code Mode agents execute all tool work
  - Create/update files, write tests, run TDD (Red → Green → Refactor), capture evidence in `artifacts/`, and update `review-log.md`.
- Evidence-first, citation-only retrospective
  - `governance/retrospective.md` is consulted as evidence, not authority.
  - Do not copy content into the workspace; add a citations block (path + line ranges + one-line justification) only when relevant. If none relevant, record “No relevant retrospective items”.
- Constitution as the guardrail
  - HALT Phase 0 if `governance/constitution.md` is missing or outdated. Record the version tag and keep it referenced throughout phases.
- Tracks and gates
  - Default to Full SDD; Rapid allowed only under documented low-risk conditions with N/A entries justified.
  - Merge gates require zero open tasks, evidence recorded, tests passing, no critical analysis findings, and high coverage on touched code.
- Machine-checkable artifacts
  - All artifacts include required front-matter (workspace_id, phase, track, constitution_version, manual_version, actor, iso_timestamp) and standardized headings/tables for deterministic validation.

LLM-first quickstart (operational)
1) Phase 0 (Intake & Kickoff)
   - Open new_task: Workspace bootstrap (create `initiatives/<YYYYMMDD-HHMM>-<type>-<name>/` and skeleton files).
   - Open new_task: Constitution read/validate (extract version; HALT if missing/outdated and update with version bump + changelog).
   - Open new_task: Retrospective triage & cite (non-copying; add citations or record “No relevant items”).
   - Select track (Full/Rapid) with rationale and log initial `review-log.md`.
2) Phase 1–3 (Specify → Clarify → Plan)
   - Open separate new_task per phase deliverable; decisions live in `spec.md`, `clarifications.md`, `plan.md` with sign-offs and constitution mappings.
3) Phase 4–6 (Tasks → Implement & Validate)
   - Use checklist in `tasks.md`. Implementer runs strict TDD slices; after each slice update tasks evidence and `implementation.md` journal.
4) Phase 7 (Release & Archive)
   - Obtain approval; prepare PR with evidence; merge after gates pass; archive workspace record.
5) Phase 8 (Retrospective / Policy-triggered)
   - Run when triggered (e.g., hotfix P0–P2, high/critical bugfix, repeated failures, schedule slip, coverage exceptions) and update `governance/retrospective.md`.

Editing checklist — LLM-first invariants
- Orchestrator has zero tool privileges; all imperative steps are delegated via `new_task`.
- Orchestrator does not embed decisions in orchestration logs; decisions are only in artifacts with sign-offs.
- Retrospective use is citation-only; never duplicate content into the workspace.
- Constitution HALT behavior is preserved and version pin recorded.
- Rapid track requires explicit low-risk justification and N/A with rationale.
- Front-matter is mandatory across artifacts; headings/tables remain standardized.
- Branch/workspace naming stays `<YYYYMMDD-HHMM>-<type>-<name>` and is consistent across docs and mode.
- Phase 7 label is “Release & Archive” in docs and mode.

References (single source of truth)
- Manual: [`development.md`](development.md)
- Mode: [`custom_mode.yaml`](custom_mode.yaml)

This README exists to orient future LLM-first SDD sessions: start by re-reading both assets, confirm the invariants above, then proceed to open the first Phase 0 new_task.
## Artifact roles and consistency contract

This repository defines a single SDD workflow with clear separation of concerns across three documents. These roles are contractual to keep concepts and text fully aligned.

- development.md — Pure workflow manual (human-readable, normative)
  - Source of truth for phases, artifacts, gates, risk/track policy, and evidence rules.
  - Tool-agnostic: does not depend on implementation details or specific agent tooling.
  - Any rule enforced by automation MUST exist here first.

- custom_mode.yaml — LLM-first implementation of the manual
  - Operationalizes development.md for agents:
    - Zero tool privileges for the orchestrator; all tool work occurs in delegated Code Mode tasks.
    - Non-copying retrospective (citation-only).
    - Human Report standard after each subtask for frontline communication.
  - May not introduce constraints that contradict development.md. It can only refine how agents execute the same workflow.

- README.md — Team consensus for future sessions
  - LLM-first stance, quickstart, and editing checklist.
  - Relationship contract: how development.md and custom_mode.yaml must mirror each other.
  - Human-friendly orientation so future edits start with shared expectations.

## Frontline communication standard (Human Report)

The orchestrator is the frontline to humans. After every delegated subtask, include both:
1) Orchestration Log
   - Ran | Type (file/git/test/doc) | Result (OK/BLOCKED)
   - Artifacts touched
   - Status flags (e.g., PHASE=4/7, TASKS_DONE=3/12)
   - Next planned action or blocker remediation

2) Human Report
   - Summary of what changed
   - Why (goals, rationale, ACs impacted)
   - Alternatives considered and trade-offs (pros/cons)
   - Impact (code, docs, tests, users, operations)
   - Risks and mitigations
   - Approvals or decisions needed
   - Evidence links (clickable file paths with line ranges)
   - Next steps and ETA

This standard ensures stakeholders understand changes and reasoning without deep review.

## Consistency invariants

- Single source of truth
  - Workflow rules live in development.md.
  - custom_mode.yaml implements those rules, never invents new policy.
- No duplication
  - Long, detailed policy remains in development.md; custom_mode.yaml references it (e.g., Rapid minimum artifacts).
- Constitution guardrail
  - HALT if governance/constitution.md is missing or outdated; record the version everywhere it’s referenced.
- Retrospective policy
  - Consult as evidence only; citation-only with file path and line ranges. If none relevant, record “No relevant retrospective items”.
- Decisions and approvals
  - All decisions belong in artifacts (spec/clarifications/plan/tasks) with actor and timestamp. Orchestrator logs are operational, not decision records.
- Branch/workspace naming
  - initiatives/&lt;YYYYMMDD-HHMM&gt;-&lt;type&gt;-&lt;name&gt; (same for branch).
- Merge gates
  - Zero open tasks, evidence stored, tests pass, no critical analysis findings, coverage high on touched code, documents match delivered code.

## Editing and change control

1) Edit development.md first (policy/workflow)
   - Add/adjust rules, phases, gates, or playbooks.
   - Keep phrasing tool-agnostic and human-readable.

2) Mirror in custom_mode.yaml (agent execution)
   - Enforce the same rules via delegation briefs and guardrails.
   - Use references to development.md for long tables/details to avoid duplication.

3) Validate alignment
   - Check for contradictions or drift.
   - Update this README when roles or alignment rules change.

LLM-first quickstart (recap)
- Phase 0: Workspace bootstrap → Constitution read/validate (HALT if needed) → Retrospective triage & cite (non-copying) → Select track and log review.
- Phases 1–3: One deliverable per task brief; decisions with sign-offs in artifacts.
- Phases 4–6: TDD slices; update tasks and implementation journal with evidence.
- Phase 7: Approvals, PR, merge after gates; archive record.
- Phase 8: Run when triggered (hotfix, high/critical bugfix, repeated failures, schedule slip, coverage exceptions).