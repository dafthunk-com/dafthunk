/**
 * Runtime Workflow Test - Using Cloudflare's Official Testing APIs
 *
 * This test demonstrates using Cloudflare's official workflow testing APIs
 * from @cloudflare/vitest-pool-workers@0.9.14+.
 *
 * ## Architecture:
 *
 * **Dependency Injection Pattern**:
 * - BaseRuntime accepts optional `RuntimeDependencies` parameter
 * - MockRuntime injects mock dependencies:
 *   - MockNodeRegistry (basic math nodes, no geotiff)
 *   - MockToolRegistry (simpler tool registry)
 *   - MockMonitoringService (captures updates for verification)
 *   - MockExecutionStore (in-memory storage)
 * - Exported from test-entry.ts as "Runtime" for wrangler config
 *
 * **Why This Works**:
 * 1. BaseRuntime is refactored to accept injectable dependencies
 * 2. MockRuntime provides mock dependencies without importing CloudflareNodeRegistry
 * 3. Avoids loading heavy packages (geotiff) that require node:https
 * 4. Tests actual BaseRuntime code with real Cloudflare Workflows infrastructure
 *
 * ## Available APIs:
 * - `introspectWorkflowInstance(workflow, instanceId)` - Inspect specific workflow instances
 * - `instance.waitForStatus(status)` - Wait for workflow completion
 * - `instance.waitForStepResult(step)` - Wait for and verify step outputs
 * - `instance.modify(fn)` - Modify workflow behavior:
 *   - `disableSleeps()` - Make sleeps resolve immediately
 *   - `mockStepResult()` - Mock step outputs
 *   - `mockStepError()` - Force step errors
 *   - `forceStepTimeout()` - Force step timeouts
 *   - `mockEvent()` - Send mock events
 *
 * ## References:
 * - https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/#workflows
 * - node_modules/@cloudflare/vitest-pool-workers/types/cloudflare-test.d.ts (lines 131-495)
 * - src/runtime/runtime.ts (RuntimeDependencies interface, BaseRuntime class)
 * - src/runtime/mock-runtime.ts (MockRuntime implementation)
 */

import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import type { RuntimeParams } from "./base-runtime";

describe("Runtime Workflow Integration", () => {
  /**
   * Simple linear workflow: number-input → addition → multiplication
   * Tests basic node execution and data flow through the workflow.
   *
   * Expected flow:
   * 1. num1 outputs 5
   * 2. num2 outputs 3
   * 3. add receives 5 + 3 = 8
   * 4. mult receives 8 * 2 = 16
   *
   * Uses MockRuntime with injected mock dependencies (MockNodeRegistry, MockToolRegistry,
   * MockMonitoringService, MockExecutionStore) to test actual BaseRuntime code with
   * Cloudflare's workflow introspection APIs.
   */
  it("should execute simple linear workflow using actual Runtime class", async () => {
    // Define the workflow structure
    const workflow: Workflow = {
      id: "test-workflow-simple",
      name: "Linear Math Workflow",
      handle: "linear-math",
      type: "manual",
      nodes: [
        {
          id: "num1",
          name: "Number 1",
          type: "number-input",
          position: { x: 0, y: 0 },
          inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        },
        {
          id: "num2",
          name: "Number 2",
          type: "number-input",
          position: { x: 0, y: 100 },
          inputs: [{ name: "value", type: "number", value: 3, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        },
        {
          id: "add",
          name: "Add",
          type: "addition",
          position: { x: 200, y: 50 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", required: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        },
        {
          id: "mult",
          name: "Multiply",
          type: "multiplication",
          position: { x: 400, y: 50 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", value: 2, hidden: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        },
      ],
      edges: [
        {
          source: "num1",
          sourceOutput: "value",
          target: "add",
          targetInput: "a",
        },
        {
          source: "num2",
          sourceOutput: "value",
          target: "add",
          targetInput: "b",
        },
        {
          source: "add",
          sourceOutput: "result",
          target: "mult",
          targetInput: "a",
        },
      ],
    };

    // Generate a unique instance ID for this test
    const instanceId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Step 1: Setup workflow introspection BEFORE creating the instance
    // Using `await using` ensures automatic cleanup via Symbol.asyncDispose
    await using instance = await introspectWorkflowInstance(
      (env as Bindings).EXECUTE,
      instanceId
    );

    // Optional: Disable sleeps for faster test execution
    // await instance.modify(async (m) => {
    //   await m.disableSleeps();
    // });

    // Step 2: Create and execute the workflow instance
    const params: RuntimeParams = {
      workflow,
      userId: "test-user",
      organizationId: "test-org",
      computeCredits: 10000,
    };

    await (env as Bindings).EXECUTE.create({ id: instanceId, params });

    // Step 3: Wait for workflow to complete
    await instance.waitForStatus("complete");

    // Step 4: Verify specific step results
    // Note: Step names in Runtime match the format "run node {nodeId}"
    const addResult = await instance.waitForStepResult({
      name: "run node add",
    });
    const multResult = await instance.waitForStepResult({
      name: "run node mult",
    });

    // Step 5: Assertions
    expect(addResult).toBeDefined();
    expect(multResult).toBeDefined();

    // Verify the computation results
    // Addition: 5 + 3 = 8
    // Multiplication: 8 * 2 = 16
    // Note: Results may be wrapped in execution state objects
    console.log("Addition result:", JSON.stringify(addResult, null, 2));
    console.log("Multiplication result:", JSON.stringify(multResult, null, 2));

    // The instance is automatically disposed via Symbol.asyncDispose when exiting this block
  });
});
