import { env } from "cloudflare:test";
import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for parallel execution.
 * These tests verify that independent nodes execute correctly in parallel
 * and that state is properly isolated between concurrent executions.
 */
export function testParallelExecution(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: parallel execution`, () => {
    it("should execute independent branches in parallel with correct results", async () => {
      // Pattern: Three independent branches from a single source
      //      A
      //    / | \
      //   B  C  D
      //
      // Level 0: [A]
      // Level 1: [B, C, D] - these should run in parallel
      const workflow: Workflow = {
        id: "test-workflow-parallel-branches",
        name: "Parallel Branches",
        handle: "parallel-branches",
        trigger: "manual",
        nodes: [
          {
            id: "A",
            name: "Source",
            type: "number-input",
            position: { x: 100, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "Branch B (add 1)",
            type: "addition",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "C",
            name: "Branch C (add 2)",
            type: "addition",
            position: { x: 100, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "D",
            name: "Branch D (add 3)",
            type: "addition",
            position: { x: 200, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 3, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "B", targetInput: "a" },
          { source: "A", sourceOutput: "value", target: "C", targetInput: "a" },
          { source: "A", sourceOutput: "value", target: "D", targetInput: "a" },
        ],
      };

      const instanceId = createInstanceId("parallel-branches");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      expect(execution.status).toBe("completed");

      // Verify all nodes completed
      const aResult = execution.nodeExecutions.find((e) => e.nodeId === "A");
      const bResult = execution.nodeExecutions.find((e) => e.nodeId === "B");
      const cResult = execution.nodeExecutions.find((e) => e.nodeId === "C");
      const dResult = execution.nodeExecutions.find((e) => e.nodeId === "D");

      expect(aResult?.status).toBe("completed");
      expect(bResult?.status).toBe("completed");
      expect(cResult?.status).toBe("completed");
      expect(dResult?.status).toBe("completed");

      // Verify correct outputs (each branch adds a different value to 10)
      expect(aResult?.outputs?.value).toBe(10);
      expect(bResult?.outputs?.result).toBe(11); // 10 + 1
      expect(cResult?.outputs?.result).toBe(12); // 10 + 2
      expect(dResult?.outputs?.result).toBe(13); // 10 + 3
    });

    it("should maintain state isolation between parallel nodes", async () => {
      // Pattern: Two independent input sources feeding into parallel chains
      //   A       B
      //   |       |
      //   C       D
      //    \     /
      //      E
      //
      // Level 0: [A, B] - parallel inputs
      // Level 1: [C, D] - parallel processing
      // Level 2: [E] - merge
      const workflow: Workflow = {
        id: "test-workflow-state-isolation",
        name: "State Isolation",
        handle: "state-isolation",
        trigger: "manual",
        nodes: [
          {
            id: "A",
            name: "Input A",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "Input B",
            type: "number-input",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 200, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "C",
            name: "Process A (multiply by 2)",
            type: "multiplication",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "D",
            name: "Process B (multiply by 3)",
            type: "multiplication",
            position: { x: 200, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 3, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "E",
            name: "Merge (add)",
            type: "addition",
            position: { x: 100, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "C", targetInput: "a" },
          { source: "B", sourceOutput: "value", target: "D", targetInput: "a" },
          {
            source: "C",
            sourceOutput: "result",
            target: "E",
            targetInput: "a",
          },
          {
            source: "D",
            sourceOutput: "result",
            target: "E",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("state-isolation");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      expect(execution.status).toBe("completed");

      const cResult = execution.nodeExecutions.find((e) => e.nodeId === "C");
      const dResult = execution.nodeExecutions.find((e) => e.nodeId === "D");
      const eResult = execution.nodeExecutions.find((e) => e.nodeId === "E");

      // Verify each branch computed independently
      expect(cResult?.outputs?.result).toBe(200); // 100 * 2
      expect(dResult?.outputs?.result).toBe(600); // 200 * 3

      // Verify merge got correct values from both branches
      expect(eResult?.outputs?.result).toBe(800); // 200 + 600
    });

    it("should handle wide parallel execution (many independent nodes)", async () => {
      // Pattern: Single source feeding 5 parallel nodes
      // This tests that wide parallelism works correctly
      const workflow: Workflow = {
        id: "test-workflow-wide-parallel",
        name: "Wide Parallel",
        handle: "wide-parallel",
        trigger: "manual",
        nodes: [
          {
            id: "source",
            name: "Source",
            type: "number-input",
            position: { x: 200, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          // 5 parallel addition nodes, each adding their index
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `parallel-${i}`,
            name: `Parallel ${i}`,
            type: "addition" as const,
            position: { x: i * 100, y: 100 },
            inputs: [
              { name: "a", type: "number" as const, required: true as const },
              {
                name: "b",
                type: "number" as const,
                value: i + 1,
                hidden: true as const,
              },
            ],
            outputs: [{ name: "result", type: "number" as const }],
          })),
        ],
        edges: Array.from({ length: 5 }, (_, i) => ({
          source: "source",
          sourceOutput: "value",
          target: `parallel-${i}`,
          targetInput: "a",
        })),
      };

      const instanceId = createInstanceId("wide-parallel");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      expect(execution.status).toBe("completed");

      // Verify all parallel nodes completed with correct results
      for (let i = 0; i < 5; i++) {
        const result = execution.nodeExecutions.find(
          (e) => e.nodeId === `parallel-${i}`
        );
        expect(result?.status).toBe("completed");
        expect(result?.outputs?.result).toBe(i + 2); // 1 + (i + 1)
      }
    });

    it("should handle multiple levels of parallel execution", async () => {
      // Pattern: Multiple parallel levels
      //   A   B   C   D     Level 0 (4 independent inputs)
      //    \ /     \ /
      //     E       F       Level 1 (2 parallel merges)
      //      \     /
      //        G           Level 2 (final merge)
      const workflow: Workflow = {
        id: "test-workflow-multi-level-parallel",
        name: "Multi-Level Parallel",
        handle: "multi-level-parallel",
        trigger: "manual",
        nodes: [
          {
            id: "A",
            name: "A",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "B",
            type: "number-input",
            position: { x: 100, y: 0 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "C",
            name: "C",
            type: "number-input",
            position: { x: 200, y: 0 },
            inputs: [{ name: "value", type: "number", value: 3, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "D",
            name: "D",
            type: "number-input",
            position: { x: 300, y: 0 },
            inputs: [{ name: "value", type: "number", value: 4, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "E",
            name: "E (A + B)",
            type: "addition",
            position: { x: 50, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "F",
            name: "F (C + D)",
            type: "addition",
            position: { x: 250, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "G",
            name: "G (E + F)",
            type: "addition",
            position: { x: 150, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "E", targetInput: "a" },
          { source: "B", sourceOutput: "value", target: "E", targetInput: "b" },
          { source: "C", sourceOutput: "value", target: "F", targetInput: "a" },
          { source: "D", sourceOutput: "value", target: "F", targetInput: "b" },
          {
            source: "E",
            sourceOutput: "result",
            target: "G",
            targetInput: "a",
          },
          {
            source: "F",
            sourceOutput: "result",
            target: "G",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("multi-level-parallel");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      expect(execution.status).toBe("completed");

      const eResult = execution.nodeExecutions.find((e) => e.nodeId === "E");
      const fResult = execution.nodeExecutions.find((e) => e.nodeId === "F");
      const gResult = execution.nodeExecutions.find((e) => e.nodeId === "G");

      expect(eResult?.outputs?.result).toBe(3); // 1 + 2
      expect(fResult?.outputs?.result).toBe(7); // 3 + 4
      expect(gResult?.outputs?.result).toBe(10); // 3 + 7
    });

    it("should handle error in one parallel branch without affecting others", async () => {
      // Pattern: Three parallel branches, one fails
      //      A
      //    / | \
      //   B  C  D
      //   |  |  |
      //   E  F  G
      //
      // C will fail (division by zero), but B and D should complete
      const workflow: Workflow = {
        id: "test-workflow-parallel-error",
        name: "Parallel Error",
        handle: "parallel-error",
        trigger: "manual",
        nodes: [
          {
            id: "A",
            name: "Source",
            type: "number-input",
            position: { x: 100, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "Branch B",
            type: "addition",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "C",
            name: "Branch C (will error)",
            type: "division",
            position: { x: 100, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 0, hidden: true }, // Divide by zero
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "D",
            name: "Branch D",
            type: "addition",
            position: { x: 200, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 3, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "E",
            name: "After B",
            type: "addition",
            position: { x: 0, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "F",
            name: "After C (will be skipped)",
            type: "addition",
            position: { x: 100, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "G",
            name: "After D",
            type: "addition",
            position: { x: 200, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "B", targetInput: "a" },
          { source: "A", sourceOutput: "value", target: "C", targetInput: "a" },
          { source: "A", sourceOutput: "value", target: "D", targetInput: "a" },
          {
            source: "B",
            sourceOutput: "result",
            target: "E",
            targetInput: "a",
          },
          {
            source: "C",
            sourceOutput: "result",
            target: "F",
            targetInput: "a",
          },
          {
            source: "D",
            sourceOutput: "result",
            target: "G",
            targetInput: "a",
          },
        ],
      };

      const instanceId = createInstanceId("parallel-error");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      // Overall status should be error due to C's failure
      expect(execution.status).toBe("error");

      const bResult = execution.nodeExecutions.find((e) => e.nodeId === "B");
      const cResult = execution.nodeExecutions.find((e) => e.nodeId === "C");
      const dResult = execution.nodeExecutions.find((e) => e.nodeId === "D");
      const eResult = execution.nodeExecutions.find((e) => e.nodeId === "E");
      const fResult = execution.nodeExecutions.find((e) => e.nodeId === "F");
      const gResult = execution.nodeExecutions.find((e) => e.nodeId === "G");

      // B and D branches should complete successfully
      expect(bResult?.status).toBe("completed");
      expect(dResult?.status).toBe("completed");
      expect(eResult?.status).toBe("completed");
      expect(gResult?.status).toBe("completed");

      // C branch should error, F should be skipped
      expect(cResult?.status).toBe("error");
      expect(fResult?.status).toBe("skipped");

      // Verify correct values in successful branches
      expect(bResult?.outputs?.result).toBe(11); // 10 + 1
      expect(dResult?.outputs?.result).toBe(13); // 10 + 3
      expect(eResult?.outputs?.result).toBe(111); // 11 + 100
      expect(gResult?.outputs?.result).toBe(113); // 13 + 100
    });
  });
}
