---
description: Fix TypeScript errors across the monorepo
---

Fix TypeScript errors:

1. Run `pnpm typecheck` to see all type errors
2. Analyze the errors by workspace
3. Fix them systematically, starting with packages (types, utils), then apps
4. Re-run typecheck after each fix to verify
5. Ensure no breaking changes to shared types
