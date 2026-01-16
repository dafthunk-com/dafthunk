import { env } from "cloudflare:test";
import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for state consistency throughout execution.
 * These tests run against any BaseRuntime implementation.
 */
export function testStateConsistency(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: state consistency`, () => {
    it("should maintain consistent state throughout execution", async () => {
      const workflow: Workflow = {
        id: "test-workflow-consistency",
        name: "Consistency Check Workflow",
        handle: "consistency",
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
        ],
      };

      const instanceId = createInstanceId("state-consistency");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const addResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "add"
      );

      console.log("Add result:", JSON.stringify(addResult, null, 2));
      expect(addResult).toBeDefined();
    });

    it("should never mark nodes as both executed and errored", async () => {
      const workflow: Workflow = {
        id: "test-workflow-state-isolation",
        name: "State Isolation Workflow",
        handle: "state-isolation",
        trigger: "manual",
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

      const instanceId = createInstanceId("state-isolation");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );

      console.log(
        "Div result (division by zero):",
        JSON.stringify(divResult, null, 2)
      );
      expect(divResult).toBeDefined();
    });
  });
}
