---
description: Setup development environment
---

Help me set up the development environment:

1. Check if `apps/api/.dev.vars` exists
2. If not, guide me to create it with required environment variables
3. Check for `node_modules` and run `pnpm install` if needed
4. Generate a master key using `pnpm --filter '@dafthunk/api' run generate-master-key`
5. Verify the database is set up (check for `.wrangler/state/`)
6. Run initial migration if needed
7. Show me how to start both services with `pnpm dev`
