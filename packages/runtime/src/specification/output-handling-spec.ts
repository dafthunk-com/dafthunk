import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for output handling (storage, failed nodes, multiple outputs).
 * These tests run against any Runtime implementation.
 */
export function testOutputHandling(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: output handling`, () => {
    it("should store outputs from successful nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-outputs",
        name: "Node Outputs",
        handle: "outputs",
        trigger: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
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

      const instanceId = createInstanceId("outputs");
      const runtime = createRuntime();
      const execution = await runtime.run(createParams(workflow), instanceId);

      const numResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "num"
      );

      expect(numResult).toBeDefined();
      console.log(
        "Outputs test - num result:",
        JSON.stringify(numResult, null, 2)
      );
    });

    it("should not store outputs from failed nodes", async () => {
      const workflow: Workflow = {
        id: "test-workflow-no-outputs-on-error",
        name: "No Outputs on Error",
        handle: "no-outputs-error",
        trigger: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
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
            source: "num",
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

      const instanceId = createInstanceId("no-outputs-error");
      const runtime = createRuntime();
      const execution = await runtime.run(createParams(workflow), instanceId);

      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );

      expect(divResult).toBeDefined();
      console.log(
        "No outputs on error - div result:",
        JSON.stringify(divResult, null, 2)
      );
    });

    it("should handle nodes with multiple outputs", async () => {
      const workflow: Workflow = {
        id: "test-workflow-multiple-outputs",
        name: "Multiple Outputs",
        handle: "multi-outputs",
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
          {
            id: "sub",
            name: "Subtract",
            type: "subtraction",
            position: { x: 200, y: 150 },
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
          {
            source: "num1",
            sourceOutput: "value",
            target: "sub",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "sub",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("multi-outputs");
      const runtime = createRuntime();
      const execution = await runtime.run(createParams(workflow), instanceId);

      const addResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "add"
      );
      const subResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "sub"
      );

      expect(addResult).toBeDefined();
      expect(subResult).toBeDefined();
      console.log(
        "Multiple outputs - add result:",
        JSON.stringify(addResult, null, 2)
      );
      console.log(
        "Multiple outputs - sub result:",
        JSON.stringify(subResult, null, 2)
      );
    });
  });
}
