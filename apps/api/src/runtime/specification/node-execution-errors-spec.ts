import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for node execution errors (unknown types, continue on error).
 * These tests run against any BaseRuntime implementation.
 */
export function testNodeExecutionErrors(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: node execution errors`, () => {
    it("should handle node type not found in registry", async () => {
      const workflow: Workflow = {
        id: "test-workflow-unknown-type",
        name: "Unknown Node Type",
        handle: "unknown-type",
        type: "manual",
        nodes: [
          {
            id: "unknown",
            name: "Unknown",
            type: "nonexistent-node-type" as any,
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: [],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("unknown-type");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      // Verify the workflow completed (with node errors tracked internally)
      console.log(
        "Unknown node type test: workflow completed with node errors tracked"
      );

      // The execution should be defined even though it errored
      expect(execution).toBeDefined();
    });

    it("should continue execution when one node fails", async () => {
      const workflow: Workflow = {
        id: "test-workflow-continue-on-error",
        name: "Continue on Error",
        handle: "continue-error",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "zero",
            name: "Zero",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 0, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "div",
            name: "Divide",
            type: "division",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 300 },
            inputs: [
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "div",
            targetInput: "a",
          },
          {
            source: "zero",
            sourceOutput: "value",
            target: "div",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("continue-error");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const num1Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num1"
      );
      const zeroResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "zero"
      );
      const num2Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num2"
      );
      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );

      expect(num1Result).toBeDefined();
      expect(zeroResult).toBeDefined();
      expect(num2Result).toBeDefined();
      expect(divResult).toBeDefined();
      console.log(
        "Continue on error - div result:",
        JSON.stringify(divResult, null, 2)
      );
    });
  });
}
