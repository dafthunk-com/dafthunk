---
description: Run full build and check for issues
---

Run a complete build check:

1. Run `pnpm build` to build all workspaces
2. If there are errors, analyze them by workspace
3. Fix build errors systematically
4. Run `pnpm lint` to check for linting issues
5. Run `pnpm test` to ensure tests pass
6. Provide a summary of build health
