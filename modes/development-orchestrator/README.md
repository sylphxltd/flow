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