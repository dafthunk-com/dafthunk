# CLAUDE.md

## Project Overview

Dafthunk is a visual workflow automation platform built on Cloudflare infrastructure (Workers, D1, R2, AI). Users create workflows by connecting 50+ node types in a visual editor (React Flow).

**Monorepo structure** (pnpm workspaces):
- `apps/api` - Backend (Hono on Cloudflare Workers)
- `apps/web` - Frontend (React 19 + React Router v7 + Vite)
- `packages/types` - Shared TypeScript types
- `packages/utils` - Shared utilities

## Development Commands

### Common commands
```bash
pnpm dev                                       # Start all services
pnpm build                                     # Build all packages and apps
pnpm typecheck                                 # Type check all workspaces
pnpm lint                                      # Lint and type check
pnpm fix                                       # Auto-fix linting + format
pnpm test                                      # Run tests

# Workspace-specific (use --filter)
pnpm --filter '@dafthunk/api' dev              # API dev server (port 3001)
pnpm --filter '@dafthunk/web' dev              # Web dev server (port 3000)
pnpm --filter '@dafthunk/api' test:integration # Integration tests

# Database migrations
pnpm --filter '@dafthunk/api' db:migrate       # Apply migrations locally
pnpm --filter '@dafthunk/api' db:generate      # Generate new migrations
pnpm --filter '@dafthunk/api' db:prod:migrate  # Apply to production
```

## Architecture

### Backend: API (`apps/api/`)

**Routes** (`src/routes/`)
- Organized by feature (workflows, executions, objects, etc.)
- Stateless: each request is self-contained
- Auth in `src/auth.ts` (JWT + API Keys)
- Multi-tenant: always scope by `organizationId` from context (`c.get("organizationId")`)
- Validate with Zod + `@hono/zod-validator`

**Database** (`src/db/`)
- D1 (SQLite) + Drizzle ORM
- Schema: `schema/index.ts`
- Queries: `queries.ts`
- Migrations: `migrations/` (generate with `drizzle-kit`)
- Convention: `snake_case` in SQL, `camelCase` in TypeScript

**Workflow Runtime** (`src/runtime/`)
- `runtime.ts` - Cloudflare Workflows for durable execution
- Durable Objects manage state
- `object-store.ts` - Node outputs (R2 + transient storage)
- Executes nodes by graph topology

**Node System** (`src/nodes/`)
- node types in category folders: `text/`, `image/`, `audio/`, `browser/`, `logic/`, `math/`, `javascript/`, `anthropic/`, `openai/`, `gemini/`, `3d/`, `date/`, `document/`, `email/`, `geo/`, `json/`, `net/`, `parameter/`, `rag/`
- Registry: `base-node-registry.ts` and `cloudflare-node-registry.ts`
- All implement common interface from `packages/types`

### Frontend: Web (`apps/web/`)

**Structure**
- Pages: `src/pages/` (one file per route)
- Components: `src/components/` (`ui/` = shadcn/ui, `workflow/` = React Flow editor)
- Routes: `src/routes.tsx` (React Router v7)
- Services: `src/services/` (API clients)

**Patterns**
- Data fetching: SWR (consolidate related calls)
- Styling: Tailwind CSS only (use `cn()` utility)
- State: Avoid `useEffect`, prefer derived state

### Shared: Types (`packages/types/`)
- Single source of truth for data structures
- Backend serializes, frontend deserializes/validates
- Ensures type safety across stack

## Design Principles

When writing or refactoring code:

### Simplify Interfaces
- Export only what's necessary—hide everything else
- Keep public APIs small (fewer exports = less complexity)
- Use barrel exports (`index.ts`) to define module boundaries
- If a function/class can't be described in one sentence, split it

### Manage Complexity
- Push complexity into lower-level modules with simple APIs
- Eliminate unnecessary state, conditionals, and abstractions
- Keep related logic together; separate unrelated concerns
- Depend on interfaces/types, not concrete implementations

### Prioritize Maintainability
- Write the calling code you want first, then implement to match
- After code works, refactor to simplify the interface
- Use comments for *why* (design decisions, trade-offs), not *what* (code explains itself)
- Front-load architectural decisions (module boundaries, data flow); defer details (naming, parameters)

## Code Guidelines

### TypeScript Style
- Strict mode: never use `any` or `unknown`
- Prefer `interface` over `type` for object shapes
- Always use `import type` for type-only imports
- Use early returns to avoid deep nesting

### Naming Conventions
```
Files:          kebab-case.tsx
Functions:      camelCase()
Hooks:          useCamelCase()
Event handlers: handleClick()
Components:     PascalCase
```

### React (apps/web)
```tsx
// ✓ Correct
import { Link } from 'react-router'           // not react-router-dom
import type { User } from '@dafthunk/types'
export function MyComponent() { ... }         // functional component

// Data fetching
const { data } = useSWR(['/users', '/posts'], fetchAll)  // consolidate

// Styling
<div className={cn('base-class', isActive && 'active')} />

// Avoid useEffect - prefer derived state or move logic outside React
```

### Hono API (apps/api)
```ts
// Routes by feature
const workflows = new Hono()
workflows.get('/', zValidator('query', schema), (c) => {
  const orgId = c.get('organizationId')  // always scope by org
  // ...
})
app.route('/workflows', workflows)

// Database
const users = sqliteTable('users', {
  createdAt: text('created_at'),  // snake_case in DB
})
export type User = InferModel<typeof users>
```

### Testing
```ts
// Unit tests: *.test.ts
import { describe, it, expect } from 'vitest'

// Integration tests: *.integration.ts
```
