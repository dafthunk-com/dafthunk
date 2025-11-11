---
description: Review a workflow node implementation
---

Review a workflow node:

1. Ask me which node to review (category and name)
2. Read the node implementation in `apps/api/src/nodes/{category}/{node-name}.ts`
3. Check for:
   - Proper input/output type definitions
   - Error handling
   - Cloudflare bindings usage (if applicable)
   - Test coverage
   - Documentation
   - Following project patterns from CLAUDE.md
4. Suggest improvements
