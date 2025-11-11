---
description: Analyze bundle size and dependencies
---

Analyze the application bundle:

1. Build the web app: `pnpm --filter '@dafthunk/web' build`
2. Analyze the build output for bundle sizes
3. Check for:
   - Large dependencies that could be optimized
   - Duplicate packages
   - Code splitting opportunities
   - Unused dependencies in package.json
4. Suggest optimizations to reduce bundle size
5. Check if tree-shaking is working properly
