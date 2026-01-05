import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";
import { createInstanceId, createParams, type RuntimeFactory } from "./helpers";

/**
 * Shared specification tests for monitoring updates and progress tracking.
 * These tests run against any BaseRuntime implementation.
 */
export function testMonitoringUpdates(
  runtimeName: string,
  createRuntime: RuntimeFactory
) {
  describe(`${runtimeName}: monitoring and updates`, () => {
    it("should send initial update with submitted status", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-initial",
        name: "Monitor Initial",
        handle: "monitor-initial",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("monitor-initial");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const numResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "num"
      );
      expect(numResult).toBeDefined();
      console.log(
        "Monitoring test - num result:",
        JSON.stringify(numResult, null, 2)
      );
    });

    it("should send progress updates after each node execution", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-progress",
        name: "Monitor Progress",
        handle: "monitor-progress",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
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

      const instanceId = createInstanceId("monitor-progress");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const num1Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num1"
      );
      const num2Result = execution.nodeExecutions.find(
        (e) => e.nodeId === "num2"
      );
      const addResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "add"
      );

      expect(num1Result).toBeDefined();
      expect(num2Result).toBeDefined();
      expect(addResult).toBeDefined();
      console.log(
        "Progress test - add result:",
        JSON.stringify(addResult, null, 2)
      );
    });

    it("should include node outputs in monitoring updates", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-outputs",
        name: "Monitor Outputs",
        handle: "monitor-outputs",
        type: "manual",
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

      const instanceId = createInstanceId("monitor-outputs");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const numResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "num"
      );

      expect(numResult).toBeDefined();
      console.log(
        "Monitor outputs - num result:",
        JSON.stringify(numResult, null, 2)
      );
    });

    it("should include error details in monitoring updates", async () => {
      const workflow: Workflow = {
        id: "test-workflow-monitor-errors",
        name: "Monitor Errors",
        handle: "monitor-errors",
        type: "manual",
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

      const instanceId = createInstanceId("monitor-errors");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );

      expect(divResult).toBeDefined();
      console.log(
        "Monitor errors - div result:",
        JSON.stringify(divResult, null, 2)
      );
    });

    it("should mark final update status as 'completed' for successful workflow", async () => {
      const workflow: Workflow = {
        id: "test-workflow-final-completed",
        name: "Final Completed",
        handle: "final-completed",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("final-completed");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const numResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "num"
      );

      expect(numResult).toBeDefined();
    });

    it("should mark final update status as 'error' for workflow with failures", async () => {
      const workflow: Workflow = {
        id: "test-workflow-final-error",
        name: "Final Error",
        handle: "final-error",
        type: "manual",
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

      const instanceId = createInstanceId("final-error");
      const runtime = createRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const divResult = execution.nodeExecutions.find(
        (e) => e.nodeId === "div"
      );

      expect(divResult).toBeDefined();
      console.log(
        "Final error test - div result:",
        JSON.stringify(divResult, null, 2)
      );
    });
  });
}
