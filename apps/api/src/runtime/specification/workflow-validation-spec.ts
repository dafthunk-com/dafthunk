import { env } from "cloudflare:test";
import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for workflow validation (empty workflows, single nodes, isolated nodes).
 * These tests run against any BaseRuntime implementation.
 */
export function testWorkflowValidation(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: workflow validation`, () => {
    it("should handle empty workflow (no nodes)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-empty",
        name: "Empty Workflow",
        handle: "empty",
        trigger: "manual",
        nodes: [],
        edges: [],
      };

      const instanceId = createInstanceId("empty-workflow");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      console.log("Empty workflow completed successfully");
      expect(execution).toBeDefined();
    });

    it("should handle workflow with single isolated node", async () => {
      const workflow: Workflow = {
        id: "test-workflow-single",
        name: "Single Node Workflow",
        handle: "single",
        trigger: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("single-node");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const num1Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num1"
      );

      console.log("Num1 result:", JSON.stringify(num1Result, null, 2));
      expect(num1Result).toBeDefined();
    });

    it("should handle workflow with multiple isolated nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-isolated",
        name: "Isolated Nodes Workflow",
        handle: "isolated",
        trigger: "manual",
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
            position: { x: 200, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num3",
            name: "Number 3",
            type: "number-input",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 15, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("multiple-isolated");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const num1Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num1"
      );
      const num2Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num2"
      );
      const num3Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num3"
      );

      console.log("Num1 result:", JSON.stringify(num1Result, null, 2));
      console.log("Num2 result:", JSON.stringify(num2Result, null, 2));
      console.log("Num3 result:", JSON.stringify(num3Result, null, 2));

      expect(num1Result).toBeDefined();
      expect(num2Result).toBeDefined();
      expect(num3Result).toBeDefined();
    });
  });
}
