# Runtime Specification Tests

This directory contains **runtime-agnostic specification tests** for workflow execution. These tests verify that any `BaseRuntime` implementation correctly executes workflows according to the specification.

## Architecture

### Specification Pattern

We use a **test factory pattern** to run the same specification tests against different runtime implementations:

```typescript
// Specification file (*-spec.ts)
export function testSuccessfulExecution(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: successful execution`, () => {
    it("should execute simple linear workflow", async () => {
      const runtime = createRuntime(env);
      const execution = await runtime.run(params, instanceId);
      // Assertions...
    });
  });
}

// Test file (worker-runtime.test.ts)
import { createWorkerRuntime } from "./helpers";
import { testSuccessfulExecution } from "./successful-execution-spec";
import { testFailingExecution } from "./failing-execution-spec";
// ... import all 14 spec functions

// Run all specs against CloudflareWorkerRuntime
const runtimeName = "CloudflareWorkerRuntime";
const factory = createWorkerRuntime;

testSuccessfulExecution(runtimeName, factory);
testFailingExecution(runtimeName, factory);
// ... call all 14 spec functions
```

### File Structure

- `*-spec.ts` (14 files) - **Specification files** containing shared test logic
- `worker-runtime.test.ts` - **Worker Runtime tests** (direct execution, no durability)
- `workflow-runtime.test.ts` - **Workflow Runtime tests** (Workflows-based, durable execution)
- `helpers.ts` - Shared utilities, runtime factories, and WorkflowsRuntimeAdapter
- `README.md` - This documentation

## Available Specifications (All ✅ Implemented)

1. **successful-execution-spec.ts** - Basic workflow execution (linear, parallel, chained) - 3 tests
2. **failing-execution-spec.ts** - Error handling and failures - 4 tests
3. **edge-cases-spec.ts** - Optional inputs, deep chains, wide parallel branches - 3 tests
4. **concurrent-errors-spec.ts** - Multiple concurrent errors and cascading failures - 2 tests
5. **conditional-branching-spec.ts** - Fork-join patterns - 7 tests
6. **input-collection-spec.ts** - Static values and edge inputs - 5 tests
7. **monitoring-updates-spec.ts** - Progress tracking - 6 tests
8. **node-execution-errors-spec.ts** - Unknown types, error handling - 2 tests
9. **output-handling-spec.ts** - Output storage and retrieval - 3 tests
10. **skip-logic-spec.ts** - Skip conditions and upstream failures - 2 tests
11. **state-consistency-spec.ts** - State management - 2 tests
12. **status-computation-spec.ts** - Status transitions - 5 tests
13. **topological-ordering-spec.ts** - Dependency resolution - 3 tests
14. **workflow-validation-spec.ts** - Empty workflows, isolated nodes - 3 tests

**Total: 50 tests across 14 categories**

## Running Tests

```bash
# Run CloudflareWorkerRuntime tests (direct execution, 50 tests)
pnpm --filter '@dafthunk/api' test worker-runtime

# Run WorkflowRuntime tests (Workflows-based, 50 tests)
pnpm --filter '@dafthunk/api' test workflow-runtime

# Run with watch mode for development
pnpm --filter '@dafthunk/api' test worker-runtime --watch
```

## Adding a New Runtime

To test a new runtime implementation:

1. **Create a runtime factory** in `helpers.ts`:

```typescript
export const createMyRuntime: RuntimeFactory = (env: Bindings) => {
  return MyRuntime.create(env);
};
```

2. **Create a test file** for your runtime:

```typescript
// my-runtime.test.ts
import { createMyRuntime } from "./helpers";

// Import all 14 spec functions
import { testSuccessfulExecution } from "./successful-execution-spec";
import { testFailingExecution } from "./failing-execution-spec";
// ... import remaining 12 specs

// Run all specs
const runtimeName = "MyRuntime";
const factory = createMyRuntime;

testSuccessfulExecution(runtimeName, factory);
testFailingExecution(runtimeName, factory);
// ... call remaining 12 specs
```

3. **Run the tests**:

```bash
pnpm --filter '@dafthunk/api' test my-runtime
```

## Current Runtimes

| Runtime                     | Type                                | Test File                  | Test Status              |
| --------------------------- | ----------------------------------- | -------------------------- | ------------------------ |
| **CloudflareWorkerRuntime** | Direct execution (no durability)    | `worker-runtime.test.ts`   | ✅ Passing (50/50 tests) |
| **WorkflowRuntime**         | Workflows-based (durable execution) | `workflow-runtime.test.ts` | ✅ Passing (50/50 tests) |

### How It Works

**CloudflareWorkerRuntime**: Calls `runtime.run()` directly for fast, ephemeral execution

**WorkflowRuntime**: Uses EXECUTE binding + Workflows introspection API to test durable execution with `step.do()`. The `WorkflowsRuntimeAdapter` reconstructs the `WorkflowExecution` result from workflow step results. Implemented in `workflow-runtime.ts`.

Both runtimes extend `BaseRuntime` and share the same core execution logic - only the step wrapper differs (`step.do()` vs direct execution). All 50 specification tests pass for both implementations, verifying consistent behavior.

## Benefits

✅ **Runtime-agnostic** - Same tests work for any `BaseRuntime` implementation
✅ **DRY** - Write test logic once, run against multiple runtimes
✅ **Maintainable** - Update specification in one place (spec files)
✅ **Verifiable** - Ensures all runtimes behave consistently
✅ **Comprehensive** - 50 tests covering all workflow execution scenarios
✅ **Simple** - Single test file runs entire suite
