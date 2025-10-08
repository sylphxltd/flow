LLM-first Spec-Driven Development (SDD) — Mode Contracts, Narrative-Friendly

Why this doc (LLM-first, no CI/no humans)
- Purpose: Summarize how modes collaborate to deliver high-quality results fast using LLMs only.
- No CI/no humans: Remove “ceremony” (manual sign-offs, repeated branch checks). The workflow must self-verify through artifacts and evidence.
- Orchestrator needs detail: Delegated modes must report enough narrative + evidence so orchestrator can decide the next step without extra prompts.

Authoritative source
- Contracts live in: modes/development-orchestrator/custom_mode.v2.yaml
  - Orchestrator role contract: [roleDefinition](modes/development-orchestrator/custom_mode.v2.yaml:15)
  - Orchestrator Mode Contract: [Mode Contract](modes/development-orchestrator/custom_mode.v2.yaml:29)
  - Implement micro-loop payload: [Implement Step 2 payload fields](modes/development-orchestrator/custom_mode.v2.yaml:752)
  - Branch policy (assume active): [Branch Policy](modes/development-orchestrator/custom_mode.v2.yaml:48)
  - Soft cap loops: [Feedback & Loops](modes/development-orchestrator/custom_mode.v2.yaml:80)

Operating invariants
- Orchestrator-mediated only
  - Experts never call new_task directly. Experts end sessions via attempt_completion with Status+Next; orchestrator performs all re-delegations. See [Expert Usage Guidelines](modes/development-orchestrator/custom_mode.v2.yaml:64)
- Frozen tasks + micro-loop
  - After Phase 4, tasks.md is frozen (no new T-IDs during implementation).
  - New scope during implementation → end session with Status: Blocked - Needs Task Update and include the payload (below). Orchestrator re-delegates to sdd-task. See [Task Freezing Rules](modes/development-orchestrator/custom_mode.v2.yaml:589)
- Branch policy (lean)
  - Orchestrator ensures git_branch is active (usually during Specify). Experts assume active; only report mismatch. See [Branch Policy](modes/development-orchestrator/custom_mode.v2.yaml:48)
- Loops policy
  - Soft cap ~2 loops per phase; orchestrator adjusts based on value/risk. See [Soft cap](modes/development-orchestrator/custom_mode.v2.yaml:80)

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
  - Reference: [Implement micro-loop](modes/development-orchestrator/custom_mode.v2.yaml:752)

Done-When (per Mode)
- sdd-constitution
  - governance/constitution.md exists with version, principles, gates, updates
  - Status = “Ready - Constitution prepared”
  - Reference: [Constitution Done-When](modes/development-orchestrator/custom_mode.v2.yaml:147)
- sdd-specify
  - <workspace_id>/spec.md exists with: Objectives ≥ 1; measurable ACs (AC1+); Constraints (with constitution refs if applicable)
  - Status = “Ready - Initial spec” or “Partial - High ambiguities”
  - Reference: [Specify Done-When](modes/development-orchestrator/custom_mode.v2.yaml:221)
- sdd-clarify
  - <workspace_id>/clarify.md exists with Q→A; updates applied (Objectives/ACs/Constraints/Glossary/Edge Cases/Risks); no unresolved critical ambiguity
  - Status = “Ready - Clarifications resolved”
  - Reference: [Clarify Done-When](modes/development-orchestrator/custom_mode.v2.yaml:306)
- sdd-plan
  - <workspace_id>/design.md exists with: Architecture + AC Mapping; Tech Stack + Constitution alignment; Data Model; API Contracts; (optional) minimal snippets
  - Status = “Ready - Design complete” or “Partial - High-risk assumptions”
  - Reference: [Plan Done-When](modes/development-orchestrator/custom_mode.v2.yaml:425)
- sdd-task
  - <workspace_id>/tasks.md exists with T001+ (deps/Type/AC links/checkboxes); AC Coverage table shows full coverage; Freeze active
  - Status = “Ready - Tasks executable” or “Blocked - Incomplete AC coverage”
  - Reference: [Task Done-When](modes/development-orchestrator/custom_mode.v2.yaml:576)
- sdd-analyze
  - <workspace_id>/analysis.md exists; no Critical/High; Contract Readiness passed (if design.md exists)
  - Status = “Ready - Implement” or “Blocked - High gaps”
  - Reference: [Analyze Done-When](modes/development-orchestrator/custom_mode.v2.yaml:663)
- sdd-implement
  - All relevant T-IDs [x] and verified (tests/gates), or
  - Status = “Partial - technical blockers” with resumption plan, or
  - Status = “Blocked - upstream issue” with suggested loop
  - Reference: [Implement Done-When](modes/development-orchestrator/custom_mode.v2.yaml:770)
- sdd-review
  - <workspace_id>/review.md exists; Completeness assessed; AC verification with evidence; User decision (if solicited); Scope adherence OK (or micro-loop requested)
  - Status = Approved/Blocked (per template)
  - Reference: [Review Done-When](modes/development-orchestrator/custom_mode.v2.yaml:872)
- sdd-release
  - <workspace_id>/release.md exists; Gates/Git/Deploy/Rollback/Evidence recorded
  - Status = “Ready - Released successfully” or “Blocked - <reason>”
  - Reference: [Release Done-When](modes/development-orchestrator/custom_mode.v2.yaml:999)

Quick, thin templates (copy-paste)

Orchestrator → Delegation message (thin)
Workspace ID: <workspace_id>
Track: full|rapid
Git Branch: <git_branch> (assumed active)
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
- See contract: [modes/development-orchestrator/custom_mode.v2.yaml](modes/development-orchestrator/custom_mode.v2.yaml:29) and expert rules in [Expert Usage Guidelines](modes/development-orchestrator/custom_mode.v2.yaml:64).

Why Frozen tasks + micro-loop (during Implement)
- Prevent silent scope creep during implementation.
- Still fast: short micro-loop (expert ends session with payload; orchestrator re-delegates sdd-task quickly).
- Payload fields (must include): Problem / Impacted ACs / Proposed Tasks / Evidence / Estimation
  - See: [Implement micro-loop payload](modes/development-orchestrator/custom_mode.v2.yaml:752).

Why “assume active” Branch Policy
- Orchestrator ensures the branch upfront (usually in Specify).
- Experts assume correct branch and avoid repeated git checks; only report mismatch.
- See: [Branch Policy](modes/development-orchestrator/custom_mode.v2.yaml:48) and Delegation template’s “assumed active” note: [template](modes/development-orchestrator/custom_mode.v2.yaml:89).

Why soft cap loops (≈2)
- Hard caps can punish valuable extra iterations; soft cap keeps speed without sacrificing outcome.
- Orchestrator retains judgment. See: [Soft cap setting](modes/development-orchestrator/custom_mode.v2.yaml:80).

Evidence-first verification without CI
- Review focuses on AC alignment, tests/gates status, analysis follow-ups, scope adherence.
- Evidence = links to artifacts/logs/tests/snapshots. Not walls of prose.
- See: Review sections around verification: [Review Verification](modes/development-orchestrator/custom_mode.v2.yaml:895).

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
- Pointers: Constitution [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:147), Specify [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:221), Clarify [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:306), Plan [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:425), Task [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:576), Analyze [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:663), Implement [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:770), Review [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:872), Release [Done-When](modes/development-orchestrator/custom_mode.v2.yaml:999).

Extending the system
- Add a new mode with a crisp Mode Contract (Responsibilities/Required Inputs/Outputs/Done-When/Status+Next).
- Prefer decisions & mappings over prose (e.g., AC mapping tables, minimal contracts/specs).
- Keep narratives focused; always end with anchors for orchestrator actioning.

Change policy
- YAML stays minimal/operational. This README holds rationale/philosophy.
- If we need deep examples or case studies, add separate docs (e.g., docs/cases/...) and link from here.