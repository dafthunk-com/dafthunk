# Workflow Runtime

The runtime system executes workflows on Cloudflare's durable workflow engine. It runs nodes, saves state to the database, handles errors, and tracks compute credits.

**Live monitoring**: The optional `workflowSessionId` parameter enables real-time updates to a workflow session Durable Object. When provided, the runtime sends progress updates after each node execution. When omitted, the workflow runs without sending updates. Updates never block or interrupt execution.

## Core Components

### Runtime (`runtime.ts`)

The main entry point for workflow execution. This class coordinates all execution through Cloudflare Workers.

**What it does:**

- Checks if workflows are valid before running
- Creates a plan for which nodes to run and in what order
- Checks if the organization has enough compute credits
- Runs each node in the workflow
- Saves execution state to the database
- Handles errors without stopping the workflow
- Sends live updates to connected clients

### Specialized Components

- **ExecutionPlanner** (`execution-planner.ts`) - Determines the order to run nodes and groups nodes that can run together
- **NodeExecutor** (`node-executor.ts`) - Runs individual nodes or groups of nodes
- **InputCollector** (`input-collector.ts`) - Collects input values from workflow graph (edges and defaults)
- **InputTransformer** (`input-transformer.ts`) - Transforms runtime format to node execution format (resolves ObjectReferences)
- **OutputTransformer** (`output-transformer.ts`) - Transforms node outputs to runtime format (converts binary data to ObjectReferences)
- **ExecutionPersistence** (`execution-persistence.ts`) - Saves execution state to D1 database
- **ExecutionMonitoring** (`execution-monitoring.ts`) - Sends real-time updates to workflow session Durable Object
- **ConditionalExecutionHandler** (`conditional-execution-handler.ts`) - Decides whether to skip nodes based on conditional logic
- **IntegrationManager** (`integration-manager.ts`) - Manages OAuth tokens for third-party services
- **SecretManager** (`secret-manager.ts`) - Manages encrypted organization secrets
- **CreditManager** (`credit-manager.ts`) - Calculates and enforces compute credit limits
- **ErrorHandler** (`error-handler.ts`) - Unified error handling for classification, recording, and status determination

## How Runtime.run() Works

### Step 1: Initialization

The runtime creates initial state for tracking the workflow execution:

```typescript
{
  workflow: Workflow,                      // The workflow definition
  nodeOutputs: WorkflowRuntimeState,       // Stores outputs from each node (Map<nodeId, NodeRuntimeValues>)
  executedNodes: Set<string>,              // Tracks which nodes have run
  skippedNodes: Set<string>,               // Tracks which nodes were skipped
  nodeErrors: Map<string, string>,         // Stores errors from failed nodes
  executionPlan: ExecutionPlan,            // List of nodes to execute in order
  status: "submitted"                      // Current execution status
}
```

**Runtime value types** (`types.ts`):

- `RuntimeValue` - JSON-serializable values (string, number, boolean, ObjectReference, JsonArray, JsonObject)
- `NodeRuntimeValues` - Values for a single node (Record<parameterName, RuntimeValue | RuntimeValue[]>)
- `WorkflowRuntimeState` - Values across entire workflow (Map<nodeId, NodeRuntimeValues>)

### Step 2: Credit Check

The runtime checks if the organization has enough compute credits to run all nodes in the workflow. If credits are insufficient, the runtime marks the execution as "exhausted" and stops.

### Step 3: Preparation

The runtime loads data and validates the workflow. Each operation is wrapped in `step.do()` for durability:

1. **Preload secrets**: Load all organization secrets into memory
2. **Preload integrations**: Load all organization integration tokens into memory
3. **Initialize workflow**:
   - Check that the workflow structure is valid
   - Check that there are no circular dependencies between nodes
   - Create an ordered list of nodes based on their dependencies
   - Group independent nodes into "inline" execution units
   - Throw `NonRetryableError` if validation fails

### Step 4: Record Start Time

The runtime records the start time in the execution record.

### Step 5: Execute Nodes

The runtime processes each item in the execution plan:

**For individual nodes:**

```typescript
await step.do(`run node ${nodeId}`, async () =>
  executor.executeNode(state, ...)
)
```

**For inline groups (multiple nodes at once):**

```typescript
await step.do(`run inline group [${nodeIds}]`, async () =>
  executor.executeInlineGroup(state, ...)
)
```

After each execution unit completes:

1. The runtime checks if any nodes have errors. If `nodeErrors.size > 0`, it changes the workflow status to "error".
2. The runtime sends a progress update to the workflow session Durable Object

### Step 6: Error Handling

The runtime handles errors at three levels:

- **Node execution errors**: The runtime stores the error in `nodeErrors` but continues running other nodes
- **Unexpected errors**: A catch block captures any unexpected errors and sets the status to "error"
- **Cleanup**: A finally block always runs to save final state, even if errors occurred

### Step 7: Finalization

The finally block always runs at the end of execution:

1. The runtime records the end time
2. The runtime saves final state (wrapped in `step.do()` for durability):
   - In production mode, it updates the organization's compute credit usage
   - It saves the complete execution record to the database
3. The runtime sends a final update to the workflow session Durable Object

## Execution Plan

The execution plan is a list of execution units. Each unit is either a single node or a group of nodes.

```typescript
type ExecutionUnit =
  | { type: "individual"; nodeId: string }
  | { type: "inline"; nodeIds: string[] };

type ExecutionPlan = ExecutionUnit[];
```

Inline groups improve performance. When multiple nodes have no dependencies on each other, they can run together in a single durable step instead of separate steps.

## Error Handling

Errors are classified by whether they stop execution:

| Error Type                 | Stops Execution | What Happens                                           |
| -------------------------- | --------------- | ------------------------------------------------------ |
| `NodeExecutionError`       | No              | Stored in `nodeErrors` map, other nodes continue       |
| `WorkflowValidationError`  | Yes             | Invalid workflow structure, throws `NonRetryableError` |
| `InsufficientCreditsError` | Yes             | Marks execution as "exhausted"                         |
| Unexpected exception       | Yes             | Caught, status set to "error"                          |

**Error Handler** (`error-handler.ts`) provides:

- `recordNodeError()` - Stores node failures without stopping execution
- `shouldContinueExecution()` - Decides if execution proceeds based on error type
- `determineWorkflowStatus()` - Returns "executing", "completed", or "error" based on node states
- `shouldSkipNode()` - Checks if node already failed or was skipped

## When State is Saved

The runtime saves execution state to the database at two points:

1. **After credit check fails**: The runtime immediately saves state with status "exhausted"
2. **After execution completes**: The runtime always saves final state in the finally block

All save operations are wrapped in `step.do()` to ensure they complete even if the workflow crashes.

Intermediate execution state is not persisted to the database. Instead, progress updates are sent to the workflow session Durable Object for real-time monitoring.

## Real-Time Updates

Updates are sent to the workflow session Durable Object when `workflowSessionId` is provided:

- **Progress updates**: Sent after each execution unit
- **Final update**: Sent in the finally block

Each update contains:

- Current execution status: `submitted`, `executing`, `error`, `completed`, or `exhausted`
- Results from all executed nodes (outputs and errors)
- Start and end timestamps (when available)

## Credit Management

The runtime manages compute credits in two phases:

1. **Before execution**: The runtime checks that the organization has enough credits for all nodes in the workflow
2. **After execution**: The runtime deducts credits only for nodes that actually ran

In development mode (when `CLOUDFLARE_ENV === "development"`), the runtime does not track or deduct credits.

## Durability

All async operations are wrapped in `step.do()` with this configuration:

```typescript
{
  retries: { limit: 0, delay: 10_000, backoff: "exponential" },
  timeout: "10 minutes"
}
```

This configuration provides:

- Automatic retry if a step fails due to temporary issues
- State recovery if the worker crashes during execution
- Exactly-once execution semantics (each step runs exactly once)
