# Development Orchestrator Assets

This directory defines LLM-first, Spec-Driven Development (SDD) workflows with canonical artifacts that must stay in sync.

## What's here

- [`development.md`](development.md) — Pure workflow manual (human-readable, tool-agnostic policy)
- [`custom_mode.yaml`](custom_mode.yaml) — Single-mode implementation (orchestrator + code mode)
- [`custom_mode.beta.yaml`](custom_mode.beta.yaml) — Multi-mode implementation (orchestrator + specialized modes)
- [`README.md`](README.md) (this file) — Team consensus, architecture overview, and editing protocol

## Architecture Variants

### Single-Mode (custom_mode.yaml)
- **Orchestrator** coordinates flow via `new_task`
- **Code Mode** performs all tool actions
- Simple delegation model: orchestrator → code → orchestrator

### Multi-Mode (custom_mode.beta.yaml)
- **Orchestrator** coordinates flow and handles user communication
- **One independent mode per phase** (6 modes total, aligned with traditional SDD):
  - `sdd-kickoff` — Phase 0 (Kickoff - LLM-first adaptation)
  - `sdd-specify` — Phase 1 (Specify + internal clarify iterations)
  - `sdd-plan` — Phase 2 (Plan + task breakdown)
  - `sdd-implement` — Phase 3 (Implement + continuous analysis)
  - `sdd-release` — Phase 4 (Release & Archive)
  - `sdd-retrospective` — Phase 5 (Retrospective - optional)
- User can configure different LLM for each mode
- Aligned with traditional SDD core phases while adapted for LLM-first execution

## Roles Contract (Consistency)

- **development.md**: Source of truth for phases, artifacts, gates, tracks, evidence rules. Any enforced rule MUST exist here first.
- **custom_mode.yaml**: Single-mode operationalization for LLM agents.
- **custom_mode.beta.yaml**: Multi-mode operationalization with embedded policy snapshots per mode.
- **README.md** (this file): Team consensus, architecture overview, quickstart, and editing protocol.

## LLM-First Stance

**Single-Mode**: Orchestrator coordinates flow and opens new_task briefs; it has zero tool privileges and is not a decision-maker. Code Mode subtasks perform all tool actions. Decisions and approvals live only in workspace artifacts with sign-offs.

**Multi-Mode**: Orchestrator is the human communication window and flow coordinator; it uses only MCP tools for external knowledge. Each specialized mode has appropriate tool permissions for its phase. Modes are completely isolated; communication happens only through `attempt_completion`. The workflow is single-threaded: orchestrator → new_task → delegated mode → attempt_completion → orchestrator.

## Invariants (No Drift, No Duplication)

These rules apply to **both** single-mode and multi-mode implementations:

- **Single source of truth**: Policy in [`development.md`](development.md); mode files implement it
- **No duplication**: Mode files embed necessary policy snapshots; avoid verbatim copying
- **Constitution handling**: Phase 0 handles `governance/constitution.md` as part of normal startup; record version everywhere
- **No auto-fallbacks**: Ambiguous briefs MUST return `attempt_completion` with `STATUS=Blocked, REASON=MissingBriefFields, MISSING=[list]`. Orchestrator re-briefs. No repository changes under ambiguity.
- **Retrospective = evidence-only**: Citation-only with file path and line ranges; record "No relevant retrospective items" when none
- **Decisions and approvals**: Captured in spec/clarifications/plan/tasks with actor + timestamp, not in orchestration logs
- **Naming**: `initiatives/<YYYYMMDD-HHMM>-<type>-<name>` (same for branch)
- **Merge gates**: Zero open tasks, evidence stored, tests passing, no critical findings, ≥95% coverage on touched code, docs match code
- **Artifact front-matter**: workspace_id, phase, track, constitution_version, manual_version, actor, iso_timestamp

Frontline Human Report (after every subtask)
- Summary of what changed
- Why (goals, rationale, ACs impacted)
- Alternatives and trade-offs (pros/cons)
- Impact (code, docs, tests, users, ops)
- Risks and mitigations
- Approvals/decisions needed
- Evidence links (clickable file paths + line ranges)
- Next steps and ETA

LLM-first quickstart (6 phases)
1) Phase 0 (Kickoff): Constitution handling, workspace setup, track selection
2) Phase 1 (Specify): Spec writing with internal clarify iterations until clear
3) Phase 2 (Plan): Architecture design + task breakdown in one phase
4) Phase 3 (Implement): TDD execution + continuous analysis validation
5) Phase 4 (Release): User approval (via orchestrator), merge gates, PR, merge, archive
6) Phase 5 (Retrospective): Optional, triggered by policy (hotfix P0-P2, critical issues, repeated failures)

## Edit Flow

1. Update [`development.md`](development.md) (policy source of truth)
2. Mirror changes in mode files:
   - [`custom_mode.yaml`](custom_mode.yaml) (single-mode)
   - [`custom_mode.beta.yaml`](custom_mode.beta.yaml) (multi-mode)
3. Validate alignment across all files
4. Update README only for architecture/stance/quickstart/protocol wording

## Start-Here Checklist

**For Single-Mode**:
1. Re-read [`development.md`](development.md) and [`custom_mode.yaml`](custom_mode.yaml)
2. Confirm invariants above
3. Activate `development-orchestrator` mode
4. Open first Phase 0 new_task to Code Mode

**For Multi-Mode**:
1. Re-read [`development.md`](development.md) and [`custom_mode.beta.yaml`](custom_mode.beta.yaml)
2. Confirm invariants above
3. Activate `development-orchestrator` mode
4. Configure LLM for each mode in runtime environment
5. Open first Phase 0 new_task to `sdd-kickoff`
## Runtime Visibility and Alignment

**Critical Constraint**: Modes cannot read local repository documents at runtime (including `development.md`).

### Embedded Policy Snapshots

- Each mode file embeds the core policy snapshot necessary for execution:
  - Front-matter requirements
  - Standard artifacts structure
  - Constitution governance
  - TDD guarantee
  - Rapid minimum artifacts
  - Git discipline
  - Merge gates
  - Evidence management

- Modes must **not** assume runtime access to `development.md`

### Human-Maintained Policy Source

- [`development.md`](development.md) is the human-readable, tool-agnostic policy
- Maintainers edit the manual first, then mirror updates into mode files
- Any references to `development.md` in mode files are maintainer guidance only (not runtime reads)

### Alignment Protocol

1. Update [`development.md`](development.md) (policy/workflow)
2. Mirror changes into mode files' embedded snapshots:
   - [`custom_mode.yaml`](custom_mode.yaml) (single-mode)
   - [`custom_mode.beta.yaml`](custom_mode.beta.yaml) (multi-mode specialized instructions)
3. Validate alignment:
   - Artifacts present ✓
   - Gates listed ✓
   - Phase sign-offs ✓
   - Rapid constraints match ✓

**Authority**: Runtime authority for agents lies in mode files' embedded policy. `development.md` remains source of truth for maintainers.
## Model Configuration (Multi-Mode Only)

**Applies to**: [`custom_mode.beta.yaml`](custom_mode.beta.yaml) only

### Mode Specialization

Each mode is designed for a specific phase aligned with traditional SDD:

| Mode | Phase | Typical Workload | SDD Alignment |
|------|-------|------------------|---------------|
| `development-orchestrator` | Coordination | Flow control (MCP only) | Orchestration layer |
| `sdd-kickoff` | 0 | Constitution, setup | LLM-first adaptation |
| `sdd-specify` | 1 | Spec + clarify iterations | Core SDD: Specification phase |
| `sdd-plan` | 2 | Architecture + tasks | Core SDD: Planning phase |
| `sdd-implement` | 3 | TDD + continuous analysis | Core SDD: Implementation + validation |
| `sdd-release` | 4 | Release management | Core SDD: Delivery phase |
| `sdd-retrospective` | 5 | Knowledge accumulation | Continuous improvement |

### User Configuration

Users configure which LLM to use for each mode in their runtime environment (outside this repository).

**Example configurations**:

- **Balanced**: Mid-tier for spec/plan (1-2), fast for implementation (3), budget for coordination/admin
- **Quality-First**: Premium for spec/plan (1-2), fast for implementation (3)
- **Cost-Optimized**: Budget models where possible, premium only for critical phases (1-2)

### Operational Rules

- If a mode receives ambiguous instructions → `STATUS=Blocked, REASON=MissingBriefFields`
- Constitution missing/outdated → `STATUS=Blocked, REASON=HALT`
- Policy violations → `STATUS=Blocked, REASON=PolicyViolation`

### Provider-Neutral Design

- This repo is vendor-agnostic
- Model selection happens in runtime configuration (outside this repo)
- See embedded policy in [`custom_mode.beta.yaml`](custom_mode.beta.yaml) for mode requirements

## Global Orchestrator Contract (phase machine)

Why this exists
- When each mode runs with isolated instructions, the orchestrator is the single source of runtime coordination. This section guarantees the orchestrator always knows what it is doing and how SDD proceeds, regardless of mode isolation.

Single runtime truth
- Modes cannot read local policy at runtime. The orchestrator relies on the embedded policy snapshots in the mode files (not on reading development.md at runtime).
- Phase progression and gating are validated through the workspace ledger in `review-log.md` and the required evidence in `artifacts/`.

Phase machine (allowed transitions)
- Linear forward transitions: `0 → 1 → 2 → 3 → 4` (Phase 5 optional; triggered by policy).
- Controlled back-edges (only via explicit Blocked reasons):
  - `3 → 1` when `REASON=PolicyViolation` or missing clarifications (back to spec).
  - `3 → 2` when analysis finds plan gaps (back to plan).
  - `2 → 1` when planning discovers spec ambiguities.
- Disallowed: skipping forward or executing phases out of order.
  - Out-of-order attempts must return `STATUS=Blocked` with `REASON=OutOfOrder`.

Next-phase computation algorithm (orchestrator)
1) Read the last completed phase from `review-log.md` (most recent row with `status=Completed`).
2) Compute the next allowed phase using the phase machine and `TRACK` (`full|rapid`).
3) If the delegated mode returns `STATUS=Blocked`:
   - `REASON=MissingBriefFields` → re-brief with the required fields.
   - `REASON=HALT` → critical issue needs resolution before continuing.
   - `REASON=PolicyViolation` → branch back to the indicated phase (2 or 3).
4) Advance only when `status=Completed` and the phase's evidence gates are satisfied.

Delegation brief completeness (required)
- `PHASE` (0..5)
- `GOAL` (1–2 lines), `INPUTS` (file paths/snippets), `OUTPUTS` (files/sections), `VALIDATION` (exit criteria + `artifacts/` destinations)
- `TRACK` (full|rapid), `WORKSPACE` (initiatives path), `CONTEXT` (progress and decisions)
- Ambiguity returns `STATUS=Blocked` with `REASON=MissingBriefFields`; no repository changes must be made under ambiguity.

Shared status flags (must be present in every `attempt_completion`)
- `PHASE`, `MODE`, `STATUS` (Completed|Blocked|Deferred), `REASON` (MissingBriefFields|HALT|PolicyViolation|OutOfOrder - when blocked), `TASKS_DONE/TOTAL` (when applicable), `EVIDENCE`, `RISKS`, `MISSING` (when blocked for brief issues).

Phase gates (evidence required to mark Completed)
- Phase 0 — Kickoff: Constitution version recorded; track selected; skeleton created; initial `review-log.md` row written.
- Phase 1 — Specify: `spec.md` complete and clear; `clarifications.md` all resolved; sign-off present; constitution clauses referenced.
- Phase 2 — Plan: architecture + data flows + tasks.md checklist; AC→validation map; risk/rollback; constitution mapping; sign-off present.
- Phase 3 — Implement: TDD Red→Green→Refactor evidence; tasks flipped to `[x]`; continuous analysis.md findings addressed; full suite green; sign-off present.
- Phase 4 — Release: approvals; PR prepared; merge after gates; `review-log.md` updated with merge hash and final `Completed` row.
- Phase 5 — Retrospective (optional): policy-triggered; citation-only to `governance/retrospective.md`; `review-log.md` updated.

Minimal orchestrator checklist (every delegation)
- Resolve next `PHASE` using the phase machine and `review-log.md`.
- Provide a complete brief as above; forbid assumptions; include the workspace path `initiatives/<YYYYMMDD-HHMM>-<type>-<name>/`.
- Require status flags in `attempt_completion`.
- Verify the delegated subtask wrote the correct `review-log.md` row and required sign-off; if not, re-brief to fix.
- Reject out-of-order or ambiguous work with `STATUS=Blocked` (no repository changes when blocked).

Notes
- This contract complements, and does not replace, the detailed policy in development.md. Modes are isolated at runtime; the orchestrator enforces this contract so the SDD lifecycle remains coherent even when mode instructions are independent.

## Mode runtime model (agent sessions and handoffs)

Purpose
- Clarify how modes operate as agents at runtime so the orchestrator maintains a coherent SDD flow even when each mode is isolated.
- Complement policy in [modes/development-orchestrator/development.md](modes/development-orchestrator/development.md) and embedded runtime rules in [modes/development-orchestrator/custom_mode.yaml](modes/development-orchestrator/custom_mode.yaml) and [modes/development-orchestrator/custom_mode.beta.yaml](modes/development-orchestrator/custom_mode.beta.yaml).

Core concepts
- Session-per-subtask: Every `new_task` launches a new agent session for the delegated mode. The session has no implicit memory of prior sessions.
- Hand-off: The delegated mode must end with `attempt_completion`. Control returns to the orchestrator session with required status flags.
- Shared state lives in the repo: The only durable memory across sessions is the workspace repository (documents, code, and artifacts). Modes must not rely on hidden/ephemeral memory.

Handshake sequence (each delegation)
1) Orchestrator computes the next phase from the ledger (see Global Orchestrator Contract) and prepares a complete brief:
   - PHASE, GOAL, INPUTS, OUTPUTS, VALIDATION, TRACK, WORKSPACE, CONTEXT.
2) Orchestrator opens `new_task` to the target mode (creates a new agent session).
3) Delegated mode executes with tools (orchestrator never uses tools):
   - Reads inputs; makes repository changes bound to the workspace path; captures evidence in `artifacts/`.
   - Writes required sign-offs and updates `review-log.md` for the phase.
4) Delegated mode finishes with `attempt_completion`, including REQUIRED status flags.
5) Orchestrator resumes, validates gates, updates the ledger view, and either re-briefs (if Blocked) or advances to the next phase.

Isolation and persistence rules
- No implicit cross-session memory: Modes cannot assume previous context beyond files they read in the brief.
- Evidence-first: All logs/outputs/screenshots must be stored under `artifacts/` and referenced from documents and commits.
- Sign-offs and ledger: Phases are considered complete only when the corresponding document has a sign-off and `review-log.md` records a row with `status=Completed`.

Blocking and re-brief loop (no fallbacks)
- Ambiguity: Missing/unclear brief fields → the mode must return `STATUS=Blocked`, `REASON=MissingBriefFields`, include `MISSING`, make no changes.
- Out-of-order: Requested phase not allowed by the ledger → `STATUS=Blocked`, `REASON=OutOfOrder`, no changes.
- Critical issues: When critical problems arise → `STATUS=Blocked`, `REASON=HALT` with explanation.

Determinism and idempotency
- Idempotent subtasks: If a section already exists or a checklist item is already `[x]`, perform no duplicate writes and still return `STATUS=Completed` with a summary and evidence paths.
- Diff hygiene: Use surgical edits; avoid duplicating headings, sign-off blocks, or checklist entries.
- Explicit scope: Briefs should specify target files/sections to prevent accidental edits elsewhere.

Concurrency policy
- Parallel sessions are allowed only for tasks marked `[P]` in `tasks.md` and must not touch the same files/sections.
- Orchestrator is responsible for safe scheduling; when in doubt, run serially.
- If a mode detects conflicting scope, it must return `STATUS=Blocked` with `REASON=PolicyViolation` and note the suspected collision.


Auditability
- The runtime ledger is the workspace `review-log.md` file under `initiatives/<YYYYMMDD-HHMM>-<type>-<name>/review-log.md`.
- The orchestrator uses this ledger plus status flags in `attempt_completion` to compute the next allowed phase and enforce gates.

Where to find the rules
- Human policy (maintainer source of truth): [modes/development-orchestrator/development.md](modes/development-orchestrator/development.md)
- Runtime authority (embedded snapshots for agents): [modes/development-orchestrator/custom_mode.yaml](modes/development-orchestrator/custom_mode.yaml), [modes/development-orchestrator/custom_mode.beta.yaml](modes/development-orchestrator/custom_mode.beta.yaml)

## Tool permissions model (groups)

Purpose
- Define which tools each mode may use at runtime so responsibilities are clear and auditable across isolated agent sessions.

Groups (capabilities)
- mcp — Use MCP tools to consult external knowledge (e.g., search, ask higher-tier LLMs, fetch docs), such as context7, perplexity-ask, gemini-google-search, Figma MCP.
- read — Read-only repo access (read_file, search_files, list_files, list_code_definition_names).
- edit — Repo write access (apply_diff, write_to_file, insert_content, search_and_replace).
- browser — Interact with a controlled browser (browser_action) for UI validation and flows.
- command — Execute CLI commands (execute_command) for git/build/test and system-level operations.

Mode → groups (assignment)
- development-orchestrator → mcp
- sdd-kickoff → mcp, read, edit, command
- sdd-specify → mcp, read, edit
- sdd-plan → mcp, read, edit
- sdd-implement → mcp, read, edit, command, browser
- sdd-release → mcp, read, edit, command, browser
- sdd-retrospective → mcp, read, edit

Operational rules
- Least privilege: Modes must not use tools outside their assigned groups. If a task requires an unassigned capability, return STATUS=Blocked with REASON=PolicyViolation and specify the missing group(s).
- No implicit elevation: The orchestrator must explicitly adjust the groups in the mode file before rerunning the task. Do not proceed without permission changes being committed.
- Logging: When a tool is used, include a brief note in the summary and add evidence paths where applicable (e.g., citations in artifacts/ or updated docs).

Edit flow for permissions
1) Update the group list for the target mode inside:
   - [modes/development-orchestrator/custom_mode.beta.yaml](modes/development-orchestrator/custom_mode.beta.yaml)
   - [modes/development-orchestrator/custom_mode.yaml](modes/development-orchestrator/custom_mode.yaml)
2) Commit with a clear message (e.g., “policy(orchestrator): grant mcp to development-orchestrator-beta”).
3) Re-run the blocked subtask with the same brief (and STATUS=Blocked reason resolved).

Notes
- The orchestrator may use MCP tools only (groups: mcp) to consult external knowledge; it must not perform read/edit/command/browser actions.
- Mode isolation still applies: every new_task is a new agent session; the repository (documents, code, artifacts) is the only durable state across sessions.
