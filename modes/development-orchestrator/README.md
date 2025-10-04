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
- No auto-fallbacks: ambiguous or under-specified briefs MUST return attempt_completion with STATUS=Blocked, REASON=MissingBriefFields, and a MISSING list; the orchestrator will re-brief. Modes make no repository changes under ambiguity.
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
## Model routing policy (runtime guidance)

- Modes cannot infer MODEL_TIER. The orchestrator must set MODEL_TIER explicitly in every `new_task` brief.
- No auto-fallbacks. If a brief is ambiguous or a requested tier/model is unavailable, the delegated mode must return:
  - STATUS=Blocked with REASON=MissingBriefFields (when required brief fields are missing) or
  - STATUS=Blocked with REASON=ModeUnavailable (when the specified tier/model is not available)
  - Make no repository changes under ambiguity.

Default routing (balanced, recommended)
- development-orchestrator-beta → cheap_fast
- sdd-kickoff-beta → cheap_fast
  - Escalate to thinking_slow only when authoring/updating governance/constitution.md or resolving policy conflicts.
- sdd-spec-architect-beta → thinking_slow
- sdd-analyst-auditor-beta → thinking_slow
- sdd-implementer-beta → code_fast
  - Escalate to thinking_slow for high-risk refactors, cross-cutting changes, or policy-heavy constraints.
- sdd-release-manager-beta → cheap_fast
- sdd-retro-curator-beta → cheap_fast

Alternative profiles
- Quality-first
  - kickoff → thinking_slow when constitution/policy interpretation involved; otherwise cheap_fast
  - spec/architect (1–3), analyst (5) → thinking_slow
  - implementer (4/6) → code_fast; route to thinking_slow on complex refactors, critical paths, or repeated low-signal test failures (&gt;1x)
  - release/retro/orchestrator → cheap_fast
- Cost-optimized (safe)
  - kickoff, release, retro, orchestrator → cheap_fast
  - spec/architect (1–3), analyst (5) → thinking_slow only when TRACK=full or RISK ≥ Medium; otherwise allow cheap_fast for very small Rapid changes with simple ACs
  - implementer (4/6) → code_fast
  - Guardrails: If ACs &gt; 5, core data models touched, or external integrations affected → route to thinking_slow

Routing heuristics for the orchestrator
- Track: TRACK=full → thinking_slow for Phases 1–3 and 5. TRACK=rapid + Low risk → allow cheap_fast for Phase 1/2 only when no architectural impact.
- Risk: Critical/High severity or security/privacy implications → thinking_slow (Phases 1–3, 5).
- Scope: Large refactors or cross-cutting changes → thinking_slow for planning/analysis; code_fast for TDD implementation.
- Context size: Very long inputs (large specs/plans) → choose a long-context thinking_slow model for Phases 1–3/5.
- Deadline: Urgent but low-risk chores (retro/release/kickoff triage) → cheap_fast.

Operational guardrails (consistent with invariants)
- Orchestrator sets MODEL_TIER explicitly; modes must not override it.
- Ambiguous briefs → STATUS=Blocked, REASON=MissingBriefFields, include MISSING list; no changes made.
- Unavailable tier/model → STATUS=Blocked, REASON=ModeUnavailable; no implicit rerouting.
- HALT on constitution missing/outdated → STATUS=Blocked, REASON=HALT; orchestrator opens a constitution task.

Provider-neutral configuration
- Keep this repository vendor-agnostic. Map thinking_slow / code_fast / cheap_fast to actual providers in your runtime configuration (outside this repo).
- See also “Model selection policy (guidance)” embedded in custom_mode.beta.yaml for at-runtime reference by modes.
