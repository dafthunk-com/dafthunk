# Runtime Specification Tests

This directory contains the Runtime specification test suite, organized by feature area.

## Test Files

- `helpers.ts` - Shared test utilities and helper functions
- `successful-execution.test.ts` - Tests for successful workflow execution scenarios
- `failing-execution.test.ts` - Tests for workflow execution with errors and failures
- `workflow-validation.test.ts` - Tests for workflow validation (empty workflows, single nodes, isolated nodes)
- `edge-cases.test.ts` - Tests for edge cases (optional inputs, deep chains, wide parallel branches)
- `concurrent-errors.test.ts` - Tests for multiple concurrent errors and cascading failures
- `state-consistency.test.ts` - Tests for state consistency throughout execution
- `topological-ordering.test.ts` - Tests for topological ordering and dependency resolution
- `input-collection.test.ts` - Tests for input collection from static values and edges
- `skip-logic.test.ts` - Tests for skip logic and conditional execution
- `monitoring-updates.test.ts` - Tests for monitoring updates and progress tracking
- `status-computation.test.ts` - Tests for status computation (executing, completed, error)
- `node-execution-errors.test.ts` - Tests for node execution errors (unknown types, continue on error)
- `output-handling.test.ts` - Tests for output handling (storage, failed nodes, multiple outputs)
- `conditional-branching.test.ts` - Tests for conditional branching (fork-join patterns)

## Running Tests

```bash
# Run all specification tests
pnpm --filter '@dafthunk/api' test specification

# Run specific test file
pnpm --filter '@dafthunk/api' test successful-execution
```
