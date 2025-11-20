---
"@sylphx/flow": patch
---

fix(sync): display hooks configuration in sync preview

When running `sylphx-flow --sync`, the sync preview now shows that hooks will be configured/updated. This makes it clear to users that hook settings are being synchronized along with other Flow templates.

Previously, hooks were being updated during sync but this wasn't visible in the sync preview output, leading to confusion about whether hooks were being synced.
