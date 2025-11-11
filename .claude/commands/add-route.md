---
description: Create a new API route
---

Help me create a new API route:

1. Ask me for the route name and purpose
2. Create the route file in `apps/api/src/routes/{route-name}.ts`
3. Follow the Hono routing pattern from existing routes
4. Add proper:
   - Zod validation schemas
   - Organization scoping (`c.get('organizationId')`)
   - Database queries with proper typing
   - Error handling
5. Register the route in `apps/api/src/index.ts`
6. Add corresponding types to `packages/types` if needed
7. Show me how to test the endpoint
