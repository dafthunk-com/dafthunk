# Workflow Runtime

Executes workflows on Cloudflare's durable workflow engine.

## State Transitions

The workflow execution follows a clear state machine model:

```
                    ┌─────────────┐
                    │  submitted  │ (initial state)
                    └──────┬──────┘
                           │
                  ┌────────┴────────┐
                  │                 │
         (insufficient credits)  (credits ok)
                  │                 │
                  ▼                 ▼
         ┌──────────────┐    ┌─────────────┐
         │  exhausted   │    │ executing   │
         └──────────────┘    └──────┬──────┘
           [TERMINAL]               │
                             ┌──────┴──────┐
                             │             │
                    (all nodes done)   (exception)
                             │             │
                   ┌─────────┴──────┐      │
                   │                │      │
            (no errors)      (has errors)  │
                   │                │      │
                   ▼                ▼      ▼
           ┌────────────┐   ┌──────────────┐
           │ completed  │   │    error     │
           └────────────┘   └──────────────┘
             [TERMINAL]       [TERMINAL]
```

**Transition Points in Code:**
- `runtime.ts:132` → **submitted** (execution initialization)
- `runtime.ts:160` → **exhausted** (insufficient credits)
- `runtime.ts:207` → **executing** (validation passed, via `initialiseWorkflow`)
- `runtime.ts:268` → **error** (unexpected exception in catch block)
- `runtime.ts:283` → **completed/error** (final determination in finally block)
- `error-handler.ts:125` → **completed/error** (via `updateStatus()` - called from finally)

**State Consistency:**
- `executionState.status` is the **single source of truth**
- `executionRecord.status` always syncs from `executionState.status`
- No direct status assignments - all go through `StateTransitions`

**Monitoring Updates Sent:**
- `runtime.ts:151` - Initial **submitted** state
- `runtime.ts:177` - **exhausted** state (early exit)
- `runtime.ts:212` - **executing** state (after initialization)
- `runtime.ts:264` - Progress update after each execution unit
- `runtime.ts:276` - **error** state (on exception)
- `runtime.ts:317` - Final state (**completed/error**)

All state changes are immediately communicated to the workflow session.

## Components

### Runtime
Main orchestrator. Validates workflows, creates execution plans, manages durable steps.

### ExecutionEngine
Executes nodes. Collects inputs, transforms data, calls node implementations, handles outputs.

### ResourceProvider
Provides access to secrets and integrations. Handles encryption, decryption, OAuth token refresh.

### ExecutionPersistence
Saves execution records to D1 database.

### ExecutionMonitoring
Sends real-time updates to workflow session Durable Object (when `workflowSessionId` provided).

### SkipHandler
Determines which nodes to skip based on conditional logic and inactive outputs.

### StateTransitions
Centralizes all workflow status changes with logging and validation.

### CreditManager
Checks and deducts compute credits.

### ErrorHandler
Records node errors, determines workflow status, applies state transitions.

## Data Structures

### WorkflowExecutionContext (immutable)
```typescript
{
  workflow: Workflow,
  executionPlan: ExecutionPlan,
  workflowId: string,
  organizationId: string,
  executionId: string
}
```

### ExecutionState (mutable)
```typescript
{
  nodeOutputs: Map<nodeId, NodeRuntimeValues>,
  executedNodes: Set<nodeId>,
  skippedNodes: Set<nodeId>,
  nodeErrors: Map<nodeId, errorMessage>,
  status: WorkflowExecutionStatus
}
```

### ExecutionPlan
```typescript
type ExecutionUnit =
  | { type: "individual", nodeId: string }
  | { type: "inline", nodeIds: string[] }

type ExecutionPlan = ExecutionUnit[]
```

## Execution Flow

### 1. Initialize
- Create empty `ExecutionState` with status "submitted"
- Create `WorkflowExecution` record

### 2. Check Credits
- Calculate total compute cost of all nodes
- If insufficient credits: set status "exhausted", save state, exit

### 3. Preload Resources
- `step.do("preload organization resources")`: ResourceProvider loads all secrets and integrations

### 4. Initialize Workflow
- `step.do("initialise workflow")`:
  - Validate workflow structure (throws `NonRetryableError` if invalid)
  - Check for cycles (throws `NonRetryableError` if cycle found)
  - Create topological order of nodes
  - Create execution plan with inline groups
  - Return `WorkflowExecutionContext` and `ExecutionState` with status "executing"

### 5. Execute Plan
For each `ExecutionUnit` in plan:

**Individual node:**
```typescript
step.do(`run node ${nodeId}`, () =>
  executionEngine.executeNode(context, state, nodeId)
)
```

**Inline group:**
```typescript
step.do(`run inline group [${nodeIds}]`, () =>
  executionEngine.executeInlineGroup(context, state, nodeIds)
)
```

After each step:
- Build `WorkflowExecution` record from state
- Send progress update via ExecutionMonitoring

### 6. Handle Errors
- **Node errors**: Stored in `state.nodeErrors`, execution continues
- **Unexpected errors**: Caught, status set "error"

### 7. Finalize (always runs)
- Set end timestamp
- `step.do("persist final execution record")`:
  - Deduct credits for executed nodes (production only)
  - Save execution record to database
- Send final update via ExecutionMonitoring

## Inline Groups

Nodes with `inlinable: true` can be grouped into a single `step.do()` call for performance.

**Grouping algorithm:**
1. Process nodes in topological order
2. Find sequences of inlinable nodes where all dependencies are met
3. Group consecutive inlinable nodes into `{ type: "inline", nodeIds: [...] }`
4. Non-inlinable nodes become `{ type: "individual", nodeId: "..." }`

## Error Types

| Error                        | Stops Execution | Behavior                          |
| ---------------------------- | --------------- | --------------------------------- |
| `NodeExecutionError`         | No              | Stored in `state.nodeErrors`      |
| `WorkflowValidationError`    | Yes             | Throws `NonRetryableError`        |
| `CyclicGraphError`           | Yes             | Throws `NonRetryableError`        |
| `InsufficientCreditsError`   | Yes             | Status "exhausted", saves, exits  |
| Unexpected exception         | Yes             | Status "error"                    |

## State Persistence

Database writes occur twice:
1. After credit check fails (status "exhausted")
2. In finally block (final state)

All database writes wrapped in `step.do()` for durability.

Intermediate state not saved to database. Cloudflare Workflows engine maintains state between steps.

## Configuration

```typescript
defaultStepConfig = {
  retries: { limit: 0, delay: 10_000, backoff: "exponential" },
  timeout: "10 minutes"
}
```

**Development mode** (`CLOUDFLARE_ENV === "development"`):
- Credit tracking disabled
- State transitions logged to console
