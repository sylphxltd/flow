LLM-first Spec-Driven Development (SDD) — Mode Contracts, Narrative-Friendly

Why this doc (LLM-first, no CI/no humans)
- Purpose: Summarize how modes collaborate to deliver high-quality results fast using LLMs only.
- No CI/no humans: Remove “ceremony” (manual sign-offs, repeated branch checks). The workflow must self-verify through artifacts and evidence.
- Orchestrator needs detail: Delegated modes must report enough narrative + evidence so orchestrator can decide the next step without extra prompts.

Authoritative source
- Contracts live in: modes/development-orchestrator/custom_mode.v2.yaml
  - Orchestrator role contract: [roleDefinition](modes/development-orchestrator/custom_mode.v2.yaml)
  - Orchestrator Mode Contract: [Mode Contract](modes/development-orchestrator/custom_mode.v2.yaml)
  - Implement micro-loop payload: [Implement Step 2 payload fields](modes/development-orchestrator/custom_mode.v2.yaml)
  - Branch policy (assume active): [Branch Policy](modes/development-orchestrator/custom_mode.v2.yaml)
  - Soft cap loops: [Feedback & Loops](modes/development-orchestrator/custom_mode.v2.yaml)
  - Constitution auto-capture triggers: [Constitution Handling and Project-Wide Policy Auto-Capture](modes/development-orchestrator/custom_mode.v2.yaml)

Operating invariants
- Orchestrator-mediated only
  - Experts never call new_task directly. Experts end sessions via attempt_completion with Status+Next; orchestrator performs all re-delegations. See [Expert Usage Guidelines](modes/development-orchestrator/custom_mode.v2.yaml)
- Frozen tasks + micro-loop
  - After Phase 4, tasks.md is frozen (no new T-IDs during implementation).
  - New scope during implementation → end session with Status: Blocked - Needs Task Update and include the payload (below). Orchestrator re-delegates to sdd-task. See [Task Freezing Rules](modes/development-orchestrator/custom_mode.v2.yaml)
- Branch policy (lean)
  - Orchestrator ensures git_branch is active (usually during Specify). Experts assume active; only report mismatch. See [Branch Policy](modes/development-orchestrator/custom_mode.v2.yaml)
- Spec workspace vs code paths
  - Spec Workspace lives under specs/ and is docs-only (spec/clarify/plan/tasks/analysis/review/release); never write code under specs/.
  - Code edits must occur at repository root paths (./, ./src, ./apps, ./packages).
- Proactive constitution auto-capture
  - Orchestrator delegates to sdd-constitution when project-wide policies are mentioned or implied (Tech Stack, UI/UX, Tests, Security, Performance, Accessibility, Observability, Release, Definition of Done). See Constitution Handling and Project-Wide Policy Auto-Capture in [custom_mode.v2.yaml](modes/development-orchestrator/custom_mode.v2.yaml).
- Loops policy
  - Soft cap ~2 loops per phase; orchestrator adjusts based on value/risk. See [Soft cap](modes/development-orchestrator/custom_mode.v2.yaml)
- Tests policy (TDD baseline)
  - Default: TDD for all tasks (Red-Green-Refactor) as LLM self-verification.
  - Mandatory: Foundational (Phase 2), P1 (Critical), Bugfix, and any change touching API/data/security/critical rules; and whenever the constitution/spec requires tests or TDD.
  - Waiver (Evidence-first): Only for P2+ cosmetic/low-risk UI/content tasks. Provide reproducible demo steps and artifacts/. A minimal regression test must be added (sub-step under the same T-ID) before Review approval.
- TDD ownership split (Plan/Task/Implement)
  - Plan: Define Testing Strategy (policy, test types, frameworks/tools, AC→test mapping, coverage targets).
  - Task: Materialize test-first tasks for Mandatory categories; for Waiver P2+ items add a "minimal regression test" sub-step under the same T-ID before Review.
  - Implement: Execute Red-Green-Refactor per plan; if Waiver used, provide demo artifacts and add the minimal regression test before Review approval.
- Clarify policy (Q&A + apply updates; no duplication)
  - Keep clarify.md as Q&A + audit log; apply accepted clarifications directly to spec.md (single source of truth). Log a concise applied-update entry with pointers to spec sections; do not copy unchanged content.
  - Purpose: keep docs lean, avoid drift, and ensure spec.md always reflects the latest agreed requirements. Enforced in YAML (sdd-clarify) — see [custom_mode.v2.yaml](modes/development-orchestrator/custom_mode.v2.yaml).
- External SDD integration
  - Integrate only documentation/methodology that improves clarity and execution; avoid redundancy and ceremony. Combine strengths rather than copying.
  - Goal: Quality-first with minimal instruction; enable deeper LLM reasoning to deliver complete complex work from simple prompts.

Reporting principle (Narrative + Anchors)
- We keep natural language narrative to maximize LLM understanding.
- We also require a few short “anchors” so the orchestrator can decide deterministically, without CI/humans.
- Do not use a rigid schema. Instead, include these anchors with your narrative:
  - Files: list key created/updated files (paths)
  - Status: Ready | Partial - <reason> | Blocked - <reason>
  - Next: the single next action the orchestrator should take
  - Evidence: links to logs/screenshots/tests/commits (artifacts/..., test outputs, etc.)
- Implement-specific (micro-loop) anchor payload (must include all):
  - Problem: what was discovered (concise)
  - Impacted ACs: AC IDs
  - Proposed Tasks: T-title candidates (1 line each)
  - Evidence: logs/screenshots/commits paths
  - Estimation: rough effort or iteration impact
  - Reference: [Implement micro-loop](modes/development-orchestrator/custom_mode.v2.yaml)

Done-When (per Mode)
- sdd-constitution
  - governance/constitution.md exists with version, principles, gates, project-wide-guidelines (if applicable), updates
  - Status = “Ready - Constitution prepared”
  - Reference: [Constitution Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-specify
  - <spec_workspace>/spec.md exists with: Objectives ≥ 1; measurable ACs (AC1+); Constraints (with constitution refs if applicable)
  - Status = “Ready - Initial spec” or “Partial - High ambiguities”
  - Reference: [Specify Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-clarify
  - <spec_workspace>/clarify.md exists with Q→A; updates applied (Objectives/ACs/Constraints/Glossary/Edge Cases/Risks); no unresolved critical ambiguity
  - Status = “Ready - Clarifications resolved”
  - Reference: [Clarify Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-plan
  - <spec_workspace>/plan.md exists with: Architecture + AC Mapping; Tech Stack + Constitution alignment; Data Model; API Contracts; (optional) minimal snippets
  - Status = “Ready - Design complete” or “Partial - High-risk assumptions”
  - Reference: [Plan Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-task
  - <spec_workspace>/tasks.md exists with T001+ (deps/Type/AC links/checkboxes); AC Coverage table shows full coverage; Freeze active
  - Status = “Ready - Tasks executable” or “Blocked - Incomplete AC coverage”
  - Reference: [Task Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-analyze
  - <spec_workspace>/analysis.md exists; no Critical/High; Contract Readiness passed (if plan.md exists)
  - Status = “Ready - Implement” or “Blocked - High gaps”
  - Reference: [Analyze Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-implement
  - All relevant T-IDs [x] and verified (tests/gates), or
  - Status = “Partial - technical blockers” with resumption plan, or
  - Status = “Blocked - upstream issue” with suggested loop
  - Reference: [Implement Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-review
  - <spec_workspace>/review.md exists; Completeness assessed; AC verification with evidence; User decision (if solicited); Scope adherence OK (or micro-loop requested)
  - Status = Approved/Blocked (per template)
  - Reference: [Review Done-When](modes/development-orchestrator/custom_mode.v2.yaml)
- sdd-release
  - <spec_workspace>/release.md exists; Gates/Git/Deploy/Rollback/Evidence recorded
  - Status = “Ready - Released successfully” or “Blocked - <reason>”
  - Reference: [Release Done-When](modes/development-orchestrator/custom_mode.v2.yaml)

Quick, thin templates (copy-paste)

Orchestrator → Delegation message (thin)
Spec Workspace: <spec_workspace>
Track: full|rapid
Git Branch: <git_branch> (assumed active)
Constitution: governance/constitution.md (vX.Y.Z if exists) - Read and comply
Inputs:
- file: brief description
Outputs:
- file: requirements
Criteria:
- measurable 1
- measurable 2
Context:
- prior events/notes

Expert → attempt_completion (narrative + anchors)
Narrative:
- One or two concise paragraphs explaining what happened, why, and the main decision points discovered.
Anchors:
- Files: <paths>
- Status: Ready | Partial - <reason> | Blocked - <reason>
- Next: <single next action for orchestrator>
- Evidence: <artifacts/logs/screenshots/commits>

Implement-only (Blocked - Needs Task Update) additional anchors
- Problem: <summary>
- Impacted ACs: <AC IDs>
- Proposed Tasks: <T-title candidates; one line each>
- Evidence: <paths>
- Estimation: <rough effort or iteration impact>

Noise we intentionally removed
- Manual sign-offs and repeated branch checks (no CI/no humans model)
- Over-explaining handling sections (replaced with 3 hard rules per mode: Block criteria / Minor fix / Escalation)
- Hard loops limit (soft cap ~2 with orchestrator judgment)

Why this works with LLMs
- Natural language remains the primary medium (models understand context best with narratives).
- Anchors ensure the orchestrator has just enough structure to act deterministically.
- “Done-When” gives an objective completion test per mode—no CI, no humans required.

If you need a two-line TL;DR for orchestrator
- Ask experts to return narrative+anchors; look at Status, Next, and Evidence; compare against the mode’s Done-When; re-delegate accordingly.
- For any new scope during implementation, require the Implement payload and re-delegate to sdd-task immediately.

---
Appendix: Design Rationale (Why these choices)
---

Purpose of this README vs. YAML
- This README captures the rationale and design direction behind our modes.
- The YAML is the executable contract/readable prompt for LLMs.
- We intentionally reduced narrative in YAML; the “why” lives here.

Goals and constraints (LLM-first, no CI/humans)
- LLM-only: No CI, no human sign-offs. Artifacts + evidence must be enough for orchestration.
- Natural language first: LLMs reason best with narrative context; we avoid over-rigid schemas.
- Minimal anchors: We still require a few anchors (Files/Status/Next/Evidence) to keep decisions deterministic.
- Deterministic orchestration: Orchestrator decides only from expert reports; it cannot inspect code or enforce policy.

Why Narrative + Anchors (not rigid schemas)
- Narrative keeps nuance: tradeoffs, rationale, failure context—LLMs use it to plan better next steps.
- Anchors prevent drift: Orchestrator needs just enough structure to decide (move forward, loop, escalate).
- Result: Reports remain human/LLM-friendly while enabling automation-lite decisions.

Why Orchestrator-mediated re-delegation
- Single decision point avoids branching flows and priority conflicts.
- Keeps the timeline linear and auditable: one “brain” decides what happens next.
- See contract: [modes/development-orchestrator/custom_mode.v2.yaml](modes/development-orchestrator/custom_mode.v2.yaml) and expert rules in [Expert Usage Guidelines](modes/development-orchestrator/custom_mode.v2.yaml).

Why Frozen tasks + micro-loop (during Implement)
- Prevent silent scope creep during implementation.
- Still fast: short micro-loop (expert ends session with payload; orchestrator re-delegates sdd-task quickly).
- Payload fields (must include): Problem / Impacted ACs / Proposed Tasks / Evidence / Estimation
  - See: [Implement micro-loop payload](modes/development-orchestrator/custom_mode.v2.yaml).

Why “assume active” Branch Policy
- Orchestrator ensures the branch upfront (usually in Specify).
- Experts assume correct branch and avoid repeated git checks; only report mismatch.
- See: [Branch Policy](modes/development-orchestrator/custom_mode.v2.yaml) and Delegation template’s “assumed active” note: [template](modes/development-orchestrator/custom_mode.v2.yaml).

Why soft cap loops (≈2)
- Hard caps can punish valuable extra iterations; soft cap keeps speed without sacrificing outcome.
- Orchestrator retains judgment. See: [Soft cap setting](modes/development-orchestrator/custom_mode.v2.yaml).

Evidence-first verification without CI
- Review focuses on AC alignment, tests/gates status, analysis follow-ups, scope adherence.
- Evidence = links to artifacts/logs/tests/snapshots. Not walls of prose.
- For Waiver cases (P2+ low-risk), a minimal regression test is required before approval; Review will check Test Presence.
- See: Review sections around verification: [Review Verification](modes/development-orchestrator/custom_mode.v2.yaml).

What we intentionally removed or minimized
- Manual sign-offs and repeated git switching/confirmation—noise for LLM-first, no-CI workflows.
- Overly long “Handling Edge Cases” prose—replaced with 3 rules: Block criteria / Minor fix / Escalation.
- Hard loop limits—replaced with soft cap + orchestrator judgment.

Alternatives considered (and rejected)
- Rigid report schemas only: Faster parsing, but lost context harms LLM planning/next-step quality.
- Expert self-delegation: Increases concurrency but fragments priorities and auditing. Orchestrator retains control.
- Allow new T-IDs during Implement: Feels fast, but creates hidden scope creep and review gaps. We use micro-loop instead.
- Heavy ceremony (sign-offs, checklists): Without CI/humans it turns stale; we prefer minimal anchors + Done-When.

Authoring guidance (practical)
- Reports: Write a short narrative first (what/why/risks), then add anchors:
  - Files: paths changed/created
  - Status: Ready | Partial - <reason> | Blocked - <reason>
  - Next: one explicit action for orchestrator
  - Evidence: logs/screenshots/tests/commits paths
- Implement (Blocked - Needs Task Update) must include: Problem / Impacted ACs / Proposed Tasks / Evidence / Estimation.
- Avoid noise: Do not repeat branch checks; do not add sign-off timestamps; avoid long narrative without anchors.

Done-When = objective completion test (no CI/humans)
- Each mode’s Mode Contract ends with a Done-When. Orchestrator uses it to decide without manual review.
- Pointers: Constitution [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Specify [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Clarify [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Plan [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Task [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Analyze [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Implement [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Review [Done-When](modes/development-orchestrator/custom_mode.v2.yaml), Release [Done-When](modes/development-orchestrator/custom_mode.v2.yaml).

Extending the system
- Add a new mode with a crisp Mode Contract (Responsibilities/Required Inputs/Outputs/Done-When/Status+Next).
- Prefer decisions & mappings over prose (e.g., AC mapping tables, minimal contracts/specs).
- Keep narratives focused; always end with anchors for orchestrator actioning.

Change policy
- YAML stays minimal/operational. This README holds rationale/philosophy.
- If we need deep examples or case studies, add separate docs (e.g., docs/cases/...) and link from here.

Decision Log (Recent)
- 2025-10-08: Unify planning artifact to plan.md (retired design.md).
- 2025-10-08: Establish TDD baseline for all tasks; narrow Waiver for P2+ low-risk UI/content with minimal regression test before approval; Review checks Test Presence.
- 2025-10-08: Clarify TDD ownership split: Plan defines Testing Strategy; Task materializes test-first; Implement executes Red-Green-Refactor.
- 2025-10-08: External SDD integration: adopt documentation/methodology that improves clarity; avoid redundancy and ceremony; combine strengths rather than copying.