---
description: Pre-deployment checklist and validation
---

Run pre-deployment checks:

1. Ensure we're on the main branch (or ask which branch to deploy)
2. Run `pnpm typecheck` - all types must pass
3. Run `pnpm lint` - no linting errors
4. Run `pnpm test` - all tests must pass
5. Run `pnpm build` - build must succeed
6. Check for uncommitted changes
7. Verify database migrations are ready (if any)
8. Show me the deployment command and any additional steps
