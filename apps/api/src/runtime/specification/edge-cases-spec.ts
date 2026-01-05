import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import {
  createInstanceId,
  createParams,
  type RuntimeFactory,
} from "./helpers";

/**
 * Shared specification tests for edge cases (optional inputs, deep chains, wide parallel branches).
 * These tests run against any BaseRuntime implementation.
 */
export function testEdgeCases(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: edge cases`, () => {
    it("should handle node with all optional inputs missing", async () => {
      const workflow: Workflow = {
        id: "test-workflow-optional",
        name: "Optional Inputs Workflow",
        handle: "optional",
        type: "manual",
        nodes: [
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 5, hidden: true },
              { name: "b", type: "number", value: 3, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("optional-inputs");
      const runtime = createRuntime(env as Bindings);

      // Execute workflow
      const execution = await runtime.run(createParams(workflow), instanceId);

      // Verify step result
      const addNode = execution.nodeExecutions.find((e) => e.nodeId === "add");

      console.log("Add result:", JSON.stringify(addNode, null, 2));
      expect(addNode).toBeDefined();
      expect(addNode?.status).toBe("completed");
    });

    it("should handle workflow with deep chain (10+ nodes)", async () => {
      // Create a chain: num → add1 → add2 → ... → add10
      const nodes: Workflow["nodes"] = [
        {
          id: "num",
          name: "Number",
          type: "number-input",
          position: { x: 0, y: 0 },
          inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        },
      ];

      const edges: Workflow["edges"] = [];

      for (let i = 1; i <= 10; i++) {
        nodes.push({
          id: `add${i}`,
          name: `Add ${i}`,
          type: "addition",
          position: { x: i * 200, y: 0 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", value: 1, hidden: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        });

        edges.push({
          source: i === 1 ? "num" : `add${i - 1}`,
          sourceOutput: i === 1 ? "value" : "result",
          target: `add${i}`,
          targetInput: "a",
        });
      }

      const workflow: Workflow = {
        id: "test-workflow-deep",
        name: "Deep Chain Workflow",
        handle: "deep-chain",
        type: "manual",
        nodes,
        edges,
      };

      const instanceId = createInstanceId("deep-chain");
      const runtime = createRuntime(env as Bindings);

      // Execute workflow
      const execution = await runtime.run(createParams(workflow), instanceId);

      // Verify execution completed successfully
      expect(execution.status).toBe("completed");
      expect(execution.nodeExecutions).toHaveLength(11); // num + 10 additions

      // Verify final result
      const add10Node = execution.nodeExecutions.find(
        (e) => e.nodeId === "add10"
      );

      console.log("Deep chain final result:", JSON.stringify(add10Node, null, 2));
      expect(add10Node).toBeDefined();
      expect(add10Node?.status).toBe("completed");
    });

    it("should handle workflow with wide parallel branches (10+ branches)", async () => {
      const nodes: Workflow["nodes"] = [];
      const edges: Workflow["edges"] = [];

      // Create 10 number inputs
      for (let i = 1; i <= 10; i++) {
        nodes.push({
          id: `num${i}`,
          name: `Number ${i}`,
          type: "number-input",
          position: { x: 0, y: i * 100 },
          inputs: [{ name: "value", type: "number", value: i, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        });
      }

      // Create addition nodes that sum pairs
      for (let i = 1; i <= 5; i++) {
        const nodeId = `add${i}`;
        nodes.push({
          id: nodeId,
          name: `Add ${i}`,
          type: "addition",
          position: { x: 200, y: i * 200 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", required: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        });

        edges.push(
          {
            source: `num${i * 2 - 1}`,
            sourceOutput: "value",
            target: nodeId,
            targetInput: "a",
          },
          {
            source: `num${i * 2}`,
            sourceOutput: "value",
            target: nodeId,
            targetInput: "b",
          }
        );
      }

      const workflow: Workflow = {
        id: "test-workflow-wide",
        name: "Wide Parallel Workflow",
        handle: "wide-parallel",
        type: "manual",
        nodes,
        edges,
      };

      const instanceId = createInstanceId("wide-parallel");
      const runtime = createRuntime(env as Bindings);

      // Execute workflow
      const execution = await runtime.run(createParams(workflow), instanceId);

      // Verify execution completed successfully
      expect(execution.status).toBe("completed");
      expect(execution.nodeExecutions).toHaveLength(15); // 10 num + 5 additions

      // Verify some results
      const add1Node = execution.nodeExecutions.find((e) => e.nodeId === "add1");
      const add5Node = execution.nodeExecutions.find((e) => e.nodeId === "add5");

      console.log(
        "Wide parallel - add1 result:",
        JSON.stringify(add1Node, null, 2)
      );
      console.log(
        "Wide parallel - add5 result:",
        JSON.stringify(add5Node, null, 2)
      );

      expect(add1Node).toBeDefined();
      expect(add1Node?.status).toBe("completed");

      expect(add5Node).toBeDefined();
      expect(add5Node?.status).toBe("completed");
    });
  });
}
