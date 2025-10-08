LLM-first Spec-Driven Development (SDD) — Working Agreement

Scope
- This document summarizes how we work with modes to deliver verified, high-quality outcomes at speed.
- System source of truth for mode rules: modes/development-orchestrator/custom_mode.v2.yaml
- Orchestrator delegates; expert modes execute with fixed customInstructions.

Purpose (What we optimize for)
- Verified outcomes: every deliverable is testable, reviewable, and mapped to ACs.
- Thoughtful design first: decisions, mappings, and contracts precede execution.
- Speed without bureaucracy: minimal required artifacts; optional extras only when they add clear value.
- Single-line orchestration: all re-delegations are orchestrator-mediated; experts focus on their phase.

Core principles
- Single orchestrator: central prioritization and re-delegation; no expert self-delegation.
- Independent modes: each mode operates with its own customInstructions; delegation messages remain thin.
- Tasks freeze with orchestrator-mediated micro-loop: no new T-IDs during implementation; new scope requires a short orchestrator round-trip to sdd-task.
- Evidence-based review: AC alignment, constitution gates, analysis follow-ups, scope adherence.
- Branch policy: orchestrator ensures the correct branch before delegations; experts only report mismatches.
- Rapid vs Full: choose the shortest path that still preserves verifiable quality.
- Minimal narrative: concise bullets, measurable statements, links to evidence.

Tracks
- Full: use all relevant phases; deep design and cross-checking for higher risk/complexity.
- Rapid (minimal path): spec.md → tasks.md → review.md → (release.md when merging/deploying)
  - Add clarify/design/analysis/implementation only if they materially improve clarity or reduce risk.

Phases and artifacts (required vs conditional)
- Phase 1: Specify → spec.md (required)
  - Objectives, measurable ACs, Constraints, Glossary, Risks/Deferred.
- Phase 2: Clarify → clarify.md (conditional)
  - Only when ambiguities exist; record Q/A refinements without editing spec.md.
- Phase 3: Plan → design.md (required in Full; conditional in Rapid)
  - Default: single file design.md with decisions and mappings (see “Design minimums” below).
  - Optional split only if helpful: design/ (data-model.md, api-contracts.md), with design.md as index.
- Phase 4: Task → tasks.md (required)
  - Granular tasks (T001+), deps, AC links, checkboxes; AC Coverage table; TDD pairing.
- Phase 5: Analyze → analysis.md (conditional)
  - Lightweight cross-check; include Contract Readiness when design.md exists.
- Phase 6: Implement → implementation.md (conditional)
  - Traceability for long-running or audited efforts; otherwise rely on tasks.md + commits + test outputs.
- Phase 7: Review → review.md (required)
  - Completeness → Verification → User decision; include evidence links and status.
- Phase 8: Release → release.md (conditional when merging/deploying)
  - Gates, Git (merge/tag), Deployment context, Rollback, Evidence.

Branch policy (lean)
- Orchestrator ensures git_branch exists and is active (typically during Specify).
- Experts assume branch is correct; do not switch/create; only report mismatch if detected.

Task discipline and micro-loop (orchestrator-mediated)
- Freeze: tasks.md becomes authoritative at the end of Phase 4; no new T-IDs during implementation.
- New scope during implementation:
  - Expert ends session: Status = “Blocked - Needs Task Update”.
  - Orchestrator re-delegates to sdd-task to update tasks.md + AC coverage.
  - Implementation resumes only after tasks.md is updated.
- Allowed sub-steps: split work inside an existing T-ID as sub-steps (no new IDs); record in Change Log.

“Blocked - Needs Task Update” (minimal payload for orchestrator)
- Problem: <summary of discovery>
- Impacted ACs: <AC IDs>
- Proposed Tasks: <T-title candidates, one line each>
- Evidence: <paths to logs/screenshots/commits>
- Estimation: <rough effort/iteration impact>

Design minimums (decisions and mappings; no narrative)
- Architecture + AC Mapping: authoritative mapping of AC → components → flows.
- Tech Stack choices: rationale + constitution alignment.
- Data Model: entities, fields, relationships, invariants.
- API Contracts: endpoints/interfaces, request/response schemas, error classes, pagination/filtering rules.
- Optional implementation snippets: minimal skeletons to clarify patterns (function signatures/module boundaries only).
- High-leverage lightweight adds (1–3 bullets each, only if helpful):
  - Decision Log: <ISO> — <decision> — <rationale> — <alternatives>
  - Open Questions: <question> — <owner> — <due/next step>
  - Instrumentation Plan: metrics for key ACs (e.g., p95 latency/error rate) and where/how to collect.

Review checklist (bullets + evidence)
- Completeness: X/N tasks done; list incompletes/blockers (or “None”).
- AC alignment: per-AC verdict with evidence (tests, screenshots, logs).
- Tests and gates: pass rate, coverage, lint/types; constitution gates aligned.
- Analysis follow-ups: all findings addressed.
- Scope adherence: every change maps to T-IDs; if mismatch → orchestrator re-delegation to sdd-task.

Status vocabulary (consistent)
- Ready - <phase/action> (e.g., “Ready - Implement”, “Ready - Release”)
- Partial - <reason> (e.g., “Partial - Medium risks”)
- Blocked - <reason> (e.g., “Blocked - Needs Task Update”, “Blocked - Missing Inputs: spec.md”)

Delegation message (thin template; mode rules come from customInstructions)
- Workspace ID: <workspace_id>
- Git Branch: <git_branch>
- Track: full|rapid
- Inputs: <file: brief desc>
- Outputs: <file: requirements>
- Criteria: <measurable items>
- Context: <prior events/notes>

When to use optional artifacts (guidance)
- clarify.md: only when ambiguities exist or the risk of misinterpretation is meaningful.
- design.md split (design/…): only when any section is large enough to slow down editing/review.
- analysis.md: when risk/complexity is nontrivial or multiple contributors need a shared cross-check.
- implementation.md: when traceability/audit or long-running implementation sessions are expected.

Why modes have customInstructions
- Fixed behavior at the mode level (the “contract”) keeps orchestration messages thin and consistent.
- Changes to how we work are centralized and immediately effective the next time a mode is used.
- Each expert mode reads only its own contract; contexts remain independent by design.

Change control
- Update modes/development-orchestrator/custom_mode.v2.yaml to evolve contracts and defaults.
- Keep this README aligned; treat design minimums and reporting payloads as team-wide conventions.

Quick links (artifacts mapping)
- Specify → spec.md
- Clarify → clarify.md (conditional)
- Plan → design.md (default) or design/ split (optional)
- Task → tasks.md
- Analyze → analysis.md (conditional)
- Implement → implementation.md (conditional)
- Review → review.md
- Release → release.md (conditional)