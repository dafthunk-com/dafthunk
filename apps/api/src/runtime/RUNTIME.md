# Runtime Developer Documentation

**Purpose:** Quick reference for understanding and developing with Dafthunk's workflow runtime system.

## Architecture Overview

The runtime executes workflows on **Cloudflare Workflows** (durable execution) with topological ordering of nodes. State is separated into immutable context (workflow definition, execution order) and mutable state (outputs, errors, execution progress).

```
┌─────────────────┐
│ BaseRuntime     │ ← Core execution logic (abstract class)
├─────────────────┤
│ • Validates     │
│ • Orders nodes  │
│ • Executes      │
│ • Persists      │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
CloudflareRuntime  MockRuntime
(production)       (testing)
```

## Key Components

### Files
- **`base-runtime.ts`** - Core execution engine (extends `WorkflowEntrypoint`)
- **`cloudflare-runtime.ts`** - Production implementation with full node registry
- **`resource-provider.ts`** - Manages secrets, integrations, OAuth token refresh
- **`types.ts`** - Core types, error classes, status computation
- **`STATE.md`** - Detailed state management documentation

### Dependencies (Injectable)
```typescript
interface RuntimeDependencies {
  nodeRegistry?: BaseNodeRegistry        // 50+ node types
  resourceProvider?: ResourceProvider    // Secrets + integrations
  executionStore?: ExecutionStore        // D1 + R2 persistence
  monitoringService?: MonitoringService  // Real-time updates
}
```

## Core Types

### Immutable Context
```typescript
interface WorkflowExecutionContext {
  readonly workflow: Workflow
  readonly orderedNodeIds: readonly string[]  // Topological order
  readonly workflowId: string
  readonly organizationId: string
  readonly executionId: string
  readonly deploymentId?: string
}
```

### Mutable State
```typescript
interface ExecutionState {
  nodeOutputs: WorkflowRuntimeState           // nodeId → outputs
  executedNodes: string[]                     // Successfully executed
  skippedNodes: string[]                      // Skipped (upstream failures)
  nodeErrors: Record<string, string>          // nodeId → error message
}
```

### Runtime Values
```typescript
// JSON-serializable values that flow between nodes
type RuntimeValue =
  | string
  | number
  | boolean
  | ObjectReference  // Pointer to R2 binary data (images, files, etc.)
  | JsonArray
  | JsonObject

type NodeRuntimeValues = Record<string, RuntimeValue | RuntimeValue[]>
```

## Execution Flow

```typescript
1. run()                         // Cloudflare Workflows entrypoint
   ↓
2. initialiseWorkflow()          // Validate + compute topological order
   ↓
3. preload resources            // Load secrets + integrations
   ↓
4. executeWorkflowNodes()        // Loop through orderedNodeIds
   ↓
   for each node:
     ├─ shouldSkipNode()         // Check upstream failures
     ├─ executeNode()            // Execute or skip
     │  ├─ collectNodeInputs()   // Gather from edges + static values
     │  ├─ transformInputs()     // API format → node format
     │  ├─ executable.execute()  // Run node logic
     │  └─ transformOutputs()    // Node format → API format
     └─ updateAndNotify()        // Send progress to client
   ↓
5. persistFinalState()           // Save to D1, update credits
```

## Status Computation

Status is **derived**, not stored, to prevent inconsistency:

```typescript
function getExecutionStatus(context, state): WorkflowExecutionStatus {
  const allNodesVisited = orderedNodeIds.every(nodeId =>
    executedNodes.includes(nodeId) ||
    skippedNodes.includes(nodeId) ||
    nodeId in nodeErrors
  )

  if (!allNodesVisited) return "executing"

  const hasErrorsOrSkips =
    Object.keys(nodeErrors).length > 0 ||
    skippedNodes.length > 0

  return hasErrorsOrSkips ? "error" : "completed"
}
```

**Workflow States:** `submitted` → `executing` → `completed` | `error` | `exhausted`

**Node States:** `idle` → `executing` → `completed` | `failed` | `skipped`

## Error Handling

### Workflow-Level Errors (Stop Execution)
Throw `NonRetryableError` from `cloudflare:workflows`:
- **Validation errors** - Invalid workflow structure
- **Cyclic graph** - Workflow contains cycle
- **Credit exhaustion** - Insufficient compute credits

```typescript
if (validationErrors.length > 0) {
  throw new NonRetryableError(`Workflow validation failed: ...`)
}
```

### Node-Level Errors (Continue Execution)
Store in `nodeErrors`, downstream nodes skip:
- **Node not found** - Node ID in edges but missing from nodes array
- **Node type not implemented** - Node type not in registry
- **Execution errors** - Node throws exception

```typescript
state = this.recordNodeError(state, nodeId, error)
// Execution continues - downstream skips with upstream_failure
```

## Skip Logic

A node is skipped when **ALL upstream dependencies are unavailable**:

```typescript
shouldSkipNode(context, state, nodeId): boolean {
  // Already processed?
  if (skippedNodes.includes(nodeId) || nodeId in nodeErrors) return true

  const inboundEdges = workflow.edges.filter(e => e.target === nodeId)
  if (inboundEdges.length === 0) return false  // No deps, can execute

  // Skip if ALL upstream are unavailable
  return inboundEdges.every(edge => {
    const source = edge.source
    return (
      source in nodeErrors ||              // Upstream errored
      skippedNodes.includes(source) ||     // Upstream skipped
      (executedNodes.includes(source) &&   // Conditional branch
       !(edge.sourceOutput in nodeOutputs[source]))
    )
  })
}
```

**Key Design:** This allows join nodes to execute with partial inputs while propagating errors.

**Skip Reasons:**
- `upstream_failure` - Upstream node failed or was skipped
- `conditional_branch` - Upstream executed but didn't populate the connected output

## Resource Management

### ResourceProvider
Handles secrets, integrations, OAuth token refresh:

```typescript
// Initialize once before execution
await resourceProvider.initialize(organizationId)

// Create node context with resource access
const nodeContext = resourceProvider.createNodeContext(
  nodeId, workflowId, organizationId, inputs, ...
)

// Nodes access via callbacks
const secret = await nodeContext.getSecret('API_KEY')
const integration = await nodeContext.getIntegration('github-123')
```

**Token Refresh:** Automatic OAuth token refresh 5 minutes before expiration.

### ObjectStore
Manages binary data (images, files) in R2:
- **Storage:** Persists node outputs as objects (referenced by ID)
- **Retrieval:** Loads objects for node inputs
- **Format:** `ObjectReference = { id: string, mimeType: string }`

## Credit Management

```typescript
// Check before execution
if (!hasEnoughComputeCredits(orgId, credits, cost)) {
  executionRecord.status = "exhausted"
  return
}

// Update after execution (only for executed nodes)
await updateOrganizationComputeUsage(KV, orgId, cost)
```

**Cost:** `nodeType.computeCost ?? 1` (per node, tracked in `COMPUTE` analytics)

## Testing with Cloudflare Workflows

```typescript
// Create introspection BEFORE workflow instance
await using instance = await introspectWorkflowInstance(
  env.EXECUTE,
  instanceId
)

// Create and execute
await env.EXECUTE.create({ id: instanceId, params })

// Wait for completion
await instance.waitForStatus("complete")

// Verify step results
const result = await instance.waitForStepResult({ name: "run node add" })
expect(result.status).toBe("completed")
expect(result.outputs).toEqual({ result: 8 })
```

## Common Development Tasks

### Adding a New Node Type
1. Create node class in `apps/api/src/nodes/{category}/`
2. Implement `execute(context: NodeContext): Promise<ExecutionResult>`
3. Register in `cloudflare-node-registry.ts`
4. Add to `base-node-registry.ts` for tests (if needed)

### Debugging Execution
- **Status computation:** `getExecutionStatus()` in `types.ts:103`
- **Node execution:** `executeNode()` in `base-runtime.ts:469`
- **Skip logic:** `shouldSkipNode()` in `base-runtime.ts:893`
- **Input collection:** `collectNodeInputs()` in `base-runtime.ts:689`

### Modifying State Management
Read `STATE.md` for detailed state transition documentation.

### Adding Resource Types
Extend `ResourceProvider.createNodeContext()` in `resource-provider.ts:122`

## Important Conventions

### Topological Ordering
Nodes execute in dependency order (Kahn's algorithm in `createTopologicalOrder()`).
Empty result = cycle detected → throw `NonRetryableError`.

### Immutable Updates
State updates use immutable patterns (spread operators, not mutations):
```typescript
state.executedNodes.push(nodeId)  // ✓ Array mutation OK
state = { ...state, nodeErrors: { ...state.nodeErrors, [nodeId]: error } }  // ✓
```

### Parameter Transformation
- **Inputs:** `apiToNodeParameter()` - API format → node format
- **Outputs:** `nodeToApiParameter()` - Node format → API format
- Handles `ObjectReference` ↔ binary data conversion via `ObjectStore`

### Dependency Injection
Use `RuntimeDependencies` for testability:
- **Production:** `CloudflareRuntime` with full node registry
- **Testing:** `MockRuntime` with minimal dependencies

## File Locations

```
apps/api/src/
├── runtime/
│   ├── base-runtime.ts           # Core execution engine
│   ├── cloudflare-runtime.ts     # Production implementation
│   ├── resource-provider.ts      # Secrets + integrations
│   ├── types.ts                  # Core types + utilities
│   ├── STATE.md                  # State management details
│   └── RUNTIME.md                # This file
├── nodes/
│   ├── base-node-registry.ts     # Test node registry
│   └── cloudflare-node-registry.ts  # Production node registry
└── stores/
    ├── execution-store.ts        # D1 + R2 persistence
    └── object-store.ts           # Binary data (R2)
```

## Further Reading

- **`STATE.md`** - Comprehensive state management documentation
- **`apps/api/src/nodes/`** - Node implementation examples
- **Cloudflare Workflows docs** - https://developers.cloudflare.com/workflows/
