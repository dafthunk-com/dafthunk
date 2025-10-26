# Workflow and Node State Documentation

This document describes the state management system used by the workflow runtime during execution.

## Overview

The runtime separates **immutable context** (workflow definition, execution order) from **mutable state** (node outputs, errors, execution progress). This separation ensures predictable state transitions and simplifies reasoning about execution flow.

## Workflow Execution States

A workflow progresses through the following states during execution:

| Status      | Description                                                                                      | Terminal |
| ----------- | ------------------------------------------------------------------------------------------------ | -------- |
| `submitted` | Workflow has been submitted but not yet started                                                  | No       |
| `executing` | Workflow is actively executing nodes                                                             | No       |
| `completed` | All nodes executed successfully                                                                  | Yes      |
| `error`     | Unrecoverable error occurred (e.g., missing required inputs, validation failure, cycle detected) | Yes      |
| `exhausted` | Insufficient compute credits to execute workflow                                                 | Yes      |

### Status Computation

Workflow status is **derived** from execution state, not stored directly. This eliminates inconsistency between status and underlying tracking arrays.

```typescript
function getExecutionStatus(
  context: WorkflowExecutionContext,
  state: ExecutionState
): WorkflowExecutionStatus {
  // Check if all nodes have been visited (executed, skipped, or errored)
  const allNodesVisited = orderedNodeIds.every(
    (nodeId) =>
      executedNodes.includes(nodeId) ||
      skippedNodes.includes(nodeId) ||
      nodeId in nodeErrors
  );

  if (!allNodesVisited) return "executing";

  const hasErrorsOrSkips =
    Object.keys(nodeErrors).length > 0 || skippedNodes.length > 0;

  return hasErrorsOrSkips ? "error" : "completed";
}
```

## Node Execution States

Each node transitions through states during workflow execution:

| Status      | Description                                                 | Can Transition To                |
| ----------- | ----------------------------------------------------------- | -------------------------------- |
| `idle`      | Node has not been reached yet                               | `executing`, `skipped`           |
| `executing` | Node is currently being executed                            | `completed`, `failed`, `skipped` |
| `completed` | Node executed successfully and produced outputs             | _(terminal)_                     |
| `failed`    | Node execution failed with an error                         | _(terminal)_                     |
| `skipped`   | Node was skipped due to missing inputs or upstream failures | _(terminal)_                     |

### State Determination

Node state is determined from the `ExecutionState` tracking arrays:

```typescript
if (state.executedNodes.includes(nodeId)) {
  return { nodeId, status: "completed", outputs: state.nodeOutputs[nodeId] };
}
if (nodeId in state.nodeErrors) {
  return { nodeId, status: "failed", error: { ... } };
}
if (state.skippedNodes.includes(nodeId)) {
  return { nodeId, status: "skipped", skipReason: "...", ... };
}
// If workflow still running: "executing", else: "idle"
return { nodeId, status: isStillRunning ? "executing" : "idle" };
```

## Skip Reasons

Nodes are only skipped due to upstream failures. Missing required inputs do not cause nodes to be skipped - the node is responsible for validating its own inputs.

### `upstream_failure`

Node depends on upstream nodes that failed or were skipped.

```typescript
{
  nodeId: "multiply",
  status: "skipped",
  skipReason: "upstream_failure",
  blockedBy: ["divide"],  // Node IDs that failed/skipped
  outputs: null
}
```

**Example:** Multiply node downstream from a division-by-zero error.

### Input Validation (Node Responsibility)

Nodes receive `undefined` for missing inputs and are responsible for:

- Validating that required inputs are present
- Throwing errors or returning failure status if validation fails
- Handling `undefined` as a valid value if appropriate for their logic

This design allows nodes to decide whether `null`/`undefined` is valid for a "required" input.

## Data Structures

### WorkflowExecutionContext (Immutable)

Created once during initialization, never modified:

```typescript
interface WorkflowExecutionContext {
  readonly workflow: Workflow; // Workflow definition
  readonly orderedNodeIds: string[]; // Topological execution order
  readonly workflowId: string;
  readonly organizationId: string;
  readonly executionId: string;
}
```

### ExecutionState (Mutable)

Updated throughout execution using immutable update patterns:

```typescript
interface ExecutionState {
  nodeOutputs: WorkflowRuntimeState; // Map: nodeId → outputs
  executedNodes: string[]; // Successfully executed nodes
  skippedNodes: string[]; // Skipped nodes
  nodeErrors: Record<string, string>; // Map: nodeId → error message
}
```

### NodeRuntimeValues

Runtime values for a single node's inputs/outputs:

```typescript
type NodeRuntimeValues = Record<string, RuntimeValue | RuntimeValue[]>;

// Example:
{
  "prompt": "Hello world",
  "temperature": 0.7,
  "images": [
    { id: "abc123", mimeType: "image/png" },
    { id: "def456", mimeType: "image/jpeg" }
  ]
}
```

### RuntimeValue

JSON-serializable values that flow between nodes:

```typescript
type RuntimeValue =
  | string
  | number
  | boolean
  | ObjectReference // Pointer to R2 binary data
  | JsonArray
  | JsonObject;
```

## State Transition Flow

### Successful Execution

```
idle → executing → completed
```

1. Node starts in `idle` state (not yet reached)
2. Runtime begins execution: `executing`
3. Node executes successfully: `completed`
   - Outputs stored in `state.nodeOutputs[nodeId]`
   - Node ID added to `state.executedNodes`

### Failed Execution

```
idle → executing → failed
```

1. Node starts in `idle` state
2. Runtime begins execution: `executing`
3. Node throws error or returns failure: `failed`
   - Error message stored in `state.nodeErrors[nodeId]`
   - Downstream nodes will be skipped with `upstream_failure`

### Executed with Missing Input

```
idle → executing → completed or failed
```

1. Node starts in `idle` state
2. Runtime executes node with `undefined` for missing inputs: `executing`
3. Node validates inputs and either:
   - Completes with result (possibly `NaN` for math operations): `completed`
   - Throws error or returns failure: `failed`
     - Error recorded in `state.nodeErrors[nodeId]`
     - Downstream nodes will be skipped with `upstream_failure`

Note: The runtime does NOT skip nodes for missing required inputs. Nodes are responsible for validating their own inputs.

### Skipped (Upstream Failure)

```
idle → skipped (upstream_failure)
```

1. Node starts in `idle` state
2. Runtime checks `shouldSkipNode()` before execution
3. Upstream dependency failed/skipped: `skipped`
   - Node ID added to `state.skippedNodes`
   - Skip reason inferred: `upstream_failure`
   - Cascades to further downstream nodes

## Error Handling Strategy

The runtime uses different error handling strategies based on error type:

### Workflow-Level Errors (Non-Retryable)

Stop execution immediately, throw `NonRetryableError`:

- **Validation errors:** Invalid workflow structure
- **Cyclic graph:** Workflow contains a dependency cycle
- **Credit exhaustion:** Insufficient compute credits

```typescript
if (validationErrors.length > 0) {
  throw new NonRetryableError(
    `Workflow validation failed: ${validationErrors.join(", ")}`
  );
}
```

### Node-Level Errors (Recoverable)

Continue execution, store error in state:

- **Node not found:** Node ID in edges but not in nodes array
- **Node type not implemented:** Node type not in registry
- **Execution errors:** Node throws exception or returns failure

```typescript
state = this.recordNodeError(state, nodeId, error);
// Execution continues - downstream nodes will be skipped
```

## Execution Algorithm

The runtime uses topological ordering to execute nodes:

1. **Initialize:** Validate workflow, compute topological order
2. **Execute:** For each node in order:
   - Check if node should be skipped (`shouldSkipNode`)
   - If skipped: add to `skippedNodes`, continue
   - If not skipped: execute node
     - Success: add to `executedNodes`, store outputs
     - Failure: add to `nodeErrors`, downstream nodes will skip
3. **Finalize:** Compute final status, persist execution record

### Skip Check Algorithm

```typescript
function shouldSkipNode(context, state, nodeId): boolean {
  // Already processed?
  if (state.skippedNodes.includes(nodeId) || nodeId in state.nodeErrors) {
    return true;
  }

  // Check upstream dependencies
  for (const edge of inboundEdges) {
    if (
      state.skippedNodes.includes(edge.source) ||
      edge.source in state.nodeErrors
    ) {
      return true; // Upstream failure
    }
  }

  // Nodes are NOT skipped for missing required inputs
  // The node itself validates its inputs during execution
  return false;
}
```

## Testing Pattern

Tests use Cloudflare Workflows testing APIs to verify state transitions:

```typescript
// Set up introspection BEFORE creating instance
await using instance = await introspectWorkflowInstance(
  env.EXECUTE,
  instanceId
);

// Create and execute workflow
await env.EXECUTE.create({ id: instanceId, params: createParams(workflow) });

// Wait for completion
await instance.waitForStatus("complete");

// Verify step results
const nodeResult = await instance.waitForStepResult({ name: "run node add" });
expect(nodeResult.status).toBe("completed");
```

## Examples

### Linear Chain with Success

```
num1 (5) → add (+3) → mult (×2)
```

**Expected State:**

```typescript
executedNodes: ["num1", "add", "mult"]
nodeOutputs: {
  num1: { value: 5 },
  add: { result: 8 },
  mult: { result: 16 }
}
skippedNodes: []
nodeErrors: {}
```

**Status:** `completed`

### Chain with Error in Middle

```
num1 (10) → div (÷0) → add (+5)
num2 (0)  ↗
```

**Expected State:**

```typescript
executedNodes: ["num1", "num2"]
nodeOutputs: {
  num1: { value: 10 },
  num2: { value: 0 }
}
skippedNodes: ["add"]
nodeErrors: { div: "Division by zero" }
```

**Node States:**

- `num1`: `completed`
- `num2`: `completed`
- `div`: `failed` (execution_error)
- `add`: `skipped` (upstream_failure, blockedBy: ["div"])

**Status:** `error`

### Node with Missing Input (Executes Anyway)

```
num1 (5) → add (+?)
           (missing input b)
```

**Expected State (if node validates and fails):**

```typescript
executedNodes: ["num1"];
nodeOutputs: {
  num1: {
    value: 5;
  }
}
skippedNodes: [];
nodeErrors: {
  add: "Missing required input: b";
}
```

**Node States:**

- `num1`: `completed`
- `add`: `failed` (node validated inputs and threw error)

**Status:** `error`

**Alternative (if node accepts undefined):**

```typescript
executedNodes: ["num1", "add"]
nodeOutputs: {
  num1: { value: 5 },
  add: { result: NaN }  // 5 + undefined = NaN
}
skippedNodes: []
nodeErrors: {}
```

**Node States:**

- `num1`: `completed`
- `add`: `completed` (with NaN result)

**Status:** `completed`

## Key Design Decisions

### Derived Status

Workflow status is computed from execution state rather than stored. This eliminates the possibility of status becoming inconsistent with the underlying tracking arrays.

### Separation of Context and State

Immutable context contains workflow definition and execution order. Mutable state tracks execution progress. This makes it clear what can change and what cannot.

### Node-Responsible Input Validation

Nodes are NOT skipped for missing required inputs. Instead:

- The runtime passes `undefined` for missing inputs
- Nodes are responsible for validating their own inputs
- Nodes decide if `undefined` is valid or should throw an error

**Rationale:** Different nodes have different requirements. Some nodes can meaningfully handle `null`/`undefined` for "required" inputs (e.g., optional with a default behavior), while others should fail immediately. Moving validation to the node level allows for this flexibility.

### Skip Inference

Skip reason is inferred when building node executions rather than stored during execution. This reduces state complexity and ensures skip reasons are always consistent with current state.

### Continue on Node Error

Node execution errors don't stop workflow execution. Downstream nodes are skipped, but parallel branches continue. This maximizes the amount of work completed in a single execution.

### Explicit State Tracking

Rather than using a single status enum per node, the runtime uses separate tracking arrays (`executedNodes`, `skippedNodes`, `nodeErrors`). This makes the execution flow explicit and easier to reason about.

### Binary Status Model

Workflows end in either `completed` (all nodes succeeded) or `error` (any node failed or skipped). There is no intermediate state like `completed_with_errors`. This simplifies error handling and makes the workflow outcome unambiguous.
