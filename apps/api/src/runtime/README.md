# Workflow Runtime

The runtime system executes workflows using Cloudflare's durable workflow engine. It orchestrates node execution, manages state persistence, handles errors, and tracks compute credit usage.

## Core Components

### Runtime (`runtime.ts`)

The main workflow entrypoint that coordinates execution through Cloudflare Workers.

**Key responsibilities:**
- Validates workflows and creates execution plans
- Manages compute credits and resource limits
- Executes nodes according to dependency graph
- Persists execution state
- Handles errors and ensures durability
- Sends real-time updates

### Specialized Components

- **ExecutionPlanner** (`execution-planner.ts`) - Creates topological execution order and groups nodes
- **NodeExecutor** (`node-executor.ts`) - Executes individual nodes and inline groups
- **NodeInputMapper** (`node-input-mapper.ts`) - Maps outputs to inputs between nodes
- **NodeOutputMapper** (`node-output-mapper.ts`) - Processes and validates node outputs
- **ExecutionPersistence** (`execution-persistence.ts`) - Saves state to D1 and sends WebSocket updates
- **ConditionalExecutionHandler** (`conditional-execution-handler.ts`) - Evaluates conditional logic
- **IntegrationManager** (`integration-manager.ts`) - Securely handles third-party integrations tokens
- **SecretManager** (`secret-manager.ts`) - Securely handles organization secrets
- **CreditManager** (`credit-manager.ts`) - Tracks and enforces compute credit limits

## Runtime.run() Algorithm

### 1. Initialization
Extract workflow parameters and initialize state:
```typescript
{
  workflow: Workflow,
  nodeOutputs: Map<string, NodeOutputs>,
  executedNodes: Set<string>,
  skippedNodes: Set<string>,
  nodeErrors: Map<string, string>,
  executionPlan: ExecutionPlan,
  status: "submitted"
}
```

### 2. Credit Check
Verify organization has sufficient compute credits for workflow execution. If insufficient, mark as "exhausted" and terminate.

### 3. Preparation (durable steps)
- **Preload secrets**: Load all organization secrets
- **Preload integrations**: Load all organization integrations
- **Initialize workflow**:
  - Validate structure (no cycles, valid connections)
  - Create topological order from dependency graph
  - Group independent nodes into "inline" execution units
  - Throws `NonRetryableError` on validation failure

### 4. Initial Persistence
Persist execution record with `status: "executing"` and `startedAt` timestamp.

### 5. Node Execution
Iterate through execution plan:

**Individual nodes**: Execute one node per step
```typescript
await step.do(`run node ${nodeId}`, async () =>
  executor.executeNode(state, ...)
)
```

**Inline groups**: Execute multiple nodes in one step
```typescript
await step.do(`run inline group [${nodeIds}]`, async () =>
  executor.executeInlineGroup(state, ...)
)
```

After each execution unit:
- Update status to "error" if any node failed
- Send live progress update via WebSocket (if session exists)

### 6. Error Handling
- **Node failures**: Stored in `nodeErrors`, execution continues
- **Unexpected errors**: Caught in catch block, status set to "error"
- **Finally block**: Always executes cleanup and finalization

### 7. Finalization
In `finally` block (always runs):
- Set `endedAt` timestamp
- Update organization compute usage (production only)
- Persist final execution state
- Send final update to client

## Execution Plan

The execution plan is a sequence of execution units created by `ExecutionPlanner`:

```typescript
type ExecutionUnit =
  | { type: "individual", nodeId: string }
  | { type: "inline", nodeIds: string[] }

type ExecutionPlan = ExecutionUnit[]
```

**Inline groups** optimize execution by running independent nodes together in a single durable step, reducing step overhead for workflows with parallel branches.

## Error Strategy

| Error Type | Handling | Result |
|------------|----------|--------|
| Workflow validation error | `NonRetryableError` thrown | Execution terminates immediately |
| Node execution failure | Stored in `nodeErrors` map | Execution continues, status → "error" |
| UnexpecCoted exception | Caught in catch block | Status → "error", message captured |
| WebSocket send failure | Logged, not thrown | Execution continues |

## State Persistence

Execution state is persisted at three points:

1. **Credit exhaustion**: Immediate save with "exhausted" status
2. **Execution start**: Save "executing" status with `startedAt`
3. **Execution end**: Always save final state in `finally` block

All persistence operations are wrapped in `step.do()` for durability.

## Real-time Updates

If `workflowSessionId` is provided, execution updates are sent via WebSocket after each execution unit and at finalization. Failures to send updates are logged but don't affect execution.

## Credit Management

- **Upfront validation**: Check total credits needed before execution
- **Post-execution tracking**: Deduct credits only for executed nodes
- **Development mode**: Credit tracking disabled when `CLOUDFLARE_ENV === "development"`

## Durability

All async operations are wrapped in `step.do()` with retry configuration:
```typescript
{
  retries: { limit: 0, delay: 10_000, backoff: "exponential" },
  timeout: "10 minutes"
}
```

This ensures:
- Automatic retry on transient failures
- State recovery after crashes
- Exactly-once execution semantics
