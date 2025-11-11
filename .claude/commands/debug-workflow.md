---
description: Debug a workflow execution issue
---

Help me debug a workflow execution:

1. Ask me which workflow or execution is failing
2. Check the runtime implementation in `apps/api/src/runtime/`
3. Look at the object store and state management
4. Review the node execution order and dependencies
5. Check for:
   - Input/output type mismatches
   - Missing node dependencies
   - Runtime errors in specific nodes
   - State management issues
6. Suggest debugging steps and fixes
