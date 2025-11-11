---
description: Update dependencies safely
---

Update project dependencies:

1. Ask me which dependencies to update (all, specific package, or workspace)
2. Check current versions in package.json files
3. Look for breaking changes in changelogs
4. Update dependencies using pnpm
5. Run `pnpm install` to update lockfile
6. Run full test suite: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
7. Report any issues and suggest fixes
8. Show me what changed
