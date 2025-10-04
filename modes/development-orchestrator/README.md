# Development Orchestrator Assets

This directory defines a single LLM-first, Spec-Driven Development (SDD) workflow with two canonical artifacts that must stay in sync.

What’s here
- [development.md](modes/development-orchestrator/development.md) — Pure workflow manual (human-readable, tool-agnostic policy).
- [custom_mode.yaml](modes/development-orchestrator/custom_mode.yaml) — LLM-first execution of the manual (delegation, guardrails, reporting).

Roles contract (consistency)
- development.md: source of truth for phases, artifacts, gates, tracks, and evidence rules. Any enforced rule MUST exist here first.
- custom_mode.yaml: operationalizes the manual for LLM agents; it may not contradict or extend policy. Reference the manual for long details (e.g., Rapid minimum artifacts).
- README.md (this file): team consensus, quickstart, and editing protocol.

LLM-first stance (one paragraph)
Orchestrator coordinates flow and opens new_task briefs; it has zero tool privileges and is not a decision-maker. Code Mode subtasks perform all tool actions. Decisions and approvals live only in workspace artifacts with sign-offs.

Invariants (no drift, no duplication)
- Single source of truth: policy in [development.md](modes/development-orchestrator/development.md); [custom_mode.yaml](modes/development-orchestrator/custom_mode.yaml) implements it.
- No duplication: the mode references the manual for detailed tables/policy.
- Constitution HALT: halt Phase 0 if governance/constitution.md is missing/outdated; record the version everywhere referenced.
- Retrospective = evidence-only: citation-only with file path and line ranges; record “No relevant retrospective items” when none.
- Decisions and approvals: captured in spec/clarifications/plan/tasks with actor + timestamp, not in orchestration logs.
- Naming: initiatives/<YYYYMMDD-HHMM>-<type>-<name> (same for branch).
- Merge gates: zero open tasks, evidence stored, tests passing, no critical analysis findings, high coverage on touched code, docs match delivered code (see manual).
- Artifact front-matter: workspace_id, phase, track, constitution_version, manual_version, actor, iso_timestamp.

Frontline Human Report (after every subtask)
- Summary of what changed
- Why (goals, rationale, ACs impacted)
- Alternatives and trade-offs (pros/cons)
- Impact (code, docs, tests, users, ops)
- Risks and mitigations
- Approvals/decisions needed
- Evidence links (clickable file paths + line ranges)
- Next steps and ETA

LLM-first quickstart
1) Phase 0: Workspace bootstrap → Constitution read/validate (HALT if needed) → Retrospective triage & cite (non-copying) → Select track and log review.
2) Phases 1–3: One deliverable per subtask; decisions recorded with sign-offs in artifacts.
3) Phases 4–6: TDD slices; after each slice update tasks.md and implementation.md with evidence.
4) Phase 7: Approvals, PR, merge after gates; archive workspace record.
5) Phase 8: Run when triggered (hotfix P0–P2, high/critical bugfix, repeated failures, schedule slip, coverage exceptions).

Edit flow
1) Update [development.md](modes/development-orchestrator/development.md) (policy).
2) Mirror in [custom_mode.yaml](modes/development-orchestrator/custom_mode.yaml) (agent execution).
3) Validate alignment; adjust this README only for stance/quickstart/protocol wording.

Start-here checklist
- Re-read [development.md](modes/development-orchestrator/development.md) and [custom_mode.yaml](modes/development-orchestrator/custom_mode.yaml).
- Confirm invariants above.
- Open the first Phase 0 new_task.
## Runtime visibility and alignment

Modes cannot read local repository documents at runtime (including development.md). To ensure consistent execution without external reads:

- Embedded policy snapshot
  - Each mode file (custom_mode.yaml, custom_mode.beta.yaml) embeds the core policy snapshot necessary for execution (front-matter, standard artifacts, constitution governance, TDD, Rapid minimum artifacts, Git discipline, merge gates, evidence).
  - Orchestrator and Beta modes must not assume runtime access to development.md.

- Manual remains the human-maintained policy source
  - development.md is the human-readable, tool-agnostic policy. Maintainers edit the manual first, then mirror updates into the mode files’ embedded snapshots.
  - Treat any references to development.md in mode files as maintainer guidance only (not runtime reads).

- Alignment protocol
  1) Update development.md (policy/workflow).
  2) Mirror the same changes into custom_mode.yaml and custom_mode.beta.yaml (embedded policy snapshot).
  3) Validate with a quick pass: artifacts present, gates listed, phase sign-offs, and Rapid constraints match.

This section clarifies that the runtime authority for agents lies in the mode files’ embedded policy, while development.md remains the source of truth for maintainers editing the process.