---
"@sylphx/flow": patch
---

Enhanced debug output for sync force mode:

- **Remove quiet flag suppression**: Force mode now always shows debug output regardless of quiet flag
- **Content verification**: Show content preview (first 100 chars) before and after write
- **Write verification**: Verify file exists and read back content to compare
- **Byte count comparison**: Show written vs read byte counts to detect content mismatch

This comprehensive logging will reveal whether files are being written correctly or if there's a path/content issue causing git to see no changes.
